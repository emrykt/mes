"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Database, Check } from "lucide-react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

function RetentionCard() {
  const t = useTranslations("portalSubscription");
  const { snap, dispatch } = useDemo();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  if (!snap) return null;

  const { planMonths, addonMonths, totalMonths } = snap.retention;

  const buy = async (years: number, price: number) => {
    if (!window.confirm(t("buyConfirm", { years, price }))) return;
    setBusy(years);
    await dispatch({ type: "buyRetentionAddon", months: years * 12 });
    setBusy(null);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <Card title={t("retentionTitle")} subtitle={t("retentionSubtitle")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {totalMonths} <span className="text-base font-normal text-ink-2">{t("monthsUnit")}</span>
          </p>
          <p className="text-xs text-muted">
            {t("retentionBreakdown", { plan: planMonths, addon: addonMonths })}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">{t("extendTitle")}</p>
        <p className="text-xs text-muted">{t("extendHint")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {snap.pricing.addonTiers.map((tier) => (
            <button
              key={tier.years}
              onClick={() => buy(tier.years, tier.price)}
              disabled={busy !== null}
              className="rounded-xl border border-line p-3 text-left transition hover:border-accent hover:bg-accent-soft disabled:opacity-60"
            >
              <p className="text-sm font-semibold">
                +{tier.years} {tier.years === 1 ? "yr" : "yrs"}
              </p>
              <p className="text-xs text-muted">${tier.price}</p>
            </button>
          ))}
        </div>
        {done && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-good-text">
            <Check className="h-4 w-4" /> {t("purchased")}
          </p>
        )}
      </div>
    </Card>
  );
}

export default function PortalRetention() {
  return (
    <DemoProvider>
      <RetentionCard />
    </DemoProvider>
  );
}
