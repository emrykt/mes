"use client";

import { useTranslations } from "next-intl";
import MembersAdmin from "@/components/portal/MembersAdmin";

export default function PortalUsersPage() {
  const t = useTranslations("portalUsers");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>
      <MembersAdmin />
    </div>
  );
}
