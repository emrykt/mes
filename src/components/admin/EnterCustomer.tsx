"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { Card } from "@/components/ui";
import { COMPANY_LIST } from "@/lib/companies";

/**
 * Platform reach: enter any customer's live workspace to inspect or intervene.
 * Sets the active-company cookie the MES screens read, then opens /mes.
 */
export default function EnterCustomer() {
  const router = useRouter();

  const enter = (id: string) => {
    document.cookie = `mes_company=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    router.push("/mes");
  };

  return (
    <Card
      title="Customer environments"
      subtitle="Enter any customer's live workspace to inspect or intervene on their behalf."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {COMPANY_LIST.map((c) => (
          <button
            key={c.id}
            onClick={() => enter(c.id)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-left transition hover:border-accent hover:bg-accent-soft/40"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <Building2 className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{c.sector}</span>
              </span>
            </span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </Card>
  );
}
