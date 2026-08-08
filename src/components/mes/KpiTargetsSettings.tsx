"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { KPI_DEFS, KPI_SECTIONS, kpiDef } from "@/lib/kpi";

/** Edit this company's KPI targets (section by section). */
export default function KpiTargetsSettings() {
  const t = useTranslations("mes.kpi");
  const { snap, dispatch } = useDemo();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  if (!snap) return null;
  const targets = snap.settings.kpiTargets ?? {};
  const shown = (id: string) => draft[id] ?? String(targets[id] ?? kpiDef(id as never).defaultTarget);

  const save = async () => {
    const out: Record<string, number> = {};
    for (const d of KPI_DEFS) {
      const n = Number(shown(d.id));
      if (!Number.isNaN(n)) out[d.id] = n;
    }
    await dispatch({ type: "saveKpiTargets", targets: out });
    setDraft({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const unitLabel = (u: string) => (u === "percent" ? "%" : u === "minutes" ? t("unitMin") : "");

  return (
    <Card title={t("targetsTitle")} subtitle={t("targetsHint")}>
      <div className="space-y-4">
        {KPI_SECTIONS.map((section) => (
          <div key={section}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t(`section.${section}`)}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {KPI_DEFS.filter((d) => d.section === section).map((d) => (
                <label key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-page px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-ink-2">{t(d.id)}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <input
                      type="number"
                      value={shown(d.id)}
                      onChange={(e) => setDraft((p) => ({ ...p, [d.id]: e.target.value }))}
                      className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums focus:border-accent focus:outline-none"
                    />
                    <span className="w-6 text-xs text-muted">{unitLabel(d.unit)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          {t("saveTargets")}
        </button>
        {saved && <span className="text-sm text-good-text">{t("saved")}</span>}
      </div>
    </Card>
  );
}
