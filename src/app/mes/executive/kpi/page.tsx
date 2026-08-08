"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Factory, Loader2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import KpiScorecard, { KpiSummaryStrip } from "@/components/mes/KpiScorecard";
import KpiTargetsSettings from "@/components/mes/KpiTargetsSettings";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

export default function ExecutiveKpiPage() {
  const t = useTranslations("mes.executive");
  const tk = useTranslations("mes.kpi");
  const tc = useTranslations("common");
  const { snap } = useDemo();
  const ent = useEntitlements();

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

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
          <p className="text-xs text-muted">{snap.companyName} · {t("kpiSubtitle")}</p>
        </div>
        <CompanySwitcher />
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      {ent.advancedAnalytics ? (
        <div className="mt-5 space-y-5">
          {/* wholesale (toptan): all sections in one scorecard */}
          <Card
            title={tk("scorecardTitle")}
            subtitle={tk("scorecardHint")}
          >
            <div className="mb-4">
              <KpiSummaryStrip withMoney />
            </div>
            <KpiScorecard withMoney />
          </Card>

          {/* editable targets */}
          <KpiTargetsSettings />
        </div>
      ) : (
        <div className="mt-5">
          <PlanUpsell feature="analytics" />
        </div>
      )}
    </div>
  );
}
