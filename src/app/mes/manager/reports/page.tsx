"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import TrendChart from "@/components/charts/TrendChart";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card, Table, Td, Th } from "@/components/ui";
import { orderDone } from "@/lib/mes-calc";
import {
  SIM_STATIONS,
  addDays,
  completedOrders,
  dayIso,
  plantDailySeries,
  simDay,
} from "@/lib/sim";
import type { MesOrder } from "@/lib/mes-types";
import { formatShortDate } from "@/lib/format";

const RANGES = [7, 30, 90] as const;

function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function ReportsPage() {
  const t = useTranslations("mes.reports");
  const locale = useLocale();
  const { snap } = useDemo();
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);

  const now = useMemo(() => new Date(), []);

  const series = useMemo(() => plantDailySeries(now, days), [now, days]);

  const byReason = useMemo(() => {
    const acc = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const iso = dayIso(addDays(now, -i));
      for (const st of SIM_STATIONS) {
        for (const [r, m] of Object.entries(simDay(st.id, iso).byReason))
          acc.set(r, (acc.get(r) ?? 0) + m);
      }
    }
    return [...acc.entries()]
      .map(([reasonId, minutes]) => ({ reasonId, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [now, days]);

  const finished: MesOrder[] = useMemo(() => {
    const sim = completedOrders(now, days);
    const store = (snap?.orders ?? []).filter((o) => orderDone(o));
    return [...store, ...sim].slice(0, 40);
  }, [now, days, snap]);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const reasonName = (id: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;

  const totals = series.reduce(
    (acc, d) => ({
      output: acc.output + d.output,
      scrap: acc.scrap + d.scrap,
      downMin: acc.downMin + d.downMin,
      util: acc.util + d.util,
    }),
    { output: 0, scrap: 0, downMin: 0, util: 0 },
  );
  const reasonMax = Math.max(1, ...byReason.map((r) => r.minutes));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      {/* range selector */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1 sm:max-w-md">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              r === days ? "bg-accent text-white" : "text-ink-2 hover:bg-neutral-soft"
            }`}
          >
            {t(`range${r}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t("outputTitle")}>
          <TrendChart
            labels={series.map((d) => dayLabel(d.day, locale))}
            series={[
              {
                name: t("colOutput"),
                color: "var(--color-accent)",
                values: series.map((d) => d.output),
              },
            ]}
          />
        </Card>
        <Card title={t("utilTitle")}>
          <TrendChart
            labels={series.map((d) => dayLabel(d.day, locale))}
            series={[
              {
                name: t("colUtil"),
                color: "var(--color-accent)",
                values: series.map((d) => d.util * 100),
              },
            ]}
            unit="percent"
            yMax={100}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* downtime by reason */}
        <Card title={t("downtimeTitle")}>
          <ul className="space-y-3">
            {byReason.slice(0, 6).map((r) => (
              <li key={r.reasonId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-2">{reasonName(r.reasonId)}</span>
                  <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("minutes", { min: r.minutes.toLocaleString(locale) })}
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r-md bg-accent-wash">
                  <div
                    className="h-full rounded-r-md bg-accent"
                    style={{ width: `${(r.minutes / reasonMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* completed orders */}
        <Card
          title={t("completedTitle")}
          subtitle={t("completedSubtitle", { count: finished.length })}
          padded={false}
        >
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <thead>
                <tr>
                  <Th>{t("colDay")}</Th>
                  <Th align="right">{t("colFinished")}</Th>
                </tr>
              </thead>
              <tbody>
                {finished.map((o) => (
                  <tr key={o.id}>
                    <Td>
                      <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {o.id}
                      </span>
                      <p className="text-xs text-muted">
                        {o.customer} · {o.part} · {o.qty}
                      </p>
                    </Td>
                    <Td align="right" className="text-ink-2">
                      {formatShortDate(o.dueDate, locale)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>

      {/* daily breakdown table */}
      <Card title={t("dailyTable")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colDay")}</Th>
              <Th align="right">{t("colOutput")}</Th>
              <Th align="right">{t("colScrap")}</Th>
              <Th align="right">{t("colScrapRate")}</Th>
              <Th align="right">{t("colDowntime")}</Th>
              <Th align="right">{t("colUtil")}</Th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((d) => (
              <tr key={d.day}>
                <Td className="font-medium">{dayLabel(d.day, locale)}</Td>
                <Td align="right" className="text-ink-2">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {d.output.toLocaleString(locale)}
                  </span>
                </Td>
                <Td align="right" className="text-ink-2">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{d.scrap}</span>
                </Td>
                <Td align="right" className="text-ink-2">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {((d.scrap / Math.max(1, d.output)) * 100).toFixed(1)}%
                  </span>
                </Td>
                <Td align="right" className="text-ink-2">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("minutes", { min: d.downMin.toLocaleString(locale) })}
                  </span>
                </Td>
                <Td align="right" className="font-medium">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(d.util * 100)}%
                  </span>
                </Td>
              </tr>
            ))}
            <tr className="bg-neutral-soft/50">
              <Td className="font-semibold">{t("totalsRow")}</Td>
              <Td align="right" className="font-semibold">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {totals.output.toLocaleString(locale)}
                </span>
              </Td>
              <Td align="right" className="font-semibold">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{totals.scrap}</span>
              </Td>
              <Td align="right" className="font-semibold">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {((totals.scrap / Math.max(1, totals.output)) * 100).toFixed(1)}%
                </span>
              </Td>
              <Td align="right" className="font-semibold">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {t("minutes", { min: totals.downMin.toLocaleString(locale) })}
                </span>
              </Td>
              <Td align="right" className="font-semibold">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {Math.round((totals.util / series.length) * 100)}%
                </span>
              </Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
