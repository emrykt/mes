import type { DemoSnapshot } from "./demo-types";
import { scrapByStationToday } from "./mes-calc";
import { lateOrders } from "./insights";
import { SIM_STATIONS, performanceFor } from "./sim";

/**
 * Achievement badges, recomputed live from performance data. Each badge names
 * a current holder (top performer in that category) and whether the target is
 * met. Shown on the andon TV, Production Management and Executive screens.
 */

export type BadgeKey =
  | "operatorDay"
  | "operatorWeek"
  | "operatorMonth"
  | "zeroDelay"
  | "lowestScrap"
  | "bestDelivery"
  | "stableQuality"
  | "fastestOp";

export interface Badge {
  key: BadgeKey;
  holder: string;
  detail: string;
  active: boolean;
}

const pctOf = (v: number) => `${Math.round(v * 100)}%`;

export function plantBadges(snap: DemoSnapshot, now: Date): Badge[] {
  const opName = (id: string) => snap.settings.operations.find((o) => o.id === id)?.name ?? id;
  const stName = (id: string) => SIM_STATIONS.find((s) => s.id === id)?.name ?? id;

  const day = performanceFor("day", now);
  const week = performanceFor("week", now);
  const month = performanceFor("month", now);
  const topDay = [...day.operators].sort((a, b) => b.adherence - a.adherence)[0];
  const topWeek = [...week.operators].sort((a, b) => b.adherence - a.adherence)[0];
  const topMonth = [...month.operators].sort((a, b) => b.adherence - a.adherence)[0];

  // delivery: on-time ratio
  const open = snap.orders.filter((o) => !o.routing.every((s) => s.status === "done"));
  const late = lateOrders(snap, now).length;
  const onTime = open.length > 0 ? 1 - late / open.length : 1;

  // quality
  const scrapRate = snap.today.output + snap.today.scrap > 0
    ? snap.today.scrap / (snap.today.output + snap.today.scrap)
    : 0;

  // lowest-scrap station (among those producing today)
  const scrapByStation = new Map(scrapByStationToday(snap.scrapEvents, now).map((x) => [x.stationId, x.weightKg]));
  const producing = snap.stations.filter((s) => s.todayOutput > 0);
  const leastScrap = [...producing].sort(
    (a, b) => (scrapByStation.get(a.id) ?? 0) - (scrapByStation.get(b.id) ?? 0),
  )[0];

  // fastest operation: best plan performance (est ÷ actual) over completed steps
  const opPerf = new Map<string, { est: number; act: number }>();
  for (const o of snap.orders)
    for (const s of o.routing)
      if (s.status === "done" && s.estMinutes && s.actualMinutes) {
        const a = opPerf.get(s.operationId) ?? { est: 0, act: 0 };
        a.est += s.estMinutes;
        a.act += s.actualMinutes;
        opPerf.set(s.operationId, a);
      }
  const fastest = [...opPerf.entries()]
    .map(([id, a]) => ({ id, perf: a.act > 0 ? a.est / a.act : 0 }))
    .sort((a, b) => b.perf - a.perf)[0];

  return [
    { key: "operatorDay", holder: topDay?.name ?? "—", detail: topDay ? pctOf(topDay.adherence) : "", active: !!topDay },
    { key: "operatorWeek", holder: topWeek?.name ?? "—", detail: topWeek ? pctOf(topWeek.adherence) : "", active: !!topWeek },
    { key: "operatorMonth", holder: topMonth?.name ?? "—", detail: topMonth ? pctOf(topMonth.adherence) : "", active: !!topMonth },
    { key: "zeroDelay", holder: "Tesis", detail: `${late}`, active: late === 0 },
    { key: "lowestScrap", holder: leastScrap ? stName(leastScrap.id) : "—", detail: leastScrap ? `${Math.round(scrapByStation.get(leastScrap.id) ?? 0)} kg` : "", active: !!leastScrap },
    { key: "bestDelivery", holder: "Tesis", detail: pctOf(onTime), active: onTime >= 0.85 },
    { key: "stableQuality", holder: "Tesis", detail: pctOf(1 - scrapRate), active: scrapRate <= 0.02 },
    { key: "fastestOp", holder: fastest ? opName(fastest.id) : "—", detail: fastest ? pctOf(fastest.perf) : "", active: !!fastest && fastest.perf >= 1 },
  ];
}
