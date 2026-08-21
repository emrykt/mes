"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TrendingDown } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { plantEconomics } from "@/lib/revenue";
import { scrapCostToday, downtimeTodayByReason } from "@/lib/mes-calc";
import PeriodToggle, { PERIOD_FACTOR, type Period } from "@/components/mes/PeriodToggle";

const BREAK_REASON = "dt-break";

/**
 * "Potential lost revenue" — money the plant leaves on the table today: unplanned
 * downtime (breaks EXCLUDED — they're legitimate), idle billable capacity and
 * scrap. Front and centre on the executive Pulse so the customer sees what the
 * platform helps recover.
 */
export default function LostRevenueCard() {
  const t = useTranslations("mes.lostRev");
  const locale = useLocale();
  const { snap } = useDemo();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>("daily");

  if (!snap) return null;
  const factor = PERIOD_FACTOR[period];
  const money = (v: number) => formatCost(v, snap.settings.currency, locale, 0);

  const eco = plantEconomics(snap, now);
  const rates = Object.values(snap.settings.billingRates);
  const avgRate = rates.length ? rates.reduce((s, x) => s + x, 0) / rates.length : 40;

  // split downtime into break vs non-break (only non-break is "recoverable")
  const byReason = downtimeTodayByReason(snap.downtime, now);
  const breakMin = byReason.filter((r) => r.reasonId === BREAK_REASON).reduce((s, r) => s + r.minutes, 0);
  const breakLoss = (breakMin / 60) * avgRate;
  const downtimeLoss = Math.max(0, Math.round(eco.lostRevenue - breakLoss));

  const scrap = Math.max(
    0,
    Math.round(scrapCostToday(snap.scrapEvents, snap.stock, snap.settings.costRates.laborPerHour, now)),
  );

  const total = (downtimeLoss + scrap) * factor;
  const denom = Math.max(1, total);
  const parts = [
    { label: t("downtime"), value: downtimeLoss * factor, color: "var(--color-serious)" },
    { label: t("scrap"), value: scrap * factor, color: "var(--color-warning)" },
  ];

  return (
    <Card className="border-serious/30 bg-serious-soft/30">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-serious-text">
          <TrendingDown className="size-4" />
          {t("title")}
        </p>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums text-serious-text">
            {money(total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-2">{t("subtitle")}</p>
        </div>
        <div className="min-w-56 flex-1">
          <div className="flex h-3 overflow-hidden rounded-full bg-neutral-soft">
            {parts.map((p) => (
              <div key={p.label} style={{ width: `${(p.value / denom) * 100}%`, background: p.color }} />
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {parts.map((p) => (
              <div key={p.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
                  {p.label}
                </span>
                <span className="font-medium tabular-nums">{money(p.value)}</span>
              </div>
            ))}
            {breakMin > 0 && (
              <div className="flex items-center justify-between border-t border-line/60 pt-1 text-xs text-muted">
                <span>{t("breaksExcluded")}</span>
                <span className="tabular-nums">{t("minutes", { min: breakMin })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
