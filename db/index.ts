import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  try {
    const workerEnv = (env as unknown as Record<string, unknown>) || {};
    const d1Binding = (
      workerEnv.DB ||
      (process.env as any)?.DB ||
      (globalThis as any)?.DB ||
      (globalThis as any)?.__env__?.DB ||
      (process.env as any)?.__env__?.DB
    ) as D1Database | undefined;

    if (d1Binding && typeof d1Binding.prepare === "function") {
      return drizzle(d1Binding, { schema });
    }
  } catch (err) {
    console.warn("D1 binding access error:", err);
  }

  return null;
}
