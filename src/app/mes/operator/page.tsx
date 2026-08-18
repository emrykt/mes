"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertOctagon,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Factory,
  Layers,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  ScanLine,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CompanySwitcher from "@/components/mes/CompanySwitcher";
import { useDemo } from "@/components/demo/DemoProvider";
import { SIM_STATIONS, type MachineKind } from "@/lib/sim";
import type { MesOrder } from "@/lib/mes-types";
import { formatShortDate } from "@/lib/format";

const MODE_KEY: Record<MachineKind, string> = {
  cutting: "modeCutting",
  sawing: "modeSawing",
  turning: "modeTurning",
  milling: "modeMilling",
  drilling: "modeDrilling",
  punching: "modePunching",
  bending: "modeBending",
  welding: "modeWelding",
  assembly: "modeAssembly",
  quality: "modeQuality",
  packaging: "modePackaging",
};

export default function OperatorKioskPage() {
  const t = useTranslations("mes.operator");
  const tt = useTranslations("mes.andonType");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();

  const [stationId, setStationId] = useState("st-laser-1");
  const [showDowntime, setShowDowntime] = useState(false);
  const [showAndon, setShowAndon] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState(false);

  // keep the picked station valid when the active company changes
  useEffect(() => {
    if (snap && !snap.stations.some((s) => s.id === stationId)) {
      setStationId(snap.stations[0]?.id ?? stationId);
    }
  }, [snap, stationId]);

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chrome text-chrome-ink">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  // The picked station may not exist for the newly selected company — fall back
  // to this company's first station so switching companies never crashes.
  const activeId = snap.stations.some((s) => s.id === stationId)
    ? stationId
    : snap.stations[0]?.id ?? stationId;

  const def = SIM_STATIONS.find((s) => s.id === activeId)!;
  const live = snap.stations.find((s) => s.id === activeId)!;
  const operation = snap.settings.operations.find((o) => o.id === def.operationId);

  const queue = snap.orders
    .filter((o) =>
      o.routing.some(
        (st) =>
          st.operationId === def.operationId &&
          st.status !== "done" &&
          st.status !== "pending",
      ),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const activeOrders = live.currentOrderIds
    .map((id) => snap.orders.find((o) => o.id === id))
    .filter((o): o is MesOrder => !!o);

  const running = live.state === "running";
  const down = live.state === "down";
  const myAndon = snap.andon.find(
    (a) => a.open && a.manual && a.stationId === activeId,
  );
  const downtimeReason = live.downtimeReasonId
    ? snap.settings.downtimeReasons.find((r) => r.id === live.downtimeReasonId)?.name
    : undefined;

  const producedKey = def.kind === "quality" ? "accepted" : def.kind === "packaging" ? "packed" : "produced";
  const scrapKey = def.kind === "quality" ? "rejected" : "scrap";
  const finishKey = def.kind === "packaging" ? "shipmentReady" : "finishStep";
  const FinishIcon = def.kind === "packaging" ? Truck : CheckCircle2;

  const stepOf = (o: MesOrder) =>
    o.routing.find((s) => s.operationId === def.operationId)!;

  function finish(orderId: string, qty: number, done: number) {
    if (window.confirm(t("finishConfirm", { done, qty })))
      dispatch({ type: "finishStep", stationId, orderId });
  }

  /** Simulated barcode/QR scan: match the typed/"scanned" order no in queue. */
  function scan(raw: string) {
    const needle = raw.trim().toUpperCase();
    const hit = queue.find(
      (o) => o.id.toUpperCase() === needle || o.id.toUpperCase().endsWith(needle),
    );
    if (!hit || needle.length < 3) {
      setScanError(true);
      return;
    }
    dispatch({ type: "startJob", stationId, orderId: hit.id });
    setShowScan(false);
    setScanValue("");
    setScanError(false);
  }

  const bigBtn =
    "flex items-center justify-center gap-2.5 rounded-2xl font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-chrome text-white">
      {/* header */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-4 py-3 sm:px-5">
        <Link
          href="/mes"
          className="flex size-9 items-center justify-center rounded-lg bg-accent"
          aria-label="Prodgence"
        >
          <Factory className="size-5" />
        </Link>
        <div className="mr-auto">
          <p className="text-base font-semibold leading-tight">{def.name}</p>
          <p className="text-xs text-chrome-ink">
            {operation?.name} ·{" "}
            <span className="text-accent">{t(MODE_KEY[def.kind])}</span>
          </p>
        </div>
        <span className="hidden text-xs text-chrome-ink md:inline">
          {t("todayAtStation", { output: live.todayOutput, scrap: live.todayScrap })}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-good/15 px-3 py-1 text-xs font-medium text-good">
          <BadgeCheck className="size-3.5" />
          {t("licenseOk")}
        </span>
        <CompanySwitcher dark />
        <LanguageSwitcher dark />
        <label className="flex items-center gap-2 text-xs text-chrome-ink">
          <span className="hidden lg:inline">{t("stationSelect")}</span>
          <select
            value={activeId}
            onChange={(e) => setStationId(e.target.value)}
            className="rounded-lg border border-white/15 bg-chrome-2 px-2 py-1.5 text-xs font-medium text-white focus:border-accent focus:outline-none"
          >
            {snap.stations.map((s) => {
              const d = SIM_STATIONS.find((x) => x.id === s.id);
              return (
                <option key={s.id} value={s.id}>
                  {d?.name ?? s.id}
                </option>
              );
            })}
          </select>
        </label>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1fr_340px]">
        {/* active job(s) */}
        <section className="rounded-2xl bg-chrome-2 p-4 sm:p-6">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-chrome-ink uppercase">
            {activeOrders.length > 1 ? (
              <>
                <Layers className="size-4 text-accent" />
                {t("nestingActive", { count: activeOrders.length })}
              </>
            ) : (
              t("currentJob")
            )}
          </p>

          {activeOrders.length === 0 && (
            <p className="mt-5 rounded-2xl bg-chrome p-8 text-center text-lg text-chrome-ink">
              {t("noJob")}
            </p>
          )}

          {/* single job */}
          {activeOrders.length === 1 &&
            (() => {
              const order = activeOrders[0];
              const step = stepOf(order);
              const done = step.qtyDone;
              const scrap = step.scrapQty ?? 0;
              return (
                <>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                      {order.id}
                    </h1>
                    <span className="text-sm text-chrome-ink">
                      {t("opStep", { seq: step.seq, total: order.routing.length })}
                    </span>
                  </div>
                  <p className="mt-1 text-lg text-white/90">{order.part}</p>
                  <p className="text-sm text-chrome-ink">
                    {t("customer")}: {order.customer} ·{" "}
                    {t("due", { date: formatShortDate(order.dueDate, locale) })}
                  </p>

                  {def.kind === "quality" ? (
                    /* quality mode: two large accept / reject targets */
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => dispatch({ type: "addQty", stationId, orderId: order.id, delta: 1 })}
                        disabled={!running}
                        className={`${bigBtn} flex-col bg-good/20 py-6 ring-1 ring-good hover:bg-good/30`}
                      >
                        <Plus className="size-7 text-good" />
                        <span className="text-lg">{t("accepted")}</span>
                        <span className="text-4xl font-semibold tabular-nums">
                          {done}
                          <span className="ml-1 text-base text-chrome-ink">
                            {t("ofQty", { qty: order.qty })}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => dispatch({ type: "addScrap", stationId, orderId: order.id, delta: 1 })}
                        disabled={!running}
                        className={`${bigBtn} flex-col bg-critical/20 py-6 ring-1 ring-critical hover:bg-critical/30`}
                      >
                        <X className="size-7 text-critical" />
                        <span className="text-lg">{t("rejected")}</span>
                        <span className="text-4xl font-semibold tabular-nums">{scrap}</span>
                      </button>
                    </div>
                  ) : (
                    /* counting modes */
                    <div className="mt-5 rounded-2xl bg-chrome p-4 sm:p-5">
                      <p className="text-xs font-medium tracking-wide text-chrome-ink uppercase">
                        {t(producedKey)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <button
                          onClick={() => dispatch({ type: "addQty", stationId, orderId: order.id, delta: -1 })}
                          disabled={!running || done <= 0}
                          className={`${bigBtn} size-14 bg-white/10 text-lg hover:bg-white/15 sm:size-16`}
                          aria-label="-1"
                        >
                          <Minus className="size-6" />
                        </button>
                        <div className="text-center">
                          <span className="text-5xl font-semibold tabular-nums sm:text-6xl">
                            {done}
                          </span>
                          <span className="ml-2 text-lg text-chrome-ink sm:text-xl">
                            {t("ofQty", { qty: order.qty })}
                          </span>
                          <div className="mx-auto mt-3 h-2 w-40 overflow-hidden rounded-full bg-white/10 sm:w-48">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${Math.min(100, (done / order.qty) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => dispatch({ type: "addQty", stationId, orderId: order.id, delta: 1 })}
                          disabled={!running}
                          className={`${bigBtn} size-14 bg-accent text-lg hover:bg-accent-strong sm:size-16`}
                          aria-label="+1"
                        >
                          <Plus className="size-6" />
                        </button>
                      </div>
                      <ScrapCounter
                        label={t(scrapKey)}
                        value={scrap}
                        disabled={!running}
                        onAdd={() => dispatch({ type: "addScrap", stationId, orderId: order.id, delta: 1 })}
                        onRemove={() => dispatch({ type: "addScrap", stationId, orderId: order.id, delta: -1 })}
                      />
                    </div>
                  )}
                </>
              );
            })()}

          {/* nesting rows (cutting/welding with 2+ orders) */}
          {activeOrders.length > 1 && (
            <ul className="mt-3 space-y-2.5">
              {activeOrders.map((order) => {
                const step = stepOf(order);
                const done = step.qtyDone;
                return (
                  <li key={order.id} className="rounded-2xl bg-chrome p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold tabular-nums">{order.id}</p>
                      <p className="truncate text-sm text-white/80">{order.part}</p>
                      <button
                        onClick={() => finish(order.id, order.qty, done)}
                        className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                      >
                        <CheckCircle2 className="size-4" />
                        {t("finishStep")}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => dispatch({ type: "addQty", stationId, orderId: order.id, delta: -1 })}
                        disabled={!running || done <= 0}
                        className={`${bigBtn} size-12 bg-white/10 hover:bg-white/15`}
                        aria-label="-1"
                      >
                        <Minus className="size-5" />
                      </button>
                      <span className="min-w-24 text-center text-3xl font-semibold tabular-nums">
                        {done}
                        <span className="ml-1 text-base text-chrome-ink">
                          {t("ofQty", { qty: order.qty })}
                        </span>
                      </span>
                      <button
                        onClick={() => dispatch({ type: "addQty", stationId, orderId: order.id, delta: 1 })}
                        disabled={!running}
                        className={`${bigBtn} size-12 bg-accent hover:bg-accent-strong`}
                        aria-label="+1"
                      >
                        <Plus className="size-5" />
                      </button>
                      <ScrapCounter
                        compact
                        label={t("scrap")}
                        value={step.scrapQty ?? 0}
                        disabled={!running}
                        onAdd={() => dispatch({ type: "addScrap", stationId, orderId: order.id, delta: 1 })}
                        onRemove={() => dispatch({ type: "addScrap", stationId, orderId: order.id, delta: -1 })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* run controls */}
          {activeOrders.length > 0 && !down && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {running ? (
                <button
                  onClick={() => dispatch({ type: "pauseStation", stationId })}
                  className={`${bigBtn} bg-warning py-4 text-lg text-chrome hover:opacity-90 sm:py-5`}
                >
                  <Pause className="size-6" />
                  {t("pause")}
                </button>
              ) : (
                <button
                  onClick={() => dispatch({ type: "resumeStation", stationId })}
                  className={`${bigBtn} bg-good py-4 text-lg hover:opacity-90 sm:py-5`}
                >
                  <Play className="size-6" />
                  {t("resume")}
                </button>
              )}
              {activeOrders.length === 1 ? (
                <button
                  onClick={() =>
                    finish(activeOrders[0].id, activeOrders[0].qty, stepOf(activeOrders[0]).qtyDone)
                  }
                  disabled={stepOf(activeOrders[0]).qtyDone === 0}
                  className={`${bigBtn} bg-white/10 py-4 text-lg hover:bg-white/15 sm:py-5`}
                >
                  <FinishIcon className="size-6" />
                  {t(finishKey)}
                </button>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* downtime + andon */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {down ? (
              <button
                onClick={() => dispatch({ type: "endDowntime", stationId })}
                className={`${bigBtn} border-2 border-critical bg-critical/20 py-4 text-base text-white`}
              >
                <AlertOctagon className="size-5 text-critical" />
                {t("downtimeActive", { reason: downtimeReason ?? "" })} — {t("endDowntime")}
              </button>
            ) : (
              <button
                onClick={() => setShowDowntime(true)}
                className={`${bigBtn} bg-white/10 py-4 text-base hover:bg-white/15`}
              >
                <AlertOctagon className="size-5 text-warning" />
                {t("downtime")}
              </button>
            )}
            {myAndon ? (
              <button
                onClick={() => dispatch({ type: "andonClose", id: myAndon.id })}
                className={`${bigBtn} border-2 border-accent bg-accent/20 py-4 text-base`}
              >
                <Bell className="size-5 text-accent" />
                {t("andonSent", { type: tt(myAndon.type) })} — {t("cancelAndon")}
              </button>
            ) : (
              <button
                onClick={() => setShowAndon(true)}
                className={`${bigBtn} bg-white/10 py-4 text-base hover:bg-white/15`}
              >
                <Bell className="size-5 text-accent" />
                {t("andon")}
              </button>
            )}
          </div>
        </section>

        {/* queue */}
        <section className="rounded-2xl bg-chrome-2 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-chrome-ink uppercase">
              {t("queueTitle")}
            </p>
            {snap.settings.features.barcode && (
              <button
                onClick={() => {
                  setShowScan(true);
                  setScanError(false);
                  setScanValue("");
                }}
                className="flex items-center gap-1.5 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/50 hover:bg-accent/30"
              >
                <ScanLine className="size-4" />
                {t("scanButton")}
              </button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="mt-4 text-sm text-chrome-ink">{t("queueEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {queue.map((o) => {
                const step = stepOf(o);
                const isActive = live.currentOrderIds.includes(o.id);
                const nesting = operation?.batchable && activeOrders.length > 0;
                return (
                  <li
                    key={o.id}
                    className={`rounded-xl p-4 ${
                      isActive ? "bg-accent/15 ring-1 ring-accent" : "bg-chrome"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold tabular-nums">{o.id}</p>
                      {o.priority === "high" && (
                        <span className="rounded-full bg-critical px-2 py-0.5 text-[10px] font-bold uppercase">
                          !
                        </span>
                      )}
                      <span className="ml-auto text-xs text-chrome-ink">
                        {formatShortDate(o.dueDate, locale)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-white/85">{o.part}</p>
                    <p className="text-xs text-chrome-ink">
                      {o.customer} · {step.qtyDone}/{o.qty}
                    </p>
                    {!isActive && (
                      <button
                        onClick={() => dispatch({ type: "startJob", stationId, orderId: o.id })}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-sm font-semibold hover:bg-accent-strong"
                      >
                        {nesting ? (
                          <>
                            <Layers className="size-4" />
                            {t("addToNesting")}
                          </>
                        ) : (
                          <>
                            <Play className="size-4" />
                            {t("startJob")}
                          </>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* downtime modal */}
      {showDowntime && (
        <Modal
          onClose={() => setShowDowntime(false)}
          title={t("downtimeTitle")}
          hint={t("downtimeHint")}
        >
          <div className="grid grid-cols-2 gap-3">
            {snap.settings.downtimeReasons.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  dispatch({ type: "startDowntime", stationId, reasonId: r.id });
                  setShowDowntime(false);
                }}
                className="rounded-xl bg-chrome py-5 text-base font-semibold hover:bg-white/10"
              >
                {r.name}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* barcode scan modal */}
      {showScan && (
        <Modal
          onClose={() => setShowScan(false)}
          title={t("scanTitle")}
          hint={t("scanHint")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              scan(scanValue);
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={scanValue}
              onChange={(e) => {
                setScanValue(e.target.value);
                setScanError(false);
              }}
              placeholder={t("scanPlaceholder")}
              className="grow rounded-xl border border-white/15 bg-chrome px-4 py-3 text-lg font-semibold tracking-wide text-white placeholder:font-normal placeholder:text-chrome-ink focus:border-accent focus:outline-none"
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-base font-semibold hover:bg-accent-strong"
            >
              <ScanLine className="size-5" />
              {t("startJob")}
            </button>
          </form>
          {scanError && (
            <p className="mt-3 rounded-lg bg-critical/20 px-3 py-2 text-sm text-critical">
              {t("scanNotFound")}
            </p>
          )}
          {/* tap a code to simulate the scanner reading it */}
          <div className="mt-4 flex flex-wrap gap-2">
            {queue
              .filter((o) => !live.currentOrderIds.includes(o.id))
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => scan(o.id)}
                  className="rounded-lg bg-chrome px-3 py-2 text-sm font-semibold tabular-nums hover:bg-white/10"
                >
                  ▮▮ {o.id}
                </button>
              ))}
          </div>
        </Modal>
      )}

      {/* andon modal */}
      {showAndon && (
        <Modal onClose={() => setShowAndon(false)} title={t("andonTitle")}>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["supervisor", Factory],
                ["maintenance", Wrench],
                ["quality", BadgeCheck],
              ] as const
            ).map(([type, Icon]) => (
              <button
                key={type}
                onClick={() => {
                  dispatch({ type: "andonOpen", stationId, andonType: type });
                  setShowAndon(false);
                }}
                className="flex flex-col items-center gap-2 rounded-xl bg-chrome py-6 text-base font-semibold hover:bg-white/10"
              >
                <Icon className="size-7 text-accent" />
                {tt(type)}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** One-tap scrap counter — deliberately no reason dialog (low input burden). */
function ScrapCounter({
  label,
  value,
  onAdd,
  onRemove,
  disabled,
  compact,
}: {
  label: string;
  value: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "ml-auto flex items-center gap-2"
          : "mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-3"
      }
    >
      <span className="text-xs font-medium tracking-wide text-chrome-ink uppercase">
        {label}
      </span>
      <button
        onClick={onRemove}
        disabled={disabled || value <= 0}
        className="flex size-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="scrap -1"
      >
        <Minus className="size-4" />
      </button>
      <span
        className={`min-w-8 text-center text-xl font-semibold tabular-nums ${
          value > 0 ? "text-critical" : "text-chrome-ink"
        }`}
      >
        {value}
      </span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-critical/25 text-critical hover:bg-critical/35 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="scrap +1"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Modal({
  title,
  hint,
  children,
  onClose,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-chrome-2 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-chrome-ink">{hint}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
