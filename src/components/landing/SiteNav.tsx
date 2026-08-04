"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Factory } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Landing nav: transparent + light over the dark hero, solidifies to a light
 * bar once the user scrolls. Gives the premium "floating chrome" feel.
 */
export default function SiteNav() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link = solid
    ? "text-ink-2 hover:bg-neutral-soft"
    : "text-white/80 hover:bg-white/10";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "border-b border-line/70 bg-page/85 backdrop-blur" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <Factory className="size-4.5" />
          </span>
          <span className={`text-lg font-semibold tracking-tight ${solid ? "text-ink" : "text-white"}`}>
            {tc("appName")}
          </span>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#features" className={`rounded-lg px-3 py-2 text-sm font-medium ${link}`}>{t("navFeatures")}</a>
          <a href="#pricing" className={`rounded-lg px-3 py-2 text-sm font-medium ${link}`}>{t("navPricing")}</a>
          <a href="#demo" className={`rounded-lg px-3 py-2 text-sm font-medium ${link}`}>{t("navDemo")}</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher dark={!solid} />
          <Link
            href="/portal"
            className={`hidden rounded-lg px-3 py-2 text-sm font-medium sm:block ${link}`}
          >
            {t("signIn")}
          </Link>
          <Link
            href="/portal"
            className="btn-sheen rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-strong"
          >
            {t("ctaTrial")}
          </Link>
        </div>
      </div>
    </header>
  );
}
