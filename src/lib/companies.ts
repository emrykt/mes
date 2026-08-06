import type { CurrencyCode, FeatureFlags, WorkingCalendar } from "./demo-types";
import type { PlanId } from "./types";

/**
 * Multi-tenant demo: several independent companies, each a plant running its
 * own scenario — different station set, part mix (flows/routings), currency,
 * plan and behavioural knobs. A global switcher (see DemoProvider) selects
 * which company every /mes screen shows. Profiles are static config; the live
 * per-company state lives in the store, keyed by `id`.
 */

export type PartKind = "sheet" | "machined";

/** Behavioural knobs that make each plant feel different. */
export interface ScenarioParams {
  /** per-station-minute breakdown probability */
  breakdownRate: number;
  /** per-piece scrap probability */
  scrapRate: number;
  /** seeded work-in-progress orders */
  seedWip: number;
  /** seeded waiting backlog */
  seedBacklog: number;
  /** open-order count the plant tops up toward */
  refillTarget: number;
}

export interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  /** subset of the master SIM_STATIONS catalog this plant operates */
  stationIds: string[];
  /** which part templates feed this plant's order book */
  partKinds: PartKind[];
  currency: CurrencyCode;
  plan: PlanId;
  features: FeatureFlags;
  workingCalendar: WorkingCalendar;
  scenario: ScenarioParams;
  /** steady utilization multiplier over the shared time model (≈0.5–1.2) */
  utilFactor: number;
  /** trend/history output multiplier (executive trends, benchmark) */
  histFactor: number;
}

const ALL_FEATURES: FeatureFlags = { maintenance: true, barcode: true, quoting: true, stock: true };

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: "baykal-sac",
    name: "Baykal Sac & Metal",
    sector: "Sac metal fabrikasyonu",
    stationIds: [
      "st-lazer-1", "st-lazer-2", "st-plazma-1", "st-punch-1",
      "st-abkant-1", "st-abkant-2", "st-kaynak-1", "st-montaj-1",
      "st-kalite-1", "st-paket-1",
    ],
    partKinds: ["sheet"],
    currency: "TRY",
    plan: "AIPRO",
    features: ALL_FEATURES,
    workingCalendar: { shifts: 3, restDays: [] },
    scenario: { breakdownRate: 0.0030, scrapRate: 0.012, seedWip: 34, seedBacklog: 22, refillTarget: 46 },
    utilFactor: 1.06,
    histFactor: 1.0,
  },
  {
    id: "ege-talasli",
    name: "Ege Talaşlı İşleme",
    sector: "Metal iş atölyesi · talaşlı ağırlıklı",
    stationIds: [
      "st-testere-1", "st-torna-1", "st-torna-2", "st-freze-1",
      "st-freze-2", "st-matkap-1", "st-kalite-1", "st-paket-1",
    ],
    partKinds: ["machined"],
    currency: "EUR",
    plan: "AIULTIMATE",
    features: ALL_FEATURES,
    workingCalendar: { shifts: 2, restDays: [0] },
    scenario: { breakdownRate: 0.0035, scrapRate: 0.010, seedWip: 22, seedBacklog: 14, refillTarget: 30 },
    utilFactor: 0.92,
    histFactor: 0.8,
  },
  {
    id: "kuzey-fabrika",
    name: "Kuzey Fabrika",
    sector: "Sac & metal fabrikasyon atölyesi",
    stationIds: [
      "st-testere-1", "st-torna-1", "st-torna-2", "st-freze-1", "st-freze-2",
      "st-matkap-1", "st-lazer-1", "st-lazer-2", "st-plazma-1", "st-punch-1",
      "st-abkant-1", "st-abkant-2", "st-kaynak-1", "st-montaj-1",
      "st-kalite-1", "st-paket-1",
    ],
    partKinds: ["sheet", "machined"],
    currency: "USD",
    plan: "AIPRO",
    features: ALL_FEATURES,
    workingCalendar: { shifts: 3, restDays: [] },
    scenario: { breakdownRate: 0.0050, scrapRate: 0.016, seedWip: 48, seedBacklog: 30, refillTarget: 58 },
    utilFactor: 1.14,
    histFactor: 1.18,
  },
  {
    id: "demir-atolye",
    name: "Demir Atölye",
    sector: "Küçük metal fabrikasyon atölyesi",
    stationIds: [
      "st-testere-1", "st-torna-1", "st-freze-1", "st-lazer-1",
      "st-abkant-1", "st-kaynak-1", "st-kalite-1", "st-paket-1",
    ],
    partKinds: ["sheet", "machined"],
    currency: "TRY",
    plan: "BASIC",
    features: { maintenance: true, barcode: false, quoting: true, stock: true },
    workingCalendar: { shifts: 1, restDays: [0, 6] },
    scenario: { breakdownRate: 0.0040, scrapRate: 0.014, seedWip: 10, seedBacklog: 8, refillTarget: 16 },
    utilFactor: 0.78,
    histFactor: 0.5,
  },
];

export const DEFAULT_COMPANY_ID = COMPANY_PROFILES[0].id;

export function companyProfile(id: string): CompanyProfile {
  return COMPANY_PROFILES.find((c) => c.id === id) ?? COMPANY_PROFILES[0];
}

/** Lightweight list for the company switcher (no behavioural detail). */
export const COMPANY_LIST = COMPANY_PROFILES.map((c) => ({
  id: c.id,
  name: c.name,
  sector: c.sector,
}));
