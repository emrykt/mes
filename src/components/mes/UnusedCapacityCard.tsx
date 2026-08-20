"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { unusedCapacityValue } from "@/lib/revenue";

/**
 * "Unused capacity value" — the billable value of every machine sitting idle
 * right now, over one working day (idle machines × hourly rate × working
 * hours). Only working days count; on a rest day the value is 0.
 */
export default function UnusedCapacityCard() {
  const t = useTranslations("mes.unusedCap");
  const locale = useLocale();
  const { snap } = useDemo();
  const now = useMemo(() => new Date(), []);

  if (!snap) return null;
  const money = (v: number) => formatCost(v, snap.settings.currency, locale, 0);

  const uc = unusedCapacityValue(snap, now);

  return (
    <Card className="border-warning/30 bg-warning-soft/25">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning-text">
            <Gauge className="size-4" />
            {t("title")}
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-warning-text">
            {money(uc.value)}
          </p>
          <p className="mt-0.5 text-xs text-ink-2">{t("subtitle")}</p>
        </div>
        <div className="text-right text-xs text-ink-2">
          <p className="text-lg font-semibold tabular-nums text-ink">
            {t("idleMachines", { n: uc.idleCount })}
          </p>
          {uc.restDay ? (
            <p className="mt-1 max-w-40 text-muted">{t("restDay")}</p>
          ) : (
            <p className="mt-1 text-muted">{t("perDay")}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
