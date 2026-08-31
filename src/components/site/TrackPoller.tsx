"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit la page de suivi tant que la commande est en cours.
 * On interroge un point d'entrée minuscule et on ne recharge que si le statut
 * a réellement changé — pas de rechargement inutile pendant l'attente.
 */
export function TrackPoller({ token, status }: { token: string; status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (["completed", "delivered", "cancelled"].includes(status)) return;
    const timer = window.setInterval(() => {
      fetch(`/api/track?token=${token}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => { if (data.status && data.status !== status) router.refresh(); })
        .catch(() => { /* hors ligne : on réessaiera au prochain tour */ });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [token, status, router]);

  return null;
}
