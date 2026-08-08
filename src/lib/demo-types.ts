import type {
  AndonType,
  DowntimeReason,
  MaterialSpec,
  MesOrder,
  OperationDef,
  StationState,
} from "./mes-types";
import type { PlanId } from "./types";

/** Live (mutable) state of one kiosk/station in the demo store. */
export interface LiveStation {
  id: string;
  state: StationState;
  operator: string;
  currentOrderIds: string[];
  downtimeReasonId?: string;
  downtimeSince?: string;
  /** Auto-ended downtimes carry a planned end; manual ones don't. */
  downtimeUntil?: string;
  todayOutput: number;
  todayScrap: number;
  /** Fractional parts accumulator for the simulation tick. */
  frac: number;
}

export type CurrencyCode = "USD" | "EUR" | "TRY";

/** Who an escalation notifies. */
export type AlertTarget = "supervisor" | "maintenance" | "quality" | "purchasing";

/** What condition raises an alert. */
export type AlertTrigger = "scrapRate" | "downtime" | "lowStock" | "kpiTarget";

/**
 * A configurable escalation rule. The plant tunes the threshold *and* the
 * recipient per condition (e.g. scrap > 5% → supervisor; breakdown > 5 min →
 * maintenance; > 30 min → supervisor). Several downtime rules form a ladder.
 */
export interface EscalationRule {
  id: string;
  trigger: AlertTrigger;
  /** scrapRate: fraction (0.05 = 5%). downtime: minutes. */
  threshold: number;
  target: AlertTarget;
  enabled: boolean;
}

/** A raised alert, produced by the escalation engine on the live store. */
export interface LiveAlert {
  id: string;
  ruleId: string;
  trigger: AlertTrigger;
  stationId: string;
  target: AlertTarget;
  at: string;
  /** minutes (downtime) or fraction (scrapRate) at trigger time. */
  value: number;
  threshold: number;
  /** downtime reason id, when trigger is downtime. */
  reasonId?: string;
  /** display label (e.g. stock item name), when there is no station. */
  label?: string;
  /** stable key so the same condition is not re-raised every tick. */
  sourceKey: string;
  acked: boolean;
  ackedAt?: string;
}

/** Physical form of a metal stock item. */
export type MaterialForm = "bar" | "plate" | "tube" | "block";

/**
 * Stock-keeping unit. Bars/blocks are tracked by weight (kg); sheet metal is
 * tracked by piece count (adet) with size + thickness, weight known per sheet —
 * how these shops actually stock and consume.
 */
export type StockUnit = "kg" | "piece";

/** A raw-material stock item. */
export interface StockItem {
  id: string;
  materialType: string;
  form: MaterialForm;
  unit: StockUnit;
  /** display size, e.g. bar "Ø40"; sheet "1250 × 2500". */
  dimension: string;
  /** sheet thickness (mm) — piece-tracked plate. */
  thicknessMm?: number;
  /** weight per piece (kg) — piece-tracked plate (for weight & value). */
  weightKgPerPiece?: number;
  /** on-hand quantity in `unit` (kg or pieces). */
  onHand: number;
  /** reorder level in `unit`. */
  reorder: number;
  costPerKg: number;
  /** reusable offcut returned from a job, used before ordering more. */
  isRemnant?: boolean;
}

export type StockMoveType = "issue" | "receipt" | "remnant" | "adjust";

/** A stock movement (qty is positive, in the item's unit; `type` is direction). */
export interface StockMove {
  id: string;
  at: string;
  stockItemId: string;
  type: StockMoveType;
  qty: number;
  orderId?: string;
}

/** A scrap/waste reason (catalog), same shape as a downtime reason. */
export interface ScrapReason {
  id: string;
  name: string;
}

/** A recorded scrap/waste event: which station, why, how many pieces + weight. */
export interface ScrapEvent {
  id: string;
  at: string;
  stationId: string;
  reasonId: string;
  qty: number;
  weightKg: number;
}

/** One operation+hours line of a quote. */
export interface QuoteLine {
  operationId: string;
  hours: number;
}

/** A saved price quote — persists in the store, searchable by customer. */
export interface SavedQuote {
  id: string;
  at: string;
  customer: string;
  part?: string;
  qty?: number;
  lines: QuoteLine[];
  /** Labour = Σ(op hours × station rate) in the stored currency. */
  laborTotal: number;
  materialCost: number;
  marginPct: number;
  total: number;
  perPart?: number;
  currency: CurrencyCode;
}

/**
 * Working calendar the customer configures: how many shifts run per working
 * day and which weekdays are rest days. Demo default = 3 shifts, no rest days
 * (24/7). Drives planned-capacity availability. `restDays` uses JS getUTCDay
 * numbering (0 = Sunday … 6 = Saturday).
 */
export interface WorkingCalendar {
  shifts: number;
  restDays: number[];
}

/** Optional product modules, toggled from the admin panel. */
export interface FeatureFlags {
  /** Planned-maintenance calendar module. */
  maintenance: boolean;
  /** Start work orders by scanning a barcode/QR on the kiosk. */
  barcode: boolean;
  /** Quoting / estimation module (price offers from billing rates). */
  quoting: boolean;
  /** Raw-material stock & consumption (backflush, remnants, low-stock alerts). */
  stock: boolean;
}

export interface DemoSettings {
  /**
   * Active subscription plan for this tenant. Drives MES feature gating
   * (AI assistant, sector benchmark, advanced analytics). Set from /admin/mes.
   */
  plan: PlanId;
  /**
   * Display currency — a user choice only. The product is global, so cost
   * rates are entered directly in this currency; no FX conversion happens.
   */
  currency: CurrencyCode;
  /** Cost rates in the selected currency. */
  costRates: {
    laborPerHour: number;
    energyPerHour: number;
    gasPerHour: number;
    overheadPerDay: number;
  };
  /** Market billing rate per station-hour (selected currency), by station id.
   *  Drives revenue, profit, and lost-revenue (opportunity cost). */
  billingRates: Record<string, number>;
  features: FeatureFlags;
  /** Whether Maintenance is its own department (own screen) or folded into
   *  Production Management. Set from the customer-management panel (/admin/mes). */
  maintenanceOwnDepartment: boolean;
  /** Shifts per day + weekly rest days (24/7 = 3 shifts, no rest days). */
  workingCalendar: WorkingCalendar;
  operations: OperationDef[];
  downtimeReasons: DowntimeReason[];
  /** Scrap/waste reason catalog (operator/analytics). */
  scrapReasons: ScrapReason[];
  /** Configurable alert/escalation rules (scrap %, downtime minutes → target). */
  escalationRules: EscalationRule[];
  /** Editable KPI targets, keyed by KpiId (see lib/kpi.ts). */
  kpiTargets: Record<string, number>;
}

/** One recurring planned-maintenance task bound to a station. */
export interface MaintenanceTask {
  id: string;
  stationId: string;
  title: string;
  intervalDays: number;
  lastDoneAt: string;
  nextDueAt: string;
}

export interface LiveAndonCall {
  id: string;
  stationId: string;
  type: AndonType;
  at: string;
  open: boolean;
  manual?: boolean;
}

export interface LiveDowntime {
  id: string;
  stationId: string;
  reasonId: string;
  startedAt: string;
  endedAt?: string;
  manual?: boolean;
}

export interface DemoStore {
  version: 1;
  /** Company (tenant) id this plant state belongs to — see lib/companies.ts. */
  id: string;
  createdAt: string;
  lastTickAt: string;
  /** ISO day the today-counters belong to (daily reset). */
  currentDay: string;
  /** Per "YYYY-MM" last used order sequence number. */
  orderSeq: Record<string, number>;
  /** Active WIP + orders completed in the last few days. */
  orders: MesOrder[];
  stations: LiveStation[];
  andon: LiveAndonCall[];
  downtime: LiveDowntime[];
  maintenance: MaintenanceTask[];
  alerts: LiveAlert[];
  quotes: SavedQuote[];
  stock: StockItem[];
  stockMoves: StockMove[];
  scrapEvents: ScrapEvent[];
  settings: DemoSettings;
}

/** Top-level multi-tenant store: several independent company plants. */
export interface MultiStore {
  version: 2;
  createdAt: string;
  companies: Record<string, DemoStore>;
}

/** A company entry for the switcher. */
export interface CompanyRef {
  id: string;
  name: string;
  sector: string;
}

/** What the client receives from GET /api/demo. */
export interface DemoSnapshot {
  now: string;
  /** Which company this snapshot is for + the full list, for the switcher. */
  companyId: string;
  companyName: string;
  sector: string;
  companies: CompanyRef[];
  stations: LiveStation[];
  orders: MesOrder[];
  andon: LiveAndonCall[];
  downtime: LiveDowntime[];
  maintenance: MaintenanceTask[];
  alerts: LiveAlert[];
  quotes: SavedQuote[];
  stock: StockItem[];
  stockMoves: StockMove[];
  scrapEvents: ScrapEvent[];
  settings: DemoSettings;
  today: { output: number; scrap: number; util: number };
}

export type DemoAction =
  | { type: "startJob"; stationId: string; orderId: string }
  | { type: "pauseStation"; stationId: string }
  | { type: "resumeStation"; stationId: string }
  | { type: "addQty"; stationId: string; orderId: string; delta: number }
  | { type: "addScrap"; stationId: string; orderId: string; delta: number }
  | { type: "finishStep"; stationId: string; orderId: string }
  | { type: "startDowntime"; stationId: string; reasonId: string }
  | { type: "endDowntime"; stationId: string }
  | { type: "andonOpen"; stationId: string; andonType: AndonType }
  | { type: "andonClose"; id: string }
  | {
      type: "createOrder";
      customer: string;
      part: string;
      qty: number;
      dueDate: string;
      priority?: "normal" | "high";
      material?: MaterialSpec;
      routing: { operationId: string; estMinutes?: number }[];
    }
  | {
      type: "editOrder";
      orderId: string;
      patch: {
        customer?: string;
        part?: string;
        qty?: number;
        dueDate?: string;
        priority?: "normal" | "high";
        material?: MaterialSpec;
        routing?: { operationId: string; estMinutes?: number }[];
      };
    }
  | { type: "addOperation"; name: string; batchable: boolean }
  | { type: "addReason"; name: string }
  | { type: "saveCosts"; costRates: DemoSettings["costRates"] }
  | { type: "saveBillingRates"; billingRates: Record<string, number> }
  | { type: "setCurrency"; currency: CurrencyCode }
  | { type: "setPlan"; plan: PlanId }
  | { type: "ackAlert"; id: string }
  | { type: "saveEscalationRules"; rules: EscalationRule[] }
  | { type: "saveKpiTargets"; targets: Record<string, number> }
  | { type: "setMaintenanceDept"; own: boolean }
  | { type: "setWorkingCalendar"; calendar: WorkingCalendar }
  | { type: "saveQuote"; quote: Omit<SavedQuote, "id" | "at"> }
  | { type: "deleteQuote"; id: string }
  | { type: "restockItem"; stockItemId: string; qty: number }
  | { type: "adjustStock"; stockItemId: string; onHand: number }
  | { type: "setFeature"; feature: keyof FeatureFlags; enabled: boolean }
  | { type: "maintenanceDone"; id: string }
  | { type: "addMaintenance"; stationId: string; title: string; intervalDays: number }
  | { type: "resetDemo" };
