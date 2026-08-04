"use client";

import { useTranslations } from "next-intl";
import { CreditCard, Download, ExternalLink } from "lucide-react";
import { Card, InvoiceBadge, Table, Td, Th } from "@/components/ui";
import { usePortalState } from "@/components/portal/PortalState";
import { PLANS, getTenant, invoicesFor, portalCard, portalTenantId } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default function PortalBillingPage() {
  const t = useTranslations("portalBilling");
  const { status } = usePortalState();

  const tenant = getTenant(portalTenantId)!;
  const plan = PLANS[tenant.plan];
  const invoices = invoicesFor(tenant.id);
  const owes = status === "PAST_DUE" || status === "SUSPENDED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      {owes && (
        <Card className="border-critical/40">
          <p className="text-xs font-medium text-critical-text">
            {t("outstanding")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-2xl font-semibold">
              {formatMoney(plan.monthlyPrice)}
            </p>
            <button className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-strong">
              {t("payNow")}
            </button>
          </div>
        </Card>
      )}

      <Card title={t("paymentMethod")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-neutral-soft">
              <CreditCard className="size-5 text-ink-2" />
            </span>
            <div>
              <p className="text-sm font-medium">
                {t("cardEnding", { last4: portalCard.last4 })}
              </p>
              <p className="text-xs text-muted">
                {t("cardExpires", { date: portalCard.expires })}
              </p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft">
            {t("updateCard")}
            <ExternalLink className="size-3.5 text-muted" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">{t("updateCardNote")}</p>
      </Card>

      <Card title={t("invoicesTitle")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colNumber")}</Th>
              <Th>{t("colDate")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th align="right">{t("colAmount")}</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <Td className="font-medium">{inv.number}</Td>
                <Td className="text-ink-2">{formatDate(inv.date)}</Td>
                <Td>
                  <InvoiceBadge status={inv.status} />
                </Td>
                <Td align="right" className="font-medium">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(inv.amount)}
                  </span>
                </Td>
                <Td align="right">
                  <button className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline">
                    <Download className="size-3.5" />
                    {t("download")}
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
