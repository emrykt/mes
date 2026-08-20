import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  advanceMulti,
  loadStore,
  persist,
  snapshotFor,
} from "@/lib/server/demo-store";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";
import {
  downtimeTodayByReason,
  minutesAgo,
  orderDone,
  paretoOf,
  planPerformanceOf,
  workloadOf,
} from "@/lib/mes-calc";
import { plantEconomics } from "@/lib/revenue";
import { plantInsights, rootCauseFor } from "@/lib/insights";
import { plantScore, weakestFactors } from "@/lib/score";
import { SIM_STATIONS } from "@/lib/sim";

export const dynamic = "force-dynamic";

const LANG: Record<string, string> = { en: "English", de: "German" };

const REFUSAL: Record<string, string> = {
  en: "I'm the TURI AI assistant — I can only provide information about production and efficiency.",
  de: "Ich bin der TURI-KI-Assistent — ich kann nur Auskunft zu Produktion und Effizienz geben.",
};

/** Compact, model-friendly snapshot of the live plant. */
async function buildContext(company: string): Promise<string> {
  const now = new Date();
  const multi = await loadStore(now);
  const changed = advanceMulti(multi, now);
  if (changed) await persist(multi);
  const snap = snapshotFor(multi, company, now);

  const reason = (id: string) =>
    snap.settings.downtimeReasons.find((r) => r.id === id)?.name ?? id;
  const op = (id: string) =>
    snap.settings.operations.find((o) => o.id === id)?.name ?? id;
  const st = (id: string) => SIM_STATIONS.find((s) => s.id === id)?.name ?? id;

  const openOrders = snap.orders.filter((o) => !orderDone(o));
  const rushAtRisk = openOrders.filter(
    (o) =>
      o.priority === "high" &&
      new Date(o.dueDate).getTime() - now.getTime() < 3 * 86400000,
  );
  const dtToday = downtimeTodayByReason(snap.downtime, now);
  const laborPerHour = snap.settings.costRates.laborPerHour;
  const eco = plantEconomics(snap, now);
  const insights = plantInsights(snap, now);
  const score = plantScore(snap, now);
  const openAlerts = snap.alerts.filter((a) => !a.acked);
  const lateRootCauses = openOrders
    .filter((o) => new Date(o.dueDate).getTime() < now.getTime())
    .slice(0, 6)
    .map((o) => {
      const cause = rootCauseFor(o, snap, now);
      return { id: o.id, customer: o.customer, cause: cause?.kind ?? null, detail: cause?.params ?? null };
    });

  return JSON.stringify(
    {
      currency: snap.settings.currency,
      today: {
        utilizationPct: Math.round(snap.today.util * 100),
        output: snap.today.output,
        scrap: snap.today.scrap,
        planPerformancePct: Math.round(planPerformanceOf(snap.orders) * 100),
        revenue: Math.round(eco.revenue),
        cost: Math.round(eco.cost),
        profit: Math.round(eco.profit),
        marginPct: Math.round(eco.marginPct),
        lostRevenue: Math.round(eco.lostRevenue),
      },
      lostRevenueByStation: eco.byStation
        .filter((s) => s.lost > 0)
        .map((s) => ({ station: s.name, amount: Math.round(s.lost), downMinutes: s.downMin })),
      costRatesInCurrency: snap.settings.costRates,
      stations: snap.stations.map((s) => ({
        name: st(s.id),
        state: s.state,
        operator: s.operator,
        downtimeReason: s.downtimeReasonId ? reason(s.downtimeReasonId) : null,
        downMinutes: s.downtimeSince ? minutesAgo(s.downtimeSince, now) : 0,
        todayOutput: s.todayOutput,
      })),
      openAndonCalls: snap.andon
        .filter((a) => a.open)
        .map((a) => ({ station: st(a.stationId), type: a.type, minAgo: minutesAgo(a.at, now) })),
      downtimeCostToday: dtToday.map((d) => ({
        reason: reason(d.reasonId),
        minutes: d.minutes,
        cost: Math.round((d.minutes / 60) * laborPerHour),
      })),
      maintenance: snap.settings.features.maintenance
        ? {
            overdue: snap.maintenance.filter((m) => m.nextDueAt < snap.now).length,
            soonest: snap.maintenance
              .slice()
              .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt))
              .slice(0, 3)
              .map((m) => ({ task: m.title, station: st(m.stationId), dueAt: m.nextDueAt })),
          }
        : "module disabled",
      workloadByOperationHours: workloadOf(snap.orders)
        .slice(0, 6)
        .map((w) => ({ operation: op(w.operationId), hours: Math.round((w.minutes / 60) * 10) / 10 })),
      openOrderCount: openOrders.length,
      rushOrdersAtRisk: rushAtRisk.map((o) => ({ id: o.id, customer: o.customer, due: o.dueDate })),
      // 0–1000 plant performance score with per-factor points and the weakest
      // factors to fix (raise the score by improving these).
      performanceScore: {
        total: score.total,
        band: score.band,
        factors: score.factors.map((f) => ({
          factor: f.key,
          points: f.points,
          weight: f.weight,
          valuePct: Math.round(f.value * 100),
        })),
        weakest: weakestFactors(score, 3).map((f) => f.key),
      },
      // Smart Manufacturing signals: bottlenecks + suggestions, live escalations,
      // and why each late order is behind.
      smartSuggestions: insights.map((i) => ({ kind: i.kind, severity: i.severity, ...i.params })),
      openEscalations: openAlerts.map((a) => ({
        notify: a.target,
        station: st(a.stationId),
        trigger: a.trigger,
        reason: a.reasonId ? reason(a.reasonId) : null,
        minutesDown: a.trigger === "downtime" ? Math.round(a.value) : null,
        scrapPct: a.trigger === "scrapRate" ? Math.round(a.value * 100) : null,
      })),
      lateOrderRootCauses: lateRootCauses,
    },
    null,
    0,
  );
}

export async function POST(req: Request) {
  const hasKey =
    !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN;
  // No credentials → tell the client to fall back to the local engine.
  if (!hasKey) return NextResponse.json({ mode: "local" }, { status: 503 });

  const { question, locale, scope, company } = (await req.json()) as {
    question: string;
    locale?: string;
    scope?: "full" | "ops";
    company?: string;
  };
  const lang = LANG[locale ?? "en"] ?? "English";
  const refusal = REFUSAL[locale ?? "en"] ?? REFUSAL.en;
  const opsScope = scope === "ops"
    ? `\nThis is the PRODUCTION MANAGEMENT assistant: it has no money remit. Do NOT discuss cost, revenue, profit, margin, lost revenue or pricing — if asked, briefly say those belong to Sales and the Executive view and offer an operational answer instead (efficiency, bottleneck, downtime, orders, quality). Ignore any money fields in the data for your answers.`
    : "";

  const system = `You are the TURI Smart Manufacturing Assistant for a sheet-metal fabrication shop.
You answer ONLY questions about production and efficiency, using the live plant data provided below as JSON.
Scope you may answer: utilization/OEE-style efficiency, output vs target, plan performance, daily and downtime cost, revenue/profit/margin, lost revenue (opportunity cost of downtime), which machines are down and for how long, scrap, maintenance plan, order/backlog status and due-date risk, shift and operator comparison, andon calls, the current bottleneck and how to relieve it (smartSuggestions), open escalations/alerts (openEscalations), why a late order is behind (lateOrderRootCauses), the 0–1000 performance score and how to raise it (performanceScore — improving its weakest factors adds the most points), and rough quoting/pricing questions using the station billing rates.
If the user asks about anything outside production and efficiency (general knowledge, coding, chit-chat, politics, personal advice, etc.), you MUST reply with exactly this sentence and nothing else: "${refusal}"
Behave like a proactive shop-floor advisor: lead with the answer, then — when it helps — surface the live bottleneck, an open escalation, or one concrete improvement drawn from smartSuggestions. Make the manager *feel* the upside of acting by pointing to recovered capacity and reduced loss (use the lostRevenue and downtime figures). NEVER compare anything to the software's price or subscription, and never make ROI/payback/"pays for itself" claims about the product — convey value only through the plant's own recovered capacity and avoided loss.
Rules: reply in ${lang}. Be concise (1–4 sentences; a short bulleted list is fine for suggestions). Use the numbers from the data; never invent figures. Costs are already in the data's stated currency — show that currency and do not convert. Do not mention that you are reading JSON or that this is a demo.${opsScope}

LIVE PLANT DATA (JSON):
${await buildContext(company ?? DEFAULT_COMPANY_ID)}`;

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: question }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return NextResponse.json({ mode: "llm", text: text || refusal });
  } catch {
    // On any API error, fall back to the local engine client-side.
    return NextResponse.json({ mode: "local" }, { status: 503 });
  }
}
