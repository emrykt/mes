"use client";

import { useTranslations } from "next-intl";
import { Sparkles, TrendingUp } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import {
  bandOf,
  plantScore,
  weakestFactors,
  type ScoreBand,
  type ScoreFactorKey,
} from "@/lib/score";

const BAND_COLOR: Record<ScoreBand, string> = {
  excellent: "#16a34a",
  good: "#2f74d0",
  fair: "#e8930c",
  weak: "#dc3b3b",
};

const FACTOR_KEYS: ScoreFactorKey[] = [
  "productivity",
  "delivery",
  "quality",
  "utilization",
  "operator",
  "breakdown",
  "capacity",
  "adherence",
  "maintenance",
];

/**
 * The plant's live 0–1000 performance score — a prominent arc gauge with a
 * factor breakdown and AI improvement tips. Designed to be the eye-catching
 * hero of the executive screen.
 */
export default function PerformanceScore() {
  const t = useTranslations("mes.score");
  const { snap } = useDemo();
  if (!snap) return null;

  const score = plantScore(snap, new Date(snap.now));
  const color = BAND_COLOR[score.band];
  const weak = weakestFactors(score, 3);

  return (
    <div
      className="overflow-hidden rounded-3xl border border-line p-6 shadow-[0_1px_2px_rgba(11,11,11,0.05)]"
      style={{
        background: `radial-gradient(120% 120% at 50% -10%, ${color}1f 0%, transparent 55%), var(--color-surface)`,
      }}
    >
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
        {/* gauge — number is an HTML overlay (no SVG-text rendering quirks) */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="relative w-56">
            <svg viewBox="0 0 280 156" className="w-full">
              <path
                d="M 26 144 A 118 118 0 0 1 254 144"
                fill="none"
                stroke="var(--color-neutral-soft)"
                strokeWidth={18}
                strokeLinecap="round"
              />
              <path
                d="M 26 144 A 118 118 0 0 1 254 144"
                fill="none"
                stroke={color}
                strokeWidth={18}
                strokeLinecap="round"
                pathLength={1000}
                strokeDasharray={`${score.total} 1000`}
                style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s ease" }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
              <span
                className="text-5xl font-semibold leading-none tabular-nums"
                style={{ color }}
              >
                {score.total}
              </span>
              <span className="mt-1 text-xs text-muted">{t("outOf")}</span>
            </div>
          </div>
          <span
            className="mt-2 rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {t(`band.${score.band}`)}
          </span>
        </div>

        {/* title + factor breakdown */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-accent" />
            <h2 className="text-sm font-semibold">{t("title")}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted">{t("subtitle")}</p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {FACTOR_KEYS.map((key) => {
              const f = score.factors.find((x) => x.key === key)!;
              const fc = BAND_COLOR[bandOf(f.value * 1000)];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-ink-2">{t(`factor.${key}`)}</span>
                  <div className="h-2 grow overflow-hidden rounded-full bg-neutral-soft">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${f.value * 100}%`, backgroundColor: fc }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-ink-2">
                    {f.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI improvement tips — how to raise the score */}
      <div className="mt-5 rounded-2xl border border-line bg-page/60 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
          <Sparkles className="size-3.5" />
          {t("improveTitle")}
        </p>
        <ul className="mt-2 space-y-1.5">
          {weak.map((f) => (
            <li key={f.key} className="flex gap-2 text-sm text-ink-2">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: BAND_COLOR[bandOf(f.value * 1000)] }}
              />
              <span>
                <span className="font-medium text-ink">{t(`factor.${f.key}`)}</span>{" "}
                <span className="text-xs text-muted">({f.points}/{f.weight})</span> —{" "}
                {t(`tip.${f.key}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
