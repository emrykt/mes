import type { ReactNode } from "react";

/** Browser-style frame around a screen preview. */
function Frame({ title, dark = false, children }: { title: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-2xl border shadow-2xl ${dark ? "border-white/10" : "border-line"}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${dark ? "border-white/10 bg-[#0a1a20]" : "border-line bg-neutral-soft"}`}>
        <span className="size-2.5 rounded-full bg-critical/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-good/70" />
        <span className={`ml-2 text-xs font-medium ${dark ? "text-white/60" : "text-muted"}`}>{title}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good-text">
          <span className="size-1.5 animate-pulse rounded-full bg-good" /> LIVE
        </span>
      </div>
      <div className={dark ? "bg-[#0b1f27] p-4" : "bg-page p-4"}>{children}</div>
    </div>
  );
}

const stateColor: Record<string, string> = {
  running: "var(--color-good)",
  idle: "var(--color-muted)",
  setup: "var(--color-warning)",
  down: "var(--color-critical)",
};

function Bar({ label, pct, color = "var(--color-accent)", value }: { label: string; pct: number; color?: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-ink-2">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="w-12 shrink-0 text-right font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const pct = score / 1000;
  const r = 46, c = Math.PI * r;
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-40">
        <path d="M8 64 A52 52 0 0 1 112 64" fill="none" stroke="var(--color-neutral-soft, #e5eef0)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M8 64 A52 52 0 0 1 112 64"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * c * 1.63} 999`}
        />
      </svg>
      <div className="-mt-8 text-center">
        <p className="text-3xl font-semibold tracking-tight text-ink">{score}</p>
        <p className="text-[10px] font-medium text-muted">of 1000 · Excellent</p>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink">
        {value}
        {unit && <span className="text-xs font-normal text-muted"> {unit}</span>}
      </p>
      <p className="mt-0.5 text-[10px] text-muted">{label}</p>
    </div>
  );
}

function Pill({ text, tone }: { text: string; tone: "good" | "warning" | "critical" | "accent" }) {
  const map = {
    good: "bg-good/15 text-good-text",
    warning: "bg-warning-soft text-warning-text",
    critical: "bg-critical-soft text-critical-text",
    accent: "bg-accent-soft text-accent-strong",
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[tone]}`}>{text}</span>;
}

/* ---------------------------------------------------------------- screens */

function Operator() {
  return (
    <Frame title="Operator Kiosk · Laser 1" dark>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/50">WO-2026-08-142 · Aegean Precision</p>
            <p className="text-lg font-semibold text-white">Flange plate 8&nbsp;mm</p>
          </div>
          <Pill text="RUNNING" tone="good" />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-[68%] rounded-full bg-good" />
        </div>
        <p className="mt-1 text-[11px] text-white/50">Step 2 of 4 · 68% · 24 min left</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <p className="text-2xl font-semibold text-white tabular-nums">312</p>
          <p className="text-[10px] text-good">Good</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <p className="text-2xl font-semibold text-white tabular-nums">4</p>
          <p className="text-[10px] text-critical">Scrap</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["Pause", "+1 Good", "Finish"].map((b, i) => (
          <span key={b} className={`rounded-lg py-2 text-center text-xs font-semibold ${i === 2 ? "bg-good text-white" : "bg-white/10 text-white"}`}>{b}</span>
        ))}
      </div>
    </Frame>
  );
}

function Production() {
  const stations = [
    { n: "Laser 1", s: "running", u: 92 }, { n: "Laser 2", s: "running", u: 88 }, { n: "Plasma", s: "setup", u: 61 },
    { n: "Brake 1", s: "running", u: 79 }, { n: "Brake 2", s: "idle", u: 40 }, { n: "Weld 1", s: "down", u: 0 },
    { n: "CNC Mill", s: "running", u: 84 }, { n: "Lathe", s: "running", u: 73 }, { n: "Assembly", s: "running", u: 66 },
  ];
  return (
    <Frame title="Production Management">
      <div className="grid grid-cols-3 gap-2">
        {stations.map((st) => (
          <div key={st.n} className="rounded-lg border border-line bg-surface p-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: stateColor[st.s] }} />
              <span className="truncate text-[11px] font-medium text-ink">{st.n}</span>
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{st.u}%</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <p className="mb-2 text-[11px] font-semibold text-ink">Downtime today · by reason</p>
        <div className="space-y-1.5">
          <Bar label="Breakdown" pct={80} color="var(--color-critical)" value="48m" />
          <Bar label="Material wait" pct={45} color="var(--color-warning)" value="27m" />
          <Bar label="Setup" pct={30} color="var(--color-accent)" value="18m" />
        </div>
      </div>
    </Frame>
  );
}

function Executive() {
  return (
    <Frame title="Executive Cockpit">
      <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
        <Gauge score={842} />
        <div className="flex-1 space-y-1.5">
          <Bar label="Delivery" pct={90} color="var(--color-good)" value="90%" />
          <Bar label="Quality" pct={82} color="var(--color-accent)" value="82%" />
          <Bar label="Utilization" pct={78} color="var(--color-info)" value="78%" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Utilization" value="78" unit="%" />
        <Stat label="Adherence" value="91" unit="%" />
        <Stat label="Margin" value="34" unit="%" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-serious/30 bg-serious-soft/30 p-3">
          <p className="text-[10px] text-serious-text">Potential lost revenue</p>
          <p className="text-lg font-semibold tabular-nums text-serious-text">€1,240</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning-soft/25 p-3">
          <p className="text-[10px] text-warning-text">Unused capacity value</p>
          <p className="text-lg font-semibold tabular-nums text-warning-text">€3,180</p>
        </div>
      </div>
    </Frame>
  );
}

function Sales() {
  const orders = [
    { wo: "WO-2026-08-151", c: "Northgate Works", due: "Aug 24", t: "good" as const, st: "On track" },
    { wo: "WO-2026-08-149", c: "Baylor Sheet", due: "Aug 22", t: "warning" as const, st: "At risk" },
    { wo: "WO-2026-08-147", c: "Ironside Shop", due: "Aug 26", t: "accent" as const, st: "Queued" },
  ];
  return (
    <Frame title="Sales & Quoting">
      <div className="space-y-1.5">
        {orders.map((o) => (
          <div key={o.wo} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{o.c}</p>
              <p className="text-[10px] text-muted">{o.wo} · due {o.due}</p>
            </div>
            <Pill text={o.st} tone={o.t} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
        <div>
          <p className="text-[10px] text-accent-strong">Quote · bracket 6&nbsp;mm × 120</p>
          <p className="text-lg font-semibold tabular-nums text-ink">€4,860</p>
        </div>
        <div className="text-right text-[10px] text-ink-2">
          <p>€40.50 / pc</p>
          <p className="text-good-text">32% margin</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <p className="mb-2 text-[11px] font-semibold text-ink">Free capacity · next 7 days</p>
        <div className="space-y-1.5">
          <Bar label="Laser" pct={22} color="var(--color-good)" value="18h" />
          <Bar label="Press brake" pct={64} color="var(--color-warning)" value="52h" />
          <Bar label="Welding" pct={38} color="var(--color-accent)" value="31h" />
        </div>
      </div>
    </Frame>
  );
}

function Maintenance() {
  const cols = [
    { t: "Overdue", tone: "critical" as const, items: ["Laser 1 · optics clean", "Weld 1 · torch service"] },
    { t: "Due in 7 days", tone: "warning" as const, items: ["Brake 2 · calibration", "Compressor · filter"] },
    { t: "Upcoming", tone: "accent" as const, items: ["CNC Mill · spindle check"] },
  ];
  return (
    <Frame title="Maintenance">
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-critical/30 bg-critical-soft/40 px-3 py-2 text-xs">
        <span className="size-2 rounded-full bg-critical" />
        <span className="font-medium text-ink">Weld 1 down 34 min</span>
        <span className="ml-auto text-[10px] text-critical-text">Escalated → Supervisor</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div key={col.t} className="rounded-xl border border-line bg-surface p-2.5">
            <Pill text={col.t} tone={col.tone} />
            <div className="mt-2 space-y-1.5">
              {col.items.map((it) => (
                <p key={it} className="rounded-md bg-neutral-soft px-2 py-1.5 text-[10px] leading-snug text-ink-2">{it}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Stock() {
  const rows = [
    { n: "Steel bar Ø40", oh: "820 kg", ro: "300 kg", t: "good" as const, s: "OK" },
    { n: "Sheet 6mm 1.5×3", oh: "12 pc", ro: "20 pc", t: "critical" as const, s: "Reorder" },
    { n: "Sheet 3mm 1×2", oh: "48 pc", ro: "25 pc", t: "good" as const, s: "OK" },
    { n: "Brass rod Ø20", oh: "60 kg", ro: "80 kg", t: "warning" as const, s: "Low" },
  ];
  return (
    <Frame title="Stock & Materials">
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] bg-neutral-soft px-3 py-2 text-[10px] font-semibold text-muted">
          <span>Material</span><span className="text-right">On hand</span><span className="text-right">Reorder</span><span className="text-right">Status</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.n} className={`grid grid-cols-[1.6fr_1fr_1fr_0.9fr] items-center px-3 py-2 text-xs ${i ? "border-t border-line" : ""} ${r.t === "critical" ? "bg-critical-soft/30" : "bg-surface"}`}>
            <span className="truncate font-medium text-ink">{r.n}</span>
            <span className="text-right tabular-nums text-ink-2">{r.oh}</span>
            <span className="text-right tabular-nums text-muted">{r.ro}</span>
            <span className="flex justify-end"><Pill text={r.s} tone={r.t} /></span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft/30 px-3 py-2 text-[11px]">
        <span className="size-2 rounded-full bg-warning" />
        <span className="text-ink">Low stock · Sheet 6mm → alert sent to purchasing</span>
      </div>
    </Frame>
  );
}

function Tv() {
  const tiles = [
    "running", "running", "setup", "running", "down", "running", "running", "idle", "running",
  ];
  const names = ["Laser 1", "Laser 2", "Plasma", "Brake 1", "Weld 1", "Brake 2", "CNC Mill", "Lathe", "Assembly"];
  return (
    <Frame title="Andon TV Board" dark>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Shop floor · live</p>
        <p className="text-sm font-semibold tabular-nums text-white/70">14:26</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((s, i) => (
          <div key={i} className="rounded-lg border border-white/10 p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: stateColor[s] }} />
              <span className="truncate text-[11px] font-medium text-white">{names[i]}</span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">{s}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-critical/20 px-3 py-2 text-[11px]">
        <span className="size-2 animate-pulse rounded-full bg-critical" />
        <span className="text-white">Andon · Weld 1 needs maintenance</span>
      </div>
    </Frame>
  );
}

function Assistant() {
  return (
    <Frame title="Smart Manufacturing Assistant">
      <div className="space-y-2.5">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-xs text-white">
          Where am I losing the most capacity today?
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-line bg-surface px-3 py-2.5 text-xs text-ink-2">
          <p>Your biggest loss is <span className="font-semibold text-ink">Weld 1</span> — a 34-min breakdown, about <span className="font-semibold text-ink">€520</span> of billable capacity.</p>
          <div className="mt-2 rounded-lg bg-neutral-soft p-2 text-[11px]">
            <p className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-critical" /> Weld 1 · breakdown · €520</p>
            <p className="mt-1 flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-warning" /> Plasma · setup overrun · €180</p>
          </div>
          <p className="mt-2 text-ink"><span className="font-semibold">Next:</span> move the two queued welds to Weld 2 to protect the Friday deadline.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Today’s downtime cost", "What’s the bottleneck?", "How do I raise my score?"].map((c) => (
          <span key={c} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] text-ink-2">{c}</span>
        ))}
      </div>
    </Frame>
  );
}

const screens: Record<string, () => ReactNode> = {
  operator: Operator,
  production: Production,
  executive: Executive,
  sales: Sales,
  maintenance: Maintenance,
  stock: Stock,
  tv: Tv,
  assistant: Assistant,
};

export default function ProductMockup({ slug }: { slug: string }) {
  const Screen = screens[slug] ?? Production;
  return <Screen />;
}
