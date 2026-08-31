"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Révélation au défilement.
 *
 * Principe de sûreté : le contenu est rendu VISIBLE côté serveur. Ce n'est
 * qu'après hydratation, et uniquement pour les blocs situés sous la ligne de
 * flottaison, qu'il est masqué puis révélé. Sans JavaScript, ou si
 * l'observateur ne se déclenche jamais (onglet en arrière-plan, moteur qui
 * suspend l'observation), la page reste entièrement lisible.
 *
 * Un filet de sécurité révèle tout au bout de deux secondes, quoi qu'il arrive.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Décalage en ms, pour un effet d'escalier sur une série d'éléments. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [etat, setEtat] = useState<"initial" | "cache" | "vu">("initial");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setEtat("vu");
      return;
    }
    // Déjà à l'écran : on ne joue pas d'animation, on laisse tel quel.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setEtat("vu");
      return;
    }

    setEtat("cache");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEtat("vu");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.02 },
    );
    observer.observe(el);

    // Filet : rien ne doit pouvoir laisser un bloc invisible.
    const secours = window.setTimeout(() => {
      setEtat("vu");
      observer.disconnect();
    }, 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(secours);
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn(etat !== "initial" && "reveal", etat === "vu" && "reveal-vu", className)}
      style={etat === "cache" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
