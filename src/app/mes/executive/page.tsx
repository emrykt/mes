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
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import InsightsPanel from "@/components/mes/InsightsPanel";
import BadgesStrip from "@/components/mes/BadgesStrip";
import { Card } from "@/components/ui";
import {
  adherenceRate,
  orderDone,
  paretoOf,
  planPerformanceOf,
} from "@/lib/mes-calc";
import { SIM_STATIONS, plantDailySeries } from "@/lib/sim";
import { companyProfile } from "@/lib/companies";

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

  // per-company sizing: capacity target + trend scale with this plant, not all 16
  const profile = companyProfile(snap.companyId);
  const plantTarget = Math.round(
    snap.stations.reduce(
      (s, st) => s + (SIM_STATIONS.find((d) => d.id === st.id)?.rate ?? 0),
      0,
    ) *
      24 *
      0.65,
  );

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

  // scale the shared time model to this company (util & output magnitude)
  const trend = plantDailySeries(now, 7).map((d) => ({
    day: d.day,
    util: Math.min(1, d.util * profile.utilFactor),
    output: Math.round(d.output * profile.histFactor),
  }));

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
        <Link
          href="/mes"
          className="flex size-8 items-center justify-center rounded-lg bg-accent text-white"
          aria-label={tc("appName")}
        >
          <Factory className="size-4.5" />
        </Link>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{snap.companyName} · {t("subtitle", { date: dateLabel })}</p>
        </div>
        <CompanySwitcher />
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      {/* hero: utilization + output + plan performance */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("utilToday")}</p>
          <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-5xl">
            {Math.round(util * 100)}
            <span className="text-base text-ink-2 sm:text-2xl">%</span>
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("outputToday")}</p>
          <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-5xl">
            {output.toLocaleString(locale)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("outputOf", { target: plantTarget.toLocaleString(locale) })}
          </p>
          <div className="mx-auto mt-2 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-accent-wash">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (output / Math.max(1, plantTarget)) * 100)}%` }}
            />
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-medium text-muted">{t("adherenceToday")}</p>
          <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-5xl">
            {Math.round(adherenceRate(planPerformanceOf(snap.orders), util) * 100)}
            <span className="text-base text-ink-2 sm:text-2xl">%</span>
          </p>
        </Card>
      </div>

      {/* smart suggestions — AI Pro */}
      {ent.advancedAnalytics && (
        <div className="mt-4">
          <InsightsPanel limit={3} />
        </div>
      )}

      {/* achievement badges */}
      <Card title={t("badgesTitle")} className="mt-4">
        <BadgesStrip />
      </Card>

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
              values: trend.map(() => plantTarget),
            },
          ]}
          height={160}
        />
      </Card>
    </div>
  );
}
