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
    id: "baylor-sheet",
    name: "Baylor Sheet Metal",
    sector: "Sheet metal fabrication",
    stationIds: [
      "st-laser-1", "st-laser-2", "st-plasma-1", "st-punch-1",
      "st-pressbrake-1", "st-pressbrake-2", "st-welding-1", "st-assembly-1",
      "st-quality-1", "st-packaging-1",
    ],
    partKinds: ["sheet"],
    currency: "EUR",
    plan: "AIPRO",
    features: ALL_FEATURES,
    workingCalendar: { shifts: 3, restDays: [] },
    // flagship demo account — packed shop, minute-by-minute flow, every station busy
    scenario: { breakdownRate: 0.0012, scrapRate: 0.011, seedWip: 60, seedBacklog: 34, refillTarget: 68 },
    utilFactor: 1.16,
    histFactor: 1.05,
  },
  {
    id: "aegean-precision",
    name: "Aegean Precision Machining",
    sector: "Metal job shop · machining-led",
    stationIds: [
      "st-sawing-1", "st-turning-1", "st-turning-2", "st-milling-1",
      "st-milling-2", "st-drilling-1", "st-quality-1", "st-packaging-1",
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
    id: "northgate-works",
    name: "Northgate Works",
    sector: "Sheet & metal fabrication shop",
    stationIds: [
      "st-sawing-1", "st-turning-1", "st-turning-2", "st-milling-1", "st-milling-2",
      "st-drilling-1", "st-laser-1", "st-laser-2", "st-plasma-1", "st-punch-1",
      "st-pressbrake-1", "st-pressbrake-2", "st-welding-1", "st-assembly-1",
      "st-quality-1", "st-packaging-1",
    ],
    partKinds: ["sheet", "machined"],
    currency: "EUR",
    plan: "AIPRO",
    features: ALL_FEATURES,
    workingCalendar: { shifts: 3, restDays: [] },
    scenario: { breakdownRate: 0.0050, scrapRate: 0.016, seedWip: 48, seedBacklog: 30, refillTarget: 58 },
    utilFactor: 1.14,
    histFactor: 1.18,
  },
  {
    id: "ironside-shop",
    name: "Ironside Shop",
    sector: "Small metal fabrication shop",
    stationIds: [
      "st-sawing-1", "st-turning-1", "st-milling-1", "st-laser-1",
      "st-pressbrake-1", "st-welding-1", "st-quality-1", "st-packaging-1",
    ],
    partKinds: ["sheet", "machined"],
    currency: "EUR",
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
