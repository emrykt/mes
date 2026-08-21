"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { unusedCapacityValue } from "@/lib/revenue";
import PeriodToggle, { PERIOD_FACTOR, type Period } from "@/components/mes/PeriodToggle";

/**
 * "Unused capacity value" — the billable value of every machine sitting idle
 * right now (idle machines × hourly rate × working hours), shown for the chosen
 * period (daily default, scaled to weekly / monthly / yearly). Rest days = 0.
 */
export default function UnusedCapacityCard() {
  const t = useTranslations("mes.unusedCap");
  const locale = useLocale();
  const { snap } = useDemo();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>("daily");

  if (!snap) return null;
  const money = (v: number) => formatCost(v, snap.settings.currency, locale, 0);

  const uc = unusedCapacityValue(snap, now);
  const value = uc.value * PERIOD_FACTOR[period];

  return (
    <Card className="border-accent/25 bg-accent-soft/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent-strong">
          <Gauge className="size-4" />
          {t("title")}
        </p>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums text-accent-strong">{money(value)}</p>
          <p className="mt-0.5 text-xs text-ink-2">{t("subtitle")}</p>
        </div>
        <div className="text-right text-xs text-ink-2">
          <p className="text-lg font-semibold tabular-nums text-ink">
            {t("idleMachines", { n: uc.idleCount })}
          </p>
          {uc.restDay && <p className="mt-1 max-w-40 text-muted">{t("restDay")}</p>}
        </div>
      </div>
    </Card>
  );
}
