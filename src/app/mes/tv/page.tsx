"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Bell, Factory, Loader2, Wrench } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import BadgesStrip from "@/components/mes/BadgesStrip";
import { minutesAgo } from "@/lib/mes-calc";
import { SIM_STATIONS } from "@/lib/sim";
import type { AndonType, StationState } from "@/lib/mes-types";

const STATE_STYLE: Record<StationState, { bg: string; dot: string; label: string }> = {
  running: { bg: "bg-good/15 ring-good", dot: "bg-good", label: "text-good" },
  idle: { bg: "bg-white/5 ring-white/15", dot: "bg-white/40", label: "text-white/60" },
  setup: { bg: "bg-accent/15 ring-accent", dot: "bg-accent", label: "text-accent" },
  down: { bg: "bg-critical/20 ring-critical", dot: "bg-critical", label: "text-critical" },
};

const ANDON_ICONS: Record<AndonType, typeof Bell> = {
  supervisor: Factory,
  maintenance: Wrench,
  quality: BadgeCheck,
};

export default function TvBoardPage() {
  const t = useTranslations("mes.tv");
  const ts = useTranslations("mes.stationState");
  const tt = useTranslations("mes.andonType");
  const { snap } = useDemo();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chrome text-chrome-ink">
        <Loader2 className="size-10 animate-spin" />
      </div>
    );
  }

  const now = new Date(snap.now);
  const openCalls = snap.andon.filter((a) => a.open);
  const reasonName = (id?: string) =>
    id ? (snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id) : "";

  return (
    <div className="flex min-h-screen flex-col bg-chrome p-6 text-white">
      {/* header */}
      <header className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent">
          <Factory className="size-6" />
        </span>
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-chrome-ink">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-8 text-right">
          <div>
            <p className="text-xs tracking-wide text-chrome-ink uppercase">
              {t("outputToday")}
            </p>
            <p className="text-4xl font-semibold tabular-nums">
              {snap.today.output.toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-chrome-ink uppercase">
              {t("utilToday")}
            </p>
            <p className="text-4xl font-semibold tabular-nums">
              {Math.round(snap.today.util * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-chrome-ink uppercase">
              {t("scrapToday")}
            </p>
            <p className="text-4xl font-semibold text-critical tabular-nums">
              {snap.today.scrap}
            </p>
          </div>
          <p className="w-32 text-4xl font-semibold text-chrome-ink tabular-nums">
            {clock}
          </p>
        </div>
      </header>

      {/* achievement badges */}
      <div className="mt-4">
        <BadgesStrip dark limit={4} />
      </div>

      {/* stations grid */}
      <div className="mt-4 grid flex-1 grid-cols-3 gap-4">
        {snap.stations.map((s) => {
          const def = SIM_STATIONS.find((d) => d.id === s.id);
          if (!def) return null;
          const style = STATE_STYLE[s.state];
          return (
            <div
              key={s.id}
              className={`flex flex-col rounded-2xl p-5 ring-1 ${style.bg}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`size-3 rounded-full ${style.dot} ${s.state === "running" ? "animate-pulse" : ""}`}
                />
                <p className="text-xl font-semibold">{def.name}</p>
                <span className={`ml-auto text-sm font-bold uppercase ${style.label}`}>
                  {s.state === "down" ? reasonName(s.downtimeReasonId) : ts(s.state)}
                </span>
              </div>
              <div className="mt-auto flex items-end justify-between pt-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-chrome-ink">{s.operator}</p>
                  {s.currentOrderIds.length > 0 && (
                    <p className="truncate text-base font-medium text-white/85 tabular-nums">
                      {s.currentOrderIds.join(" + ")}
                    </p>
                  )}
                </div>
                <p className="text-3xl font-semibold tabular-nums">
                  {s.todayOutput.toLocaleString("en-US")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* andon ticker */}
      <footer className="mt-6 flex min-h-16 items-center gap-4 rounded-2xl bg-chrome-2 px-5 py-3">
        <Bell className={`size-6 ${openCalls.length > 0 ? "text-critical" : "text-chrome-ink"}`} />
        {openCalls.length === 0 ? (
          <p className="text-lg text-chrome-ink">{t("noCalls")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {openCalls.map((a) => {
              const Icon = ANDON_ICONS[a.type];
              const def = SIM_STATIONS.find((d) => d.id === a.stationId);
              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-critical/20 px-4 py-2 text-lg font-semibold text-white ring-1 ring-critical"
                >
                  <Icon className="size-5 text-critical" />
                  {def?.name} — {tt(a.type)}
                  <span className="text-sm font-normal text-chrome-ink tabular-nums">
                    {minutesAgo(a.at, now)}′
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </footer>
    </div>
  );
}
