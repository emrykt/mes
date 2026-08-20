import { NOW } from "./data";

/** Membership/subscription money — always EUR (billed from Germany). */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatShortDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** "3 min ago" style relative time against the fixed demo clock. */
export function formatAgo(iso: string): string {
  const diffMs = NOW.getTime() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - NOW.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}
