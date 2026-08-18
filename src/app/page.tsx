import Link from "next/link";
import { useTranslations } from "next-intl";
import Reveal from "@/components/landing/Reveal";
import SiteNav from "@/components/landing/SiteNav";
import TrustBar from "@/components/landing/TrustBar";
import Testimonials from "@/components/landing/Testimonials";
import Faq from "@/components/landing/Faq";
import ContactForm from "@/components/landing/ContactForm";
import SiteFooter from "@/components/landing/SiteFooter";
import {
  ArrowRight,
  Bot,
  Check,
  Gauge,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/data";
import { formatMoney } from "@/lib/format";

type T = ReturnType<typeof useTranslations>;

export default function LandingPage() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const tp = useTranslations("plans");

  const tagline: Record<string, string> = {
    BASIC: t("planTaglineBasic"),
    AIPRO: t("planTaglineAipro"),
    AIULTIMATE: t("planTaglineUltimate"),
  };
  const features: Record<string, string[]> = {
    BASIC: [t("feaMesCore"), t("feaUnlimited"), t("feaPaperless"), t("feaTimeProgress"), t("feaCost")],
    AIPRO: [
      t("feaEverythingBasic"), t("feaAssistant"), t("feaAlerts"), t("feaBenchmark"),
      t("feaAdvanced"), t("feaRootCause"), t("feaQuoting"), t("feaMaintenance"),
      t("feaStock"), t("feaKpi"), t("feaPriority"),
    ],
    AIULTIMATE: [
      t("feaMesCore"), t("feaUnlimited"), t("feaPaperless"), t("feaTimeProgress"),
      t("feaCost"), t("feaAssistant"), t("feaAlerts"), t("feaBenchmark"),
      t("feaAdvanced"), t("feaRootCause"), t("feaQuoting"), t("feaMaintenance"),
      t("feaStock"), t("feaKpi"), t("feaMultiplant"), t("feaApi"), t("feaPriority"),
    ],
  };

  const aiCards = [
    { icon: Bot, title: t("aiCard1Title"), desc: t("aiCard1Desc") },
    { icon: TrendingUp, title: t("aiCard2Title"), desc: t("aiCard2Desc") },
    { icon: Gauge, title: t("aiCard3Title"), desc: t("aiCard3Desc") },
    { icon: Wallet, title: t("aiCard4Title"), desc: t("aiCard4Desc") },
    { icon: Rocket, title: t("aiCard5Title"), desc: t("aiCard5Desc") },
    { icon: ShieldCheck, title: t("aiCard6Title"), desc: t("aiCard6Desc") },
  ];

  return (
    <main className="min-h-screen">
      <SiteNav />

      {/* ---------- HERO (dark, animated) ---------- */}
      <section className="relative overflow-hidden text-white" style={{ backgroundColor: "#07222a" }}>
        {/* animated aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="anim-aurora absolute -left-1/4 -top-1/3 size-[70vh] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(22,163,74,0.38), transparent 60%)" }}
          />
          <div
            className="anim-aurora absolute -right-1/4 -top-1/4 size-[75vh] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(14,131,144,0.48), transparent 60%)", animationDelay: "-9s" }}
          />
          <div
            className="anim-aurora absolute -bottom-1/3 left-1/3 size-[60vh] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(47,116,208,0.34), transparent 60%)", animationDelay: "-17s" }}
          />
        </div>
        <Sparkfield />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pt-32 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-36 lg:pb-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <Sparkles className="size-3.5" />
              {t("heroBadge")}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
              {t("heroTitle")} <span className="text-grad">{t("heroHighlight")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70 text-pretty">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-white shadow-lg shadow-accent/30 hover:bg-accent-strong"
              >
                {t("ctaTrial")}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur hover:bg-white/10"
              >
                {t("ctaExplore")}
              </a>
            </div>
            <p className="mt-4 text-xs text-white/45">{t("cardRequired")}</p>
          </div>

          <HeroOrbit t={t} />
        </div>

        {/* stats strip on the dark hero */}
        <div className="relative z-10 border-t border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-6 sm:grid-cols-4">
            {[
              ["statLiveV", "statLiveL"],
              ["statScoreV", "statScoreL"],
              ["statAiV", "statAiL"],
              ["statLangV", "statLangL"],
            ].map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-white">{t(v)}</p>
                <p className="mt-0.5 text-xs text-white/55">{t(l)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TRUST BAR (managed) ---------- */}
      <TrustBar />

      {/* ---------- AI FEATURES ---------- */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
            <Sparkles className="size-3.5" />
            {t("aiEyebrow")}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t("aiSectionTitle")}</h2>
          <p className="mt-3 text-ink-2">{t("aiSectionSubtitle")}</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {aiCards.map(({ icon: Icon, title, desc }, i) => (
            <Reveal
              key={title}
              delay={i * 70}
              className="group rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong transition-colors group-hover:bg-accent group-hover:text-white">
                <Icon className="size-5.5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="scroll-mt-24 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">{t("pricingTitle")}</h2>
            <p className="mt-2 text-center text-sm text-ink-2">{t("pricingSubtitle")}</p>
          </Reveal>
          <div className="mt-12 grid items-start gap-5 md:grid-cols-3">
            {PLAN_ORDER.map((id, i) => {
              const plan = PLANS[id];
              const popular = id === "AIPRO";
              return (
                <Reveal
                  key={id}
                  delay={i * 80}
                  className={`relative rounded-2xl border bg-page p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    popular ? "border-accent shadow-lg ring-1 ring-accent" : "border-line"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-white">
                      {t("mostPopular")}
                    </span>
                  )}
                  <h3 className="text-base font-semibold">{tp(id)}</h3>
                  <p className="mt-0.5 text-xs text-muted">{tagline[id]}</p>
                  <p className="mt-3 flex items-baseline gap-1">
                    {plan.contact ? (
                      <span className="text-2xl font-semibold tracking-tight">{t("contactPrice")}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-semibold tracking-tight">{formatMoney(plan.monthlyPrice)}</span>
                        <span className="text-sm text-muted">{tc("perMonth")}</span>
                      </>
                    )}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {features[id].map((f, k) => {
                      const heading = f.endsWith(":");
                      return (
                        <li
                          key={k}
                          className={heading ? "pt-1 text-xs font-semibold text-ink" : "flex items-start gap-2 text-sm text-ink-2"}
                        >
                          {!heading && <Check className="mt-0.5 size-4 shrink-0 text-good" />}
                          {f}
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href="/portal"
                    className={`btn-sheen mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                      popular ? "bg-accent text-white hover:bg-accent-strong" : "border border-line text-ink hover:bg-neutral-soft"
                    }`}
                  >
                    {plan.contact ? t("contactCta") : t("choosePlan", { plan: tp(id) })}
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted">💡 {t("roiNote")}</p>
        </div>
      </section>

      {/* ---------- CTA BAND ---------- */}
      <section className="px-6 py-20">
        <Reveal className="relative mx-auto flex max-w-6xl flex-col items-center gap-5 overflow-hidden rounded-3xl px-8 py-16 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div
            className="anim-grad absolute inset-0 -z-10"
            style={{ background: "linear-gradient(120deg, var(--color-accent-strong) 0%, var(--color-accent) 40%, var(--color-good) 75%, var(--color-info) 120%)" }}
          />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("ctaBandTitle")}</h2>
            <p className="mt-2 max-w-xl text-white/85">{t("ctaBandSubtitle")}</p>
          </div>
          <Link
            href="/login"
            className="btn-sheen inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-accent-strong shadow-lg hover:bg-white/90"
          >
            {t("ctaTrial")}
            <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      {/* ---------- TESTIMONIALS (managed) ---------- */}
      <Testimonials />

      {/* ---------- FAQ (managed) ---------- */}
      <Faq />

      {/* ---------- CONTACT / DEMO REQUEST (managed) ---------- */}
      <ContactForm />

      {/* ---------- FOOTER (managed) ---------- */}
      <SiteFooter />
    </main>
  );
}

/* ---------- Hero centerpiece: connected-plant orbit ---------- */
function HeroOrbit({ t }: { t: T }) {
  const nodes = [
    { k: "nodeProduction", pos: { top: "3%", left: "50%" }, delay: "0s" },
    { k: "nodeQuality", pos: { top: "50%", left: "97%" }, delay: "-1.5s" },
    { k: "nodeMaintenance", pos: { top: "97%", left: "50%" }, delay: "-3s" },
    { k: "nodeStock", pos: { top: "50%", left: "3%" }, delay: "-4.5s" },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {/* core glow */}
      <div
        className="anim-pulse absolute inset-[20%] rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(22,163,74,0.55), rgba(14,131,144,0.28) 55%, transparent 72%)" }}
      />
      {/* rotating conic ring */}
      <div
        className="anim-spin-slow absolute inset-[7%] rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #0e8390, #16a34a, #2f74d0, #0e8390)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 14px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 14px))",
          filter: "drop-shadow(0 0 20px rgba(22,163,74,0.5))",
        }}
      />
      {/* counter-rotating dashed ring */}
      <svg viewBox="0 0 100 100" className="anim-spin-rev absolute inset-[19%]">
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" strokeDasharray="1.5 4" />
      </svg>
      {/* glassy core pill */}
      <div className="absolute left-1/2 top-1/2 w-[76%] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-center shadow-2xl backdrop-blur-md">
          <p className="text-[13px] font-semibold leading-snug text-white sm:text-sm">{t("heroLoop")}</p>
        </div>
      </div>
      {/* orbiting role nodes */}
      {nodes.map((n) => (
        <div
          key={n.k}
          className="anim-float absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: n.pos.top, left: n.pos.left, animationDelay: n.delay }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="size-3 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
            <span className="whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {t(n.k)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Twinkling sparkles over the hero ---------- */
function Sparkfield() {
  const stars = [
    { top: "14%", left: "8%", size: 14, delay: "0s" },
    { top: "22%", left: "44%", size: 10, delay: "-0.6s" },
    { top: "12%", left: "72%", size: 12, delay: "-1.2s" },
    { top: "36%", left: "20%", size: 9, delay: "-1.8s" },
    { top: "58%", left: "12%", size: 13, delay: "-2.4s" },
    { top: "70%", left: "38%", size: 10, delay: "-0.9s" },
    { top: "30%", left: "88%", size: 11, delay: "-1.5s" },
    { top: "62%", left: "80%", size: 14, delay: "-2.1s" },
    { top: "80%", left: "62%", size: 9, delay: "-0.3s" },
    { top: "46%", left: "58%", size: 8, delay: "-2.7s" },
    { top: "84%", left: "22%", size: 11, delay: "-1.1s" },
    { top: "18%", left: "60%", size: 8, delay: "-3.1s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="anim-twinkle absolute text-white/80"
          style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
