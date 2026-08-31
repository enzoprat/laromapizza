"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { telHref } from "@/lib/utils";

/**
 * En-tête du site public.
 *
 * Volontairement dépouillé : ce site n'a pas de rubriques à explorer, il a une
 * commande à faire passer. Un logo, un téléphone, une action. La barre se pose
 * sur le mur au défilement plutôt que de rester une bande opaque permanente.
 */
export function SiteHeader({
  telephone,
  action,
}: {
  telephone?: string | null;
  action?: { label: string; href: string };
}) {
  const [pose, setPose] = useState(false);

  useEffect(() => {
    const onScroll = () => setPose(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        pose ? "bg-mur/85 shadow-doux backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[78rem] items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" aria-label="La Roma Pizza, accueil" className="shrink-0">
          <Logo className="h-10 sm:h-11" priority />
        </Link>

        <span className="flex-1" />

        {telephone ? (
          <a
            href={`tel:${telHref(telephone)}`}
            className="b-fantome b-m hidden sm:inline-flex"
          >
            <Phone className="size-4" aria-hidden />
            {telephone}
          </a>
        ) : null}

        {action ? (
          <Link href={action.href} className="b-rouge b-m">
            {action.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
