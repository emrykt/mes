"use client";

import TuriLogo from "@/components/TuriLogo";
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
    <div>
      <TuriLogo className="h-7 w-7" wordClass="text-ink" />
      <p className="mt-1 text-[11px] text-muted">{t("title")}</p>
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
