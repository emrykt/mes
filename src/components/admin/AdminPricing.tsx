"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { PLAN_ORDER, PLAN_RETENTION_MONTHS } from "@/lib/data";
import type { PlanId } from "@/lib/types";

function PricingEditor() {
  const tp = useTranslations("plans");
  const { snap, dispatch } = useDemo();
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});
  const [addonDraft, setAddonDraft] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  if (!snap) return null;

  const pricing = snap.pricing;
  const planVal = (id: PlanId) => planDraft[id] ?? String(pricing.plans[id]);
  const addonVal = (i: number) => addonDraft[i] ?? String(pricing.addonTiers[i].price);

  const save = async () => {
    const plans = { ...pricing.plans };
    for (const id of PLAN_ORDER) {
      const n = Number(planVal(id));
      if (!Number.isNaN(n)) plans[id] = n;
    }
    const addonTiers = pricing.addonTiers.map((a, i) => {
      const n = Number(addonVal(i));
      return { years: a.years, price: Number.isNaN(n) ? a.price : n };
    });
    await dispatch({ type: "savePricing", pricing: { plans, addonTiers } });
    setPlanDraft({});
    setAddonDraft({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-6">
      <Card title="Plan pricing" subtitle="Base monthly price per plan (USD) + included data-retention window.">
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <div key={id} className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">{tp(id)}</p>
              <p className="mt-0.5 text-xs text-muted">
                Retention: {PLAN_RETENTION_MONTHS[id]} months
              </p>
              <label className="mt-3 flex items-center gap-1.5">
                <span className="text-sm text-muted">$</span>
                <input
                  type="number"
                  value={planVal(id)}
                  onChange={(e) => setPlanDraft((p) => ({ ...p, [id]: e.target.value }))}
                  className="w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:outline-none"
                />
                <span className="text-xs text-muted">/mo</span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Data-retention add-ons"
        subtitle="Recurring monthly surcharge (USD) a customer pays on top of their plan to extend total data retention. Add-on sets the total window."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {pricing.addonTiers.map((tier, i) => (
            <div key={tier.years} className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">
                {tier.years} {tier.years === 1 ? "year" : "years"} total
              </p>
              <p className="mt-0.5 text-xs text-muted">{tier.years * 12} months of retention</p>
              <label className="mt-3 flex items-center gap-1.5">
                <span className="text-sm text-muted">$</span>
                <input
                  type="number"
                  value={addonVal(i)}
                  onChange={(e) => setAddonDraft((p) => ({ ...p, [i]: e.target.value }))}
                  className="w-20 rounded-lg border border-line bg-page px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:outline-none"
                />
                <span className="text-xs text-muted">/mo</span>
              </label>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Save pricing
          </button>
          {saved && <span className="text-sm text-good-text">Saved</span>}
        </div>
      </Card>
    </div>
  );
}

export default function AdminPricing() {
  return (
    <DemoProvider>
      <PricingEditor />
    </DemoProvider>
  );
}
