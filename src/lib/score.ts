import type { DemoSnapshot } from "./demo-types";
import {
  adherenceRate,
  downtimeTodayByStation,
  orderDone,
  planPerformanceOf,
} from "./mes-calc";
import { lateOrders } from "./insights";
import { SIM_STATIONS } from "./sim";

/**
 * Continuously-updated plant performance score, 0–1000, from nine weighted
 * factors. A single number an owner can watch improve over time, plus the
 * weakest factors to fix. Pure/deterministic over the live snapshot.
 */

export type ScoreFactorKey =
  | "productivity"
  | "delivery"
  | "quality"
  | "utilization"
  | "operator"
  | "breakdown"
  | "capacity"
  | "adherence"
  | "maintenance";

export interface ScoreFactor {
  key: ScoreFactorKey;
  /** 0..1 normalized score for this factor. */
  value: number;
  /** points contributed (value × weight), out of `weight`. */
  points: number;
  weight: number;
}

export type ScoreBand = "weak" | "fair" | "good" | "excellent";

export interface PlantScore {
  total: number; // 0..1000
  band: ScoreBand;
  factors: ScoreFactor[];
}

const WEIGHTS: Record<ScoreFactorKey, number> = {
  productivity: 120,
  delivery: 130,
  quality: 130,
  utilization: 110,
  operator: 100,
  breakdown: 100,
  capacity: 100,
  adherence: 120,
  maintenance: 90,
};

const DAILY_TARGET = SIM_STATIONS.reduce((s, st) => s + st.rate, 0) * 24 * 0.65;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function bandOf(total: number): ScoreBand {
  if (total >= 800) return "excellent";
  if (total >= 600) return "good";
  if (total >= 400) return "fair";
  return "weak";
}

export function plantScore(snap: DemoSnapshot, now: Date): PlantScore {
  const open = snap.orders.filter((o) => !orderDone(o));
  const output = snap.today.output;
  const scrap = snap.today.scrap;
  const util = snap.today.util;

  // productivity: output vs the time-prorated daily target
  const elapsed = Math.max(0.05, (now.getUTCHours() + now.getUTCMinutes() / 60) / 24);
  const expected = DAILY_TARGET * elapsed;
  const productivity = clamp01(output / Math.max(1, expected));

  // delivery: share of open orders not overdue
  const late = lateOrders(snap, now).length;
  const delivery = open.length > 0 ? clamp01(1 - late / open.length) : 1;

  // quality: scrap rate → 5%+ scores 0
  const scrapRate = output + scrap > 0 ? scrap / (output + scrap) : 0;
  const quality = clamp01(1 - scrapRate / 0.05);

  // machine active utilization (85% = full marks)
  const utilization = clamp01(util / 0.85);

  // operator efficiency: plan performance (est ÷ actual) capped
  const planPerf = planPerformanceOf(snap.orders);
  const operator = clamp01(planPerf);

  // breakdown management: less downtime today = higher (≈90 min/station tolerated)
  const downMin = Object.values(downtimeTodayByStation(snap.downtime, now)).reduce((s, m) => s + m, 0);
  const breakdown = clamp01(1 - downMin / (SIM_STATIONS.length * 90));

  // capacity utilization: share of stations actively producing (80% = full)
  const running = snap.stations.filter((s) => s.state === "running").length;
  const capacity = clamp01(running / SIM_STATIONS.length / 0.8);

  // plan & capacity adherence
  const adherence = clamp01(adherenceRate(planPerf, util));

  // maintenance discipline: overdue tasks reduce it
  const mnt = snap.settings.features.maintenance ? snap.maintenance : [];
  const overdue = mnt.filter((m) => m.nextDueAt < snap.now).length;
  const maintenance = mnt.length > 0 ? clamp01(1 - overdue / mnt.length) : 1;

  const values: Record<ScoreFactorKey, number> = {
    productivity,
    delivery,
    quality,
    utilization,
    operator,
    breakdown,
    capacity,
    adherence,
    maintenance,
  };

  const factors: ScoreFactor[] = (Object.keys(WEIGHTS) as ScoreFactorKey[]).map((key) => ({
    key,
    value: values[key],
    weight: WEIGHTS[key],
    points: Math.round(values[key] * WEIGHTS[key]),
  }));

  const total = Math.round(factors.reduce((s, f) => s + f.points, 0));
  return { total, band: bandOf(total), factors };
}

/** The weakest factors (lowest value) — what to improve to raise the score. */
export function weakestFactors(score: PlantScore, n = 3): ScoreFactor[] {
  return [...score.factors].sort((a, b) => a.value - b.value).slice(0, n);
}
