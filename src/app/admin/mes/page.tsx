"use client";

import { useTranslations } from "next-intl";
import { DemoProvider } from "@/components/demo/DemoProvider";
import MesCatalogSettings from "@/components/mes/MesCatalogSettings";

export default function AdminMesSettingsPage() {
  const t = useTranslations("mes.settings");

  return (
    <DemoProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
        </div>
        <MesCatalogSettings withCosts />
      </div>
    </DemoProvider>
  );
}
