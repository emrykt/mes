"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { PLAN_ORDER } from "@/lib/data";
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
      <Card title="Plan pricing" subtitle="Base monthly membership price per plan (EUR). Unlimited data history is included free on every plan.">
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <div key={id} className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">{tp(id)}</p>
              <p className="mt-0.5 text-xs text-muted">Unlimited history included</p>
              <label className="mt-3 flex items-center gap-1.5">
                <span className="text-sm text-muted">€</span>
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
