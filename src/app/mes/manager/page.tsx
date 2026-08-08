"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Bell, Factory, Loader2, Wrench } from "lucide-react";
import TrendChart from "@/components/charts/TrendChart";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import InsightsPanel from "@/components/mes/InsightsPanel";
import KpiScorecard from "@/components/mes/KpiScorecard";
import ScrapPanel from "@/components/mes/ScrapPanel";
import BadgesStrip from "@/components/mes/BadgesStrip";
import { StationStateBadge } from "@/components/mes/mes-ui";
import { Card, StatCard } from "@/components/ui";
import {
  adherenceRate,
  minutesAgo,
  paretoOf,
  planPerformanceOf,
  workloadOf,
} from "@/lib/mes-calc";
import { SIM_STATIONS, plantDailySeries, stationToday } from "@/lib/sim";
import type { AndonType } from "@/lib/mes-types";

const ANDON_ICONS: Record<AndonType, typeof Bell> = {
  supervisor: Factory,
  maintenance: Wrench,
  quality: BadgeCheck,
};

function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function ManagerOverviewPage() {
  const t = useTranslations("mes.manager");
  const tt = useTranslations("mes.andonType");
  const locale = useLocale();
  const { snap } = useDemo();
  const ent = useEntitlements();

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const now = new Date(snap.now);
  const reasonName = (id: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;
  const opName = (id: string) =>
    snap.settings.operations.find((o) => o.id === id)?.name ?? id;

  const downCount = snap.stations.filter((s) => s.state === "down").length;
  const openAndon = snap.andon.filter((a) => a.open);
  const pareto = paretoOf(snap.downtime, now).slice(0, 6);
  const paretoMax = Math.max(1, ...pareto.map((p) => p.minutes));
  const workload = workloadOf(snap.orders);
  const workloadMax = Math.max(1, ...workload.map((w) => w.minutes));
  const trend = plantDailySeries(now, 7);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        <StatCard
          label={t("kpiUtil")}
          value={`${Math.round(snap.today.util * 100)}%`}
          sub={t("utilHint")}
        />
        <StatCard label={t("kpiOutput")} value={String(snap.today.output)} />
        <StatCard label={t("kpiScrap")} value={String(snap.today.scrap)} />
        <StatCard
          label={t("kpiAdherence")}
          value={`${Math.round(adherenceRate(planPerformanceOf(snap.orders), snap.today.util) * 100)}%`}
          sub={t("adherenceHint")}
        />
        <StatCard label={t("kpiDown")} value={String(downCount)} />
        <StatCard label={t("kpiAndon")} value={String(openAndon.length)} />
      </div>

      {/* KPI targets — production & quality (AI Pro+) */}
      {ent.advancedAnalytics && (
        <Card title={t("kpiTargetsTitle")} subtitle={t("kpiTargetsSubtitle")}>
          <KpiScorecard sections={["production", "quality"]} />
        </Card>
      )}

      {/* smart suggestions — AI Pro */}
      {ent.advancedAnalytics && <InsightsPanel limit={3} />}

      {/* achievement badges */}
      <Card title={t("badgesTitle")}>
        <BadgesStrip />
      </Card>

      {/* stations grid */}
      <Card title={t("stationsTitle")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snap.stations.map((s) => {
            const def = SIM_STATIONS.find((d) => d.id === s.id);
            if (!def) return null;
            return (
              <div key={s.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{def.name}</p>
                    <p className="text-xs text-muted">{opName(def.operationId)}</p>
                  </div>
                  <StationStateBadge state={s.state} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-2">
                  <span>{s.operator}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("utilShort")} {Math.round(stationToday(s.id, now).util * 100)}%
                  </span>
                </div>
                {s.currentOrderIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.currentOrderIds.map((oid) => (
                      <Link
                        key={oid}
                        href={`/mes/manager/orders/${oid}`}
                        className="block truncate rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent-strong hover:bg-accent-wash"
                      >
                        {oid}
                      </Link>
                    ))}
                  </div>
                )}
                {s.state === "down" && s.downtimeReasonId && (
                  <p className="mt-2 rounded-lg bg-critical-soft px-2.5 py-1.5 text-xs font-medium text-critical-text">
                    {reasonName(s.downtimeReasonId)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* scrap / waste board (no cost on Production) */}
        <ScrapPanel />

        {/* queued workload per operation */}
        <Card title={t("workloadTitle")} subtitle={t("workloadSubtitle")}>
          <ul className="space-y-3">
            {workload.slice(0, 8).map((w) => (
              <li key={w.operationId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-2">{opName(w.operationId)}</span>
                  <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("hoursShort", { h: Math.round((w.minutes / 60) * 10) / 10 })}
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r-md bg-accent-wash">
                  <div
                    className="h-full rounded-r-md bg-accent"
                    style={{ width: `${(w.minutes / workloadMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* andon feed */}
        <Card title={t("andonTitle")} padded={false}>
          {snap.andon.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">{t("andonEmpty")}</p>
          ) : (
            <ul>
              {snap.andon.slice(0, 6).map((a) => {
                const Icon = ANDON_ICONS[a.type];
                const def = SIM_STATIONS.find((d) => d.id === a.stationId);
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        a.open
                          ? "bg-critical-soft text-critical-text"
                          : "bg-neutral-soft text-muted"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{def?.name}</p>
                      <p className="text-xs text-muted">
                        {tt(a.type)} · {t("sinceMin", { min: minutesAgo(a.at, now) })}
                      </p>
                    </div>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        a.open
                          ? "bg-critical-soft text-critical-text"
                          : "bg-neutral-soft text-ink-2"
                      }`}
                    >
                      {a.open ? t("openCall") : t("resolvedCall")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* downtime pareto */}
        <Card title={t("paretoTitle")} subtitle={t("paretoSubtitle")}>
          <ul className="space-y-3">
            {pareto.map((p) => (
              <li key={p.reasonId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-2">{reasonName(p.reasonId)}</span>
                  <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.minutes}′
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r-md bg-accent-wash">
                  <div
                    className="h-full rounded-r-md bg-accent"
                    style={{ width: `${(p.minutes / paretoMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* utilization trend */}
        <Card title={t("utilTrendTitle")} subtitle={t("utilTrendSubtitle")}>
          <TrendChart
            labels={trend.map((d) => dayLabel(d.day, locale))}
            series={[
              {
                name: t("utilShort"),
                color: "var(--color-accent)",
                values: trend.map((d) => d.util * 100),
              },
            ]}
            unit="percent"
            yMax={100}
          />
        </Card>
      </div>
    </div>
  );
}
