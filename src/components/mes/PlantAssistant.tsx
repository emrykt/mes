"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { SIM_STATIONS } from "@/lib/sim";
import {
  MONEY_INTENTS,
  chipsFor,
  answerFor,
  matchIntent,
  type AssistantDeps,
  type AssistantScope,
  type Intent,
} from "./assistant-engine";

interface ChatMsg {
  role: "user" | "bot";
  text: string;
}

/** Ask the optional server LLM; returns null when no model is configured. */
async function askServer(
  question: string,
  locale: string,
  scope: AssistantScope,
): Promise<string | null> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale, scope }),
    });
    if (res.status === 503) return null; // no API key → use local engine
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text ?? null;
  } catch {
    return null;
  }
}

/**
 * Plant assistant chat — answers from the live demo store (no external model).
 * Shared by the production-manager and executive faces.
 */
export default function PlantAssistant({ scope = "full" }: { scope?: AssistantScope }) {
  const t = useTranslations("mes.assistant");
  const tInsights = useTranslations("mes.insights");
  const tAlerts = useTranslations("mes.alerts");
  const tScore = useTranslations("mes.score");
  const locale = useLocale();
  const { snap } = useDemo();
  const chips = chipsFor(scope);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  function localAnswer(q: string, intent?: Intent): string {
    const deps: AssistantDeps = {
      snap: snap!,
      locale,
      question: q,
      t: t as AssistantDeps["t"],
      tInsights: tInsights as AssistantDeps["tInsights"],
      tAlerts: tAlerts as AssistantDeps["tAlerts"],
      tScore: tScore as AssistantDeps["tScore"],
      reasonName: (id) =>
        snap!.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id,
      opName: (id) => snap!.settings.operations.find((o) => o.id === id)?.name ?? id,
      stationName: (id) => SIM_STATIONS.find((s) => s.id === id)?.name ?? id,
    };
    return answerFor(intent ?? matchIntent(q), deps);
  }

  async function ask(text: string, intent?: Intent) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    // Production ("ops") has no money remit — send money questions elsewhere.
    const resolved = intent ?? matchIntent(q);
    if (scope === "ops" && MONEY_INTENTS.has(resolved)) {
      setThinking(false);
      setMessages((m) => [...m, { role: "bot", text: t("opsNoMoney") }]);
      return;
    }
    // Prefer the real LLM when a server key is configured; otherwise the
    // deterministic local engine answers from the same live data.
    let answer: string;
    try {
      const server = intent ? null : await askServer(q, locale, scope);
      answer = server ?? localAnswer(q, resolved);
    } catch {
      answer = t("help");
    }
    setThinking(false);
    setMessages((m) => [...m, { role: "bot", text: answer }]);
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border border-line bg-surface">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
      </div>

      {/* conversation */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Bot className="size-6" />
            </span>
            <p className="mt-3 text-sm text-ink-2">{t("greeting")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.labelKey}
                  onClick={() => ask(t(c.labelKey), c.intent)}
                  className="rounded-full border border-line bg-page px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-accent hover:text-accent-strong"
                >
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                m.role === "user"
                  ? "bg-neutral-soft text-ink-2"
                  : "bg-accent text-white"
              }`}
            >
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-page text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
              <Bot className="size-4" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl bg-page px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* quick chips (always available once chatting) */}
      {messages.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-5 pt-3">
          {chips.map((c) => (
            <button
              key={c.labelKey}
              onClick={() => ask(t(c.labelKey), c.intent)}
              className="rounded-full border border-line bg-page px-2.5 py-1 text-[11px] font-medium text-muted hover:border-accent hover:text-accent-strong"
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          className="grow rounded-xl border border-line bg-page px-4 py-2.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={input.trim() === "" || thinking}
          className="flex size-10 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-strong disabled:opacity-40"
          aria-label={t("send")}
        >
          <Send className="size-4" />
        </button>
      </form>
      <p className="px-4 pb-3 text-center text-[11px] text-muted">{t("disclaimer")}</p>
    </div>
  );
}
