"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Factory } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import PerformanceComparison from "@/components/mes/PerformanceComparison";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { useEntitlements } from "@/components/demo/DemoProvider";

export default function ExecutivePerformancePage() {
  const t = useTranslations("mes.performance");
  const tc = useTranslations("common");
  const ent = useEntitlements();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 md:py-10 xl:max-w-5xl">
      <header className="flex items-center gap-3">
        <Link
          href="/mes"
          className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft"
          aria-label={tc("back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Factory className="size-4.5" />
        </span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      <div className="mt-5">
        {ent.advancedAnalytics ? (
          <PerformanceComparison />
        ) : (
          <PlanUpsell feature="analytics" />
        )}
      </div>
    </div>
  );
}
