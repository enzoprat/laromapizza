"use client";

import { useCallback, useRef } from "react";

/**
 * Signal sonore d'une nouvelle commande, synthétisé avec l'API Web Audio :
 * pas de fichier à charger, donc pas de latence au premier déclenchement.
 * Les navigateurs exigent une interaction préalable pour jouer un son — d'où
 * le bouton « Activer le son » du tableau de bord.
 */
export function useOrderChime() {
  const contextRef = useRef<AudioContext | null>(null);

  const ensure = useCallback(() => {
    if (!contextRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, []);

  const play = useCallback(
    (repeats = 3) => {
      const ctx = ensure();
      if (!ctx) return;
      // Trois notes montantes, franches et courtes : audible dans le bruit
      // d'une cuisine sans être agressif.
      const notes = [880, 1108.73, 1318.51];
      for (let r = 0; r < repeats; r++) {
        notes.forEach((frequency, i) => {
          const start = ctx.currentTime + r * 0.75 + i * 0.13;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.32);
        });
      }
    },
    [ensure],
  );

  return { play, unlock: ensure };
}
