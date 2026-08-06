import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { advanceMulti, loadStore, persist, snapshotFor } from "@/lib/server/demo-store";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";
import {
  capacityOutlook,
  lateOrders,
  operationBacklog,
  plantInsights,
} from "@/lib/insights";
import { downtimeTodayByReason } from "@/lib/mes-calc";

export const dynamic = "force-dynamic";

const LANG: Record<string, string> = { en: "English", tr: "Turkish", de: "German" };

/** Compact plant signal set for the suggestion model. */
async function buildContext(company: string) {
  const now = new Date();
  const multi = await loadStore(now);
  const changed = advanceMulti(multi, now);
  if (changed) await persist(multi);
  const snap = snapshotFor(multi, company, now);
  const reason = (id: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;

  return {
    heuristics: plantInsights(snap, now).map((i) => ({ kind: i.kind, severity: i.severity, ...i.params })),
    backlogPerMachineHours: operationBacklog(snap).map((b) => ({
      operation: b.name,
      hoursPerMachine: Math.round(b.hoursPerMachine),
    })),
    downtimeTodayByReason: downtimeTodayByReason(snap.downtime, now).map((d) => ({
      reason: reason(d.reasonId),
      minutes: d.minutes,
    })),
    lateOrderCount: lateOrders(snap, now).length,
    idleCapacity14dTopFree: capacityOutlook(snap, 14, now)
      .slice(0, 3)
      .map((c) => ({ operation: c.name, freeHours: c.freeHours, utilPct: c.utilPct })),
    todayScrap: snap.today.scrap,
    todayOutput: snap.today.output,
    utilizationPct: Math.round(snap.today.util * 100),
  };
}

export async function POST(req: Request) {
  const hasKey =
    !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN;
  if (!hasKey) return NextResponse.json({ mode: "local" }, { status: 503 });

  const { locale, company } = (await req.json().catch(() => ({}))) as {
    locale?: string;
    company?: string;
  };
  const lang = LANG[locale ?? "en"] ?? "English";

  const system = `You are the KioskMES Smart Manufacturing analyst for a sheet-metal plant.
From the live plant signals (JSON) produce the 3 most valuable improvement suggestions right now.
Each item: a one-sentence reading of the situation and a one-sentence concrete recommendation.
Focus on bottlenecks, dominant losses (downtime/scrap), late-order risk and where idle capacity can be filled.
Frame value as recovered capacity / reduced loss — NEVER compare to the software price or make ROI/payback claims.
Reply in ${lang}. Return ONLY a JSON array of exactly 3 objects: [{"text": "...", "recommendation": "..."}]. No prose, no code fences.

LIVE PLANT SIGNALS (JSON):
${JSON.stringify(await buildContext(company ?? DEFAULT_COMPANY_ID))}`;

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: "Give the 3 suggestions now." }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const items = JSON.parse(json) as { text: string; recommendation: string }[];
    return NextResponse.json({ mode: "llm", items: items.slice(0, 3) });
  } catch {
    return NextResponse.json({ mode: "local" }, { status: 503 });
  }
}
