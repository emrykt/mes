"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppModule, PlatformRole, SessionUser, TenantRole } from "@/lib/demo-types";

export type ManagedUser = SessionUser & { inviteToken?: string };

/** Client helper over /api/auth/users for the team/member management UIs. */
export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/users", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setUsers(d.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const post = (body: unknown) =>
    fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const createPlatform = async (p: { name: string; username: string; password: string; platformRole: PlatformRole }) => {
    const r = await post({ kind: "platform", ...p });
    await refresh();
    return r;
  };

  const invite = async (p: { name: string; email: string; tenantRole: TenantRole; modules: AppModule[]; tenantId?: string }) => {
    const r = await post({ kind: "tenant", ...p });
    const d = await r.json().catch(() => ({}));
    await refresh();
    return { ok: r.ok, ...d } as { ok: boolean; inviteToken?: string; error?: string };
  };

  const update = async (id: string, patch: { name?: string; tenantRole?: TenantRole; modules?: AppModule[] }) => {
    await fetch(`/api/auth/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
    await refresh();
  };

  return { users, loading, refresh, createPlatform, invite, update, remove };
}
