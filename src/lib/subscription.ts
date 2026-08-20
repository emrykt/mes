import type { BillingPeriod, PricingConfig, Subscription, SubStatus } from "./demo-types";
import type { PlanId } from "./types";

/** Lifecycle constants (demo-mode). */
export const DAY_MS = 86_400_000;
export const MONTH_DAYS = 30;
export const YEAR_DAYS = 365;
export const TRIAL_DAYS = 30;
/** Free months a referrer earns per paying referral. */
export const REFERRAL_BONUS_MONTHS = 2;

export function periodDays(period: BillingPeriod): number {
  return period === "annual" ? YEAR_DAYS : MONTH_DAYS;
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

/** Whole days from `now` until the given ISO date (negative once past). */
export function daysUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

/** Deterministic, human-shareable referral code, e.g. "TURI-7Q2K". */
export function makeReferralCode(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let code = "";
  for (let i = 0; i < 4; i++) {
    h = Math.imul(h ^ (h >>> 13), 16777619);
    code += alphabet[(h >>> 0) % alphabet.length];
  }
  return `TURI-${code}`;
}

/** A random referral code for a freshly created tenant. */
export function randomReferralCode(): string {
  return makeReferralCode(`${Date.now()}-${Math.random()}`);
}

export interface NewSubOpts {
  period: BillingPeriod;
  /** Start on a free trial (referred signups). */
  trial?: boolean;
  referredByCode?: string;
  selfServe?: boolean;
  /** Backdate the term start by this many days (for varied seed data). */
  startedDaysAgo?: number;
  referralCode?: string;
}

/** Build a fresh subscription for a tenant. */
export function defaultSubscription(seed: string, now: Date, opts: NewSubOpts): Subscription {
  const started = opts.startedDaysAgo
    ? new Date(now.getTime() - opts.startedDaysAgo * DAY_MS)
    : now;
  const startedAt = started.toISOString();
  const termDays = opts.trial ? TRIAL_DAYS : periodDays(opts.period);
  return {
    period: opts.period,
    status: opts.trial ? "trialing" : "active",
    startedAt,
    currentPeriodEnd: addDays(startedAt, termDays),
    cancelAtPeriodEnd: false,
    referralCode: opts.referralCode ?? makeReferralCode(seed),
    referredByCode: opts.referredByCode,
    bonusMonthsEarned: 0,
    referralCount: 0,
    selfServe: opts.selfServe,
  };
}

/**
 * Advance a subscription against the wall clock. Loops in case several terms
 * elapsed. Returns true if anything changed. Mutates `sub`.
 *
 * - trialing → at trial end: expires if cancelled, else becomes a paid `active`
 *   term (the first charge) that runs one billing period.
 * - active   → at period end: expires if cancelled (cancel-at-period-end), else
 *   renews for another billing period.
 */
export function advanceSubscription(sub: Subscription, now: Date): boolean {
  let changed = false;
  // guard against pathological loops
  for (let i = 0; i < 400; i++) {
    if (sub.status === "expired" || sub.status === "canceled") break;
    if (new Date(sub.currentPeriodEnd).getTime() > now.getTime()) break;

    if (sub.status === "trialing") {
      if (sub.cancelAtPeriodEnd) {
        sub.status = "expired";
      } else {
        sub.status = "active";
        sub.startedAt = sub.currentPeriodEnd;
        sub.currentPeriodEnd = addDays(sub.currentPeriodEnd, periodDays(sub.period));
      }
    } else if (sub.status === "active") {
      if (sub.cancelAtPeriodEnd) {
        sub.status = "canceled";
      } else {
        sub.startedAt = sub.currentPeriodEnd;
        sub.currentPeriodEnd = addDays(sub.currentPeriodEnd, periodDays(sub.period));
      }
    }
    changed = true;
  }
  return changed;
}

/** Credit a referrer with the referral bonus: extend the term by 2 months. */
export function creditReferral(sub: Subscription): void {
  sub.referralCount += 1;
  sub.bonusMonthsEarned += REFERRAL_BONUS_MONTHS;
  sub.currentPeriodEnd = addDays(sub.currentPeriodEnd, REFERRAL_BONUS_MONTHS * MONTH_DAYS);
}

/** The monthly-equivalent price for this subscription's plan + cadence (EUR). */
export function subscriptionPrice(sub: Subscription, plan: PlanId, pricing: PricingConfig): number {
  if (sub.period === "annual" && pricing.plansAnnual) return pricing.plansAnnual[plan];
  return pricing.plans[plan];
}

/** Amount charged per billing cycle (annual = 12× the monthly-equivalent). */
export function cycleAmount(sub: Subscription, plan: PlanId, pricing: PricingConfig): number {
  const monthly = subscriptionPrice(sub, plan, pricing);
  return sub.period === "annual" ? monthly * 12 : monthly;
}

/** Is the subscription currently usable (trial, active, or cancelled-but-not-yet-expired)? */
export function isUsable(sub: Subscription, now: Date): boolean {
  if (sub.status === "expired") return false;
  return new Date(sub.currentPeriodEnd).getTime() > now.getTime() || sub.status === "active";
}

/** Days elapsed in the current term (for progress bars). */
export function termProgress(sub: Subscription, now: Date): { elapsed: number; total: number } {
  const total = Math.max(1, daysBetween(sub.startedAt, sub.currentPeriodEnd));
  const elapsed = Math.min(total, Math.max(0, daysBetween(sub.startedAt, now.toISOString())));
  return { elapsed, total };
}

/** UI status key (maps to i18n under mes.subscription.status.*). */
export function statusKey(sub: Subscription): SubStatus {
  return sub.status;
}
