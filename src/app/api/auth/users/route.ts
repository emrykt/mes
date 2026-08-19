import { NextResponse } from "next/server";
import { loadStore, persist } from "@/lib/server/demo-store";
import { getSessionUser } from "@/lib/server/session";
import { canManagePlatform, canManageTenant, defaultModules, sanitizeUser } from "@/lib/auth";
import { hashPassword } from "@/lib/server/password";
import { sendInviteEmail } from "@/lib/server/mailer";
import { companyProfile } from "@/lib/companies";
import type { AppModule, AuthUser, PlatformRole, TenantRole } from "@/lib/demo-types";

export const dynamic = "force-dynamic";

/** List users visible to the caller. */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const multi = await loadStore(new Date());
  const all = multi.auth?.users ?? [];

  let visible: AuthUser[];
  if (me.kind === "platform") visible = all;
  else if (canManageTenant(me)) visible = all.filter((u) => u.tenantId === me.tenantId);
  else return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // managers may see the invite token of still-pending members (to copy the link)
  return NextResponse.json({
    users: visible.map((u) => ({
      ...sanitizeUser(u),
      inviteToken: u.status === "invited" ? u.inviteToken : undefined,
    })),
  });
}

/** Create a platform user, or invite a tenant member. */
export async function POST(req: Request) {
  const now = new Date();
  const me = await getSessionUser(now);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    kind?: "platform" | "tenant";
    name?: string;
    username?: string;
    password?: string;
    email?: string;
    platformRole?: PlatformRole;
    tenantRole?: TenantRole;
    tenantId?: string;
    modules?: AppModule[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const multi = await loadStore(now);
  multi.auth ??= { users: [] };
  const users = multi.auth.users;
  const name = String(body.name ?? "").trim();

  if (body.kind === "platform") {
    if (!canManagePlatform(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role: PlatformRole = body.platformRole === "admin" ? "admin" : "sales";
    if (!name || !username || !password) return NextResponse.json({ error: "missing" }, { status: 400 });
    if (users.some((u) => u.username?.toLowerCase() === username || u.email?.toLowerCase() === username))
      return NextResponse.json({ error: "exists" }, { status: 409 });
    const user: AuthUser = {
      id: `pu-${crypto.randomUUID().slice(0, 8)}`,
      kind: "platform",
      name,
      username,
      password: hashPassword(password),
      status: "active",
      createdAt: now.toISOString(),
      platformRole: role,
    };
    users.push(user);
    await persist(multi, true);
    return NextResponse.json({ user: sanitizeUser(user) });
  }

  // tenant invite
  const tenantId = me.kind === "platform" ? String(body.tenantId ?? "") : me.tenantId!;
  if (!tenantId) return NextResponse.json({ error: "missing_tenant" }, { status: 400 });
  if (me.kind !== "platform" && !canManageTenant(me))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = (body.tenantRole ?? "operator") as TenantRole;
  if (!name || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (users.some((u) => u.email?.toLowerCase() === email))
    return NextResponse.json({ error: "exists" }, { status: 409 });

  const token = `inv-${crypto.randomUUID()}`;
  const user: AuthUser = {
    id: `tu-${crypto.randomUUID().slice(0, 8)}`,
    kind: "tenant",
    name,
    email,
    status: "invited",
    createdAt: now.toISOString(),
    tenantId,
    tenantRole: role,
    modules: body.modules?.length ? body.modules : defaultModules(role),
    inviteToken: token,
    invitedByName: me.name,
    invitedAt: now.toISOString(),
  };
  users.push(user);
  await persist(multi, true);

  // email the invite link when SES is configured (falls back to the UI link)
  const origin =
    process.env.APP_URL || req.headers.get("origin") || new URL(req.url).origin;
  const joinUrl = `${origin}/join?token=${token}`;
  const emailed = await sendInviteEmail({
    to: email,
    name,
    inviterName: me.name,
    companyName: companyProfile(tenantId)?.name,
    joinUrl,
  });

  return NextResponse.json({ user: sanitizeUser(user), inviteToken: token, emailed });
}
