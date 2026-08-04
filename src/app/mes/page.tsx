"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Boxes,
  Briefcase,
  Factory,
  Gauge,
  MonitorSmartphone,
  ShoppingCart,
  Tv,
  Wrench,
} from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";

const FACES = [
  { href: "/mes/operator", key: "operator", desc: "operatorDesc", icon: MonitorSmartphone },
  { href: "/mes/sales", key: "sales", desc: "salesDesc", icon: ShoppingCart },
  { href: "/mes/manager", key: "manager", desc: "managerDesc", icon: Gauge },
  { href: "/mes/maintenance", key: "maintenance", desc: "maintenanceDesc", icon: Wrench, dept: true },
  { href: "/mes/stock", key: "stock", desc: "stockDesc", icon: Boxes, feature: "stock" },
  { href: "/mes/executive", key: "executive", desc: "executiveDesc", icon: Briefcase },
  { href: "/mes/tv", key: "tv", desc: "tvDesc", icon: Tv },
] as const;

export default function MesChooserPage() {
  const t = useTranslations("mes.chooser");
  const tc = useTranslations("common");
  const { snap } = useDemo();
  const ownDept = snap?.settings.maintenanceOwnDepartment ?? true;
  const stockOn = snap?.settings.features.stock ?? true;

  const faces = FACES.filter(
    (f) =>
      (!("dept" in f) || ownDept) &&
      (!("feature" in f) || stockOn),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white">
          <Factory className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-ink-2">{t("subtitle")}</p>
        </div>
      </div>

      <p className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-good-soft px-3 py-1 text-xs font-medium text-good-text">
        <span className="size-1.5 animate-pulse rounded-full bg-good" />
        {t("liveBadge")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {faces.map(({ href, key, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(11,11,11,0.04)] hover:border-accent"
          >
            <Icon className="size-6 text-accent" />
            <p className="mt-3 flex items-center gap-1.5 font-semibold">
              {t(key)}
              <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-sm text-ink-2">{t(desc)}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted">{tc("demoData")}</p>
    </main>
  );
}
