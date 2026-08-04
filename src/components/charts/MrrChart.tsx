"use client";

import { useRef, useState } from "react";

interface Point {
  month: string; // "2026-07"
  value: number;
}

const W = 640;
const H = 220;
const PAD = { l: 44, r: 60, t: 14, b: 26 };

function monthLabel(month: string, withYear = false): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(d);
}

function money(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function MrrChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.value));
  const yMax = Math.max(500, Math.ceil(max / 500) * 500);
  const ticks = Array.from({ length: yMax / 500 + 1 }, (_, i) => i * 500);

  const x = (i: number) => PAD.l + (i * innerW) / (data.length - 1);
  const y = (v: number) => PAD.t + innerH - (v / yMax) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const last = data[data.length - 1];

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vx - PAD.l) / innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  }

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="MRR trend, last 12 months"
      >
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(tk)}
              y2={y(tk)}
              stroke="var(--color-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.l - 8}
              y={y(tk) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-muted)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {tk.toLocaleString("en-US")}
            </text>
          </g>
        ))}

        {data.map(
          (d, i) =>
            i % 2 === 0 && (
              <text
                key={d.month}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-muted)"
              >
                {monthLabel(d.month)}
              </text>
            ),
        )}

        <path d={areaPath} fill="var(--color-accent)" opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={PAD.t + innerH}
            stroke="var(--color-muted)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {hover !== null && hover !== data.length - 1 && (
          <circle
            cx={x(hover)}
            cy={y(data[hover].value)}
            r={4.5}
            fill="var(--color-accent)"
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
        )}

        <circle
          cx={x(data.length - 1)}
          cy={y(last.value)}
          r={4.5}
          fill="var(--color-accent)"
          stroke="var(--color-surface)"
          strokeWidth={2}
        />
        <text
          x={x(data.length - 1) + 10}
          y={y(last.value) + 4}
          fontSize={11}
          fontWeight={600}
          fill="var(--color-ink-2)"
        >
          {money(last.value)}
        </text>
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${((y(data[hover].value) - 14) / H) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-muted">{monthLabel(data[hover].month, true)}</div>
          <div className="font-semibold text-ink">{money(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}
