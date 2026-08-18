"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { DEMO_DATES, usePortalState } from "@/components/portal/PortalState";
import PortalRetention from "@/components/portal/PortalRetention";
import { PLANS, PLAN_ENTITLEMENTS, PLAN_ORDER } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default function PortalSubscriptionPage() {
  return (
    <DemoProvider>
      <SubscriptionBody />
    </DemoProvider>
  );
}

function SubscriptionBody() {
  const t = useTranslations("portalSubscription");
  const tc = useTranslations("common");
  const tp = useTranslations("plans");
  const { status } = usePortalState();
  const { snap } = useDemo();

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  // Live pricing is the single source of truth: admin-edited plan prices +
  // the selected retention add-on both flow into the subscription total here.
  const plan = snap.settings.plan;
  const planContact = PLANS[plan].contact;
  const basePrice = snap.pricing.plans[plan];
  const addonMonthly = snap.retention.addonMonthlyPrice;
  const totalMonthly = basePrice + addonMonthly;
  const used = snap.stations.length;

  const dateLine =
    status === "TRIALING"
      ? t("trialEndsOn", { date: formatDate(DEMO_DATES.trialEndsAt) })
      : status === "CANCELED"
        ? t("endsOn", { date: formatDate(DEMO_DATES.periodEndsAt) })
        : t("renewsOn", { date: formatDate(DEMO_DATES.renewsAt) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium text-muted">{t("currentPlan")}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-semibold">{tp(plan)}</span>
            <StatusBadge status={status} />
          </div>
          {planContact ? (
            <p className="mt-1 text-sm text-ink-2">
              {t("contactPrice")} · {dateLine}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-2">
                <span className="font-semibold text-ink">{formatMoney(totalMonthly)}</span>
                {tc("perMonth")} · {dateLine}
              </p>
              {addonMonthly > 0 && (
                <p className="mt-0.5 text-xs text-muted">
                  {t("currentPlanPriceNote", {
                    base: formatMoney(basePrice),
                    addon: t("addonPerMo", { price: addonMonthly }),
                  })}
                </p>
              )}
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted">{t("stationUsage")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {t("stationsUnlimited", { used })}
          </p>
          <p className="mt-1 text-xs text-good-text">{t("noLimit")}</p>
        </Card>
      </div>

      <PortalRetention />

      <Card title={t("planChangeTitle")} subtitle={t("planChangeNote")}>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const isCurrent = id === plan;
            const ent = PLAN_ENTITLEMENTS[id];
            const highlights = [
              ent.aiAssistant ? t("hlAssistant") : t("hlMesCore"),
              ent.sectorBenchmark ? t("hlBenchmark") : null,
              ent.multiPlant ? t("hlMultiplant") : null,
            ].filter(Boolean) as string[];
            return (
              <div
                key={id}
                className={`rounded-xl border p-4 ${
                  isCurrent ? "border-accent bg-accent-soft/40" : "border-line"
                }`}
              >
                <p className="text-sm font-semibold">{tp(id)}</p>
                <p className="mt-1 text-lg font-semibold">
                  {p.contact ? (
                    t("contactPrice")
                  ) : (
                    <>
                      {formatMoney(snap.pricing.plans[id])}
                      <span className="text-xs font-normal text-muted">
                        {tc("perMonth")}
                      </span>
                    </>
                  )}
                </p>
                <ul className="mt-2 space-y-1">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-1.5 text-xs text-ink-2">
                      <Check className="mt-0.5 size-3 shrink-0 text-good" />
                      {h}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong">
                    <Check className="size-4" />
                    {t("currentBadge")}
                  </p>
                ) : (
                  <button className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong">
                    {p.contact ? t("contactCta") : t("switchTo", { plan: tp(id) })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title={t("cancelTitle")}>
        <p className="text-sm text-ink-2">
          {t("cancelBody", { date: formatDate(DEMO_DATES.periodEndsAt) })}
        </p>
        <button className="mt-4 rounded-lg border border-critical/40 px-4 py-2 text-sm font-medium text-critical-text hover:bg-critical-soft">
          {t("cancelCta")}
        </button>
      </Card>
    </div>
  );
}
