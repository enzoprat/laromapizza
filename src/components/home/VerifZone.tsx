"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Match = {
  slug: string; name: string; city: string; label: string; zone: string;
  note: string | null; isOpen: boolean; nextOpening: string | null;
};
type Reponse = { status: "incomplet" | "desservi" | "hors-zone"; matches?: Match[] };

/**
 * Vérificateur de zone de livraison.
 *
 * C'est la première objection d'un client : « est-ce que vous livrez chez
 * moi ? ». Y répondre en trois chiffres, avant même de choisir un
 * établissement, supprime le principal motif d'abandon — et oriente
 * directement vers la bonne Roma.
 */
export function VerifZone({ ton = "clair" }: { ton?: "clair" | "sombre" }) {
  const [valeur, setValeur] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [charge, setCharge] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = valeur.trim();
    if (q.length < 3) { setReponse(null); return; }

    const timer = window.setTimeout(() => {
      abort.current?.abort();
      abort.current = new AbortController();
      setCharge(true);
      fetch(`/api/zones?q=${encodeURIComponent(q)}`, { signal: abort.current.signal })
        .then((r) => r.json())
        .then(setReponse)
        .catch((e) => { if (e.name !== "AbortError") setReponse(null); })
        .finally(() => setCharge(false));
    }, 380);
    return () => window.clearTimeout(timer);
  }, [valeur]);

  const sombre = ton === "sombre";

  return (
    <div className="w-full">
      <label
        htmlFor="verif-zone"
        className={cn("etiquette", sombre ? "text-blanc/55" : "text-encre-3")}
      >
        <MapPin className="size-3.5" aria-hidden />
        On livre chez vous ?
      </label>

      <div className="relative mt-2.5">
        <Search
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2",
            sombre ? "text-blanc/40" : "text-encre-3",
          )}
          aria-hidden
        />
        <input
          id="verif-zone"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          inputMode="text"
          autoComplete="postal-code"
          placeholder="Code postal ou commune"
          aria-describedby="verif-zone-reponse"
          className={cn(
            "h-14 w-full rounded-full pl-11 pr-4 text-[16px] font-medium transition-[border-color,box-shadow] duration-200 focus:outline-none",
            sombre
              ? "border border-blanc/20 bg-blanc/10 text-blanc placeholder:text-blanc/40 focus:border-blanc/45 focus:ring-4 focus:ring-blanc/10"
              : "border border-encre/14 bg-blanc text-encre placeholder:text-encre-3 focus:border-rosso focus:ring-4 focus:ring-rosso/12",
          )}
        />
        {charge ? (
          <Loader2
            className={cn("absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin",
              sombre ? "text-blanc/50" : "text-encre-3")}
            aria-hidden
          />
        ) : null}
      </div>

      <div id="verif-zone-reponse" aria-live="polite" className="mt-2.5">
        {reponse?.status === "desservi" && reponse.matches?.length ? (
          <ul className="anim-glisse space-y-1.5">
            {reponse.matches.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/restaurants/${m.slug}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-bloc px-4 py-3 transition-colors",
                    sombre ? "bg-blanc/10 hover:bg-blanc/16" : "bg-basilic-50 hover:bg-basilic-100",
                  )}
                >
                  <span className={cn(
                    "size-2 shrink-0 rounded-full",
                    m.isOpen ? "bg-basilic anim-battement" : sombre ? "bg-blanc/40" : "bg-encre-3",
                  )} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[0.9375rem] font-semibold",
                      sombre ? "text-blanc" : "text-encre")}>
                      Oui — livré depuis {m.label}
                    </span>
                    <span className={cn("block text-[0.8125rem]",
                      sombre ? "text-blanc/60" : "text-encre-2")}>
                      {m.isOpen ? "Ouvert maintenant" : `Ouvre ${m.nextOpening ?? "prochainement"}`}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </span>
                  <ArrowRight className={cn(
                    "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                    sombre ? "text-blanc/60" : "text-basilic-700",
                  )} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {reponse?.status === "hors-zone" ? (
          <p className={cn(
            "anim-glisse rounded-bloc px-4 py-3 text-[0.875rem] leading-snug",
            sombre ? "bg-blanc/10 text-blanc/80" : "bg-rosso-50 text-rosso-700",
          )}>
            Nous ne livrons pas encore à cette adresse — mais le click &amp; collect
            reste possible dans nos quatre pizzerias.
          </p>
        ) : null}
      </div>
    </div>
  );
}
