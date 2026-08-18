import { NextResponse } from "next/server";
import { loadStore, persist } from "@/lib/server/demo-store";
import { getSessionUser } from "@/lib/server/session";
import { canManagePlatform, canManageTenant, sanitizeUser } from "@/lib/auth";
import type { AppModule, AuthUser, TenantRole } from "@/lib/demo-types";

export const dynamic = "force-dynamic";

/** Whether `me` may manage `target`. */
function canManage(me: AuthUser, target: AuthUser): boolean {
  if (me.kind === "platform") return canManagePlatform(me);
  // tenant owner/admin may manage members of their own tenant (not the owner)
  return canManageTenant(me) && target.tenantId === me.tenantId && target.tenantRole !== "owner";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const now = new Date();
  const me = await getSessionUser(now);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const multi = await loadStore(now);
  const target = multi.auth?.users.find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canManage(me, target)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { name?: string; tenantRole?: TenantRole; modules?: AppModule[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (typeof body.name === "string" && body.name.trim()) target.name = body.name.trim();
  if (body.tenantRole && target.kind === "tenant" && target.tenantRole !== "owner")
    target.tenantRole = body.tenantRole;
  if (Array.isArray(body.modules) && target.kind === "tenant") target.modules = body.modules;

  await persist(multi, true);
  return NextResponse.json({ user: sanitizeUser(target) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const now = new Date();
  const me = await getSessionUser(now);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: "self" }, { status: 400 });

  const multi = await loadStore(now);
  const target = multi.auth?.users.find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.tenantRole === "owner" || target.platformRole === "owner")
    return NextResponse.json({ error: "cannot_remove_owner" }, { status: 400 });
  if (!canManage(me, target)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  multi.auth!.users = multi.auth!.users.filter((u) => u.id !== id);
  await persist(multi, true);
  return NextResponse.json({ ok: true });
}
