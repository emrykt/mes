import { useTranslations } from "next-intl";
import type { LicenseStatus } from "@/lib/types";

const ORDER: LicenseStatus[] = [
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
];

const COLORS: Record<LicenseStatus, string> = {
  ACTIVE: "var(--color-good)",
  TRIALING: "var(--color-accent)",
  PAST_DUE: "var(--color-warning)",
  SUSPENDED: "var(--color-critical)",
  CANCELED: "var(--color-muted)",
};

export default function StatusDistribution({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const t = useTranslations("status");
  const total = ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);

  return (
    <div>
      {/* 2px surface gaps separate touching segments */}
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {ORDER.filter((k) => (counts[k] ?? 0) > 0).map((k) => (
          <div
            key={k}
            title={`${t(k)}: ${counts[k]}`}
            style={{
              width: `${((counts[k] ?? 0) / total) * 100}%`,
              backgroundColor: COLORS[k],
            }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: COLORS[k] }}
            />
            <span className="text-ink-2">{t(k)}</span>
            <span
              className="ml-auto font-medium text-ink"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {counts[k] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
