"use client";

import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import {
  scrapByReasonToday,
  scrapCostToday,
  scrapTotalsToday,
} from "@/lib/mes-calc";

/**
 * Scrap / waste board: today's scrap by reason (weight pareto) with piece and
 * weight totals. `withCost` adds the money figure — Executive only (Production
 * Management has no money remit).
 */
export default function ScrapPanel({ withCost = false }: { withCost?: boolean }) {
  const t = useTranslations("mes.scrap");
  const locale = useLocale();
  const { snap } = useDemo();
  if (!snap) return null;

  const now = new Date(snap.now);
  const reasons = scrapByReasonToday(snap.scrapEvents, now);
  const totals = scrapTotalsToday(snap.scrapEvents, now);
  const maxKg = Math.max(1, ...reasons.map((r) => r.weightKg));
  const reasonName = (id: string) =>
    snap.settings.scrapReasons.find((r) => r.id === id)?.name ?? id;
  const cost = withCost
    ? scrapCostToday(snap.scrapEvents, snap.stock, snap.settings.costRates.laborPerHour, now)
    : 0;

  return (
    <Card title={t("title")} subtitle={t("subtitle")}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div>
          <span className="text-3xl font-semibold tracking-tight text-critical-text">
            {t("kg", { v: Math.round(totals.weightKg) })}
          </span>
          <span className="ml-2 text-sm text-muted">{t("pieces", { v: totals.qty })}</span>
        </div>
        {withCost && (
          <div className="text-sm text-ink-2">
            {t("costLabel")}:{" "}
            <span className="font-medium text-critical-text">
              {formatCost(cost, snap.settings.currency, locale, 0)}
            </span>
          </div>
        )}
      </div>

      {reasons.length === 0 ? (
        <p className="mt-4 text-sm text-good-text">{t("none")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reasons.map((r) => (
            <li key={r.reasonId}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <Trash2 className="size-3.5 text-muted" />
                  {reasonName(r.reasonId)}
                </span>
                <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {t("kg", { v: Math.round(r.weightKg) })}{" "}
                  <span className="text-xs text-muted">· {t("pieces", { v: r.qty })}</span>
                </span>
              </div>
              <div className="mt-1 h-3 rounded-r-md bg-critical-soft">
                <div
                  className="h-full rounded-r-md bg-critical"
                  style={{ width: `${(r.weightKg / maxKg) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
