"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Search, Lightbulb, TrendingUp } from "lucide-react";

/**
 * A looping, animated "live plant" stream: an alert fires, TURI understands the
 * root cause, recommends a move, and the impact lands — the visitor watches TURI
 * work without reading a dashboard. Events reveal one by one, then replay.
 */
export default function LiveFlow() {
  const t = useTranslations("landing");
  const events = [
    { time: t("flowAlertTime"), title: t("flowAlertT"), desc: t("flowAlertD"), icon: AlertTriangle, color: "var(--color-critical)" },
    { time: t("flowUnderTime"), title: t("flowUnderT"), desc: t("flowUnderD"), icon: Search, color: "var(--color-info)" },
    { time: t("flowRecTime"), title: t("flowRecT"), desc: t("flowRecD"), icon: Lightbulb, color: "var(--color-accent)" },
    { time: t("flowImpactTime"), title: t("flowImpactT"), desc: t("flowImpactD"), icon: TrendingUp, color: "var(--color-good)" },
  ];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => {
      setShown((n) => (n >= events.length ? 0 : n + 1));
    }, 1500);
    return () => clearInterval(t1);
  }, [events.length]);

  return (
    <section className="relative overflow-hidden border-y border-white/10 text-white" style={{ backgroundColor: "#07222a" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="anim-aurora absolute -right-1/4 -top-1/3 size-[60vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(14,131,144,0.4), transparent 60%)" }} />
        <div className="anim-aurora absolute -left-1/4 bottom-0 size-[55vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(22,163,74,0.28), transparent 60%)", animationDelay: "-9s" }} />
      </div>
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-good" /> {t("flowEyebrow")}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">{t("flowTitle")}</h2>
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-white/80">
            {t("flowStat")} · <span className="text-good">{t("flowLive")}</span>
          </p>
          <p className="mt-5 max-w-md text-sm text-white/55">{t("flowWatch")}</p>
        </div>

        {/* event stream */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
          <div className="space-y-3">
            {events.map((e, i) => {
              const Icon = e.icon;
              const on = i < shown;
              return (
                <div
                  key={i}
                  className="flex gap-3 transition-all duration-500"
                  style={{ opacity: on ? 1 : 0.12, transform: on ? "none" : "translateY(6px)" }}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: on ? e.color : "rgba(255,255,255,0.08)" }}
                    >
                      <Icon className="size-4 text-white" />
                    </span>
                    {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-semibold text-white">
                      <span className="tabular-nums text-white/50">{e.time}</span> — {e.title}
                    </p>
                    <p className="text-sm text-white/70">{e.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
