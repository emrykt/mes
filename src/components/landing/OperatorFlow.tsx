import { useTranslations } from "next-intl";
import { ArrowRight, Smartphone, Tablet, Sparkles, ChevronRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/**
 * "The operator taps three times, TURI does the rest" — contrasts the operator's
 * trivial kiosk actions (pick / start / finish, on a tablet or phone) with the
 * deep chain TURI derives behind them.
 */
export default function OperatorFlow() {
  const t = useTranslations("landing");
  const steps = [t("opsStep1"), t("opsStep2"), t("opsStep3")];
  const chain = Array.from({ length: 9 }, (_, i) => t(`opsChain${i + 1}`));

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
          {t("opsEyebrow")}
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">{t("opsTitle")}</h2>
      </Reveal>

      <div className="mt-12 grid items-center gap-8 lg:grid-cols-[0.9fr_auto_1.1fr]">
        {/* operator side — a device with three big taps */}
        <Reveal className="mx-auto w-full max-w-sm">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">{t("opsOperatorLabel")}</p>
          <div className="mx-auto max-w-[16rem] rounded-[1.75rem] border-4 border-ink/80 bg-[#0b1f27] p-3 shadow-2xl">
            <div className="rounded-2xl bg-white/[0.04] p-3">
              {steps.map((s, i) => (
                <div key={s} className="mb-2 last:mb-0">
                  <div
                    className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold ${
                      i === 2 ? "bg-good text-white" : "bg-white/10 text-white"
                    }`}
                  >
                    <span className="anim-pulse-soft flex size-6 items-center justify-center rounded-full bg-white/15 text-xs">
                      {i + 1}
                    </span>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-4 flex max-w-xs items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-ink-2">
            <span className="mt-0.5 flex gap-1 text-accent-strong">
              <Tablet className="size-4" />
              <Smartphone className="size-4" />
            </span>
            {t("opsDevice")}
          </div>
        </Reveal>

        {/* connector */}
        <div className="hidden shrink-0 flex-col items-center justify-center text-accent lg:flex">
          <ChevronRight className="size-8" />
        </div>

        {/* TURI side — the derived chain */}
        <Reveal delay={120}>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-strong">
            <Sparkles className="size-3.5" /> {t("opsTuriLabel")}
          </p>
          <ol className="stagger space-y-1.5">
            {chain.map((c, i) => (
              <li
                key={c}
                className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-strong">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{c}</span>
                {i < chain.length - 1 && (
                  <ArrowRight className="ml-auto size-4 text-line transition-colors group-hover:text-accent" />
                )}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
