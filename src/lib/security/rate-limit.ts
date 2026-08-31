import "server-only";
import { sql } from "../db";

/**
 * Limitation de débit stockée en base (fenêtre glissante grossière).
 * Suffisant contre le spam de commandes et compatible avec un déploiement
 * serverless, où un compteur en mémoire ne servirait à rien.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  await sql(`DELETE FROM rate_limits WHERE expires_at < now()`);
  const rows = await sql<{ hits: number }>(
    `INSERT INTO rate_limits (key, hits, expires_at)
     VALUES ($1, 1, now() + ($2 || ' seconds')::interval)
     ON CONFLICT (key) DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`,
    [key, String(windowSeconds)],
  );
  return Number(rows[0]?.hits ?? 1) <= limit;
}

/** IP de l'appelant, en tenant compte des proxys de Vercel. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
