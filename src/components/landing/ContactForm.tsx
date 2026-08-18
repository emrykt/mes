"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { useSiteConfig } from "@/lib/useSiteConfig";

/** Contact / demo-request section (mock — the lead is stored, not emailed). */
export default function ContactForm() {
  const c = useSiteConfig().content.contact;
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!c?.enabled) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = form.name.trim() && /.+@.+\..+/.test(form.email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "submitLead", lead: form }),
      });
    } catch {
      /* mock — ignore network errors */
    }
    setBusy(false);
    setDone(true);
    setForm({ name: "", email: "", company: "", message: "" });
  };

  const field = "w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";

  return (
    <section id="contact" className="scroll-mt-24 bg-page">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <div className="grid md:grid-cols-2">
            {/* left: pitch */}
            <div
              className="relative flex flex-col justify-center gap-4 p-10 text-white"
              style={{ background: "linear-gradient(135deg,#0e8390,#16a34a 55%,#2f74d0)" }}
            >
              {c.headline && <h2 className="text-3xl font-semibold tracking-tight">{c.headline}</h2>}
              {c.intro && <p className="max-w-sm text-white/90">{c.intro}</p>}
              <ul className="mt-2 space-y-2 text-sm text-white/90">
                <li className="flex items-center gap-2"><Check className="size-4" /> Tailored to your operation</li>
                <li className="flex items-center gap-2"><Check className="size-4" /> Live in days, not a year</li>
                <li className="flex items-center gap-2"><Check className="size-4" /> No obligation</li>
              </ul>
            </div>

            {/* right: form */}
            <div className="p-8 sm:p-10">
              {done ? (
                <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-good-soft text-good-text">
                    <Check className="size-7" />
                  </span>
                  <p className="mt-4 max-w-xs text-sm text-ink-2">{c.successMessage}</p>
                  <button onClick={() => setDone(false)} className="mt-5 text-sm font-medium text-accent-strong hover:underline">
                    Send another request
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-ink-2">
                      Name*
                      <input value={form.name} onChange={set("name")} className={`${field} mt-1`} placeholder="Your name" />
                    </label>
                    <label className="block text-xs font-medium text-ink-2">
                      Work email*
                      <input type="email" value={form.email} onChange={set("email")} className={`${field} mt-1`} placeholder="you@company.com" />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-ink-2">
                    Company
                    <input value={form.company} onChange={set("company")} className={`${field} mt-1`} placeholder="Company name" />
                  </label>
                  <label className="block text-xs font-medium text-ink-2">
                    What would you like to see?
                    <textarea value={form.message} onChange={set("message")} rows={3} className={`${field} mt-1 resize-none`} placeholder="Tell us about your shop…" />
                  </label>
                  <button
                    type="submit"
                    disabled={!valid || busy}
                    className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {c.submitLabel || "Request a demo"}
                  </button>
                  <p className="text-center text-xs text-muted">This is a demo form — no real email is sent.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
