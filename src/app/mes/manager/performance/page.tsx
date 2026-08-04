"use client";

import { useTranslations } from "next-intl";
import PerformanceComparison from "@/components/mes/PerformanceComparison";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { useEntitlements } from "@/components/demo/DemoProvider";

export default function ManagerPerformancePage() {
  const t = useTranslations("mes.performance");
  const ent = useEntitlements();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>
      {ent.advancedAnalytics ? (
        <PerformanceComparison />
      ) : (
        <PlanUpsell feature="analytics" />
      )}
    </div>
  );
}
