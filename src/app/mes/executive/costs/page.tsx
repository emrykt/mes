"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Factory, Loader2 } from "lucide-react";
import TrendChart from "@/components/charts/TrendChart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import ScrapPanel from "@/components/mes/ScrapPanel";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { downtimeCostPerHour, downtimeTodayByReason } from "@/lib/mes-calc";
import { plantEconomics } from "@/lib/revenue";
import { SIM_STATIONS, plantDailySeries } from "@/lib/sim";
import { companyProfile } from "@/lib/companies";
import type { DemoSettings } from "@/lib/demo-types";

const CUTTING = new Set(["op-lazer", "op-plazma", "op-oksijen"]);

/** Rough plant cost for a day at the given utilization, for this plant's size. */
function costOfDay(
  util: number,
  cr: DemoSettings["costRates"],
  stationCount: number,
  cuttingCount: number,
): { labor: number; energy: number; gas: number; overhead: number; total: number } {
  const labor = stationCount * 24 * cr.laborPerHour;
  const energy = stationCount * 24 * util * cr.energyPerHour;
  const gas = cuttingCount * 24 * util * cr.gasPerHour;
  const overhead = cr.overheadPerDay;
  return { labor, energy, gas, overhead, total: labor + energy + gas + overhead };
}

function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default function ExecutiveCostsPage() {
  const t = useTranslations("mes.executive");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { snap } = useDemo();

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
  const profile = companyProfile(snap.companyId);
  const stationCount = snap.stations.length;
  const cuttingCount = snap.stations.filter((st) =>
    CUTTING.has(SIM_STATIONS.find((d) => d.id === st.id)?.operationId ?? ""),
  ).length;

  const money = (v: number, digits = 0) => formatCost(v, settings.currency, locale, digits);
  const reasonName = (id: string) =>
    settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;

  // today's cost, prorated by elapsed hours
  const elapsed = (now.getUTCHours() + 1) / 24;
  const dayCost = costOfDay(util, settings.costRates, stationCount, cuttingCount);
  const cost = {
    labor: dayCost.labor * elapsed,
    energy: dayCost.energy * elapsed,
    gas: dayCost.gas * elapsed,
    overhead: dayCost.overhead * elapsed,
  };
  const costTotal = cost.labor + cost.energy + cost.gas + cost.overhead;

  // downtime cost today, by reason
  const dtPerHour = downtimeCostPerHour(settings.costRates);
  const dtByReason = downtimeTodayByReason(snap.downtime, now).map((d) => ({
    reasonId: d.reasonId,
    minutes: d.minutes,
    cost: (d.minutes / 60) * dtPerHour,
  }));
  const dtTotal = dtByReason.reduce((s, d) => s + d.cost, 0);
  const dtMax = Math.max(1, ...dtByReason.map((d) => d.cost));

  // revenue / profit / lost revenue
  const eco = plantEconomics(snap, now);
  const lostStations = eco.byStation.filter((x) => x.lost > 0);
  const lostMax = Math.max(1, ...lostStations.map((x) => x.lost));

  const trend = plantDailySeries(now, 7).map((d) => ({
    day: d.day,
    util: Math.min(1, d.util * profile.utilFactor),
  }));

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
          <p className="text-xs text-muted">{snap.companyName} · {t("costsSubtitle")}</p>
        </div>
        <CompanySwitcher />
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      {/* cost today (display currency) */}
      <Card title={t("costTitle")} className="mt-5">
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
            <div key={key} style={{ width: `${(v / costTotal) * 100}%`, backgroundColor: color }} />
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
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-2">{money(eco.cost)}</p>
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
      <Card title={t("downtimeCostTitle")} subtitle={t("downtimeCostHint")} className="mt-4">
        {dtByReason.length === 0 ? (
          <p className="text-sm text-good-text">{t("downtimeCostNone")}</p>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-critical-text">{money(dtTotal)}</p>
            <ul className="mt-4 space-y-3">
              {dtByReason.map((d) => (
                <li key={d.reasonId}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-2">{reasonName(d.reasonId)}</span>
                    <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(d.cost)} <span className="text-xs text-muted">· {d.minutes}′</span>
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
      <Card title={t("lostRevenueTitle")} subtitle={t("lostRevenueHint")} className="mt-4">
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
                      {money(s.lost)} <span className="text-xs text-muted">· {s.downMin}′</span>
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

      {/* scrap / waste cost */}
      <div className="mt-4">
        <ScrapPanel withCost />
      </div>

      {/* cost trend */}
      <Card title={t("costTrend")} className="mt-4">
        <TrendChart
          labels={trend.map((d) => dayLabel(d.day, locale))}
          series={[
            {
              name: t("costTitle"),
              color: "var(--color-accent)",
              values: trend.map((d) => costOfDay(d.util, settings.costRates, stationCount, cuttingCount).total),
            },
          ]}
          height={160}
        />
      </Card>
    </div>
  );
}
