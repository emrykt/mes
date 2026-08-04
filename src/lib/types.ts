export type LicenseStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELED";

export type PlanId = "BASIC" | "AIPRO" | "AIULTIMATE";

export interface PlanDef {
  id: PlanId;
  /** Reference monthly price (USD). Used for MRR even when `contact` hides it. */
  monthlyPrice: number;
  /** Ultimate is "contact us" — the number is hidden on the pricing page. */
  contact: boolean;
  stripePriceId: string;
}

/** Feature entitlements per plan (station count is unlimited on every plan). */
export interface PlanEntitlements {
  /** Smart Manufacturing AI Assistant. */
  aiAssistant: boolean;
  /** Anonymous sector benchmark. */
  sectorBenchmark: boolean;
  /** Advanced analytics & deeper performance monitoring. */
  advancedAnalytics: boolean;
  /** Multi-plant management (marketing only in this phase). */
  multiPlant: boolean;
  /** API integration (marketing only in this phase). */
  apiIntegration: boolean;
}

export interface Tenant {
  id: string;
  company: string;
  country: string;
  ownerEmail: string;
  plan: PlanId;
  status: LicenseStatus;
  stationsUsed: number;
  createdAt: string;
  /** next billing date (ISO) — absent for canceled tenants */
  nextInvoiceAt?: string;
  trialEndsAt?: string;
  pastDueSince?: string;
  suspendedSince?: string;
  canceledAt?: string;
}

export type InvoiceStatus = "paid" | "open" | "failed" | "void";

export interface Invoice {
  id: string;
  tenantId: string;
  number: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  attempts?: number;
  nextRetryAt?: string;
}

export type HeartbeatState = "online" | "stale" | "offline";

export interface Station {
  id: string;
  name: string;
  deviceId: string;
  activatedAt: string;
  lastHeartbeatAt: string | null;
  active: boolean;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER_OWNER" | "CUSTOMER_USER";
  invited?: boolean;
  lastLoginAt?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  reason?: string;
}

export interface SupportNote {
  id: string;
  at: string;
  author: string;
  text: string;
}
