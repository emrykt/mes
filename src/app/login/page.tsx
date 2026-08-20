"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Factory, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tourBusy, setTourBusy] = useState(false);

  const startTour = async () => {
    setError(null);
    setTourBusy(true);
    try {
      const r = await fetch("/api/auth/demo-login", { method: "POST" });
      if (!r.ok) {
        setError("Could not start the demo tour.");
        setTourBusy(false);
        return;
      }
      await refresh();
      router.push("/mes");
    } catch {
      setError("Could not start the demo tour.");
      setTourBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!r.ok) {
        setError("Incorrect username/email or password.");
        setBusy(false);
        return;
      }
      const { user } = await r.json();
      await refresh();
      // route by role
      if (user.kind === "platform") router.push("/admin");
      else router.push("/mes");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm focus:border-accent focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <Factory className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">TURI</span>
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-2">Access your production intelligence workspace.</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-ink-2">
              Email or username
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                className={`${field} mt-1`}
                placeholder="you@company.com"
              />
            </label>
            <label className="block text-xs font-medium text-ink-2">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${field} mt-1`}
                placeholder="••••••••"
              />
            </label>
            {error && <p className="text-sm text-critical-text">{error}</p>}
            <button
              type="submit"
              disabled={busy || !identifier || !password}
              className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Sign in
            </button>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-muted">Just exploring? Take a guided, view-only tour — no account needed.</p>
            <button
              onClick={startTour}
              disabled={tourBusy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-neutral-soft disabled:opacity-60"
            >
              {tourBusy ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              View-only demo tour
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/#contact" className="font-medium text-accent-strong hover:underline">
            Request a demo
          </Link>
        </p>
      </div>
    </main>
  );
}
