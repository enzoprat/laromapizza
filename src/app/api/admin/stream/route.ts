import { requireAdmin, resolveScope } from "@/lib/auth/guard";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
// Sur un hébergeur serverless, la fonction est coupée au bout d'un moment :
// EventSource se reconnecte tout seul, le flux reprend sans intervention.
export const maxDuration = 60;

/**
 * Flux temps réel des commandes (Server-Sent Events).
 *
 * Choix : SSE plutôt que Supabase Realtime, pour que le tableau de bord
 * fonctionne à l'identique en local (PGlite) et en production (Supabase). Le
 * serveur surveille la table et ne pousse un événement que lorsqu'une commande
 * apparaît ou change d'état.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const restaurantId = resolveScope(auth.admin, new URL(request.url).searchParams.get("restaurant"));
  const encoder = new TextEncoder();
  let lastSeen = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("ready", { at: lastSeen });

      const tick = async () => {
        try {
          const rows = await sql<{ id: number; code: string; status: string; updated_at: string; created_at: string }>(
            `SELECT id, code, status, updated_at, created_at FROM orders
             WHERE updated_at > $1 AND ($2::int IS NULL OR restaurant_id = $2)
             ORDER BY updated_at`,
            [lastSeen, restaurantId],
          );
          if (rows.length) {
            lastSeen = rows[rows.length - 1].updated_at;
            const fresh = rows.filter((r) => r.status === "received");
            send("orders", { changed: rows.length, newOrders: fresh.length, codes: fresh.map((r) => r.code) });
          } else {
            // Commentaire SSE : maintient la connexion ouverte à travers les proxys.
            controller.enqueue(encoder.encode(": ping\n\n"));
          }
        } catch {
          /* la prochaine itération réessaiera */
        }
      };

      const interval = setInterval(tick, 3000);
      const stop = () => { clearInterval(interval); try { controller.close(); } catch { /* déjà fermé */ } };
      request.signal.addEventListener("abort", stop);
      setTimeout(stop, 55_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
