import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "tr", "de"] as const;
export type AppLocale = (typeof LOCALES)[number];

function isAppLocale(v: string | undefined): v is AppLocale {
  return (LOCALES as readonly string[]).includes(v ?? "");
}

/** Best supported match from the Accept-Language header, honoring q-values. */
function detectFromHeader(accept: string | null): AppLocale | undefined {
  if (!accept) return undefined;
  const ranked = accept
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], q };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => isAppLocale(r.lang))?.lang as AppLocale | undefined;
}

// Locale resolution: an explicit cookie (set by the language switcher) always
// wins; otherwise the browser's Accept-Language picks the first visit's
// language; English is the final fallback (spec §2).
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;

  let locale: AppLocale;
  if (isAppLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const accept = (await headers()).get("accept-language");
    locale = detectFromHeader(accept) ?? "en";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
