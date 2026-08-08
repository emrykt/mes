"use client";

import { useTranslations } from "next-intl";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import {
  KPI_SECTIONS,
  computeKpis,
  kpisForSection,
  type KpiSection,
  type KpiStatus,
  type KpiUnit,
  type KpiValue,
} from "@/lib/kpi";

const STATUS_COLOR: Record<KpiStatus, string> = {
  good: "var(--color-good)",
  warn: "var(--color-warning)",
  bad: "var(--color-critical)",
};

function fmt(value: number, unit: KpiUnit, minLabel: string): string {
  const v = Math.round(value);
  if (unit === "percent") return `${v}%`;
  if (unit === "minutes") return `${v} ${minLabel}`;
  return `${v}`;
}

function targetFmt(value: number, unit: KpiUnit, minLabel: string): string {
  const v = Math.round(value);
  if (unit === "percent") return `${v}%`;
  if (unit === "minutes") return `${v} ${minLabel}`;
  return `${v}`;
}

function KpiTile({ kpi }: { kpi: KpiValue }) {
  const t = useTranslations("mes.kpi");
  const color = STATUS_COLOR[kpi.status];
  const minLabel = t("unitMin");
  return (
    <div
      className="rounded-xl border border-line bg-surface p-3.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p className="truncate text-xs font-medium text-ink-2">{t(kpi.def.id)}</p>
      <p className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums" style={{ color }}>
        {fmt(kpi.value, kpi.def.unit, minLabel)}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        {t("target")}: {targetFmt(kpi.target, kpi.def.unit, minLabel)}
      </p>
    </div>
  );
}

/**
 * KPI scorecard against targets, section by section. `sections` picks which
 * departments to show (default: all — the executive "toptan" view). `withMoney`
 * reveals money KPIs (executive/sales only).
 */
export default function KpiScorecard({
  sections = KPI_SECTIONS,
  withMoney = false,
  showSectionTitles = true,
}: {
  sections?: KpiSection[];
  withMoney?: boolean;
  showSectionTitles?: boolean;
}) {
  const t = useTranslations("mes.kpi");
  const { snap } = useDemo();
  if (!snap) return null;

  const all = computeKpis(snap, new Date(snap.now));

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const rows = kpisForSection(all, section, { withMoney });
        if (rows.length === 0) return null;
        return (
          <div key={section}>
            {showSectionTitles && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t(`section.${section}`)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {rows.map((kpi) => (
                <KpiTile key={kpi.def.id} kpi={kpi} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact one-line summary: how many KPIs are on/off target (for headers). */
export function KpiSummaryStrip({ sections = KPI_SECTIONS, withMoney = false }: {
  sections?: KpiSection[];
  withMoney?: boolean;
}) {
  const t = useTranslations("mes.kpi");
  const { snap } = useDemo();
  if (!snap) return null;
  const all = computeKpis(snap, new Date(snap.now)).filter(
    (v) => sections.includes(v.def.section) && (withMoney || !v.def.money),
  );
  const counts: Record<KpiStatus, number> = { good: 0, warn: 0, bad: 0 };
  for (const v of all) counts[v.status]++;
  const chip = (status: KpiStatus, n: number) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
      <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
      {n} {t(`status.${status}`)}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      {chip("good", counts.good)}
      {chip("warn", counts.warn)}
      {chip("bad", counts.bad)}
    </div>
  );
}
