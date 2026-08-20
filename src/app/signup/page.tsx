"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Copy, CreditCard, Gift, Loader2, Lock, Sparkles } from "lucide-react";
import TuriLogo from "@/components/TuriLogo";
import { PLANS } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import type { PlanId } from "@/lib/types";

type Period = "monthly" | "annual";
type Step = "plan" | "payment" | "account" | "done";
const SELECTABLE: PlanId[] = ["BASIC", "AIPRO", "AIULTIMATE"];

interface DoneInfo {
  name: string;
  trial: boolean;
  referralApplied: boolean;
  referralCode: string;
}

function SignupInner() {
  const t = useTranslations("signup");
  const tp = useTranslations("plans");
  const params = useSearchParams();
  const router = useRouter();

  const initialPlan = (params.get("plan") ?? "AIPRO").toUpperCase();
  const [plan, setPlan] = useState<PlanId>(
    SELECTABLE.includes(initialPlan as PlanId) ? (initialPlan as PlanId) : "AIPRO",
  );
  const [period, setPeriod] = useState<Period>("annual");
  const [referral, setReferral] = useState(params.get("ref") ?? "");
  const [step, setStep] = useState<Step>("plan");

  // account fields
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const def = PLANS[plan];
  const contact = def.contact;
  const monthly = period === "annual" ? def.annualPrice : def.monthlyPrice;
  const yearlyTotal = def.annualPrice * 12;
  const tagline: Record<PlanId, string> = {
    BASIC: t("planTaglineBasic"),
    AIPRO: t("planTaglineAipro"),
    AIULTIMATE: t("planTaglineFlexible"),
  };

  const steps: { key: Step; label: string }[] = useMemo(
    () => [
      { key: "plan", label: t("stepPlan") },
      { key: "payment", label: t("stepPayment") },
      { key: "account", label: t("stepAccount") },
      { key: "done", label: t("stepDone") },
    ],
    [t],
  );
  const stepIndex = steps.findIndex((s) => s.key === step);

  const field =
    "w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm focus:border-accent focus:outline-none";

  const submit = async () => {
    setError(null);
    if (!company.trim()) return setError(t("errMissingCompany"));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError(t("errInvalidEmail"));
    if (password.length < 6) return setError(t("errWeakPassword"));
    setBusy(true);
    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, sector, plan, period, ownerName, email, password, referralCode: referral }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        const map: Record<string, string> = {
          emailTaken: t("errEmailTaken"),
          invalidEmail: t("errInvalidEmail"),
          weakPassword: t("errWeakPassword"),
          missingCompany: t("errMissingCompany"),
        };
        setError(map[d.error] ?? t("errFailed"));
        setBusy(false);
        return;
      }
      setDone({
        name: ownerName.trim() || company.trim(),
        trial: Boolean(d.trial),
        referralApplied: Boolean(d.referralApplied),
        referralCode: d.referralCode ?? "",
      });
      setStep("done");
    } catch {
      setError(t("errFailed"));
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <TuriLogo className="h-8 w-8" wordClass="text-ink" />
          </Link>
          {step !== "done" && (
            <Link href="/login" className="text-sm text-muted hover:text-ink">
              {t("back")}
            </Link>
          )}
        </div>

        {/* stepper */}
        {step !== "done" && (
          <ol className="mt-8 flex items-center gap-2 text-xs font-medium">
            {steps.slice(0, 3).map((s, i) => {
              const active = i === stepIndex;
              const passed = i < stepIndex;
              return (
                <li key={s.key} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      passed
                        ? "bg-good text-white"
                        : active
                          ? "bg-accent text-white"
                          : "bg-neutral-soft text-muted"
                    }`}
                  >
                    {passed ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={active ? "text-ink" : "text-muted"}>{s.label}</span>
                  {i < 2 && <span className="mx-1 h-px flex-1 bg-line" />}
                </li>
              );
            })}
          </ol>
        )}

        {/* ---------------- STEP 1: PLAN ---------------- */}
        {step === "plan" && (
          <section className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight">{t("choosePlanTitle")}</h1>
            <p className="mt-1 text-sm text-ink-2">{t("choosePlanSub")}</p>

            {/* billing toggle */}
            <div className="mt-6 inline-flex items-center rounded-full border border-line bg-surface p-1 text-sm font-medium">
              <button
                onClick={() => setPeriod("monthly")}
                className={`rounded-full px-4 py-1.5 ${period === "monthly" ? "bg-accent text-white" : "text-ink-2"}`}
              >
                {t("monthly")}
              </button>
              <button
                onClick={() => setPeriod("annual")}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 ${period === "annual" ? "bg-accent text-white" : "text-ink-2"}`}
              >
                {t("annual")}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${period === "annual" ? "bg-white/20 text-white" : "bg-good/15 text-good"}`}>
                  {t("save")}
                </span>
              </button>
            </div>

            {/* plan cards */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {SELECTABLE.map((id) => {
                const p = PLANS[id];
                const sel = id === plan;
                const price = period === "annual" ? p.annualPrice : p.monthlyPrice;
                return (
                  <button
                    key={id}
                    onClick={() => setPlan(id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      sel ? "border-accent ring-1 ring-accent" : "border-line hover:border-ink-2/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{tp(id)}</h3>
                      {sel && <Check className="size-4 text-accent" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{tagline[id]}</p>
                    <p className="mt-3">
                      {p.contact ? (
                        <span className="text-lg font-semibold">{t("contactSales")}</span>
                      ) : (
                        <>
                          <span className="text-2xl font-semibold tracking-tight">{formatMoney(price)}</span>
                          <span className="text-xs text-muted"> {t("perMonth")}</span>
                        </>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* referral */}
            <div className="mt-6 rounded-xl border border-line bg-surface p-4">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Gift className="size-4 text-accent" />
                {t("referralLabel")}
              </label>
              <input
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                placeholder={t("referralPlaceholder")}
                className={`${field} mt-2 uppercase`}
              />
              <p className="mt-1.5 text-xs text-muted">{t("referralHint")}</p>
            </div>

            <div className="mt-6">
              {contact ? (
                <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
                  <p className="text-sm text-ink-2">{t("contactSalesHint")}</p>
                  <Link
                    href="/#contact"
                    className="btn-sheen mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
                  >
                    {t("contactSales")}
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => setStep("payment")}
                  className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-strong sm:w-auto sm:px-8"
                >
                  {t("continueToPayment")}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ---------------- STEP 2: PAYMENT ---------------- */}
        {step === "payment" && (
          <section className="mt-8 grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div>
              <button onClick={() => setStep("plan")} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                <ArrowLeft className="size-4" /> {t("back")}
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">{t("paymentTitle")}</h1>
              <p className="mt-1 text-sm text-ink-2">{t("paymentSub")}</p>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft/30 p-3 text-xs text-ink-2">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-warning-text" />
                {t("demoNote")}
              </div>

              <div className="mt-5 space-y-3">
                <label className="block text-xs font-medium text-ink-2">
                  {t("cardName")}
                  <input className={`${field} mt-1`} autoComplete="off" />
                </label>
                <label className="block text-xs font-medium text-ink-2">
                  {t("cardNumber")}
                  <div className="relative mt-1">
                    <CreditCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input className={`${field} pl-9`} inputMode="numeric" placeholder="4242 4242 4242 4242" autoComplete="off" />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-ink-2">
                    {t("cardExpiry")}
                    <input className={`${field} mt-1`} placeholder="MM/YY" autoComplete="off" />
                  </label>
                  <label className="block text-xs font-medium text-ink-2">
                    {t("cardCvc")}
                    <input className={`${field} mt-1`} inputMode="numeric" placeholder="123" autoComplete="off" />
                  </label>
                </div>
              </div>

              <button
                onClick={() => setStep("account")}
                className="btn-sheen mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-strong"
              >
                {t("payAndContinue")}
              </button>
            </div>

            <OrderSummary
              t={t}
              planName={tp(plan)}
              period={period}
              monthly={monthly}
              yearlyTotal={yearlyTotal}
              trial={Boolean(referral.trim())}
            />
          </section>
        )}

        {/* ---------------- STEP 3: ACCOUNT ---------------- */}
        {step === "account" && (
          <section className="mt-8 grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div>
              <button onClick={() => setStep("payment")} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                <ArrowLeft className="size-4" /> {t("back")}
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">{t("accountTitle")}</h1>
              <p className="mt-1 text-sm text-ink-2">{t("accountSub")}</p>

              <div className="mt-5 space-y-3">
                <label className="block text-xs font-medium text-ink-2">
                  {t("companyName")}
                  <input value={company} onChange={(e) => setCompany(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs font-medium text-ink-2">
                  {t("companySector")}
                  <input value={sector} onChange={(e) => setSector(e.target.value)} className={`${field} mt-1`} placeholder={t("sectorPlaceholder")} />
                </label>
                <label className="block text-xs font-medium text-ink-2">
                  {t("ownerName")}
                  <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs font-medium text-ink-2">
                  {t("email")}
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs font-medium text-ink-2">
                  {t("password")}
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} mt-1`} placeholder={t("passwordHint")} />
                </label>
              </div>

              {error && <p className="mt-3 text-sm text-critical-text">{error}</p>}

              <button
                onClick={submit}
                disabled={busy}
                className="btn-sheen mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
              >
                {busy ? <><Loader2 className="size-4 animate-spin" /> {t("creating")}</> : <>{t("createAccount")}</>}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Lock className="size-3" /> {t("secure")}
              </p>
            </div>

            <OrderSummary
              t={t}
              planName={tp(plan)}
              period={period}
              monthly={monthly}
              yearlyTotal={yearlyTotal}
              trial={Boolean(referral.trim())}
            />
          </section>
        )}

        {/* ---------------- STEP 4: DONE ---------------- */}
        {step === "done" && done && (
          <section className="mt-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-good/15">
              <Check className="size-7 text-good" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("doneTitle", { name: done.name })}</h1>
            <p className="mt-1 text-sm text-ink-2">{t("doneSub")}</p>

            {done.trial && (
              <p className="mx-auto mt-4 max-w-md rounded-lg bg-accent-soft/50 px-4 py-2 text-sm text-accent-strong">
                <Sparkles className="mr-1 inline size-4" />
                {t("trialStarted")}
              </p>
            )}
            {done.referralApplied && (
              <p className="mx-auto mt-2 max-w-md text-sm text-good-text">{t("referralCredited")}</p>
            )}

            {/* share your own code */}
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-surface p-5 text-left">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Gift className="size-4 text-accent" />
                {t("referralShareTitle")}
              </p>
              <p className="mt-1 text-xs text-ink-2">{t("referralShareSub")}</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-line bg-page px-3 py-2 text-center text-sm font-semibold tracking-wider">
                  {done.referralCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(done.referralCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-neutral-soft"
                >
                  {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push("/mes")}
              className="btn-sheen mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-3 text-sm font-medium text-white hover:bg-accent-strong"
            >
              {t("openWorkspace")}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function OrderSummary({
  t,
  planName,
  period,
  monthly,
  yearlyTotal,
  trial,
}: {
  t: ReturnType<typeof useTranslations>;
  planName: string;
  period: Period;
  monthly: number;
  yearlyTotal: number;
  trial: boolean;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm font-semibold">{t("orderSummary")}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t("planLabel")}</dt>
          <dd className="font-medium">{planName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t("periodLabel")}</dt>
          <dd className="font-medium">{period === "annual" ? t("periodAnnual") : t("periodMonthly")}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-line pt-3 text-sm">
        {period === "annual" ? (
          <p className="text-xs text-muted">{t("annualTotalNote", { n: yearlyTotal, m: monthly })}</p>
        ) : (
          <p className="text-xs text-muted">{t("monthlyTotalNote", { n: monthly })}</p>
        )}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">{t("dueToday")}</span>
          {trial ? (
            <span className="text-sm font-semibold text-good-text">{t("dueTodayTrial")}</span>
          ) : (
            <span className="text-xl font-semibold tracking-tight">
              {formatMoney(period === "annual" ? yearlyTotal : monthly)}
            </span>
          )}
        </div>
        {trial && <p className="mt-1 text-xs text-muted">{t("trialThenLine", { n: monthly })}</p>}
        <p className="mt-2 text-xs text-muted">{t("renewsLine")}</p>
      </div>
    </aside>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
