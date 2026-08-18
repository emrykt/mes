import type {
  AndonType,
  DowntimeReason,
  MaterialSpec,
  MesOrder,
  OperationDef,
  StationState,
} from "./mes-types";
import type { PlanId } from "./types";

/** Live (mutable) state of one kiosk/station in the demo store. */
export interface LiveStation {
  id: string;
  state: StationState;
  operator: string;
  currentOrderIds: string[];
  downtimeReasonId?: string;
  downtimeSince?: string;
  /** Auto-ended downtimes carry a planned end; manual ones don't. */
  downtimeUntil?: string;
  todayOutput: number;
  todayScrap: number;
  /** Planned (estimated) minutes of work completed today — time-based, not pieces. */
  todayPlannedMin: number;
  /** Actual minutes taken for the work completed today. */
  todayActualMin: number;
  /** Fractional parts accumulator for the simulation tick. */
  frac: number;
}

export type CurrencyCode = "USD" | "EUR" | "GBP";

/** Who an escalation notifies. */
export type AlertTarget = "supervisor" | "maintenance" | "quality" | "purchasing";

/** What condition raises an alert. */
export type AlertTrigger = "scrapRate" | "downtime" | "lowStock" | "kpiTarget";

/**
 * A configurable escalation rule. The plant tunes the threshold *and* the
 * recipient per condition (e.g. scrap > 5% → supervisor; breakdown > 5 min →
 * maintenance; > 30 min → supervisor). Several downtime rules form a ladder.
 */
export interface EscalationRule {
  id: string;
  trigger: AlertTrigger;
  /** scrapRate: fraction (0.05 = 5%). downtime: minutes. */
  threshold: number;
  target: AlertTarget;
  enabled: boolean;
}

/** A raised alert, produced by the escalation engine on the live store. */
export interface LiveAlert {
  id: string;
  ruleId: string;
  trigger: AlertTrigger;
  stationId: string;
  target: AlertTarget;
  at: string;
  /** minutes (downtime) or fraction (scrapRate) at trigger time. */
  value: number;
  threshold: number;
  /** downtime reason id, when trigger is downtime. */
  reasonId?: string;
  /** display label (e.g. stock item name), when there is no station. */
  label?: string;
  /** stable key so the same condition is not re-raised every tick. */
  sourceKey: string;
  acked: boolean;
  ackedAt?: string;
}

/** Physical form of a metal stock item. */
export type MaterialForm = "bar" | "plate" | "tube" | "block";

/**
 * Stock-keeping unit. Bars/blocks are tracked by weight (kg); sheet metal is
 * tracked by piece count with size + thickness, weight known per sheet —
 * how these shops actually stock and consume.
 */
export type StockUnit = "kg" | "piece";

/** A raw-material stock item. */
export interface StockItem {
  id: string;
  materialType: string;
  form: MaterialForm;
  unit: StockUnit;
  /** display size, e.g. bar "Ø40"; sheet "1250 × 2500". */
  dimension: string;
  /** sheet thickness (mm) — piece-tracked plate. */
  thicknessMm?: number;
  /** weight per piece (kg) — piece-tracked plate (for weight & value). */
  weightKgPerPiece?: number;
  /** on-hand quantity in `unit` (kg or pieces). */
  onHand: number;
  /** reorder level in `unit`. */
  reorder: number;
  costPerKg: number;
  /** reusable offcut returned from a job, used before ordering more. */
  isRemnant?: boolean;
}

export type StockMoveType = "issue" | "receipt" | "remnant" | "adjust";

/** A stock movement (qty is positive, in the item's unit; `type` is direction). */
export interface StockMove {
  id: string;
  at: string;
  stockItemId: string;
  type: StockMoveType;
  qty: number;
  orderId?: string;
}

/** A scrap/waste reason (catalog), same shape as a downtime reason. */
export interface ScrapReason {
  id: string;
  name: string;
}

/** A recorded scrap/waste event: which station, why, how many pieces + weight. */
export interface ScrapEvent {
  id: string;
  at: string;
  stationId: string;
  reasonId: string;
  qty: number;
  weightKg: number;
}

/** One operation+hours line of a quote. */
export interface QuoteLine {
  operationId: string;
  hours: number;
}

/** A saved price quote — persists in the store, searchable by customer. */
export interface SavedQuote {
  id: string;
  at: string;
  customer: string;
  part?: string;
  qty?: number;
  lines: QuoteLine[];
  /** Labour = Σ(op hours × station rate) in the stored currency. */
  laborTotal: number;
  materialCost: number;
  marginPct: number;
  total: number;
  perPart?: number;
  currency: CurrencyCode;
}

/**
 * Working calendar the customer configures: how many shifts run per working
 * day and which weekdays are rest days. Demo default = 3 shifts, no rest days
 * (24/7). Drives planned-capacity availability. `restDays` uses JS getUTCDay
 * numbering (0 = Sunday … 6 = Saturday).
 */
export interface WorkingCalendar {
  shifts: number;
  restDays: number[];
}

/** Optional product modules, toggled from the admin panel. */
export interface FeatureFlags {
  /** Planned-maintenance calendar module. */
  maintenance: boolean;
  /** Start work orders by scanning a barcode/QR on the kiosk. */
  barcode: boolean;
  /** Quoting / estimation module (price offers from billing rates). */
  quoting: boolean;
  /** Raw-material stock & consumption (backflush, remnants, low-stock alerts). */
  stock: boolean;
}

export interface DemoSettings {
  /**
   * Active subscription plan for this tenant. Drives MES feature gating
   * (AI assistant, sector benchmark, advanced analytics). Set from /admin/mes.
   */
  plan: PlanId;
  /**
   * Display currency — a user choice only. The product is global, so cost
   * rates are entered directly in this currency; no FX conversion happens.
   */
  currency: CurrencyCode;
  /** Cost rates in the selected currency. */
  costRates: {
    laborPerHour: number;
    energyPerHour: number;
    gasPerHour: number;
    overheadPerDay: number;
  };
  /** Market billing rate per station-hour (selected currency), by station id.
   *  Drives revenue, profit, and lost-revenue (opportunity cost). */
  billingRates: Record<string, number>;
  features: FeatureFlags;
  /** Whether Maintenance is its own department (own screen) or folded into
   *  Production Management. Set from the customer-management panel (/admin/mes). */
  maintenanceOwnDepartment: boolean;
  /** Shifts per day + weekly rest days (24/7 = 3 shifts, no rest days). */
  workingCalendar: WorkingCalendar;
  operations: OperationDef[];
  downtimeReasons: DowntimeReason[];
  /** Scrap/waste reason catalog (operator/analytics). */
  scrapReasons: ScrapReason[];
  /** Configurable alert/escalation rules (scrap %, downtime minutes → target). */
  escalationRules: EscalationRule[];
  /** Editable KPI targets, keyed by KpiId (see lib/kpi.ts). */
  kpiTargets: Record<string, number>;
  /**
   * Selected data-retention add-on, in years (0 = none). The add-on defines the
   * TOTAL retention target (max with the plan's included window), and adds a
   * recurring monthly fee on top of the base plan price.
   */
  retentionAddonYears: number;
  /**
   * Company logo as a data: URL (PNG/JPG/SVG), uploaded from the customer
   * portal or the quote settings. Shown on printed quotes and in the portal
   * header. Empty/undefined = use the product wordmark.
   */
  brandLogo?: string;
}

/** One purchasable data-retention add-on tier. `price` is the monthly fee (USD). */
export interface AddonTier {
  /** Total retention this tier targets, in years. */
  years: number;
  /** Recurring monthly surcharge (USD) added on top of the base plan price. */
  price: number;
}

/** One link inside a mega-menu panel (title + optional description + href). */
export interface NavLink {
  title: string;
  description?: string;
  href?: string;
  /** Optional icon name from the curated set (see lib/nav-icons). */
  icon?: string;
}

/** One top-level mega-menu (label) with its dropdown panel content. */
export interface NavMenu {
  id: string;
  label: string;
  /** Panel headline + intro shown above the link grid. */
  headline?: string;
  intro?: string;
  /** Optional primary call-to-action on the panel. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional promo image (data URL) shown on the right of the panel. */
  image?: string;
  /** Grid of links (title + description). */
  items: NavLink[];
}

/** Global, admin-editable marketing navigation shown on the landing page. */
export interface SiteNav {
  menus: NavMenu[];
}

/* ---- Landing content sections (admin-managed) ---- */

/** A headline stat, e.g. "23%" / "less downtime". */
export interface TrustStat {
  value: string;
  label: string;
}

/** A customer logo (name, optional image data URL). */
export interface TrustLogo {
  name: string;
  image?: string;
}

/** Trust bar under the hero: logos + compliance badges + stats. */
export interface TrustBar {
  enabled: boolean;
  logosTitle?: string;
  logos: TrustLogo[];
  badges: string[];
  stats: TrustStat[];
}

/** A customer testimonial / quote. */
export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
}

export interface TestimonialsSection {
  enabled: boolean;
  headline?: string;
  intro?: string;
  items: Testimonial[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSection {
  enabled: boolean;
  headline?: string;
  intro?: string;
  items: FaqItem[];
}

export interface FooterLink {
  title: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  /** Icon name from the curated set (see lib/nav-icons). */
  icon: string;
  label: string;
  href?: string;
}

export interface FooterConfig {
  tagline?: string;
  columns: FooterColumn[];
  socials: SocialLink[];
  legal?: string;
}

/** Contact / demo-request section (mock — submissions are stored, not emailed). */
export interface ContactSection {
  enabled: boolean;
  headline?: string;
  intro?: string;
  submitLabel?: string;
  successMessage?: string;
}

/** Global, admin-editable landing content beyond the nav. */
export interface SiteContent {
  trustBar: TrustBar;
  testimonials: TestimonialsSection;
  faq: FaqSection;
  contact: ContactSection;
  footer: FooterConfig;
}

/** A submitted demo/contact request (mock lead). */
export interface Lead {
  id: string;
  at: string;
  name: string;
  email: string;
  company?: string;
  message?: string;
}

/* ---------------- Auth / membership (demo-mode) ---------------- */

/** Platform-staff roles (internal team). */
export type PlatformRole = "owner" | "admin" | "sales";

/** Tenant (customer) roles. owner pays & manages; admin manages; the rest are
 *  screen roles. */
export type TenantRole =
  | "owner"
  | "admin"
  | "production"
  | "operator"
  | "sales"
  | "maintenance"
  | "executive";

/** Grantable app modules (map to /mes screens). */
export type AppModule =
  | "operator"
  | "production"
  | "sales"
  | "maintenance"
  | "executive"
  | "tv";

export type UserKind = "platform" | "tenant";
export type UserStatus = "active" | "invited";

/**
 * A login identity. DEMO ONLY: the password is stored in plain text in the demo
 * store — never do this with a real backend. Kept here so the login/invite/role
 * flow is fully functional without a database.
 */
export interface AuthUser {
  id: string;
  kind: UserKind;
  name: string;
  /** login identity: email for tenants, username (or email) for platform staff */
  email?: string;
  username?: string;
  /** DEMO plain password; unset while a member is still "invited". */
  password?: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  /** View-only account: may open every granted screen but cannot write. */
  readOnly?: boolean;
  /* platform */
  platformRole?: PlatformRole;
  /* tenant */
  tenantId?: string;
  tenantRole?: TenantRole;
  modules?: AppModule[];
  /* invite */
  inviteToken?: string;
  invitedByName?: string;
  invitedAt?: string;
}

/** Global auth state (shared across the platform). */
export interface AuthState {
  users: AuthUser[];
}

/** The signed-in user as returned to the client (never includes the password). */
export type SessionUser = Omit<AuthUser, "password" | "inviteToken">;

/** Global, admin-editable pricing (not per-company). */
export interface PricingConfig {
  /** Base monthly plan prices, by plan id. */
  plans: Record<PlanId, number>;
  /** Data-retention extension add-ons sold from the customer portal. */
  addonTiers: AddonTier[];
}

/** Effective data retention for a tenant (plan window vs selected add-on). */
export interface RetentionInfo {
  /** Months included with the plan. */
  planMonths: number;
  /** Selected add-on, in years (0 = none). */
  addonYears: number;
  /** Effective total retention months = max(planMonths, addonYears × 12). */
  totalMonths: number;
  /** Recurring monthly surcharge for the selected add-on (USD; 0 if none). */
  addonMonthlyPrice: number;
}

/** One recurring planned-maintenance task bound to a station. */
export interface MaintenanceTask {
  id: string;
  stationId: string;
  title: string;
  intervalDays: number;
  lastDoneAt: string;
  nextDueAt: string;
}

export interface LiveAndonCall {
  id: string;
  stationId: string;
  type: AndonType;
  at: string;
  open: boolean;
  manual?: boolean;
}

export interface LiveDowntime {
  id: string;
  stationId: string;
  reasonId: string;
  startedAt: string;
  endedAt?: string;
  manual?: boolean;
}

export interface DemoStore {
  version: 1;
  /**
   * Data-shape revision within a v2 multi-store. Bumped when the store gains a
   * structural change that must be applied to EXISTING live stores without
   * reseeding. `migrate()` runs the ordered, additive steps for any store below
   * the current revision, preserving all live orders/stations/counters — so a
   * deploy never interrupts a running plant. (Distinct from `version`, which
   * only guards the outer multi-store shape and must NOT be bumped for content
   * changes.)
   */
  schemaVersion?: number;
  /** Company (tenant) id this plant state belongs to — see lib/companies.ts. */
  id: string;
  createdAt: string;
  lastTickAt: string;
  /** ISO day the today-counters belong to (daily reset). */
  currentDay: string;
  /** Per "YYYY-MM" last used order sequence number. */
  orderSeq: Record<string, number>;
  /** Active WIP + orders completed in the last few days. */
  orders: MesOrder[];
  stations: LiveStation[];
  andon: LiveAndonCall[];
  downtime: LiveDowntime[];
  maintenance: MaintenanceTask[];
  alerts: LiveAlert[];
  quotes: SavedQuote[];
  stock: StockItem[];
  stockMoves: StockMove[];
  scrapEvents: ScrapEvent[];
  settings: DemoSettings;
}

/** Top-level multi-tenant store: several independent company plants. */
export interface MultiStore {
  version: 2;
  createdAt: string;
  companies: Record<string, DemoStore>;
  /** Global, admin-editable pricing shared across tenants. */
  pricing?: PricingConfig;
  /** Global, admin-editable marketing navigation for the landing page. */
  siteNav?: SiteNav;
  /** Global, admin-editable landing content (trust bar, testimonials, FAQ, footer). */
  siteContent?: SiteContent;
  /** Submitted demo/contact requests (mock leads), newest first. */
  leads?: Lead[];
  /**
   * Version of the bundled default marketing content (nav + sections). When the
   * product ships new curated defaults we bump this; on load, stores below the
   * current version are refreshed to the new defaults. Admin edits persist until
   * the next deliberate bump. Does NOT touch plant/company state.
   */
  siteVersion?: number;
  /** Global auth/membership state (demo-mode). */
  auth?: AuthState;
}

/** A company entry for the switcher. */
export interface CompanyRef {
  id: string;
  name: string;
  sector: string;
}

/** What the client receives from GET /api/demo. */
export interface DemoSnapshot {
  now: string;
  /** Which company this snapshot is for + the full list, for the switcher. */
  companyId: string;
  companyName: string;
  sector: string;
  companies: CompanyRef[];
  stations: LiveStation[];
  orders: MesOrder[];
  andon: LiveAndonCall[];
  downtime: LiveDowntime[];
  maintenance: MaintenanceTask[];
  alerts: LiveAlert[];
  quotes: SavedQuote[];
  stock: StockItem[];
  stockMoves: StockMove[];
  scrapEvents: ScrapEvent[];
  settings: DemoSettings;
  /** Global pricing (admin-editable) + this tenant's effective retention. */
  pricing: PricingConfig;
  retention: RetentionInfo;
  /** Global, admin-editable landing-page navigation. */
  siteNav: SiteNav;
  /** Global, admin-editable landing content sections. */
  siteContent: SiteContent;
  /** Submitted demo/contact requests (mock leads), newest first. */
  leads: Lead[];
  today: {
    /** total pieces today (per-station only; not shown as a plant headline) */
    output: number;
    scrap: number;
    util: number;
    /** planned (estimated) hours of work completed today */
    plannedHours: number;
    /** actual hours taken for that completed work */
    actualHours: number;
    /** plan performance = planned ÷ actual (×100); >100 = faster than plan */
    planPerf: number;
  };
}

export type DemoAction =
  | { type: "startJob"; stationId: string; orderId: string }
  | { type: "pauseStation"; stationId: string }
  | { type: "resumeStation"; stationId: string }
  | { type: "addQty"; stationId: string; orderId: string; delta: number }
  | { type: "addScrap"; stationId: string; orderId: string; delta: number }
  | { type: "finishStep"; stationId: string; orderId: string }
  | { type: "startDowntime"; stationId: string; reasonId: string }
  | { type: "endDowntime"; stationId: string }
  | { type: "andonOpen"; stationId: string; andonType: AndonType }
  | { type: "andonClose"; id: string }
  | {
      type: "createOrder";
      customer: string;
      part: string;
      qty: number;
      dueDate: string;
      priority?: "normal" | "high";
      material?: MaterialSpec;
      routing: { operationId: string; estMinutes?: number }[];
    }
  | {
      type: "editOrder";
      orderId: string;
      patch: {
        customer?: string;
        part?: string;
        qty?: number;
        dueDate?: string;
        priority?: "normal" | "high";
        material?: MaterialSpec;
        routing?: { operationId: string; estMinutes?: number }[];
      };
    }
  | { type: "addOperation"; name: string; batchable: boolean }
  | { type: "addReason"; name: string }
  | { type: "saveCosts"; costRates: DemoSettings["costRates"] }
  | { type: "saveBillingRates"; billingRates: Record<string, number> }
  | { type: "setCurrency"; currency: CurrencyCode }
  | { type: "setPlan"; plan: PlanId }
  | { type: "ackAlert"; id: string }
  | { type: "saveEscalationRules"; rules: EscalationRule[] }
  | { type: "saveKpiTargets"; targets: Record<string, number> }
  | { type: "savePricing"; pricing: PricingConfig }
  | { type: "saveSiteNav"; siteNav: SiteNav }
  | { type: "saveSiteContent"; siteContent: SiteContent }
  | { type: "submitLead"; lead: Omit<Lead, "id" | "at"> }
  | { type: "deleteLead"; id: string }
  | { type: "setRetentionAddon"; years: number }
  | { type: "setBrandLogo"; logo: string }
  | { type: "setMaintenanceDept"; own: boolean }
  | { type: "setWorkingCalendar"; calendar: WorkingCalendar }
  | { type: "saveQuote"; quote: Omit<SavedQuote, "id" | "at"> }
  | { type: "deleteQuote"; id: string }
  | { type: "restockItem"; stockItemId: string; qty: number }
  | { type: "adjustStock"; stockItemId: string; onHand: number }
  | { type: "setFeature"; feature: keyof FeatureFlags; enabled: boolean }
  | { type: "maintenanceDone"; id: string }
  | { type: "addMaintenance"; stationId: string; title: string; intervalDays: number }
  | { type: "resetDemo" };
