"use client";

import { useTranslations } from "next-intl";
import MesCatalogSettings from "@/components/mes/MesCatalogSettings";

export default function ManagerSettingsPage() {
  const t = useTranslations("mes.settings");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("managerSubtitle")}</p>
      </div>
      {/* Cost rates stay admin-only; the manager extends the catalogs. */}
      <MesCatalogSettings />
    </div>
  );
}
