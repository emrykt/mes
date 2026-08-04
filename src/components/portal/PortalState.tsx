"use client";

import { createContext, useContext, useState } from "react";
import type { LicenseStatus } from "@/lib/types";

/**
 * Design-preview control: lets the reviewer flip the portal between license
 * states without a backend. In the real app this comes from the tenant record.
 */
interface PortalStateCtx {
  status: LicenseStatus;
  setStatus: (s: LicenseStatus) => void;
}

const Ctx = createContext<PortalStateCtx | null>(null);

export const DEMO_DATES = {
  trialEndsAt: "2026-07-19T00:00:00Z",
  renewsAt: "2026-07-28T00:00:00Z",
  graceEndsAt: "2026-07-08T06:00:00Z",
  periodEndsAt: "2026-07-28T00:00:00Z",
};

export function PortalStateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus>("ACTIVE");
  return <Ctx.Provider value={{ status, setStatus }}>{children}</Ctx.Provider>;
}

export function usePortalState(): PortalStateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortalState outside PortalStateProvider");
  return ctx;
}
