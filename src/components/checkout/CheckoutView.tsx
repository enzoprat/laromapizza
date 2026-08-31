"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Bike, Check, ShoppingBag, Tag } from "lucide-react";
import type { OrderType, Restaurant } from "@/lib/types";
import { useCart, toOrderLines } from "@/store/cart";
import { useQuote } from "@/lib/useQuote";
import { formatPrice } from "@/lib/domain/money";
import { ModeChooser } from "./ModeChooser";
import { SlotPicker, type SlotDayDto } from "./SlotPicker";
import { cn } from "@/lib/utils";

type Contact = {
  firstName: string; lastName: string; phone: string; email: string;
  address: string; postalCode: string; city: string; addressExtra: string; notes: string;
};

const EMPTY: Contact = {
  firstName: "", lastName: "", phone: "", email: "",
  address: "", postalCode: "", city: "", addressExtra: "", notes: "",
};

const CONTACT_KEY = "laroma-coordonnees";

type ZoneCheck =
  | { covered: true; zone: { label: string; note: string | null } }
  | { covered: false; message: string; suggestion: { slug: string; name: string; city: string } | null };

export function CheckoutView({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const orderType = useCart((s) => s.orderType);
  const setOrderType = useCart((s) => s.setOrderType);
  const clear = useCart((s) => s.clear);

  const [contact, setContact] = useState<Contact>(EMPTY);
  const [days, setDays] = useState<SlotDayDto[]>([]);
  const [leadMinutes, setLeadMinutes] = useState(restaurant.prep_time_min);
  const [isOpenNow, setIsOpenNow] = useState(true);
  const [slot, setSlot] = useState<string | null>(null);
  const [asap, setAsap] = useState(true);
  const [zone, setZone] = useState<ZoneCheck | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Coordonnées mémorisées localement pour ne pas les ressaisir à chaque fois.
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(CONTACT_KEY);
      if (saved) setContact({ ...EMPTY, ...JSON.parse(saved) });
    } catch { /* stockage indisponible : on repart d'un formulaire vide */ }
  }, []);

  // Créneaux : rechargés dès que le mode change (les délais diffèrent).
  useEffect(() => {
    if (!orderType) return;
    let cancelled = false;
    fetch(`/api/slots?restaurant=${restaurant.slug}&type=${orderType}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setDays(data.days ?? []);
        setLeadMinutes(data.leadMinutes ?? restaurant.prep_time_min);
        setIsOpenNow(Boolean(data.isOpen));
      })
      .catch(() => { if (!cancelled) setDays([]); });
    return () => { cancelled = true; };
  }, [orderType, restaurant.slug, restaurant.prep_time_min]);

  // Contrôle de la zone de livraison, à la volée.
  useEffect(() => {
    if (orderType !== "delivery" || (!contact.postalCode && !contact.city)) {
      setZone(null);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch("/api/delivery-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: restaurant.slug,
          city: contact.city,
          postalCode: contact.postalCode,
        }),
      })
        .then((r) => r.json())
        .then(setZone)
        .catch(() => setZone(null));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [orderType, contact.city, contact.postalCode, restaurant.slug]);

  const { quote } = useQuote({
    restaurantSlug: restaurant.slug,
    orderType: orderType ?? "pickup",
    lines,
    scheduledFor: asap ? null : slot,
    city: contact.city,
    postalCode: contact.postalCode,
  });

  if (!mounted) return null;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h2 className="font-display text-2xl font-bold text-ink">Votre panier est vide</h2>
        <Link href={`/restaurants/${restaurant.slug}`} className="btn-primary btn-lg mt-6 w-full">
          Voir la carte
        </Link>
      </div>
    );
  }

  if (!orderType) {
    return <ModeChooser restaurant={restaurant} onChoose={setOrderType} />;
  }

  const set = (key: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContact((c) => ({ ...c, [key]: e.target.value }));

  const isDelivery = orderType === "delivery";
  const contactOk = contact.firstName.trim() && contact.lastName.trim() && contact.phone.trim().length >= 10;
  const addressOk = !isDelivery || (contact.address.trim() && contact.postalCode.trim() && contact.city.trim());
  const zoneOk = !isDelivery || zone?.covered === true;
  const slotOk = asap || !!slot;
  const minimumOk = quote?.meetsMinimum !== false;
  const canSubmit = contactOk && addressOk && zoneOk && slotOk && minimumOk && !submitting && days.length > 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
    } catch { /* sans importance */ }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          orderType,
          scheduledFor: asap ? null : slot,
          asap,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          email: contact.email || undefined,
          address: isDelivery ? contact.address : null,
          addressExtra: isDelivery ? contact.addressExtra : null,
          postalCode: isDelivery ? contact.postalCode : null,
          city: isDelivery ? contact.city : null,
          notes: contact.notes || null,
          website: "",
          lines: toOrderLines(lines),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Impossible d'enregistrer la commande.");
        setSubmitting(false);
        return;
      }
      clear();
      router.push(data.trackUrl);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setSubmitting(false);
    }
  };

  const total = quote?.total ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-44 pt-5 sm:px-6">
      {/* --------------------------------------------------------- MODE CHOISI */}
      <div className="flex items-center gap-3 rounded-card border border-line bg-cream p-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-white",
          isDelivery ? "bg-basil-600" : "bg-rosso-600")}>
          {isDelivery ? <Bike className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">{isDelivery ? "Livraison" : "Click & Collect"}</p>
          <p className="truncate text-[13px] text-ink-soft">
            {isDelivery ? "À votre adresse" : `${restaurant.street}, ${restaurant.city}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOrderType(null); setZone(null); }}
          className="shrink-0 text-sm font-semibold text-rosso-600 underline underline-offset-2"
        >
          Changer
        </button>
      </div>

      {/* ---------------------------------------------------------- COORDONNÉES */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-ink">Vos coordonnées</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-ink-soft">Prénom</label>
            <input id="firstName" value={contact.firstName} onChange={set("firstName")}
              autoComplete="given-name" className="field" required />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-ink-soft">Nom</label>
            <input id="lastName" value={contact.lastName} onChange={set("lastName")}
              autoComplete="family-name" className="field" required />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink-soft">Téléphone</label>
            <input id="phone" value={contact.phone} onChange={set("phone")} type="tel"
              inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" className="field" required />
            <p className="mt-1 text-xs text-ink-muted">Pour vous prévenir quand la commande est prête.</p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- ADRESSE */}
      {isDelivery ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink">Adresse de livraison</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-ink-soft">Adresse</label>
              <input id="address" value={contact.address} onChange={set("address")}
                autoComplete="street-address" placeholder="12 rue des Lilas" className="field" required />
            </div>
            <div>
              <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium text-ink-soft">Code postal</label>
              <input id="postalCode" value={contact.postalCode} onChange={set("postalCode")}
                inputMode="numeric" autoComplete="postal-code" placeholder="33130" className="field" required />
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-ink-soft">Ville</label>
              <input id="city" value={contact.city} onChange={set("city")}
                autoComplete="address-level2" placeholder="Bègles" className="field" required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressExtra" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Complément d&apos;adresse
                <span className="ml-2 text-xs text-ink-muted">facultatif</span>
              </label>
              <input id="addressExtra" value={contact.addressExtra} onChange={set("addressExtra")}
                placeholder="Bâtiment B, interphone Dupont" className="field" />
            </div>
          </div>

          {zone ? (
            zone.covered ? (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-basil-50 px-3.5 py-2.5 text-sm font-medium text-basil-700">
                <Check className="size-4 shrink-0" aria-hidden />
                Nous livrons bien à cette adresse ({zone.zone.label}).
              </p>
            ) : (
              <div className="mt-3 rounded-xl bg-rosso-50 px-3.5 py-3 text-sm text-rosso-700">
                <p className="flex items-start gap-2 font-medium">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {zone.message}
                </p>
                {zone.suggestion ? (
                  <Link
                    href={`/restaurants/${zone.suggestion.slug}`}
                    className="mt-2 inline-block font-semibold underline underline-offset-2"
                  >
                    Commander plutôt chez {zone.suggestion.name} →
                  </Link>
                ) : null}
              </div>
            )
          ) : null}
        </section>
      ) : null}

      {/* ------------------------------------------------------------- CRÉNEAU */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-ink">
          {isDelivery ? "Heure de livraison souhaitée" : "Heure de retrait souhaitée"}
        </h2>
        <div className="mt-3">
          <SlotPicker
            days={days}
            value={slot}
            asap={asap}
            leadMinutes={leadMinutes}
            isOpen={isOpenNow}
            onChange={(value, isAsap) => { setSlot(value); setAsap(isAsap); }}
          />
        </div>
      </section>

      {/* --------------------------------------------------------- INSTRUCTIONS */}
      <section className="mt-6">
        <label htmlFor="notes" className="mb-1.5 block font-display text-lg font-bold text-ink">
          Instructions <span className="text-sm font-medium text-ink-muted">facultatif</span>
        </label>
        <input id="notes" value={contact.notes} onChange={set("notes")}
          placeholder={isDelivery ? "Sonner deux fois, code 1234A…" : "J'arrive en voiture…"} className="field" />
      </section>

      {/* ------------------------------------------------------------- RÉCAPITULATIF */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink">Votre commande</h2>
        <div className="mt-3 rounded-card border border-line bg-cream p-4">
          <p className="text-sm font-bold text-ink">{restaurant.name}</p>
          <p className="text-[13px] text-ink-soft">
            {isDelivery ? "Livraison" : "Click & Collect"}
            {asap ? " · dès que possible" : slot ? ` · ${new Date(slot).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>

          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-ink-soft">
                  <span className="font-semibold text-ink">{l.quantity} ×</span> {l.productName}
                  {l.variantName ? ` ${l.variantName}` : ""}
                  {l.options.length ? (
                    <span className="block text-[12px] text-ink-muted">{l.options.map((o) => o.name).join(", ")}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{formatPrice(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatPrice(quote?.itemsTotal ?? 0)}</span>
            </div>
            {quote?.applied.map((p) => (
              <div key={p.promotionId} className="flex justify-between gap-3 font-semibold text-basil-700">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Tag className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">-{formatPrice(p.amount)}</span>
              </div>
            ))}
            {isDelivery ? (
              <div className="flex justify-between text-ink-soft">
                <span>Livraison</span>
                <span className="tabular-nums">
                  {quote?.deliveryFee ? formatPrice(quote.deliveryFee) : "Offerte"}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>

          {quote && !quote.meetsMinimum ? (
            <p className="mt-3 rounded-xl bg-rosso-50 px-3.5 py-2.5 text-sm font-medium text-rosso-700">
              Minimum de commande en livraison : {formatPrice(quote.minimumOrder)}.
              Il vous manque {formatPrice(quote.minimumOrder - (quote.itemsTotal - quote.discountTotal))}.
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-[13px] text-ink-muted">
          Paiement {isDelivery ? "à la livraison" : "au retrait"} : espèces, carte bancaire
          ou titres restaurant. Aucune donnée bancaire ne vous est demandée ici.
        </p>
      </section>

      {error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rosso-50 px-3.5 py-3 text-sm font-medium text-rosso-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {/* ------------------------------------------------------------- VALIDER */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 pb-safe backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary btn-lg w-full">
            {submitting ? "Envoi en cours…" : (
              <>Confirmer ma commande <span aria-hidden>•</span> {formatPrice(total)}</>
            )}
          </button>
          {!canSubmit && !submitting ? (
            <p className="mt-2 text-center text-xs text-ink-muted">
              {!contactOk ? "Renseignez vos coordonnées pour continuer."
                : !addressOk ? "Complétez votre adresse de livraison."
                : !zoneOk ? "Cette adresse n'est pas desservie par ce restaurant."
                : !minimumOk ? "Le minimum de commande n'est pas atteint."
                : !days.length ? "Aucun créneau disponible pour le moment."
                : "Choisissez une heure."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
