"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SITE_CONTENT, DEFAULT_SITE_NAV } from "@/lib/data";
import type { SiteContent, SiteNav } from "@/lib/demo-types";

export interface SiteConfig {
  nav: SiteNav;
  content: SiteContent;
}

const FALLBACK: SiteConfig = { nav: DEFAULT_SITE_NAV, content: DEFAULT_SITE_CONTENT };

// Shared across all landing sections so the page makes ONE /api/site request.
let shared: Promise<SiteConfig> | null = null;
function fetchOnce(): Promise<SiteConfig> {
  if (!shared) {
    shared = fetch("/api/site")
      .then((r) => (r.ok ? r.json() : FALLBACK))
      .then((d: Partial<SiteConfig>) => ({
        nav: d?.nav?.menus ? (d.nav as SiteNav) : FALLBACK.nav,
        content: d?.content ? (d.content as SiteContent) : FALLBACK.content,
      }))
      .catch(() => FALLBACK);
  }
  return shared;
}

/**
 * Reads the admin-managed landing config. Renders the bundled default instantly
 * (SSR-safe, no flash) then refreshes from /api/site so edits show up live.
 */
export function useSiteConfig(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(FALLBACK);
  useEffect(() => {
    let alive = true;
    fetchOnce().then((c) => {
      if (alive) setCfg(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}
