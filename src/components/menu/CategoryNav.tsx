"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

/**
 * Barre de catégories horizontale, collante pendant tout le défilement.
 * La catégorie visible se met en surbrillance toute seule et la barre défile
 * pour la garder à l'écran : sur mobile, on ne perd jamais le fil.
 */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const barRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // Pendant un défilement programmé, on gèle l'observateur pour éviter que la
  // surbrillance ne saute de catégorie en catégorie.
  const locked = useRef(false);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.slug}`))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (locked.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id.replace("cat-", ""));
      },
      // La zone active commence sous la barre collante et couvre le haut de l'écran.
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  // Garde l'onglet actif visible dans la barre.
  useEffect(() => {
    const button = buttons.current.get(active);
    const bar = barRef.current;
    if (!button || !bar) return;
    const left = button.offsetLeft - bar.clientWidth / 2 + button.clientWidth / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const goTo = (slug: string) => {
    const target = document.getElementById(`cat-${slug}`);
    if (!target) return;
    locked.current = true;
    setActive(slug);
    const top = target.getBoundingClientRect().top + window.scrollY - 124;
    window.scrollTo({ top, behavior: "smooth" });
    window.setTimeout(() => { locked.current = false; }, 700);
  };

  return (
    <nav aria-label="Catégories de la carte" className="border-b border-line bg-white/95 backdrop-blur">
      <div ref={barRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            ref={(el) => { if (el) buttons.current.set(c.slug, el); }}
            onClick={() => goTo(c.slug)}
            aria-current={active === c.slug ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
              active === c.slug
                ? "bg-ink text-white"
                : "bg-sand text-ink-soft hover:bg-line hover:text-ink",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
