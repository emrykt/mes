import { NextResponse } from "next/server";
import { loadStore, persist } from "@/lib/server/demo-store";
import { SESSION_COOKIE } from "@/lib/server/session";
import { ALL_MODULES, sanitizeUser } from "@/lib/auth";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";
import type { AuthUser } from "@/lib/demo-types";

export const dynamic = "force-dynamic";

const VIEWER_ID = "tu-demo-viewer";

/** One-click view-only product tour: signs in the demo viewer (read-only,
 *  all modules). Ensures the account exists (older stores may predate it). */
export async function POST() {
  const now = new Date();
  const multi = await loadStore(now);
  multi.auth ??= { users: [] };

  let viewer = multi.auth.users.find((u) => u.id === VIEWER_ID);
  if (!viewer) {
    viewer = {
      id: VIEWER_ID,
      kind: "tenant",
      name: "Demo Viewer",
      email: "demo@prodgence.com",
      password: "demo",
      status: "active",
      createdAt: now.toISOString(),
      readOnly: true,
      tenantId: DEFAULT_COMPANY_ID,
      tenantRole: "executive",
      modules: [...ALL_MODULES],
    } as AuthUser;
    multi.auth.users.push(viewer);
  }
  viewer.lastLoginAt = now.toISOString();
  await persist(multi, true);

  const res = NextResponse.json({ user: sanitizeUser(viewer) });
  res.cookies.set(SESSION_COOKIE, viewer.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  res.cookies.set("mes_company", viewer.tenantId ?? DEFAULT_COMPANY_ID, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
