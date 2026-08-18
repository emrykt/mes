"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

const MAX_BYTES = 400 * 1024;

/**
 * Company-logo uploader. Reads the picked image into a data: URL and stores it
 * on the active company (settings.brandLogo) via the demo store, so the same
 * logo appears on printed quotes and in the portal. Must be rendered inside a
 * DemoProvider.
 */
export default function BrandLogoUpload({ card = true }: { card?: boolean }) {
  const t = useTranslations("branding");
  const { snap, dispatch } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logo = snap?.settings.brandLogo;

  const pick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("invalid"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url) return;
      setBusy(true);
      await dispatch({ type: "setBrandLogo", logo: url });
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  const remove = async () => {
    setBusy(true);
    await dispatch({ type: "setBrandLogo", logo: "" });
    setBusy(false);
  };

  const body = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg border border-line bg-page">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted">{t("none")}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={pick}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            <ImagePlus className="size-4" />
            {logo ? t("replace") : t("upload")}
          </button>
          {logo && (
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-neutral-soft disabled:opacity-60"
            >
              <Trash2 className="size-4 text-muted" />
              {t("remove")}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-critical-text">{error}</p>
        ) : (
          <p className="max-w-sm text-xs text-muted">{t("hint")}</p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );

  if (!card) return body;
  return <Card title={t("title")}>{body}</Card>;
}
