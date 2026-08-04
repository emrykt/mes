"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, Check, Loader2, ShieldCheck } from "lucide-react";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import InsightsPanel from "@/components/mes/InsightsPanel";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { Card } from "@/components/ui";
import type { AlertTarget, LiveAlert } from "@/lib/demo-types";
import { SIM_STATIONS } from "@/lib/sim";

const TARGET_STYLE: Record<AlertTarget, string> = {
  supervisor: "bg-critical-soft text-critical-text",
  maintenance: "bg-warning-soft text-warning-text",
  quality: "bg-accent-wash text-accent-strong",
  purchasing: "bg-warning-soft text-warning-text",
};

const TARGET_KEY: Record<AlertTarget, string> = {
  supervisor: "targetSupervisor",
  maintenance: "targetMaintenance",
  quality: "targetQuality",
  purchasing: "targetPurchasing",
};

export default function ManagerAlertsPage() {
  const t = useTranslations("mes.alerts");
  const { snap, dispatch } = useDemo();
  const ent = useEntitlements();
  const [tab, setTab] = useState<"open" | "acked">("open");

  const now = snap ? new Date(snap.now) : new Date();
  const { open, acked } = useMemo(() => {
    const a = snap?.alerts ?? [];
    return {
      open: a.filter((x) => !x.acked),
      acked: a.filter((x) => x.acked),
    };
  }, [snap]);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const stationName = (id: string) =>
    SIM_STATIONS.find((s) => s.id === id)?.name ?? id;
  const reasonName = (id?: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id ?? "—";

  const describe = (a: LiveAlert): string => {
    if (a.trigger === "downtime")
      return t("downtimeMsg", {
        station: stationName(a.stationId),
        reason: reasonName(a.reasonId),
        minutes: Math.round(a.value),
      });
    if (a.trigger === "lowStock") {
      const item = snap.stock.find((s) => s.id === a.reasonId);
      const u = item?.unit === "piece" ? t("unitPiece") : t("unitKg");
      return t("lowStockMsg", {
        material: a.label ?? "—",
        amount: `${Math.round(a.value)} ${u}`,
        reorder: `${Math.round(a.threshold)} ${u}`,
      });
    }
    return t("scrapMsg", {
      station: stationName(a.stationId),
      rate: Math.round(a.value * 100),
    });
  }

  const list = tab === "open" ? open : acked;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      {!ent.advancedAnalytics ? (
        <PlanUpsell feature="analytics" />
      ) : (
        <>
          <div className="flex gap-1 rounded-xl border border-line bg-surface p-1 sm:max-w-sm">
            {(["open", "acked"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === k ? "bg-accent text-white" : "text-ink-2 hover:bg-neutral-soft"
                }`}
              >
                {k === "open" ? t("openTab") : t("ackedTab")}
                {k === "open" && open.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-critical-soft px-1.5 text-xs font-semibold text-critical-text">
                    {open.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Card padded={false}>
            {list.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-5 py-10 text-center text-sm text-muted">
                <ShieldCheck className="size-5 text-good" />
                {t("empty")}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((a) => {
                  const mins = Math.max(
                    0,
                    Math.round((now.getTime() - new Date(a.at).getTime()) / 60000),
                  );
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TARGET_STYLE[a.target]}`}
                      >
                        <BellRing className="size-4.5" />
                      </span>
                      <div className="min-w-0 grow">
                        <p className="truncate text-sm font-medium text-ink">
                          {describe(a)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-medium ${TARGET_STYLE[a.target]}`}
                          >
                            {t(TARGET_KEY[a.target])}
                          </span>{" "}
                          · {t("since", { min: mins })}
                        </p>
                      </div>
                      {a.acked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-good-text">
                          <Check className="size-4" />
                          {t("acked")}
                        </span>
                      ) : (
                        <button
                          onClick={() => dispatch({ type: "ackAlert", id: a.id })}
                          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
                        >
                          {t("ack")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <InsightsPanel />
        </>
      )}
    </div>
  );
}
