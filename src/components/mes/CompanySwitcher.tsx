"use client";

import { Building2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { COMPANY_LIST } from "@/lib/companies";

/**
 * Global company (tenant) switcher. Changing it makes every /mes screen show
 * the selected company's live plant; the choice is remembered (cookie) via
 * DemoProvider. Options come from the static company list so it renders before
 * the first snapshot arrives.
 */
export default function CompanySwitcher({ dark = false }: { dark?: boolean }) {
  const { company, setCompany } = useDemo();
  return (
    <label
      className={`inline-flex items-center gap-1.5 ${dark ? "text-chrome-ink" : "text-ink-2"}`}
    >
      <Building2 className="size-4 shrink-0" />
      <select
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        aria-label="Şirket"
        className={`max-w-[10.5rem] truncate rounded-lg border px-2 py-1.5 text-xs font-medium focus:border-accent focus:outline-none ${
          dark ? "border-white/15 bg-chrome-2 text-white" : "border-line bg-surface text-ink"
        }`}
      >
        {COMPANY_LIST.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
