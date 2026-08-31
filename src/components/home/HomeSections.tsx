import Link from "next/link";
import Image from "next/image";
import { Bike, Instagram, Facebook, ShoppingBag, Tag } from "lucide-react";
import { formatPrice } from "@/lib/domain/money";
import { SOCIAL_LINKS } from "@/lib/brand";
import type { CategorySummary, HighlightProduct, PublicPromotion, ServedArea } from "@/lib/repo/home";

const ICONS: Record<string, typeof Instagram> = { Instagram, Facebook };

export function SocialLinks({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={className}>
      {SOCIAL_LINKS.map((s) => {
        const Icon = ICONS[s.name] ?? Instagram;
        return (
          <li key={s.name}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer me"
              className={
                compact
                  ? "flex size-10 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                  : "flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
              }
              aria-label={`La Roma Pizza sur ${s.name}`}
            >
              <Icon className="size-4" aria-hidden />
              {compact ? null : <span>{s.handle}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Trois étapes : lever le doute sur « comment ça marche » avant de commander. */
export function HowItWorks() {
  const steps = [
    { title: "Choisissez votre Roma", text: "Bègles, Bordeaux, Bordeaux Bastide ou Cenon. On vous indique tout de suite si c'est ouvert." },
    { title: "Composez votre commande", text: "Taille, base, suppléments, instructions. Le prix se met à jour à chaque choix, sans surprise." },
    { title: "Retirez ou faites-vous livrer", text: "Vous choisissez l'heure. Paiement sur place ou à la livraison, sans créer de compte." },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-labelledby="fonctionnement">
      <h2 id="fonctionnement" className="font-display text-2xl font-bold text-ink sm:text-3xl">
        Commander prend moins de deux minutes
      </h2>
      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="relative rounded-card border border-line bg-white p-5">
            <span className="grid size-9 place-items-center rounded-full bg-rosso-600 font-display text-sm font-extrabold text-white">
              {i + 1}
            </span>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Promotions({ promotions }: { promotions: PublicPromotion[] }) {
  if (!promotions.length) return null;

  return (
    <section className="border-y border-line bg-rosso-50/60" aria-labelledby="offres">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <h2 id="offres" className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Nos offres du moment
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          Appliquées automatiquement à votre panier, sans code à saisir.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {promotions.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-card border border-rosso-200 bg-white p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rosso-600 text-white">
                <Tag className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold leading-tight text-ink">{p.name}</h3>
                {p.description ? (
                  <p className="mt-0.5 text-sm leading-snug text-ink-soft">{p.description}</p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.order_types.includes("pickup") ? (
                    <span className="chip bg-sand text-ink-soft">
                      <ShoppingBag className="size-3" aria-hidden /> À emporter
                    </span>
                  ) : null}
                  {p.order_types.includes("delivery") ? (
                    <span className="chip bg-sand text-ink-soft">
                      <Bike className="size-3" aria-hidden /> En livraison
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Highlights({
  products,
  defaultSlug,
}: {
  products: HighlightProduct[];
  defaultSlug: string;
}) {
  if (!products.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-labelledby="pizzas">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pizzas" className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Les pizzas qu&apos;on nous commande le plus
          </h2>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            Toutes en 31 cm ou 40 cm, préparées à la commande, viande halal.
          </p>
        </div>
        <Link href={`/restaurants/${defaultSlug}`} className="btn-ghost btn-md">
          Voir toute la carte
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-card border border-line bg-white p-4">
            {p.image ? (
              <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                <Image src={p.image} alt="" fill sizes="80px" className="object-cover" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-bold leading-tight text-ink">
                {p.name}
                {p.is_new ? <span className="ml-2 chip bg-rosso-600 text-white">Nouveau</span> : null}
              </h3>
              {p.description ? (
                <p className="mt-1 text-[13px] leading-snug text-ink-soft">{p.description}</p>
              ) : null}
              <p className="mt-1.5 text-sm font-bold text-ink">
                {formatPrice(p.min_price)}
                {p.max_price > p.min_price ? (
                  <span className="font-medium text-ink-muted"> – {formatPrice(p.max_price)}</span>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryGrid({
  categories,
  defaultSlug,
}: {
  categories: CategorySummary[];
  defaultSlug: string;
}) {
  return (
    <section className="border-t border-line bg-cream" aria-labelledby="carte">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <h2 id="carte" className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Il n&apos;y a pas que des pizzas
        </h2>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Pâtes fraîches préparées à la commande, Tex Mex servis avec une sauce barbecue,
          salades, desserts et glaces Häagen-Dazs et Ben &amp; Jerry&apos;s.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/restaurants/${defaultSlug}#cat-${c.slug}`}
                className="flex h-full items-baseline justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-rosso-200 hover:bg-rosso-50"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{c.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {c.product_count} produit{c.product_count > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-rosso-600">
                  dès {formatPrice(c.min_price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DeliveryAreas({ areas }: { areas: ServedArea[] }) {
  if (!areas.length) return null;

  // Une même commune peut être desservie par deux établissements (Bouliac par
  // exemple) : on regroupe pour ne pas la répéter.
  const grouped = new Map<string, { label: string; note: string | null; codes: Set<string>; from: { slug: string; city: string }[] }>();
  for (const a of areas) {
    const key = a.label.toLowerCase();
    const entry = grouped.get(key) ?? { label: a.label, note: a.note, codes: new Set<string>(), from: [] };
    a.postal_codes.forEach((c) => entry.codes.add(c));
    if (!entry.from.some((f) => f.slug === a.restaurant_slug)) {
      entry.from.push({ slug: a.restaurant_slug, city: a.restaurant_city });
    }
    grouped.set(key, entry);
  }
  const list = [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-labelledby="livraison">
      <h2 id="livraison" className="font-display text-2xl font-bold text-ink sm:text-3xl">
        Où nous livrons
      </h2>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        La livraison est offerte sur l&apos;ensemble de nos zones. Si votre adresse
        n&apos;est pas couverte par l&apos;établissement choisi, le site vous oriente
        automatiquement vers celui qui la dessert.
      </p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((z) => (
          <li key={z.label} className="rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[15px] font-semibold text-ink">
              {z.label}
              {z.codes.size ? (
                <span className="ml-1.5 text-xs font-medium text-ink-muted">{[...z.codes].join(", ")}</span>
              ) : null}
            </p>
            {z.note ? <p className="text-xs text-ink-muted">{z.note}</p> : null}
            <p className="mt-1 text-[13px] text-ink-soft">
              Depuis{" "}
              {z.from.map((f, i) => (
                <span key={f.slug}>
                  {i > 0 ? " ou " : ""}
                  <Link href={`/restaurants/${f.slug}`} className="font-medium text-rosso-600 underline underline-offset-2">
                    {f.city}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="border-t border-line bg-cream" aria-labelledby="faq">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h2 id="faq" className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Questions fréquentes
        </h2>
        <div className="mt-5 space-y-2">
          {items.map((f) => (
            <details key={f.q} className="group rounded-xl border border-line bg-white px-4 py-3">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span aria-hidden className="shrink-0 text-rosso-600 transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
