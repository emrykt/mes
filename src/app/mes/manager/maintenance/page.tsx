"use client";

import { useTranslations } from "next-intl";
import PlannedMaintenance from "@/components/mes/PlannedMaintenance";

/** Reachable within Production only when Maintenance is not a separate
 *  department; otherwise Maintenance has its own screen at /mes/maintenance. */
export default function ManagerMaintenancePage() {
  const t = useTranslations("mes.maintenance");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>
      <PlannedMaintenance />
    </div>
  );
}
