import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Card, InvoiceBadge, Table, Td, Th } from "@/components/ui";
import { getTenant, graceEndsAt, invoices } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default function InvoicesPage() {
  const t = useTranslations("adminInvoices");

  const failed = invoices.filter((i) => i.status === "failed");
  const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <Card title={t("dunningTitle")} subtitle={t("dunningSubtitle")} padded={false}>
        {failed.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">{t("dunningEmpty")}</p>
        ) : (
          <ul>
            {failed.map((inv) => {
              const tenant = getTenant(inv.tenantId);
              const grace = tenant ? graceEndsAt(tenant) : undefined;
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-critical-soft text-critical-text">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/customers/${inv.tenantId}`}
                      className="text-sm font-medium hover:text-accent-strong"
                    >
                      {tenant?.company}
                    </Link>
                    <p className="text-xs text-muted">
                      {inv.number} · {formatMoney(inv.amount)} ·{" "}
                      {t("attempts", { count: inv.attempts ?? 1 })}
                      {inv.nextRetryAt &&
                        ` · ${t("nextRetry", { date: formatDate(inv.nextRetryAt) })}`}
                    </p>
                  </div>
                  {grace && tenant?.status === "PAST_DUE" && (
                    <span className="ml-auto rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-text">
                      {t("graceEnds", { date: formatDate(grace) })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title={t("allInvoices")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colCompany")}</Th>
              <Th>{t("colNumber")}</Th>
              <Th>{t("colDate")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th align="right">{t("colAmount")}</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => (
              <tr key={inv.id} className="hover:bg-neutral-soft/50">
                <Td>
                  <Link
                    href={`/admin/customers/${inv.tenantId}`}
                    className="font-medium hover:text-accent-strong"
                  >
                    {getTenant(inv.tenantId)?.company}
                  </Link>
                </Td>
                <Td className="text-ink-2">{inv.number}</Td>
                <Td className="text-ink-2">{formatDate(inv.date)}</Td>
                <Td>
                  <InvoiceBadge status={inv.status} />
                </Td>
                <Td align="right" className="font-medium">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(inv.amount)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
