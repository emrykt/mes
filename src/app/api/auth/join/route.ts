import { NextResponse } from "next/server";
import { loadStore, persist } from "@/lib/server/demo-store";
import { SESSION_COOKIE } from "@/lib/server/session";
import { sanitizeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Accept an invite: set name/password, activate, and sign the member in. */
export async function POST(req: Request) {
  const now = new Date();
  let body: { token?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token || password.length < 6)
    return NextResponse.json({ error: "weak_password" }, { status: 400 });

  const multi = await loadStore(now);
  const u = multi.auth?.users.find((x) => x.inviteToken === token && x.status === "invited");
  if (!u) return NextResponse.json({ error: "invalid" }, { status: 404 });

  if (body.name?.trim()) u.name = body.name.trim();
  u.password = password;
  u.status = "active";
  u.inviteToken = undefined;
  u.lastLoginAt = now.toISOString();
  await persist(multi, true);

  const res = NextResponse.json({ user: sanitizeUser(u) });
  res.cookies.set(SESSION_COOKIE, u.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
