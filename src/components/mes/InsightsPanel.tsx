"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Scale,
  Sparkles,
  TimerOff,
} from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { plantInsights, type InsightKind, type Severity } from "@/lib/insights";

interface LlmItem {
  text: string;
  recommendation: string;
}

/**
 * Shared, throttled cache for the LLM insights call. Every InsightsPanel on the
 * page (overview + executive + alerts) and every navigation reuses one result
 * per company/locale for TTL_MS, so we make at most one /api/insights request
 * per window instead of one per panel per interval. Keeps AI spend predictable.
 */
const INSIGHTS_TTL_MS = 10 * 60 * 1000;
type InsightsEntry = { at: number; items: LlmItem[] | null; inflight?: Promise<LlmItem[] | null> };
const insightsCache = new Map<string, InsightsEntry>();

function getInsights(locale: string, company: string): Promise<LlmItem[] | null> {
  const key = `${company}:${locale}`;
  const now = Date.now();
  const e = insightsCache.get(key);
  if (e?.inflight) return e.inflight;
  if (e && now - e.at < INSIGHTS_TTL_MS) return Promise.resolve(e.items);

  const p = fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, company }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d): LlmItem[] | null =>
      d?.mode === "llm" && Array.isArray(d.items) ? d.items : (e?.items ?? null),
    )
    .catch(() => e?.items ?? null)
    .then((items) => {
      insightsCache.set(key, { at: Date.now(), items });
      return items;
    });

  insightsCache.set(key, { at: e?.at ?? 0, items: e?.items ?? null, inflight: p });
  return p;
}

const ICON: Record<InsightKind, typeof Gauge> = {
  bottleneck: Gauge,
  downtimeReason: TimerOff,
  scrapStation: AlertTriangle,
  lateOrders: Clock,
  imbalance: Scale,
  allClear: CheckCircle2,
};

const SEV: Record<Severity, string> = {
  critical: "bg-critical-soft text-critical-text",
  warning: "bg-warning-soft text-warning-text",
  info: "bg-accent-wash text-accent-strong",
};

/**
 * Continuously-computed smart suggestions from the live plant. Each row is a
 * plain-language reading plus a recommended action — the shop-floor "feel" of
 * the AI without any prompt. Shared by manager overview, executive and alerts.
 */
export default function InsightsPanel({ limit }: { limit?: number }) {
  const t = useTranslations("mes.insights");
  const locale = useLocale();
  const { snap, company } = useDemo();
  const [llm, setLlm] = useState<LlmItem[] | null>(null);

  // Try the real LLM analyst; if no key/error the route 503s and we keep the
  // deterministic heuristics below. Refreshes on a light interval.
  useEffect(() => {
    let alive = true;
    const run = () =>
      getInsights(locale, company).then((items) => {
        if (alive && items) setLlm(items);
      });
    run(); // fetch once when the panel opens (served from shared cache if fresh)
    // re-check on the TTL cadence, but only while the tab is visible — no point
    // spending on suggestions nobody is looking at. The shared cache dedupes.
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") run();
    }, INSIGHTS_TTL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [locale, company]);

  if (!snap) return null;

  const all = plantInsights(snap, new Date(snap.now));
  const items = limit ? all.slice(0, limit) : all;

  return (
    <Card
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        llm ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-wash px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
            <Sparkles className="size-3" />
            {t("aiBadge")}
          </span>
        ) : undefined
      }
    >
      <ul className="space-y-3">
        {llm
          ? llm.map((it, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-line p-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-wash text-accent-strong">
                  <Sparkles className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">{it.text}</p>
                  <p className="mt-1 text-xs text-ink-2">
                    <span className="font-medium text-accent-strong">{t("recommend")}:</span>{" "}
                    {it.recommendation}
                  </p>
                </div>
              </li>
            ))
          : items.map((it, i) => {
              const Icon = ICON[it.kind];
              return (
                <li key={i} className="flex gap-3 rounded-xl border border-line p-3.5">
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${SEV[it.severity]}`}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      {it.kind === "allClear"
                        ? t("allClear")
                        : t(`msg.${it.kind}`, it.params)}
                    </p>
                    {it.kind !== "allClear" && (
                      <p className="mt-1 text-xs text-ink-2">
                        <span className="font-medium text-accent-strong">{t("recommend")}:</span>{" "}
                        {t(`rec.${it.kind}`, it.params)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
      </ul>
    </Card>
  );
}
