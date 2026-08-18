"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUsers } from "@/lib/useUsers";
import { Card, Table, Td, Th } from "@/components/ui";
import { PLATFORM_ROLE_LABELS } from "@/lib/auth";
import type { PlatformRole } from "@/lib/demo-types";

export default function TeamAdmin() {
  const { user: me } = useAuth();
  const { users, loading, createPlatform, remove } = useUsers();
  const [form, setForm] = useState({ name: "", username: "", password: "", platformRole: "sales" as PlatformRole });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staff = users.filter((u) => u.kind === "platform");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.username || !form.password) return;
    setBusy(true);
    const r = await createPlatform(form);
    setBusy(false);
    if (!r.ok) {
      setError(r.status === 409 ? "That username is already taken." : "Could not create the user.");
      return;
    }
    setForm({ name: "", username: "", password: "", platformRole: "sales" });
  };

  const field = "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card title="Platform staff" subtitle="Everyone on your internal team and their access level." padded={false}>
        {loading ? (
          <div className="flex justify-center py-10 text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Username</Th><Th>Role</Th><Th align="right" /></tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <Td className="font-medium">{u.name}</Td>
                  <Td className="text-ink-2">{u.username}</Td>
                  <Td className="text-ink-2">{PLATFORM_ROLE_LABELS[u.platformRole ?? "sales"]}</Td>
                  <Td align="right">
                    {u.platformRole !== "owner" && u.id !== me?.id && (
                      <button onClick={() => remove(u.id)} className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text" aria-label="Remove">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Add staff" subtitle="Create a new Platform Admin or Sales login.">
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-medium text-ink-2">
            Full name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            Username
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            Temporary password
            <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            Role
            <select value={form.platformRole} onChange={(e) => setForm((f) => ({ ...f, platformRole: e.target.value as PlatformRole }))} className={`${field} mt-1`}>
              <option value="admin">Platform Admin — manage customers & support</option>
              <option value="sales">Platform Sales — customers, quotes, subscriptions</option>
            </select>
          </label>
          {error && <p className="text-xs text-critical-text">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Create login
          </button>
        </form>
      </Card>
    </div>
  );
}
