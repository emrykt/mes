"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import TuriLogo from "@/components/TuriLogo";
import { useAuth } from "@/components/auth/AuthProvider";

interface Invite {
  email: string;
  name: string;
  company: string;
  role: string;
  invitedByName: string;
  modules: string[];
}

function JoinInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();
  const { refresh } = useAuth();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Invite | null) => {
        if (d?.email) {
          setInvite(d);
          setName(d.name || "");
          setState("ready");
        } else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Choose a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    if (!r.ok) {
      setError("This invite is no longer valid.");
      setBusy(false);
      return;
    }
    await refresh();
    router.push("/mes");
  };

  const field = "w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm focus:border-accent focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <TuriLogo className="h-9 w-9" wordClass="text-ink" />
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
          {state === "loading" && (
            <div className="flex justify-center py-8 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          )}
          {state === "invalid" && (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Invite not found</h1>
              <p className="mt-1 text-sm text-ink-2">This invite link is invalid or has already been used.</p>
              <Link href="/login" className="mt-4 inline-block text-sm font-medium text-accent-strong hover:underline">Go to sign in</Link>
            </div>
          )}
          {state === "ready" && invite && (
            <>
              <h1 className="text-lg font-semibold">Join {invite.company}</h1>
              <p className="mt-1 text-sm text-ink-2">
                {invite.invitedByName} invited you as <span className="font-medium text-ink">{invite.role}</span>.
              </p>
              {invite.modules.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {invite.modules.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">
                      <Check className="size-3" />{m}
                    </span>
                  ))}
                </div>
              )}
              <form onSubmit={submit} className="mt-5 space-y-3">
                <label className="block text-xs font-medium text-ink-2">Your name
                  <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs font-medium text-ink-2">Email
                  <input readOnly value={invite.email} className={`${field} mt-1 bg-neutral-soft/50`} />
                </label>
                <label className="block text-xs font-medium text-ink-2">Choose a password
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} mt-1`} placeholder="At least 6 characters" />
                </label>
                {error && <p className="text-sm text-critical-text">{error}</p>}
                <button type="submit" disabled={busy} className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Join & continue
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
