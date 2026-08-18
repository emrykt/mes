import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { sanitizeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user: user ? sanitizeUser(user) : null });
}
