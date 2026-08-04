"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CreditCard,
  Factory,
  Gauge,
  Lock,
  MonitorSmartphone,
  Users,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getTenant, portalTenantId } from "@/lib/data";
import { daysUntil, formatDate } from "@/lib/format";
import type { LicenseStatus } from "@/lib/types";
import { DEMO_DATES, usePortalState } from "./PortalState";

const NAV = [
  { href: "/portal", key: "subscription", icon: Gauge, exact: true },
  { href: "/portal/billing", key: "billing", icon: CreditCard, exact: false },
  { href: "/portal/stations", key: "stations", icon: MonitorSmartphone, exact: false },
  { href: "/portal/users", key: "users", icon: Users, exact: false },
] as const;

const STATES: LicenseStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("portalNav");
  const tb = useTranslations("portalBanners");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const { status, setStatus } = usePortalState();

  const tenant = getTenant(portalTenantId)!;
  const suspended = status === "SUSPENDED";
  const billingPage = pathname.startsWith("/portal/billing");
  const locked = suspended && !billingPage;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
            <Factory className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{tc("appName")}</p>
            <p className="text-[11px] text-muted">{t("title")}</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map(({ href, key, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            const disabled = suspended && href !== "/portal/billing";
            return (
              <Link
                key={href}
                href={href}
                aria-disabled={disabled}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-accent-strong"
                    : disabled
                      ? "text-muted"
                      : "text-ink-2 hover:bg-neutral-soft"
                }`}
              >
                <Icon className="size-4" />
                {t(key)}
                {disabled && <Lock className="ml-auto size-3.5" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <LanguageSwitcher />
          <label className="block">
            <span className="text-[11px] font-medium text-muted">
              {t("statePreview")}
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LicenseStatus)}
              className="mt-1 w-full rounded-lg border border-line bg-page px-2 py-1.5 text-xs font-medium focus:border-accent focus:outline-none"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {ts(s)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium">{tenant.company}</p>
            <p className="text-[11px] text-muted">
              {tenant.ownerEmail} · {t("ownerRole")}
            </p>
          </div>
        </div>
      </aside>

      <main className="ml-60">
        {status === "TRIALING" && (
          <div className="flex items-center justify-center gap-3 bg-accent-soft px-6 py-2.5 text-sm text-accent-strong">
            <span>
              {tb("trialing", {
                days: daysUntil(DEMO_DATES.trialEndsAt),
                date: formatDate(DEMO_DATES.trialEndsAt),
              })}
            </span>
            <Link href="/portal" className="font-semibold underline">
              {tb("trialingCta")}
            </Link>
          </div>
        )}
        {status === "PAST_DUE" && (
          <div className="flex items-center justify-center gap-3 bg-critical px-6 py-2.5 text-sm font-medium text-white">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              {tb("pastDue", { days: daysUntil(DEMO_DATES.graceEndsAt) })}
            </span>
            <Link
              href="/portal/billing"
              className="rounded-md bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
            >
              {tb("pastDueCta")}
            </Link>
          </div>
        )}
        {status === "CANCELED" && (
          <div className="flex items-center justify-center bg-neutral-soft px-6 py-2.5 text-sm text-ink-2">
            {tb("canceled", { date: formatDate(DEMO_DATES.periodEndsAt) })}
          </div>
        )}

        <div className="px-8 py-8">
          <div className="mx-auto max-w-5xl">
            {locked ? <SuspendedLock /> : children}
          </div>
        </div>
      </main>
    </div>
  );
}

function SuspendedLock() {
  const tb = useTranslations("portalBanners");
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-critical-soft text-critical-text">
          <Lock className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">{tb("suspendedTitle")}</h1>
        <p className="mt-2 text-sm text-ink-2">{tb("suspendedBody")}</p>
        <Link
          href="/portal/billing"
          className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-strong"
        >
          {tb("suspendedCta")}
        </Link>
        <p className="mt-3 text-xs text-muted">{tb("suspendedNote")}</p>
      </div>
    </div>
  );
}
