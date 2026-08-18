import { NextResponse } from "next/server";
import { DEFAULT_SITE_NAV } from "@/lib/data";
import { loadStore } from "@/lib/server/demo-store";

export const dynamic = "force-dynamic";

/**
 * Public, lightweight read of the admin-managed landing navigation. Unlike
 * /api/demo it does NOT advance the simulation — the marketing homepage should
 * never tick the plant just by rendering its menu.
 */
export async function GET() {
  try {
    const multi = await loadStore(new Date());
    return NextResponse.json(multi.siteNav ?? DEFAULT_SITE_NAV);
  } catch {
    return NextResponse.json(DEFAULT_SITE_NAV);
  }
}
