import type { DemoSnapshot } from "./demo-types";
import type { CompanyProfile } from "./companies";
import { SIM_STATIONS } from "./sim";
import {
  adherenceRate,
  downtimeTodayByReason,
  orderDone,
  planPerformanceOf,
} from "./mes-calc";
import { lateOrders } from "./insights";
import { plantScore } from "./score";
import { plantEconomics } from "./revenue";

/**
 * KPI + target model. Each company tracks a set of KPIs against editable
 * targets, section by section (production / quality / maintenance / sales) and
 * rolled up for the executive. Off-target KPIs turn the scorecard red and (for
 * the alarm-worthy ones) raise an alert — see evaluateAlerts in demo-store.
 */

export type KpiSection = "production" | "quality" | "maintenance" | "sales" | "executive";

export type KpiId =
  | "utilization"
  | "outputAttainment"
  | "adherence"
  | "scrapRate"
  | "qualityScore"
  | "downtimeMin"
  | "overdueMaint"
  | "onTimeDelivery"
  | "score"
  | "profitMargin";

export type KpiDirection = "up" | "down"; // up = higher is better
export type KpiUnit = "percent" | "count" | "minutes" | "score";
export type KpiStatus = "good" | "warn" | "bad";

export interface KpiDef {
  id: KpiId;
  section: KpiSection;
  unit: KpiUnit;
  direction: KpiDirection;
  defaultTarget: number;
  /** money KPI — only shown where the scope includes money (executive/sales). */
  money?: boolean;
  /** raise an alert when off-target (bad). */
  alarm?: boolean;
}

export const KPI_DEFS: KpiDef[] = [
  { id: "utilization", section: "production", unit: "percent", direction: "up", defaultTarget: 75, alarm: true },
  { id: "outputAttainment", section: "production", unit: "percent", direction: "up", defaultTarget: 90 },
  { id: "adherence", section: "production", unit: "percent", direction: "up", defaultTarget: 85 },
  { id: "scrapRate", section: "quality", unit: "percent", direction: "down", defaultTarget: 4, alarm: true },
  { id: "qualityScore", section: "quality", unit: "percent", direction: "up", defaultTarget: 90 },
  { id: "downtimeMin", section: "maintenance", unit: "minutes", direction: "down", defaultTarget: 60, alarm: true },
  { id: "overdueMaint", section: "maintenance", unit: "count", direction: "down", defaultTarget: 0, alarm: true },
  { id: "onTimeDelivery", section: "sales", unit: "percent", direction: "up", defaultTarget: 95, alarm: true },
  { id: "score", section: "executive", unit: "score", direction: "up", defaultTarget: 800 },
  { id: "profitMargin", section: "executive", unit: "percent", direction: "up", defaultTarget: 20, money: true },
];

export function kpiDef(id: KpiId): KpiDef {
  return KPI_DEFS.find((d) => d.id === id)!;
}

/** Traffic-light status of a value against its target. */
export function kpiStatus(value: number, target: number, def: KpiDef): KpiStatus {
  if (def.direction === "up") {
    if (value >= target) return "good";
    if (value >= target * 0.9) return "warn";
    return "bad";
  }
  // lower is better
  if (def.unit === "count") {
    if (value <= target) return "good";
    if (value <= target + 1) return "warn";
    return "bad";
  }
  if (value <= target) return "good";
  if (value <= target * 1.2 + 0.001) return "warn";
  return "bad";
}

/** Profile-nudged default targets — a sensible starting point per company. */
export function defaultKpiTargets(profile: CompanyProfile): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of KPI_DEFS) out[d.id] = d.defaultTarget;
  // higher-tempo plants aim a little higher on utilization & score
  out.utilization = Math.max(55, Math.min(85, Math.round(70 * profile.utilFactor)));
  out.score = Math.max(650, Math.min(880, Math.round(760 * (0.9 + profile.histFactor * 0.1))));
  return out;
}

/** Daily production target ≈ this plant's nominal capacity × 65%. */
export function plantTargetOutput(snap: DemoSnapshot): number {
  return Math.round(
    snap.stations.reduce(
      (s, st) => s + (SIM_STATIONS.find((d) => d.id === st.id)?.rate ?? 0),
      0,
    ) * 24 * 0.65,
  );
}

export interface KpiValue {
  def: KpiDef;
  value: number;
  target: number;
  status: KpiStatus;
}

function targetFor(snap: DemoSnapshot, def: KpiDef): number {
  const t = snap.settings.kpiTargets?.[def.id];
  return typeof t === "number" ? t : def.defaultTarget;
}

/** Compute every KPI's live value + status for the client scorecard. */
export function computeKpis(snap: DemoSnapshot, now: Date): KpiValue[] {
  const output = snap.today.output;
  const scrap = snap.today.scrap;
  const plantTarget = plantTargetOutput(snap);
  const score = plantScore(snap, now);
  const qualityFactor = score.factors.find((f) => f.key === "quality");
  const openOrders = snap.orders.filter((o) => !orderDone(o));
  const late = lateOrders(snap, now).length;
  const dtMin = downtimeTodayByReason(snap.downtime, now).reduce((s, d) => s + d.minutes, 0);
  const overdue = snap.settings.features.maintenance
    ? snap.maintenance.filter((m) => m.nextDueAt < snap.now).length
    : 0;
  const eco = plantEconomics(snap, now);

  const raw: Record<KpiId, number> = {
    utilization: snap.today.util * 100,
    outputAttainment: plantTarget > 0 ? Math.min(140, (output / plantTarget) * 100) : 0,
    adherence: adherenceRate(planPerformanceOf(snap.orders), snap.today.util) * 100,
    scrapRate: output + scrap > 0 ? (scrap / (output + scrap)) * 100 : 0,
    qualityScore: (qualityFactor?.value ?? 0.9) * 100,
    downtimeMin: dtMin,
    overdueMaint: overdue,
    onTimeDelivery: openOrders.length > 0 ? (1 - late / openOrders.length) * 100 : 100,
    score: score.total,
    profitMargin: eco.marginPct,
  };

  return KPI_DEFS.map((def) => {
    const value = raw[def.id];
    const target = targetFor(snap, def);
    return { def, value, target, status: kpiStatus(value, target, def) };
  });
}

export const KPI_SECTIONS: KpiSection[] = ["production", "quality", "maintenance", "sales", "executive"];

/** KPI values for one section (executive scope shows money KPIs; ops hides them). */
export function kpisForSection(
  values: KpiValue[],
  section: KpiSection,
  opts: { withMoney?: boolean } = {},
): KpiValue[] {
  return values.filter(
    (v) => v.def.section === section && (opts.withMoney || !v.def.money),
  );
}
