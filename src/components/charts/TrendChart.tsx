"use client";

import { useRef, useState } from "react";

export interface TrendSeries {
  name: string;
  color: string; // CSS color (var(--...))
  values: number[];
}

/**
 * Small multi-purpose line chart: 1–2 series, hover crosshair + tooltip,
 * endpoint label on the primary series. Legend renders only for ≥2 series
 * (single series is named by the card title, per dataviz rules).
 */
export default function TrendChart({
  labels,
  series,
  unit = "int",
  yMax: yMaxProp,
  height = 180,
}: {
  labels: string[];
  series: TrendSeries[];
  /** Declarative so server components can pass it (functions can't cross the RSC boundary). */
  unit?: "int" | "percent";
  yMax?: number;
  height?: number;
}) {
  const format = (v: number) =>
    unit === "percent" ? `${Math.round(v)}%` : String(Math.round(v));
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 560;
  const H = height;
  const PAD = { l: 42, r: 58, t: 12, b: 24 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const n = labels.length;

  const rawMax = Math.max(...series.flatMap((s) => s.values));
  // Round the axis ceiling up to a clean step so tick labels stay readable.
  const mag = 10 ** Math.floor(Math.log10(rawMax || 1));
  const stepNorm = (rawMax * 1.05) / (mag * 4);
  const step =
    mag * (stepNorm <= 0.5 ? 0.5 : stepNorm <= 1 ? 1 : stepNorm <= 2 ? 2 : 5);
  const yMax = yMaxProp ?? Math.ceil((rawMax * 1.05) / step) * step;

  const x = (i: number) => PAD.l + (i * innerW) / (n - 1);
  const y = (v: number) => PAD.t + innerH - (v / yMax) * innerH;

  const ticks = [0, yMax / 2, yMax];

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vx - PAD.l) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const primary = series[0];

  return (
    <div>
      {series.length >= 2 && (
        <div className="mb-2 flex gap-4">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
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
                x={PAD.l - 7}
                y={y(tk) + 3.5}
                textAnchor="end"
                fontSize={13}
                fill="var(--color-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {format(tk)}
              </text>
            </g>
          ))}

          {labels.map(
            (lb, i) =>
              i % Math.ceil(n / 7) === 0 && (
                <text
                  key={lb}
                  x={x(i)}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={13}
                  fill="var(--color-muted)"
                >
                  {lb}
                </text>
              ),
          )}

          {series.map((s, si) => {
            const path = s.values
              .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
              .join(" ");
            return (
              <path
                key={s.name}
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={si === 0 ? 2 : 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={si === 0 ? 1 : 0.75}
              />
            );
          })}

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
          {hover !== null &&
            series.map((s) => (
              <circle
                key={s.name}
                cx={x(hover)}
                cy={y(s.values[hover])}
                r={4}
                fill={s.color}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            ))}

          <circle
            cx={x(n - 1)}
            cy={y(primary.values[n - 1])}
            r={4.5}
            fill={primary.color}
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
          <text
            x={x(n - 1) + 9}
            y={y(primary.values[n - 1]) + 4}
            fontSize={14}
            fontWeight={600}
            fill="var(--color-ink-2)"
          >
            {format(primary.values[n - 1])}
          </text>
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: 0,
              transform: `translate(${hover > n / 2 ? "-110%" : "10%"}, 0)`,
            }}
          >
            <div className="text-muted">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 font-medium text-ink">
                {series.length > 1 && (
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                )}
                {format(s.values[hover])}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
