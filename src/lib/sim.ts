import type {
  DowntimeReason,
  MaterialSpec,
  MesOrder,
  OperationDef,
  RoutingStep,
} from "./mes-types";
import type { EscalationRule } from "./demo-types";

/**
 * Deterministic 24/7 plant simulation, keyed to the real wall clock.
 * Everything here is a pure function of (entity, time) through a seeded RNG,
 * so months of history exist "for free" and every client computes the same
 * numbers. The live store (server) uses this as its baseline and overlays
 * real user actions on top.
 */

/* ------------------------------ RNG ------------------------------ */

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic [0,1) for a string key. */
export function rand(key: string): number {
  let t = (hashStr(key) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(key: string, arr: readonly T[]): T {
  return arr[Math.floor(rand(key) * arr.length)];
}

/* --------------------------- catalogs ---------------------------- */

export type MachineKind =
  | "cutting"
  | "sawing"
  | "turning"
  | "milling"
  | "drilling"
  | "punching"
  | "bending"
  | "welding"
  | "assembly"
  | "quality"
  | "packaging";

export const DEFAULT_OPERATIONS: OperationDef[] = [
  { id: "op-testere", name: "Şerit Testere", batchable: true },
  { id: "op-torna", name: "CNC Torna" },
  { id: "op-freze", name: "CNC Freze" },
  { id: "op-matkap", name: "Matkap / Delik" },
  { id: "op-lazer", name: "Lazer Kesim", batchable: true },
  { id: "op-plazma", name: "Plazma Kesim", batchable: true },
  { id: "op-oksijen", name: "Oksijen Kesim", batchable: true },
  { id: "op-punch", name: "Punch Pres" },
  { id: "op-abkant", name: "Abkant Büküm" },
  { id: "op-rulo", name: "Rulo Büküm" },
  { id: "op-kaynak", name: "Kaynak", batchable: true },
  { id: "op-montaj", name: "Montaj" },
  { id: "op-boya", name: "Toz Boya" },
  { id: "op-kalite", name: "Kalite Kontrol" },
  { id: "op-paket", name: "Paketleme / Sevkiyat" },
];

export const DEFAULT_DOWNTIME_REASONS: DowntimeReason[] = [
  { id: "dt-ariza", name: "Makine arızası" },
  { id: "dt-setup", name: "Ayar / setup" },
  { id: "dt-malzeme", name: "Malzeme bekleme" },
  { id: "dt-operator", name: "Operatör yok" },
  { id: "dt-kalite", name: "Kalite bekleme" },
  { id: "dt-mola", name: "Mola" },
];

/**
 * Default escalation ladder (the plant can retune thresholds and recipients):
 * scrap over 5% → supervisor; any breakdown/stoppage over 5 min → maintenance;
 * over 30 min → supervisor as well.
 */
/** Scrap/waste reasons (tenant data → Turkish mock). */
export const DEFAULT_SCRAP_REASONS = [
  { id: "sc-olcu", name: "Ölçü dışı" },
  { id: "sc-ayar", name: "Ayar / setup firesi" },
  { id: "sc-malzeme", name: "Malzeme hatası" },
  { id: "sc-takim", name: "Kalıp / takım" },
  { id: "sc-yuzey", name: "Yüzey / çapak" },
  { id: "sc-operator", name: "Operatör hatası" },
];

/** Weighted scrap-reason picker (deterministic via seed). */
export function pickScrapReason(seed: string): string {
  const weights: [string, number][] = [
    ["sc-olcu", 0.26],
    ["sc-ayar", 0.22],
    ["sc-malzeme", 0.18],
    ["sc-takim", 0.14],
    ["sc-yuzey", 0.12],
    ["sc-operator", 0.08],
  ];
  let r = rand(seed);
  for (const [id, w] of weights) {
    if (r < w) return id;
    r -= w;
  }
  return "sc-olcu";
}

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  { id: "esc-scrap", trigger: "scrapRate", threshold: 0.05, target: "supervisor", enabled: true },
  { id: "esc-dt-5", trigger: "downtime", threshold: 5, target: "maintenance", enabled: true },
  { id: "esc-dt-30", trigger: "downtime", threshold: 30, target: "supervisor", enabled: true },
];

export interface SimStationDef {
  id: string;
  name: string;
  operationId: string;
  kind: MachineKind;
  /** Nominal good-parts-per-hour at 100% utilization. */
  rate: number;
  /** Base utilization the station oscillates around. */
  baseUtil: number;
}

/** Demo stations, one kiosk each — machining (turning/milling/drilling/sawing)
 *  and sheet-metal (cutting/bending/welding) side by side (metal workshop). */
export const SIM_STATIONS: SimStationDef[] = [
  { id: "st-testere-1", name: "Şerit Testere", operationId: "op-testere", kind: "sawing", rate: 42, baseUtil: 0.66 },
  { id: "st-torna-1", name: "CNC Torna 1", operationId: "op-torna", kind: "turning", rate: 15, baseUtil: 0.78 },
  { id: "st-torna-2", name: "CNC Torna 2", operationId: "op-torna", kind: "turning", rate: 13, baseUtil: 0.7 },
  { id: "st-freze-1", name: "CNC İşleme Merkezi 1", operationId: "op-freze", kind: "milling", rate: 11, baseUtil: 0.75 },
  { id: "st-freze-2", name: "CNC İşleme Merkezi 2", operationId: "op-freze", kind: "milling", rate: 9, baseUtil: 0.68 },
  { id: "st-matkap-1", name: "Radyal Matkap", operationId: "op-matkap", kind: "drilling", rate: 34, baseUtil: 0.6 },
  { id: "st-lazer-1", name: "Lazer Kesim 1", operationId: "op-lazer", kind: "cutting", rate: 46, baseUtil: 0.8 },
  { id: "st-lazer-2", name: "Lazer Kesim 2", operationId: "op-lazer", kind: "cutting", rate: 40, baseUtil: 0.72 },
  { id: "st-plazma-1", name: "Plazma Kesim", operationId: "op-plazma", kind: "cutting", rate: 28, baseUtil: 0.6 },
  { id: "st-punch-1", name: "Punch Pres", operationId: "op-punch", kind: "punching", rate: 95, baseUtil: 0.68 },
  { id: "st-abkant-1", name: "Abkant Pres 1", operationId: "op-abkant", kind: "bending", rate: 36, baseUtil: 0.77 },
  { id: "st-abkant-2", name: "Abkant Pres 2", operationId: "op-abkant", kind: "bending", rate: 31, baseUtil: 0.66 },
  { id: "st-kaynak-1", name: "Kaynak İstasyonu", operationId: "op-kaynak", kind: "welding", rate: 18, baseUtil: 0.63 },
  { id: "st-montaj-1", name: "Montaj Hattı", operationId: "op-montaj", kind: "assembly", rate: 22, baseUtil: 0.62 },
  { id: "st-kalite-1", name: "Kalite Kontrol", operationId: "op-kalite", kind: "quality", rate: 70, baseUtil: 0.7 },
  { id: "st-paket-1", name: "Paketleme / Sevkiyat", operationId: "op-paket", kind: "packaging", rate: 55, baseUtil: 0.64 },
];

export function getSimStation(id: string): SimStationDef | undefined {
  return SIM_STATIONS.find((s) => s.id === id);
}

/** Default market billing rate per station-hour (base currency figures). */
export const DEFAULT_BILLING_RATES: Record<string, number> = {
  "st-testere-1": 48,
  "st-torna-1": 88,
  "st-torna-2": 82,
  "st-freze-1": 98,
  "st-freze-2": 92,
  "st-matkap-1": 52,
  "st-lazer-1": 78,
  "st-lazer-2": 72,
  "st-plazma-1": 58,
  "st-punch-1": 50,
  "st-abkant-1": 46,
  "st-abkant-2": 44,
  "st-kaynak-1": 42,
  "st-montaj-1": 36,
  "st-kalite-1": 30,
  "st-paket-1": 26,
};

/** Billing rate for the station(s) bound to an operation (average). */
export function operationBillingRate(
  operationId: string,
  rates: Record<string, number>,
): number {
  const stations = SIM_STATIONS.filter((s) => s.operationId === operationId);
  if (stations.length === 0) return 40;
  const sum = stations.reduce((s, st) => s + (rates[st.id] ?? 40), 0);
  return Math.round(sum / stations.length);
}

/* ------------------------- shifts & people ------------------------ */

/** Shift names/windows are tenant data → customer wording. */
export const SHIFTS = [
  { id: 0, name: "Vardiya 1 (08–16)", startHour: 8 },
  { id: 1, name: "Vardiya 2 (16–24)", startHour: 16 },
  { id: 2, name: "Vardiya 3 (00–08)", startHour: 0 },
] as const;

export function shiftForHour(hour: number): (typeof SHIFTS)[number] {
  if (hour >= 8 && hour < 16) return SHIFTS[0];
  if (hour >= 16) return SHIFTS[1];
  return SHIFTS[2];
}

const OPERATOR_POOL = [
  "Hasan Yılmaz", "Ayşe Korkmaz", "Ali Şahin", "Emre Kaya", "Kemal Aydın",
  "Mehmet Öz", "Zeynep Ak", "Fatma Soy", "Murat Çelik", "Deniz Arslan",
  "Selim Koç", "Elif Duman", "Burak Eren", "Canan Tekin", "Oğuz Yavuz",
  "Merve Aksoy", "Serkan Polat", "Gül Şen", "Tolga Kurt", "Nazlı Öztürk",
  "İsmail Vural", "Hakan Doğan", "Şule Erdem", "Ramazan Işık", "Ceren Ata",
  "Volkan Sarı", "Pelin Güneş",
] as const;

/** Stable operator assignment per station+shift (27 slots ← 27 names). */
export function operatorFor(stationId: string, shiftId: number): string {
  const si = SIM_STATIONS.findIndex((s) => s.id === stationId);
  return OPERATOR_POOL[(si * 3 + shiftId) % OPERATOR_POOL.length];
}

/* ------------------------- hourly engine -------------------------- */

export interface HourCell {
  util: number;
  output: number;
  scrap: number;
  downMin: number;
  downReasonId?: string;
}

const REASON_WEIGHTS: [string, number][] = [
  ["dt-ariza", 0.28],
  ["dt-setup", 0.26],
  ["dt-malzeme", 0.2],
  ["dt-mola", 0.14],
  ["dt-operator", 0.12],
];

function weightedReason(key: string): string {
  let r = rand(key);
  for (const [id, w] of REASON_WEIGHTS) {
    if (r < w) return id;
    r -= w;
  }
  return "dt-kalite";
}

function hourKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
}

/** Deterministic production for one station in one wall-clock hour. */
export function simHour(stationId: string, dt: Date): HourCell {
  const st = getSimStation(stationId);
  if (!st) return { util: 0, output: 0, scrap: 0, downMin: 0 };

  const hour = dt.getUTCHours();
  const dow = dt.getUTCDay(); // 0 = Sunday
  const key = `${stationId}:${hourKey(dt)}`;

  // Shift & calendar factors: Sunday skeleton crew, meal-break dips.
  const shift = shiftForHour(hour);
  const shiftFactor = shift.id === 0 ? 1 : shift.id === 1 ? 0.92 : 0.78;
  const sundayFactor = dow === 0 ? 0.35 : 1;
  const mealDip = hour === 12 || hour === 20 || hour === 4 ? 0.6 : 1;

  let util =
    st.baseUtil * shiftFactor * sundayFactor * mealDip +
    (rand(`${key}:w`) - 0.5) * 0.22;

  let downMin = 0;
  let downReasonId: string | undefined;
  if (rand(`${key}:dt`) < 0.13) {
    downMin = Math.round(8 + rand(`${key}:dtl`) * 38);
    downReasonId = weightedReason(`${key}:dtr`);
    util *= (60 - downMin) / 60;
  }

  util = Math.max(0.02, Math.min(0.97, util));
  const output = Math.round(st.rate * util);
  const scrapRate = st.kind === "quality" ? 0.035 : 0.015;
  const scrap = Math.round(output * scrapRate * (0.5 + rand(`${key}:s`)));

  return { util, output, scrap, downMin, downReasonId };
}

/* ------------------------ range aggregates ------------------------ */

export interface DayStat {
  util: number;
  output: number;
  scrap: number;
  downMin: number;
  byReason: Record<string, number>;
}

const dayCache = new Map<string, DayStat>();

/** One station's full-day totals (24 simulated hours), memoized. */
export function simDay(stationId: string, dayIso: string): DayStat {
  const cacheKey = `${stationId}:${dayIso}`;
  const hit = dayCache.get(cacheKey);
  if (hit) return hit;

  let util = 0;
  let output = 0;
  let scrap = 0;
  let downMin = 0;
  const byReason: Record<string, number> = {};
  for (let h = 0; h < 24; h++) {
    const cell = simHour(stationId, new Date(`${dayIso}T${String(h).padStart(2, "0")}:00:00Z`));
    util += cell.util;
    output += cell.output;
    scrap += cell.scrap;
    downMin += cell.downMin;
    if (cell.downReasonId)
      byReason[cell.downReasonId] = (byReason[cell.downReasonId] ?? 0) + cell.downMin;
  }
  const stat = { util: util / 24, output, scrap, downMin, byReason };
  dayCache.set(cacheKey, stat);
  return stat;
}

export function dayIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/** Plant totals for [from..to] inclusive (ISO days). */
export function plantRange(fromIso: string, toIso: string): DayStat {
  let util = 0;
  let output = 0;
  let scrap = 0;
  let downMin = 0;
  const byReason: Record<string, number> = {};
  let days = 0;
  for (let d = new Date(`${fromIso}T00:00:00Z`); dayIso(d) <= toIso; d = addDays(d, 1)) {
    days++;
    for (const st of SIM_STATIONS) {
      const s = simDay(st.id, dayIso(d));
      util += s.util;
      output += s.output;
      scrap += s.scrap;
      downMin += s.downMin;
      for (const [r, m] of Object.entries(s.byReason))
        byReason[r] = (byReason[r] ?? 0) + m;
    }
  }
  const cells = Math.max(1, days * SIM_STATIONS.length);
  return { util: util / cells, output, scrap, downMin, byReason };
}

/** Per-day plant series for charts, oldest first. */
export function plantDailySeries(
  now: Date,
  days: number,
): { day: string; util: number; output: number; scrap: number; downMin: number }[] {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = dayIso(addDays(now, -i));
    let util = 0;
    let output = 0;
    let scrap = 0;
    let downMin = 0;
    for (const st of SIM_STATIONS) {
      const s = simDay(st.id, iso);
      util += s.util;
      output += s.output;
      scrap += s.scrap;
      downMin += s.downMin;
    }
    out.push({ day: iso, util: util / SIM_STATIONS.length, output, scrap, downMin });
  }
  return out;
}

/** Plant "today so far": full hours elapsed today (UTC-naive demo clock). */
export function plantToday(now: Date): { util: number; output: number; scrap: number } {
  const iso = dayIso(now);
  const hours = now.getUTCHours();
  let util = 0;
  let output = 0;
  let scrap = 0;
  let cells = 0;
  for (const st of SIM_STATIONS) {
    for (let h = 0; h <= hours; h++) {
      const cell = simHour(st.id, new Date(`${iso}T${String(h).padStart(2, "0")}:00:00Z`));
      util += cell.util;
      output += cell.output;
      scrap += cell.scrap;
      cells++;
    }
  }
  return { util: util / Math.max(1, cells), output, scrap };
}

export function stationToday(stationId: string, now: Date): { util: number; output: number; scrap: number } {
  const iso = dayIso(now);
  const hours = now.getUTCHours();
  let util = 0;
  let output = 0;
  let scrap = 0;
  for (let h = 0; h <= hours; h++) {
    const cell = simHour(stationId, new Date(`${iso}T${String(h).padStart(2, "0")}:00:00Z`));
    util += cell.util;
    output += cell.output;
    scrap += cell.scrap;
  }
  return { util: util / Math.max(1, hours + 1), output, scrap };
}

/* -------------------- performance comparison ---------------------- */

export type PerfRange = "hour" | "day" | "week" | "month" | "quarter" | "year";
export const PERF_RANGES: PerfRange[] = ["hour", "day", "week", "month", "quarter", "year"];

const RANGE_DAYS: Record<PerfRange, number> = {
  hour: 1,
  day: 7,
  week: 42,
  month: 180,
  quarter: 365,
  year: 1095,
};

export interface PerfSnapshot {
  labelKind: "time" | "date" | "week" | "month" | "quarter" | "year";
  trend: { t: string; plant: number; sector: number }[];
  shifts: { name: string; util: number; output: number; perf: number; adherence: number }[];
  benchmark: { plant: number; sectorAvg: number; sectorTop: number };
  operators: { name: string; util: number; output: number; perf: number; adherence: number }[];
}

/** Plan & capacity adherence 0..1 = mean of plan adherence and utilization. */
function adherence(perf: number, util: number): number {
  return (Math.min(1, perf) + Math.min(1, util)) / 2;
}

function sectorOf(plant: number, key: string): number {
  return Math.max(0.4, Math.min(0.9, plant * 0.93 + (rand(key) - 0.5) * 0.05));
}

export function performanceFor(range: PerfRange, now: Date): PerfSnapshot {
  const trend: { t: string; plant: number; sector: number }[] = [];
  let labelKind: PerfSnapshot["labelKind"] = "date";

  if (range === "hour") {
    labelKind = "time";
    for (let i = 7; i >= 0; i--) {
      const dt = new Date(now.getTime() - i * 3600000);
      let u = 0;
      for (const st of SIM_STATIONS) u += simHour(st.id, dt).util;
      const plant = u / SIM_STATIONS.length;
      trend.push({
        t: `${String(dt.getUTCHours()).padStart(2, "0")}:00`,
        plant,
        sector: sectorOf(plant, `sec:h:${hourKey(dt)}`),
      });
    }
  } else if (range === "day") {
    labelKind = "date";
    for (const d of plantDailySeries(now, 7))
      trend.push({ t: d.day, plant: d.util, sector: sectorOf(d.util, `sec:d:${d.day}`) });
  } else if (range === "week") {
    labelKind = "week";
    for (let w = 5; w >= 0; w--) {
      const to = addDays(now, -w * 7);
      const from = addDays(to, -6);
      const s = plantRange(dayIso(from), dayIso(to));
      const wk = getWeekNo(to);
      trend.push({ t: `W${wk}`, plant: s.util, sector: sectorOf(s.util, `sec:w:${dayIso(to)}`) });
    }
  } else if (range === "month") {
    labelKind = "month";
    for (let m = 5; m >= 0; m--) {
      const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
      const end = m === 0 ? now : new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
      const s = plantRange(dayIso(ref), dayIso(end));
      const t = `${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, "0")}`;
      trend.push({ t, plant: s.util, sector: sectorOf(s.util, `sec:m:${t}`) });
    }
  } else if (range === "quarter") {
    labelKind = "quarter";
    for (let q = 3; q >= 0; q--) {
      const qStartMonth = Math.floor(now.getUTCMonth() / 3) * 3 - q * 3;
      const ref = new Date(Date.UTC(now.getUTCFullYear(), qStartMonth, 1));
      const end = q === 0 ? now : new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 3, 0));
      const s = plantRange(dayIso(ref), dayIso(end));
      const label = `Q${Math.floor(ref.getUTCMonth() / 3) + 1} '${String(ref.getUTCFullYear()).slice(2)}`;
      trend.push({ t: label, plant: s.util, sector: sectorOf(s.util, `sec:q:${label}`) });
    }
  } else {
    labelKind = "year";
    for (let y = 2; y >= 0; y--) {
      const year = now.getUTCFullYear() - y;
      const from = `${year}-01-01`;
      const to = y === 0 ? dayIso(now) : `${year}-12-31`;
      // full-year day loops are heavy → sample every 5th day
      const s = sampledRange(from, to, 5);
      trend.push({ t: String(year), plant: s.util, sector: sectorOf(s.util, `sec:y:${year}`) });
    }
  }

  const last = trend[trend.length - 1];
  const days = RANGE_DAYS[range];
  const outScale = SIM_STATIONS.length * 30 * 8; // rough parts per shift-day

  const shifts = SHIFTS.map((sh) => {
    const base = sh.id === 0 ? 1 : sh.id === 1 ? 0.92 : 0.78;
    const util = Math.min(0.95, last.plant * base * (1.05 + (rand(`shift:${range}:${sh.id}`) - 0.5) * 0.06));
    const perf = 0.9 + rand(`shp:${range}:${sh.id}`) * 0.18;
    return {
      name: sh.name,
      util,
      output: Math.round(outScale * days * base * 0.33 * util),
      perf,
      adherence: adherence(perf, util),
    };
  });

  const operators = SIM_STATIONS.slice(0, 6)
    .map((st, i) => {
      const util = Math.min(0.95, st.baseUtil + (rand(`op:${range}:${st.id}`) - 0.5) * 0.1);
      const perf = 0.88 + rand(`opp:${range}:${i}`) * 0.24;
      return {
        name: operatorFor(st.id, 0),
        util,
        output: Math.round(st.rate * 8 * days * util * 0.33),
        perf,
        adherence: adherence(perf, util),
      };
    })
    .sort((a, b) => b.adherence - a.adherence);

  return {
    labelKind,
    trend,
    shifts,
    benchmark: {
      plant: last.plant,
      sectorAvg: last.sector,
      sectorTop: Math.min(0.92, last.sector + 0.15),
    },
    operators,
  };
}

function sampledRange(fromIso: string, toIso: string, step: number): DayStat {
  let util = 0;
  let output = 0;
  let scrap = 0;
  let downMin = 0;
  let cells = 0;
  for (let d = new Date(`${fromIso}T00:00:00Z`); dayIso(d) <= toIso; d = addDays(d, step)) {
    for (const st of SIM_STATIONS) {
      const s = simDay(st.id, dayIso(d));
      util += s.util;
      output += s.output * step;
      scrap += s.scrap * step;
      downMin += s.downMin * step;
      cells++;
    }
  }
  return { util: util / Math.max(1, cells), output, scrap, downMin, byReason: {} };
}

function getWeekNo(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
}

/* --------------------- orders: pools & builder -------------------- */

export const CUSTOMER_POOL = [
  "Arslan Havalandırma", "Meva Mobilya", "Baykal Enerji", "Denta Medikal",
  "Kuzey Asansör", "Ege Tarım Makinaları", "Sistem Raf", "Aydın Panel",
] as const;

const PART_POOL: { part: string; ops: string[]; qty: [number, number] }[] = [
  { part: "Davlumbaz gövdesi DV-450", ops: ["op-lazer", "op-abkant", "op-kaynak", "op-kalite", "op-paket"], qty: [60, 200] },
  { part: "Pano kapağı PK-1200", ops: ["op-lazer", "op-abkant", "op-kalite", "op-paket"], qty: [40, 120] },
  { part: "Raf ayağı profili RA-90", ops: ["op-lazer", "op-punch", "op-abkant", "op-paket"], qty: [200, 600] },
  { part: "Menfez çerçevesi MF-30", ops: ["op-plazma", "op-abkant", "op-kaynak", "op-paket"], qty: [100, 350] },
  { part: "Cihaz şasesi CS-77", ops: ["op-lazer", "op-abkant", "op-kaynak", "op-montaj", "op-kalite"], qty: [20, 80] },
  { part: "Çekmece rayı braketi", ops: ["op-punch", "op-abkant", "op-paket"], qty: [300, 900] },
  { part: "Kabin yan paneli KP-2", ops: ["op-lazer", "op-abkant", "op-kalite", "op-paket"], qty: [50, 160] },
  { part: "Trafo koruma kafesi", ops: ["op-plazma", "op-kaynak", "op-kalite"], qty: [8, 30] },
  { part: "Konveyör sac yatağı", ops: ["op-lazer", "op-abkant", "op-kaynak", "op-montaj", "op-paket"], qty: [30, 110] },
  { part: "Elektrik pano gövdesi EP-60", ops: ["op-lazer", "op-abkant", "op-montaj", "op-kalite", "op-paket"], qty: [25, 90] },
  { part: "Filtre kasası FK-8", ops: ["op-punch", "op-abkant", "op-kaynak", "op-kalite", "op-paket"], qty: [60, 220] },
  // machined (turning/milling) parts — bar/billet stock
  { part: "Mil / şaft Ø40 MS-40", ops: ["op-testere", "op-torna", "op-matkap", "op-kalite", "op-paket"], qty: [20, 120] },
  { part: "Flanş bağlantı FL-125", ops: ["op-testere", "op-torna", "op-freze", "op-matkap", "op-kalite"], qty: [30, 150] },
  { part: "Redüktör gövdesi RG-8", ops: ["op-freze", "op-matkap", "op-montaj", "op-kalite", "op-paket"], qty: [10, 60] },
  { part: "Burç / kovan Ø25", ops: ["op-testere", "op-torna", "op-kalite"], qty: [80, 400] },
  { part: "Kaplin yarım KP-60", ops: ["op-testere", "op-torna", "op-freze", "op-kalite"], qty: [40, 180] },
  { part: "Dişli göbeği DG-32", ops: ["op-testere", "op-torna", "op-freze", "op-matkap", "op-kalite"], qty: [15, 90] },
  { part: "Rulman yatağı RY-6205", ops: ["op-torna", "op-freze", "op-matkap", "op-montaj", "op-kalite", "op-paket"], qty: [25, 130] },
  { part: "Hidrolik blok HB-14", ops: ["op-freze", "op-matkap", "op-kalite"], qty: [8, 45] },
];

/**
 * Estimated minutes for a step. **Demo-scale on purpose:** short cycles
 * (~0.1–0.25 h) so steps complete and orders visibly flow while the plant is
 * watched. Scales mildly with qty ÷ station rate, clamped to 6–15 min.
 */
export function estimateMinutes(operationId: string, qty: number): number {
  const st = SIM_STATIONS.find((s) => s.operationId === operationId);
  const rate = st?.rate ?? 40;
  return Math.max(6, Math.min(15, Math.round((qty / rate) * 60 * 0.12)));
}

/** Material spec pools (descriptive — no stock). */
const MATERIAL_TYPES = ["DKP", "Galvaniz", "Paslanmaz 304", "Alüminyum", "St37"] as const;
const MATERIAL_THICKNESS = [0.8, 1, 1.5, 2, 3, 4, 5, 6] as const;
const MATERIAL_SIZES = ["1000 × 2000", "1250 × 2500", "1500 × 3000", "2000 × 4000"] as const;

export function buildMaterial(key: string): MaterialSpec {
  return {
    type: pick(`${key}:mt`, MATERIAL_TYPES),
    thicknessMm: pick(`${key}:mth`, MATERIAL_THICKNESS),
    size: pick(`${key}:msz`, MATERIAL_SIZES),
  };
}

/** Deterministic order for a (monthIso, seq) slot — used for history. */
export function buildOrder(
  key: string,
  id: string,
  createdAt: Date,
  done: boolean,
): MesOrder {
  const tpl = pick(`${key}:tpl`, PART_POOL);
  const qty = Math.round(tpl.qty[0] + rand(`${key}:q`) * (tpl.qty[1] - tpl.qty[0]));
  const leadDays = 5 + Math.round(rand(`${key}:lead`) * 9);
  const routing: RoutingStep[] = tpl.ops.map((opId, i) => {
    const est = estimateMinutes(opId, qty);
    return {
      operationId: opId,
      seq: i + 1,
      status: done ? "done" : "pending",
      qtyDone: done ? qty : 0,
      estMinutes: est,
      runMinutes: done ? est : 0,
      actualMinutes: done
        ? Math.round(est * (0.85 + rand(`${key}:a${i}`) * 0.35))
        : undefined,
      stationId: SIM_STATIONS.find((s) => s.operationId === opId)?.id,
    };
  });
  return {
    id,
    customer: pick(`${key}:c`, CUSTOMER_POOL),
    part: tpl.part,
    qty,
    priority: rand(`${key}:p`) < 0.18 ? "high" : "normal",
    createdAt: createdAt.toISOString(),
    dueDate: addDays(createdAt, leadDays).toISOString(),
    routing,
    material: buildMaterial(key),
  };
}

/** Completed historical orders for a month (deterministic, ~2/working day). */
export function historicalOrdersForMonth(year: number, month1: number, now: Date): MesOrder[] {
  const count = 34 + Math.floor(rand(`hist:${year}-${month1}`) * 10);
  const orders: MesOrder[] = [];
  for (let i = 1; i <= count; i++) {
    const day = 1 + Math.floor(rand(`hist:${year}-${month1}:${i}:d`) * 27);
    const createdAt = new Date(Date.UTC(year, month1 - 1, day, 8 + (i % 8)));
    if (createdAt.getTime() > now.getTime() - 6 * 86400000) continue; // recent ones live in the store
    const id = `SIP-${year}-${String(month1).padStart(2, "0")}-${String(i).padStart(3, "0")}`;
    orders.push(buildOrder(`hist:${id}`, id, createdAt, true));
  }
  return orders;
}

/** Completed orders in the last N days (for report tables), newest first. */
export function completedOrders(now: Date, days: number): MesOrder[] {
  const out: MesOrder[] = [];
  const from = addDays(now, -days);
  for (let m = 0; m <= Math.ceil(days / 28) + 1; m++) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    for (const o of historicalOrdersForMonth(ref.getUTCFullYear(), ref.getUTCMonth() + 1, now)) {
      const doneAt = new Date(o.dueDate);
      if (doneAt >= from && doneAt <= now) out.push(o);
    }
  }
  return out.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}
