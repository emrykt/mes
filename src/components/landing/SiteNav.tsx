"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Factory, Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { DEFAULT_SITE_NAV } from "@/lib/data";
import type { NavLink as NavLinkT, NavMenu } from "@/lib/demo-types";

/** Internal paths use client-side routing; anchors/hash use a plain link. */
function PanelLink({ item, onClick }: { item: NavLinkT; onClick: () => void }) {
  const href = item.href || "#";
  const inner = (
    <>
      <span className="block text-sm font-semibold text-ink group-hover/item:text-accent-strong">
        {item.title}
      </span>
      {item.description && (
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-2">
          {item.description}
        </span>
      )}
    </>
  );
  const cls = "group/item block rounded-lg p-2.5 transition-colors hover:bg-accent-soft/50";
  return href.startsWith("/") ? (
    <Link href={href} className={cls} onClick={onClick}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls} onClick={onClick}>
      {inner}
    </a>
  );
}

/**
 * Landing mega-menu. Transparent over the dark hero, solidifies on scroll (or
 * whenever a panel is open). Menu content is admin-managed: it renders the
 * bundled default instantly, then refreshes from /api/site-nav so edits show up
 * without a rebuild.
 */
export default function SiteNav() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const [solid, setSolid] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menus, setMenus] = useState<NavMenu[]>(DEFAULT_SITE_NAV.menus);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/site-nav")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.menus?.length) setMenus(d.menus);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenId(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMenu = menus.find((m) => m.id === openId);
  const lit = solid || openId !== null; // dark text once a panel is open
  const link = lit ? "text-ink-2 hover:bg-neutral-soft" : "text-white/80 hover:bg-white/10";

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        lit
          ? "border-b border-line/70 bg-page/90 backdrop-blur"
          : "border-b border-transparent"
      }`}
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        {/* brand */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpenId(null)}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <Factory className="size-4.5" />
          </span>
          <span className={`text-lg font-semibold tracking-tight ${lit ? "text-ink" : "text-white"}`}>
            {tc("appName")}
          </span>
        </Link>

        {/* desktop menus */}
        <nav className="hidden items-center gap-1 lg:flex" onMouseEnter={cancelClose}>
          {menus.map((m) => (
            <button
              key={m.id}
              onMouseEnter={() => setOpenId(m.id)}
              onClick={() => setOpenId((cur) => (cur === m.id ? null : m.id))}
              aria-expanded={openId === m.id}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${link} ${
                openId === m.id ? (lit ? "bg-neutral-soft" : "bg-white/10") : ""
              }`}
            >
              {m.label}
              <ChevronDown
                className={`size-3.5 transition-transform ${openId === m.id ? "rotate-180" : ""}`}
              />
            </button>
          ))}
          <a href="#pricing" className={`rounded-lg px-3 py-2 text-sm font-medium ${link}`}>
            {t("navPricing")}
          </a>
        </nav>

        {/* right */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <LanguageSwitcher dark={!lit} />
          </div>
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
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className={`rounded-lg p-2 lg:hidden ${link}`}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* desktop mega panel */}
      {openMenu && (
        <div
          className="hidden border-t border-line/70 bg-page/98 shadow-xl backdrop-blur lg:block"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
              <div>
                {openMenu.headline && (
                  <h3 className="text-xl font-semibold tracking-tight text-ink">
                    {openMenu.headline}
                  </h3>
                )}
                {openMenu.intro && (
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-2">
                    {openMenu.intro}
                  </p>
                )}
                {openMenu.ctaLabel && (
                  <a
                    href={openMenu.ctaHref || "#"}
                    onClick={() => setOpenId(null)}
                    className="btn-sheen mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
                  >
                    {openMenu.ctaLabel}
                  </a>
                )}
              </div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                {openMenu.items.map((it, i) => (
                  <PanelLink key={i} item={it} onClick={() => setOpenId(null)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-line/70 bg-page lg:hidden">
          <div className="space-y-5 px-6 py-5">
            {menus.map((m) => (
              <div key={m.id}>
                <p className="text-sm font-semibold text-ink">{m.label}</p>
                <div className="mt-1.5 space-y-0.5">
                  {m.items.map((it, i) => (
                    <PanelLink key={i} item={it} onClick={() => setMobileOpen(false)} />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 border-t border-line/70 pt-4">
              <LanguageSwitcher />
              <Link
                href="/portal"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-ink-2"
              >
                {t("signIn")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
