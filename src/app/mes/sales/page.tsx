"use client";

import { useTranslations } from "next-intl";
import OrdersBoard from "@/components/mes/OrdersBoard";
import KpiScorecard from "@/components/mes/KpiScorecard";
import { useEntitlements } from "@/components/demo/DemoProvider";
import { Card } from "@/components/ui";

/** Sales enters orders and tracks them. */
export default function SalesOrdersPage() {
  const t = useTranslations("mes.kpi");
  const ent = useEntitlements();
  return (
    <div className="space-y-5">
      {ent.advancedAnalytics && (
        <Card title={t("salesTargetsTitle")} subtitle={t("salesTargetsHint")}>
          <KpiScorecard sections={["sales"]} showSectionTitles={false} />
        </Card>
      )}
      <OrdersBoard allowCreate />
    </div>
  );
}
