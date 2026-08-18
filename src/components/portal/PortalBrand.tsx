"use client";

import { Factory } from "lucide-react";
import { useTranslations } from "next-intl";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";

/** Portal sidebar brand — shows the tenant's uploaded logo, or the product
 *  wordmark when none is set. Wrapped in its own DemoProvider so it can read
 *  the live company logo independently of the page body. */
function BrandInner() {
  const tc = useTranslations("common");
  const t = useTranslations("portalNav");
  const { snap } = useDemo();
  const logo = snap?.settings.brandLogo;

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={tc("appName")} className="max-h-10 max-w-[160px] object-contain" />
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
        <Factory className="size-4.5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{tc("appName")}</p>
        <p className="text-[11px] text-muted">{t("title")}</p>
      </div>
    </div>
  );
}

export default function PortalBrand() {
  return (
    <DemoProvider>
      <BrandInner />
    </DemoProvider>
  );
}
