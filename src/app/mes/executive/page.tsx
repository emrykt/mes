"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertOctagon,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Factory,
  Loader2,
  Wrench,
} from "lucide-react";
import TrendChart from "@/components/charts/TrendChart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import InsightsPanel from "@/components/mes/InsightsPanel";
import PerformanceScore from "@/components/mes/PerformanceScore";
import ScrapPanel from "@/components/mes/ScrapPanel";
import BadgesStrip from "@/components/mes/BadgesStrip";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import {
  adherenceRate,
  downtimeCostPerHour,
  downtimeTodayByReason,
  orderDone,
  paretoOf,
  planPerformanceOf,
} from "@/lib/mes-calc";
import { plantEconomics } from "@/lib/revenue";
import { SIM_STATIONS, plantDailySeries } from "@/lib/sim";
import type { DemoSettings } from "@/lib/demo-types";

/** Daily production target ≈ plant nominal capacity × 65%. */
const PLANT_TARGET = Math.round(
  SIM_STATIONS.reduce((s, st) => s + st.rate, 0) * 24 * 0.65,
);

const CUTTING = new Set(["op-lazer", "op-plazma", "op-oksijen"]);

/** Rough plant cost (USD) for a day at the given average utilization. */
function costOfDay(util: number, cr: DemoSettings["costRates"]): {
  labor: number;
  energy: number;
  gas: number;
  overhead: number;
  total: number;
} {
  const stations = SIM_STATIONS.length;
  const cuttingCount = SIM_STATIONS.filter((s) => CUTTING.has(s.operationId)).length;
  const labor = stations * 24 * cr.laborPerHour;
  const energy = stations * 24 * util * cr.energyPerHour;
  const gas = cuttingCount * 24 * util * cr.gasPerHour;
  const overhead = cr.overheadPerDay;
  return { labor, energy, gas, overhead, total: labor + energy + gas + overhead };
}

function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function ExecutivePage() {
  const t = useTranslations("mes.executive");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { snap } = useDemo();
  const ent = useEntitlements();

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const now = new Date(snap.now);
  const settings = snap.settings;
  const util = snap.today.util;
  const output = snap.today.output;

  const downStations = snap.stations.filter((s) => s.state === "down");
  const openAndon = snap.andon.filter((a) => a.open);
  const rushAtRisk = snap.orders.filter(
    (o) =>
      o.priority === "high" &&
      !orderDone(o) &&
      new Date(o.dueDate).getTime() - now.getTime() < 3 * 86400000,
  );
  const topReason = paretoOf(snap.downtime, now)[0];
  const reasonName = (id: string) =>
    settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;

  // today's cost, prorated by elapsed hours
  const elapsed = (now.getUTCHours() + 1) / 24;
  const dayCost = costOfDay(util, settings.costRates);
  const cost = {
    labor: dayCost.labor * elapsed,
    energy: dayCost.energy * elapsed,
    gas: dayCost.gas * elapsed,
    overhead: dayCost.overhead * elapsed,
  };
  const costTotal = cost.labor + cost.energy + cost.gas + cost.overhead;

  const trend = plantDailySeries(now, 7);
  const money = (v: number, digits = 0) =>
    formatCost(v, settings.currency, locale, digits);

  // downtime cost today, by reason
  const dtPerHour = downtimeCostPerHour(settings.costRates);
  const dtByReason = downtimeTodayByReason(snap.downtime, now).map((d) => ({
    reasonId: d.reasonId,
    minutes: d.minutes,
    cost: (d.minutes / 60) * dtPerHour,
  }));
  const dtTotal = dtByReason.reduce((s, d) => s + d.cost, 0);
  const dtMax = Math.max(1, ...dtByReason.map((d) => d.cost));

  // revenue / profit / lost revenue from per-station billing rates
  const eco = plantEconomics(snap, now);
  const lostStations = eco.byStation.filter((x) => x.lost > 0);
  const lostMax = Math.max(1, ...lostStations.map((x) => x.lost));
  const maintOverdue = settings.features.maintenance
    ? snap.maintenance.filter((m) => m.nextDueAt < snap.now).length
    : 0;

  const alerts: { icon: typeof Bell; text: string; critical: boolean }[] = [
    {
      icon: AlertOctagon,
      text: t("stationsDown", { count: downStations.length }),
      critical: downStations.length > 0,
    },
    {
      icon: Bell,
      text: t("andonOpen", { count: openAndon.length }),
      critical: openAndon.length > 0,
    },
    {
      icon: Clock,
      text: t("rushLate", { count: rushAtRisk.length }),
      critical: rushAtRisk.length > 0,
    },
    ...(maintOverdue > 0
      ? [
          {
            icon: Wrench,
            text: t("maintOverdue", { count: maintOverdue }),
            critical: true,
          },
        ]
      : []),
  ];
  const anyCritical = alerts.some((a) => a.critical);

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(now);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 md:py-10">
      <header className="flex items-center gap-3">
        <Link
          href="/mes"
          className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft"
          aria-label={tc("back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Factory className="size-4.5" />
        </span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{t("subtitle", { date: dateLabel })}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      {/* live 0–1000 performance score — hero */}
      <div className="mt-6">
        <PerformanceScore />
      </div>

      {/* hero: utilization + output + plan performance */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("utilToday")}</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
            {Math.round(util * 100)}
            <span className="text-xl text-ink-2 sm:text-2xl">%</span>
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("outputToday")}</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
            {output.toLocaleString(locale)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("outputOf", { target: PLANT_TARGET.toLocaleString(locale) })}
          </p>
          <div className="mx-auto mt-2 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-accent-wash">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (output / PLANT_TARGET) * 100)}%` }}
            />
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("adherenceToday")}</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
            {Math.round(adherenceRate(planPerformanceOf(snap.orders), util) * 100)}
            <span className="text-xl text-ink-2 sm:text-2xl">%</span>
          </p>
        </Card>
      </div>

      {/* smart suggestions — AI Pro */}
      {ent.advancedAnalytics && (
        <div className="mt-4">
          <InsightsPanel limit={3} />
        </div>
      )}

      {/* cost today (display currency) */}
      <Card title={t("costTitle")} className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-3xl font-semibold tracking-tight">{money(costTotal)}</p>
          <p className="text-sm text-ink-2">
            {t("costPerPart", { value: money(costTotal / Math.max(1, output), 2) })}
          </p>
        </div>
        <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full">
          {(
            [
              ["labor", cost.labor, "var(--color-accent)"],
              ["energy", cost.energy, "#1baf7a"],
              ["gas", cost.gas, "#eda100"],
              ["overhead", cost.overhead, "#898781"],
            ] as const
          ).map(([key, v, color]) => (
            <div
              key={key}
              style={{ width: `${(v / costTotal) * 100}%`, backgroundColor: color }}
            />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
          {(
            [
              ["costLabor", cost.labor, "var(--color-accent)"],
              ["costEnergy", cost.energy, "#1baf7a"],
              ["costGas", cost.gas, "#eda100"],
              ["costOverhead", cost.overhead, "#898781"],
            ] as const
          ).map(([key, v, color]) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-ink-2">{t(key)}</span>
              <span className="ml-auto font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {money(v)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* revenue & profit today */}
      <Card title={t("profitTitle")} subtitle={t("profitHint")} className="mt-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs font-medium text-muted">{t("revenueLabel")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{money(eco.revenue)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">{t("costLabel")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-2">
              {money(eco.cost)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">{t("profitLabel")}</p>
            <p
              className={`mt-1 text-2xl font-semibold tracking-tight ${
                eco.profit >= 0 ? "text-good-text" : "text-critical-text"
              }`}
            >
              {money(eco.profit)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t("marginLabel", { pct: Math.round(eco.marginPct) })}
            </p>
          </div>
        </div>
        {/* revenue vs cost bar */}
        <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
          <div
            className="bg-good"
            style={{ width: `${(eco.cost / Math.max(1, eco.revenue)) * 100}%` }}
            title={t("costLabel")}
          />
          <div className="flex-1 bg-good/40" title={t("profitLabel")} />
        </div>
      </Card>

      {/* downtime cost today, by reason */}
      <Card
        title={t("downtimeCostTitle")}
        subtitle={t("downtimeCostHint")}
        className="mt-4"
      >
        {dtByReason.length === 0 ? (
          <p className="text-sm text-good-text">{t("downtimeCostNone")}</p>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-critical-text">
              {money(dtTotal)}
            </p>
            <ul className="mt-4 space-y-3">
              {dtByReason.map((d) => (
                <li key={d.reasonId}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-2">{reasonName(d.reasonId)}</span>
                    <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(d.cost)}{" "}
                      <span className="text-xs text-muted">· {d.minutes}′</span>
                    </span>
                  </div>
                  <div className="mt-1 h-3 rounded-r-md bg-critical-soft">
                    <div
                      className="h-full rounded-r-md bg-critical"
                      style={{ width: `${(d.cost / dtMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* lost revenue (opportunity cost of downtime) */}
      <Card
        title={t("lostRevenueTitle")}
        subtitle={t("lostRevenueHint")}
        className="mt-4"
      >
        {lostStations.length === 0 ? (
          <p className="text-sm text-good-text">{t("lostRevenueNone")}</p>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-warning-text">
              {money(eco.lostRevenue)}
            </p>
            <ul className="mt-4 space-y-3">
              {lostStations.map((s) => (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-2">{s.name}</span>
                    <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(s.lost)}{" "}
                      <span className="text-xs text-muted">· {s.downMin}′</span>
                    </span>
                  </div>
                  <div className="mt-1 h-3 rounded-r-md bg-warning-soft">
                    <div
                      className="h-full rounded-r-md bg-warning"
                      style={{ width: `${(s.lost / lostMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* achievement badges */}
      <Card title={t("badgesTitle")} className="mt-4">
        <BadgesStrip />
      </Card>

      {/* scrap / waste cost */}
      <div className="mt-4">
        <ScrapPanel withCost />
      </div>

      {/* alerts */}
      <Card title={t("activeAlerts")} className="mt-4" padded={false}>
        {!anyCritical ? (
          <p className="flex items-center gap-2 px-5 pb-5 text-sm text-good-text">
            <CheckCircle2 className="size-4" />
            {t("allGood")}
          </p>
        ) : (
          <ul>
            {alerts
              .filter((a) => a.critical)
              .map((a) => (
                <li
                  key={a.text}
                  className="flex items-center gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-critical-soft text-critical-text">
                    <a.icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{a.text}</span>
                </li>
              ))}
            {topReason && (
              <li className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
                  <Clock className="size-4" />
                </span>
                <span className="text-sm text-ink-2">
                  {t("topDowntime")}:{" "}
                  <span className="font-medium text-ink">
                    {reasonName(topReason.reasonId)} · {topReason.minutes}′
                  </span>
                </span>
              </li>
            )}
          </ul>
        )}
      </Card>

      {/* trends */}
      <Card title={t("utilTrend")} className="mt-4">
        <TrendChart
          labels={trend.map((d) => dayLabel(d.day, locale))}
          series={[
            {
              name: t("utilToday"),
              color: "var(--color-accent)",
              values: trend.map((d) => d.util * 100),
            },
          ]}
          unit="percent"
          yMax={100}
          height={160}
        />
      </Card>

      <Card title={t("costTrend")} className="mt-4">
        <TrendChart
          labels={trend.map((d) => dayLabel(d.day, locale))}
          series={[
            {
              name: t("costTitle"),
              color: "var(--color-accent)",
              values: trend.map((d) => costOfDay(d.util, settings.costRates).total),
            },
          ]}
          height={160}
        />
      </Card>

      <Card title={t("outputTrend")} className="mt-4">
        <TrendChart
          labels={trend.map((d) => dayLabel(d.day, locale))}
          series={[
            {
              name: t("outputSeries"),
              color: "var(--color-accent)",
              values: trend.map((d) => d.output),
            },
            {
              name: t("targetSeries"),
              color: "#898781",
              values: trend.map(() => PLANT_TARGET),
            },
          ]}
          height={160}
        />
      </Card>
    </div>
  );
}
