import type { DemoSnapshot } from "./demo-types";
import type { MesOrder } from "./mes-types";
import { SIM_STATIONS } from "./sim";
import {
  currentStep,
  downtimeTodayByReason,
  orderDone,
  orderProgress,
  planPerformanceOf,
  workloadOf,
} from "./mes-calc";

/**
 * Smart Manufacturing analysis layer: pure, deterministic reads over the live
 * snapshot that surface bottlenecks, dominant losses and late-order causes as
 * structured, display-ready insights. The UI wraps each into a localized
 * sentence + recommendation; the assistant/LLM reuses the same signals.
 */

export type InsightKind =
  | "bottleneck"
  | "downtimeReason"
  | "scrapStation"
  | "lateOrders"
  | "imbalance"
  | "allClear";

export type Severity = "info" | "warning" | "critical";

export interface Insight {
  kind: InsightKind;
  severity: Severity;
  /** Display-ready params (names already resolved) for the message template. */
  params: Record<string, string | number>;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function opName(snap: DemoSnapshot, id: string): string {
  return snap.settings.operations.find((o) => o.id === id)?.name ?? id;
}
function reasonName(snap: DemoSnapshot, id: string): string {
  return snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;
}
function stationName(id: string): string {
  return SIM_STATIONS.find((s) => s.id === id)?.name ?? id;
}
function stationCountForOp(opId: string): number {
  return Math.max(1, SIM_STATIONS.filter((s) => s.operationId === opId).length);
}

/** Remaining backlog per operation, expressed as hours *per machine*. */
export function operationBacklog(
  snap: DemoSnapshot,
): { operationId: string; name: string; hoursPerMachine: number }[] {
  return workloadOf(snap.orders).map((w) => ({
    operationId: w.operationId,
    name: opName(snap, w.operationId),
    hoursPerMachine: w.minutes / 60 / stationCountForOp(w.operationId),
  }));
}

/** Hours in one shift. */
export const HOURS_PER_SHIFT = 8;

export interface CapacityRow {
  operationId: string;
  name: string;
  machines: number;
  availableHours: number;
  committedHours: number;
  freeHours: number;
  utilPct: number;
}

/** Working days in the next `days` given the customer's weekly rest days. */
export function workingDaysInWindow(now: Date, days: number, restDays: number[]): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    if (!restDays.includes(d.getUTCDay())) count++;
  }
  return count;
}

/**
 * Idle-capacity outlook over the next `days`: per operation, how many
 * station-hours are open for new/fill-in work. Availability follows the
 * customer's working calendar (shifts × 8 h × working days, rest days off).
 */
export function capacityOutlook(snap: DemoSnapshot, days: number, now: Date): CapacityRow[] {
  const wc = snap.settings.workingCalendar ?? { shifts: 3, restDays: [] };
  const workDays = workingDaysInWindow(now, days, wc.restDays);
  const hoursPerMachine = wc.shifts * HOURS_PER_SHIFT * workDays;

  const committed = new Map<string, number>();
  for (const w of workloadOf(snap.orders)) committed.set(w.operationId, w.minutes / 60);

  return SIM_STATIONS.reduce<CapacityRow[]>((rows, st) => {
    if (rows.some((r) => r.operationId === st.operationId)) return rows;
    const machines = stationCountForOp(st.operationId);
    const availableHours = machines * hoursPerMachine;
    const committedHours = Math.round(committed.get(st.operationId) ?? 0);
    const freeHours = Math.max(0, Math.round(availableHours - committedHours));
    rows.push({
      operationId: st.operationId,
      name: opName(snap, st.operationId),
      machines,
      availableHours,
      committedHours,
      freeHours,
      utilPct: Math.min(100, Math.round((committedHours / Math.max(1, availableHours)) * 100)),
    });
    return rows;
  }, []).sort((a, b) => b.freeHours - a.freeHours);
}

/** Orders past their due date that are not finished yet. */
export function lateOrders(snap: DemoSnapshot, now: Date): MesOrder[] {
  return snap.orders.filter(
    (o) => !orderDone(o) && new Date(o.dueDate).getTime() < now.getTime(),
  );
}

/** Highest scrap-rate station today (needs a meaningful sample). */
function worstScrapStation(
  snap: DemoSnapshot,
): { id: string; rate: number } | null {
  let worst: { id: string; rate: number } | null = null;
  for (const st of snap.stations) {
    const total = st.todayOutput + st.todayScrap;
    if (total < 25) continue;
    const rate = st.todayScrap / total;
    if (!worst || rate > worst.rate) worst = { id: st.id, rate };
  }
  return worst;
}

/**
 * Ranked list of live suggestions. Always returns at least one item
 * (`allClear` when the plant has nothing worth flagging).
 */
export function plantInsights(snap: DemoSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];

  // 1) bottleneck — operation with the deepest per-machine backlog
  const backlog = operationBacklog(snap);
  const top = backlog[0];
  if (top && top.hoursPerMachine >= 4) {
    out.push({
      kind: "bottleneck",
      severity: top.hoursPerMachine >= 8 ? "critical" : "warning",
      params: {
        operation: top.name,
        hours: Math.round(top.hoursPerMachine),
        machines: stationCountForOp(top.operationId),
      },
    });
  }

  // 2) dominant downtime reason today
  const dt = downtimeTodayByReason(snap.downtime, now)[0];
  if (dt && dt.minutes >= 20) {
    out.push({
      kind: "downtimeReason",
      severity: dt.minutes >= 60 ? "critical" : "warning",
      params: { reason: reasonName(snap, dt.reasonId), minutes: dt.minutes },
    });
  }

  // 3) scrap concentration
  const scrap = worstScrapStation(snap);
  if (scrap && scrap.rate >= 0.04) {
    out.push({
      kind: "scrapStation",
      severity: scrap.rate >= 0.06 ? "critical" : "warning",
      params: { station: stationName(scrap.id), rate: Math.round(scrap.rate * 100) },
    });
  }

  // 4) late orders
  const late = lateOrders(snap, now);
  if (late.length > 0) {
    out.push({
      kind: "lateOrders",
      severity: late.length >= 4 ? "critical" : "warning",
      params: { count: late.length },
    });
  }

  // 5) capacity imbalance — deep backlog on one op while another is idle
  if (backlog.length >= 2) {
    const hi = backlog[0];
    const lo = backlog[backlog.length - 1];
    if (hi.hoursPerMachine - lo.hoursPerMachine >= 6) {
      out.push({
        kind: "imbalance",
        severity: "info",
        params: {
          busy: hi.name,
          idle: lo.name,
          gap: Math.round(hi.hoursPerMachine - lo.hoursPerMachine),
        },
      });
    }
  }

  out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  if (out.length === 0) out.push({ kind: "allClear", severity: "info", params: {} });
  return out;
}

export type RootCauseKind =
  | "blockedDown"
  | "waiting"
  | "planOverrun"
  | "behind";

export interface RootCause {
  kind: RootCauseKind;
  params: Record<string, string | number>;
}

/**
 * Why is this order late / at risk? Returns the single dominant cause with
 * display-ready params, or null when the order is finished / on track.
 */
export function rootCauseFor(
  order: MesOrder,
  snap: DemoSnapshot,
  now: Date,
): RootCause | null {
  if (orderDone(order)) return null;
  const cur = currentStep(order);
  if (!cur) return null;

  // is a station actively holding this order and stopped?
  const holder = snap.stations.find((s) => s.currentOrderIds.includes(order.id));
  if (holder && holder.state === "down" && holder.downtimeSince) {
    const mins = Math.round((now.getTime() - new Date(holder.downtimeSince).getTime()) / 60000);
    return {
      kind: "blockedDown",
      params: {
        operation: opName(snap, cur.operationId),
        reason: reasonName(snap, holder.downtimeReasonId ?? ""),
        minutes: mins,
      },
    };
  }

  // queued and not yet started → waiting behind other work on this operation
  if ((cur.status === "queued" || cur.status === "paused") && !(cur.runMinutes && cur.runMinutes > 0)) {
    const backlog = operationBacklog(snap).find((b) => b.operationId === cur.operationId);
    return {
      kind: "waiting",
      params: {
        operation: opName(snap, cur.operationId),
        aheadHours: backlog ? Math.max(1, Math.round(backlog.hoursPerMachine)) : 1,
      },
    };
  }

  // completed steps overran their plan
  const perf = planPerformanceOf([order]);
  if (perf > 0 && perf < 0.9) {
    return { kind: "planOverrun", params: { pct: Math.round(perf * 100) } };
  }

  // generic: behind schedule
  const overdueDays = Math.max(
    0,
    Math.round((now.getTime() - new Date(order.dueDate).getTime()) / 86400000),
  );
  return {
    kind: "behind",
    params: { progress: Math.round(orderProgress(order) * 100), days: overdueDays },
  };
}
