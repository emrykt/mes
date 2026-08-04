"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bell,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  Wrench,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useDemo } from "@/components/demo/DemoProvider";

const NAV = [
  { href: "/mes/manager", key: "navOverview", icon: LayoutDashboard, exact: true },
  { href: "/mes/manager/orders", key: "navOrders", icon: ClipboardList, exact: false },
  { href: "/mes/manager/reports", key: "navReports", icon: BarChart3, exact: false },
  { href: "/mes/manager/maintenance", key: "navMaintenance", icon: Wrench, exact: false, feature: "maintenance", sharedDept: true },
  { href: "/mes/manager/performance", key: "navPerformance", icon: TrendingUp, exact: false },
  { href: "/mes/manager/alerts", key: "navAlerts", icon: Bell, exact: false, badge: true },
  { href: "/mes/manager/assistant", key: "navAssistant", icon: Sparkles, exact: false },
  { href: "/mes/manager/settings", key: "navSettings", icon: SlidersHorizontal, exact: false },
] as const;

/**
 * Production-manager face: top bar on desktop, bottom tab bar on mobile —
 * one responsive codebase for browser and phone.
 */
export default function MesManagerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("mes.manager");
  const tc = useTranslations("common");
  const { snap } = useDemo();

  const ownDept = snap?.settings.maintenanceOwnDepartment ?? true;
  const nav = NAV.filter((item) => {
    if ("feature" in item && !(snap?.settings.features[item.feature as "maintenance"] ?? false))
      return false;
    // maintenance lives on its own screen when it is a separate department
    if ("sharedDept" in item && ownDept) return false;
    return true;
  });
  const openAlerts = snap?.alerts.filter((a) => !a.acked).length ?? 0;

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
          <div className="ml-auto md:order-last">
            <LanguageSwitcher />
          </div>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ href, key, icon: Icon, exact, ...rest }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const showBadge = "badge" in rest && openAlerts > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-accent-soft text-accent-strong"
                      : "text-ink-2 hover:bg-neutral-soft"
                  }`}
                >
                  <span className="relative">
                    <Icon className="size-4" />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
                        {openAlerts}
                      </span>
                    )}
                  </span>
                  {t(key)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</main>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
        {nav.map(({ href, key, icon: Icon, exact, ...rest }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const showBadge = "badge" in rest && openAlerts > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-accent-strong" : "text-muted"
              }`}
            >
              <span className="relative">
                <Icon className="size-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
                    {openAlerts}
                  </span>
                )}
              </span>
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
