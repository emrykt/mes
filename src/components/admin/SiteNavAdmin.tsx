"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import type { NavMenu } from "@/lib/demo-types";

const inputCls =
  "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

function clone(menus: NavMenu[]): NavMenu[] {
  return menus.map((m) => ({ ...m, items: m.items.map((it) => ({ ...it })) }));
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Editor() {
  const { snap, dispatch } = useDemo();
  const [menus, setMenus] = useState<NavMenu[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // seed the local draft from the store once it arrives
  useEffect(() => {
    if (menus === null && snap?.siteNav?.menus) setMenus(clone(snap.siteNav.menus));
  }, [snap, menus]);

  if (!snap || menus === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const setMenu = (mi: number, patch: Partial<NavMenu>) =>
    setMenus((ms) => ms!.map((m, i) => (i === mi ? { ...m, ...patch } : m)));

  const setItem = (mi: number, ii: number, patch: Partial<NavMenu["items"][number]>) =>
    setMenus((ms) =>
      ms!.map((m, i) =>
        i === mi ? { ...m, items: m.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : m,
      ),
    );

  const addItem = (mi: number) =>
    setMenus((ms) =>
      ms!.map((m, i) => (i === mi ? { ...m, items: [...m.items, { title: "New item", description: "", href: "#" }] } : m)),
    );

  const removeItem = (mi: number, ii: number) =>
    setMenus((ms) => ms!.map((m, i) => (i === mi ? { ...m, items: m.items.filter((_, j) => j !== ii) } : m)));

  const moveItem = (mi: number, ii: number, dir: -1 | 1) =>
    setMenus((ms) => ms!.map((m, i) => (i === mi ? { ...m, items: move(m.items, ii, dir) } : m)));

  const addMenu = () =>
    setMenus((ms) => [
      ...ms!,
      { id: `menu-${Date.now()}`, label: "New menu", headline: "", intro: "", ctaLabel: "", ctaHref: "", items: [] },
    ]);

  const removeMenu = (mi: number) => setMenus((ms) => ms!.filter((_, i) => i !== mi));
  const moveMenu = (mi: number, dir: -1 | 1) => setMenus((ms) => move(ms!, mi, dir));

  const save = async () => {
    setBusy(true);
    await dispatch({ type: "saveSiteNav", siteNav: { menus: menus! } });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const revert = () => setMenus(clone(snap.siteNav.menus));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          <Save className="size-4" />
          Save & publish
        </button>
        <button
          onClick={revert}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft"
        >
          <RotateCcw className="size-4 text-muted" />
          Revert
        </button>
        <button
          onClick={addMenu}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft"
        >
          <Plus className="size-4 text-muted" />
          Add menu
        </button>
        {saved && <span className="text-sm text-good-text">Published — live on the homepage</span>}
      </div>

      {menus.map((m, mi) => (
        <Card key={m.id}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-40 text-xs font-medium text-ink-2">
              Menu label
              <input value={m.label} onChange={(e) => setMenu(mi, { label: e.target.value })} className={`${inputCls} mt-1`} />
            </label>
            <div className="flex gap-1">
              <button onClick={() => moveMenu(mi, -1)} disabled={mi === 0} className="rounded-lg border border-line p-2 hover:bg-neutral-soft disabled:opacity-40" aria-label="Move up">
                <ArrowUp className="size-4" />
              </button>
              <button onClick={() => moveMenu(mi, 1)} disabled={mi === menus.length - 1} className="rounded-lg border border-line p-2 hover:bg-neutral-soft disabled:opacity-40" aria-label="Move down">
                <ArrowDown className="size-4" />
              </button>
              <button onClick={() => removeMenu(mi)} className="rounded-lg border border-line p-2 text-critical-text hover:bg-critical-soft" aria-label="Delete menu">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink-2">
              Panel headline
              <input value={m.headline ?? ""} onChange={(e) => setMenu(mi, { headline: e.target.value })} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-xs font-medium text-ink-2">
              Intro text
              <input value={m.intro ?? ""} onChange={(e) => setMenu(mi, { intro: e.target.value })} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-xs font-medium text-ink-2">
              CTA label
              <input value={m.ctaLabel ?? ""} onChange={(e) => setMenu(mi, { ctaLabel: e.target.value })} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-xs font-medium text-ink-2">
              CTA link
              <input value={m.ctaHref ?? ""} onChange={(e) => setMenu(mi, { ctaHref: e.target.value })} className={`${inputCls} mt-1`} placeholder="/portal or #pricing" />
            </label>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-2">Links ({m.items.length})</p>
              <button onClick={() => addItem(mi)} className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline">
                <Plus className="size-3.5" /> Add link
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {m.items.map((it, ii) => (
                <div key={ii} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_1.4fr_0.8fr_auto]">
                  <input value={it.title} onChange={(e) => setItem(mi, ii, { title: e.target.value })} className={inputCls} placeholder="Title" />
                  <input value={it.description ?? ""} onChange={(e) => setItem(mi, ii, { description: e.target.value })} className={inputCls} placeholder="Description" />
                  <input value={it.href ?? ""} onChange={(e) => setItem(mi, ii, { href: e.target.value })} className={inputCls} placeholder="Link" />
                  <div className="flex gap-1">
                    <button onClick={() => moveItem(mi, ii, -1)} disabled={ii === 0} className="rounded-lg border border-line p-1.5 hover:bg-neutral-soft disabled:opacity-40" aria-label="Move up">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button onClick={() => moveItem(mi, ii, 1)} disabled={ii === m.items.length - 1} className="rounded-lg border border-line p-1.5 hover:bg-neutral-soft disabled:opacity-40" aria-label="Move down">
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button onClick={() => removeItem(mi, ii)} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft" aria-label="Delete link">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {m.items.length === 0 && <p className="text-xs text-muted">No links yet — add one.</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function SiteNavAdmin() {
  return (
    <DemoProvider>
      <Editor />
    </DemoProvider>
  );
}
