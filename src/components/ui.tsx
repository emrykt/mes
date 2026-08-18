import { useTranslations } from "next-intl";
import type {
  HeartbeatState,
  InvoiceStatus,
  LicenseStatus,
  PlanId,
} from "@/lib/types";

/* ---------- badges ---------- */

const statusStyles: Record<LicenseStatus, string> = {
  TRIALING: "bg-accent-soft text-accent-strong",
  ACTIVE: "bg-good-soft text-good-text",
  PAST_DUE: "bg-warning-soft text-warning-text",
  SUSPENDED: "bg-critical-soft text-critical-text",
  CANCELED: "bg-neutral-soft text-ink-2",
};

const statusDots: Record<LicenseStatus, string> = {
  TRIALING: "bg-accent",
  ACTIVE: "bg-good",
  PAST_DUE: "bg-warning",
  SUSPENDED: "bg-critical",
  CANCELED: "bg-muted",
};

export function StatusBadge({ status }: { status: LicenseStatus }) {
  const t = useTranslations("status");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusStyles[status]}`}
    >
      <span className={`size-1.5 rounded-full ${statusDots[status]}`} />
      {t(status)}
    </span>
  );
}

const invoiceStyles: Record<InvoiceStatus, string> = {
  paid: "bg-good-soft text-good-text",
  open: "bg-accent-soft text-accent-strong",
  failed: "bg-critical-soft text-critical-text",
  void: "bg-neutral-soft text-ink-2",
};

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations("invoiceStatus");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStyles[status]}`}
    >
      {t(status)}
    </span>
  );
}

export function PlanChip({ plan }: { plan: PlanId }) {
  const t = useTranslations("plans");
  return (
    <span className="inline-flex rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2">
      {t(plan)}
    </span>
  );
}

const heartbeatStyles: Record<HeartbeatState, { dot: string; text: string }> = {
  online: { dot: "bg-good", text: "text-good-text" },
  stale: { dot: "bg-warning", text: "text-warning-text" },
  offline: { dot: "bg-muted", text: "text-muted" },
};

export function HeartbeatBadge({ state }: { state: HeartbeatState }) {
  const t = useTranslations("heartbeat");
  const s = heartbeatStyles[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {t(state)}
    </span>
  );
}

/* ---------- layout primitives ---------- */

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`card-elev rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,11,11,0.04)] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "px-5 pb-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaGood,
  deltaLabel,
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
  deltaLabel?: string;
  sub?: string;
}) {
  return (
    <div className="card-lift rounded-xl border border-line bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-ink">{value}</p>
      {(delta || sub) && (
        <p className="mt-1 text-xs text-muted">
          {delta && (
            <span className={deltaGood ? "font-medium text-good-text" : "font-medium text-critical-text"}>
              {delta}
            </span>
          )}
          {delta && deltaLabel && <span> {deltaLabel}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}

/* ---------- table primitives ---------- */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border-b border-line px-3 py-2 text-xs font-medium text-muted first:pl-5 last:pr-5 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`border-b border-line/60 px-3 py-2.5 first:pl-5 last:pr-5 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
