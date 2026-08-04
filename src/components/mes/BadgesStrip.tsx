"use client";

import { useTranslations } from "next-intl";
import {
  Award,
  BadgeCheck,
  Clock,
  Crown,
  Leaf,
  Medal,
  Truck,
  Zap,
} from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { plantBadges, type BadgeKey } from "@/lib/badges";

const ICON: Record<BadgeKey, typeof Award> = {
  operatorDay: Award,
  operatorWeek: Medal,
  operatorMonth: Crown,
  zeroDelay: Clock,
  lowestScrap: Leaf,
  bestDelivery: Truck,
  stableQuality: BadgeCheck,
  fastestOp: Zap,
};

/**
 * Achievement badges strip. Active badges glow gold; the holder (operator /
 * station / operation) is named. `dark` styles it for the andon TV wall.
 */
export default function BadgesStrip({ dark = false, limit }: { dark?: boolean; limit?: number }) {
  const t = useTranslations("mes.badges");
  const { snap } = useDemo();
  if (!snap) return null;

  const all = plantBadges(snap, new Date(snap.now));
  // active first, then by original order
  const sorted = [...all].sort((a, b) => Number(b.active) - Number(a.active));
  const badges = limit ? sorted.slice(0, limit) : sorted;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {badges.map((b) => {
        const Icon = ICON[b.key];
        return (
          <li
            key={b.key}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
              dark
                ? b.active
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-white/10 bg-white/5"
                : b.active
                  ? "border-amber-300 bg-amber-50"
                  : "border-line bg-surface"
            }`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                b.active
                  ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm"
                  : dark
                    ? "bg-white/10 text-white/40"
                    : "bg-neutral-soft text-muted"
              }`}
            >
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className={`truncate text-[11px] font-medium ${dark ? "text-white/70" : "text-ink-2"}`}>
                {t(`name.${b.key}`)}
              </p>
              <p className={`truncate text-sm font-semibold ${dark ? "text-white" : "text-ink"}`}>
                {b.holder}
                {b.detail && (
                  <span className={`ml-1 text-xs font-normal ${dark ? "text-white/50" : "text-muted"}`}>
                    · {b.detail}
                  </span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
