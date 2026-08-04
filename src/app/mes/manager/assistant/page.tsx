"use client";

import { useTranslations } from "next-intl";
import PlantAssistant from "@/components/mes/PlantAssistant";
import PlanUpsell from "@/components/mes/PlanUpsell";
import { useEntitlements } from "@/components/demo/DemoProvider";

export default function ManagerAssistantPage() {
  const t = useTranslations("mes.assistant");
  const ent = useEntitlements();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>
      {ent.aiAssistant ? <PlantAssistant scope="ops" /> : <PlanUpsell feature="assistant" />}
    </div>
  );
}
