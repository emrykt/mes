import { NextResponse } from "next/server";
import type { DemoAction } from "@/lib/demo-types";
import { DEFAULT_COMPANY_ID } from "@/lib/companies";
import {
  advanceMulti,
  applyActionMulti,
  loadStore,
  persist,
  snapshotFor,
} from "@/lib/server/demo-store";

export const dynamic = "force-dynamic";

function companyOf(url: string): string {
  return new URL(url).searchParams.get("company") || DEFAULT_COMPANY_ID;
}

export async function GET(req: Request) {
  const now = new Date();
  const company = companyOf(req.url);
  const multi = await loadStore(now);
  const changed = advanceMulti(multi, now);
  if (changed) await persist(multi);
  return NextResponse.json(snapshotFor(multi, company, now));
}

export async function POST(req: Request) {
  const now = new Date();
  const company = companyOf(req.url);
  const multi = await loadStore(now);
  advanceMulti(multi, now);
  const action = (await req.json()) as DemoAction;
  applyActionMulti(multi, company, action, now);
  await persist(multi, true);
  return NextResponse.json(snapshotFor(multi, company, now));
}
