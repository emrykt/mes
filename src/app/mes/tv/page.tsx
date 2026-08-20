"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BadgeCheck, Bell, Factory, Loader2, Wrench } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import BadgesStrip from "@/components/mes/BadgesStrip";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import { minutesAgo } from "@/lib/mes-calc";
import { SIM_STATIONS, stationToday } from "@/lib/sim";
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
    <div className="flex min-h-screen flex-col bg-chrome p-4 text-white md:p-6">
      {/* header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/mes"
            className="flex size-10 items-center justify-center rounded-xl bg-accent md:size-11"
            aria-label="TURI"
          >
            <Factory className="size-5 md:size-6" />
          </Link>
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight md:text-2xl">{t("title")}</h1>
            <p className="text-xs text-chrome-ink md:text-sm">{snap.companyName} · {t("subtitle")}</p>
          </div>
          <CompanySwitcher dark />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center md:ml-auto md:flex md:items-center md:gap-8 md:text-right">
          <div>
            <p className="text-[10px] tracking-wide text-chrome-ink uppercase md:text-xs">
              {t("planPerfToday")}
            </p>
            <p className="text-2xl font-semibold tabular-nums md:text-4xl">
              {snap.today.planPerf}%
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-chrome-ink uppercase md:text-xs">
              {t("utilToday")}
            </p>
            <p className="text-2xl font-semibold tabular-nums md:text-4xl">
              {Math.round(snap.today.util * 100)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide text-chrome-ink uppercase md:text-xs">
              {t("scrapToday")}
            </p>
            <p className="text-2xl font-semibold text-critical tabular-nums md:text-4xl">
              {snap.today.scrap}
            </p>
          </div>
          <p className="hidden w-32 text-4xl font-semibold text-chrome-ink tabular-nums md:block">
            {clock}
          </p>
        </div>
      </header>

      {/* stations grid */}
      <div className="mt-4 grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {snap.stations.map((s) => {
          const def = SIM_STATIONS.find((d) => d.id === s.id);
          if (!def) return null;
          const style = STATE_STYLE[s.state];
          return (
            <div
              key={s.id}
              className={`flex flex-col rounded-2xl p-3 ring-1 md:p-5 ${style.bg}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full md:size-3 ${style.dot} ${s.state === "running" ? "animate-pulse" : ""}`}
                />
                <p className="truncate text-sm font-semibold md:text-xl">{def.name}</p>
                <span className={`ml-auto shrink-0 text-[10px] font-bold uppercase md:text-sm ${style.label}`}>
                  {s.state === "down" ? reasonName(s.downtimeReasonId) : ts(s.state)}
                </span>
              </div>
              <div className="mt-auto flex items-end justify-between gap-2 pt-3 md:pt-4">
                <div className="min-w-0">
                  <p className="truncate text-xs text-chrome-ink md:text-sm">{s.operator}</p>
                  {s.currentOrderIds.length > 0 && (
                    <p className="truncate text-xs font-medium text-white/85 tabular-nums md:text-base">
                      {s.currentOrderIds.join(" + ")}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xl font-semibold tabular-nums md:text-3xl">
                  {Math.round(stationToday(s.id, now).util * 100)}
                  <span className="text-sm text-white/50 md:text-lg">%</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* andon ticker */}
      <footer className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl bg-chrome-2 px-4 py-3 md:mt-6 md:min-h-16 md:gap-4 md:px-5">
        <Bell className={`size-5 shrink-0 md:size-6 ${openCalls.length > 0 ? "text-critical" : "text-chrome-ink"}`} />
        {openCalls.length === 0 ? (
          <p className="text-base text-chrome-ink md:text-lg">{t("noCalls")}</p>
        ) : (
          <div className="flex flex-wrap gap-2 md:gap-3">
            {openCalls.map((a) => {
              const Icon = ANDON_ICONS[a.type];
              const def = SIM_STATIONS.find((d) => d.id === a.stationId);
              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-critical/20 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-critical md:gap-2 md:px-4 md:py-2 md:text-lg"
                >
                  <Icon className="size-4 text-critical md:size-5" />
                  {def?.name} — {tt(a.type)}
                  <span className="text-xs font-normal text-chrome-ink tabular-nums md:text-sm">
                    {minutesAgo(a.at, now)}′
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </footer>

      {/* achievement badges — bottom strip, out of the main view */}
      <div className="mt-4">
        <BadgesStrip dark limit={4} />
      </div>
    </div>
  );
}
