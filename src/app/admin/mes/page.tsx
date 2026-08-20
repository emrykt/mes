"use client";

import { useTranslations } from "next-intl";
import { DemoProvider } from "@/components/demo/DemoProvider";
import MesCatalogSettings from "@/components/mes/MesCatalogSettings";
import AdminSubscription from "@/components/admin/AdminSubscription";
import CompanySwitcher from "@/components/mes/CompanySwitcher";

export default function AdminMesSettingsPage() {
  const t = useTranslations("mes.settings");

  return (
    <DemoProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
          </div>
          <CompanySwitcher />
        </div>
        <AdminSubscription />
        <MesCatalogSettings withCosts />
      </div>
    </DemoProvider>
  );
}
