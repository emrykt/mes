import { NextResponse } from "next/server";
import type { DemoAction } from "@/lib/demo-types";
import {
  advance,
  applyAction,
  loadStore,
  persist,
  snapshot,
} from "@/lib/server/demo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const store = await loadStore(now);
  const changed = advance(store, now);
  if (changed) await persist(store);
  return NextResponse.json(snapshot(store, now));
}

export async function POST(req: Request) {
  const now = new Date();
  const store = await loadStore(now);
  advance(store, now);
  const action = (await req.json()) as DemoAction;
  applyAction(store, action, now); // resetDemo rebuilds `store` in place
  await persist(store, true);
  return NextResponse.json(snapshot(store, now));
}
