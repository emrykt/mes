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
import type { PricingConfig, SiteContent, SiteNav } from "./demo-types";

/** Fixed demo clock so heartbeat states and countdowns render deterministically. */
export const NOW = new Date("2026-07-07T09:00:00Z");

/**
 * Feature-tiered plans (no station limits). Basic = full MES core; AI Pro adds
 * the Smart Manufacturing Assistant, sector benchmark and advanced analytics;
 * AI Ultimate is "contact us" (multi-plant + API — marketing only this phase).
 */
export const PLANS: Record<PlanId, PlanDef> = {
  BASIC: { id: "BASIC", monthlyPrice: 749, annualPrice: 499, contact: false, stripePriceId: "price_basic" },
  AIPRO: { id: "AIPRO", monthlyPrice: 999, annualPrice: 749, contact: false, stripePriceId: "price_aipro" },
  AIULTIMATE: { id: "AIULTIMATE", monthlyPrice: 1999, annualPrice: 1499, contact: true, stripePriceId: "price_flexible" },
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

/**
 * Default global pricing (admin-editable at runtime; this is the seed).
 * Prices are in EUR (billed from Germany). Data-retention add-ons were removed —
 * every membership includes UNLIMITED history for free, so `addonTiers` is empty.
 * AIULTIMATE (Enterprise) is contact-priced — its number is a placeholder and
 * is not shown to customers (portal renders "Contact us").
 */
export const DEFAULT_PRICING: PricingConfig = {
  // monthly-billing price (EUR/mo)
  plans: { BASIC: 749, AIPRO: 999, AIULTIMATE: 1999 },
  // annual-billing price (EUR/mo, billed yearly — the discounted headline rate)
  plansAnnual: { BASIC: 499, AIPRO: 749, AIULTIMATE: 1499 },
  addonTiers: [],
};

/** Compact on-brand SVG promo image (data URL) for a mega-menu panel. */
function menuImage(a: string, b: string, label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
    `<rect width='320' height='240' rx='16' fill='url(#g)'/>` +
    `<circle cx='255' cy='55' r='72' fill='rgba(255,255,255,0.13)'/>` +
    `<circle cx='60' cy='205' r='95' fill='rgba(255,255,255,0.08)'/>` +
    `<circle cx='170' cy='120' r='42' fill='none' stroke='rgba(255,255,255,0.25)' stroke-width='2'/>` +
    `<text x='24' y='212' font-family='system-ui,Arial,sans-serif' font-size='21' font-weight='700' fill='rgba(255,255,255,0.96)'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Default landing-page mega-menu (admin-editable at runtime). Seeded with rich,
 * trust-building content that mirrors the actual TURI product surface.
 */
export const DEFAULT_SITE_NAV: SiteNav = {
  menus: [
    {
      id: "products",
      label: "Products",
      image: menuImage("#0e8390", "#16a34a", "Products"),
      headline: "One AI platform for the whole shop floor",
      intro: "From the operator kiosk to the executive cockpit — every role on one connected system.",
      ctaLabel: "See the live demo",
      ctaHref: "/login",
      items: [
        { title: "Operator Kiosk", description: "Touch-first start/stop, quantity, scrap and andon — paperless work orders.", href: "/product/operator", icon: "cpu" },
        { title: "Production Management", description: "Live station grid, andon feed, downtime pareto and order routing.", href: "/product/production", icon: "dashboard" },
        { title: "Executive Cockpit", description: "Utilization, cost, revenue and a 0–1000 performance score at a glance.", href: "/product/executive", icon: "gauge" },
        { title: "Sales & Quoting", description: "Price jobs from station rates, save quotes and check free capacity.", href: "/product/sales", icon: "wallet" },
        { title: "Maintenance", description: "Planned maintenance calendar plus AI escalations from live faults.", href: "/product/maintenance", icon: "wrench" },
        { title: "Stock & Materials", description: "Weight- and piece-aware raw-material stock with automatic backflush.", href: "/product/stock", icon: "boxes" },
        { title: "Andon TV Board", description: "Full-screen live shop-floor status — never license-gated.", href: "/product/tv", icon: "tv" },
        { title: "Smart Assistant", description: "Ask the plant anything; get grounded, data-driven answers.", href: "/product/assistant", icon: "bot" },
      ],
    },
    {
      id: "solutions",
      label: "Solutions",
      image: menuImage("#16a34a", "#2f74d0", "Solutions"),
      headline: "Built for how metalworking shops actually run",
      intro: "Whether you cut sheet, turn shafts or do both, TURI adapts to your operations — no two-year rollout.",
      ctaLabel: "Explore pricing",
      ctaHref: "#pricing",
      items: [
        { title: "Sheet-metal fabrication", description: "Laser, plasma, press-brake and welding with nesting-aware batches.", href: "", icon: "zap" },
        { title: "CNC machining", description: "Sawing, turning, milling and drilling with tool and material tracking.", href: "", icon: "cpu" },
        { title: "Mixed fabrication", description: "Run cutting and machining side by side on one shared routing model.", href: "", icon: "factory" },
        { title: "Job shops", description: "Full MES on the Basic plan — no per-station limits, live in days.", href: "", icon: "rocket" },
        { title: "For operators", description: "Less paperwork, clearer priorities, instant help calls.", href: "", icon: "cpu" },
        { title: "For plant managers", description: "See the bottleneck, the root cause and what to do next.", href: "", icon: "dashboard" },
        { title: "For executives", description: "Turn production data into measurable profit and lost-cost recovery.", href: "", icon: "trending" },
        { title: "For sales teams", description: "Quote faster with real capacity and real station costs.", href: "", icon: "wallet" },
      ],
    },
    {
      id: "resources",
      label: "Resources",
      image: menuImage("#2f74d0", "#0e8390", "Resources"),
      headline: "Everything you need to succeed",
      intro: "Guides, proof and answers — from first evaluation to full rollout.",
      ctaLabel: "Talk to us",
      ctaHref: "/#contact",
      items: [
        { title: "Product tour", description: "Walk the operator, manager and executive screens in minutes.", href: "/#contact", icon: "sparkles" },
        { title: "ROI & value", description: "How recovered capacity and avoided downtime pay for the platform.", href: "/#contact", icon: "trending" },
        { title: "Implementation guide", description: "A pragmatic path to go live without disrupting production.", href: "/#contact", icon: "rocket" },
        { title: "Data security & privacy", description: "Encryption, access control and clear data-retention windows.", href: "/#contact", icon: "lock" },
        { title: "Release notes", description: "What's new — shipped continuously, migrated without downtime.", href: "/#contact", icon: "newspaper" },
        { title: "Customer stories", description: "How real shops cut scrap, downtime and quoting time.", href: "/#contact", icon: "award" },
        { title: "Help & documentation", description: "Setup, catalogs, plans and day-to-day how-tos.", href: "/#contact", icon: "book" },
        { title: "Community", description: "Share tips and best practices with other shops.", href: "/#contact", icon: "message" },
      ],
    },
    {
      id: "company",
      label: "Company",
      image: menuImage("#0a616b", "#16a34a", "Company"),
      headline: "Born from 70 years on the shop floor",
      intro: "TURI grew out of the machine and process knowledge of Tusch & Richter — an independent product carrying decades of metalworking know-how into a modern AI platform.",
      ctaLabel: "Read our story",
      ctaHref: "/about",
      items: [
        { title: "About TURI", description: "Born from 70 years of metalworking experience — an independent product.", href: "/about", icon: "building" },
        { title: "The TURI loop", description: "Track, Understand, Recommend, Improve — what the name actually does.", href: "/#how", icon: "sparkles" },
        { title: "Trust & compliance", description: "The measures we take to keep your data secure and available.", href: "/about", icon: "shield" },
        { title: "Careers", description: "Join us building the platform for modern manufacturing.", href: "/#contact", icon: "users" },
        { title: "Newsroom", description: "Announcements, milestones and press.", href: "/about", icon: "newspaper" },
        { title: "Contact sales", description: "Get a tailored walkthrough for your shop.", href: "/#contact", icon: "phone" },
      ],
    },
  ],
};

/**
 * Default landing content (admin-editable at runtime): trust bar, testimonials,
 * FAQ and footer. Seeded rich and trust-building; customer names are illustrative.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  trustBar: {
    enabled: true,
    logosTitle: "Trusted by metalworking shops in Germany",
    logos: [
      { name: "Baylor Sheet Metal" },
      { name: "Aegean Precision" },
      { name: "Northgate Works" },
      { name: "Ironside Shop" },
      { name: "Meridian Fabrication" },
      { name: "Aurora Manufacturing" },
    ],
    badges: ["ISO 27001", "SOC 2 Type II", "GDPR ready", "99.9% uptime"],
    stats: [
      { value: "23%", label: "less unplanned downtime" },
      { value: "4×", label: "faster quoting" },
      { value: "18%", label: "lower scrap cost" },
      { value: "< 1 week", label: "to go live" },
    ],
  },
  testimonials: {
    enabled: true,
    headline: "What shop floors say",
    intro: "Teams from cutting to the front office run their day on TURI.",
    items: [
      {
        quote:
          "We finally see the bottleneck the moment it happens — and the assistant tells us why. Downtime is down and the floor is calmer.",
        name: "Elena Vargas",
        role: "Plant Manager",
        company: "Northgate Works",
      },
      {
        quote:
          "Quoting used to take a day of back-and-forth. Now sales prices a job from real station rates in minutes, with real capacity.",
        name: "Tom Fisher",
        role: "Sales Lead",
        company: "Baylor Sheet Metal",
      },
      {
        quote:
          "Setup was days, not a year. Operators picked up the kiosk immediately and the paperwork just disappeared.",
        name: "Priya Nair",
        role: "Operations Director",
        company: "Aegean Precision",
      },
    ],
  },
  faq: {
    enabled: true,
    headline: "Frequently asked questions",
    intro: "Everything you need to evaluate TURI with confidence.",
    items: [
      {
        question: "What does TURI stand for?",
        answer:
          "Track, Understand, Recommend, Improve. TURI tracks what happens on your floor, understands why, recommends the next move, and proves the improvement — continuously, so you don't change the way you work, you change what you know about it.",
      },
      {
        question: "Is TURI part of Tusch & Richter?",
        answer:
          "TURI grew out of the machine and process knowledge of Tusch & Richter, who have served metalworking shops for over 70 years.",
      },
      {
        question: "How long does it take to go live?",
        answer:
          "Most shops are running within a week. There is no per-station licensing and no year-long rollout — you configure your operations, stations and catalogs and start.",
      },
      {
        question: "Is there a limit on the number of stations?",
        answer:
          "No. Pricing is based on capability, not station count. Every plan includes the full MES core for unlimited stations.",
      },
      {
        question: "What do the AI features actually do?",
        answer:
          "The assistant answers questions grounded in your own live data, surfaces the current bottleneck and root causes, warns you before deadline and capacity risks bite, and recommends the next action to recover capacity — in plain language your whole team acts on.",
      },
      {
        question: "How is my data kept secure?",
        answer:
          "Data is encrypted in transit and at rest, access is role-based, and each plan comes with a clear data-retention window you can extend from the portal.",
      },
      {
        question: "Do updates interrupt production?",
        answer:
          "No. Updates are applied with a migration-safe process — your live orders and shop-floor state keep flowing while new capabilities roll in.",
      },
      {
        question: "Can I try it before buying?",
        answer:
          "Yes — start a 30-day free trial and explore the live simulated plant across every role, from the operator kiosk to the executive cockpit. A referral code from an existing TURI shop starts your trial too.",
      },
    ],
  },
  contact: {
    enabled: true,
    headline: "See TURI on your shop floor",
    intro: "Tell us a little about your operation and we'll set up a tailored walkthrough. No obligation.",
    submitLabel: "Request a demo",
    successMessage: "Thanks — we've received your request and will be in touch shortly.",
  },
  footer: {
    tagline: "Track · Understand · Recommend · Improve. The AI production-intelligence layer for metalworking shops — born from 70 years of machine and process expertise.",
    columns: [
      {
        title: "Product",
        links: [
          { title: "Operator Kiosk", href: "/mes/operator" },
          { title: "Production Management", href: "/mes/manager" },
          { title: "Executive Cockpit", href: "/mes/executive" },
          { title: "Sales & Quoting", href: "/mes/sales" },
          { title: "Pricing", href: "#pricing" },
        ],
      },
      {
        title: "Resources",
        links: [
          { title: "Product tour", href: "#features" },
          { title: "ROI & value", href: "#features" },
          { title: "Documentation", href: "#" },
          { title: "Community", href: "#" },
        ],
      },
      {
        title: "Company",
        links: [
          { title: "About TURI", href: "/about" },
          { title: "How it works", href: "/#how" },
          { title: "Trust & compliance", href: "/about" },
          { title: "Contact sales", href: "/#contact" },
        ],
      },
      {
        title: "Legal",
        links: [
          { title: "Privacy", href: "/legal/privacy" },
          { title: "Terms", href: "/legal/terms" },
          { title: "Imprint", href: "/legal/imprint" },
          { title: "Cookies", href: "/legal/cookies" },
        ],
      },
    ],
    socials: [
      { icon: "linkedin", label: "LinkedIn", href: "#" },
      { icon: "twitter", label: "X", href: "#" },
      { icon: "youtube", label: "YouTube", href: "#" },
      { icon: "github", label: "GitHub", href: "#" },
    ],
    legal: "© 2026 TURI. All rights reserved.",
  },
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
