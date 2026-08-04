import fs from "node:fs";
import path from "node:path";
import { kvRead, kvWrite, useRedis } from "./kv";
import type {
  DemoAction,
  DemoSnapshot,
  DemoStore,
  LiveStation,
  SavedQuote,
  StockItem,
} from "../demo-types";
import type { MesOrder, RoutingStep } from "../mes-types";
import {
  CUSTOMER_POOL,
  DEFAULT_BILLING_RATES,
  DEFAULT_DOWNTIME_REASONS,
  DEFAULT_ESCALATION_RULES,
  DEFAULT_OPERATIONS,
  DEFAULT_SCRAP_REASONS,
  SIM_STATIONS,
  operationBillingRate,
  pickScrapReason,
  buildOrder,
  estimateMinutes,
  operatorFor,
  plantToday,
  rand,
  shiftForHour,
  simHour,
} from "../sim";

/**
 * File-backed live demo store. The GET path "ticks" the simulation forward to
 * the current wall-clock minute before answering, so the plant keeps running
 * 24/7 whether or not anyone is watching. User actions from the UI mutate the
 * same store, making every button real.
 */

const STORE_FILE = path.join(process.cwd(), "data", "demo-store.json");
const MAX_CATCHUP_MIN = 7 * 24 * 60; // fast-forward at most a week

declare global {
  var __demoStore: DemoStore | undefined;
  var __demoLastPersist: number | undefined;
}

/* ----------------------------- helpers ---------------------------- */

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthPrefix(d: Date): string {
  return `SIP-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextOrderId(store: DemoStore, now: Date): string {
  const prefix = monthPrefix(now);
  const seq = (store.orderSeq[prefix] ?? 60) + 1;
  store.orderSeq[prefix] = seq;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

function stepFor(order: MesOrder, operationId: string): RoutingStep | undefined {
  return order.routing.find((s) => s.operationId === operationId);
}

function orderDone(order: MesOrder): boolean {
  return order.routing.every((s) => s.status === "done");
}

function isBatchable(store: DemoStore, operationId: string): boolean {
  return !!store.settings.operations.find((o) => o.id === operationId)?.batchable;
}

/* ------------------------------ seeding ---------------------------- */

const SEED_WIP = 30; // work-in-progress spread across the whole routing
const SEED_BACKLOG = 18; // fresh orders waiting to start — a visible queue

function seedActiveOrders(store: DemoStore, now: Date): void {
  // WIP: current step distributed *uniformly* across each order's routing, so
  // downstream operations (montaj/kalite/paket) get queued work too, not just
  // the front of the line.
  for (let i = 0; i < SEED_WIP; i++) {
    const id = nextOrderId(store, now);
    const createdAt = new Date(now.getTime() - (2 + i) * 5 * 3600000);
    const order = buildOrder(`seed:${id}`, id, createdAt, false);
    const len = order.routing.length;
    const doneSteps = Math.min(len - 1, Math.floor(rand(`seed:${id}:adv`) * len));
    for (let s = 0; s < len; s++) {
      const step = order.routing[s];
      const est = step.estMinutes ?? 60;
      if (s < doneSteps) {
        step.status = "done";
        step.qtyDone = order.qty;
        step.runMinutes = est;
        step.actualMinutes = Math.round(est * (0.85 + rand(`seed:${id}:a${s}`) * 0.35));
      } else if (s === doneSteps) {
        step.status = "queued";
        const frac = rand(`seed:${id}:part`) * 0.4;
        step.runMinutes = Math.round(est * frac);
        step.qtyDone = Math.floor(order.qty * frac);
      }
    }
    store.orders.push(order);
  }

  // Backlog: brand-new orders, only step 1 queued — the waiting pile.
  for (let i = 0; i < SEED_BACKLOG; i++) {
    const id = nextOrderId(store, now);
    const createdAt = new Date(now.getTime() - i * 3 * 3600000);
    const order = buildOrder(`backlog:${id}`, id, createdAt, false);
    order.routing[0].status = "queued";
    store.orders.push(order);
  }
}

function seedStore(now: Date): DemoStore {
  const store: DemoStore = {
    version: 1,
    createdAt: now.toISOString(),
    lastTickAt: now.toISOString(),
    currentDay: isoDay(now),
    orderSeq: {},
    orders: [],
    stations: SIM_STATIONS.map((def) => ({
      id: def.id,
      state: "idle",
      operator: operatorFor(def.id, shiftForHour(now.getUTCHours()).id),
      currentOrderIds: [],
      todayOutput: plantTodayShare(def.id, now),
      todayScrap: 0,
      frac: 0,
    })),
    andon: [],
    downtime: [],
    maintenance: seedMaintenance(now),
    settings: {
      plan: "AIPRO",
      currency: "USD",
      costRates: { laborPerHour: 14, energyPerHour: 9, gasPerHour: 6, overheadPerDay: 420 },
      billingRates: { ...DEFAULT_BILLING_RATES },
      features: { maintenance: true, barcode: true, quoting: true, stock: true },
      maintenanceOwnDepartment: true,
      workingCalendar: { shifts: 3, restDays: [] },
      operations: [...DEFAULT_OPERATIONS],
      downtimeReasons: [...DEFAULT_DOWNTIME_REASONS],
      scrapReasons: [...DEFAULT_SCRAP_REASONS],
      escalationRules: DEFAULT_ESCALATION_RULES.map((r) => ({ ...r })),
    },
    alerts: [],
    quotes: seedQuotes(now),
    stock: seedStock(),
    stockMoves: [],
    scrapEvents: [],
  };
  seedActiveOrders(store, now);
  for (const o of store.orders) assignOrderMaterial(store, o);
  seedRecentEvents(store, now);
  for (const st of store.stations) {
    const def = SIM_STATIONS.find((d) => d.id === st.id)!;
    pickupWork(store, st, def.operationId, now);
  }
  seedOpenIncident(store, now);
  // start two minutes back so the escalation engine runs on the first GET
  store.lastTickAt = new Date(now.getTime() - 2 * 60000).toISOString();
  return store;
}

/**
 * Seed one ongoing breakdown (35 min and counting) so a brand-new demo shows a
 * live alert ladder immediately: the 5-min rule notifies Maintenance and the
 * 30-min rule escalates to the Supervisor.
 */
function seedOpenIncident(store: DemoStore, now: Date): void {
  const st = store.stations.find((s) => s.id === "st-kaynak-1") ?? store.stations[0];
  if (!st) return;
  const since = new Date(now.getTime() - 35 * 60000);
  st.state = "down";
  st.downtimeReasonId = "dt-ariza";
  st.downtimeSince = since.toISOString();
  st.downtimeUntil = new Date(now.getTime() + 15 * 60000).toISOString();
  st.currentOrderIds = [];
  store.downtime.push({
    id: `dt-seed-open-${st.id}`,
    stationId: st.id,
    reasonId: "dt-ariza",
    startedAt: since.toISOString(),
  });
  store.andon.push({
    id: `an-seed-${st.id}`,
    stationId: st.id,
    type: "maintenance",
    at: since.toISOString(),
    open: true,
  });
}

/** A handful of historical quotes so the sales screen has searchable history. */
function seedQuotes(now: Date): SavedQuote[] {
  const rates = { ...DEFAULT_BILLING_RATES };
  const specs: { customer: string; part: string; qty: number; lines: { op: string; h: number }[]; material: number; margin: number; days: number }[] = [
    { customer: CUSTOMER_POOL[0], part: "Şasi bağlantı sacı", qty: 120, lines: [{ op: "op-lazer", h: 6 }, { op: "op-abkant", h: 4 }, { op: "op-kaynak", h: 5 }], material: 4200, margin: 22, days: 3 },
    { customer: CUSTOMER_POOL[1], part: "Pano gövdesi PG-12", qty: 40, lines: [{ op: "op-lazer", h: 3 }, { op: "op-abkant", h: 2.5 }, { op: "op-boya", h: 2 }], material: 1800, margin: 25, days: 8 },
    { customer: CUSTOMER_POOL[2], part: "Konveyör yan profili", qty: 60, lines: [{ op: "op-plazma", h: 5 }, { op: "op-kaynak", h: 6 }], material: 3100, margin: 18, days: 12 },
    { customer: CUSTOMER_POOL[3], part: "Menfez çerçevesi MF-30", qty: 200, lines: [{ op: "op-punch", h: 4 }, { op: "op-abkant", h: 5 }, { op: "op-paket", h: 2 }], material: 2600, margin: 20, days: 17 },
    { customer: CUSTOMER_POOL[0], part: "Kabin arka paneli", qty: 80, lines: [{ op: "op-lazer", h: 4 }, { op: "op-abkant", h: 3 }], material: 2200, margin: 24, days: 23 },
    { customer: CUSTOMER_POOL[4], part: "Filtre kasası FK-8", qty: 150, lines: [{ op: "op-lazer", h: 7 }, { op: "op-kaynak", h: 8 }, { op: "op-montaj", h: 4 }], material: 5400, margin: 19, days: 31 },
    { customer: CUSTOMER_POOL[2], part: "Davlumbaz gövdesi DV-450", qty: 55, lines: [{ op: "op-lazer", h: 3.5 }, { op: "op-abkant", h: 4 }, { op: "op-boya", h: 2.5 }], material: 2900, margin: 21, days: 40 },
  ];
  return specs.map((s, i) => {
    const lines = s.lines.map((l) => ({ operationId: l.op, hours: l.h }));
    const laborTotal = Math.round(
      s.lines.reduce((sum, l) => sum + l.h * operationBillingRate(l.op, rates), 0),
    );
    const base = laborTotal + s.material;
    const total = Math.round(base * (1 + s.margin / 100));
    return {
      id: `q-seed-${i + 1}`,
      at: new Date(now.getTime() - s.days * 86400000).toISOString(),
      customer: s.customer,
      part: s.part,
      qty: s.qty,
      lines,
      laborTotal,
      materialCost: s.material,
      marginPct: s.margin,
      total,
      perPart: Math.round((total / s.qty) * 100) / 100,
      currency: "USD" as const,
    };
  });
}

/* ------------------------------ stock ------------------------------ */

const MACHINING_OPS = new Set(["op-testere", "op-torna", "op-freze", "op-matkap"]);

/** Seeded raw-material stock. Bars are kept in kg; sheet metal in pieces (adet)
 *  with size + thickness + weight/sheet. Two items start below reorder so the
 *  low-stock alert shows immediately. */
function seedStock(): StockItem[] {
  return [
    // bars & block — kg
    { id: "stk-bar-st37-40", materialType: "St37", form: "bar", unit: "kg", dimension: "Ø40", onHand: 1450, reorder: 400, costPerKg: 0.9 },
    { id: "stk-bar-st37-25", materialType: "St37", form: "bar", unit: "kg", dimension: "Ø25", onHand: 300, reorder: 350, costPerKg: 0.95 },
    { id: "stk-bar-304-30", materialType: "Paslanmaz 304", form: "bar", unit: "kg", dimension: "Ø30", onHand: 680, reorder: 250, costPerKg: 3.2 },
    { id: "stk-bar-al-50", materialType: "Alüminyum 6061", form: "bar", unit: "kg", dimension: "Ø50", onHand: 410, reorder: 200, costPerKg: 2.8 },
    { id: "stk-tube-st37-60", materialType: "St37", form: "tube", unit: "kg", dimension: "60×60 kutu", onHand: 540, reorder: 200, costPerKg: 1.05 },
    { id: "stk-block-al", materialType: "Alüminyum 6061", form: "block", unit: "kg", dimension: "blok", onHand: 260, reorder: 120, costPerKg: 3.0 },
    // sheet metal — pieces (adet), size × thickness, weight per sheet
    { id: "stk-plate-dkp-2", materialType: "DKP", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 2, weightKgPerPiece: 49, onHand: 45, reorder: 15, costPerKg: 0.85 },
    { id: "stk-plate-dkp-4", materialType: "DKP", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 4, weightKgPerPiece: 98, onHand: 8, reorder: 12, costPerKg: 0.85 },
    { id: "stk-plate-304-15", materialType: "Paslanmaz 304", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 1.5, weightKgPerPiece: 38, onHand: 24, reorder: 10, costPerKg: 3.1 },
    { id: "stk-plate-st37-6", materialType: "St37", form: "plate", unit: "piece", dimension: "1500 × 3000", thicknessMm: 6, weightKgPerPiece: 212, onHand: 16, reorder: 6, costPerKg: 0.88 },
  ];
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** On-hand weight (kg) of an item, whatever its unit — for value & KPIs. */
export function stockWeightKg(item: StockItem): number {
  return item.unit === "piece" ? item.onHand * (item.weightKgPerPiece ?? 0) : item.onHand;
}

/** Link an order to the stock item it consumes and how much (in the item unit:
 *  kg for bars, pieces/sheets for sheet metal). */
function assignOrderMaterial(store: DemoStore, order: MesOrder): void {
  if (order.stockItemId) return;
  const machining = order.routing.some((s) => MACHINING_OPS.has(s.operationId));
  const form = machining ? "bar" : "plate";
  const hint = order.material?.type?.toLowerCase() ?? "";
  const pool = store.stock.filter((s) => !s.isRemnant && s.form === form);
  if (pool.length === 0) return;
  const byType = pool.find((s) => hint && s.materialType.toLowerCase().startsWith(hint.slice(0, 3)));
  const item = byType ?? pool[Math.floor(rand(`${order.id}:stk`) * pool.length)] ?? pool[0];
  order.stockItemId = item.id;
  if (item.unit === "piece") {
    // sheets: ~30 parts nest per sheet
    order.materialQty = Math.max(1, Math.ceil((order.qty / 30) * (0.8 + rand(`${order.id}:kg`) * 0.5)));
    order.material = { type: item.materialType, thicknessMm: item.thicknessMm ?? 0, size: item.dimension };
  } else {
    order.materialQty = Math.max(1, Math.round(order.qty * 0.35 * (0.7 + rand(`${order.id}:kg`) * 0.6)));
    if (machining) order.material = { type: item.materialType, thicknessMm: 0, size: item.dimension };
  }
  order.materialIssued = false;
}

/** Backflush: issue raw material from stock when production first completes a
 *  step. Bars use remnants first and return a fresh offcut (~8% kg); sheets are
 *  consumed as whole pieces. Runs once per order. */
function issueMaterial(store: DemoStore, order: MesOrder, now: Date): void {
  if (!store.settings.features.stock) return;
  if (order.materialIssued || !order.stockItemId || !order.materialQty) return;
  order.materialIssued = true;
  const item = store.stock.find((s) => s.id === order.stockItemId);
  if (!item) return;
  const stamp = Math.floor(now.getTime() / 1000);
  const move = (stockItemId: string, type: "issue" | "remnant", qty: number) =>
    store.stockMoves.unshift({ id: `mv-${stamp}-${stockItemId}-${type}`, at: now.toISOString(), stockItemId, type, qty: r1(qty), orderId: order.id });

  let need = order.materialQty;
  // bars: use reusable remnant kg first
  if (item.unit === "kg") {
    const rem = store.stock.find((s) => s.id === `${item.id}-rem` && s.isRemnant);
    if (rem && rem.onHand > 0) {
      const use = Math.min(rem.onHand, need);
      rem.onHand = r1(rem.onHand - use);
      need = r1(need - use);
      if (use > 0) move(rem.id, "issue", use);
    }
  }
  let fromMain = 0;
  if (need > 0) {
    fromMain = Math.min(item.onHand, need);
    item.onHand = Math.max(0, item.unit === "piece" ? item.onHand - need : r1(item.onHand - need));
    move(item.id, "issue", need);
  }
  // bars return a fresh offcut (~8% kg) to the remnant pool
  if (item.unit === "kg" && (item.form === "bar" || item.form === "block") && fromMain > 0) {
    const offcut = r1(fromMain * 0.08);
    if (offcut > 0) {
      const remId = `${item.id}-rem`;
      let remItem = store.stock.find((s) => s.id === remId);
      if (!remItem) {
        remItem = { id: remId, materialType: item.materialType, form: item.form, unit: "kg", dimension: `${item.dimension} artık`, onHand: 0, reorder: 0, costPerKg: item.costPerKg, isRemnant: true };
        store.stock.push(remItem);
      }
      remItem.onHand = r1(remItem.onHand + offcut);
      move(remId, "remnant", offcut);
    }
  }
  if (store.stockMoves.length > 200) store.stockMoves.length = 200;
}

/** Record one scrapped part with a reason and its material weight (kg). */
function recordScrap(store: DemoStore, stationId: string, order: MesOrder, seed: string, now: Date): void {
  const reasonId = pickScrapReason(seed);
  let partKg = 0.5;
  const it = order.stockItemId ? store.stock.find((s) => s.id === order.stockItemId) : undefined;
  if (it && order.materialQty && order.qty > 0) {
    partKg =
      it.unit === "piece"
        ? (order.materialQty * (it.weightKgPerPiece ?? 0)) / order.qty
        : order.materialQty / order.qty;
  }
  store.scrapEvents.unshift({
    id: `scr-${Math.floor(now.getTime() / 1000)}-${stationId}-${store.scrapEvents.length}`,
    at: now.toISOString(),
    stationId,
    reasonId,
    qty: 1,
    weightKg: r1(Math.max(0.05, partKg)),
  });
  if (store.scrapEvents.length > 300) store.scrapEvents.length = 300;
}

/** Backfill the last 24 h of downtime/andon from the simulation, so the
 *  pareto and feeds are populated on a brand-new store. */
function seedRecentEvents(store: DemoStore, now: Date): void {
  for (const def of SIM_STATIONS) {
    for (let h = 24; h >= 1; h--) {
      const dt = new Date(now.getTime() - h * 3600000);
      const cell = simHour(def.id, dt);
      if (cell.downMin > 0 && cell.downReasonId) {
        store.downtime.push({
          id: `dt-seed-${def.id}-${h}`,
          stationId: def.id,
          reasonId: cell.downReasonId,
          startedAt: dt.toISOString(),
          endedAt: new Date(dt.getTime() + cell.downMin * 60000).toISOString(),
        });
      }
    }
  }
  // today's scrap so the fire/hurda board is populated on a fresh store
  const hoursToday = now.getUTCHours() + 1;
  for (const def of SIM_STATIONS) {
    const n = 2 + Math.floor(rand(`${def.id}:sct`) * 4); // 2–5 events today
    for (let k = 0; k < n; k++) {
      const ago = Math.floor(rand(`${def.id}:${k}:sct`) * hoursToday * 3600000);
      store.scrapEvents.push({
        id: `scr-seed-${def.id}-${k}`,
        at: new Date(now.getTime() - ago).toISOString(),
        stationId: def.id,
        reasonId: pickScrapReason(`${def.id}:${k}:scr`),
        qty: 1,
        weightKg: r1(0.3 + rand(`${def.id}:${k}:kg`) * 1.8),
      });
    }
  }
  const last = store.downtime[store.downtime.length - 1];
  if (last) {
    store.andon.push({
      id: "an-seed-1",
      stationId: last.stationId,
      type: "maintenance",
      at: new Date(now.getTime() - 18 * 60000).toISOString(),
      open: true,
    });
  }
}

/** Recurring maintenance plans; lastDone seeded so some are already due. */
function seedMaintenance(now: Date) {
  const defs: [string, string, number][] = [
    ["st-lazer-1", "Lens temizliği", 7],
    ["st-lazer-2", "Lens temizliği", 7],
    ["st-lazer-1", "Nozül kontrolü", 30],
    ["st-plazma-1", "Elektrot / nozül değişimi", 14],
    ["st-punch-1", "Zımba bileme", 30],
    ["st-abkant-1", "Hidrolik yağ kontrolü", 90],
    ["st-abkant-2", "Arka dayama kalibrasyonu", 180],
    ["st-kaynak-1", "Torç bakımı", 30],
    ["st-montaj-1", "Havalı alet bakımı", 60],
    ["st-paket-1", "Çemberleme makinesi bakımı", 90],
  ];
  return defs.map(([stationId, title, intervalDays], i) => {
    const frac = 0.3 + rand(`maint:${stationId}:${i}`) * 0.95; // some overdue
    const lastDoneAt = new Date(now.getTime() - intervalDays * frac * 86400000);
    return {
      id: `mt-${i + 1}`,
      stationId,
      title,
      intervalDays,
      lastDoneAt: lastDoneAt.toISOString(),
      nextDueAt: new Date(lastDoneAt.getTime() + intervalDays * 86400000).toISOString(),
    };
  });
}

/** Bring an older persisted store up to the current shape. */
function migrate(store: DemoStore, now: Date): void {
  const s = store as DemoStore & { settings: { rates?: unknown } };
  delete s.settings.rates; // FX conversion removed — currency is display-only
  store.settings.plan ??= "AIPRO";
  store.settings.escalationRules ??= DEFAULT_ESCALATION_RULES.map((r) => ({ ...r }));
  store.settings.maintenanceOwnDepartment ??= true;
  store.settings.workingCalendar ??= { shifts: 3, restDays: [] };
  store.alerts ??= [];
  store.quotes ??= seedQuotes(now);
  store.stock ??= seedStock();
  store.stockMoves ??= [];
  store.scrapEvents ??= [];
  store.settings.scrapReasons ??= [...DEFAULT_SCRAP_REASONS];
  for (const o of store.orders) assignOrderMaterial(store, o);
  store.settings.features ??= { maintenance: true, barcode: true, quoting: true, stock: true };
  store.settings.features.quoting ??= true;
  store.settings.features.stock ??= true;
  store.settings.billingRates ??= { ...DEFAULT_BILLING_RATES };
  // backfill any newly added station
  for (const def of SIM_STATIONS)
    store.settings.billingRates[def.id] ??= DEFAULT_BILLING_RATES[def.id] ?? 40;
  store.maintenance ??= seedMaintenance(now);
  // stations added later (e.g. Montaj Hattı) join the live store on load
  for (const def of SIM_STATIONS) {
    if (!store.stations.some((st) => st.id === def.id)) {
      store.stations.push({
        id: def.id,
        state: "idle",
        operator: operatorFor(def.id, shiftForHour(now.getUTCHours()).id),
        currentOrderIds: [],
        todayOutput: plantTodayShare(def.id, now),
        todayScrap: 0,
        frac: 0,
      });
    }
  }
}

/** Station's already-produced share of today (so day 1 doesn't start at 0). */
function plantTodayShare(stationId: string, now: Date): number {
  let output = 0;
  for (let h = 0; h < now.getUTCHours(); h++) {
    output += simHour(stationId, new Date(`${isoDay(now)}T${String(h).padStart(2, "0")}:00:00Z`)).output;
  }
  return output;
}

/* --------------------------- persistence --------------------------- */

export async function loadStore(now: Date): Promise<DemoStore> {
  // Cloud: the Redis blob is the single source of truth. Read fresh every
  // request (no global cache) so instances never serve stale state.
  if (useRedis) {
    const raw = await kvRead();
    if (raw) {
      const store = JSON.parse(raw) as DemoStore;
      migrate(store, now);
      return store;
    }
    const seeded = seedStore(now);
    await kvWrite(JSON.stringify(seeded));
    return seeded;
  }
  // Local dev: file-backed with an in-memory cache (survives HMR).
  if (globalThis.__demoStore) {
    migrate(globalThis.__demoStore, now); // idempotent — covers HMR'd old shapes
    return globalThis.__demoStore;
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    globalThis.__demoStore = JSON.parse(raw) as DemoStore;
    migrate(globalThis.__demoStore, now);
  } catch {
    globalThis.__demoStore = seedStore(now);
    await persist(globalThis.__demoStore, true);
  }
  return globalThis.__demoStore;
}

export async function persist(store: DemoStore, force = false): Promise<void> {
  if (useRedis) {
    await kvWrite(JSON.stringify(store));
    return;
  }
  const last = globalThis.__demoLastPersist ?? 0;
  if (!force && Date.now() - last < 10_000) return;
  globalThis.__demoLastPersist = Date.now();
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const tmp = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store), "utf8");
  fs.renameSync(tmp, STORE_FILE); // atomic-ish: no half-written reads
}

/* ------------------------------ ticking ---------------------------- */

export function advance(store: DemoStore, now: Date): boolean {
  let t = new Date(store.lastTickAt).getTime();
  const target = now.getTime();
  let elapsedMin = Math.floor((target - t) / 60000);
  if (elapsedMin <= 0) return false;
  if (elapsedMin > MAX_CATCHUP_MIN) {
    t = target - MAX_CATCHUP_MIN * 60000;
    elapsedMin = MAX_CATCHUP_MIN;
  }

  for (let i = 0; i < elapsedMin; i++) {
    t += 60000;
    tickMinute(store, new Date(t));
  }
  store.lastTickAt = new Date(t).toISOString();
  return true;
}

function tickMinute(store: DemoStore, now: Date): void {
  // day rollover: reset today counters, prune old records
  const day = isoDay(now);
  if (day !== store.currentDay) {
    store.currentDay = day;
    for (const st of store.stations) {
      st.todayOutput = 0;
      st.todayScrap = 0;
    }
    const keepFrom = now.getTime() - 5 * 86400000;
    store.orders = store.orders.filter(
      (o) => !orderDone(o) || new Date(o.dueDate).getTime() > keepFrom,
    );
    const dtFrom = now.getTime() - 48 * 3600000;
    store.downtime = store.downtime.filter(
      (d) => new Date(d.startedAt).getTime() > dtFrom,
    );
    store.andon = store.andon.filter(
      (a) => a.open || new Date(a.at).getTime() > dtFrom,
    );
    store.alerts = store.alerts.filter(
      (al) => !al.acked || new Date(al.at).getTime() > dtFrom,
    );
    store.scrapEvents = store.scrapEvents.filter(
      (e) => new Date(e.at).getTime() > dtFrom,
    );
  }

  const epochMin = Math.floor(now.getTime() / 60000);
  const shift = shiftForHour(now.getUTCHours());

  for (const st of store.stations) {
    const def = SIM_STATIONS.find((d) => d.id === st.id);
    if (!def) continue;

    st.operator = operatorFor(st.id, shift.id);

    // downtime lifecycle (auto downtimes carry a planned end)
    if (st.state === "down") {
      if (st.downtimeUntil && now.toISOString() >= st.downtimeUntil) {
        endDowntimeInternal(store, st, now);
      } else {
        continue;
      }
    }

    // idle stations pick up queued work for their operation
    if (st.currentOrderIds.length === 0) {
      pickupWork(store, st, def.operationId, now);
    }

    if (st.state === "running" && st.currentOrderIds.length > 0) {
      // Time-based progress: each running minute adds one effective minute to
      // every active step (çoklu iş steps advance in parallel on one machine).
      // Pieces are derived from time progress, not counted per-part.
      for (const orderId of [...st.currentOrderIds]) {
        const order = store.orders.find((o) => o.id === orderId);
        const step = order && stepFor(order, def.operationId);
        if (!order || !step || step.status === "done") {
          st.currentOrderIds = st.currentOrderIds.filter((x) => x !== orderId);
          continue;
        }
        step.status = "running";
        step.stationId = st.id;
        const est = step.estMinutes ?? 60;
        step.runMinutes = (step.runMinutes ?? 0) + 1;
        const newQty = Math.min(order.qty, Math.round(order.qty * (step.runMinutes / est)));
        const dQty = Math.max(0, newQty - step.qtyDone);
        step.qtyDone = newQty;
        st.todayOutput += dQty;
        if (
          dQty > 0 &&
          rand(`${st.id}:${epochMin}:scrap:${orderId}`) < (def.kind === "quality" ? 0.03 : 0.013)
        ) {
          step.scrapQty = (step.scrapQty ?? 0) + 1;
          st.todayScrap += 1;
          recordScrap(store, st.id, order, `${st.id}:${epochMin}:scr`, now);
        }
        if (step.runMinutes >= est) completeStep(store, st, order, step, now);
      }
      if (st.currentOrderIds.length === 0) st.state = "idle";

      // occasional automatic downtime (breakdown, material wait…)
      if (rand(`${st.id}:${epochMin}:dt`) < 0.0035) {
        const reasonId =
          rand(`${st.id}:${epochMin}:dtr`) < 0.4 ? "dt-ariza" : rand(`${st.id}:${epochMin}:dtr2`) < 0.5 ? "dt-malzeme" : "dt-setup";
        startDowntimeInternal(store, st, reasonId, now, 8 + Math.round(rand(`${st.id}:${epochMin}:dtl`) * 22));
        if (reasonId === "dt-ariza") {
          store.andon.push({
            id: `an-${epochMin}-${st.id}`,
            stationId: st.id,
            type: "maintenance",
            at: now.toISOString(),
            open: true,
          });
        }
      }
    }
  }

  // auto-close stale automatic andon calls
  for (const a of store.andon) {
    if (a.open && !a.manual && now.getTime() - new Date(a.at).getTime() > 22 * 60000)
      a.open = false;
  }

  // evaluate configurable escalation rules against the live state
  evaluateAlerts(store, now);

  // keep a deep backlog: top the order book up toward ~40 open orders so the
  // plant always has waiting work and stations stay busy.
  if (epochMin % 12 === 0) {
    const active = store.orders.filter((o) => !orderDone(o)).length;
    if (active < 40) {
      const id = nextOrderId(store, now);
      const order = buildOrder(`auto:${id}`, id, now, false);
      order.routing[0].status = "queued";
      assignOrderMaterial(store, order);
      store.orders.push(order);
    }
  }
}

function pickupWork(store: DemoStore, st: LiveStation, operationId: string, now: Date): void {
  const queued = store.orders
    .filter((o) => {
      const step = stepFor(o, operationId);
      return step && (step.status === "queued" || step.status === "paused");
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (queued.length === 0) return;

  // batchable stations run a nesting of several orders at once
  const take = isBatchable(store, operationId) ? Math.min(3, queued.length) : 1;
  for (let i = 0; i < take; i++) {
    const step = stepFor(queued[i], operationId)!;
    // don't steal work already running on another station
    if (step.stationId && step.stationId !== st.id && step.status === "running") continue;
    step.status = "running";
    step.stationId = st.id;
    st.currentOrderIds.push(queued[i].id);
  }
  if (st.currentOrderIds.length > 0) st.state = "running";
}

function completeStep(
  store: DemoStore,
  st: LiveStation,
  order: MesOrder,
  step: RoutingStep,
  now: Date,
): void {
  step.status = "done";
  step.qtyDone = order.qty;
  // actual run time = accrued effective minutes (fall back to a jittered est)
  step.actualMinutes =
    step.runMinutes && step.runMinutes > 0
      ? step.runMinutes
      : Math.round((step.estMinutes ?? 60) * (0.85 + rand(`act:${order.id}:${step.seq}`) * 0.35));
  step.runMinutes = step.actualMinutes;
  st.currentOrderIds = st.currentOrderIds.filter((x) => x !== order.id);
  // backflush: raw material is issued from stock once production starts moving
  issueMaterial(store, order, now);
  const next = order.routing.find((s) => s.status === "pending");
  if (next) next.status = "queued";
}

function startDowntimeInternal(
  store: DemoStore,
  st: LiveStation,
  reasonId: string,
  now: Date,
  autoMinutes?: number,
): void {
  st.state = "down";
  st.downtimeReasonId = reasonId;
  st.downtimeSince = now.toISOString();
  st.downtimeUntil = autoMinutes
    ? new Date(now.getTime() + autoMinutes * 60000).toISOString()
    : undefined;
  store.downtime.push({
    id: `dt-${Math.floor(now.getTime() / 1000)}-${st.id}`,
    stationId: st.id,
    reasonId,
    startedAt: now.toISOString(),
    manual: !autoMinutes,
  });
}

/**
 * Escalation engine: turns the tenant's configurable rules into live alerts.
 * Each condition raises at most one alert (deduped by a stable sourceKey), so
 * a 40-minute breakdown fires the 5-min and 30-min rules once each, not per
 * tick. Runs every simulated minute.
 */
function evaluateAlerts(store: DemoStore, now: Date): void {
  const rules = store.settings.escalationRules ?? [];
  const day = isoDay(now);
  const has = (key: string) => store.alerts.some((a) => a.sourceKey === key);
  const raise = (
    rule: (typeof rules)[number],
    stationId: string,
    value: number,
    sourceKey: string,
    reasonId?: string,
  ) => {
    store.alerts.push({
      id: `al-${Math.floor(now.getTime() / 1000)}-${stationId}-${rule.id}`,
      ruleId: rule.id,
      trigger: rule.trigger,
      stationId,
      target: rule.target,
      at: now.toISOString(),
      value,
      threshold: rule.threshold,
      reasonId,
      sourceKey,
      acked: false,
    });
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.trigger === "downtime") {
      for (const d of store.downtime) {
        if (d.endedAt) continue;
        const mins = Math.round((now.getTime() - new Date(d.startedAt).getTime()) / 60000);
        if (mins < rule.threshold) continue;
        const key = `${rule.id}:${d.id}`;
        if (!has(key)) raise(rule, d.stationId, mins, key, d.reasonId);
      }
    }

    if (rule.trigger === "scrapRate") {
      for (const st of store.stations) {
        const total = st.todayOutput + st.todayScrap;
        if (total < 25) continue; // need a meaningful sample before flagging
        const rate = st.todayScrap / total;
        if (rate < rule.threshold) continue;
        const key = `${rule.id}:${st.id}:${day}`;
        if (!has(key)) raise(rule, st.id, rate, key);
      }
    }
  }

  // low-stock: auto alert to purchasing when a material drops below reorder
  if (store.settings.features.stock) {
    for (const item of store.stock) {
      if (item.isRemnant || item.reorder <= 0) continue;
      if (item.onHand > item.reorder) continue;
      const key = `lowstock:${item.id}:${day}`;
      if (has(key)) continue;
      const label = item.thicknessMm
        ? `${item.materialType} ${item.thicknessMm} mm · ${item.dimension}`
        : `${item.materialType} ${item.dimension}`;
      store.alerts.push({
        id: `al-${Math.floor(now.getTime() / 1000)}-${item.id}`,
        ruleId: "stock",
        trigger: "lowStock",
        stationId: "",
        target: "purchasing",
        at: now.toISOString(),
        value: Math.round(item.onHand),
        threshold: item.reorder,
        reasonId: item.id,
        label,
        sourceKey: key,
        acked: false,
      });
    }
  }
}

function endDowntimeInternal(store: DemoStore, st: LiveStation, now: Date): void {
  const open = [...store.downtime].reverse().find((d) => d.stationId === st.id && !d.endedAt);
  if (open) open.endedAt = now.toISOString();
  st.state = st.currentOrderIds.length > 0 ? "running" : "idle";
  st.downtimeReasonId = undefined;
  st.downtimeSince = undefined;
  st.downtimeUntil = undefined;
}

/* ------------------------------ actions ---------------------------- */

export function applyAction(store: DemoStore, action: DemoAction, now: Date): void {
  const station = "stationId" in action
    ? store.stations.find((s) => s.id === action.stationId)
    : undefined;

  switch (action.type) {
    case "startJob": {
      if (!station) return;
      const def = SIM_STATIONS.find((d) => d.id === station.id);
      const order = store.orders.find((o) => o.id === action.orderId);
      if (!def || !order) return;
      const step = stepFor(order, def.operationId);
      if (!step || step.status === "done") return;
      if (!isBatchable(store, def.operationId)) {
        // single-job stations: park the previous job back to the queue
        for (const prevId of station.currentOrderIds) {
          const prev = store.orders.find((o) => o.id === prevId);
          const prevStep = prev && stepFor(prev, def.operationId);
          if (prevStep && prevStep.status === "running") prevStep.status = "paused";
        }
        station.currentOrderIds = [];
      }
      if (!station.currentOrderIds.includes(order.id))
        station.currentOrderIds.push(order.id);
      step.status = "running";
      step.stationId = station.id;
      station.state = "running";
      break;
    }
    case "pauseStation": {
      if (!station) return;
      station.state = "idle";
      for (const id of station.currentOrderIds) {
        const o = store.orders.find((x) => x.id === id);
        const s = o && stepFor(o, SIM_STATIONS.find((d) => d.id === station.id)!.operationId);
        if (s && s.status === "running") s.status = "paused";
      }
      break;
    }
    case "resumeStation": {
      if (!station) return;
      if (station.currentOrderIds.length > 0) {
        station.state = "running";
        for (const id of station.currentOrderIds) {
          const o = store.orders.find((x) => x.id === id);
          const s = o && stepFor(o, SIM_STATIONS.find((d) => d.id === station.id)!.operationId);
          if (s && s.status === "paused") s.status = "running";
        }
      }
      break;
    }
    case "addQty": {
      if (!station) return;
      const def = SIM_STATIONS.find((d) => d.id === station.id)!;
      const order = store.orders.find((o) => o.id === action.orderId);
      const step = order && stepFor(order, def.operationId);
      if (!order || !step) return;
      const next = Math.max(0, Math.min(order.qty, step.qtyDone + action.delta));
      station.todayOutput = Math.max(0, station.todayOutput + (next - step.qtyDone));
      step.qtyDone = next;
      // keep time-based progress in step with manual piece entry
      step.runMinutes = Math.round((step.estMinutes ?? 60) * (next / order.qty));
      if (step.qtyDone >= order.qty) completeStep(store, station, order, step, now);
      break;
    }
    case "addScrap": {
      if (!station) return;
      const def = SIM_STATIONS.find((d) => d.id === station.id)!;
      const order = store.orders.find((o) => o.id === action.orderId);
      const step = order && stepFor(order, def.operationId);
      if (!step) return;
      const next = Math.max(0, (step.scrapQty ?? 0) + action.delta);
      station.todayScrap = Math.max(0, station.todayScrap + (next - (step.scrapQty ?? 0)));
      step.scrapQty = next;
      break;
    }
    case "finishStep": {
      if (!station) return;
      const def = SIM_STATIONS.find((d) => d.id === station.id)!;
      const order = store.orders.find((o) => o.id === action.orderId);
      const step = order && stepFor(order, def.operationId);
      if (!order || !step || step.status === "done") return;
      completeStep(store, station, order, step, now);
      if (station.currentOrderIds.length === 0) station.state = "idle";
      break;
    }
    case "startDowntime": {
      if (!station) return;
      startDowntimeInternal(store, station, action.reasonId, now);
      break;
    }
    case "endDowntime": {
      if (!station) return;
      endDowntimeInternal(store, station, now);
      break;
    }
    case "andonOpen": {
      if (!station) return;
      store.andon.push({
        id: `an-m-${Date.now()}`,
        stationId: station.id,
        type: action.andonType,
        at: now.toISOString(),
        open: true,
        manual: true,
      });
      break;
    }
    case "andonClose": {
      const call = store.andon.find((a) => a.id === action.id);
      if (call) call.open = false;
      break;
    }
    case "createOrder": {
      const id = nextOrderId(store, now);
      const routing: RoutingStep[] = action.routing.map((r, i) => ({
        operationId: r.operationId,
        seq: i + 1,
        status: i === 0 ? "queued" : "pending",
        qtyDone: 0,
        runMinutes: 0,
        estMinutes: r.estMinutes ?? estimateMinutes(r.operationId, action.qty),
      }));
      const created: MesOrder = {
        id,
        customer: action.customer || "—",
        part: action.part || "—",
        qty: Math.max(1, action.qty),
        dueDate: action.dueDate || new Date(now.getTime() + 7 * 86400000).toISOString(),
        createdAt: now.toISOString(),
        priority: action.priority ?? "normal",
        routing,
        material: action.material,
      };
      assignOrderMaterial(store, created);
      store.orders.push(created);
      break;
    }
    case "editOrder": {
      const o = store.orders.find((x) => x.id === action.orderId);
      if (!o) return;
      const p = action.patch;
      if (p.customer !== undefined) o.customer = p.customer || "—";
      if (p.part !== undefined) o.part = p.part || "—";
      if (p.qty !== undefined) o.qty = Math.max(1, p.qty);
      if (p.dueDate !== undefined) o.dueDate = p.dueDate;
      if (p.priority !== undefined) o.priority = p.priority;
      if (p.material !== undefined) o.material = p.material;
      // Rebuild routing while preserving completed/started steps. Only "done"
      // (and in-flight running/paused) steps are locked and kept verbatim; the
      // remaining plan can be reordered, trimmed or extended (add intermediate
      // or final operations).
      if (p.routing && p.routing.length > 0) {
        const isLocked = (s: RoutingStep) =>
          s.status === "done" ||
          s.status === "running" ||
          s.status === "paused" ||
          (s.runMinutes ?? 0) > 0;
        const byOp = new Map(o.routing.map((s) => [s.operationId, s]));
        const rebuilt: RoutingStep[] = p.routing.map((r, i) => {
          const ex = byOp.get(r.operationId);
          if (ex && isLocked(ex)) return { ...ex, seq: i + 1 };
          return {
            operationId: r.operationId,
            seq: i + 1,
            status: "pending",
            qtyDone: 0,
            runMinutes: 0,
            estMinutes: r.estMinutes ?? estimateMinutes(r.operationId, o.qty),
          };
        });
        // safety: never drop a locked step the client left out
        for (const s of o.routing)
          if (isLocked(s) && !rebuilt.some((r) => r.operationId === s.operationId))
            rebuilt.push({ ...s });
        rebuilt.forEach((s, i) => (s.seq = i + 1));
        // keep work flowing: if nothing is running/queued, queue the next open step
        if (!rebuilt.some((s) => s.status === "running" || s.status === "queued")) {
          const nextOpen = rebuilt.find((s) => s.status !== "done");
          if (nextOpen) nextOpen.status = "queued";
        }
        o.routing = rebuilt;
      }
      break;
    }
    case "addOperation": {
      store.settings.operations.push({
        id: `op-custom-${Date.now()}`,
        name: action.name,
        batchable: action.batchable,
      });
      break;
    }
    case "addReason": {
      store.settings.downtimeReasons.push({
        id: `dt-custom-${Date.now()}`,
        name: action.name,
      });
      break;
    }
    case "saveCosts":
      store.settings.costRates = action.costRates;
      break;
    case "saveBillingRates":
      store.settings.billingRates = { ...store.settings.billingRates, ...action.billingRates };
      break;
    case "setCurrency":
      store.settings.currency = action.currency;
      break;
    case "setPlan":
      store.settings.plan = action.plan;
      break;
    case "setFeature":
      store.settings.features[action.feature] = action.enabled;
      break;
    case "ackAlert": {
      const al = store.alerts.find((a) => a.id === action.id);
      if (al) {
        al.acked = true;
        al.ackedAt = now.toISOString();
      }
      break;
    }
    case "saveEscalationRules":
      store.settings.escalationRules = action.rules;
      break;
    case "setMaintenanceDept":
      store.settings.maintenanceOwnDepartment = action.own;
      break;
    case "setWorkingCalendar":
      store.settings.workingCalendar = {
        shifts: Math.min(3, Math.max(1, Math.round(action.calendar.shifts))),
        restDays: [...new Set(action.calendar.restDays)].filter((d) => d >= 0 && d <= 6),
      };
      break;
    case "saveQuote":
      store.quotes.unshift({
        ...action.quote,
        id: `q-${Date.now()}`,
        at: now.toISOString(),
      });
      break;
    case "deleteQuote":
      store.quotes = store.quotes.filter((q) => q.id !== action.id);
      break;
    case "restockItem": {
      const item = store.stock.find((s) => s.id === action.stockItemId);
      if (!item || action.qty <= 0) return;
      item.onHand = r1(item.onHand + action.qty);
      store.stockMoves.unshift({
        id: `mv-${Date.now()}-${item.id}-receipt`,
        at: now.toISOString(),
        stockItemId: item.id,
        type: "receipt",
        qty: r1(action.qty),
      });
      break;
    }
    case "adjustStock": {
      const item = store.stock.find((s) => s.id === action.stockItemId);
      if (!item) return;
      const next = Math.max(0, action.onHand);
      const delta = r1(Math.abs(next - item.onHand));
      item.onHand = r1(next);
      if (delta > 0)
        store.stockMoves.unshift({
          id: `mv-${Date.now()}-${item.id}-adjust`,
          at: now.toISOString(),
          stockItemId: item.id,
          type: "adjust",
          qty: delta,
        });
      break;
    }
    case "maintenanceDone": {
      const task = store.maintenance.find((m) => m.id === action.id);
      if (task) {
        task.lastDoneAt = now.toISOString();
        task.nextDueAt = new Date(
          now.getTime() + task.intervalDays * 86400000,
        ).toISOString();
      }
      break;
    }
    case "addMaintenance": {
      store.maintenance.push({
        id: `mt-m-${Date.now()}`,
        stationId: action.stationId,
        title: action.title,
        intervalDays: Math.max(1, action.intervalDays),
        lastDoneAt: now.toISOString(),
        nextDueAt: new Date(
          now.getTime() + Math.max(1, action.intervalDays) * 86400000,
        ).toISOString(),
      });
      break;
    }
    case "resetDemo": {
      // Rebuild in place so the caller's reference (and the Redis/file write
      // that follows in the route) points at the fresh state.
      const fresh = seedStore(now);
      const bag = store as unknown as Record<string, unknown>;
      for (const k of Object.keys(bag)) delete bag[k];
      Object.assign(store, fresh);
      globalThis.__demoStore = store;
      break;
    }
  }
}

/* ------------------------------ snapshot --------------------------- */

export function snapshot(store: DemoStore, now: Date): DemoSnapshot {
  return {
    now: now.toISOString(),
    stations: store.stations,
    orders: store.orders,
    andon: [...store.andon].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30),
    downtime: [...store.downtime].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 60),
    maintenance: [...store.maintenance].sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt)),
    alerts: [...store.alerts].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60),
    quotes: [...store.quotes].sort((a, b) => b.at.localeCompare(a.at)),
    stock: store.stock,
    stockMoves: [...store.stockMoves].slice(0, 40),
    scrapEvents: [...store.scrapEvents].slice(0, 200),
    settings: store.settings,
    today: {
      output: store.stations.reduce((s, st) => s + st.todayOutput, 0),
      scrap: store.stations.reduce((s, st) => s + st.todayScrap, 0),
      util: plantToday(now).util,
    },
  };
}
