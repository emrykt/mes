"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Check, CheckCircle2, Layers, Loader2, Monitor, Plus, Trash2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card, Table, Td, Th } from "@/components/ui";
import { CURRENCIES, formatCost } from "@/lib/currency";
import type {
  AlertTarget,
  AlertTrigger,
  CurrencyCode,
  EscalationRule,
  FeatureFlags,
} from "@/lib/demo-types";

/** Rest-day toggles shown Monday-first (JS getUTCDay numbering). */
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
import { SIM_STATIONS } from "@/lib/sim";

/** Editable catalog of named reasons (downtime or scrap): rename inline, remove,
 *  and add — mirrors the way both are configured. Writes to the live store. */
function ReasonCatalog({
  title,
  hint,
  reasons,
  placeholder,
  addLabel,
  onAdd,
  onRename,
  onRemove,
  inputClass,
}: {
  title: string;
  hint: string;
  reasons: { id: string; name: string }[];
  placeholder: string;
  addLabel: string;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  inputClass: string;
}) {
  const [newVal, setNewVal] = useState("");
  return (
    <Card title={title} subtitle={hint}>
      <ul className="space-y-2">
        {reasons.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <input
              defaultValue={r.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) onRename(r.id, v);
              }}
              className={`${inputClass} grow`}
            />
            <button
              onClick={() => onRemove(r.id)}
              aria-label="remove"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-critical hover:bg-critical-soft/40"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} grow sm:max-w-60`}
        />
        <button
          onClick={() => {
            const v = newVal.trim();
            if (v) {
              onAdd(v);
              setNewVal("");
            }
          }}
          disabled={newVal.trim() === ""}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
    </Card>
  );
}

/**
 * Operation catalog + downtime/scrap reason management, shared by the admin panel
 * and the production-manager panel. Cost rates & currency render only where
 * `withCosts` is set (admin side). Everything writes to the live demo store.
 */
export default function MesCatalogSettings({
  withCosts = false,
}: {
  withCosts?: boolean;
}) {
  const t = useTranslations("mes.settings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();

  const [newOp, setNewOp] = useState("");
  const [newOpBatch, setNewOpBatch] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [costs, setCosts] = useState({
    laborPerHour: "14",
    energyPerHour: "9",
    gasPerHour: "6",
    overheadPerDay: "420",
  });
  const [billing, setBilling] = useState<Record<string, string>>({});
  const [billingNote, setBillingNote] = useState<string | null>(null);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [escNote, setEscNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // hydrate local form state once from the store
  useEffect(() => {
    if (!snap || loaded) return;
    const cr = snap.settings.costRates;
    setCosts({
      laborPerHour: String(cr.laborPerHour),
      energyPerHour: String(cr.energyPerHour),
      gasPerHour: String(cr.gasPerHour),
      overheadPerDay: String(cr.overheadPerDay),
    });
    const br: Record<string, string> = {};
    for (const def of SIM_STATIONS)
      br[def.id] = String(snap.settings.billingRates[def.id] ?? 40);
    setBilling(br);
    setRules((snap.settings.escalationRules ?? []).map((r) => ({ ...r })));
    setLoaded(true);
  }, [snap, loaded]);

  if (!snap) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  const inputClass =
    "rounded-lg border border-line bg-page px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none";

  async function addOperation() {
    const name = newOp.trim();
    if (!name) return;
    await dispatch({ type: "addOperation", name, batchable: newOpBatch });
    setNewOp("");
    setNewOpBatch(false);
    setNote(t("addedNote", { name }));
  }

  async function saveCosts() {
    await dispatch({
      type: "saveCosts",
      costRates: {
        laborPerHour: Number(costs.laborPerHour) || 0,
        energyPerHour: Number(costs.energyPerHour) || 0,
        gasPerHour: Number(costs.gasPerHour) || 0,
        overheadPerDay: Number(costs.overheadPerDay) || 0,
      },
    });
    setNote(t("costsSaved"));
  }

  async function saveBilling() {
    const rates: Record<string, number> = {};
    for (const [id, v] of Object.entries(billing)) rates[id] = Number(v) || 0;
    await dispatch({ type: "saveBillingRates", billingRates: rates });
    setBillingNote(t("billingSaved"));
  }

  function patchRule(id: string, patch: Partial<EscalationRule>) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRule() {
    setRules((rs) => [
      ...rs,
      {
        id: `esc-${Date.now()}`,
        trigger: "downtime",
        threshold: 10,
        target: "maintenance",
        enabled: true,
      },
    ]);
  }
  async function saveRules() {
    await dispatch({ type: "saveEscalationRules", rules });
    setEscNote(t("escSaved"));
  }

  return (
    <div className="space-y-5">
      {note && (
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-good-soft px-3 py-2 text-sm text-good-text">
          <CheckCircle2 className="size-4" />
          {note}
        </p>
      )}

      <Card title={t("operationsTitle")} subtitle={t("operationsHint")}>
        <ul className="flex flex-wrap gap-2">
          {snap.settings.operations.map((op) => (
            <li
              key={op.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-3 py-1.5 text-sm font-medium text-ink-2"
            >
              {op.name}
              {op.batchable && (
                <span
                  title={t("batchableHelp")}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong"
                >
                  <Layers className="size-3" />
                  {t("batchable")}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={newOp}
            onChange={(e) => setNewOp(e.target.value)}
            placeholder={t("addOperationPlaceholder")}
            className={`${inputClass} grow sm:max-w-60`}
          />
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={newOpBatch}
              onChange={(e) => setNewOpBatch(e.target.checked)}
              className="size-4 accent-(--color-accent)"
            />
            {t("batchable")}
          </label>
          <button
            onClick={addOperation}
            disabled={newOp.trim() === ""}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
            {t("add")}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{t("batchableHelp")}</p>
      </Card>

      <ReasonCatalog
        title={t("reasonsTitle")}
        hint={t("reasonsHint")}
        reasons={snap.settings.downtimeReasons}
        placeholder={t("addReasonPlaceholder")}
        addLabel={t("add")}
        inputClass={inputClass}
        onAdd={(name) => { dispatch({ type: "addReason", name }); setNote(t("addedNote", { name })); }}
        onRename={(id, name) => dispatch({ type: "renameReason", id, name })}
        onRemove={(id) => dispatch({ type: "removeReason", id })}
      />

      <ReasonCatalog
        title={t("scrapReasonsTitle")}
        hint={t("scrapReasonsHint")}
        reasons={snap.settings.scrapReasons}
        placeholder={t("addScrapReasonPlaceholder")}
        addLabel={t("add")}
        inputClass={inputClass}
        onAdd={(name) => { dispatch({ type: "addScrapReason", name }); setNote(t("addedNote", { name })); }}
        onRename={(id, name) => dispatch({ type: "renameScrapReason", id, name })}
        onRemove={(id) => dispatch({ type: "removeScrapReason", id })}
      />

      <Card title={t("escalationTitle")} subtitle={t("escalationHint")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("escColTrigger")}</Th>
              <Th>{t("escColThreshold")}</Th>
              <Th>{t("escColTarget")}</Th>
              <Th>{t("escColOn")}</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <Td>
                  <select
                    value={r.trigger}
                    onChange={(e) =>
                      patchRule(r.id, { trigger: e.target.value as AlertTrigger })
                    }
                    className={inputClass}
                  >
                    <option value="downtime">{t("escTrigDowntime")}</option>
                    <option value="scrapRate">{t("escTrigScrap")}</option>
                  </select>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={r.trigger === "scrapRate" ? Math.round(r.threshold * 100) : r.threshold}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        patchRule(r.id, {
                          threshold: r.trigger === "scrapRate" ? v / 100 : v,
                        });
                      }}
                      className={`${inputClass} w-20 text-right`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    />
                    <span className="text-xs text-muted">
                      {r.trigger === "scrapRate" ? t("escUnitPercent") : t("escUnitMin")}
                    </span>
                  </div>
                </Td>
                <Td>
                  <select
                    value={r.target}
                    onChange={(e) =>
                      patchRule(r.id, { target: e.target.value as AlertTarget })
                    }
                    className={inputClass}
                  >
                    <option value="supervisor">{t("escTargetSupervisor")}</option>
                    <option value="maintenance">{t("escTargetMaintenance")}</option>
                    <option value="quality">{t("escTargetQuality")}</option>
                  </select>
                </Td>
                <Td>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => patchRule(r.id, { enabled: e.target.checked })}
                    className="size-4 accent-(--color-accent)"
                  />
                </Td>
                <Td align="right">
                  <button
                    onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}
                    className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text"
                    aria-label={tc("remove")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <button
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
          >
            <Plus className="size-4" />
            {t("escAddRule")}
          </button>
          <button
            onClick={saveRules}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            <Bell className="size-4" />
            {tc("save")}
          </button>
          {escNote && (
            <span className="inline-flex items-center gap-1.5 text-sm text-good-text">
              <CheckCircle2 className="size-4" />
              {escNote}
            </span>
          )}
        </div>
      </Card>

      <Card title={t("calendarTitle")} subtitle={t("calendarHint")}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <label className="block">
            <span className="text-xs font-medium text-ink-2">{t("shiftsLabel")}</span>
            <select
              value={snap.settings.workingCalendar?.shifts ?? 3}
              onChange={(e) =>
                dispatch({
                  type: "setWorkingCalendar",
                  calendar: {
                    shifts: Number(e.target.value),
                    restDays: snap.settings.workingCalendar?.restDays ?? [],
                  },
                })
              }
              className={`${inputClass} mt-1.5 block w-40`}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {t("shiftsN", { n })}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-xs font-medium text-ink-2">{t("restDaysLabel")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEEK_DAYS.map((d) => {
                const rest = snap.settings.workingCalendar?.restDays ?? [];
                const on = rest.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() =>
                      dispatch({
                        type: "setWorkingCalendar",
                        calendar: {
                          shifts: snap.settings.workingCalendar?.shifts ?? 3,
                          restDays: on ? rest.filter((x) => x !== d) : [...rest, d],
                        },
                      })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      on
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-line text-ink-2 hover:bg-neutral-soft"
                    }`}
                  >
                    {t(`wd${d}`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{t("restDaysHint")}</p>
          </div>
        </div>
      </Card>

      {withCosts && (
        <>
          <Card title={t("deptTitle")} subtitle={t("deptHint")}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 hover:bg-neutral-soft/50">
              <input
                type="checkbox"
                checked={snap.settings.maintenanceOwnDepartment}
                onChange={(e) =>
                  dispatch({ type: "setMaintenanceDept", own: e.target.checked })
                }
                className="mt-0.5 size-4 accent-(--color-accent)"
              />
              <span>
                <span className="block text-sm font-medium">{t("deptToggle")}</span>
                <span className="block text-xs text-muted">{t("deptToggleHint")}</span>
              </span>
            </label>
          </Card>

          <Card title={t("modulesTitle")} subtitle={t("modulesHint")}>
            <div className="space-y-3">
              {(
                [
                  ["maintenance", "featMaintenance", "featMaintenanceDesc"],
                  ["barcode", "featBarcode", "featBarcodeDesc"],
                  ["quoting", "featQuoting", "featQuotingDesc"],
                  ["stock", "featStock", "featStockDesc"],
                ] as const
              ).map(([feature, nameKey, descKey]) => (
                <label
                  key={feature}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 hover:bg-neutral-soft/50"
                >
                  <input
                    type="checkbox"
                    checked={snap.settings.features[feature as keyof FeatureFlags]}
                    onChange={(e) =>
                      dispatch({
                        type: "setFeature",
                        feature: feature as keyof FeatureFlags,
                        enabled: e.target.checked,
                      })
                    }
                    className="mt-0.5 size-4 accent-(--color-accent)"
                  />
                  <span>
                    <span className="block text-sm font-medium">{t(nameKey)}</span>
                    <span className="block text-xs text-muted">{t(descKey)}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Monitor className="size-3.5" />
              {t("monitoringNote")}
            </p>
          </Card>

          <Card title={t("currencyTitle")} subtitle={t("currencyHint")}>
            <label className="block sm:max-w-52">
              <span className="text-xs font-medium text-ink-2">
                {t("displayCurrency")}
              </span>
              <select
                value={snap.settings.currency}
                onChange={(e) =>
                  dispatch({
                    type: "setCurrency",
                    currency: e.target.value as CurrencyCode,
                  })
                }
                className={`${inputClass} mt-1.5 w-full`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <Card title={t("costsTitle")} subtitle={t("costsHint")}>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["laborRate", "laborPerHour"],
                  ["energyRate", "energyPerHour"],
                  ["gasRate", "gasPerHour"],
                  ["overheadRate", "overheadPerDay"],
                ] as const
              ).map(([labelKey, field]) => (
                <label key={field} className="block">
                  <span className="text-xs font-medium text-ink-2">{t(labelKey)}</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      value={costs[field]}
                      onChange={(e) =>
                        setCosts((c) => ({ ...c, [field]: e.target.value }))
                      }
                      className={`${inputClass} w-full`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    />
                    <span className="text-xs text-muted">{snap.settings.currency}</span>
                  </div>
                  <span className="mt-1 block text-xs text-muted">
                    {formatCost(Number(costs[field]) || 0, snap.settings.currency, locale, 2)}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={saveCosts}
              className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
            >
              {tc("save")}
            </button>
          </Card>

          <Card title={t("billingTitle")} subtitle={t("billingHint")} padded={false}>
            <Table>
              <thead>
                <tr>
                  <Th>{t("colStation")}</Th>
                  <Th align="right">{t("colRate")}</Th>
                </tr>
              </thead>
              <tbody>
                {SIM_STATIONS.map((def) => (
                  <tr key={def.id}>
                    <Td className="font-medium">{def.name}</Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={billing[def.id] ?? ""}
                          onChange={(e) =>
                            setBilling((b) => ({ ...b, [def.id]: e.target.value }))
                          }
                          className={`${inputClass} w-28 text-right`}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        />
                        <span className="w-10 text-left text-xs text-muted">
                          {snap.settings.currency}
                        </span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center gap-3 px-5 py-4">
              <button
                onClick={saveBilling}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              >
                {tc("save")}
              </button>
              {billingNote && (
                <span className="inline-flex items-center gap-1.5 text-sm text-good-text">
                  <CheckCircle2 className="size-4" />
                  {billingNote}
                </span>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
