"use client";

import Link from "next/link";
import { use } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Loader2,
  Pause,
  Play,
  Timer,
} from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { ProgressBar } from "@/components/mes/mes-ui";
import { Card } from "@/components/ui";
import { orderProgress, stepPerformance, stepProgress } from "@/lib/mes-calc";
import { SIM_STATIONS } from "@/lib/sim";
import { formatDate } from "@/lib/format";
import type { StepStatus } from "@/lib/mes-types";

const STEP_ICONS: Record<StepStatus, typeof Check> = {
  done: Check,
  running: Play,
  paused: Pause,
  queued: Timer,
  pending: CircleDashed,
};

const STEP_RING: Record<StepStatus, string> = {
  done: "bg-good text-white",
  running: "bg-good-soft text-good-text ring-2 ring-good",
  paused: "bg-warning-soft text-warning-text ring-2 ring-warning",
  queued: "bg-accent-soft text-accent-strong",
  pending: "bg-neutral-soft text-muted",
};

export default function MesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("mes.orders");
  const ts = useTranslations("mes.stepStatus");
  const locale = useLocale();
  const { snap } = useDemo();

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const order = snap.orders.find((o) => o.id === decodeURIComponent(id));
  if (!order) {
    return (
      <div className="space-y-4">
        <Link
          href="/mes/manager/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToOrders")}
        </Link>
        <p className="text-sm text-muted">{t("empty")}</p>
      </div>
    );
  }

  const opName = (opId: string) =>
    snap.settings.operations.find((o) => o.id === opId)?.name ?? opId;
  const progress = orderProgress(order);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/mes/manager/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToOrders")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {order.id}
          </h1>
          {order.priority === "high" && (
            <span className="rounded-full bg-critical-soft px-2.5 py-0.5 text-xs font-bold text-critical-text uppercase">
              {t("priorityHigh")}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-2">
          {order.customer} · {order.part} · {order.qty}{" "}
          <span className="text-muted">
            · {t("colDue")} {formatDate(order.dueDate, locale)}
          </span>
        </p>
        {order.material && (
          <p className="mt-1 text-sm text-ink-2">
            <span className="text-muted">{t("materialTitle")}:</span>{" "}
            {t("materialLine", {
              type: order.material.type,
              thickness: order.material.thicknessMm,
              size: order.material.size,
            })}
          </p>
        )}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <ProgressBar ratio={progress} className="h-2.5 flex-1" />
          <span className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
      </Card>

      <Card title={t("routingTitle")} subtitle={t("routingSubtitle")} padded={false}>
        <ol>
          {order.routing.map((step, i) => {
            const Icon = STEP_ICONS[step.status];
            const station = step.stationId
              ? SIM_STATIONS.find((s) => s.id === step.stationId)
              : undefined;
            return (
              <li key={step.seq} className="relative flex gap-4 px-5 py-4">
                {i < order.routing.length - 1 && (
                  <span className="absolute top-12 left-9 h-[calc(100%-2rem)] w-px bg-line" />
                )}
                <span
                  className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${STEP_RING[step.status]}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="font-medium">
                      {step.seq}. {opName(step.operationId)}
                    </p>
                    <span className="text-xs text-muted">{ts(step.status)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {t("qtyDone", { done: step.qtyDone, qty: order.qty })}
                    {(step.scrapQty ?? 0) > 0 && (
                      <span className="text-critical-text"> · {step.scrapQty} ✕</span>
                    )}
                    {station && (
                      <span className="text-muted">
                        {" "}
                        · {t("station")}: {station.name}
                      </span>
                    )}
                  </p>
                  {step.estMinutes && (
                    <p className="mt-0.5 text-xs text-muted">
                      {step.status === "running" || step.status === "paused" ? (
                        <>
                          {t("timeProgress", {
                            done: Math.round(((step.runMinutes ?? 0) / 60) * 10) / 10,
                            est: Math.round((step.estMinutes / 60) * 10) / 10,
                          })}{" "}
                          ·{" "}
                        </>
                      ) : null}
                      {t("estShort", { h: Math.round((step.estMinutes / 60) * 10) / 10 })}
                      {step.actualMinutes && step.status === "done" && (
                        <>
                          {" "}
                          · {t("actualShort", { h: Math.round((step.actualMinutes / 60) * 10) / 10 })}
                        </>
                      )}
                      {(() => {
                        const perf = stepPerformance(step);
                        if (perf === undefined) return null;
                        const pct = Math.round(perf * 100);
                        return (
                          <span
                            className={`ml-1.5 font-medium ${
                              pct >= 100
                                ? "text-good-text"
                                : pct < 90
                                  ? "text-critical-text"
                                  : "text-ink-2"
                            }`}
                          >
                            {t("perfVsPlan", { pct })}
                          </span>
                        );
                      })()}
                    </p>
                  )}
                  {step.status !== "pending" && (
                    <ProgressBar
                      ratio={stepProgress(order, step)}
                      className="mt-2 max-w-sm"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
