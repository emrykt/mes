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
  { id: "op-sawing", name: "Band Saw", batchable: true },
  { id: "op-turning", name: "CNC Lathe" },
  { id: "op-milling", name: "CNC Mill" },
  { id: "op-drilling", name: "Drilling" },
  { id: "op-laser", name: "Laser Cutting", batchable: true },
  { id: "op-plasma", name: "Plasma Cutting", batchable: true },
  { id: "op-oxyfuel", name: "Oxy-fuel Cutting", batchable: true },
  { id: "op-punch", name: "Punch Press" },
  { id: "op-pressbrake", name: "Press Brake" },
  { id: "op-rollform", name: "Roll Forming" },
  { id: "op-welding", name: "Welding", batchable: true },
  { id: "op-assembly", name: "Assembly" },
  { id: "op-coating", name: "Powder Coating" },
  { id: "op-quality", name: "Quality Control" },
  { id: "op-packaging", name: "Packaging / Shipping" },
];

export const DEFAULT_DOWNTIME_REASONS: DowntimeReason[] = [
  { id: "dt-breakdown", name: "Machine breakdown" },
  { id: "dt-setup", name: "Setup / changeover" },
  { id: "dt-material", name: "Waiting for material" },
  { id: "dt-operator", name: "No operator" },
  { id: "dt-quality", name: "Quality hold" },
  { id: "dt-break", name: "Break" },
];

/**
 * Default escalation ladder (the plant can retune thresholds and recipients):
 * scrap over 5% → supervisor; any breakdown/stoppage over 5 min → maintenance;
 * over 30 min → supervisor as well.
 */
/** Scrap/waste reasons (tenant data → Turkish mock). */
export const DEFAULT_SCRAP_REASONS = [
  { id: "sc-tolerance", name: "Out of tolerance" },
  { id: "sc-setup", name: "Setup scrap" },
  { id: "sc-material", name: "Material defect" },
  { id: "sc-tooling", name: "Tooling / die" },
  { id: "sc-surface", name: "Surface / burr" },
  { id: "sc-operator", name: "Operator error" },
];

/** Weighted scrap-reason picker (deterministic via seed). */
export function pickScrapReason(seed: string): string {
  const weights: [string, number][] = [
    ["sc-tolerance", 0.26],
    ["sc-setup", 0.22],
    ["sc-material", 0.18],
    ["sc-tooling", 0.14],
    ["sc-surface", 0.12],
    ["sc-operator", 0.08],
  ];
  let r = rand(seed);
  for (const [id, w] of weights) {
    if (r < w) return id;
    r -= w;
  }
  return "sc-tolerance";
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
  { id: "st-sawing-1", name: "Band Saw", operationId: "op-sawing", kind: "sawing", rate: 42, baseUtil: 0.66 },
  { id: "st-turning-1", name: "CNC Lathe 1", operationId: "op-turning", kind: "turning", rate: 15, baseUtil: 0.78 },
  { id: "st-turning-2", name: "CNC Lathe 2", operationId: "op-turning", kind: "turning", rate: 13, baseUtil: 0.7 },
  { id: "st-milling-1", name: "CNC Machining Center 1", operationId: "op-milling", kind: "milling", rate: 11, baseUtil: 0.75 },
  { id: "st-milling-2", name: "CNC Machining Center 2", operationId: "op-milling", kind: "milling", rate: 9, baseUtil: 0.68 },
  { id: "st-drilling-1", name: "Radial Drill", operationId: "op-drilling", kind: "drilling", rate: 34, baseUtil: 0.6 },
  { id: "st-laser-1", name: "Laser Cutter 1", operationId: "op-laser", kind: "cutting", rate: 46, baseUtil: 0.8 },
  { id: "st-laser-2", name: "Laser Cutter 2", operationId: "op-laser", kind: "cutting", rate: 40, baseUtil: 0.72 },
  { id: "st-plasma-1", name: "Plasma Cutter", operationId: "op-plasma", kind: "cutting", rate: 28, baseUtil: 0.6 },
  { id: "st-punch-1", name: "Punch Press", operationId: "op-punch", kind: "punching", rate: 95, baseUtil: 0.68 },
  { id: "st-pressbrake-1", name: "Press Brake 1", operationId: "op-pressbrake", kind: "bending", rate: 36, baseUtil: 0.77 },
  { id: "st-pressbrake-2", name: "Press Brake 2", operationId: "op-pressbrake", kind: "bending", rate: 31, baseUtil: 0.66 },
  { id: "st-welding-1", name: "Welding Station", operationId: "op-welding", kind: "welding", rate: 18, baseUtil: 0.63 },
  { id: "st-assembly-1", name: "Assembly Line", operationId: "op-assembly", kind: "assembly", rate: 22, baseUtil: 0.62 },
  { id: "st-quality-1", name: "Quality Control", operationId: "op-quality", kind: "quality", rate: 70, baseUtil: 0.7 },
  { id: "st-packaging-1", name: "Packaging / Shipping", operationId: "op-packaging", kind: "packaging", rate: 55, baseUtil: 0.64 },
];

export function getSimStation(id: string): SimStationDef | undefined {
  return SIM_STATIONS.find((s) => s.id === id);
}

/** Default market billing rate per station-hour (base currency figures). */
export const DEFAULT_BILLING_RATES: Record<string, number> = {
  "st-sawing-1": 48,
  "st-turning-1": 88,
  "st-turning-2": 82,
  "st-milling-1": 98,
  "st-milling-2": 92,
  "st-drilling-1": 52,
  "st-laser-1": 78,
  "st-laser-2": 72,
  "st-plasma-1": 58,
  "st-punch-1": 50,
  "st-pressbrake-1": 46,
  "st-pressbrake-2": 44,
  "st-welding-1": 42,
  "st-assembly-1": 36,
  "st-quality-1": 30,
  "st-packaging-1": 26,
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
  { id: 0, name: "Shift 1 (08–16)", startHour: 8 },
  { id: 1, name: "Shift 2 (16–24)", startHour: 16 },
  { id: 2, name: "Shift 3 (00–08)", startHour: 0 },
] as const;

export function shiftForHour(hour: number): (typeof SHIFTS)[number] {
  if (hour >= 8 && hour < 16) return SHIFTS[0];
  if (hour >= 16) return SHIFTS[1];
  return SHIFTS[2];
}

const OPERATOR_POOL = [
  "James Miller", "Anna Brooks", "David Clark", "Emma Wright", "Michael Reed",
  "Olivia Hall", "Daniel Young", "Sophie Turner", "Lucas Bennett", "Grace Foster",
  "Ethan Cole", "Chloe Adams", "Noah Parker", "Mia Coleman", "Liam Hayes",
  "Ava Morgan", "Ryan Walsh", "Ella Fisher", "Owen Grant", "Lily Ward",
  "Jack Newman", "Zoe Palmer", "Henry Dixon", "Ruby Shaw", "Leo Barnes",
  "Nora Kelly", "Adam Pierce",
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
  ["dt-breakdown", 0.28],
  ["dt-setup", 0.26],
  ["dt-material", 0.2],
  ["dt-break", 0.14],
  ["dt-operator", 0.12],
];

function weightedReason(key: string): string {
  let r = rand(key);
  for (const [id, w] of REASON_WEIGHTS) {
    if (r < w) return id;
    r -= w;
  }
  return "dt-quality";
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
  "Aurora HVAC", "Meridian Furniture", "Baylor Energy", "Denta Medical",
  "Northgate Elevators", "AgriMech Systems", "SystemRack", "Aiden Panels",
] as const;

export type PartKind = "sheet" | "machined";
export interface PartTemplate { part: string; ops: string[]; qty: [number, number]; kind: PartKind; }

const PART_POOL: PartTemplate[] = [
  { part: "Hood body DV-450", ops: ["op-laser", "op-pressbrake", "op-welding", "op-quality", "op-packaging"], qty: [60, 200], kind: "sheet" },
  { part: "Panel cover PK-1200", ops: ["op-laser", "op-pressbrake", "op-quality", "op-packaging"], qty: [40, 120], kind: "sheet" },
  { part: "Rack leg profile RA-90", ops: ["op-laser", "op-punch", "op-pressbrake", "op-packaging"], qty: [200, 600], kind: "sheet" },
  { part: "Vent frame MF-30", ops: ["op-plasma", "op-pressbrake", "op-welding", "op-packaging"], qty: [100, 350], kind: "sheet" },
  { part: "Device chassis CS-77", ops: ["op-laser", "op-pressbrake", "op-welding", "op-assembly", "op-quality"], qty: [20, 80], kind: "sheet" },
  { part: "Drawer slide bracket", ops: ["op-punch", "op-pressbrake", "op-packaging"], qty: [300, 900], kind: "sheet" },
  { part: "Cabinet side panel KP-2", ops: ["op-laser", "op-pressbrake", "op-quality", "op-packaging"], qty: [50, 160], kind: "sheet" },
  { part: "Transformer guard cage", ops: ["op-plasma", "op-welding", "op-quality"], qty: [8, 30], kind: "sheet" },
  { part: "Conveyor sheet bed", ops: ["op-laser", "op-pressbrake", "op-welding", "op-assembly", "op-packaging"], qty: [30, 110], kind: "sheet" },
  { part: "Electrical panel body EP-60", ops: ["op-laser", "op-pressbrake", "op-assembly", "op-quality", "op-packaging"], qty: [25, 90], kind: "sheet" },
  { part: "Filter housing FK-8", ops: ["op-punch", "op-pressbrake", "op-welding", "op-quality", "op-packaging"], qty: [60, 220], kind: "sheet" },
  // machined (turning/milling) parts — bar/billet stock
  { part: "Shaft Ø40 MS-40", ops: ["op-sawing", "op-turning", "op-drilling", "op-quality", "op-packaging"], qty: [20, 120], kind: "machined" },
  { part: "Flange coupling FL-125", ops: ["op-sawing", "op-turning", "op-milling", "op-drilling", "op-quality"], qty: [30, 150], kind: "machined" },
  { part: "Gearbox body RG-8", ops: ["op-milling", "op-drilling", "op-assembly", "op-quality", "op-packaging"], qty: [10, 60], kind: "machined" },
  { part: "Bushing Ø25", ops: ["op-sawing", "op-turning", "op-quality"], qty: [80, 400], kind: "machined" },
  { part: "Coupling half KP-60", ops: ["op-sawing", "op-turning", "op-milling", "op-quality"], qty: [40, 180], kind: "machined" },
  { part: "Gear hub DG-32", ops: ["op-sawing", "op-turning", "op-milling", "op-drilling", "op-quality"], qty: [15, 90], kind: "machined" },
  { part: "Bearing housing RY-6205", ops: ["op-turning", "op-milling", "op-drilling", "op-assembly", "op-quality", "op-packaging"], qty: [25, 130], kind: "machined" },
  { part: "Hydraulic block HB-14", ops: ["op-milling", "op-drilling", "op-quality"], qty: [8, 45], kind: "machined" },
];

/** Operation ids a set of stations can perform (via the master catalog). */
export function companyOperationIds(stationIds: string[]): Set<string> {
  const ids = new Set(stationIds);
  return new Set(
    SIM_STATIONS.filter((s) => ids.has(s.id)).map((s) => s.operationId),
  );
}

/**
 * Part templates a company can actually run: right kind AND every routing step
 * maps to a station the company operates (so no order can get stuck).
 */
export function partsForCompany(stationIds: string[], kinds: PartKind[]): PartTemplate[] {
  const ops = companyOperationIds(stationIds);
  const kindSet = new Set(kinds);
  return PART_POOL.filter(
    (t) => kindSet.has(t.kind) && t.ops.every((op) => ops.has(op)),
  );
}

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
const MATERIAL_TYPES = ["Cold-rolled steel", "Galvanized steel", "Stainless 304", "Aluminum", "Mild steel S235"] as const;
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
  pool: PartTemplate[] = PART_POOL,
): MesOrder {
  const tpl = pick(`${key}:tpl`, pool.length ? pool : PART_POOL);
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
