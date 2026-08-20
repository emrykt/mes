"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TrendingDown } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { plantEconomics } from "@/lib/revenue";
import { scrapCostToday } from "@/lib/mes-calc";

/**
 * "Potential lost revenue" — the money the plant is leaving on the table today:
 * idle/downtime capacity you couldn't bill + scrap cost. Front and centre on the
 * executive Pulse so the customer sees what the platform helps recover.
 */
export default function LostRevenueCard() {
  const t = useTranslations("mes.lostRev");
  const locale = useLocale();
  const { snap } = useDemo();
  const now = useMemo(() => new Date(), []);

  if (!snap) return null;
  const money = (v: number) => formatCost(v, snap.settings.currency, locale, 0);

  const eco = plantEconomics(snap, now);
  const downtime = Math.max(0, Math.round(eco.lostRevenue));
  const scrap = Math.max(
    0,
    Math.round(scrapCostToday(snap.scrapEvents, snap.stock, snap.settings.costRates.laborPerHour, now)),
  );
  const total = downtime + scrap;
  const denom = Math.max(1, total);
  const parts = [
    { label: t("downtime"), value: downtime, color: "var(--color-serious)" },
    { label: t("scrap"), value: scrap, color: "var(--color-warning)" },
  ];

  return (
    <Card className="border-serious/30 bg-serious-soft/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-serious-text">
            <TrendingDown className="size-4" />
            {t("title")}
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-serious-text">
            {money(total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-2">{t("subtitle")}</p>
        </div>
        <div className="min-w-56 flex-1">
          {/* segmented bar */}
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
          </div>
        </div>
      </div>
    </Card>
  );
}
