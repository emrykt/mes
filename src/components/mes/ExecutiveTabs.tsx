"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/mes/executive", key: "tabPulse", exact: true },
  { href: "/mes/executive/kpi", key: "tabKpi", exact: false },
  { href: "/mes/executive/performance", key: "tabPerformance", exact: false },
  { href: "/mes/executive/costs", key: "tabCosts", exact: false },
  { href: "/mes/executive/assistant", key: "tabAssistant", exact: false },
] as const;

export default function ExecutiveTabs() {
  const pathname = usePathname();
  const t = useTranslations("mes.executive");

  return (
    <nav className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 sm:flex">
      {TABS.map(({ href, key, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-2 py-2 text-center text-sm font-medium transition-colors sm:flex-1 ${
              active
                ? "bg-accent text-white"
                : "text-ink-2 hover:bg-neutral-soft"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
