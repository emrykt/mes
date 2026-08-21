import Link from "next/link";
import { useTranslations } from "next-intl";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import Reveal from "@/components/landing/Reveal";
import { ArrowLeft, ArrowRight, Factory, Activity, Search, Lightbulb, TrendingUp } from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("landing");
  const stats = [
    { v: t("aboutStat1V"), l: t("aboutStat1L") },
    { v: t("aboutStat2V"), l: t("aboutStat2L") },
    { v: t("aboutStat3V"), l: t("aboutStat3L") },
  ];
  const loop = [
    { icon: Activity, t: t("loopTrackT"), d: t("loopTrackH") },
    { icon: Search, t: t("loopUnderstandT"), d: t("loopUnderstandH") },
    { icon: Lightbulb, t: t("loopRecommendT"), d: t("loopRecommendH") },
    { icon: TrendingUp, t: t("loopImproveT"), d: t("loopImproveH") },
  ];

  return (
    <main className="min-h-screen">
      <SiteNav />

      {/* hero */}
      <section className="relative overflow-hidden text-white" style={{ backgroundColor: "#07222a" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="anim-aurora absolute -left-1/4 -top-1/3 size-[60vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(22,163,74,0.30), transparent 60%)" }} />
          <div className="anim-aurora absolute -right-1/4 top-0 size-[65vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(14,131,144,0.42), transparent 60%)", animationDelay: "-9s" }} />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pt-32 pb-20 text-white lg:grid-cols-[1.05fr_0.95fr] lg:pt-36">
          <Reveal>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="size-4" /> {t("homeLink")}
            </Link>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <Factory className="size-3.5" /> {t("aboutEyebrow")}
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("aboutTitle")}</h1>
            <p className="mt-5 text-white/75 text-pretty">{t("aboutBody1")}</p>
            <p className="mt-4 text-white/75 text-pretty">{t("aboutBody2")}</p>
            <p className="mt-6 border-l-2 border-good pl-4 text-lg font-medium italic text-white/90">{t("aboutGermanTagline")}</p>
            <p className="mt-5 text-xs text-white/45">{t("aboutNote")}</p>
          </Reveal>
          <Reveal delay={120} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((s) => (
              <div key={s.l} className="anim-float-slow rounded-2xl border border-white/12 bg-white/[0.06] px-6 py-5 backdrop-blur">
                <p className="text-4xl font-semibold tracking-tight text-grad">{s.v}</p>
                <p className="mt-1 text-sm text-white/70">{s.l}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* the TURI loop recap */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
            {t("loopEyebrow")}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t("loopTitle")}</h2>
          <p className="mt-3 text-ink-2">{t("loopSubtitle")}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loop.map(({ icon: Icon, t: title, d }, i) => (
            <Reveal key={title} delay={i * 80} className="rounded-2xl border border-line bg-surface p-6 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-accent text-white anim-pulse-soft">
                <Icon className="size-5.5" />
              </span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent-strong">{title}</p>
              <p className="mt-1 text-sm font-medium text-ink">{d}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/#contact" className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-strong">
            {t("talkToUs")} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
