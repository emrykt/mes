import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import AdminActions from "@/components/admin/AdminActions";
import {
  Card,
  HeartbeatBadge,
  InvoiceBadge,
  PlanChip,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import {
  PLANS,
  auditFor,
  getTenant,
  graceEndsAt,
  heartbeatState,
  invoicesFor,
  mrrContribution,
  notesFor,
  stationsFor,
  usersFor,
} from "@/lib/data";
import { formatAgo, formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = getTenant(id);
  if (!tenant) notFound();

  const t = await getTranslations("adminCustomerDetail");
  const tc = await getTranslations("common");

  const plan = PLANS[tenant.plan];
  const stations = stationsFor(tenant);
  const invoices = invoicesFor(tenant.id);
  const users = usersFor(tenant);
  const audit = auditFor(tenant);
  const notes = notesFor(tenant);
  const grace = graceEndsAt(tenant);

  const overview = [
    {
      label: t("cardStations"),
      value: String(tenant.stationsUsed),
    },
    {
      label: t("cardNextInvoice"),
      value: tenant.nextInvoiceAt ? formatDate(tenant.nextInvoiceAt) : "—",
      sub:
        tenant.status === "TRIALING" && tenant.trialEndsAt
          ? t("trialEnds", { date: formatDate(tenant.trialEndsAt) })
          : tenant.status === "PAST_DUE" && grace
            ? t("graceEnds", { date: formatDate(grace) })
            : tenant.canceledAt
              ? t("canceledOn", { date: formatDate(tenant.canceledAt) })
              : undefined,
    },
    {
      label: t("cardMrr"),
      value: formatMoney(mrrContribution(tenant)),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tenant.company}
          </h1>
          <StatusBadge status={tenant.status} />
          <PlanChip plan={tenant.plan} />
        </div>
        <p className="mt-1 text-sm text-ink-2">
          {tenant.country} · {tenant.ownerEmail} ·{" "}
          {t("customerSince", { date: formatDate(tenant.createdAt) })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {overview.map((o) => (
          <div
            key={o.label}
            className="rounded-xl border border-line bg-surface px-5 py-4"
          >
            <p className="text-xs font-medium text-muted">{o.label}</p>
            <p className="mt-1.5 text-xl font-semibold">{o.value}</p>
            {o.sub && <p className="mt-1 text-xs text-warning-text">{o.sub}</p>}
          </div>
        ))}
      </div>

      <Card title={t("actionsTitle")} subtitle={t("actionsSubtitle")}>
        <AdminActions status={tenant.status} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t("sectionInvoices")} padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("colNumber")}</Th>
                <Th>{t("colDate")}</Th>
                <Th>{t("colInvoiceStatus")}</Th>
                <Th align="right">{t("colAmount")}</Th>
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
                    {formatMoney(inv.amount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title={t("sectionUsers")} padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("colName")}</Th>
                <Th>{t("colRole")}</Th>
                <Th align="right">{t("colLastLogin")}</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </Td>
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

      <Card title={t("sectionStations")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colStationName")}</Th>
              <Th>{t("colDevice")}</Th>
              <Th>{t("colActivated")}</Th>
              <Th>{t("colLastHeartbeat")}</Th>
              <Th align="right">{t("colState")}</Th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-ink-2">
                  <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs">
                    {s.deviceId}
                  </code>
                </Td>
                <Td className="text-ink-2">{formatDate(s.activatedAt)}</Td>
                <Td className="text-ink-2">
                  {s.lastHeartbeatAt ? formatAgo(s.lastHeartbeatAt) : "—"}
                </Td>
                <Td align="right">
                  <HeartbeatBadge state={heartbeatState(s)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t("sectionAudit")} padded={false}>
          <ul>
            {audit.map((a) => (
              <li
                key={a.id}
                className="border-b border-line/60 px-5 py-3 last:border-b-0"
              >
                <p className="text-sm">{a.action}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDateTime(a.at)} ·{" "}
                  <code className="rounded bg-neutral-soft px-1 py-0.5">
                    {a.actor}
                  </code>
                  {a.reason && <span> — “{a.reason}”</span>}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={t("sectionNotes")}
          action={
            <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-neutral-soft">
              {t("addNote")}
            </button>
          }
          padded={false}
        >
          {notes.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">—</p>
          ) : (
            <ul>
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-line/60 px-5 py-3 last:border-b-0"
                >
                  <p className="text-sm text-ink-2">{n.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.author} · {formatDateTime(n.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
