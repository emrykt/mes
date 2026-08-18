import { NextResponse } from "next/server";
import { loadStore, persist } from "@/lib/server/demo-store";
import { SESSION_COOKIE } from "@/lib/server/session";
import { sanitizeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const now = new Date();
  let body: { identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const id = String(body.identifier ?? "").trim().toLowerCase();
  const pw = String(body.password ?? "");
  if (!id || !pw) return NextResponse.json({ error: "missing" }, { status: 400 });

  const multi = await loadStore(now);
  const user = multi.auth?.users.find(
    (u) =>
      u.status === "active" &&
      (u.email?.toLowerCase() === id || u.username?.toLowerCase() === id),
  );
  if (!user || user.password !== pw) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  user.lastLoginAt = now.toISOString();
  await persist(multi, true);

  const res = NextResponse.json({ user: sanitizeUser(user) });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  // tie a tenant member to their own company for the MES screens
  if (user.kind === "tenant" && user.tenantId) {
    res.cookies.set("mes_company", user.tenantId, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
