"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cookie } from "lucide-react";

const CONSENT_COOKIE = "turi_consent";

function hasConsent() {
  if (typeof document === "undefined") return true;
  return document.cookie.split("; ").some((c) => c.startsWith(`${CONSENT_COOKIE}=`));
}

function setConsent(value: "all" | "essential") {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * GDPR cookie banner. Currently the product sets only strictly necessary
 * cookies, so both choices simply record consent; any future non-essential
 * script should gate on `turi_consent=all`. Decline is as easy as accept.
 */
export default function CookieConsent() {
  const t = useTranslations("cookie");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasConsent()) setShow(true);
  }, []);

  if (!show) return null;

  const choose = (v: "all" | "essential") => {
    setConsent(v);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
          <Cookie className="size-5" />
        </span>
        <p className="flex-1 text-xs leading-relaxed text-ink-2">
          {t("message")}{" "}
          <Link href="/legal/cookies" className="font-medium text-accent-strong hover:underline">
            {t("policy")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("essential")}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
          >
            {t("essential")}
          </button>
          <button
            onClick={() => choose("all")}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
