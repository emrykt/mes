"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import TrendChart from "@/components/charts/TrendChart";
import { Card, Table, Td, Th } from "@/components/ui";
import {
  PERF_RANGES,
  performanceFor,
  type PerfRange,
  type PerfSnapshot,
} from "@/lib/sim";

function formatLabel(t: string, kind: PerfSnapshot["labelKind"], locale: string): string {
  if (kind === "date")
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${t}T00:00:00Z`));
  if (kind === "month")
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${t}-01T00:00:00Z`));
  return t; // time / week / quarter / year are locale-neutral
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Shift / operator / sector-benchmark comparison over six time ranges,
 * computed from the 24/7 plant simulation. Shared by manager & executive.
 */
export default function PerformanceComparison() {
  const t = useTranslations("mes.performance");
  const locale = useLocale();
  const [range, setRange] = useState<PerfRange>("day");

  // heavier ranges (quarter/year) memoize per selection
  const snap = useMemo(() => performanceFor(range, new Date()), [range]);
  const shiftMax = Math.max(...snap.shifts.map((s) => s.adherence));

  const benchRows = [
    { label: t("yourPlant"), value: snap.benchmark.plant, color: "var(--color-accent)", strong: true },
    { label: t("sectorAvg"), value: snap.benchmark.sectorAvg, color: "#898781", strong: false },
    { label: t("sectorTop"), value: snap.benchmark.sectorTop, color: "#1baf7a", strong: false },
  ];

  return (
    <div className="space-y-5">
      {/* range selector */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {PERF_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`shrink-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              r === range ? "bg-accent text-white" : "text-ink-2 hover:bg-neutral-soft"
            }`}
          >
            {t(`range.${r}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* sector benchmark */}
        <Card title={t("benchmarkTitle")} subtitle={t("benchmarkSubtitle")}>
          <ul className="space-y-3.5">
            {benchRows.map((row) => (
              <li key={row.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={row.strong ? "font-semibold" : "text-ink-2"}>
                    {row.label}
                  </span>
                  <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {pct(row.value)}
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r-md bg-neutral-soft">
                  <div
                    className="h-full rounded-r-md"
                    style={{ width: `${row.value * 100}%`, backgroundColor: row.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{t("privacyNote")}</p>
        </Card>

        {/* plant vs sector trend */}
        <Card title={t("trendTitle")}>
          <TrendChart
            labels={snap.trend.map((p) => formatLabel(p.t, snap.labelKind, locale))}
            series={[
              {
                name: t("yourPlant"),
                color: "var(--color-accent)",
                values: snap.trend.map((p) => p.plant * 100),
              },
              {
                name: t("sectorAvg"),
                color: "#898781",
                values: snap.trend.map((p) => p.sector * 100),
              },
            ]}
            unit="percent"
            yMax={100}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* shifts — ranked by plan & capacity adherence */}
        <Card title={t("shiftTitle")} subtitle={t("adherenceSubtitle")}>
          <ul className="space-y-3.5">
            {snap.shifts.map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-2">{s.name}</span>
                  <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {pct(s.adherence)}{" "}
                    <span className="text-muted">· {t("utilShort", { v: pct(s.util) })}</span>
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r-md bg-accent-wash">
                  <div
                    className="h-full rounded-r-md bg-accent"
                    style={{ width: `${(s.adherence / shiftMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* operators — ranked by plan & capacity adherence, not piece count */}
        <Card title={t("operatorTitle")} subtitle={t("adherenceSubtitle")} padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("colOperator")}</Th>
                <Th>{t("colUtil")}</Th>
                <Th align="right">{t("colOutput")}</Th>
                <Th align="right">{t("colAdherence")}</Th>
              </tr>
            </thead>
            <tbody>
              {snap.operators.map((o) => {
                const perfPct = Math.round(o.adherence * 100);
                return (
                  <tr key={o.name}>
                    <Td className="font-medium">{o.name}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-accent-wash">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${o.util * 100}%` }}
                          />
                        </div>
                        <span
                          className="text-xs text-ink-2"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {pct(o.util)}
                        </span>
                      </div>
                    </Td>
                    <Td align="right" className="text-ink-2">
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {o.output.toLocaleString(locale)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span
                        className={`text-sm font-semibold ${
                          perfPct >= 85
                            ? "text-good-text"
                            : perfPct < 70
                              ? "text-critical-text"
                              : "text-ink-2"
                        }`}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {perfPct}%
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
