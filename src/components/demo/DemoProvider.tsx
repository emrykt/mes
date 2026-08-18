"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CompanyRef, DemoAction, DemoSnapshot } from "@/lib/demo-types";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";
import { PLAN_ENTITLEMENTS } from "@/lib/data";
import type { PlanEntitlements } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Live bridge to the demo store: polls GET /api/demo?company=<id> every few
 * seconds so every open screen (desktop dashboards, phone kiosks) sees the same
 * plant for the selected company, and posts user actions which return the
 * updated snapshot immediately. A global company switcher (see CompanySwitcher)
 * changes which tenant every /mes screen shows; the choice is remembered in a
 * cookie.
 */
interface DemoCtx {
  snap: DemoSnapshot | null;
  dispatch: (action: DemoAction) => Promise<void>;
  company: string;
  companies: CompanyRef[];
  setCompany: (id: string) => void;
}

const Ctx = createContext<DemoCtx | null>(null);

const POLL_MS = 4000;
const COMPANY_COOKIE = "mes_company";

function readCompanyCookie(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)mes_company=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<string>(DEFAULT_COMPANY_ID);
  const [snap, setSnap] = useState<DemoSnapshot | null>(null);
  const busy = useRef(false);
  const companyRef = useRef(company);
  companyRef.current = company;

  // view-only accounts never write (server enforces too)
  const { user } = useAuth();
  const readOnlyRef = useRef(false);
  readOnlyRef.current = !!user?.readOnly;

  // adopt the remembered company on mount (client-only cookie read)
  useEffect(() => {
    const c = readCompanyCookie();
    if (c) setCompanyState(c);
  }, []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    try {
      const res = await fetch(`/api/demo?company=${companyRef.current}`, { cache: "no-store" });
      if (res.ok) setSnap(await res.json());
    } catch {
      /* server briefly unavailable (restart/HMR) — next poll retries */
    }
  }, []);

  // (re)start the poll loop whenever the active company changes
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, company]);

  const setCompany = useCallback((id: string) => {
    if (id === companyRef.current) return;
    document.cookie = `${COMPANY_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    companyRef.current = id;
    setSnap(null); // show loading until the new company's snapshot arrives
    setCompanyState(id);
  }, []);

  const dispatch = useCallback(async (action: DemoAction) => {
    if (readOnlyRef.current) return; // view-only demo: ignore writes
    busy.current = true;
    try {
      const res = await fetch(`/api/demo?company=${companyRef.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (res.ok) setSnap(await res.json());
    } finally {
      busy.current = false;
    }
  }, []);

  const companies = snap?.companies ?? [];

  return (
    <Ctx.Provider value={{ snap, dispatch, company, companies, setCompany }}>
      {children}
    </Ctx.Provider>
  );
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
