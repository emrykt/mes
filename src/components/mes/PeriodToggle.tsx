"use client";

import { useTranslations } from "next-intl";

export type Period = "daily" | "weekly" | "monthly" | "yearly";

/** Approximate working-day multipliers to scale a daily figure to a period. */
export const PERIOD_FACTOR: Record<Period, number> = {
  daily: 1,
  weekly: 5,
  monthly: 22,
  yearly: 260,
};

const ORDER: Period[] = ["daily", "weekly", "monthly", "yearly"];

/** Compact Daily / Weekly / Monthly / Yearly selector for money cards. */
export default function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useTranslations("mes.period");
  return (
    <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-[11px] font-medium">
      {ORDER.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-md px-2 py-1 transition-colors ${
            value === p ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t(p)}
        </button>
      ))}
    </div>
  );
}
