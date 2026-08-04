/**
 * MES (shop-floor) domain types — operator kiosks, orders with operation
 * routings, downtime and andon. Order number IS the work-order number;
 * whoever enters the order also defines its routing from the operation
 * catalog (predefined, extensible per tenant).
 */

/** Predefined operation catalog entry (a station type, e.g. "Lazer Kesim"). */
export interface OperationDef {
  id: string;
  /** Tenant-facing name; catalog is tenant data, so localized per customer. */
  name: string;
  /**
   * True for operations where one process run advances several work orders at
   * once — a single nesting on laser/plasma/oxy-fuel can hold parts of 3–5
   * orders, and a welding run can batch similarly.
   */
  batchable?: boolean;
}

export type StepStatus = "pending" | "queued" | "running" | "paused" | "done";

/** One step of an order's routing, bound to an operation from the catalog. */
export interface RoutingStep {
  operationId: string;
  seq: number;
  status: StepStatus;
  qtyDone: number;
  /** Kiosk/station currently (or last) working this step. */
  stationId?: string;
  /** Planner's estimate for the whole step, entered at order entry. */
  estMinutes?: number;
  /**
   * Effective run time accrued so far (auto, minute by minute while running).
   * Progress is time-based: runMinutes ÷ estMinutes — pieces are secondary.
   */
  runMinutes?: number;
  /**
   * Measured run time, set automatically when the step completes — feeds the
   * plan-performance metric (est ÷ actual) and future capacity planning.
   */
  actualMinutes?: number;
  /** One-tap scrap count reported at this step. */
  scrapQty?: number;
}

/** Sheet-metal material spec — descriptive only, NOT stock/inventory. */
export interface MaterialSpec {
  /** e.g. "DKP", "Paslanmaz 304", "Alüminyum", "Galvaniz", "St37". */
  type: string;
  /** Sheet thickness in mm. */
  thicknessMm: number;
  /** Sheet size, e.g. "1500 × 3000". */
  size: string;
}

export type OrderPriority = "normal" | "high";

export interface MesOrder {
  /** Order no == work-order no (single number through the whole flow). */
  id: string;
  customer: string;
  part: string;
  qty: number;
  dueDate: string;
  createdAt: string;
  priority: OrderPriority;
  routing: RoutingStep[];
  /** Descriptive material spec (no stock tracking). */
  material?: MaterialSpec;
  /** Raw-material stock item this order consumes (stock module). */
  stockItemId?: string;
  /** Raw material required, in the stock item's unit (kg or pieces). */
  materialQty?: number;
  /** True once the raw material has been issued from stock (deduct once). */
  materialIssued?: boolean;
}

export type StationState = "running" | "idle" | "setup" | "down";

/** A physical kiosk bound to one operation (tablet or the operator's phone). */
export interface MesStation {
  id: string;
  name: string;
  operationId: string;
  state: StationState;
  operator?: string;
  /** Multiple ids when a batchable operation runs a nesting. */
  currentOrderIds?: string[];
  /** Set when state === "down". */
  downtimeReasonId?: string;
  /**
   * Effective-time utilization: run time ÷ planned time, derived automatically
   * from kiosk start/stop and downtime events — no manual operator input.
   */
  utilToday: number;
  outputToday: number;
}

/** Downtime reason catalog (tenant-configurable). */
export interface DowntimeReason {
  id: string;
  name: string;
}

export interface DowntimeEvent {
  id: string;
  stationId: string;
  reasonId: string;
  startedAt: string;
  minutes: number;
}

export type AndonType = "supervisor" | "maintenance" | "quality";

export interface AndonCall {
  id: string;
  stationId: string;
  type: AndonType;
  at: string;
  open: boolean;
}
