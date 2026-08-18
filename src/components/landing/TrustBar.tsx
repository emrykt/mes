"use client";

import { ShieldCheck } from "lucide-react";
import { useSiteConfig } from "@/lib/useSiteConfig";

/** Trust strip under the hero: headline stats, customer logos, compliance badges. */
export default function TrustBar() {
  const tb = useSiteConfig().content.trustBar;
  if (!tb?.enabled) return null;

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {tb.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {tb.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-accent-strong">{s.value}</p>
                <p className="mt-1 text-xs text-ink-2">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {tb.logos.length > 0 && (
          <div className="mt-9">
            {tb.logosTitle && (
              <p className="text-center text-xs font-medium tracking-wide text-muted uppercase">
                {tb.logosTitle}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {tb.logos.map((l, i) =>
                l.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={l.image} alt={l.name} className="h-7 max-w-[130px] object-contain opacity-70" />
                ) : (
                  <span key={i} className="text-sm font-semibold text-ink-2/70">
                    {l.name}
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        {tb.badges.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {tb.badges.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-xs font-medium text-ink-2"
              >
                <ShieldCheck className="size-3.5 text-good" />
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
