"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { stockForecasts } from "@/lib/stock-forecast";

/** AI stock alerts — forecasts depletion from consumption history. */
export default function StockAiAlerts() {
  const t = useTranslations("mes.stock");
  const { snap } = useDemo();
  const now = useMemo(() => new Date(), []);

  const forecasts = useMemo(
    () => (snap ? stockForecasts(snap.stock, snap.stockMoves, now) : []),
    [snap, now],
  );
  if (!snap) return null;

  const unit = (u: string) => (u === "piece" ? t("unitPiece") : t("unitKg"));

  return (
    <Card
      title={t("aiAlertsTitle")}
      subtitle={t("aiAlertsHint")}
      action={<Sparkles className="size-4 text-accent" />}
    >
      {forecasts.length === 0 ? (
        <p className="text-sm text-good-text">{t("aiAlertsNone")}</p>
      ) : (
        <ul className="space-y-2">
          {forecasts.map((f) => {
            const crit = f.severity === "critical";
            const days = Number.isFinite(f.daysLeft) ? Math.max(0, Math.round(f.daysLeft)) : null;
            const msg =
              f.reason === "belowSafety"
                ? t("aiBelowSafety", { name: f.item.materialType })
                : f.reason === "belowReorder"
                  ? t("aiBelowReorder", { name: f.item.materialType })
                  : days !== null
                    ? t("aiRunsOut", { name: f.item.materialType, days })
                    : t("aiWatch", { name: f.item.materialType });
            return (
              <li
                key={f.item.id}
                className={`flex items-start gap-2.5 rounded-lg border p-3 ${
                  crit ? "border-critical/30 bg-critical-soft/40" : "border-warning/30 bg-warning-soft/40"
                }`}
              >
                <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${crit ? "text-critical-text" : "text-warning-text"}`} />
                <div className="text-sm">
                  <p className={crit ? "font-medium text-critical-text" : "font-medium text-warning-text"}>{msg}</p>
                  {f.dailyUse > 0 && (
                    <p className="text-xs text-ink-2">
                      {t("aiUsage", { rate: Math.round(f.dailyUse * 10) / 10, unit: unit(f.item.unit) })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
