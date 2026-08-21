import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft } from "lucide-react";
import SiteNav from "@/components/landing/SiteNav";
import SiteFooter from "@/components/landing/SiteFooter";
import { LEGAL_SLUGS, legalDoc, type LegalSlug } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export default function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  if (!LEGAL_SLUGS.includes(slug as LegalSlug)) notFound();
  const locale = useLocale();
  const doc = legalDoc(slug as LegalSlug, locale);

  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {locale === "de" ? "Startseite" : "Home"}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-xs text-muted">
          {locale === "de" ? "Zuletzt aktualisiert" : "Last updated"}: {doc.updated}
        </p>

        <div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft/25 px-4 py-2.5 text-xs text-ink-2">
          ⚠ {doc.reviewNote}
        </div>

        <p className="mt-6 text-ink-2 text-pretty">{doc.intro}</p>

        <div className="mt-8 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold tracking-tight">{s.h}</h2>
              <div className="mt-2 space-y-2">
                {s.b.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-2 text-pretty">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
