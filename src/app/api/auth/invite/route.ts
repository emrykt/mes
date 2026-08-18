import { NextResponse } from "next/server";
import { loadStore } from "@/lib/server/demo-store";
import { companyProfile } from "@/lib/companies";
import { MODULE_LABELS, TENANT_ROLE_LABELS } from "@/lib/auth";
import type { AppModule } from "@/lib/demo-types";

export const dynamic = "force-dynamic";

/** Public: describe a pending invite so the /join page can render it. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "missing" }, { status: 400 });

  const multi = await loadStore(new Date());
  const u = multi.auth?.users.find((x) => x.inviteToken === token && x.status === "invited");
  if (!u) return NextResponse.json({ error: "invalid" }, { status: 404 });

  const company = u.tenantId ? companyProfile(u.tenantId) : null;
  return NextResponse.json({
    email: u.email,
    name: u.name,
    company: company?.name ?? "",
    role: u.tenantRole ? TENANT_ROLE_LABELS[u.tenantRole] : "",
    invitedByName: u.invitedByName ?? "",
    modules: (u.modules ?? []).map((m: AppModule) => MODULE_LABELS[m]),
  });
}
