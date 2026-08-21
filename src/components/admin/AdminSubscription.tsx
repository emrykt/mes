"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { subscriptionPrice, daysUntil } from "@/lib/subscription";
import type { SubStatus } from "@/lib/demo-types";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STATUS: Record<SubStatus, { label: string; cls: string }> = {
  trialing: { label: "Free trial", cls: "bg-accent-soft text-accent-strong" },
  active: { label: "Active", cls: "bg-good/15 text-good-text" },
  canceled: { label: "Cancels at period end", cls: "bg-warning-soft text-warning-text" },
  expired: { label: "Expired", cls: "bg-critical-soft text-critical-text" },
};

/** Per-tenant subscription lifecycle, visible & controllable by platform staff. */
export default function AdminSubscription() {
  const { snap, dispatch } = useDemo();
  const now = useMemo(() => new Date(), []);
  if (!snap) return null;

  const sub = snap.settings.subscription;
  if (!sub) return null;
  const plan = snap.settings.plan;
  const st = STATUS[sub.status];
  const amount = subscriptionPrice(sub, plan, snap.pricing);
  const endDays = daysUntil(sub.currentPeriodEnd, now);
  const renewLabel = sub.status === "trialing" ? "Trial ends" : sub.cancelAtPeriodEnd ? "Access until" : "Renews";

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <Card
      title="Subscription"
      subtitle={`${snap.companyName} — billing lifecycle for this tenant (demo, no real Stripe).`}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
          <div className="mt-3 divide-y divide-line/60">
            {row("Plan", plan === "AIULTIMATE" ? "Flexible" : plan === "AIPRO" ? "AI Pro" : "Basic")}
            {row("Billing", sub.period === "annual" ? "Annual (12-month commitment, billed monthly)" : "Monthly")}
            {row("Monthly charge", `€${amount.toLocaleString("en-GB")}/mo`)}
            {row("Started", fmtDate(sub.startedAt))}
            {row(renewLabel, `${fmtDate(sub.currentPeriodEnd)} (${endDays >= 0 ? `in ${endDays}d` : `${-endDays}d ago`})`)}
            {sub.canceledAt && row("Cancellation requested", fmtDate(sub.canceledAt))}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-xs font-semibold text-ink">Referral</p>
            <div className="mt-1.5 divide-y divide-line/60">
              {row("Code", <code className="tracking-wider">{sub.referralCode}</code>)}
              {row("Paying referrals", sub.referralCount)}
              {row("Free months earned", sub.bonusMonthsEarned)}
              {sub.referredByCode && row("Referred by", <code>{sub.referredByCode}</code>)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => dispatch({ type: "setBillingPeriod", period: sub.period === "annual" ? "monthly" : "annual" })}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-neutral-soft"
            >
              Switch to {sub.period === "annual" ? "monthly" : "annual"}
            </button>
            {sub.cancelAtPeriodEnd ? (
              <button
                onClick={() => dispatch({ type: "resumeSubscription" })}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong"
              >
                Resume subscription
              </button>
            ) : (
              sub.status !== "expired" && (
                <button
                  onClick={() => dispatch({ type: "cancelSubscription" })}
                  className="rounded-lg border border-critical/40 px-3 py-1.5 text-sm text-critical-text hover:bg-critical-soft/40"
                >
                  Cancel subscription
                </button>
              )
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            {sub.period === "annual"
              ? "Annual: a 12-month commitment paid monthly; it renews after 12 months."
              : "Monthly: billed each month; cancelling stops the renewal on the next payment day."}
          </p>
        </div>
      </div>
    </Card>
  );
}
