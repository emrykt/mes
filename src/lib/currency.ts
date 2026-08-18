import type { CurrencyCode } from "./demo-types";

export const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP"];

/**
 * Format an amount in the selected display currency. The product is global:
 * currency is purely a user choice — cost rates are entered directly in this
 * currency and no FX conversion is applied.
 */
export function formatCost(
  amount: number,
  currency: CurrencyCode,
  locale = "en-US",
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(amount);
}
