"use client";

import { Quote } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { useSiteConfig } from "@/lib/useSiteConfig";

/** Customer testimonials — quote cards with name, role and company. */
export default function Testimonials() {
  const ts = useSiteConfig().content.testimonials;
  if (!ts?.enabled || ts.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <div className="text-center">
          {ts.headline && (
            <h2 className="text-3xl font-semibold tracking-tight">{ts.headline}</h2>
          )}
          {ts.intro && <p className="mx-auto mt-3 max-w-2xl text-ink-2">{ts.intro}</p>}
        </div>
      </Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {ts.items.map((it, i) => (
          <Reveal key={i} delay={i * 80}>
            <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
              <Quote className="size-6 text-accent-wash" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink">
                “{it.quote}”
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-semibold text-ink">{it.name}</p>
                {(it.role || it.company) && (
                  <p className="text-xs text-muted">
                    {[it.role, it.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
