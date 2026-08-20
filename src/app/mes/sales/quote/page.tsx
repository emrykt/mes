"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import BrandLogoUpload from "@/components/BrandLogoUpload";
import { Card, Table, Td, Th } from "@/components/ui";
import { formatCost } from "@/lib/currency";
import { formatShortDate } from "@/lib/format";
import { operationBillingRate, CUSTOMER_POOL } from "@/lib/sim";

interface Line {
  key: number;
  operationId: string;
  hours: string;
}

/** Sales quoting — priced from station rates, saved to the store and
 *  searchable by customer. Order entry and quoting live together on Sales. */
export default function SalesQuotePage() {
  const t = useTranslations("mes.quote");
  const locale = useLocale();
  const { snap, dispatch } = useDemo();

  const [customer, setCustomer] = useState("");
  const [part, setPart] = useState("");
  const [qty, setQty] = useState("100");
  const [lines, setLines] = useState<Line[]>([]);
  const [material, setMaterial] = useState("0");
  const [margin, setMargin] = useState("25");
  const [seq, setSeq] = useState(1);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const rates = snap?.settings.billingRates ?? {};
  const currency = snap?.settings.currency ?? "EUR";
  const money = (v: number, d = 0) => formatCost(v, currency, locale, d);

  const priced = useMemo(
    () =>
      lines.map((l) => {
        const rate = operationBillingRate(l.operationId, rates);
        const hours = Number(l.hours) || 0;
        return { ...l, rate, hours, total: rate * hours };
      }),
    [lines, rates],
  );

  const machineCharge = priced.reduce((s, l) => s + l.total, 0);
  const materialCost = Number(material) || 0;
  const subtotal = machineCharge + materialCost;
  const marginPct = Number(margin) || 0;
  const marginAmt = subtotal * (marginPct / 100);
  const total = subtotal + marginAmt;
  const qtyNum = Math.max(1, Number(qty) || 1);
  const grossMarginPct = total > 0 ? Math.round((marginAmt / total) * 100) : 0;

  const [custFilter, setCustFilter] = useState("all");
  const [period, setPeriod] = useState("all"); // all | 30 | 90 | 365 (days)
  const savedCustomers = useMemo(
    () => [...new Set((snap?.quotes ?? []).map((x) => x.customer))].sort((a, b) => a.localeCompare(b)),
    [snap?.quotes],
  );
  const savedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return (snap?.quotes ?? [])
      .filter((x) => !q || [x.customer, x.part ?? ""].join(" ").toLowerCase().includes(q))
      .filter((x) => custFilter === "all" || x.customer === custFilter)
      .filter((x) => cutoff === 0 || new Date(x.at).getTime() >= cutoff);
  }, [snap?.quotes, search, custFilter, period]);

  if (!snap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  if (!snap.settings.features.quoting) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-md rounded-xl border border-line bg-surface p-5 text-sm text-ink-2">
          {t("disabled")}
        </p>
      </div>
    );
  }

  const inputClass =
    "rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none";

  function addLine() {
    const firstOp = snap!.settings.operations[0]?.id ?? "";
    setLines((l) => [...l, { key: seq, operationId: firstOp, hours: "1" }]);
    setSeq((s) => s + 1);
  }

  async function save() {
    if (priced.length === 0 || !customer.trim()) return;
    await dispatch({
      type: "saveQuote",
      quote: {
        customer: customer.trim(),
        part: part.trim() || undefined,
        qty: qtyNum,
        lines: priced.map((l) => ({ operationId: l.operationId, hours: l.hours })),
        laborTotal: Math.round(machineCharge),
        materialCost: Math.round(materialCost),
        marginPct,
        total: Math.round(total),
        perPart: Math.round((total / qtyNum) * 100) / 100,
        currency,
      },
    });
    setSavedMsg(t("savedMsg", { customer: customer.trim() }));
  }

  const opName = (id: string) =>
    snap.settings.operations.find((o) => o.id === id)?.name ?? id;

  const appName = "Prodgence";
  function openPrint(d: {
    customer: string;
    part?: string;
    qty?: number;
    date: string;
    lines: { op: string; hours: number; rate: number; total: number }[];
    laborTotal: number;
    material: number;
    marginPct: number;
    total: number;
    perPart?: number;
  }) {
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
    const rows = d.lines
      .map(
        (l) =>
          `<tr><td>${esc(l.op)}</td><td class="r">${l.hours}</td><td class="r">${money(l.rate)}</td><td class="r">${money(l.total)}</td></tr>`,
      )
      .join("");
    const marginAmt = d.total - d.laborTotal - d.material;
    const meta = [
      `<strong>${t("fieldCustomer")}:</strong> ${esc(d.customer)}`,
      d.part ? `<strong>${t("fieldPart")}:</strong> ${esc(d.part)}` : "",
      d.qty ? `<strong>${t("fieldQty")}:</strong> ${d.qty}` : "",
    ]
      .filter(Boolean)
      .join(" &nbsp;·&nbsp; ");
    const logo = snap?.settings.brandLogo;
    const brandHead = logo
      ? `<img src="${logo}" alt="" style="max-height:52px;max-width:240px;object-fit:contain"/>`
      : `<h1>${appName}</h1>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${t("printTitle")}</title>
<style>body{font-family:system-ui,-apple-system,Arial,sans-serif;color:#111;padding:36px;max-width:720px;margin:auto}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px}
h1{font-size:19px;margin:0}.sub{font-size:13px;color:#555;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:18px}
th,td{border-bottom:1px solid #ddd;padding:8px 6px;font-size:13px}th{text-align:left;color:#555}
.r{text-align:right}.tot{margin-top:16px;font-size:13px;max-width:320px;margin-left:auto}
.tot div{display:flex;justify-content:space-between;padding:3px 0}
.grand{font-size:19px;font-weight:600;border-top:2px solid #111;margin-top:6px;padding-top:8px}</style></head>
<body><div class="top"><div>${brandHead}<div class="sub">${t("printTitle")}</div></div><span style="font-size:13px">${esc(d.date)}</span></div>
<p style="font-size:13px">${meta}</p>
<table><thead><tr><th>${t("colOperation")}</th><th class="r">${t("colHours")}</th><th class="r">${t("colRate")}</th><th class="r">${t("colLineTotal")}</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot">
<div><span>${t("machineCharge")}</span><span>${money(d.laborTotal)}</span></div>
<div><span>${t("material")}</span><span>${money(d.material)}</span></div>
<div><span>${t("margin")} (${d.marginPct}%)</span><span>${money(marginAmt)}</span></div>
<div class="grand"><span>${t("total")}</span><span>${money(d.total)}</span></div>
<div style="justify-content:flex-end;color:#555">${t("perPart", { value: money(d.perPart ?? 0, 2) })}</div>
</div>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank", "width=820,height=920");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  function printCurrent() {
    openPrint({
      customer: customer.trim() || "—",
      part: part.trim() || undefined,
      qty: qtyNum,
      date: new Date().toISOString().slice(0, 10),
      lines: priced.map((l) => ({ op: opName(l.operationId), hours: l.hours, rate: l.rate, total: l.total })),
      laborTotal: machineCharge,
      material: materialCost,
      marginPct,
      total,
      perPart: total / qtyNum,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-ink-2">
                {t("fieldCustomer")}
                <input
                  list="quote-customers"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className={`${inputClass} mt-1 w-full`}
                />
                <datalist id="quote-customers">
                  {CUSTOMER_POOL.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block text-xs font-medium text-ink-2">
                {t("fieldPart")}
                <input
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className={`${inputClass} mt-1 w-full`}
                />
              </label>
              <label className="block text-xs font-medium text-ink-2">
                {t("fieldQty")}
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className={`${inputClass} mt-1 w-full`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </label>
            </div>
          </Card>

          <Card
            title={t("routingTitle")}
            subtitle={t("routingHint")}
            action={
              <button
                onClick={addLine}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong"
              >
                <Plus className="size-4" />
                {t("addOp")}
              </button>
            }
            padded={false}
          >
            {priced.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">{t("empty")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("colOperation")}</Th>
                    <Th align="right">{t("colHours")}</Th>
                    <Th align="right">{t("colRate")}</Th>
                    <Th align="right">{t("colLineTotal")}</Th>
                    <Th align="right" />
                  </tr>
                </thead>
                <tbody>
                  {priced.map((l) => (
                    <tr key={l.key}>
                      <Td>
                        <select
                          value={l.operationId}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((x) =>
                                x.key === l.key
                                  ? { ...x, operationId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className={`${inputClass} w-full`}
                        >
                          {snap.settings.operations.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td align="right">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={l.hours}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((x) =>
                                x.key === l.key ? { ...x, hours: e.target.value } : x,
                              ),
                            )
                          }
                          className={`${inputClass} w-20 text-right`}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        />
                      </Td>
                      <Td align="right" className="text-ink-2">
                        {money(l.rate)}
                      </Td>
                      <Td align="right" className="font-medium">
                        {money(l.total)}
                      </Td>
                      <Td align="right">
                        <button
                          onClick={() =>
                            setLines((ls) => ls.filter((x) => x.key !== l.key))
                          }
                          className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text"
                          aria-label={t("remove")}
                        >
                          <X className="size-4" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-ink-2">
                {t("materialLabel")}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className={`${inputClass} w-full`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  />
                  <span className="text-xs text-muted">{currency}</span>
                </div>
              </label>
              <label className="block text-xs font-medium text-ink-2">
                {t("marginLabel")}
                <input
                  type="number"
                  min={0}
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className={`${inputClass} mt-1 w-full`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </label>
            </div>
          </Card>

          {/* company logo shown on the printed quote */}
          <BrandLogoUpload />
        </div>

        {/* summary */}
        <Card title={t("summaryTitle")} className="h-fit xl:sticky xl:top-20">
          <dl className="space-y-2.5 text-sm">
            <Row label={t("machineCharge")} value={money(machineCharge)} />
            <Row label={t("material")} value={money(materialCost)} />
            <div className="border-t border-line pt-2.5">
              <Row label={t("subtotal")} value={money(subtotal)} />
            </div>
            <Row label={`${t("margin")} (${marginPct}%)`} value={money(marginAmt)} />
            <div className="border-t border-line pt-3">
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold">{t("total")}</dt>
                <dd className="text-2xl font-semibold tracking-tight text-accent-strong">
                  {money(total)}
                </dd>
              </div>
              <p className="mt-1 text-right text-xs text-muted">
                {t("perPart", { value: money(total / qtyNum, 2) })}
              </p>
            </div>
          </dl>
          {priced.length > 0 && (
            <p className="mt-4 rounded-lg bg-good-soft px-3 py-2 text-xs text-good-text">
              {t("estMarginNote", { pct: grossMarginPct })}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={priced.length === 0 || customer.trim() === ""}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="size-4" />
              {t("saveQuote")}
            </button>
            <button
              onClick={printCurrent}
              disabled={priced.length === 0}
              className="flex items-center justify-center gap-2 rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink-2 hover:bg-neutral-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="size-4" />
              {t("print")}
            </button>
          </div>
          {savedMsg && (
            <p className="mt-2 text-center text-xs text-good-text">{savedMsg}</p>
          )}
        </Card>
      </div>

      {/* saved quotes — searchable by customer */}
      <Card
        title={t("savedTitle")}
        subtitle={t("savedHint")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchCustomer")}
                className="rounded-lg border border-line bg-page py-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <select
              value={custFilter}
              onChange={(e) => setCustFilter(e.target.value)}
              className="rounded-lg border border-line bg-page px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="all">{t("allCustomers")}</option>
              {savedCustomers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-line bg-page px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="all">{t("periodAll")}</option>
              <option value="30">{t("period30")}</option>
              <option value="90">{t("period90")}</option>
              <option value="365">{t("period365")}</option>
            </select>
          </div>
        }
        padded={false}
      >
        {savedFiltered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t("noSaved")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colDate")}</Th>
                <Th>{t("colCustomer")}</Th>
                <Th>{t("colOps")}</Th>
                <Th align="right">{t("colQty")}</Th>
                <Th align="right">{t("colTotal")}</Th>
                <Th align="right" />
              </tr>
            </thead>
            <tbody>
              {savedFiltered.map((q) => (
                <tr key={q.id} className="hover:bg-neutral-soft/50">
                  <Td className="text-ink-2">{formatShortDate(q.at, locale)}</Td>
                  <Td>
                    <span className="font-medium">{q.customer}</span>
                    {q.part && <p className="text-xs text-muted">{q.part}</p>}
                  </Td>
                  <Td className="text-xs text-ink-2">
                    {q.lines.map((l) => opName(l.operationId)).join(" · ")}
                  </Td>
                  <Td align="right" className="text-ink-2">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{q.qty ?? "—"}</span>
                  </Td>
                  <Td align="right" className="font-medium">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCost(q.total, q.currency, locale, 0)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          openPrint({
                            customer: q.customer,
                            part: q.part,
                            qty: q.qty,
                            date: q.at.slice(0, 10),
                            lines: q.lines.map((l) => {
                              const rate = operationBillingRate(l.operationId, rates);
                              return { op: opName(l.operationId), hours: l.hours, rate, total: rate * l.hours };
                            }),
                            laborTotal: q.laborTotal,
                            material: q.materialCost,
                            marginPct: q.marginPct,
                            total: q.total,
                            perPart: q.perPart,
                          })
                        }
                        className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-accent-strong"
                        aria-label={t("print")}
                      >
                        <Printer className="size-4" />
                      </button>
                      <button
                        onClick={() => dispatch({ type: "deleteQuote", id: q.id })}
                        className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text"
                        aria-label={t("remove")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </dd>
    </div>
  );
}
