"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import type { MaterialForm, StockUnit } from "@/lib/demo-types";

const inp =
  "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

/** Add a new raw-material stock item (with a safety-stock buffer). */
export default function StockAddForm() {
  const t = useTranslations("mes.stock");
  const { dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    materialType: "",
    form: "bar" as MaterialForm,
    unit: "kg" as StockUnit,
    dimension: "",
    onHand: "",
    reorder: "",
    safetyStock: "",
    costPerKg: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const valid = f.materialType.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    await dispatch({
      type: "addStockItem",
      item: {
        materialType: f.materialType.trim(),
        form: f.form,
        unit: f.unit,
        dimension: f.dimension.trim() || "—",
        onHand: Number(f.onHand) || 0,
        reorder: Number(f.reorder) || 0,
        safetyStock: Number(f.safetyStock) || 0,
        costPerKg: Number(f.costPerKg) || 0,
      },
    });
    setF({ materialType: "", form: "bar", unit: "kg", dimension: "", onHand: "", reorder: "", safetyStock: "", costPerKg: "" });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
      >
        <Plus className="size-4" />
        {t("addTitle")}
      </button>
    );
  }

  return (
    <Card
      title={t("addTitle")}
      subtitle={t("addHint")}
      action={
        <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted hover:bg-neutral-soft" aria-label="Close">
          <X className="size-4" />
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-ink-2 sm:col-span-2">
          {t("fMaterial")}
          <input value={f.materialType} onChange={set("materialType")} className={`${inp} mt-1`} placeholder="e.g. Stainless 304" />
        </label>
        <label className="text-xs font-medium text-ink-2">
          {t("fForm")}
          <select value={f.form} onChange={set("form")} className={`${inp} mt-1`}>
            <option value="bar">bar</option>
            <option value="plate">plate</option>
            <option value="tube">tube</option>
            <option value="block">block</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-2">
          {t("fUnit")}
          <select value={f.unit} onChange={set("unit")} className={`${inp} mt-1`}>
            <option value="kg">{t("unitKg")}</option>
            <option value="piece">{t("unitPiece")}</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-2 sm:col-span-2">
          {t("fDimension")}
          <input value={f.dimension} onChange={set("dimension")} className={`${inp} mt-1`} placeholder="Ø40 · 1250 × 2500" />
        </label>
        <label className="text-xs font-medium text-ink-2">
          {t("fOnHand")}
          <input type="number" value={f.onHand} onChange={set("onHand")} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs font-medium text-ink-2">
          {t("fReorder")}
          <input type="number" value={f.reorder} onChange={set("reorder")} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs font-medium text-accent-strong">
          {t("fSafety")}
          <input type="number" value={f.safetyStock} onChange={set("safetyStock")} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs font-medium text-ink-2">
          {t("fCost")}
          <input type="number" value={f.costPerKg} onChange={set("costPerKg")} className={`${inp} mt-1`} />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!valid}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
        >
          {t("addSave")}
        </button>
        <span className="text-xs text-muted">{t("fSafetyHint")}</span>
      </div>
    </Card>
  );
}
