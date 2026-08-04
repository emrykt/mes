"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DemoAction, DemoSnapshot } from "@/lib/demo-types";
import { PLAN_ENTITLEMENTS } from "@/lib/data";
import type { PlanEntitlements } from "@/lib/types";

/**
 * Live bridge to the demo store: polls GET /api/demo every few seconds so
 * every open screen (desktop dashboards, phone kiosks) sees the same plant,
 * and posts user actions which return the updated snapshot immediately.
 */
interface DemoCtx {
  snap: DemoSnapshot | null;
  dispatch: (action: DemoAction) => Promise<void>;
}

const Ctx = createContext<DemoCtx | null>(null);

const POLL_MS = 4000;

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<DemoSnapshot | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    try {
      const res = await fetch("/api/demo", { cache: "no-store" });
      if (res.ok) setSnap(await res.json());
    } catch {
      /* server briefly unavailable (restart/HMR) — next poll retries */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const dispatch = useCallback(async (action: DemoAction) => {
    busy.current = true;
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (res.ok) setSnap(await res.json());
    } finally {
      busy.current = false;
    }
  }, []);

  return <Ctx.Provider value={{ snap, dispatch }}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo outside DemoProvider");
  return ctx;
}

/**
 * Feature entitlements of the tenant's current plan, read live from the store.
 * Gates AI Assistant, sector benchmark and advanced analytics on the MES side.
 * Defaults to AI Pro while the first snapshot loads (matches the seeded plan).
 */
export function useEntitlements(): PlanEntitlements {
  const { snap } = useDemo();
  return PLAN_ENTITLEMENTS[snap?.settings.plan ?? "AIPRO"];
}
