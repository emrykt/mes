import fs from "node:fs";
import path from "node:path";
import { kvRead, kvWrite, useRedis } from "./kv";
import type {
  DemoAction,
  DemoSnapshot,
  DemoStore,
  LiveStation,
  MultiStore,
  SavedQuote,
  StockItem,
} from "../demo-types";
import {
  COMPANY_LIST,
  COMPANY_PROFILES,
  DEFAULT_COMPANY_ID,
  companyProfile,
  type CompanyProfile,
} from "../companies";
import { DEFAULT_PRICING, PLAN_ENTITLEMENTS, PLAN_RETENTION_MONTHS } from "../data";
import type { PricingConfig } from "../demo-types";
import { KPI_DEFS, defaultKpiTargets, kpiStatus } from "../kpi";
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
  partsForCompany,
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
  var __demoMulti: MultiStore | undefined;
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

/** The part templates a store's company can run (right kind + reachable ops). */
function poolFor(store: DemoStore) {
  const p = companyProfile(store.id);
  return partsForCompany(p.stationIds, p.partKinds);
}

function seedActiveOrders(store: DemoStore, now: Date): void {
  const { seedWip, seedBacklog } = companyProfile(store.id).scenario;
  const pool = poolFor(store);
  // WIP: current step distributed *uniformly* across each order's routing, so
  // downstream operations (montaj/kalite/paket) get queued work too, not just
  // the front of the line. Seed keys are company-scoped for per-plant variety.
  for (let i = 0; i < seedWip; i++) {
    const id = nextOrderId(store, now);
    const createdAt = new Date(now.getTime() - (2 + i) * 5 * 3600000);
    const key = `seed:${store.id}:${id}`;
    const order = buildOrder(key, id, createdAt, false, pool);
    const len = order.routing.length;
    const doneSteps = Math.min(len - 1, Math.floor(rand(`${key}:adv`) * len));
    for (let s = 0; s < len; s++) {
      const step = order.routing[s];
      const est = step.estMinutes ?? 60;
      if (s < doneSteps) {
        step.status = "done";
        step.qtyDone = order.qty;
        step.runMinutes = est;
        step.actualMinutes = Math.round(est * (0.85 + rand(`${key}:a${s}`) * 0.35));
      } else if (s === doneSteps) {
        step.status = "queued";
        const frac = rand(`${key}:part`) * 0.4;
        step.runMinutes = Math.round(est * frac);
        step.qtyDone = Math.floor(order.qty * frac);
      }
    }
    store.orders.push(order);
  }

  // Backlog: brand-new orders, only step 1 queued — the waiting pile.
  for (let i = 0; i < seedBacklog; i++) {
    const id = nextOrderId(store, now);
    const createdAt = new Date(now.getTime() - i * 3 * 3600000);
    const order = buildOrder(`backlog:${store.id}:${id}`, id, createdAt, false, pool);
    order.routing[0].status = "queued";
    store.orders.push(order);
  }
}

function seedStore(now: Date, profile: CompanyProfile): DemoStore {
  const stationDefs = profile.stationIds
    .map((id) => SIM_STATIONS.find((d) => d.id === id))
    .filter((d): d is (typeof SIM_STATIONS)[number] => !!d);
  const store: DemoStore = {
    version: 1,
    id: profile.id,
    createdAt: now.toISOString(),
    lastTickAt: now.toISOString(),
    currentDay: isoDay(now),
    orderSeq: {},
    orders: [],
    stations: stationDefs.map((def) => {
      const mins = todayMinutesShare(def, now, profile.utilFactor);
      return {
        id: def.id,
        state: "idle" as const,
        operator: operatorFor(def.id, shiftForHour(now.getUTCHours()).id),
        currentOrderIds: [],
        todayOutput: plantTodayShare(def.id, now),
        todayScrap: 0,
        todayPlannedMin: mins.planned,
        todayActualMin: mins.actual,
        frac: 0,
      };
    }),
    andon: [],
    downtime: [],
    maintenance: seedMaintenance(now, profile.stationIds),
    settings: {
      plan: profile.plan,
      currency: profile.currency,
      costRates: { laborPerHour: 14, energyPerHour: 9, gasPerHour: 6, overheadPerDay: 420 },
      billingRates: { ...DEFAULT_BILLING_RATES },
      features: { ...profile.features },
      maintenanceOwnDepartment: true,
      workingCalendar: { ...profile.workingCalendar },
      operations: [...DEFAULT_OPERATIONS],
      downtimeReasons: [...DEFAULT_DOWNTIME_REASONS],
      scrapReasons: [...DEFAULT_SCRAP_REASONS],
      escalationRules: DEFAULT_ESCALATION_RULES.map((r) => ({ ...r })),
      kpiTargets: defaultKpiTargets(profile),
      retentionAddonMonths: 0,
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

function clonePricing(): PricingConfig {
  return {
    plans: { ...DEFAULT_PRICING.plans },
    addonTiers: DEFAULT_PRICING.addonTiers.map((a) => ({ ...a })),
  };
}

/** Seed the whole multi-tenant store: one independent plant per company. */
function seedMulti(now: Date): MultiStore {
  const companies: Record<string, DemoStore> = {};
  for (const profile of COMPANY_PROFILES) {
    companies[profile.id] = seedStore(now, profile);
  }
  return { version: 2, createdAt: now.toISOString(), companies, pricing: clonePricing() };
}

/**
 * Seed one ongoing breakdown (35 min and counting) so a brand-new demo shows a
 * live alert ladder immediately: the 5-min rule notifies Maintenance and the
 * 30-min rule escalates to the Supervisor.
 */
function seedOpenIncident(store: DemoStore, now: Date): void {
  const st = store.stations.find((s) => s.id === "st-welding-1") ?? store.stations[0];
  if (!st) return;
  const since = new Date(now.getTime() - 35 * 60000);
  st.state = "down";
  st.downtimeReasonId = "dt-breakdown";
  st.downtimeSince = since.toISOString();
  st.downtimeUntil = new Date(now.getTime() + 15 * 60000).toISOString();
  st.currentOrderIds = [];
  store.downtime.push({
    id: `dt-seed-open-${st.id}`,
    stationId: st.id,
    reasonId: "dt-breakdown",
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
    { customer: CUSTOMER_POOL[0], part: "Chassis mounting plate", qty: 120, lines: [{ op: "op-laser", h: 6 }, { op: "op-pressbrake", h: 4 }, { op: "op-welding", h: 5 }], material: 4200, margin: 22, days: 3 },
    { customer: CUSTOMER_POOL[1], part: "Panel body PG-12", qty: 40, lines: [{ op: "op-laser", h: 3 }, { op: "op-pressbrake", h: 2.5 }, { op: "op-coating", h: 2 }], material: 1800, margin: 25, days: 8 },
    { customer: CUSTOMER_POOL[2], part: "Conveyor side profile", qty: 60, lines: [{ op: "op-plasma", h: 5 }, { op: "op-welding", h: 6 }], material: 3100, margin: 18, days: 12 },
    { customer: CUSTOMER_POOL[3], part: "Vent frame MF-30", qty: 200, lines: [{ op: "op-punch", h: 4 }, { op: "op-pressbrake", h: 5 }, { op: "op-packaging", h: 2 }], material: 2600, margin: 20, days: 17 },
    { customer: CUSTOMER_POOL[0], part: "Kabin arka paneli", qty: 80, lines: [{ op: "op-laser", h: 4 }, { op: "op-pressbrake", h: 3 }], material: 2200, margin: 24, days: 23 },
    { customer: CUSTOMER_POOL[4], part: "Filter housing FK-8", qty: 150, lines: [{ op: "op-laser", h: 7 }, { op: "op-welding", h: 8 }, { op: "op-assembly", h: 4 }], material: 5400, margin: 19, days: 31 },
    { customer: CUSTOMER_POOL[2], part: "Hood body DV-450", qty: 55, lines: [{ op: "op-laser", h: 3.5 }, { op: "op-pressbrake", h: 4 }, { op: "op-coating", h: 2.5 }], material: 2900, margin: 21, days: 40 },
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

const MACHINING_OPS = new Set(["op-sawing", "op-turning", "op-milling", "op-drilling"]);

/** Seeded raw-material stock. Bars are kept in kg; sheet metal in pieces (adet)
 *  with size + thickness + weight/sheet. Two items start below reorder so the
 *  low-stock alert shows immediately. */
function seedStock(): StockItem[] {
  return [
    // bars & block — kg
    { id: "stk-bar-st37-40", materialType: "Mild steel S235", form: "bar", unit: "kg", dimension: "Ø40", onHand: 1450, reorder: 400, costPerKg: 0.9 },
    { id: "stk-bar-st37-25", materialType: "Mild steel S235", form: "bar", unit: "kg", dimension: "Ø25", onHand: 300, reorder: 350, costPerKg: 0.95 },
    { id: "stk-bar-304-30", materialType: "Stainless 304", form: "bar", unit: "kg", dimension: "Ø30", onHand: 680, reorder: 250, costPerKg: 3.2 },
    { id: "stk-bar-al-50", materialType: "Aluminum 6061", form: "bar", unit: "kg", dimension: "Ø50", onHand: 410, reorder: 200, costPerKg: 2.8 },
    { id: "stk-tube-st37-60", materialType: "Mild steel S235", form: "tube", unit: "kg", dimension: "60×60 tube", onHand: 540, reorder: 200, costPerKg: 1.05 },
    { id: "stk-block-al", materialType: "Aluminum 6061", form: "block", unit: "kg", dimension: "block", onHand: 260, reorder: 120, costPerKg: 3.0 },
    // sheet metal — pieces (adet), size × thickness, weight per sheet
    { id: "stk-plate-dkp-2", materialType: "Cold-rolled steel", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 2, weightKgPerPiece: 49, onHand: 45, reorder: 15, costPerKg: 0.85 },
    { id: "stk-plate-dkp-4", materialType: "Cold-rolled steel", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 4, weightKgPerPiece: 98, onHand: 8, reorder: 12, costPerKg: 0.85 },
    { id: "stk-plate-304-15", materialType: "Stainless 304", form: "plate", unit: "piece", dimension: "1250 × 2500", thicknessMm: 1.5, weightKgPerPiece: 38, onHand: 24, reorder: 10, costPerKg: 3.1 },
    { id: "stk-plate-st37-6", materialType: "Mild steel S235", form: "plate", unit: "piece", dimension: "1500 × 3000", thicknessMm: 6, weightKgPerPiece: 212, onHand: 16, reorder: 6, costPerKg: 0.88 },
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
        remItem = { id: remId, materialType: item.materialType, form: item.form, unit: "kg", dimension: `${item.dimension} offcut`, onHand: 0, reorder: 0, costPerKg: item.costPerKg, isRemnant: true };
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
  // today's scrap so the scrap board is populated on a fresh store
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

/** Recurring maintenance plans; lastDone seeded so some are already due.
 *  Only tasks for stations the company actually operates are kept. */
function seedMaintenance(now: Date, stationIds: string[]) {
  const have = new Set(stationIds);
  const allDefs: [string, string, number][] = [
    ["st-laser-1", "Lens cleaning", 7],
    ["st-laser-2", "Lens cleaning", 7],
    ["st-laser-1", "Nozzle check", 30],
    ["st-plasma-1", "Electrode / nozzle change", 14],
    ["st-punch-1", "Punch sharpening", 30],
    ["st-pressbrake-1", "Hydraulic oil check", 90],
    ["st-pressbrake-2", "Backgauge calibration", 180],
    ["st-welding-1", "Torch maintenance", 30],
    ["st-assembly-1", "Air tool maintenance", 60],
    ["st-packaging-1", "Strapping machine service", 90],
    ["st-sawing-1", "Blade change", 14],
    ["st-turning-1", "Chuck / tailstock check", 30],
    ["st-turning-2", "Slideway lubrication", 30],
    ["st-milling-1", "Spindle bearing check", 60],
    ["st-milling-2", "Coolant change", 45],
    ["st-drilling-1", "Chuck maintenance", 90],
    ["st-quality-1", "Gauge calibration", 90],
  ];
  const defs = allDefs.filter(([stationId]) => have.has(stationId));
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
  store.id ??= DEFAULT_COMPANY_ID;
  const s = store as DemoStore & { settings: { rates?: unknown } };
  delete s.settings.rates; // FX conversion removed — currency is display-only
  store.settings.plan ??= "AIPRO";
  store.settings.escalationRules ??= DEFAULT_ESCALATION_RULES.map((r) => ({ ...r }));
  store.settings.maintenanceOwnDepartment ??= true;
  store.settings.workingCalendar ??= { shifts: 3, restDays: [] };
  store.settings.kpiTargets ??= defaultKpiTargets(companyProfile(store.id));
  store.settings.retentionAddonMonths ??= 0;
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
  // backfill billing rates for the whole catalog (harmless extras)
  for (const def of SIM_STATIONS)
    store.settings.billingRates[def.id] ??= DEFAULT_BILLING_RATES[def.id] ?? 40;
  const profile = companyProfile(store.id);
  store.maintenance ??= seedMaintenance(now, profile.stationIds);
  // reconcile live stations to exactly this company's station set
  const wanted = new Set(profile.stationIds);
  store.stations = store.stations.filter((st) => wanted.has(st.id));
  for (const st of store.stations) {
    if (st.todayPlannedMin == null || st.todayActualMin == null) {
      const def = SIM_STATIONS.find((d) => d.id === st.id);
      const mins = def
        ? todayMinutesShare(def, now, profile.utilFactor)
        : { planned: 0, actual: 0 };
      st.todayPlannedMin ??= mins.planned;
      st.todayActualMin ??= mins.actual;
    }
  }
  for (const id of profile.stationIds) {
    const def = SIM_STATIONS.find((d) => d.id === id);
    if (def && !store.stations.some((st) => st.id === id)) {
      const mins = todayMinutesShare(def, now, profile.utilFactor);
      store.stations.push({
        id: def.id,
        state: "idle",
        operator: operatorFor(def.id, shiftForHour(now.getUTCHours()).id),
        currentOrderIds: [],
        todayOutput: plantTodayShare(def.id, now),
        todayScrap: 0,
        todayPlannedMin: mins.planned,
        todayActualMin: mins.actual,
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

/** Realistic mid-day seed of planned/actual minutes completed so far today. */
function todayMinutesShare(
  def: { baseUtil: number },
  now: Date,
  utilFactor: number,
): { planned: number; actual: number } {
  const elapsedH = now.getUTCHours();
  const actual = Math.round(elapsedH * 60 * Math.min(1, def.baseUtil * utilFactor));
  return { planned: Math.round(actual * 1.03), actual };
}

/* --------------------------- persistence --------------------------- */

/** Parse a persisted blob into a valid MultiStore, migrating/reseeding as needed. */
function reviveMulti(raw: string, now: Date): MultiStore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return seedMulti(now);
  }
  const multi = parsed as Partial<MultiStore>;
  if (multi.version !== 2 || !multi.companies || typeof multi.companies !== "object") {
    // old single-store (v1) or unknown shape → fresh multi-tenant seed
    return seedMulti(now);
  }
  // ensure every configured company exists + is migrated to current shape
  for (const profile of COMPANY_PROFILES) {
    const c = multi.companies[profile.id];
    if (!c) {
      multi.companies[profile.id] = seedStore(now, profile);
    } else {
      c.id ??= profile.id;
      migrate(c, now);
    }
  }
  multi.pricing ??= clonePricing();
  return multi as MultiStore;
}

export async function loadStore(now: Date): Promise<MultiStore> {
  // Cloud: the Redis blob is the single source of truth. Read fresh every
  // request (no global cache) so instances never serve stale state.
  if (useRedis) {
    const raw = await kvRead();
    if (raw) return reviveMulti(raw, now);
    const seeded = seedMulti(now);
    await kvWrite(JSON.stringify(seeded));
    return seeded;
  }
  // Local dev: file-backed with an in-memory cache (survives HMR).
  if (globalThis.__demoMulti) {
    for (const c of Object.values(globalThis.__demoMulti.companies)) migrate(c, now);
    return globalThis.__demoMulti;
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    globalThis.__demoMulti = reviveMulti(raw, now);
  } catch {
    globalThis.__demoMulti = seedMulti(now);
    await persist(globalThis.__demoMulti, true);
  }
  return globalThis.__demoMulti;
}

export async function persist(multi: MultiStore, force = false): Promise<void> {
  if (useRedis) {
    await kvWrite(JSON.stringify(multi));
    return;
  }
  globalThis.__demoMulti = multi;
  const last = globalThis.__demoLastPersist ?? 0;
  if (!force && Date.now() - last < 10_000) return;
  globalThis.__demoLastPersist = Date.now();
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const tmp = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(multi), "utf8");
  fs.renameSync(tmp, STORE_FILE); // atomic-ish: no half-written reads
}

/** Advance every company; true if any company ticked. */
export function advanceMulti(multi: MultiStore, now: Date): boolean {
  let changed = false;
  for (const c of Object.values(multi.companies)) {
    if (advance(c, now)) changed = true;
  }
  return changed;
}

/** Snapshot one company by id (defaults to the first configured company). */
export function snapshotFor(multi: MultiStore, companyId: string, now: Date): DemoSnapshot {
  const store = multi.companies[companyId] ?? multi.companies[DEFAULT_COMPANY_ID];
  return snapshot(store, now, multi.pricing ?? clonePricing());
}

/** Apply an action to one company. resetDemo reseeds the whole multi store. */
export function applyActionMulti(
  multi: MultiStore,
  companyId: string,
  action: DemoAction,
  now: Date,
): void {
  if (action.type === "resetDemo") {
    const fresh = seedMulti(now);
    multi.companies = fresh.companies;
    multi.createdAt = fresh.createdAt;
    multi.pricing = fresh.pricing;
    return;
  }
  if (action.type === "savePricing") {
    multi.pricing = action.pricing;
    return;
  }
  const store = multi.companies[companyId] ?? multi.companies[DEFAULT_COMPANY_ID];
  if (store) applyAction(store, action, now);
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
  const scn = companyProfile(store.id).scenario;
  // day rollover: reset today counters, prune old records
  const day = isoDay(now);
  if (day !== store.currentDay) {
    store.currentDay = day;
    for (const st of store.stations) {
      st.todayOutput = 0;
      st.todayScrap = 0;
      st.todayPlannedMin = 0;
      st.todayActualMin = 0;
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
      // every active step (multi-job steps advance in parallel on one machine).
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
          rand(`${st.id}:${epochMin}:scrap:${orderId}`) < (def.kind === "quality" ? scn.scrapRate * 2.3 : scn.scrapRate)
        ) {
          step.scrapQty = (step.scrapQty ?? 0) + 1;
          st.todayScrap += 1;
          recordScrap(store, st.id, order, `${st.id}:${epochMin}:scr`, now);
        }
        if (step.runMinutes >= est) completeStep(store, st, order, step, now);
      }
      if (st.currentOrderIds.length === 0) st.state = "idle";

      // occasional automatic downtime (breakdown, material wait…)
      if (rand(`${st.id}:${epochMin}:dt`) < scn.breakdownRate) {
        const reasonId =
          rand(`${st.id}:${epochMin}:dtr`) < 0.4 ? "dt-breakdown" : rand(`${st.id}:${epochMin}:dtr2`) < 0.5 ? "dt-material" : "dt-setup";
        startDowntimeInternal(store, st, reasonId, now, 8 + Math.round(rand(`${st.id}:${epochMin}:dtl`) * 22));
        if (reasonId === "dt-breakdown") {
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

  // keep a deep backlog: top the order book up toward the company's target so
  // the plant always has waiting work and every station stays busy.
  if (epochMin % 6 === 0) {
    const pool = poolFor(store);
    let active = store.orders.filter((o) => !orderDone(o)).length;
    let added = 0;
    while (active < scn.refillTarget && added < 3) {
      const id = nextOrderId(store, now);
      const order = buildOrder(`auto:${store.id}:${id}`, id, now, false, pool);
      order.routing[0].status = "queued";
      assignOrderMaterial(store, order);
      store.orders.push(order);
      active++;
      added++;
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
  // time-based "completed work" today: planned (est) vs actual minutes
  st.todayPlannedMin = (st.todayPlannedMin ?? 0) + (step.estMinutes ?? 0);
  st.todayActualMin = (st.todayActualMin ?? 0) + (step.actualMinutes ?? 0);
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

  // KPI target alarms — twice-hourly, plans with advanced analytics (AI Pro+).
  const minute = Math.floor(now.getTime() / 60000);
  if (minute % 30 === 0 && PLAN_ENTITLEMENTS[store.settings.plan].advancedAnalytics) {
    const profile = companyProfile(store.id);
    const targets = store.settings.kpiTargets ?? {};
    const nowIso = now.toISOString();
    const totalOut = store.stations.reduce((s, st) => s + st.todayOutput, 0);
    const totalScrap = store.stations.reduce((s, st) => s + st.todayScrap, 0);
    const util = Math.max(0, Math.min(1, plantToday(now).util * profile.utilFactor)) * 100;
    const scrapRate = totalOut + totalScrap > 0 ? (totalScrap / (totalOut + totalScrap)) * 100 : 0;
    const open = store.orders.filter((o) => !orderDone(o));
    const late = open.filter((o) => o.dueDate < nowIso).length;
    const onTime = open.length > 0 ? (1 - late / open.length) * 100 : 100;
    const dayStart = new Date(`${day}T00:00:00.000Z`).getTime();
    let dtMin = 0;
    for (const d of store.downtime) {
      const s = Math.max(dayStart, new Date(d.startedAt).getTime());
      const e = d.endedAt ? new Date(d.endedAt).getTime() : now.getTime();
      if (e > s) dtMin += (e - s) / 60000;
    }
    const overdue = store.settings.features.maintenance
      ? store.maintenance.filter((m) => m.nextDueAt < nowIso).length
      : 0;
    const kpiVals: [string, number][] = [
      ["utilization", util],
      ["scrapRate", scrapRate],
      ["onTimeDelivery", onTime],
      ["downtimeMin", dtMin],
      ["overdueMaint", overdue],
    ];
    for (const [id, value] of kpiVals) {
      const def = KPI_DEFS.find((d) => d.id === id);
      if (!def?.alarm) continue;
      const target = targets[id] ?? def.defaultTarget;
      if (kpiStatus(value, target, def) !== "bad") continue;
      const key = `kpi:${id}:${day}`;
      if (has(key)) continue;
      store.alerts.push({
        id: `al-kpi-${id}-${minute}`,
        ruleId: "kpi",
        trigger: "kpiTarget",
        stationId: "",
        target: "supervisor",
        at: nowIso,
        value: Math.round(value),
        threshold: target,
        reasonId: id,
        label: id,
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
    case "saveKpiTargets":
      store.settings.kpiTargets = { ...store.settings.kpiTargets, ...action.targets };
      break;
    case "buyRetentionAddon":
      store.settings.retentionAddonMonths =
        (store.settings.retentionAddonMonths ?? 0) + Math.max(0, action.months);
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
    case "resetDemo":
      // Handled at the multi-store level (applyActionMulti reseeds all
      // companies); nothing to do per-company here.
      break;
  }
}

/* ------------------------------ snapshot --------------------------- */

export function snapshot(store: DemoStore, now: Date, pricing: PricingConfig): DemoSnapshot {
  const profile = companyProfile(store.id);
  const planMonths = PLAN_RETENTION_MONTHS[store.settings.plan];
  const addonMonths = store.settings.retentionAddonMonths ?? 0;
  // Gate modules by plan: quoting/maintenance/stock are AI Pro+ only. Return a
  // copy so the stored flags are never mutated (admin still edits the raw ones).
  const ent = PLAN_ENTITLEMENTS[store.settings.plan];
  const f = store.settings.features;
  const gatedSettings = {
    ...store.settings,
    features: {
      barcode: f.barcode,
      quoting: f.quoting && ent.quoting,
      maintenance: f.maintenance && ent.maintenance,
      stock: f.stock && ent.stock,
    },
  };
  return {
    now: now.toISOString(),
    companyId: profile.id,
    companyName: profile.name,
    sector: profile.sector,
    companies: COMPANY_LIST,
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
    settings: gatedSettings,
    pricing,
    retention: { planMonths, addonMonths, totalMonths: planMonths + addonMonths },
    today: (() => {
      const plannedMin = store.stations.reduce((s, st) => s + (st.todayPlannedMin ?? 0), 0);
      const actualMin = store.stations.reduce((s, st) => s + (st.todayActualMin ?? 0), 0);
      return {
        output: store.stations.reduce((s, st) => s + st.todayOutput, 0),
        scrap: store.stations.reduce((s, st) => s + st.todayScrap, 0),
        util: Math.max(0, Math.min(1, plantToday(now).util * profile.utilFactor)),
        plannedHours: Math.round((plannedMin / 60) * 10) / 10,
        actualHours: Math.round((actualMin / 60) * 10) / 10,
        planPerf: actualMin > 0 ? Math.round((plannedMin / actualMin) * 100) : 100,
      };
    })(),
  };
}
