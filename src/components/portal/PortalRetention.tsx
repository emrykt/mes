"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Database, Check } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

/**
 * Data-retention add-on selector. Reads/writes the live demo store via the
 * DemoProvider that MUST wrap it (the portal page provides one). The add-on is
 * a single selected tier (not cumulative) that sets the TOTAL retention window
 * and adds a recurring monthly fee — reflected in the subscription price above.
 */
export default function PortalRetention() {
  const t = useTranslations("portalSubscription");
  const { snap, dispatch } = useDemo();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  if (!snap) return null;

  const { planMonths, addonYears, totalMonths, addonMonthlyPrice } = snap.retention;

  const select = async (years: number) => {
    if (years === addonYears) return;
    setBusy(years);
    await dispatch({ type: "setRetentionAddon", years });
    setBusy(null);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  const tiers = [{ years: 0, price: 0 }, ...snap.pricing.addonTiers];

  return (
    <Card title={t("retentionTitle")} subtitle={t("retentionSubtitle")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted">{t("retentionCurrentLabel")}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {totalMonths} <span className="text-base font-normal text-ink-2">{t("monthsUnit")}</span>
          </p>
          <p className="text-xs text-muted">{t("planIncludesNote", { months: planMonths })}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">{t("extendTitle")}</p>
        <p className="text-xs text-muted">{t("extendHint")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {tiers.map((tier) => {
            const active = tier.years === addonYears;
            return (
              <button
                key={tier.years}
                onClick={() => select(tier.years)}
                disabled={busy !== null}
                aria-pressed={active}
                className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent"
                    : "border-line hover:border-accent hover:bg-accent-soft/50"
                }`}
              >
                <p className="text-sm font-semibold">
                  {tier.years === 0 ? t("noAddon") : `${tier.years * 12} ${t("monthsUnit")}`}
                </p>
                <p className="text-xs text-muted">
                  {tier.years === 0 ? "—" : t("addonPerMo", { price: tier.price })}
                </p>
                {active && (
                  <Check className="mt-1 h-4 w-4 text-accent-strong" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
        {addonMonthlyPrice > 0 && (
          <p className="mt-3 text-xs text-ink-2">
            {t("billAddNote", { addon: t("addonPerMo", { price: addonMonthlyPrice }) })}
          </p>
        )}
        {done && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-good-text">
            <Check className="h-4 w-4" /> {t("retentionUpdated")}
          </p>
        )}
      </div>
    </Card>
  );
}
