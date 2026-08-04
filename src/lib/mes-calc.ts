import type { LiveDowntime, ScrapEvent, StockItem } from "./demo-types";
import type { MesOrder, RoutingStep } from "./mes-types";

/** Pure calculators over live store data — shared by every dashboard. */

/** Single step progress 0..1 — time-based (runMinutes ÷ estMinutes). */
export function stepProgress(order: MesOrder, step: RoutingStep): number {
  if (step.status === "done") return 1;
  if (step.estMinutes && step.estMinutes > 0)
    return Math.min(1, (step.runMinutes ?? 0) / step.estMinutes);
  return order.qty > 0 ? step.qtyDone / order.qty : 0;
}

/** Overall order progress 0..1 — time-weighted across steps by estMinutes. */
export function orderProgress(order: MesOrder): number {
  const totalEst = order.routing.reduce((s, st) => s + (st.estMinutes ?? 60), 0);
  if (totalEst === 0) return 0;
  const acc = order.routing.reduce(
    (s, st) => s + stepProgress(order, st) * (st.estMinutes ?? 60),
    0,
  );
  return Math.min(1, acc / totalEst);
}

/** The step currently in play (running/queued/paused), else the last done. */
export function currentStep(order: MesOrder): RoutingStep | undefined {
  return (
    order.routing.find(
      (s) => s.status === "running" || s.status === "queued" || s.status === "paused",
    ) ?? [...order.routing].reverse().find((s) => s.status === "done")
  );
}

export function orderDone(order: MesOrder): boolean {
  return order.routing.every((s) => s.status === "done");
}

export function stepPerformance(s: RoutingStep): number | undefined {
  return s.status === "done" && s.estMinutes && s.actualMinutes
    ? s.estMinutes / s.actualMinutes
    : undefined;
}

/**
 * Plan & Capacity Adherence (0..1) — the headline performance metric instead
 * of raw piece count. Mean of plan adherence (min(1, plan performance), i.e.
 * hitting or beating the estimated time) and capacity adherence (utilization).
 */
export function adherenceRate(planPerf: number, util: number): number {
  return (Math.min(1, planPerf) + Math.min(1, util)) / 2;
}

/** Plan performance: estimated ÷ actual minutes over completed steps. */
export function planPerformanceOf(orders: MesOrder[]): number {
  let est = 0;
  let actual = 0;
  for (const o of orders)
    for (const s of o.routing)
      if (s.status === "done" && s.estMinutes && s.actualMinutes) {
        est += s.estMinutes;
        actual += s.actualMinutes;
      }
  return actual === 0 ? 1 : est / actual;
}

/** Remaining estimated workload per operation (minutes) — time-based. */
export function workloadOf(orders: MesOrder[]): { operationId: string; minutes: number }[] {
  const acc = new Map<string, number>();
  for (const o of orders)
    for (const s of o.routing) {
      if (s.status === "done" || !s.estMinutes) continue;
      const remaining = s.estMinutes * (1 - stepProgress(o, s));
      acc.set(s.operationId, (acc.get(s.operationId) ?? 0) + remaining);
    }
  return [...acc.entries()]
    .map(([operationId, minutes]) => ({ operationId, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Downtime minutes per reason from live events (open ones count until now). */
export function paretoOf(
  downtime: LiveDowntime[],
  now: Date,
): { reasonId: string; minutes: number }[] {
  const acc = new Map<string, number>();
  for (const d of downtime) {
    const end = d.endedAt ? new Date(d.endedAt) : now;
    const min = Math.max(0, Math.round((end.getTime() - new Date(d.startedAt).getTime()) / 60000));
    acc.set(d.reasonId, (acc.get(d.reasonId) ?? 0) + min);
  }
  return [...acc.entries()]
    .map(([reasonId, minutes]) => ({ reasonId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function minutesAgo(iso: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
}

/* ------------------------------ scrap ------------------------------ */

function scrapToday(events: ScrapEvent[], now: Date): ScrapEvent[] {
  const start = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  return events.filter((e) => new Date(e.at).getTime() >= start);
}

/** Scrap today aggregated by reason (qty + weight), heaviest first. */
export function scrapByReasonToday(
  events: ScrapEvent[],
  now: Date,
): { reasonId: string; qty: number; weightKg: number }[] {
  const acc = new Map<string, { qty: number; weightKg: number }>();
  for (const e of scrapToday(events, now)) {
    const a = acc.get(e.reasonId) ?? { qty: 0, weightKg: 0 };
    a.qty += e.qty;
    a.weightKg += e.weightKg;
    acc.set(e.reasonId, a);
  }
  return [...acc.entries()]
    .map(([reasonId, a]) => ({ reasonId, qty: a.qty, weightKg: Math.round(a.weightKg * 10) / 10 }))
    .sort((a, b) => b.weightKg - a.weightKg);
}

/** Scrap today aggregated by station (weight), heaviest first. */
export function scrapByStationToday(
  events: ScrapEvent[],
  now: Date,
): { stationId: string; qty: number; weightKg: number }[] {
  const acc = new Map<string, { qty: number; weightKg: number }>();
  for (const e of scrapToday(events, now)) {
    const a = acc.get(e.stationId) ?? { qty: 0, weightKg: 0 };
    a.qty += e.qty;
    a.weightKg += e.weightKg;
    acc.set(e.stationId, a);
  }
  return [...acc.entries()]
    .map(([stationId, a]) => ({ stationId, qty: a.qty, weightKg: Math.round(a.weightKg * 10) / 10 }))
    .sort((a, b) => b.weightKg - a.weightKg);
}

export function scrapTotalsToday(events: ScrapEvent[], now: Date): { qty: number; weightKg: number } {
  const t = scrapToday(events, now);
  return {
    qty: t.reduce((s, e) => s + e.qty, 0),
    weightKg: Math.round(t.reduce((s, e) => s + e.weightKg, 0) * 10) / 10,
  };
}

/**
 * Cost of scrap today = scrapped material weight × average material price/kg +
 * lost processing labour per scrapped part.
 */
export function scrapCostToday(
  events: ScrapEvent[],
  stock: StockItem[],
  laborPerHour: number,
  now: Date,
): number {
  const real = stock.filter((s) => !s.isRemnant);
  const avgKg = real.length ? real.reduce((s, x) => s + x.costPerKg, 0) / real.length : 1;
  const totals = scrapTotalsToday(events, now);
  return totals.weightKg * avgKg + totals.qty * laborPerHour * 0.05;
}

/**
 * Downtime minutes per reason for the portion that falls inside *today*
 * (open events count up to `now`). Used for the executive downtime-cost card.
 */
export function downtimeTodayByReason(
  downtime: LiveDowntime[],
  now: Date,
): { reasonId: string; minutes: number }[] {
  const startOfDay = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const acc = new Map<string, number>();
  for (const d of downtime) {
    const start = Math.max(new Date(d.startedAt).getTime(), startOfDay);
    const end = Math.min(d.endedAt ? new Date(d.endedAt).getTime() : now.getTime(), now.getTime());
    const min = Math.round((end - start) / 60000);
    if (min > 0) acc.set(d.reasonId, (acc.get(d.reasonId) ?? 0) + min);
  }
  return [...acc.entries()]
    .map(([reasonId, minutes]) => ({ reasonId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Cost of downtime = idle time (hours) × labor rate. During a stoppage the
 * operator is still paid while nothing is produced, so this is the directly
 * burned cost. Amount is in the settings currency (no FX).
 */
export function downtimeCostPerHour(costRates: { laborPerHour: number }): number {
  return costRates.laborPerHour;
}

/** Downtime minutes today per station (open events count up to `now`). */
export function downtimeTodayByStation(
  downtime: LiveDowntime[],
  now: Date,
): Record<string, number> {
  const startOfDay = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const acc: Record<string, number> = {};
  for (const d of downtime) {
    const start = Math.max(new Date(d.startedAt).getTime(), startOfDay);
    const end = Math.min(d.endedAt ? new Date(d.endedAt).getTime() : now.getTime(), now.getTime());
    const min = Math.round((end - start) / 60000);
    if (min > 0) acc[d.stationId] = (acc[d.stationId] ?? 0) + min;
  }
  return acc;
}
