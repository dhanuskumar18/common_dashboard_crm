import { Pool } from "pg";
import type { DbKey } from "./config";

const g = globalThis as unknown as { __pools?: Record<string, Pool> };
g.__pools ??= {};

function url(key: DbKey | "hub"): string {
  const gst = process.env.GST_DATABASE_URL;
  const nongst = process.env.NONGST_DATABASE_URL;
  const v =
    key === "gst" ? gst : key === "nongst" ? nongst : process.env.HUB_DATABASE_URL || gst;
  if (!v) throw new Error(`Missing database URL for "${key}" (check .env.local)`);
  return v;
}

export function getPool(key: DbKey | "hub"): Pool {
  const pools = g.__pools!;
  if (!pools[key]) {
    pools[key] = new Pool({ connectionString: url(key), max: 5, connectionTimeoutMillis: 8000 });
    pools[key].on("error", (e) => console.error(`[pg:${key}]`, e.message));
  }
  return pools[key];
}
