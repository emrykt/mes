"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowLeft, Boxes, Loader2, Package, Recycle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card, StatCard, Table, Td, Th } from "@/components/ui";
import StockAiAlerts from "@/components/mes/StockAiAlerts";
import { formatCost } from "@/lib/currency";
import type { MaterialForm, StockItem, StockMoveType } from "@/lib/demo-types";

const FORM_KEY: Record<MaterialForm, string> = {
  bar: "formBar",
  plate: "formPlate",
  tube: "formTube",
  block: "formBlock",
};
const MOVE_KEY: Record<StockMoveType, string> = {
  issue: "moveIssue",
  receipt: "moveReceipt",
  remnant: "moveRemnant",
  adjust: "moveAdjust",
};
const MOVE_STYLE: Record<StockMoveType, string> = {
  issue: "text-critical-text",
  receipt: "text-good-text",
  remnant: "text-accent-strong",
  adjust: "text-ink-2",
};

const weightKg = (s: StockItem) =>
  s.unit === "piece" ? s.onHand * (s.weightKgPerPiece ?? 0) : s.onHand;

export default function StockScreen() {
  const t = useTranslations("mes.stock");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();
  const [restock, setRestock] = useState<Record<string, string>>({});

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  if (!snap.settings.features.stock) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 rounded-xl border border-line bg-surface p-5 text-sm text-ink-2">
          {t("disabled")}
        </p>
      </div>
    );
  }

  const cur = snap.settings.currency;
  const money = (v: number, d = 0) => formatCost(v, cur, locale, d);
  const items = snap.stock.filter((s) => !s.isRemnant);
  const remnants = snap.stock.filter((s) => s.isRemnant && s.onHand > 0);
  const unitLabel = (s: StockItem) => (s.unit === "piece" ? t("unitPiece") : t("unitKg"));
  const amount = (s: StockItem, q: number) =>
    s.unit === "piece" ? t("pieces", { v: Math.round(q) }) : t("kg", { v: Math.round(q) });
  const itemName = (id: string) => {
    const s = snap.stock.find((x) => x.id === id);
    if (!s) return id;
    return s.thicknessMm ? `${s.materialType} ${s.thicknessMm} mm · ${s.dimension}` : `${s.materialType} ${s.dimension}`;
  };

  const totalValue = snap.stock.reduce((s, x) => s + weightKg(x) * x.costPerKg, 0);
  const lowCount = items.filter((s) => s.onHand <= s.reorder).length;
  const remnantKg = remnants.reduce((s, x) => s + weightKg(x), 0);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 md:py-10">
      <header className="flex items-center gap-3">
        <Link href="/mes" className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft" aria-label={tc("back")}>
          <ArrowLeft className="size-5" />
        </Link>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <Boxes className="size-4.5" />
        </span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted">{t("subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label={t("kpiValue")} value={money(totalValue)} />
        <StatCard label={t("kpiLow")} value={String(lowCount)} sub={t("kpiLowSub")} />
        <StatCard label={t("kpiRemnant")} value={t("kg", { v: Math.round(remnantKg) })} />
        <StatCard label={t("kpiItems")} value={String(items.length)} />
      </div>

      <div className="mt-5">
        <StockAiAlerts />
      </div>

      <Card title={t("itemsTitle")} subtitle={t("itemsHint")} className="mt-5" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colMaterial")}</Th>
              <Th>{t("colForm")}</Th>
              <Th align="right">{t("colOnHand")}</Th>
              <Th>{t("colLevel")}</Th>
              <Th align="right">{t("colValue")}</Th>
              <Th align="right">{t("colRestock")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const low = s.onHand <= s.reorder;
              const pct = Math.min(100, Math.round((s.onHand / Math.max(1, s.reorder * 2)) * 100));
              return (
                <tr key={s.id} className="hover:bg-neutral-soft/50">
                  <Td>
                    <span className="font-medium">{s.materialType}</span>
                    <span className="text-muted">
                      {s.thicknessMm ? ` · ${s.thicknessMm} mm · ${s.dimension}` : ` · ${s.dimension}`}
                    </span>
                  </Td>
                  <Td className="text-ink-2">{t(FORM_KEY[s.form])}</Td>
                  <Td align="right">
                    <span
                      className={`font-medium ${low ? "text-critical-text" : ""}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {amount(s, s.onHand)}
                    </span>
                    {s.unit === "piece" && (
                      <p className="text-[11px] text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                        ≈ {t("kg", { v: Math.round(weightKg(s)) })}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-soft">
                        <div
                          className={`h-full rounded-full ${low ? "bg-critical" : "bg-good"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {low ? (
                        <span className="rounded-full bg-critical-soft px-1.5 py-0.5 text-[10px] font-semibold text-critical-text">
                          {t("low")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">
                          {t("reorderAt", { v: `${Math.round(s.reorder)} ${unitLabel(s)}` })}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td align="right" className="text-ink-2">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(weightKg(s) * s.costPerKg)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        min={0}
                        placeholder={unitLabel(s)}
                        value={restock[s.id] ?? ""}
                        onChange={(e) => setRestock((r) => ({ ...r, [s.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-line bg-page px-2 py-1.5 text-right text-sm focus:border-accent focus:outline-none"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      />
                      <button
                        onClick={() => {
                          const qty = Number(restock[s.id]) || 0;
                          if (qty > 0) {
                            dispatch({ type: "restockItem", stockItemId: s.id, qty });
                            setRestock((r) => ({ ...r, [s.id]: "" }));
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-strong"
                      >
                        <ArrowDownToLine className="size-3.5" />
                        {t("receive")}
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* remnants */}
        <Card title={t("remnantTitle")} subtitle={t("remnantHint")} padded={false}>
          {remnants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("noRemnant")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {remnants.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-wash text-accent-strong">
                    <Recycle className="size-4" />
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-medium">
                      {s.materialType} · {s.dimension}
                    </p>
                    <p className="text-xs text-muted">{t("reusable")}</p>
                  </div>
                  <span className="text-sm font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {amount(s, s.onHand)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* movements */}
        <Card title={t("movesTitle")} subtitle={t("movesHint")} padded={false}>
          {snap.stockMoves.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("noMoves")}</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {snap.stockMoves.slice(0, 20).map((m) => {
                const it = snap.stock.find((x) => x.id === m.stockItemId);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-soft">
                      <Package className="size-3.5 text-ink-2" />
                    </span>
                    <div className="min-w-0 grow">
                      <p className="truncate text-sm">{itemName(m.stockItemId)}</p>
                      <p className="text-xs text-muted">
                        {t(MOVE_KEY[m.type])}
                        {m.orderId ? ` · ${m.orderId}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${MOVE_STYLE[m.type]}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {m.type === "issue" ? "−" : "+"}
                      {it ? amount(it, m.qty) : t("kg", { v: Math.round(m.qty) })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
