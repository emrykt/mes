"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUsers } from "@/lib/useUsers";
import { Card } from "@/components/ui";
import { ALL_MODULES, MODULE_LABELS, TENANT_ROLE_LABELS, canManageTenant, defaultModules } from "@/lib/auth";
import type { AppModule, TenantRole } from "@/lib/demo-types";

const ROLES: TenantRole[] = ["admin", "production", "operator", "sales", "maintenance", "executive"];

export default function MembersAdmin() {
  const { user: me } = useAuth();
  const { users, loading, invite, update, remove } = useUsers();
  const [form, setForm] = useState({ name: "", email: "", role: "operator" as TenantRole, modules: defaultModules("operator") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // platform staff act on the customer they've entered (mes_company cookie)
  const enteredCompany =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)mes_company=([^;]+)/)?.[1]
      : undefined;
  const actingTenantId = me?.kind === "platform" ? (enteredCompany && decodeURIComponent(enteredCompany)) : me?.tenantId;
  const canManage = canManageTenant(me) || me?.kind === "platform";
  const members = users.filter((u) => u.kind === "tenant" && (!actingTenantId || u.tenantId === actingTenantId));

  const linkFor = (token?: string) =>
    token ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${token}` : "";

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const setRole = (role: TenantRole) => setForm((f) => ({ ...f, role, modules: defaultModules(role) }));
  const toggleFormModule = (m: AppModule) =>
    setForm((f) => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m] }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !/.+@.+\..+/.test(form.email)) return;
    setBusy(true);
    const r = await invite({ name: form.name.trim(), email: form.email.trim(), tenantRole: form.role, modules: form.modules, tenantId: actingTenantId || undefined });
    setBusy(false);
    if (!r.ok) {
      setError(r.error === "exists" ? "That email is already a member." : "Could not send the invite.");
      return;
    }
    setLastLink(linkFor(r.inviteToken));
    setForm({ name: "", email: "", role: "operator", modules: defaultModules("operator") });
  };

  const field = "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

  if (!canManage) {
    return (
      <Card>
        <p className="text-sm text-ink-2">Only the account owner or an administrator can manage the team.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* invite */}
      <Card title="Invite a team member" subtitle="They'll get a join link to set their password and access only the modules you grant.">
        <form onSubmit={send} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-ink-2">Name
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-medium text-ink-2">Email
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={`${field} mt-1`} placeholder="name@company.com" />
            </label>
            <label className="text-xs font-medium text-ink-2">Role
              <select value={form.role} onChange={(e) => setRole(e.target.value as TenantRole)} className={`${field} mt-1`}>
                {ROLES.map((r) => <option key={r} value={r}>{TENANT_ROLE_LABELS[r]}</option>)}
              </select>
            </label>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-2">Allowed modules</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ALL_MODULES.map((m) => (
                <label key={m} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${form.modules.includes(m) ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-ink-2"}`}>
                  <input type="checkbox" checked={form.modules.includes(m)} onChange={() => toggleFormModule(m)} className="sr-only" />
                  {form.modules.includes(m) && <Check className="size-3" />}
                  {MODULE_LABELS[m]}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-critical-text">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Send invite
          </button>
        </form>
        {lastLink && (
          <div className="mt-4 rounded-lg border border-good/40 bg-good-soft/50 p-3">
            <p className="text-xs font-medium text-good-text">Invite created — share this link (demo: no email is sent):</p>
            <div className="mt-1.5 flex items-center gap-2">
              <input readOnly value={lastLink} className={`${field} bg-surface font-mono text-xs`} />
              <button onClick={() => copy(lastLink, "new")} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs hover:bg-neutral-soft">
                {copied === "new" ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
                Copy
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* members */}
      <Card title="Team members" subtitle={`${members.length} in your account`} padded={false}>
        {loading ? (
          <div className="flex justify-center py-10 text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="divide-y divide-line">
            {members.map((u) => {
              const isOwner = u.tenantRole === "owner";
              return (
                <div key={u.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {u.name}
                        {u.status === "invited" && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-text">Invited</span>}
                        {isOwner && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">Owner</span>}
                      </p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isOwner && (
                        <select
                          value={u.tenantRole ?? "operator"}
                          onChange={(e) => update(u.id, { tenantRole: e.target.value as TenantRole })}
                          className={`${field} w-auto`}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{TENANT_ROLE_LABELS[r]}</option>)}
                        </select>
                      )}
                      {isOwner && <span className="text-xs font-medium text-ink-2">{TENANT_ROLE_LABELS.owner}</span>}
                      {!isOwner && u.id !== me?.id && (
                        <button onClick={() => remove(u.id)} className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text" aria-label="Remove">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ALL_MODULES.map((m) => {
                        const on = (u.modules ?? []).includes(m);
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              const next = on ? (u.modules ?? []).filter((x) => x !== m) : [...(u.modules ?? []), m];
                              update(u.id, { modules: next });
                            }}
                            className={`rounded-lg border px-2 py-1 text-[11px] ${on ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-muted"}`}
                          >
                            {MODULE_LABELS[m]}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {u.status === "invited" && u.inviteToken && (
                    <div className="mt-3 flex items-center gap-2">
                      <input readOnly value={linkFor(u.inviteToken)} className={`${field} bg-neutral-soft/50 font-mono text-[11px]`} />
                      <button onClick={() => copy(linkFor(u.inviteToken), u.id)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-neutral-soft">
                        {copied === u.id ? <Check className="size-3.5 text-good" /> : <Mail className="size-3.5" />}
                        Copy link
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
