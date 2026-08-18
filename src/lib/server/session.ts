import { cookies } from "next/headers";
import { loadStore } from "./demo-store";
import type { AuthUser } from "../demo-types";

export const SESSION_COOKIE = "prg_session";

/** The signed-in user (full record incl. secrets — server only), or null. */
export async function getSessionUser(now = new Date()): Promise<AuthUser | null> {
  const jar = await cookies();
  const uid = jar.get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  const multi = await loadStore(now);
  return multi.auth?.users.find((u) => u.id === uid) ?? null;
}
