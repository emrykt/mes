import { useTranslations } from "next-intl";
import { Card, Table, Td, Th } from "@/components/ui";
import AdminPlanSelector from "@/components/admin/AdminPlanSelector";
import { PLANS, PLAN_ENTITLEMENTS, PLAN_ORDER } from "@/lib/data";
import { formatMoney } from "@/lib/format";

const NUMBER_SETTINGS = [
  { key: "graceDays", help: "graceHelp", value: 3 },
  { key: "trialDays", help: "trialHelp", value: 30 },
  { key: "retentionDays", help: "retentionHelp", value: 90 },
] as const;

const TEMPLATES = [
  { name: "tplWelcome", trigger: "tplWelcomeTrigger" },
  { name: "tplTrial7", trigger: "tplTrial7Trigger" },
  { name: "tplTrial1", trigger: "tplTrial1Trigger" },
  { name: "tplPaymentFailed", trigger: "tplPaymentFailedTrigger" },
  { name: "tplSuspended", trigger: "tplSuspendedTrigger" },
  { name: "tplReactivated", trigger: "tplReactivatedTrigger" },
] as const;

export default function SettingsPage() {
  const t = useTranslations("adminSettings");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      {/* subscription plan (moved here from MES definitions) */}
      <AdminPlanSelector />

      <Card title={t("planMappingTitle")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colPlan")}</Th>
              <Th>{t("colPrice")}</Th>
              <Th>{t("colTier")}</Th>
              <Th>{t("colPriceId")}</Th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              const ent = PLAN_ENTITLEMENTS[id];
              return (
                <tr key={id}>
                  <Td className="font-medium">{tp(id)}</Td>
                  <Td className="text-ink-2">
                    {p.contact ? tc("contactPrice") : formatMoney(p.monthlyPrice)}
                  </Td>
                  <Td className="text-ink-2">
                    {ent.multiPlant
                      ? t("tierUltimate")
                      : ent.aiAssistant
                        ? t("tierAipro")
                        : t("tierBasic")}
                  </Td>
                  <Td>
                    <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs text-ink-2">
                      {p.stripePriceId}
                    </code>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card title={t("lifecycleTitle")}>
        <div className="grid gap-5 sm:grid-cols-3">
          {NUMBER_SETTINGS.map((s) => (
            <label key={s.key} className="block">
              <span className="text-xs font-medium text-ink-2">{t(s.key)}</span>
              <input
                type="number"
                defaultValue={s.value}
                className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <span className="mt-1.5 block text-xs text-muted">{t(s.help)}</span>
            </label>
          ))}
        </div>
        <button className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong">
          {tc("save")}
        </button>
      </Card>

      <Card title={t("notificationsTitle")} padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>{t("colTemplate")}</Th>
              <Th>{t("colTrigger")}</Th>
              <Th>{t("colLanguages")}</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {TEMPLATES.map((tpl) => (
              <tr key={tpl.name}>
                <Td className="font-medium">{t(tpl.name)}</Td>
                <Td>
                  <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs text-ink-2">
                    {t(tpl.trigger)}
                  </code>
                </Td>
                <Td className="text-ink-2">EN</Td>
                <Td align="right">
                  <button className="text-sm font-medium text-accent-strong hover:underline">
                    {t("edit")}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
