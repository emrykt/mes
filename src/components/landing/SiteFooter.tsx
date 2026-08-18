"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Factory } from "lucide-react";
import { NavIcon } from "@/lib/nav-icons";
import { useSiteConfig } from "@/lib/useSiteConfig";
import type { FooterLink } from "@/lib/demo-types";

function FooterAnchor({ link }: { link: FooterLink }) {
  const href = link.href || "#";
  const cls = "text-sm text-chrome-ink/80 transition-colors hover:text-white";
  return href.startsWith("/") ? (
    <Link href={href} className={cls}>
      {link.title}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {link.title}
    </a>
  );
}

/** Admin-managed multi-column footer with socials and legal line. */
export default function SiteFooter() {
  const tc = useTranslations("common");
  const f = useSiteConfig().content.footer;

  return (
    <footer className="bg-chrome text-chrome-ink">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
                <Factory className="size-4.5" />
              </span>
              <span className="text-lg font-semibold text-white">{tc("appName")}</span>
            </div>
            {f.tagline && <p className="mt-3 max-w-xs text-sm leading-relaxed text-chrome-ink/80">{f.tagline}</p>}
            {f.socials.length > 0 && (
              <div className="mt-5 flex gap-2.5">
                {f.socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.href || "#"}
                    aria-label={s.label}
                    className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-chrome-ink transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <NavIcon name={s.icon} className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {f.columns.map((col, i) => (
              <div key={i}>
                <p className="text-xs font-semibold tracking-wide text-white uppercase">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      <FooterAnchor link={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-chrome-ink/70 sm:flex-row">
          <p>{f.legal}</p>
          <p>EN · DE</p>
        </div>
      </div>
    </footer>
  );
}
