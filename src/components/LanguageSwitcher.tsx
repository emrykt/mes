"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

// Language names stay in their own language (standard practice).
const LOCALES = [
  ["en", "English"],
  ["de", "Deutsch"],
] as const;

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();

  function setLocale(l: string) {
    document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label
      className={`inline-flex items-center gap-1.5 ${
        dark ? "text-chrome-ink" : "text-ink-2"
      }`}
    >
      <Globe className="size-4" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label="Language"
        className={`rounded-lg border px-2 py-1.5 text-xs font-medium focus:border-accent focus:outline-none ${
          dark
            ? "border-white/15 bg-chrome-2 text-white"
            : "border-line bg-surface text-ink"
        }`}
      >
        {LOCALES.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
