import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import Reveal from "@/components/landing/Reveal";
import ProductMockup from "@/components/landing/ProductMockup";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  Check,
  Cpu,
  Gauge,
  LayoutDashboard,
  Sparkles,
  Tv,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SLUGS = ["operator", "production", "executive", "sales", "maintenance", "stock", "tv", "assistant"] as const;
type Slug = (typeof SLUGS)[number];

const ICONS: Record<Slug, LucideIcon> = {
  operator: Cpu,
  production: LayoutDashboard,
  executive: Gauge,
  sales: Wallet,
  maintenance: Wrench,
  stock: Boxes,
  tv: Tv,
  assistant: Bot,
};

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  if (!SLUGS.includes(slug as Slug)) notFound();
  const s = slug as Slug;
  const t = useTranslations("product");
  const Icon = ICONS[s];
  const benefits = [t(`${s}_b1`), t(`${s}_b2`), t(`${s}_b3`), t(`${s}_b4`)];
  const others = SLUGS.filter((x) => x !== s);

  return (
    <main className="min-h-screen">
      <SiteNav />

      {/* hero */}
      <section className="relative overflow-hidden text-white" style={{ backgroundColor: "#07222a" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="anim-aurora absolute -left-1/4 -top-1/3 size-[60vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(22,163,74,0.32), transparent 60%)" }} />
          <div className="anim-aurora absolute -right-1/4 top-0 size-[65vh] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(14,131,144,0.42), transparent 60%)", animationDelay: "-9s" }} />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pt-32 pb-20 lg:grid-cols-[1fr_1.05fr] lg:pt-36">
          <Reveal>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="size-4" /> {t("back")}
            </Link>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <Icon className="size-3.5" /> {t("eyebrow")}
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t(`${s}_name`)}</h1>
            <p className="mt-3 text-lg text-grad font-medium">{t(`${s}_tagline`)}</p>
            {/* AI recommendations — front and centre on every product */}
            <div className="mt-5 max-w-xl rounded-2xl border border-good/30 bg-white/[0.06] p-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-good">
                <Sparkles className="size-3.5" /> {t("aiLabel")}
              </p>
              <p className="mt-1.5 text-sm text-white/85">{t(`${s}_ai`)}</p>
            </div>
            <p className="mt-5 max-w-xl text-white/70">{t(`${s}_use`)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup?plan=AIPRO" className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-white shadow-lg shadow-accent/30 hover:bg-accent-strong">
                {t("ctaTrial")} <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur hover:bg-white/10">
                {t("ctaExplore")}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={120} className="anim-float-slow">
            <p className="mb-2 text-center text-xs font-medium text-white/40">{t("previewLabel")}</p>
            <ProductMockup slug={s} />
          </Reveal>
        </div>
      </section>

      {/* use + benefits */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("useTitle")}</h2>
            <p className="mt-4 text-ink-2 text-pretty">{t(`${s}_use`)}</p>
            <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline">
              {t("ctaExplore")} <ArrowRight className="size-4" />
            </Link>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("benefitsTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-good/15 text-good">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm text-ink">{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* other products */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-lg font-semibold tracking-tight">{t("otherProducts")}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((x) => {
              const OIcon = ICONS[x];
              return (
                <Link
                  key={x}
                  href={`/product/${x}`}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-page p-3.5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong transition-colors group-hover:bg-accent group-hover:text-white">
                    <OIcon className="size-4.5" />
                  </span>
                  <span className="text-sm font-medium text-ink">{t(`${x}_name`)}</span>
                  <ArrowRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
