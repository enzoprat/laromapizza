"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Statut d'ouverture vivant.
 *
 * Le serveur rend déjà « Ouvert » ou « Fermé » ; ce composant y ajoute le temps
 * restant, recalculé côté client et rafraîchi chaque minute. « Ferme dans
 * 40 min » pousse davantage à commander maintenant qu'un simple « Ouvert ».
 */
export function Statut({
  ouvert,
  fermeA,
  prochaine,
  ton = "clair",
  compact,
}: {
  ouvert: boolean;
  /** "23:00" — heure de fermeture du service en cours. */
  fermeA?: string | null;
  /** "demain à 11:00" — si fermé. */
  prochaine?: string | null;
  ton?: "clair" | "sombre" | "voile";
  compact?: boolean;
}) {
  const [reste, setReste] = useState<number | null>(null);

  useEffect(() => {
    if (!ouvert || !fermeA) return;
    const calcul = () => {
      const [h, m] = fermeA.split(":").map(Number);
      const maintenant = new Date();
      const heure = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(maintenant);
      const [hh, mm] = heure.split(":").map(Number);
      setReste((h * 60 + m) - (hh * 60 + mm));
    };
    calcul();
    const t = window.setInterval(calcul, 60_000);
    return () => window.clearInterval(t);
  }, [ouvert, fermeA]);

  const bientot = reste !== null && reste > 0 && reste <= 60;

  const detail = ouvert
    ? bientot ? `Ferme dans ${reste} min` : fermeA ? `Jusqu'à ${fermeA}` : null
    : prochaine ? `Ouvre ${prochaine}` : null;

  const palettes = {
    clair: ouvert ? "bg-basilic-50 text-basilic-700" : "bg-encre/6 text-encre-2",
    sombre: ouvert ? "bg-basilic/22 text-basilic-100" : "bg-blanc/10 text-blanc/70",
    voile: ouvert ? "bg-blanc/92 text-basilic-700" : "bg-blanc/92 text-encre-2",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold backdrop-blur",
      palettes[ton],
      bientot && "text-rosso",
    )}>
      <span className={cn(
        "size-1.5 shrink-0 rounded-full",
        ouvert ? (bientot ? "bg-rosso anim-battement" : "bg-basilic anim-battement") : "bg-current opacity-45",
      )} />
      {ouvert ? "Ouvert" : "Fermé"}
      {!compact && detail ? (
        <span className="font-medium opacity-75">· {detail}</span>
      ) : null}
    </span>
  );
}
