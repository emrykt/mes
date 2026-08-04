"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  Factory,
  LayoutDashboard,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/customers", key: "customers", icon: Users, exact: false },
  { href: "/admin/invoices", key: "invoices", icon: ReceiptText, exact: false },
  { href: "/admin/mes", key: "mesSettings", icon: SlidersHorizontal, exact: false },
  { href: "/admin/settings", key: "settings", icon: Settings, exact: false },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("adminNav");
  const tc = useTranslations("common");

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-chrome text-chrome-ink">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Factory className="size-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{tc("appName")}</p>
          <p className="text-[11px] text-chrome-ink/70">{t("title")}</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ href, key, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-chrome-2 text-white"
                  : "text-chrome-ink hover:bg-chrome-2/60 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-5 py-4">
        <LanguageSwitcher dark />
        <div>
          <p className="text-sm font-medium text-white">{t("userName")}</p>
          <p className="text-[11px] text-chrome-ink/70">{t("userRole")}</p>
        </div>
      </div>
    </aside>
  );
}
