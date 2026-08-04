"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { ProgressBar, StepChip } from "@/components/mes/mes-ui";
import { Card, Table, Td, Th } from "@/components/ui";
import { currentStep, orderDone, orderProgress } from "@/lib/mes-calc";
import { rootCauseFor, type RootCauseKind } from "@/lib/insights";
import { CUSTOMER_POOL, buildMaterial, estimateMinutes } from "@/lib/sim";
import type { MaterialSpec, MesOrder, OperationDef } from "@/lib/mes-types";
import { formatShortDate } from "@/lib/format";

/** Delay status of an order relative to due date. */
function orderStatus(
  o: { dueDate: string; routing: { status: string }[] },
  now: Date,
): "done" | "late" | "risk" | "onTime" {
  if (o.routing.every((s) => s.status === "done")) return "done";
  const due = new Date(o.dueDate).getTime();
  if (due < now.getTime()) return "late";
  if (due - now.getTime() < 2 * 86400000) return "risk";
  return "onTime";
}

const STATUS_STYLE: Record<string, string> = {
  done: "bg-good-soft text-good-text",
  late: "bg-critical-soft text-critical-text",
  risk: "bg-warning-soft text-warning-text",
  onTime: "bg-neutral-soft text-ink-2",
};

const ROOT_KEY: Record<RootCauseKind, string> = {
  blockedDown: "rootBlockedDown",
  waiting: "rootWaiting",
  planOverrun: "rootPlanOverrun",
  behind: "rootBehind",
};

/**
 * Order status board — used by Sales (order entry, `allowCreate`) and by
 * Production Management (read-only tracking). Shows current operation, delay
 * status with AI root-cause, due date and overall progress.
 */
export default function OrdersBoard({ allowCreate = false }: { allowCreate?: boolean }) {
  const t = useTranslations("mes.orders");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<MesOrder | null>(null);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  const orders = snap?.orders ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter(
        (o) => !q || [o.id, o.customer, o.part].join(" ").toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const ad = orderProgress(a) >= 1 ? 1 : 0;
        const bd = orderProgress(b) >= 1 ? 1 : 0;
        return ad - bd || a.dueDate.localeCompare(b.dueDate);
      });
  }, [orders, query]);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const opName = (id: string) =>
    snap.settings.operations.find((o) => o.id === id)?.name ?? id;
  const now = new Date(snap.now);

  /** Raw material an order will consume (stock module): "material · qty unit". */
  const consumed = (o: MesOrder): string | null => {
    if (!snap.settings.features.stock || !o.stockItemId || !o.materialQty) return null;
    const it = snap.stock.find((s) => s.id === o.stockItemId);
    if (!it) return null;
    const unit = it.unit === "piece" ? t("unitPiece") : t("unitKg");
    const name = it.thicknessMm
      ? `${it.materialType} ${it.thicknessMm} mm · ${it.dimension}`
      : `${it.materialType} ${it.dimension}`;
    return `${name} · ${Math.round(o.materialQty)} ${unit}`;
  };

  const statusLabel: Record<string, string> = {
    done: t("statusDone"),
    late: t("statusLate"),
    risk: t("statusRisk"),
    onTime: t("statusOnTime"),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {allowCreate ? t("subtitle") : t("subtitleTrack")}
          </p>
        </div>
        {allowCreate && (
          <button
            onClick={() => {
              setShowNew(true);
              setCreatedMsg(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
          >
            <Plus className="size-4" />
            {t("newOrder")}
          </button>
        )}
      </div>

      {createdMsg && (
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-good-soft px-3 py-2 text-sm text-good-text">
          <CheckCircle2 className="size-4" />
          {createdMsg}
        </p>
      )}

      <label className="relative block sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colOrder")}</Th>
                <Th>{t("colMaterial")}</Th>
                <Th>{t("colCurrentOp")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colDue")}</Th>
                <Th align="right">{t("colProgress")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const progress = orderProgress(o);
                const status = orderStatus(o, now);
                const cur = currentStep(o);
                const rc =
                  status === "late" || status === "risk"
                    ? rootCauseFor(o, snap, now)
                    : null;
                return (
                  <tr key={o.id} className="hover:bg-neutral-soft/50">
                    <Td>
                      <Link
                        href={`/mes/manager/orders/${o.id}`}
                        className="font-medium text-ink hover:text-accent-strong"
                      >
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{o.id}</span>
                        {o.priority === "high" && (
                          <span className="ml-2 rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-bold text-critical-text uppercase">
                            {t("priorityHigh")}
                          </span>
                        )}
                      </Link>
                      <p className="text-xs text-muted">
                        {o.customer} · {o.part}
                        {allowCreate && (
                          <button
                            onClick={() => setEditTarget(o)}
                            className="ml-2 inline-flex items-center gap-1 text-accent-strong hover:underline"
                          >
                            <Pencil className="size-3" />
                            {t("edit")}
                          </button>
                        )}
                      </p>
                    </Td>
                    <Td className="text-ink-2">
                      {o.material ? (
                        <span className="text-xs">
                          {o.material.type}
                          <span className="text-muted">
                            {o.material.thicknessMm ? ` · ${o.material.thicknessMm} mm` : ""} · {o.material.size}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {(() => {
                        const c = consumed(o);
                        return c ? (
                          <p className="mt-0.5 text-[11px] text-muted">
                            <span className="font-medium text-ink-2">{t("consumeLabel")}:</span> {c}
                          </p>
                        ) : null;
                      })()}
                    </Td>
                    <Td>
                      {orderDone(o) ? (
                        <span className="text-xs text-muted">—</span>
                      ) : cur ? (
                        <StepChip status={cur.status} label={opName(cur.operationId)} />
                      ) : null}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
                      >
                        {statusLabel[status]}
                      </span>
                      {rc && (
                        <p className="mt-1 max-w-56 text-[11px] leading-snug text-muted">
                          <span className="font-medium text-ink-2">{t("whyLabel")}:</span>{" "}
                          {t(ROOT_KEY[rc.kind], rc.params)}
                        </p>
                      )}
                    </Td>
                    <Td className="text-ink-2">{formatShortDate(o.dueDate, locale)}</Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar ratio={progress} className="w-20" />
                        <span
                          className="w-9 text-right text-sm font-medium"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {Math.round(progress * 100)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {showNew && (
        <OrderModal
          operations={snap.settings.operations}
          onClose={() => setShowNew(false)}
          onSubmit={async (payload) => {
            await dispatch({ type: "createOrder", ...payload });
            setShowNew(false);
            setCreatedMsg(t("created", { id: "✓", steps: payload.routing.length }));
          }}
        />
      )}

      {editTarget && (
        <OrderModal
          operations={snap.settings.operations}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (payload) => {
            await dispatch({
              type: "editOrder",
              orderId: editTarget.id,
              patch: payload,
            });
            setEditTarget(null);
            setCreatedMsg(t("editedMsg", { id: editTarget.id }));
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OrderModal({
  operations,
  initial,
  onClose,
  onSubmit,
}: {
  operations: OperationDef[];
  initial?: MesOrder;
  onClose: () => void;
  onSubmit: (payload: {
    customer: string;
    part: string;
    qty: number;
    dueDate: string;
    priority?: "normal" | "high";
    material?: MaterialSpec;
    routing: { operationId: string; estMinutes?: number }[];
  }) => Promise<void>;
}) {
  const t = useTranslations("mes.orders");
  const editing = !!initial;
  const stepLocked = (s: { status: string; runMinutes?: number }) =>
    s.status === "done" ||
    s.status === "running" ||
    s.status === "paused" ||
    (s.runMinutes ?? 0) > 0;

  type Step = { id: number; operationId: string; locked: boolean; hours: string };
  const [steps, setSteps] = useState<Step[]>(() =>
    (initial?.routing ?? []).map((s, i) => ({
      id: i,
      operationId: s.operationId,
      locked: stepLocked(s),
      hours: s.estMinutes ? String(Math.round((s.estMinutes / 60) * 100) / 100) : "",
    })),
  );
  const [seqKey, setSeqKey] = useState(1000);
  const [customer, setCustomer] = useState(initial?.customer === "—" ? "" : initial?.customer ?? "");
  const [part, setPart] = useState(initial?.part === "—" ? "" : initial?.part ?? "");
  const [qty, setQty] = useState(String(initial?.qty ?? 100));
  const [due, setDue] = useState(() =>
    (initial?.dueDate ?? new Date(Date.now() + 7 * 86400000).toISOString()).slice(0, 10),
  );
  const [mat, setMat] = useState<MaterialSpec>(
    () => initial?.material ?? buildMaterial(`ui:${Date.now()}`),
  );
  const [saving, setSaving] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none";

  const opName = (id: string) => operations.find((o) => o.id === id)?.name ?? id;
  const available = operations.filter((o) => !steps.some((s) => s.operationId === o.id));

  function addStep(operationId: string) {
    setSteps((s) => [...s, { id: seqKey, operationId, locked: false, hours: "" }]);
    setSeqKey((k) => k + 1);
  }
  function removeStep(id: number) {
    setSteps((s) => s.filter((x) => x.id !== id || x.locked));
  }
  function setHours(id: number, hours: string) {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, hours } : x)));
  }
  function move(id: number, dir: -1 | 1) {
    setSteps((s) => {
      const i = s.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length || s[i].locked || s[j].locked) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function submit() {
    setSaving(true);
    const qtyNum = Math.max(1, Number(qty) || 1);
    await onSubmit({
      customer,
      part,
      qty: qtyNum,
      dueDate: new Date(`${due}T00:00:00Z`).toISOString(),
      material: {
        type: mat.type,
        thicknessMm: Number(mat.thicknessMm) || 0,
        size: mat.size,
      },
      routing: steps.map((st) => {
        const h = Number(st.hours);
        return {
          operationId: st.operationId,
          estMinutes: h > 0 ? Math.round(h * 60) : estimateMinutes(st.operationId, qtyNum),
        };
      }),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editing ? t("editOrderTitle", { id: initial!.id }) : t("newOrderTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t("fieldOrderNo")}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-2">
            {t("fieldCustomer")}
            <input
              list="customer-pool"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className={inputClass}
            />
            <datalist id="customer-pool">
              {CUSTOMER_POOL.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t("fieldPart")}
            <input value={part} onChange={(e) => setPart(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t("fieldQty")}
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t("fieldDue")}
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <p className="mt-6 text-xs font-medium text-ink-2">{t("materialTitle")}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-ink-2">
            {t("materialType")}
            <input
              list="material-types"
              value={mat.type}
              onChange={(e) => setMat((m) => ({ ...m, type: e.target.value }))}
              className={inputClass}
            />
            <datalist id="material-types">
              {["DKP", "Galvaniz", "Paslanmaz 304", "Alüminyum", "St37"].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t("materialThickness")}
            <input
              type="number"
              step={0.1}
              min={0}
              value={mat.thicknessMm}
              onChange={(e) =>
                setMat((m) => ({ ...m, thicknessMm: Number(e.target.value) }))
              }
              className={inputClass}
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
          </label>
          <label className="block text-xs font-medium text-ink-2">
            {t("materialSize")}
            <input
              list="material-sizes"
              value={mat.size}
              onChange={(e) => setMat((m) => ({ ...m, size: e.target.value }))}
              className={inputClass}
            />
            <datalist id="material-sizes">
              {["1000 × 2000", "1250 × 2500", "1500 × 3000", "2000 × 4000"].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
        </div>

        <p className="mt-6 text-xs font-medium text-ink-2">{t("routingBuilder")}</p>
        {editing && steps.some((s) => s.locked) && (
          <p className="mt-1 text-xs text-muted">{t("routingEditHint")}</p>
        )}

        {/* ordered routing — completed/started steps locked, the rest editable */}
        {steps.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("routingNone")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {steps.map((st, i) => {
              const canUp = i > 0 && !st.locked && !steps[i - 1].locked;
              const canDown = i < steps.length - 1 && !st.locked && !steps[i + 1].locked;
              return (
                <li key={st.id} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-xs font-semibold text-ink-2">
                    {i + 1}
                  </span>
                  {st.locked ? (
                    <span className="flex flex-1 items-center gap-1.5 rounded-md bg-neutral-soft px-2.5 py-1.5 text-sm font-medium text-muted">
                      <Lock className="size-3.5" />
                      {opName(st.operationId)}
                      <span className="ml-auto text-[10px] font-semibold tracking-wide uppercase">
                        {t("locked")}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="flex-1 rounded-md bg-accent-soft px-2.5 py-1.5 text-sm font-medium text-accent-strong">
                        {opName(st.operationId)}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={st.hours}
                        onChange={(e) => setHours(st.id, e.target.value)}
                        placeholder={t("estHours")}
                        className="w-16 rounded-lg border border-line bg-page px-2 py-1.5 text-right text-sm focus:border-accent focus:outline-none"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      />
                      <span className="text-xs text-muted">{t("estHours")}</span>
                      <button
                        onClick={() => move(st.id, -1)}
                        disabled={!canUp}
                        className="rounded p-1 text-muted hover:bg-neutral-soft disabled:opacity-30"
                        aria-label={t("moveUp")}
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        onClick={() => move(st.id, 1)}
                        disabled={!canDown}
                        className="rounded p-1 text-muted hover:bg-neutral-soft disabled:opacity-30"
                        aria-label={t("moveDown")}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      <button
                        onClick={() => removeStep(st.id)}
                        className="rounded p-1 text-muted hover:bg-neutral-soft hover:text-critical-text"
                        aria-label={t("remove")}
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {available.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium text-ink-2">{t("addStep")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {available.map((op) => (
                <button
                  key={op.id}
                  onClick={() => addStep(op.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-accent hover:text-accent-strong"
                >
                  <Plus className="size-3.5" />
                  {op.name}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-muted">{t("estHint")}</p>

        <button
          onClick={submit}
          disabled={steps.length === 0 || saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? t("saveEdit") : t("create")}
        </button>
      </div>
    </div>
  );
}
