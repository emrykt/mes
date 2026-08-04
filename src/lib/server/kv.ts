/**
 * Storage backend for the demo store's single JSON blob.
 *
 * Local dev keeps the file-backed store (see demo-store.ts). In the cloud
 * (Vercel/serverless) the filesystem is read-only and not shared between
 * instances, so when Upstash Redis credentials are present we read/write the
 * whole blob to a single Redis key over the REST API. No npm dependency — a
 * plain `fetch` to the Upstash REST endpoint is enough.
 *
 * Works with either the Upstash integration env vars or Vercel KV's naming.
 */

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

/** True when a hosted Redis is configured — the cloud persistence path. */
export const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);

const KEY = "kioskmes:demo-store";

async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash Redis error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

/** Read the stored blob, or null when nothing has been written yet. */
export async function kvRead(): Promise<string | null> {
  const result = await redisCmd(["GET", KEY]);
  return typeof result === "string" ? result : null;
}

/** Overwrite the stored blob. */
export async function kvWrite(value: string): Promise<void> {
  await redisCmd(["SET", KEY, value]);
}
