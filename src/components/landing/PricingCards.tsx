"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { formatMoney } from "@/lib/format";

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  contact: boolean;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular: boolean;
  cta: string;
  href: string;
}

interface Labels {
  monthly: string;
  annual: string;
  annualBadge: string;
  perMonth: string;
  billedMonthly: string;
  billedAnnually: string;
  contactPrice: string;
  mostPopular: string;
}

/** Landing pricing grid with a monthly/annual billing toggle (defaults to annual). */
export default function PricingCards({ plans, labels }: { plans: PricingPlan[]; labels: Labels }) {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <Reveal className="mt-8 flex flex-col items-center gap-2">
        <div className="inline-flex items-center rounded-full border border-line bg-page p-1 text-sm font-medium shadow-sm">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              annual ? "text-ink-2 hover:text-ink" : "bg-accent text-white"
            }`}
          >
            {labels.monthly}
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors ${
              annual ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {labels.annual}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                annual ? "bg-white/20 text-white" : "bg-good/15 text-good"
              }`}
            >
              {labels.annualBadge}
            </span>
          </button>
        </div>
      </Reveal>

      <div className="mt-10 grid items-start gap-5 md:grid-cols-3">
        {plans.map((plan, i) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <Reveal
              key={plan.id}
              delay={i * 80}
              className={`relative rounded-2xl border bg-page p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular ? "border-accent shadow-lg ring-1 ring-accent" : "border-line"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-white">
                  {labels.mostPopular}
                </span>
              )}
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>
              <div className="mt-3 min-h-[3.75rem]">
                {plan.contact ? (
                  <span className="text-2xl font-semibold tracking-tight">{labels.contactPrice}</span>
                ) : (
                  <>
                    <p className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight">{formatMoney(price)}</span>
                      <span className="text-sm text-muted">{labels.perMonth}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {annual ? labels.billedAnnually : labels.billedMonthly}
                    </p>
                  </>
                )}
              </div>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f, k) => {
                  const heading = f.endsWith(":");
                  return (
                    <li
                      key={k}
                      className={heading ? "pt-1 text-xs font-semibold text-ink" : "flex items-start gap-2 text-sm text-ink-2"}
                    >
                      {!heading && <Check className="mt-0.5 size-4 shrink-0 text-good" />}
                      {f}
                    </li>
                  );
                })}
              </ul>
              <Link
                href={plan.href}
                className={`btn-sheen mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                  plan.popular ? "bg-accent text-white hover:bg-accent-strong" : "border border-line text-ink hover:bg-neutral-soft"
                }`}
              >
                {plan.cta}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
