import { useTranslations } from "next-intl";
import type { StationState, StepStatus } from "@/lib/mes-types";

const stationStyles: Record<StationState, { badge: string; dot: string }> = {
  running: { badge: "bg-good-soft text-good-text", dot: "bg-good" },
  idle: { badge: "bg-neutral-soft text-ink-2", dot: "bg-muted" },
  setup: { badge: "bg-accent-soft text-accent-strong", dot: "bg-accent" },
  down: { badge: "bg-critical-soft text-critical-text", dot: "bg-critical" },
};

export function StationStateBadge({ state }: { state: StationState }) {
  const t = useTranslations("mes.stationState");
  const s = stationStyles[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${s.badge}`}
    >
      <span
        className={`size-1.5 rounded-full ${s.dot} ${state === "running" ? "animate-pulse" : ""}`}
      />
      {t(state)}
    </span>
  );
}

const stepStyles: Record<StepStatus, string> = {
  pending: "bg-neutral-soft text-muted",
  queued: "bg-accent-soft text-accent-strong",
  running: "bg-good-soft text-good-text",
  paused: "bg-warning-soft text-warning-text",
  done: "bg-good text-white",
};

export function StepChip({
  label,
  status,
}: {
  label: string;
  status: StepStatus;
}) {
  return (
    <span
      title={label}
      className={`inline-flex max-w-32 items-center truncate rounded-md px-2 py-0.5 text-[11px] font-medium ${stepStyles[status]}`}
    >
      {label}
    </span>
  );
}

/** Thin progress bar (accent fill on accent wash). */
export function ProgressBar({
  ratio,
  className = "",
}: {
  ratio: number;
  className?: string;
}) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-accent-wash ${className}`}>
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
      />
    </div>
  );
}
