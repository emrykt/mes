import type { StockItem, StockMove } from "./demo-types";

export interface StockForecast {
  item: StockItem;
  /** average daily consumption over the window, in the item's unit */
  dailyUse: number;
  /** projected days of stock left at the current pace (Infinity = no usage) */
  daysLeft: number;
  severity: "critical" | "warn";
  reason: "belowReorder" | "runningOut" | "watch";
}

/**
 * Forecast raw-material depletion from recent consumption (issue moves). This is
 * the data behind the Stock "AI alerts": it learns each item's usage rate and
 * projects when it runs out, flagging what to reorder before it bites.
 */
export function stockForecasts(
  stock: StockItem[],
  moves: StockMove[],
  now: Date,
  windowDays = 30,
): StockForecast[] {
  const cutoff = now.getTime() - windowDays * 86_400_000;
  const used = new Map<string, number>();
  for (const m of moves) {
    if (m.type !== "issue") continue;
    if (new Date(m.at).getTime() < cutoff) continue;
    used.set(m.stockItemId, (used.get(m.stockItemId) ?? 0) + m.qty);
  }

  const out: StockForecast[] = [];
  for (const s of stock) {
    if (s.isRemnant) continue;
    const dailyUse = (used.get(s.id) ?? 0) / windowDays;
    const daysLeft = dailyUse > 0 ? s.onHand / dailyUse : Infinity;

    if (s.onHand <= s.reorder) {
      out.push({ item: s, dailyUse, daysLeft, severity: "critical", reason: "belowReorder" });
    } else if (daysLeft <= 6) {
      out.push({ item: s, dailyUse, daysLeft, severity: "critical", reason: "runningOut" });
    } else if (daysLeft <= 14) {
      out.push({ item: s, dailyUse, daysLeft, severity: "warn", reason: "watch" });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
