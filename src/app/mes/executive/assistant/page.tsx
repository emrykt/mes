"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Factory } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import ExecutiveTabs from "@/components/mes/ExecutiveTabs";
import PlantAssistant from "@/components/mes/PlantAssistant";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { useEntitlements } from "@/components/demo/DemoProvider";

export default function ExecutiveAssistantPage() {
  const t = useTranslations("mes.assistant");
  const tc = useTranslations("common");
  const ent = useEntitlements();

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
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
        <CompanySwitcher />
        <LanguageSwitcher />
      </header>

      <ExecutiveTabs />

      <div className="mt-5">
        {ent.aiAssistant ? <PlantAssistant /> : <PlanUpsell feature="assistant" />}
      </div>
    </div>
  );
}
