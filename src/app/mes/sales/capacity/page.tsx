"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange, Loader2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card, StatCard, Table, Td, Th } from "@/components/ui";
import { capacityOutlook } from "@/lib/insights";

const RANGES = [7, 14, 30] as const;

/**
 * Idle-capacity outlook: where there is open station-time over the next N days,
 * so Sales can chase fill-in work or plan around a tight operation.
 */
export default function SalesCapacityPage() {
  const t = useTranslations("mes.capacity");
  const { snap } = useDemo();
  const [days, setDays] = useState<number>(14);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const rows = capacityOutlook(snap, days, new Date(snap.now));
  const totalFree = rows.reduce((s, r) => s + r.freeHours, 0);
  const totalAvail = rows.reduce((s, r) => s + r.availableHours, 0);
  const freePct = Math.round((totalFree / Math.max(1, totalAvail)) * 100);
  const roomiest = [...rows].sort((a, b) => b.freeHours - a.freeHours)[0];
  const tightest = [...rows].sort((a, b) => b.utilPct - a.utilPct)[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                r === days ? "bg-accent text-white" : "text-ink-2 hover:bg-neutral-soft"
              }`}
            >
              {t("days", { n: r })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label={t("kpiFree")} value={t("hours", { h: totalFree })} sub={t("freePct", { pct: freePct })} />
        <StatCard label={t("kpiAvail")} value={t("hours", { h: totalAvail })} />
        <StatCard label={t("kpiRoomiest")} value={roomiest?.name ?? "—"} sub={t("hours", { h: roomiest?.freeHours ?? 0 })} />
        <StatCard label={t("kpiTightest")} value={tightest?.name ?? "—"} sub={`${tightest?.utilPct ?? 0}%`} />
      </div>

      <Card title={t("byOperation")} subtitle={t("byOperationHint")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colOperation")}</Th>
              <Th align="right">{t("colMachines")}</Th>
              <Th align="right">{t("colAvail")}</Th>
              <Th align="right">{t("colCommitted")}</Th>
              <Th>{t("colLoad")}</Th>
              <Th align="right">{t("colFree")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const over = r.utilPct >= 100;
              return (
                <tr key={r.operationId} className="hover:bg-neutral-soft/50">
                  <Td className="font-medium">{r.name}</Td>
                  <Td align="right" className="text-ink-2">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.machines}</span>
                  </Td>
                  <Td align="right" className="text-ink-2">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.availableHours}</span>
                  </Td>
                  <Td align="right" className="text-ink-2">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.committedHours}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-28 overflow-hidden rounded-full bg-neutral-soft">
                        <div
                          className={`h-full rounded-full ${over ? "bg-critical" : "bg-accent"}`}
                          style={{ width: `${r.utilPct}%` }}
                        />
                      </div>
                      <span
                        className="text-xs text-ink-2"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {r.utilPct}%
                      </span>
                    </div>
                  </Td>
                  <Td align="right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.freeHours > 0
                          ? "bg-good-soft text-good-text"
                          : "bg-critical-soft text-critical-text"
                      }`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {r.freeHours > 0 ? t("hours", { h: r.freeHours }) : t("full")}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="flex items-center gap-1.5 px-5 py-4 text-xs text-muted">
          <CalendarRange className="size-3.5" />
          {t("assumptionCal", {
            shifts: snap.settings.workingCalendar?.shifts ?? 3,
            rest: snap.settings.workingCalendar?.restDays.length ?? 0,
          })}
        </p>
      </Card>
    </div>
  );
}
