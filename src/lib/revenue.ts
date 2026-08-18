import type { DemoSnapshot } from "./demo-types";
import { downtimeTodayByStation } from "./mes-calc";
import { SIM_STATIONS, stationToday } from "./sim";

/**
 * Revenue / profit / lost-revenue model, derived from per-station billing
 * rates. All figures are in the settings currency (no FX). Shared by the
 * executive view and the assistant so the numbers always agree.
 *
 * - revenue: billable effective (run) hours × billing rate
 * - lostRevenue: downtime hours × billing rate (capacity you couldn't bill)
 * - cost: prorated plant cost today (labor/energy/gas/overhead)
 * - profit: revenue − cost; margin = profit ÷ revenue
 */

const CUTTING = new Set(["op-laser", "op-plasma", "op-oxyfuel"]);

export interface PlantEconomics {
  revenue: number;
  lostRevenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  /** Elapsed fraction of the day used to prorate figures. */
  elapsed: number;
  byStation: {
    id: string;
    name: string;
    rate: number;
    revenue: number;
    lost: number;
    downMin: number;
  }[];
}

export function plantEconomics(snap: DemoSnapshot, now: Date): PlantEconomics {
  const rates = snap.settings.billingRates;
  const elapsedHours = now.getUTCHours() + now.getUTCMinutes() / 60 + 1 / 60;
  const elapsed = Math.min(1, (now.getUTCHours() + 1) / 24);
  const downByStation = downtimeTodayByStation(snap.downtime, now);

  const byStation = SIM_STATIONS.map((def) => {
    const rate = rates[def.id] ?? 40;
    const util = stationToday(def.id, now).util;
    const revenue = rate * util * elapsedHours;
    const downMin = downByStation[def.id] ?? 0;
    const lost = rate * (downMin / 60);
    return { id: def.id, name: def.name, rate, revenue, lost, downMin };
  });

  const revenue = byStation.reduce((s, x) => s + x.revenue, 0);
  const lostRevenue = byStation.reduce((s, x) => s + x.lost, 0);

  // plant cost today (same shape as the executive cost card), prorated
  const cr = snap.settings.costRates;
  const stations = SIM_STATIONS.length;
  const cutting = SIM_STATIONS.filter((s) => CUTTING.has(s.operationId)).length;
  const util = snap.today.util;
  const cost =
    (stations * 24 * cr.laborPerHour +
      stations * 24 * util * cr.energyPerHour +
      cutting * 24 * util * cr.gasPerHour +
      cr.overheadPerDay) *
    elapsed;

  const profit = revenue - cost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    lostRevenue,
    cost,
    profit,
    marginPct,
    elapsed,
    byStation: byStation.sort((a, b) => b.lost - a.lost),
  };
}
