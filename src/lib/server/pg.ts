import { Pool } from "pg";

/**
 * PostgreSQL blob-storage backend for the store (Faz 1b — the production
 * persistence). When `DATABASE_URL` is set (AWS RDS / any Postgres), the whole
 * MultiStore is kept as a single JSONB row, replacing the Upstash Redis blob.
 * Provider-agnostic: works on RDS Frankfurt, Neon EU, local Postgres, etc.
 *
 * This is the stepping-stone shape (one JSONB document); tables get normalized
 * incrementally later without changing the app.
 */

const CONN = process.env.DATABASE_URL || "";

/** True when a Postgres database is configured — the production persistence path. */
export const usePg = Boolean(CONN);

const KEY = "demo-store";

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: CONN,
      // Managed Postgres (RDS/Neon) requires TLS; accept the provider chain.
      ssl: CONN.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

function ensureTable(): Promise<void> {
  if (!ready) {
    ready = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS app_store (
           id text PRIMARY KEY,
           data jsonb NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null; // allow a retry on the next call
        throw e;
      });
  }
  return ready;
}

/** Read the stored blob, or null when nothing has been written yet. */
export async function pgRead(): Promise<string | null> {
  await ensureTable();
  const r = await getPool().query<{ data: unknown }>(
    "SELECT data FROM app_store WHERE id = $1",
    [KEY],
  );
  if (r.rows.length === 0) return null;
  return JSON.stringify(r.rows[0].data);
}

/** Overwrite the stored blob (single-row upsert). */
export async function pgWrite(value: string): Promise<void> {
  await ensureTable();
  await getPool().query(
    `INSERT INTO app_store (id, data, updated_at)
       VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [KEY, value],
  );
}
