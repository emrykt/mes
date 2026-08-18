"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import { Card } from "@/components/ui";
import { PLANS, PLAN_ENTITLEMENTS, PLAN_ORDER } from "@/lib/data";
import type { PlanId } from "@/lib/types";

/**
 * Subscription-plan control for a tenant, in the admin Settings page. Lives in
 * its own DemoProvider so the server Settings page can host this one live
 * control; the company switcher chooses which tenant's plan is being set.
 */
function PlanControl() {
  const t = useTranslations("mes.settings");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");
  const { snap, dispatch } = useDemo();
  if (!snap) return null;

  return (
    <Card title={t("planTitle")} subtitle={t("planHint")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <span className="text-xs font-medium text-muted">{snap.companyName}</span>
        <CompanySwitcher />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const active = snap.settings.plan === id;
          const ent = PLAN_ENTITLEMENTS[id];
          const perks = [
            { on: ent.aiAssistant, label: t("perkAssistant") },
            { on: ent.advancedAnalytics, label: t("perkAnalytics") },
            { on: ent.sectorBenchmark, label: t("perkBenchmark") },
          ];
          return (
            <button
              key={id}
              onClick={() => dispatch({ type: "setPlan", plan: id as PlanId })}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? "border-accent bg-accent-wash" : "border-line hover:bg-neutral-soft/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{tp(id)}</span>
                {active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Check className="size-3" />
                    {t("planActive")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {PLANS[id].contact ? tc("contactPrice") : `$${PLANS[id].monthlyPrice}`}
              </p>
              <ul className="mt-3 space-y-1">
                {perks.map((p) => (
                  <li
                    key={p.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      p.on ? "text-ink-2" : "text-muted line-through"
                    }`}
                  >
                    <Check className={`size-3 ${p.on ? "text-good-text" : "text-muted"}`} />
                    {p.label}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export default function AdminPlanSelector() {
  return (
    <DemoProvider>
      <PlanControl />
    </DemoProvider>
  );
}
