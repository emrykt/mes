"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Power } from "lucide-react";
import { Card, HeartbeatBadge, Table, Td, Th } from "@/components/ui";
import { getTenant, heartbeatState, portalTenantId, stationsFor } from "@/lib/data";
import { formatAgo } from "@/lib/format";

export default function PortalStationsPage() {
  const t = useTranslations("portalStations");
  const [code, setCode] = useState<string | null>(null);

  const tenant = getTenant(portalTenantId)!;
  const stations = stationsFor(tenant);

  function generate() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const part = () =>
      Array.from({ length: 4 }, () =>
        alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
      ).join("");
    setCode(`${part()}-${part()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {t("subtitleUnlimited", { used: tenant.stationsUsed })}
          </p>
        </div>
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
        >
          <Plus className="size-4" />
          {t("generateCode")}
        </button>
      </div>

      {code && (
        <Card title={t("codeTitle")} subtitle={t("codeHelp")}>
          <p
            className="text-3xl font-semibold tracking-[0.3em] text-accent-strong"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {code}
          </p>
        </Card>
      )}

      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colName")}</Th>
              <Th>{t("colDevice")}</Th>
              <Th>{t("colLastHeartbeat")}</Th>
              <Th>{t("colState")}</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td>
                  <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs text-ink-2">
                    {s.deviceId}
                  </code>
                </Td>
                <Td className="text-ink-2">
                  {s.lastHeartbeatAt ? formatAgo(s.lastHeartbeatAt) : "—"}
                </Td>
                <Td>
                  <HeartbeatBadge state={heartbeatState(s)} />
                </Td>
                <Td align="right">
                  <button className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-critical-text">
                    <Power className="size-3.5" />
                    {t("deactivate")}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
