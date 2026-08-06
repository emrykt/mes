"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, ClipboardList, Factory, FileText } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import { useDemo } from "@/components/demo/DemoProvider";

const NAV = [
  { href: "/mes/sales", key: "navOrders", icon: ClipboardList, exact: true },
  { href: "/mes/sales/quote", key: "navQuote", icon: FileText, exact: false, feature: "quoting" },
  { href: "/mes/sales/capacity", key: "navCapacity", icon: CalendarRange, exact: false },
] as const;

/** Sales face: order entry, quoting and idle-capacity outlook. */
export default function MesSalesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("mes.sales");
  const tc = useTranslations("common");
  const { snap } = useDemo();

  const nav = NAV.filter(
    (item) =>
      !("feature" in item) ||
      (snap?.settings.features[item.feature as "quoting"] ?? false),
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 md:px-6">
          <Link href="/mes" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
              <Factory className="size-4.5" />
            </span>
            <span className="text-sm font-semibold">{tc("appName")}</span>
          </Link>
          <span className="hidden text-sm font-medium text-ink-2 sm:inline">{t("shell")}</span>
          <div className="ml-auto flex items-center gap-2 md:order-last">
            <CompanySwitcher />
            <LanguageSwitcher />
          </div>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ href, key, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-accent-soft text-accent-strong"
                      : "text-ink-2 hover:bg-neutral-soft"
                  }`}
                >
                  <Icon className="size-4" />
                  {t(key)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
        {nav.map(({ href, key, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-accent-strong" : "text-muted"
              }`}
            >
              <Icon className="size-5" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
