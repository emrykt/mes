import { NextResponse } from "next/server";
import { createTenant, loadStore, persist } from "@/lib/server/demo-store";
import { SESSION_COOKIE } from "@/lib/server/session";
import { sanitizeUser } from "@/lib/auth";
import type { BillingPeriod, CurrencyCode } from "@/lib/demo-types";
import type { PlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

const PLANS: PlanId[] = ["BASIC", "AIPRO", "AIULTIMATE"];
const PERIODS: BillingPeriod[] = ["monthly", "annual"];

export async function POST(req: Request) {
  const now = new Date();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const plan = String(body.plan ?? "") as PlanId;
  const period = String(body.period ?? "") as BillingPeriod;
  if (!PLANS.includes(plan) || !PERIODS.includes(period)) {
    return NextResponse.json({ error: "bad_plan" }, { status: 400 });
  }

  const multi = await loadStore(now);
  const result = createTenant(
    multi,
    {
      company: String(body.company ?? ""),
      sector: body.sector ? String(body.sector) : undefined,
      currency: body.currency ? (String(body.currency) as CurrencyCode) : undefined,
      plan,
      period,
      ownerName: String(body.ownerName ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      referralCode: body.referralCode ? String(body.referralCode) : undefined,
    },
    now,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "failed" }, { status: 400 });
  }
  await persist(multi, true);

  const user = multi.auth?.users.find((u) => u.id === result.userId);
  const res = NextResponse.json({
    ok: true,
    user: user ? sanitizeUser(user) : null,
    tenantId: result.tenantId,
    trial: result.trial,
    referralApplied: result.referralApplied,
    referralCode: result.referralCode,
  });
  if (result.userId) {
    res.cookies.set(SESSION_COOKIE, result.userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  if (result.tenantId) {
    res.cookies.set("mes_company", result.tenantId, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
