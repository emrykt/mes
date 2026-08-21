"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Gift } from "lucide-react";
import { Card } from "@/components/ui";
import { useDemo } from "@/components/demo/DemoProvider";
import { formatDate } from "@/lib/format";
import { subscriptionPrice, daysUntil } from "@/lib/subscription";
import type { SubStatus } from "@/lib/demo-types";

const statusCls: Record<SubStatus, string> = {
  trialing: "bg-accent-soft text-accent-strong",
  active: "bg-good/15 text-good-text",
  canceled: "bg-warning-soft text-warning-text",
  expired: "bg-critical-soft text-critical-text",
};

/** Customer-facing subscription: status, renewal, cancel/resume, referral code. */
export default function PortalSubscription() {
  const t = useTranslations("portalBilling");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();
  const now = useMemo(() => new Date(), []);
  const [copied, setCopied] = useState(false);

  if (!snap?.settings.subscription) return null;
  const sub = snap.settings.subscription;
  const plan = snap.settings.plan;
  const amount = subscriptionPrice(sub, plan, snap.pricing);
  const endDays = daysUntil(sub.currentPeriodEnd, now);

  const statusLabel: Record<SubStatus, string> = {
    trialing: t("statusTrialing"),
    active: t("statusActive"),
    canceled: t("statusCanceled"),
    expired: t("statusExpired"),
  };
  const dateLabel = sub.status === "trialing" ? t("trialEnds") : sub.cancelAtPeriodEnd ? t("accessUntil") : t("renews");

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between py-2">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card title={t("subStatusTitle")}>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls[sub.status]}`}>
          {statusLabel[sub.status]}
        </span>
        <dl className="mt-3 divide-y divide-line/70 text-sm">
          {row(t("periodLabel"), sub.period === "annual" ? t("periodAnnual") : t("periodMonthly"))}
          {row(t("amountPerCycle"), `€${amount.toLocaleString(locale)}${t("perMonthShort")}`)}
          {row(dateLabel, `${formatDate(sub.currentPeriodEnd, locale)}${endDays >= 0 ? ` (${endDays}d)` : ""}`)}
        </dl>

        {sub.canceledAt && (
          <p className="mt-2 text-xs text-warning-text">{t("canceledOn", { date: formatDate(sub.canceledAt, locale) })}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {sub.status !== "expired" && (
            <button
              onClick={() => dispatch({ type: "setBillingPeriod", period: sub.period === "annual" ? "monthly" : "annual" })}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft"
            >
              {sub.period === "annual" ? t("switchToMonthly") : t("switchToAnnual")}
            </button>
          )}
          {sub.cancelAtPeriodEnd ? (
            <button
              onClick={() => dispatch({ type: "resumeSubscription" })}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong"
            >
              {t("resumeBtn")}
            </button>
          ) : (
            sub.status !== "expired" && (
              <button
                onClick={() => dispatch({ type: "cancelSubscription" })}
                className="rounded-lg border border-critical/40 px-3.5 py-2 text-sm font-medium text-critical-text hover:bg-critical-soft/40"
              >
                {t("cancelBtn")}
              </button>
            )
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {sub.period === "annual" ? t("cancelNoteAnnual") : t("cancelNoteMonthly")}
        </p>
      </Card>

      <Card>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Gift className="size-4 text-accent" />
          {t("referralTitle")}
        </p>
        <p className="mt-1 text-sm text-ink-2">{t("referralSub")}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted">{t("referralCodeLabel")}</p>
            <code className="text-base font-semibold tracking-wider">{sub.referralCode}</code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(sub.referralCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-neutral-soft"
          >
            {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t("referralEarned", { count: sub.referralCount, months: sub.bonusMonthsEarned })}
        </p>
      </Card>
    </div>
  );
}
