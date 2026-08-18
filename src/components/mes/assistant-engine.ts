import type { DemoSnapshot } from "@/lib/demo-types";
import {
  downtimeCostPerHour,
  downtimeTodayByReason,
  minutesAgo,
  orderDone,
  paretoOf,
  planPerformanceOf,
  workloadOf,
} from "@/lib/mes-calc";
import { formatCost } from "@/lib/currency";
import { plantEconomics } from "@/lib/revenue";
import { plantInsights } from "@/lib/insights";
import { plantScore, weakestFactors } from "@/lib/score";
import { SIM_STATIONS, performanceFor } from "@/lib/sim";

/**
 * A data-driven plant assistant. It does NOT call an external model — it maps
 * the question to an intent by keywords (EN/DE) and answers from the live
 * demo store, adding a short recommendation. Deterministic and offline.
 */

export type Intent =
  | "efficiency"
  | "dailyCost"
  | "downtimeCost"
  | "machinesDown"
  | "maintenance"
  | "output"
  | "scrap"
  | "workload"
  | "andon"
  | "shifts"
  | "operators"
  | "dueRisk"
  | "orderLookup"
  | "revenue"
  | "lostRevenue"
  | "bottleneck"
  | "suggestions"
  | "alerts"
  | "score"
  | "greeting"
  | "help"
  | "offtopic";

/** Plant target for output (kept in sync with the executive view). */
const PLANT_TARGET = Math.round(
  SIM_STATIONS.reduce((s, st) => s + st.rate, 0) * 24 * 0.65,
);

const CUTTING = new Set(["op-laser", "op-plasma", "op-oxyfuel"]);

/** Order-number pattern (WO-YYYY-MM-NNN; legacy SIP- still recognized). */
const ORDER_RE = /\b(?:WO|SIP)-\d{4}-\d{2}-\d{3}\b/i;

/** Greetings / small talk that should get a friendly on-topic nudge. */
const GREETING_KW = [
  "hello", "hi ", "hey", "thanks", "thank you", "good morning",
  "hallo", "guten tag", "danke", "moin",
];

/**
 * Broad on-topic vocabulary. If the question matches none of these AND no
 * intent, it's off-topic → the fixed refusal. Covers EN/DE.
 */
const ON_TOPIC_KW = [
  // production / plant
  "production", "plant", "factory", "shop floor", "shift", "manufactur", "output",
  "produkt", "fertigung", "werk", "schicht", "ausstoß", "ausstoss",
  // machines / stations / operations
  "machine", "station", "operation", "line", "cutting", "welding", "bending", "assembly",
  "laser", "punch", "maschine", "anlage", "arbeitsgang", "bediener", "schneiden",
  "schweißen", "montage",
  // metrics
  "oee", "efficiency", "utilization", "performance", "auslastung", "effizienz",
  "leistung", "capacity", "kapazität",
  // orders / schedule
  "order", "work order", "due", "routing", "queue", "backlog", "schedule",
  "auftrag", "fälligkeit", "faelligkeit", "rückstand", "warteschlange",
  // cost / quality / maintenance / downtime / andon
  "cost", "kosten", "scrap", "ausschuss", "quality", "qualität", "maintenance",
  "wartung", "downtime", "stillstand", "andon", "energy", "energie", "gas",
  // revenue / profit
  "revenue", "profit", "margin", "quote", "price", "umsatz", "gewinn", "marge", "angebot", "preis",
  // smart manufacturing: bottleneck / suggestions / alerts / score
  "bottleneck", "improve", "recommend", "suggestion", "advice", "alert", "escalation",
  "engpass", "vorschlag", "verbesser", "empfehl", "warnung", "eskal",
  "score", "punkt", "rating", "bewertung",
];

/** Keyword → intent. Order matters: more specific intents first. */
const RULES: { intent: Intent; kw: string[] }[] = [
  {
    intent: "score",
    kw: [
      "score", "rating", "how many points", "1000",
      "punktzahl", "bewertung", "punkte",
    ],
  },
  {
    intent: "alerts",
    kw: [
      "alert", "escalation", "escalate", "alarm",
      "warnung", "eskalation", "warnmeldung",
    ],
  },
  {
    intent: "bottleneck",
    kw: [
      "bottleneck", "constraint", "choke", "busiest",
      "engpass", "flaschenhals",
    ],
  },
  {
    intent: "suggestions",
    kw: [
      "improve", "recommend", "suggestion", "advice", "what should",
      "vorschlag", "empfehl", "verbesser", "ratschlag",
    ],
  },
  {
    intent: "lostRevenue",
    kw: [
      "lost revenue", "opportunity cost", "missed revenue", "revenue lost",
      "entgangen", "verlorener umsatz", "opportunitätskosten", "umsatz verlor",
    ],
  },
  {
    intent: "downtimeCost",
    kw: [
      "downtime cost", "cost of downtime", "stillstandskosten", "stillstand kosten",
    ],
  },
  {
    intent: "machinesDown",
    kw: [
      "which machine", "which station", "down", "stopped", "stoppage",
      "welche maschine", "steht", "stillstand", "stört", "störung",
    ],
  },
  {
    intent: "revenue",
    kw: [
      "revenue", "profit", "earning", "margin", "turnover",
      "umsatz", "gewinn", "erlös", "erloes", "marge", "ertrag",
    ],
  },
  {
    intent: "downtimeCost",
    kw: ["downtime", "stillstand"],
  },
  {
    intent: "maintenance",
    kw: [
      "maintenance", "wartung", "instand", "service", "periodic",
    ],
  },
  {
    intent: "scrap",
    kw: ["scrap", "ausschuss", "reject", "waste", "defective part"],
  },
  {
    intent: "workload",
    kw: [
      "workload", "queue", "auslastung der", "rückstand", "warteschlange",
      "capacity", "kapazität", "backlog", "pending",
    ],
  },
  {
    intent: "andon",
    kw: ["andon", "help call", "call for help", "hilferuf"],
  },
  {
    intent: "dueRisk",
    kw: [
      "due", "late", "overdue", "at risk", "rush", "deadline", "on time",
      "termin", "verspätet", "verspaetet", "überfällig", "ueberfaellig", "gefährdet", "eilauftrag",
    ],
  },
  {
    intent: "shifts",
    kw: ["shift", "schicht"],
  },
  {
    intent: "operators",
    kw: [
      "operator", "best operator", "worst", "who is", "staff", "personnel",
      "bediener", "beste", "schlechteste", "mitarbeiter",
    ],
  },
  {
    intent: "output",
    kw: [
      "output", "produktion", "how many parts", "units produced",
      "ausstoß", "ausstoss", "target", "ziel",
    ],
  },
  {
    intent: "dailyCost",
    kw: ["cost", "kosten", "money", "spend", "expense", "how much"],
  },
  {
    intent: "efficiency",
    kw: [
      "efficiency", "utilization", "effizienz", "auslastung", "oee",
      "performance", "leistung", "how is it going", "overall status",
    ],
  },
];

export function matchIntent(input: string): Intent {
  const q = input.toLowerCase();
  if (ORDER_RE.test(input)) return "orderLookup";
  for (const rule of RULES) {
    if (rule.kw.some((k) => q.includes(k))) return rule.intent;
  }
  if (GREETING_KW.some((k) => q.includes(k))) return "greeting";
  // On-topic but unmatched → capabilities list; otherwise refuse politely.
  if (ON_TOPIC_KW.some((k) => q.includes(k))) return "help";
  return "offtopic";
}

export interface AssistantDeps {
  snap: DemoSnapshot;
  locale: string;
  /** The raw question, for pattern extraction (e.g. order numbers). */
  question: string;
  /** next-intl translator bound to the "mes.assistant" namespace. */
  t: (key: string, values?: Record<string, string | number>) => string;
  /** translator bound to "mes.insights" (bottleneck/suggestion sentences). */
  tInsights: (key: string, values?: Record<string, string | number>) => string;
  /** translator bound to "mes.alerts" (escalation message pieces). */
  tAlerts: (key: string, values?: Record<string, string | number>) => string;
  /** translator bound to "mes.score" (factor names + improvement tips). */
  tScore: (key: string, values?: Record<string, string | number>) => string;
  /** downtime-reason id → localized name */
  reasonName: (id: string) => string;
  /** operation id → localized name */
  opName: (id: string) => string;
  /** station id → name */
  stationName: (id: string) => string;
}

function assess(t: AssistantDeps["t"], value: number, good: number, warn: number): string {
  if (value >= good) return t("assessGood");
  if (value >= warn) return t("assessOk");
  return t("assessWarn");
}

/** Produce the answer text for an intent from live data. */
export function answerFor(intent: Intent, d: AssistantDeps): string {
  const { snap, locale, t, tInsights, tAlerts, tScore, reasonName, opName, stationName } = d;
  const now = new Date(snap.now);
  const cur = snap.settings.currency;
  const money = (v: number, digits = 0) => formatCost(v, cur, locale, digits);
  const pct = (v: number) => Math.round(v * 100);

  switch (intent) {
    case "efficiency": {
      const util = pct(snap.today.util);
      const perf = pct(planPerformanceOf(snap.orders));
      return t("efficiency", {
        util,
        perf,
        rec: assess(t, snap.today.util, 0.7, 0.55),
      });
    }

    case "dailyCost": {
      const stations = SIM_STATIONS.length;
      const cuttingCount = SIM_STATIONS.filter((s) => CUTTING.has(s.operationId)).length;
      const cr = snap.settings.costRates;
      const elapsed = (now.getUTCHours() + 1) / 24;
      const labor = stations * 24 * cr.laborPerHour * elapsed;
      const energy = stations * 24 * snap.today.util * cr.energyPerHour * elapsed;
      const gas = cuttingCount * 24 * snap.today.util * cr.gasPerHour * elapsed;
      const overhead = cr.overheadPerDay * elapsed;
      const total = labor + energy + gas + overhead;
      const perPart = total / Math.max(1, snap.today.output);
      return t("dailyCost", {
        total: money(total),
        perPart: money(perPart, 2),
        labor: money(labor),
        energy: money(energy),
        gas: money(gas),
        overhead: money(overhead),
      });
    }

    case "downtimeCost": {
      const perHour = downtimeCostPerHour(snap.settings.costRates);
      const rows = downtimeTodayByReason(snap.downtime, now).map((r) => ({
        reasonId: r.reasonId,
        minutes: r.minutes,
        cost: (r.minutes / 60) * perHour,
      }));
      if (rows.length === 0) return t("downtimeCostNone");
      const total = rows.reduce((s, r) => s + r.cost, 0);
      const top = rows[0];
      const list = rows
        .slice(0, 4)
        .map((r) => t("lineReasonCost", { reason: reasonName(r.reasonId), cost: money(r.cost), min: r.minutes }))
        .join("\n");
      return t("downtimeCost", {
        total: money(total),
        reason: reasonName(top.reasonId),
        amount: money(top.cost),
        list,
      });
    }

    case "machinesDown": {
      const down = snap.stations.filter((s) => s.state === "down");
      if (down.length === 0) return t("machinesDownNone");
      const list = down
        .map((s) =>
          t("lineMachineDown", {
            name: stationName(s.id),
            reason: s.downtimeReasonId ? reasonName(s.downtimeReasonId) : "—",
            min: s.downtimeSince ? minutesAgo(s.downtimeSince, now) : 0,
          }),
        )
        .join("\n");
      return t("machinesDown", { count: down.length, list });
    }

    case "maintenance": {
      if (!snap.settings.features.maintenance) return t("maintenanceOff");
      const overdue = snap.maintenance.filter((m) => m.nextDueAt < snap.now);
      const soon = snap.maintenance.filter(
        (m) =>
          m.nextDueAt >= snap.now &&
          new Date(m.nextDueAt).getTime() - now.getTime() < 7 * 86400000,
      );
      if (overdue.length === 0 && soon.length === 0) return t("maintenanceNone");
      const top = overdue[0] ?? soon[0];
      return t("maintenance", {
        overdue: overdue.length,
        soon: soon.length,
        task: top.title,
        station: stationName(top.stationId),
      });
    }

    case "output": {
      const p = Math.round((snap.today.output / PLANT_TARGET) * 100);
      return t("output", {
        output: snap.today.output.toLocaleString(locale),
        target: PLANT_TARGET.toLocaleString(locale),
        pct: p,
        rec: assess(t, snap.today.output / PLANT_TARGET, 0.9, 0.7),
      });
    }

    case "scrap": {
      const rate = (snap.today.scrap / Math.max(1, snap.today.output)) * 100;
      return t("scrap", {
        scrap: snap.today.scrap,
        rate: rate.toFixed(1),
      });
    }

    case "workload": {
      const wl = workloadOf(snap.orders);
      const open = snap.orders.filter((o) => !orderDone(o)).length;
      const totalH = wl.reduce((s, w) => s + w.minutes, 0) / 60;
      if (wl.length === 0) return t("workloadNone", { open });
      const top = wl[0];
      const list = wl
        .slice(0, 3)
        .map((w) => t("lineWorkload", { op: opName(w.operationId), hours: Math.round(w.minutes / 60) }))
        .join("\n");
      return t("workload", {
        op: opName(top.operationId),
        hours: Math.round(top.minutes / 60),
        open,
        total: Math.round(totalH),
        list,
      });
    }

    case "andon": {
      const open = snap.andon.filter((a) => a.open);
      if (open.length === 0) return t("andonNone");
      const list = open
        .map((a) =>
          t("lineAndon", {
            name: stationName(a.stationId),
            min: minutesAgo(a.at, now),
          }),
        )
        .join("\n");
      return t("andon", { count: open.length, list });
    }

    case "shifts": {
      const perf = performanceFor("day", now);
      const list = perf.shifts
        .map((s) =>
          t("lineShift", {
            name: s.name,
            util: pct(s.util),
            output: s.output.toLocaleString(locale),
          }),
        )
        .join("\n");
      const best = [...perf.shifts].sort((a, b) => b.util - a.util)[0];
      return t("shifts", { list, best: best.name, bestUtil: pct(best.util) });
    }

    case "operators": {
      const perf = performanceFor("day", now);
      const ranked = [...perf.operators].sort((a, b) => b.util - a.util);
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      const list = ranked
        .slice(0, 5)
        .map((o) =>
          t("lineOperator", {
            name: o.name,
            util: pct(o.util),
            perf: Math.round(o.perf * 100),
          }),
        )
        .join("\n");
      return t("operators", {
        best: best.name,
        bestUtil: pct(best.util),
        worst: worst.name,
        worstUtil: pct(worst.util),
        list,
      });
    }

    case "dueRisk": {
      const open = snap.orders.filter((o) => !orderDone(o));
      const late = open.filter((o) => new Date(o.dueDate) < now);
      const soon = open.filter(
        (o) =>
          new Date(o.dueDate) >= now &&
          new Date(o.dueDate).getTime() - now.getTime() < 2 * 86400000,
      );
      const rush = open.filter((o) => o.priority === "high");
      if (late.length === 0 && soon.length === 0)
        return t("dueRiskNone", { rush: rush.length });
      const atRisk = [...late, ...soon].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const list = atRisk
        .slice(0, 5)
        .map((o) =>
          t("lineOrderRisk", {
            id: o.id,
            customer: o.customer,
            state: new Date(o.dueDate) < now ? t("stateLate") : t("stateSoon"),
          }),
        )
        .join("\n");
      return t("dueRisk", { late: late.length, soon: soon.length, list });
    }

    case "orderLookup": {
      const hit = ORDER_RE.exec(d.question);
      const wanted = hit ? hit[0].toUpperCase() : "";
      const order = snap.orders.find((o) => o.id.toUpperCase() === wanted);
      if (!order) return t("orderNotFound");
      const doneSteps = order.routing.filter((s) => s.status === "done").length;
      const current = order.routing.find(
        (s) => s.status === "running" || s.status === "queued" || s.status === "paused",
      );
      const progress = Math.round(
        (order.routing.reduce(
          (s, st) => s + (st.status === "done" ? 1 : st.qtyDone / order.qty),
          0,
        ) /
          order.routing.length) *
          100,
      );
      return t("orderLookup", {
        id: order.id,
        customer: order.customer,
        part: order.part,
        progress,
        doneSteps,
        totalSteps: order.routing.length,
        current: current ? opName(current.operationId) : "—",
      });
    }

    case "revenue": {
      const eco = plantEconomics(snap, now);
      return t("revenue", {
        revenue: money(eco.revenue),
        cost: money(eco.cost),
        profit: money(eco.profit),
        margin: Math.round(eco.marginPct),
      });
    }

    case "lostRevenue": {
      const eco = plantEconomics(snap, now);
      if (eco.lostRevenue < 1) return t("lostRevenueNone");
      const top = eco.byStation[0];
      return t("lostRevenue", {
        total: money(eco.lostRevenue),
        station: top.name,
        amount: money(top.lost),
      });
    }

    case "bottleneck": {
      const ins = plantInsights(snap, now).find((i) => i.kind === "bottleneck");
      if (!ins) return t("bottleneckNone");
      return t("bottleneck", {
        msg: tInsights("msg.bottleneck", ins.params),
        rec: tInsights("rec.bottleneck", ins.params),
      });
    }

    case "suggestions": {
      const ins = plantInsights(snap, now).filter((i) => i.kind !== "allClear").slice(0, 3);
      if (ins.length === 0) return t("suggestionsNone");
      const list = ins
        .map(
          (i) =>
            `• ${tInsights(`msg.${i.kind}`, i.params)} → ${tInsights(`rec.${i.kind}`, i.params)}`,
        )
        .join("\n");
      return t("suggestions", { list });
    }

    case "alerts": {
      const open = snap.alerts.filter((a) => !a.acked);
      if (open.length === 0) return t("alertsNone");
      const top = open[0];
      const detail =
        top.trigger === "downtime"
          ? tAlerts("downtimeMsg", {
              station: stationName(top.stationId),
              reason: reasonName(top.reasonId ?? ""),
              minutes: Math.round(top.value),
            })
          : top.trigger === "lowStock"
            ? (() => {
                const it = snap.stock.find((s) => s.id === top.reasonId);
                const u = it?.unit === "piece" ? tAlerts("unitPiece") : tAlerts("unitKg");
                return tAlerts("lowStockMsg", {
                  material: top.label ?? "—",
                  amount: `${Math.round(top.value)} ${u}`,
                  reorder: `${Math.round(top.threshold)} ${u}`,
                });
              })()
            : tAlerts("scrapMsg", {
                station: stationName(top.stationId),
                rate: Math.round(top.value * 100),
              });
      const targetKey =
        top.target === "supervisor"
          ? "targetSupervisor"
          : top.target === "maintenance"
            ? "targetMaintenance"
            : top.target === "purchasing"
              ? "targetPurchasing"
              : "targetQuality";
      return t("alerts", { count: open.length, target: tAlerts(targetKey), detail });
    }

    case "score": {
      const s = plantScore(snap, now);
      const weak = weakestFactors(s, 2);
      const items = weak
        .map(
          (f) =>
            `• ${tScore(`factor.${f.key}`)} (${f.points}/${f.weight}) → ${tScore(`tip.${f.key}`)}`,
        )
        .join("\n");
      return t("score", { total: s.total, band: tScore(`band.${s.band}`), items });
    }

    case "greeting":
      return t("greetingReply");

    case "offtopic":
      return t("offtopic");

    default:
      return t("help");
  }
}

export type AssistantScope = "full" | "ops";

/** Money-related intents — excluded from the Production ("ops") assistant. */
export const MONEY_INTENTS = new Set<Intent>([
  "dailyCost",
  "downtimeCost",
  "revenue",
  "lostRevenue",
]);

/** Example chips (label message key + paired intent) for each scope. */
export function chipsFor(scope: AssistantScope): { labelKey: string; intent: Intent }[] {
  const money: { labelKey: string; intent: Intent } =
    scope === "ops"
      ? { labelKey: "qAlerts", intent: "alerts" }
      : { labelKey: "q4", intent: "lostRevenue" };
  return [
    { labelKey: "q1", intent: "efficiency" },
    { labelKey: "q2", intent: "suggestions" },
    { labelKey: "q3", intent: "bottleneck" },
    money,
    { labelKey: "q5", intent: "machinesDown" },
    { labelKey: "q6", intent: "workload" },
  ];
}
