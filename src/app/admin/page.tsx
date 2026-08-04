import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import MrrChart from "@/components/charts/MrrChart";
import StatusDistribution from "@/components/charts/StatusDistribution";
import { Card, PlanChip, StatCard, StatusBadge, Table, Td, Th } from "@/components/ui";
import {
  graceEndsAt,
  mrrHistory,
  statusCounts,
  tenants,
  totalMrr,
} from "@/lib/data";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";

export default function AdminDashboard() {
  const t = useTranslations("adminDashboard");

  const counts = statusCounts();
  const activeStations = tenants
    .filter((x) => x.status !== "CANCELED" && x.status !== "SUSPENDED")
    .reduce((s, x) => s + x.stationsUsed, 0);

  const trialsEnding = tenants
    .filter((x) => x.status === "TRIALING" && x.trialEndsAt)
    .sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!));

  const attention = tenants.filter(
    (x) => x.status === "PAST_DUE" || x.status === "SUSPENDED",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("kpiCustomers")}
          value={String(tenants.length)}
          delta="+2"
          deltaGood
          deltaLabel={t("vsLastMonth")}
        />
        <StatCard
          label={t("kpiMrr")}
          value={formatMoney(totalMrr())}
          delta="+8%"
          deltaGood
          deltaLabel={t("vsLastMonth")}
        />
        <StatCard
          label={t("kpiActiveStations")}
          value={String(activeStations)}
          delta="+6"
          deltaGood
          deltaLabel={t("vsLastMonth")}
        />
        <StatCard
          label={t("kpiChurn")}
          value="1.8%"
          delta="+0.4pt"
          deltaGood={false}
          deltaLabel={t("vsLastMonth")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title={t("mrrTrendTitle")}
          subtitle={t("mrrTrendSubtitle")}
          className="xl:col-span-2"
        >
          <MrrChart data={mrrHistory} />
        </Card>
        <Card title={t("distributionTitle")}>
          <StatusDistribution counts={counts} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t("trialsEndingTitle")} padded={false}>
          {trialsEnding.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">{t("trialsEndingEmpty")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("colCompany")}</Th>
                  <Th>{t("colPlan")}</Th>
                  <Th>{t("colStations")}</Th>
                  <Th align="right">{t("colTrialEnds")}</Th>
                </tr>
              </thead>
              <tbody>
                {trialsEnding.map((x) => {
                  const days = daysUntil(x.trialEndsAt!);
                  return (
                    <tr key={x.id} className="hover:bg-neutral-soft/50">
                      <Td>
                        <Link
                          href={`/admin/customers/${x.id}`}
                          className="font-medium text-ink hover:text-accent-strong"
                        >
                          {x.company}
                        </Link>
                      </Td>
                      <Td>
                        <PlanChip plan={x.plan} />
                      </Td>
                      <Td className="text-ink-2">{x.stationsUsed}</Td>
                      <Td align="right">
                        <span
                          className={`text-sm font-medium ${days <= 3 ? "text-warning-text" : "text-ink-2"}`}
                        >
                          {days === 0 ? t("endsToday") : t("daysLeft", { days })}
                        </span>
                        <span className="ml-2 text-xs text-muted">
                          {formatDate(x.trialEndsAt!)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title={t("attentionTitle")} padded={false}>
          {attention.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">{t("attentionEmpty")}</p>
          ) : (
            <ul>
              {attention.map((x) => {
                const grace = graceEndsAt(x);
                return (
                  <li
                    key={x.id}
                    className="flex items-center gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                  >
                    <StatusBadge status={x.status} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{x.company}</p>
                      <p className="text-xs text-muted">
                        {x.status === "PAST_DUE" && grace
                          ? t("graceEnds", { date: formatDate(grace) })
                          : x.suspendedSince
                            ? t("suspendedSince", { date: formatDate(x.suspendedSince) })
                            : null}
                      </p>
                    </div>
                    <Link
                      href={`/admin/customers/${x.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline"
                    >
                      {t("openCustomer")}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
