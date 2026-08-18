import type {
  AuditEntry,
  HeartbeatState,
  Invoice,
  PlanDef,
  PlanEntitlements,
  PlanId,
  Station,
  SupportNote,
  Tenant,
  TenantUser,
} from "./types";
import type { PricingConfig } from "./demo-types";

/** Fixed demo clock so heartbeat states and countdowns render deterministically. */
export const NOW = new Date("2026-07-07T09:00:00Z");

/**
 * Feature-tiered plans (no station limits). Basic = full MES core; AI Pro adds
 * the Smart Manufacturing Assistant, sector benchmark and advanced analytics;
 * AI Ultimate is "contact us" (multi-plant + API — marketing only this phase).
 */
export const PLANS: Record<PlanId, PlanDef> = {
  BASIC: { id: "BASIC", monthlyPrice: 199, contact: false, stripePriceId: "price_basic_monthly_usd" },
  AIPRO: { id: "AIPRO", monthlyPrice: 299, contact: false, stripePriceId: "price_aipro_monthly_usd" },
  AIULTIMATE: { id: "AIULTIMATE", monthlyPrice: 499, contact: true, stripePriceId: "price_ultimate_monthly_usd" },
};

export const PLAN_ORDER: PlanId[] = ["BASIC", "AIPRO", "AIULTIMATE"];

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  BASIC: {
    aiAssistant: false,
    sectorBenchmark: false,
    advancedAnalytics: false,
    quoting: false,
    maintenance: false,
    stock: false,
    multiPlant: false,
    apiIntegration: false,
  },
  AIPRO: {
    aiAssistant: true,
    sectorBenchmark: true,
    advancedAnalytics: true,
    quoting: true,
    maintenance: true,
    stock: true,
    multiPlant: false,
    apiIntegration: false,
  },
  AIULTIMATE: {
    aiAssistant: true,
    sectorBenchmark: true,
    advancedAnalytics: true,
    quoting: true,
    maintenance: true,
    stock: true,
    multiPlant: true,
    apiIntegration: true,
  },
};

/** Data-retention window (months) included with each plan. */
export const PLAN_RETENTION_MONTHS: Record<PlanId, number> = {
  BASIC: 3,
  AIPRO: 6,
  AIULTIMATE: 12,
};

/** Default global pricing (admin-editable at runtime; this is the seed). */
export const DEFAULT_PRICING: PricingConfig = {
  plans: { BASIC: 199, AIPRO: 299, AIULTIMATE: 499 },
  addonTiers: [
    { years: 1, price: 99 },
    { years: 2, price: 149 },
    { years: 3, price: 199 },
    { years: 5, price: 299 },
  ],
};

export const tenants: Tenant[] = [
  {
    id: "t-001",
    company: "Ironworks Metal Inc.",
    country: "TR",
    ownerEmail: "owner@ironworksmetal.com",
    plan: "AIPRO",
    status: "ACTIVE",
    stationsUsed: 8,
    createdAt: "2025-11-12T10:00:00Z",
    nextInvoiceAt: "2026-07-28T00:00:00Z",
  },
  {
    id: "t-002",
    company: "Stella Sheet Ltd.",
    country: "TR",
    ownerEmail: "info@stellasheet.com",
    plan: "BASIC",
    status: "TRIALING",
    stationsUsed: 3,
    createdAt: "2026-06-19T14:20:00Z",
    trialEndsAt: "2026-07-19T14:20:00Z",
    nextInvoiceAt: "2026-07-19T14:20:00Z",
  },
  {
    id: "t-003",
    company: "Steelworks GmbH",
    country: "DE",
    ownerEmail: "ops@steelworks.de",
    plan: "AIULTIMATE",
    status: "ACTIVE",
    stationsUsed: 14,
    createdAt: "2025-08-02T09:00:00Z",
    nextInvoiceAt: "2026-08-02T00:00:00Z",
  },
  {
    id: "t-004",
    company: "Riverside Machining",
    country: "TR",
    ownerEmail: "billing@riverside-mach.com",
    plan: "BASIC",
    status: "PAST_DUE",
    stationsUsed: 5,
    createdAt: "2026-01-05T08:00:00Z",
    pastDueSince: "2026-07-05T06:00:00Z",
    nextInvoiceAt: "2026-07-05T00:00:00Z",
  },
  {
    id: "t-005",
    company: "Precision Sheet Co.",
    country: "US",
    ownerEmail: "billing@precisionsheet.com",
    plan: "AIPRO",
    status: "SUSPENDED",
    stationsUsed: 6,
    createdAt: "2025-10-21T16:00:00Z",
    pastDueSince: "2026-06-17T00:00:00Z",
    suspendedSince: "2026-06-20T00:00:00Z",
  },
  {
    id: "t-006",
    company: "Nordfertigung AG",
    country: "DE",
    ownerEmail: "it@nordfertigung.de",
    plan: "AIPRO",
    status: "ACTIVE",
    stationsUsed: 10,
    createdAt: "2025-09-15T11:00:00Z",
    nextInvoiceAt: "2026-07-15T00:00:00Z",
  },
  {
    id: "t-007",
    company: "Aegean Metalworks",
    country: "TR",
    ownerEmail: "ops@aegeanmetalworks.com",
    plan: "BASIC",
    status: "TRIALING",
    stationsUsed: 2,
    createdAt: "2026-06-09T09:30:00Z",
    trialEndsAt: "2026-07-09T09:30:00Z",
    nextInvoiceAt: "2026-07-09T09:30:00Z",
  },
  {
    id: "t-008",
    company: "Lakeshore Fabrication",
    country: "US",
    ownerEmail: "admin@lakeshorefab.com",
    plan: "AIULTIMATE",
    status: "ACTIVE",
    stationsUsed: 22,
    createdAt: "2025-06-30T13:00:00Z",
    nextInvoiceAt: "2026-07-30T00:00:00Z",
  },
  {
    id: "t-009",
    company: "Baltic Steel OÜ",
    country: "EE",
    ownerEmail: "office@baltiksteel.ee",
    plan: "BASIC",
    status: "CANCELED",
    stationsUsed: 0,
    createdAt: "2025-12-01T10:00:00Z",
    canceledAt: "2026-06-30T00:00:00Z",
  },
  {
    id: "t-010",
    company: "Summit Tooling Co.",
    country: "TR",
    ownerEmail: "info@summittooling.com",
    plan: "AIPRO",
    status: "ACTIVE",
    stationsUsed: 4,
    createdAt: "2026-03-11T09:00:00Z",
    nextInvoiceAt: "2026-07-11T00:00:00Z",
  },
];

export const GRACE_DAYS = 3;

export function getTenant(id: string): Tenant | undefined {
  return tenants.find((t) => t.id === id);
}

export function mrrContribution(t: Tenant): number {
  return t.status === "ACTIVE" || t.status === "PAST_DUE"
    ? PLANS[t.plan].monthlyPrice
    : 0;
}

export function totalMrr(): number {
  return tenants.reduce((sum, t) => sum + mrrContribution(t), 0);
}

export function statusCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tenants) counts[t.status] = (counts[t.status] ?? 0) + 1;
  return counts;
}

export function graceEndsAt(t: Tenant): string | undefined {
  if (!t.pastDueSince) return undefined;
  const end = new Date(t.pastDueSince);
  end.setUTCDate(end.getUTCDate() + GRACE_DAYS);
  return end.toISOString();
}

/** Last 12 months of MRR for the trend chart (USD), trending to today's total. */
export const mrrHistory: { month: string; value: number }[] = [
  { month: "2025-08", value: 900 },
  { month: "2025-09", value: 1100 },
  { month: "2025-10", value: 1300 },
  { month: "2025-11", value: 1400 },
  { month: "2025-12", value: 1600 },
  { month: "2026-01", value: 1700 },
  { month: "2026-02", value: 1700 },
  { month: "2026-03", value: 1800 },
  { month: "2026-04", value: 1895 },
  { month: "2026-05", value: 1994 },
  { month: "2026-06", value: 1994 },
  { month: "2026-07", value: 2094 },
];

export function heartbeatState(station: Station): HeartbeatState {
  if (!station.active || !station.lastHeartbeatAt) return "offline";
  const ageMin = (NOW.getTime() - new Date(station.lastHeartbeatAt).getTime()) / 60000;
  if (ageMin <= 10) return "online";
  if (ageMin <= 24 * 60) return "stale";
  return "offline";
}

const stationNames = [
  "Laser Cutter 1",
  "Laser Cutter 2",
  "Press Brake 1",
  "Press Brake 2",
  "Punch Press",
  "Welding Station 1",
  "Welding Station 2",
  "Assembly Line",
  "Quality Control",
  "Packaging",
  "Plasma Cutter",
  "Bending Line",
];

function minutesAgo(min: number): string {
  return new Date(NOW.getTime() - min * 60000).toISOString();
}

/** Deterministic station list per tenant, derived from stationsUsed. */
export function stationsFor(tenant: Tenant): Station[] {
  const count = Math.max(tenant.stationsUsed, 0);
  return Array.from({ length: count }, (_, i) => {
    // spread heartbeats: most online, a couple stale/offline for realism
    const ageMin = i % 7 === 5 ? 60 * 30 : i % 7 === 3 ? 95 : 2 + i * 2;
    return {
      id: `${tenant.id}-st-${i + 1}`,
      name: stationNames[i % stationNames.length] + (i >= stationNames.length ? ` ${Math.floor(i / stationNames.length) + 1}` : ""),
      deviceId: `KSK-${tenant.id.slice(2)}${String(i + 1).padStart(2, "0")}`,
      activatedAt: new Date(new Date(tenant.createdAt).getTime() + i * 86400000 * 3).toISOString(),
      lastHeartbeatAt: tenant.status === "SUSPENDED" ? minutesAgo(60 * 24 * 17) : minutesAgo(ageMin),
      active: true,
    };
  });
}

export function invoicesFor(tenantId: string): Invoice[] {
  return invoices.filter((i) => i.tenantId === tenantId);
}

export const invoices: Invoice[] = [
  { id: "in-101", tenantId: "t-001", number: "INV-2026-0189", date: "2026-06-28T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-102", tenantId: "t-001", number: "INV-2026-0154", date: "2026-05-28T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-103", tenantId: "t-001", number: "INV-2026-0121", date: "2026-04-28T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-104", tenantId: "t-001", number: "INV-2026-0088", date: "2026-03-28T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-201", tenantId: "t-003", number: "INV-2026-0191", date: "2026-07-02T00:00:00Z", amount: 499, status: "paid" },
  { id: "in-202", tenantId: "t-003", number: "INV-2026-0160", date: "2026-06-02T00:00:00Z", amount: 499, status: "paid" },
  { id: "in-301", tenantId: "t-004", number: "INV-2026-0193", date: "2026-07-05T00:00:00Z", amount: 199, status: "failed", attempts: 2, nextRetryAt: "2026-07-08T06:00:00Z" },
  { id: "in-302", tenantId: "t-004", number: "INV-2026-0158", date: "2026-06-05T00:00:00Z", amount: 199, status: "paid" },
  { id: "in-401", tenantId: "t-005", number: "INV-2026-0170", date: "2026-06-17T00:00:00Z", amount: 299, status: "failed", attempts: 4, nextRetryAt: "2026-07-09T00:00:00Z" },
  { id: "in-402", tenantId: "t-005", number: "INV-2026-0139", date: "2026-05-17T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-501", tenantId: "t-006", number: "INV-2026-0182", date: "2026-06-15T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-601", tenantId: "t-008", number: "INV-2026-0186", date: "2026-06-30T00:00:00Z", amount: 499, status: "paid" },
  { id: "in-602", tenantId: "t-008", number: "INV-2026-0151", date: "2026-05-30T00:00:00Z", amount: 499, status: "paid" },
  { id: "in-701", tenantId: "t-010", number: "INV-2026-0176", date: "2026-06-11T00:00:00Z", amount: 299, status: "paid" },
  { id: "in-801", tenantId: "t-009", number: "INV-2026-0163", date: "2026-06-01T00:00:00Z", amount: 199, status: "paid" },
];

export function usersFor(tenant: Tenant): TenantUser[] {
  const domain = tenant.ownerEmail.split("@")[1];
  return [
    {
      id: `${tenant.id}-u1`,
      name: "Mark Turner",
      email: tenant.ownerEmail,
      role: "CUSTOMER_OWNER",
      lastLoginAt: minutesAgo(60 * 5),
    },
    {
      id: `${tenant.id}-u2`,
      name: "Anna Brooks",
      email: `ops@${domain}`,
      role: "CUSTOMER_USER",
      lastLoginAt: minutesAgo(60 * 26),
    },
    {
      id: `${tenant.id}-u3`,
      name: "James Miller",
      email: `tech@${domain}`,
      role: "CUSTOMER_USER",
      invited: true,
    },
  ];
}

export function auditFor(tenant: Tenant): AuditEntry[] {
  const base: AuditEntry[] = [
    {
      id: `${tenant.id}-a1`,
      at: tenant.createdAt,
      actor: "system",
      action: "Tenant created via Stripe Checkout (trial started)",
    },
  ];
  if (tenant.status === "ACTIVE") {
    base.unshift({
      id: `${tenant.id}-a2`,
      at: "2026-06-28T00:05:00Z",
      actor: "stripe-webhook",
      action: "invoice.paid → status ACTIVE, period updated",
    });
  }
  if (tenant.pastDueSince) {
    base.unshift({
      id: `${tenant.id}-a3`,
      at: tenant.pastDueSince,
      actor: "stripe-webhook",
      action: "invoice.payment_failed → status PAST_DUE, grace timer started (3 days)",
    });
  }
  if (tenant.suspendedSince) {
    base.unshift({
      id: `${tenant.id}-a4`,
      at: tenant.suspendedSince,
      actor: "scheduler",
      action: "Grace period expired → status SUSPENDED, data ingest disabled",
    });
  }
  if (tenant.id === "t-001") {
    base.unshift({
      id: `${tenant.id}-a5`,
      at: "2026-05-14T13:22:00Z",
      actor: "sarah@prodgence.com",
      action: "Plan changed BASIC → AI Pro (prorated)",
      reason: "Customer requested upgrade during onboarding call",
    });
  }
  return base;
}

export function notesFor(tenant: Tenant): SupportNote[] {
  if (tenant.id === "t-004") {
    return [
      {
        id: "n1",
        at: "2026-07-06T10:15:00Z",
        author: "Sarah Cohen",
        text: "Called owner about failed charge — new card arriving this week, asked us not to suspend before Friday.",
      },
    ];
  }
  if (tenant.id === "t-001") {
    return [
      {
        id: "n2",
        at: "2026-05-14T13:30:00Z",
        author: "Sarah Cohen",
        text: "Upgraded to Pro after adding second shift. Interested in Premium if they open the new hall in Q4.",
      },
    ];
  }
  return [];
}

/** The tenant whose data the customer portal demo shows. */
export const portalTenantId = "t-001";

export const portalCard = { last4: "4242", expires: "08 / 2027" };
