import { NextResponse } from "next/server";
import { DEFAULT_SITE_CONTENT, DEFAULT_SITE_NAV } from "@/lib/data";
import { loadStore } from "@/lib/server/demo-store";

export const dynamic = "force-dynamic";

/**
 * Public, lightweight read of the admin-managed landing config (nav + content
 * sections). Does NOT advance the simulation — the marketing homepage should
 * never tick the plant just by rendering.
 */
export async function GET() {
  try {
    const multi = await loadStore(new Date());
    return NextResponse.json({
      nav: multi.siteNav ?? DEFAULT_SITE_NAV,
      content: multi.siteContent ?? DEFAULT_SITE_CONTENT,
    });
  } catch {
    return NextResponse.json({ nav: DEFAULT_SITE_NAV, content: DEFAULT_SITE_CONTENT });
  }
}
