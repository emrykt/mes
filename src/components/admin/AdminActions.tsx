"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BadgePercent,
  CalendarPlus,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Repeat,
} from "lucide-react";
import type { LicenseStatus } from "@/lib/types";

export default function AdminActions({ status }: { status: LicenseStatus }) {
  const t = useTranslations("adminCustomerDetail");
  const tc = useTranslations("common");
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [recorded, setRecorded] = useState<string | null>(null);

  const actions = [
    { key: t("extendTrial"), icon: CalendarPlus, show: status === "TRIALING" },
    { key: t("changePlan"), icon: Repeat, show: status !== "CANCELED" },
    {
      key: status === "SUSPENDED" ? t("unsuspend") : t("suspend"),
      icon: status === "SUSPENDED" ? PlayCircle : PauseCircle,
      show: status !== "CANCELED",
    },
    { key: t("compLicense"), icon: BadgePercent, show: true },
  ].filter((a) => a.show);

  function confirm() {
    setRecorded(pending);
    setPending(null);
    setReason("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setPending(key);
              setRecorded(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-neutral-soft"
          >
            <Icon className="size-4 text-ink-2" />
            {key}
          </button>
        ))}
      </div>

      {recorded && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-good-soft px-3 py-1.5 text-sm text-good-text">
          <CheckCircle2 className="size-4" />
          {t("actionRecorded", { action: recorded })}
        </p>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{pending}</h3>
            <label className="mt-4 block text-xs font-medium text-ink-2">
              {t("reasonLabel")}
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm font-normal text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-neutral-soft"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={confirm}
                disabled={reason.trim().length === 0}
                className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}