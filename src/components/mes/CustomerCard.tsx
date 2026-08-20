"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Mail, Phone, Check } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

const inp =
  "w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

/** Customer cards — add and browse customer records from Sales. */
export default function CustomerCard() {
  const t = useTranslations("mes.customers");
  const { snap, dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", contact: "", email: "", phone: "", notes: "" });
  const [added, setAdded] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const customers = snap?.customers ?? [];

  const submit = async () => {
    if (!f.name.trim()) return;
    await dispatch({
      type: "addCustomer",
      customer: {
        name: f.name.trim(),
        contact: f.contact.trim() || undefined,
        email: f.email.trim() || undefined,
        phone: f.phone.trim() || undefined,
        notes: f.notes.trim() || undefined,
      },
    });
    setF({ name: "", contact: "", email: "", phone: "", notes: "" });
    setOpen(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <Card
      title={t("title")}
      subtitle={t("subtitle", { count: customers.length })}
      action={
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong"
        >
          <UserPlus className="size-4" />
          {t("add")}
        </button>
      }
    >
      {open && (
        <div className="mb-4 rounded-xl border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink-2">
              {t("fName")}
              <input value={f.name} onChange={set("name")} className={`${inp} mt-1`} placeholder="Company name" />
            </label>
            <label className="text-xs font-medium text-ink-2">
              {t("fContact")}
              <input value={f.contact} onChange={set("contact")} className={`${inp} mt-1`} placeholder="Contact person" />
            </label>
            <label className="text-xs font-medium text-ink-2">
              {t("fEmail")}
              <input value={f.email} onChange={set("email")} className={`${inp} mt-1`} placeholder="you@company.com" />
            </label>
            <label className="text-xs font-medium text-ink-2">
              {t("fPhone")}
              <input value={f.phone} onChange={set("phone")} className={`${inp} mt-1`} />
            </label>
            <label className="text-xs font-medium text-ink-2 sm:col-span-2">
              {t("fNotes")}
              <input value={f.notes} onChange={set("notes")} className={`${inp} mt-1`} />
            </label>
          </div>
          <button
            onClick={submit}
            disabled={!f.name.trim()}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {t("save")}
          </button>
        </div>
      )}
      {added && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-good-text">
          <Check className="size-4" /> {t("added")}
        </p>
      )}
      {customers.length === 0 ? (
        <p className="text-sm text-muted">{t("none")}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {customers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                {c.contact && <p className="text-xs text-muted">{c.contact}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-2">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-accent-strong">
                    <Mail className="size-3.5" /> {c.email}
                  </a>
                )}
                {c.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" /> {c.phone}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
