"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { useSiteConfig } from "@/lib/useSiteConfig";

/** FAQ accordion — one open item at a time. */
export default function Faq() {
  const faq = useSiteConfig().content.faq;
  const [open, setOpen] = useState<number | null>(0);
  if (!faq?.enabled || faq.items.length === 0) return null;

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <div className="text-center">
            {faq.headline && (
              <h2 className="text-3xl font-semibold tracking-tight">{faq.headline}</h2>
            )}
            {faq.intro && <p className="mx-auto mt-3 max-w-2xl text-ink-2">{faq.intro}</p>}
          </div>
        </Reveal>
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-page">
          {faq.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-ink">{it.question}</span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-ink-2">{it.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
