"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { PLAN_ORDER, DEFAULT_PRICING } from "@/lib/data";
import type { PlanId } from "@/lib/types";

function PricingEditor() {
  const tp = useTranslations("plans");
  const { snap, dispatch } = useDemo();
  const [monthlyDraft, setMonthlyDraft] = useState<Record<string, string>>({});
  const [annualDraft, setAnnualDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  if (!snap) return null;

  const pricing = snap.pricing;
  const annualMap = pricing.plansAnnual ?? DEFAULT_PRICING.plansAnnual ?? pricing.plans;
  const monthlyVal = (id: PlanId) => monthlyDraft[id] ?? String(pricing.plans[id]);
  const annualVal = (id: PlanId) => annualDraft[id] ?? String(annualMap[id]);

  const save = async () => {
    const plans = { ...pricing.plans };
    const plansAnnual = { ...(pricing.plansAnnual ?? annualMap) } as Record<PlanId, number>;
    for (const id of PLAN_ORDER) {
      const m = Number(monthlyVal(id));
      if (!Number.isNaN(m)) plans[id] = m;
      const a = Number(annualVal(id));
      if (!Number.isNaN(a)) plansAnnual[id] = a;
    }
    await dispatch({ type: "savePricing", pricing: { plans, plansAnnual, addonTiers: pricing.addonTiers } });
    setMonthlyDraft({});
    setAnnualDraft({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Plan pricing"
        subtitle="Monthly and annual membership price per plan (EUR). Unlimited data history is included free on every plan; the landing page shows the annual price."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <div key={id} className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">{tp(id)}</p>
              <p className="mt-0.5 text-xs text-muted">Unlimited history included</p>
              <label className="mt-3 block">
                <span className="text-xs text-muted">Monthly billing</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm text-muted">€</span>
                  <input
                    type="number"
                    value={monthlyVal(id)}
                    onChange={(e) => setMonthlyDraft((p) => ({ ...p, [id]: e.target.value }))}
                    className="w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-muted">/mo</span>
                </span>
              </label>
              <label className="mt-3 block">
                <span className="text-xs text-muted">Annual billing</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm text-muted">€</span>
                  <input
                    type="number"
                    value={annualVal(id)}
                    onChange={(e) => setAnnualDraft((p) => ({ ...p, [id]: e.target.value }))}
                    className="w-24 rounded-lg border border-line bg-page px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-muted">/mo</span>
                </span>
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

      <Card
        title="Billing lifecycle"
        subtitle="How cancellation and renewal behave for each billing period."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold">Monthly</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              <li>• Billed every month at the monthly rate.</li>
              <li>• Cancel anytime → ends on the next payment day (no renewal).</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold">Annual (12-month commitment)</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              <li>• Discounted rate, billed monthly — no yearly upfront charge.</li>
              <li>• 12-month commitment; renews after 12 months.</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-line bg-neutral-soft p-4">
          <p className="text-sm font-semibold">Referral</p>
          <p className="mt-1.5 text-sm text-ink-2">
            A referred member starts with a 30-day free trial. The referring account owner earns 2 free
            months — either added to the end of their membership or 2 months not charged.
          </p>
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
