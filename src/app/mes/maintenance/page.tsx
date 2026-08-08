"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, BellRing, Check, Loader2, ShieldCheck, Wrench } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import PlannedMaintenance from "@/components/mes/PlannedMaintenance";
import KpiScorecard from "@/components/mes/KpiScorecard";
import { useDemo, useEntitlements } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { minutesAgo } from "@/lib/mes-calc";
import { SIM_STATIONS } from "@/lib/sim";

export default function MaintenanceScreen() {
  const t = useTranslations("mes.maintScreen");
  const ta = useTranslations("mes.alerts");
  const tc = useTranslations("common");
  const { snap, dispatch } = useDemo();
  const ent = useEntitlements();

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const now = new Date(snap.now);
  const stationName = (id: string) => SIM_STATIONS.find((s) => s.id === id)?.name ?? id;
  const reasonName = (id?: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id ?? "—";

  const openCalls = snap.andon.filter((a) => a.open && a.type === "maintenance");
  const aiAlerts = snap.alerts.filter((a) => !a.acked && a.target === "maintenance");

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 md:py-10">
      <header className="flex items-center gap-3">
        <Link
          href="/mes"
          className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft"
          aria-label={tc("back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Wrench className="size-4.5" />
        </span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
        <CompanySwitcher />
        <LanguageSwitcher />
      </header>

      <div className="mt-6 space-y-5">
        {/* maintenance KPI targets (AI Pro+) */}
        {ent.advancedAnalytics && (
          <Card title={t("kpiTitle")} subtitle={t("kpiHint")}>
            <KpiScorecard sections={["maintenance"]} showSectionTitles={false} />
          </Card>
        )}

        {/* open maintenance andon calls */}
        <Card title={t("openCalls")} subtitle={t("openCallsHint")} padded={false}>
          {openCalls.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-5 py-8 text-center text-sm text-muted">
              <ShieldCheck className="size-5 text-good" />
              {t("noCalls")}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {openCalls.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-critical-soft text-critical-text">
                    <BellRing className="size-4.5" />
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-medium">{stationName(a.stationId)}</p>
                    <p className="text-xs text-muted">
                      {t("callMaintenance")} · {ta("since", { min: minutesAgo(a.at, now) })}
                    </p>
                  </div>
                  <button
                    onClick={() => dispatch({ type: "andonClose", id: a.id })}
                    className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
                  >
                    {t("resolve")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AI automatic maintenance alerts */}
        <Card title={t("aiAlerts")} subtitle={t("aiAlertsHint")} padded={false}>
          {aiAlerts.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-5 py-8 text-center text-sm text-muted">
              <ShieldCheck className="size-5 text-good" />
              {t("noAlerts")}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {aiAlerts.map((a) => {
                const detail =
                  a.trigger === "downtime"
                    ? ta("downtimeMsg", {
                        station: stationName(a.stationId),
                        reason: reasonName(a.reasonId),
                        minutes: Math.round(a.value),
                      })
                    : ta("scrapMsg", {
                        station: stationName(a.stationId),
                        rate: Math.round(a.value * 100),
                      });
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
                      <Wrench className="size-4.5" />
                    </span>
                    <div className="min-w-0 grow">
                      <p className="truncate text-sm font-medium">{detail}</p>
                      <p className="text-xs text-muted">
                        {t("autoRaised")} · {ta("since", { min: minutesAgo(a.at, now) })}
                      </p>
                    </div>
                    <button
                      onClick={() => dispatch({ type: "ackAlert", id: a.id })}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
                    >
                      <Check className="size-4" />
                      {ta("ack")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* planned maintenance */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-2">{t("planned")}</h2>
          <PlannedMaintenance />
        </div>
      </div>
    </div>
  );
}
