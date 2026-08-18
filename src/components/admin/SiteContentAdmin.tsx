"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";
import { NAV_ICON_NAMES } from "@/lib/nav-icons";
import { DEFAULT_SITE_CONTENT } from "@/lib/data";
import type { SiteContent } from "@/lib/demo-types";

/** Fill any missing top-level section from the bundled default (older stores). */
function withDefaults(sc: SiteContent): SiteContent {
  const d = DEFAULT_SITE_CONTENT;
  return {
    trustBar: sc.trustBar ?? d.trustBar,
    testimonials: sc.testimonials ?? d.testimonials,
    faq: sc.faq ?? d.faq,
    contact: sc.contact ?? d.contact,
    footer: sc.footer ?? d.footer,
  };
}

const inp = "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";
const MAX = 400 * 1024;

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-2">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inp} mt-1`} />
    </label>
  );
}

function readImage(file: File | undefined, ok: (url: string) => void, fail: (msg: string) => void) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return fail("Please choose an image file.");
  if (file.size > MAX) return fail("File too large (max 400 KB).");
  const r = new FileReader();
  r.onload = () => typeof r.result === "string" && ok(r.result);
  r.readAsDataURL(file);
}

function LogoUpload({ url, onChange }: { url?: string; onChange: (u: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:bg-neutral-soft">
        <Upload className="size-3.5" /> {url ? "Change" : "Image"}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { readImage(e.target.files?.[0], onChange, () => {}); e.target.value = ""; }} />
    </>
  );
}

function Editor() {
  const { snap, dispatch } = useDemo();
  const [c, setC] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (c === null && snap?.siteContent) setC(withDefaults(structuredClone(snap.siteContent)));
  }, [snap, c]);

  if (!snap || c === null) return <p className="text-sm text-muted">Loading…</p>;

  const patch = (fn: (d: SiteContent) => void) => setC((cur) => { const n = structuredClone(cur!); fn(n); return n; });

  const save = async () => {
    setBusy(true);
    await dispatch({ type: "saveSiteContent", siteContent: c });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60">
          <Save className="size-4" /> Save & publish
        </button>
        <button onClick={() => setC(withDefaults(structuredClone(snap.siteContent)))} className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft">Revert</button>
        {saved && <span className="text-sm text-good-text">Published — live on the homepage</span>}
      </div>

      {/* TRUST BAR */}
      <Card title="Trust bar" subtitle="Stats, customer logos and compliance badges under the hero.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.trustBar.enabled} onChange={(e) => patch((d) => { d.trustBar.enabled = e.target.checked; })} />
          Show trust bar
        </label>
        <div className="mt-3"><Field label="Logos title" value={c.trustBar.logosTitle ?? ""} onChange={(v) => patch((d) => { d.trustBar.logosTitle = v; })} /></div>

        <p className="mt-4 text-xs font-semibold text-ink-2">Stats</p>
        <div className="mt-1.5 space-y-2">
          {c.trustBar.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input value={s.value} onChange={(e) => patch((d) => { d.trustBar.stats[i].value = e.target.value; })} className={inp} placeholder="23%" />
              <input value={s.label} onChange={(e) => patch((d) => { d.trustBar.stats[i].label = e.target.value; })} className={inp} placeholder="less downtime" />
              <button onClick={() => patch((d) => { d.trustBar.stats.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <button onClick={() => patch((d) => { d.trustBar.stats.push({ value: "", label: "" }); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add stat</button>
        </div>

        <p className="mt-4 text-xs font-semibold text-ink-2">Customer logos</p>
        <div className="mt-1.5 space-y-2">
          {c.trustBar.logos.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={l.name} onChange={(e) => patch((d) => { d.trustBar.logos[i].name = e.target.value; })} className={inp} placeholder="Company name" />
              {l.image && <img src={l.image} alt="" className="h-6 max-w-20 object-contain" />}
              <LogoUpload url={l.image} onChange={(u) => patch((d) => { d.trustBar.logos[i].image = u; })} />
              <button onClick={() => patch((d) => { d.trustBar.logos.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <button onClick={() => patch((d) => { d.trustBar.logos.push({ name: "New company" }); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add logo</button>
        </div>

        <p className="mt-4 text-xs font-semibold text-ink-2">Compliance badges</p>
        <div className="mt-1.5 space-y-2">
          {c.trustBar.badges.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input value={b} onChange={(e) => patch((d) => { d.trustBar.badges[i] = e.target.value; })} className={inp} placeholder="ISO 27001" />
              <button onClick={() => patch((d) => { d.trustBar.badges.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <button onClick={() => patch((d) => { d.trustBar.badges.push(""); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add badge</button>
        </div>
      </Card>

      {/* TESTIMONIALS */}
      <Card title="Testimonials" subtitle="Customer quotes.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.testimonials.enabled} onChange={(e) => patch((d) => { d.testimonials.enabled = e.target.checked; })} />
          Show testimonials
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Headline" value={c.testimonials.headline ?? ""} onChange={(v) => patch((d) => { d.testimonials.headline = v; })} />
          <Field label="Intro" value={c.testimonials.intro ?? ""} onChange={(v) => patch((d) => { d.testimonials.intro = v; })} />
        </div>
        <div className="mt-3 space-y-2">
          {c.testimonials.items.map((it, i) => (
            <div key={i} className="rounded-lg border border-line p-2.5">
              <textarea value={it.quote} onChange={(e) => patch((d) => { d.testimonials.items[i].quote = e.target.value; })} rows={2} className={`${inp} resize-none`} placeholder="Quote" />
              <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input value={it.name} onChange={(e) => patch((d) => { d.testimonials.items[i].name = e.target.value; })} className={inp} placeholder="Name" />
                <input value={it.role ?? ""} onChange={(e) => patch((d) => { d.testimonials.items[i].role = e.target.value; })} className={inp} placeholder="Role" />
                <input value={it.company ?? ""} onChange={(e) => patch((d) => { d.testimonials.items[i].company = e.target.value; })} className={inp} placeholder="Company" />
                <button onClick={() => patch((d) => { d.testimonials.items.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => patch((d) => { d.testimonials.items.push({ quote: "", name: "", role: "", company: "" }); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add testimonial</button>
        </div>
      </Card>

      {/* FAQ */}
      <Card title="FAQ" subtitle="Questions and answers.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.faq.enabled} onChange={(e) => patch((d) => { d.faq.enabled = e.target.checked; })} />
          Show FAQ
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Headline" value={c.faq.headline ?? ""} onChange={(v) => patch((d) => { d.faq.headline = v; })} />
          <Field label="Intro" value={c.faq.intro ?? ""} onChange={(v) => patch((d) => { d.faq.intro = v; })} />
        </div>
        <div className="mt-3 space-y-2">
          {c.faq.items.map((it, i) => (
            <div key={i} className="rounded-lg border border-line p-2.5">
              <div className="flex gap-2">
                <input value={it.question} onChange={(e) => patch((d) => { d.faq.items[i].question = e.target.value; })} className={inp} placeholder="Question" />
                <button onClick={() => patch((d) => { d.faq.items.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
              </div>
              <textarea value={it.answer} onChange={(e) => patch((d) => { d.faq.items[i].answer = e.target.value; })} rows={2} className={`${inp} mt-2 resize-none`} placeholder="Answer" />
            </div>
          ))}
          <button onClick={() => patch((d) => { d.faq.items.push({ question: "", answer: "" }); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add question</button>
        </div>
      </Card>

      {/* CONTACT */}
      <Card title="Contact / demo request" subtitle="Headline, intro and button text for the demo-request form.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.contact.enabled} onChange={(e) => patch((d) => { d.contact.enabled = e.target.checked; })} />
          Show contact form
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Headline" value={c.contact.headline ?? ""} onChange={(v) => patch((d) => { d.contact.headline = v; })} />
          <Field label="Submit button label" value={c.contact.submitLabel ?? ""} onChange={(v) => patch((d) => { d.contact.submitLabel = v; })} />
        </div>
        <div className="mt-2"><Field label="Intro" value={c.contact.intro ?? ""} onChange={(v) => patch((d) => { d.contact.intro = v; })} /></div>
        <div className="mt-2"><Field label="Success message" value={c.contact.successMessage ?? ""} onChange={(v) => patch((d) => { d.contact.successMessage = v; })} /></div>
      </Card>

      {/* FOOTER */}
      <Card title="Footer" subtitle="Tagline, columns, socials and legal line.">
        <Field label="Tagline" value={c.footer.tagline ?? ""} onChange={(v) => patch((d) => { d.footer.tagline = v; })} />
        <div className="mt-2"><Field label="Legal line" value={c.footer.legal ?? ""} onChange={(v) => patch((d) => { d.footer.legal = v; })} /></div>

        <p className="mt-4 text-xs font-semibold text-ink-2">Columns</p>
        <div className="mt-1.5 grid gap-3 md:grid-cols-2">
          {c.footer.columns.map((col, ci) => (
            <div key={ci} className="rounded-lg border border-line p-2.5">
              <div className="flex gap-2">
                <input value={col.title} onChange={(e) => patch((d) => { d.footer.columns[ci].title = e.target.value; })} className={`${inp} font-medium`} placeholder="Column title" />
                <button onClick={() => patch((d) => { d.footer.columns.splice(ci, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
              </div>
              <div className="mt-2 space-y-1.5">
                {col.links.map((l, li) => (
                  <div key={li} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                    <input value={l.title} onChange={(e) => patch((d) => { d.footer.columns[ci].links[li].title = e.target.value; })} className={inp} placeholder="Label" />
                    <input value={l.href ?? ""} onChange={(e) => patch((d) => { d.footer.columns[ci].links[li].href = e.target.value; })} className={inp} placeholder="Link" />
                    <button onClick={() => patch((d) => { d.footer.columns[ci].links.splice(li, 1); })} className="rounded-lg border border-line p-1 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3" /></button>
                  </div>
                ))}
                <button onClick={() => patch((d) => { d.footer.columns[ci].links.push({ title: "", href: "#" }); })} className="text-xs font-medium text-accent-strong hover:underline">+ Add link</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => patch((d) => { d.footer.columns.push({ title: "New column", links: [] }); })} className="mt-2 text-sm font-medium text-accent-strong hover:underline">+ Add column</button>

        <p className="mt-4 text-xs font-semibold text-ink-2">Social links</p>
        <div className="mt-1.5 space-y-2">
          {c.footer.socials.map((s, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2">
              <select value={s.icon} onChange={(e) => patch((d) => { d.footer.socials[i].icon = e.target.value; })} className={inp}>
                {NAV_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input value={s.label} onChange={(e) => patch((d) => { d.footer.socials[i].label = e.target.value; })} className={inp} placeholder="Label" />
              <input value={s.href ?? ""} onChange={(e) => patch((d) => { d.footer.socials[i].href = e.target.value; })} className={inp} placeholder="Link" />
              <button onClick={() => patch((d) => { d.footer.socials.splice(i, 1); })} className="rounded-lg border border-line p-1.5 text-critical-text hover:bg-critical-soft"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <button onClick={() => patch((d) => { d.footer.socials.push({ icon: "globe", label: "", href: "#" }); })} className="text-sm font-medium text-accent-strong hover:underline">+ Add social</button>
        </div>
      </Card>
    </div>
  );
}

export default function SiteContentAdmin() {
  return (
    <DemoProvider>
      <Editor />
    </DemoProvider>
  );
}
