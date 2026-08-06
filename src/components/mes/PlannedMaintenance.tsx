"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Plus, Wrench } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { SIM_STATIONS } from "@/lib/sim";
import { formatDate } from "@/lib/format";
import type { MaintenanceTask } from "@/lib/demo-types";

type Bucket = "overdue" | "dueSoon" | "upcoming";

const BUCKET_STYLE: Record<Bucket, string> = {
  overdue: "bg-critical-soft text-critical-text",
  dueSoon: "bg-warning-soft text-warning-text",
  upcoming: "bg-neutral-soft text-ink-2",
};

/** Planned-maintenance calendar (buckets + add task). Shared by the Maintenance
 *  screen and — when maintenance is not its own department — Production. */
export default function PlannedMaintenance() {
  const t = useTranslations("mes.maintenance");
  const tset = useTranslations("mes.settings");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();

  const [title, setTitle] = useState("");
  const [stationId, setStationId] = useState(SIM_STATIONS[0].id);
  const [interval, setInterval] = useState("30");

  if (!snap) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  if (!snap.settings.features.maintenance) {
    return (
      <p className="max-w-md rounded-xl border border-line bg-surface p-5 text-sm text-ink-2">
        {t("disabled")}
      </p>
    );
  }

  const now = snap.now;
  const soonLimit = new Date(new Date(now).getTime() + 7 * 86400000).toISOString();
  const bucketOf = (m: MaintenanceTask): Bucket =>
    m.nextDueAt < now ? "overdue" : m.nextDueAt < soonLimit ? "dueSoon" : "upcoming";
  const stationName = (id: string) => SIM_STATIONS.find((s) => s.id === id)?.name ?? id;
  const buckets: Bucket[] = ["overdue", "dueSoon", "upcoming"];
  // add-task station must belong to the active company
  const addStation = snap.stations.some((s) => s.id === stationId)
    ? stationId
    : snap.stations[0]?.id ?? stationId;

  return (
    <div className="space-y-5">
      {buckets.map((bucket) => {
        const items = snap.maintenance.filter((m) => bucketOf(m) === bucket);
        if (items.length === 0) return null;
        return (
          <Card key={bucket} title={t(bucket)} padded={false}>
            <ul>
              {items.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${BUCKET_STYLE[bucket]}`}
                  >
                    <Wrench className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted">
                      {stationName(m.stationId)} ·{" "}
                      {t("every", { days: m.intervalDays })} ·{" "}
                      {t("lastDone", { date: formatDate(m.lastDoneAt, locale) })}
                    </p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKET_STYLE[bucket]}`}
                  >
                    {t("nextDue", { date: formatDate(m.nextDueAt, locale) })}
                  </span>
                  <button
                    onClick={() => dispatch({ type: "maintenanceDone", id: m.id })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-good-soft hover:text-good-text"
                  >
                    <CheckCircle2 className="size-4" />
                    {t("markDone")}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <Card title={t("addTitle")}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("fieldTitle")}
            className="grow rounded-lg border border-line bg-page px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none sm:max-w-64"
          />
          <select
            value={addStation}
            onChange={(e) => setStationId(e.target.value)}
            className="rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {snap.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {stationName(s.id)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-20 rounded-lg border border-line bg-page px-2.5 py-2 text-right text-sm focus:border-accent focus:outline-none"
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
            {t("fieldInterval")}
          </label>
          <button
            onClick={async () => {
              if (!title.trim()) return;
              await dispatch({
                type: "addMaintenance",
                stationId: addStation,
                title: title.trim(),
                intervalDays: Number(interval) || 30,
              });
              setTitle("");
            }}
            disabled={title.trim() === ""}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
            {tset("add")}
          </button>
        </div>
      </Card>
    </div>
  );
}
