"use client";

import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Card, Table, Td, Th } from "@/components/ui";
import { getTenant, portalTenantId, usersFor } from "@/lib/data";
import { formatAgo } from "@/lib/format";

export default function PortalUsersPage() {
  const t = useTranslations("portalUsers");

  const tenant = getTenant(portalTenantId)!;
  const users = usersFor(tenant);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong">
          <UserPlus className="size-4" />
          {t("invite")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          <p className="text-sm font-semibold">{t("roleOwner")}</p>
          <p className="mt-1 text-xs text-ink-2">{t("roleOwnerHelp")}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          <p className="text-sm font-semibold">{t("roleUser")}</p>
          <p className="mt-1 text-xs text-ink-2">{t("roleUserHelp")}</p>
        </div>
      </div>

      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colName")}</Th>
              <Th>{t("colEmail")}</Th>
              <Th>{t("colRole")}</Th>
              <Th align="right">{t("colLastLogin")}</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.name}</Td>
                <Td className="text-ink-2">{u.email}</Td>
                <Td className="text-ink-2">
                  {u.role === "CUSTOMER_OWNER" ? t("roleOwner") : t("roleUser")}
                </Td>
                <Td align="right" className="text-ink-2">
                  {u.invited ? (
                    <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-xs">
                      {t("invited")}
                    </span>
                  ) : u.lastLoginAt ? (
                    formatAgo(u.lastLoginAt)
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
