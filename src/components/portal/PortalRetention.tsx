"use client";

import { useTranslations } from "next-intl";
import { Database, Check } from "lucide-react";
import { Card } from "@/components/ui";

/**
 * Data retention: every membership now includes UNLIMITED history for free —
 * the paid retention add-on was removed. Purely informational.
 */
export default function PortalRetention() {
  const t = useTranslations("portalSubscription");

  return (
    <Card title={t("retentionTitle")} subtitle={t("retentionSubtitle")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xl font-semibold">{t("retentionUnlimited")}</p>
          <p className="text-xs text-muted">{t("retentionUnlimitedNote")}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
        <li className="flex items-center gap-2"><Check className="size-4 text-good" /> {t("retentionPoint1")}</li>
        <li className="flex items-center gap-2"><Check className="size-4 text-good" /> {t("retentionPoint2")}</li>
      </ul>
    </Card>
  );
}
