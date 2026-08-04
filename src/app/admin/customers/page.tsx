"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Card, PlanChip, StatusBadge, Table, Td, Th } from "@/components/ui";
import { mrrContribution, tenants } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import type { LicenseStatus, PlanId } from "@/lib/types";

const STATUSES: LicenseStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
];
const PLAN_IDS: PlanId[] = ["BASIC", "AIPRO", "AIULTIMATE"];

export default function CustomersPage() {
  const t = useTranslations("adminCustomers");
  const ts = useTranslations("status");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [plan, setPlan] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((x) => {
      if (status !== "all" && x.status !== status) return false;
      if (plan !== "all" && x.plan !== plan) return false;
      if (
        q &&
        ![x.company, x.ownerEmail, x.country]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [query, status, plan]);

  const selectClass =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {t("count", { count: filtered.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative grow sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
          aria-label={t("filterStatus")}
        >
          <option value="all">
            {t("filterStatus")}: {t("all")}
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className={selectClass}
          aria-label={t("filterPlan")}
        >
          <option value="all">
            {t("filterPlan")}: {t("all")}
          </option>
          {PLAN_IDS.map((p) => (
            <option key={p} value={p}>
              {tp(p)}
            </option>
          ))}
        </select>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colCompany")}</Th>
                <Th>{t("colPlan")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colStations")}</Th>
                <Th>{t("colNextInvoice")}</Th>
                <Th align="right">{t("colMrr")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => {
                return (
                  <tr key={x.id} className="hover:bg-neutral-soft/50">
                    <Td>
                      <Link
                        href={`/admin/customers/${x.id}`}
                        className="font-medium text-ink hover:text-accent-strong"
                      >
                        {x.company}
                      </Link>
                      <p className="text-xs text-muted">
                        {x.country} · {x.ownerEmail}
                      </p>
                    </Td>
                    <Td>
                      <PlanChip plan={x.plan} />
                    </Td>
                    <Td>
                      <StatusBadge status={x.status} />
                    </Td>
                    <Td className="text-ink-2" >
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {x.stationsUsed}
                      </span>
                    </Td>
                    <Td className="text-ink-2">
                      {x.nextInvoiceAt ? formatDate(x.nextInvoiceAt) : "—"}
                    </Td>
                    <Td align="right" className="font-medium">
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatMoney(mrrContribution(x))}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
