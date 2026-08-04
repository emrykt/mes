"use client";

import { useTranslations } from "next-intl";
import { Lock, Sparkles } from "lucide-react";

/**
 * Shown in place of an AI-Pro feature (assistant, advanced analytics) when the
 * tenant is on the Basic plan. Doubles as an in-product upsell for the demo —
 * the plan can be switched from /admin/mes to preview the locked screen.
 */
export default function PlanUpsell({
  feature,
}: {
  feature: "assistant" | "analytics";
}) {
  const t = useTranslations("mes.upsell");
  const name = t(feature === "assistant" ? "assistantName" : "analyticsName");

  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent-wash text-accent-strong">
        <Lock className="size-6" />
      </span>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-wash px-3 py-1 text-xs font-medium text-accent-strong">
        <Sparkles className="size-3.5" /> {t("badge")}
      </p>
      <h2 className="mt-3 text-lg font-semibold">{t("title", { feature: name })}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{t("body")}</p>
      <p className="mt-4 text-xs text-muted">{t("note")}</p>
    </div>
  );
}
