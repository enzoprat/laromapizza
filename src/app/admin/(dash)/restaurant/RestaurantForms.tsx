"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Field, Section, StatusMessage, SubmitButton, TextArea, Toggle } from "@/components/admin/ui";
import {
  addClosure, removeClosure, removeZone, saveHours, saveSettings, saveZone,
  type ActionState,
} from "./actions";
import { dayNameCapitalized } from "@/lib/domain/time";
import type { Restaurant } from "@/lib/types";
import type { OpeningHour } from "@/lib/domain/opening";
import type { DeliveryZone } from "@/lib/domain/zones";

const cents = (value: number) => (value / 100).toFixed(2);

export function SettingsForm({ restaurant, isSuper }: { restaurant: Restaurant; isSuper: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, {});

  return (
    <form action={action}>
      <input type="hidden" name="restaurantId" value={restaurant.id} />
      <Section title="Coordonnées" description="Ces informations alimentent la page publique et les fiches Google.">
        <div className="grid gap-4 sm:grid-cols-2">
          {isSuper ? (
            <Field label="Nom de l'établissement" name="name" defaultValue={restaurant.name} className="sm:col-span-2" />
          ) : null}
          <Field label="Adresse" name="street" defaultValue={restaurant.street} className="sm:col-span-2" />
          <Field label="Code postal" name="postal_code" defaultValue={restaurant.postal_code} inputMode="numeric" />
          <Field label="Ville" name="city" defaultValue={restaurant.city} />
          <Field label="Téléphone" name="phone" defaultValue={restaurant.phone} type="tel" />
          <Field label="Mobile" name="mobile" defaultValue={restaurant.mobile ?? ""} type="tel" />
          <Field
            label="Photo de la devanture"
            name="photo"
            defaultValue={restaurant.photo ?? ""}
            hint="Chemin du fichier, par exemple /img/restaurants/begles.jpg"
            className="sm:col-span-2"
          />
        </div>
      </Section>

      <div className="mt-4">
        <Section title="Commandes" description="Délais, créneaux et capacité du comptoir.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Préparation (min)" name="prep_time_min" type="number" min={5} max={180}
              defaultValue={restaurant.prep_time_min} hint="Click & collect" />
            <Field label="Livraison (min)" name="delivery_time_min" type="number" min={10} max={180}
              defaultValue={restaurant.delivery_time_min} hint="Préparation + course" />
            <Field label="Créneaux (min)" name="slot_interval_min" type="number" min={5} max={60} step={5}
              defaultValue={restaurant.slot_interval_min} hint="Pas entre deux heures" />
            <Field label="Capacité / créneau" name="slot_capacity" type="number" min={1} max={99}
              defaultValue={restaurant.slot_capacity} hint="Commandes maximum" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Minimum midi (€)" name="delivery_min_lunch" type="text" inputMode="decimal"
              defaultValue={cents(restaurant.delivery_min_lunch)} />
            <Field label="Minimum soir (€)" name="delivery_min_dinner" type="text" inputMode="decimal"
              defaultValue={cents(restaurant.delivery_min_dinner)} />
            <Field label="Frais de livraison (€)" name="delivery_fee" type="text" inputMode="decimal"
              defaultValue={cents(restaurant.delivery_fee)} hint="0 = livraison offerte" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Toggle label="Click & Collect" name="pickup_enabled" defaultChecked={restaurant.pickup_enabled} />
            <Toggle label="Livraison" name="delivery_enabled" defaultChecked={restaurant.delivery_enabled} />
            <Toggle
              label="Accepter les commandes en ligne"
              name="accepting_orders"
              defaultChecked={restaurant.accepting_orders}
              hint="Décochez pour couper temporairement la prise de commande."
            />
            {isSuper ? (
              <Toggle
                label="Paiement en ligne"
                name="online_payment_enabled"
                defaultChecked={restaurant.online_payment_enabled}
                hint="Réservé à la V2 (Stripe). Sans effet tant que Stripe n'est pas branché."
              />
            ) : null}
          </div>
        </Section>
      </div>

      {isSuper ? (
        <div className="mt-4">
          <Section title="Référencement" description="Titre, description et texte affichés sur la page publique.">
            <div className="grid gap-4">
              <Field label="Titre SEO" name="seo_title" defaultValue={restaurant.seo_title ?? ""} maxLength={70}
                hint="60 à 65 caractères, c'est l'idéal." />
              <TextArea label="Meta description" name="seo_description" defaultValue={restaurant.seo_description ?? ""}
                maxLength={180} hint="150 à 160 caractères." />
              <TextArea label="Texte de présentation" name="seo_intro" defaultValue={restaurant.seo_intro ?? ""}
                rows={5} hint="Quelques phrases utiles : quartier, services, zones desservies." />
            </div>
          </Section>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 mt-4 flex items-center gap-3 rounded-card border border-line bg-white/95 p-4 backdrop-blur">
        <SubmitButton />
        <StatusMessage state={state} />
      </div>
    </form>
  );
}

export function HoursForm({ restaurant, hours }: { restaurant: Restaurant; hours: OpeningHour[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveHours, {});
  const find = (weekday: number, service: "midi" | "soir") =>
    hours.find((h) => h.weekday === weekday && h.service === service);

  return (
    <form action={action}>
      <input type="hidden" name="restaurantId" value={restaurant.id} />
      <Section
        title="Horaires d'ouverture"
        description="Laissez une plage vide pour indiquer une fermeture. Les créneaux de commande en découlent directement."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted">
                <th className="pb-2">Jour</th>
                <th className="pb-2">Midi</th>
                <th className="pb-2">Soir</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                <tr key={weekday} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-ink">
                    {dayNameCapitalized(weekday)}
                  </th>
                  {(["midi", "soir"] as const).map((service) => {
                    const range = find(weekday, service);
                    return (
                      <td key={service} className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <input type="time" name={`${service}_open_${weekday}`} defaultValue={range?.opens_at ?? ""}
                            aria-label={`${service} ouverture ${dayNameCapitalized(weekday)}`}
                            className="h-10 rounded-lg border border-line bg-white px-2 text-sm" />
                          <span className="text-ink-muted">–</span>
                          <input type="time" name={`${service}_close_${weekday}`} defaultValue={range?.closes_at ?? ""}
                            aria-label={`${service} fermeture ${dayNameCapitalized(weekday)}`}
                            className="h-10 rounded-lg border border-line bg-white px-2 text-sm" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <SubmitButton>Enregistrer les horaires</SubmitButton>
          <StatusMessage state={state} />
        </div>
      </Section>
    </form>
  );
}

export function ClosuresPanel({
  restaurant,
  closures,
}: {
  restaurant: Restaurant;
  closures: { id: number; starts_on: string; ends_on: string; reason: string | null }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(addClosure, {});

  return (
    <Section title="Fermetures exceptionnelles" description="Aucun créneau ne sera proposé sur ces dates.">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        <Field label="Du" name="starts_on" type="date" required />
        <Field label="Au" name="ends_on" type="date" />
        <Field label="Motif" name="reason" placeholder="Congés, travaux…" />
        <SubmitButton>Ajouter</SubmitButton>
      </form>
      <div className="mt-3"><StatusMessage state={state} /></div>

      {closures.length ? (
        <ul className="mt-4 space-y-2">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
              <span className="text-sm text-ink">
                <strong>{c.starts_on === c.ends_on ? c.starts_on : `${c.starts_on} → ${c.ends_on}`}</strong>
                {c.reason ? <span className="text-ink-soft"> — {c.reason}</span> : null}
              </span>
              <form action={removeClosure}>
                <input type="hidden" name="restaurantId" value={restaurant.id} />
                <input type="hidden" name="closureId" value={c.id} />
                <button type="submit" aria-label="Supprimer cette fermeture"
                  className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-rosso-50 hover:text-rosso-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">Aucune fermeture programmée.</p>
      )}
    </Section>
  );
}

export function ZonesPanel({ restaurant, zones }: { restaurant: Restaurant; zones: DeliveryZone[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveZone, {});

  return (
    <Section
      title="Zones de livraison"
      description="Une adresse est acceptée si son code postal ou sa commune correspond à l'une de ces zones."
    >
      <form action={action} className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_0.8fr_1fr_auto] sm:items-end">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        <Field label="Commune / zone" name="label" placeholder="Bègles" required />
        <Field label="Codes postaux" name="postal_codes" placeholder="33130, 33800" />
        <Field label="Minimum (€)" name="min_order" inputMode="decimal" placeholder="—" />
        <Field label="Précision" name="note" placeholder="Partie basse…" />
        <SubmitButton>Ajouter</SubmitButton>
      </form>
      <div className="mt-3"><StatusMessage state={state} /></div>

      <ul className="mt-4 space-y-2">
        {zones.map((z) => (
          <li key={z.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
            <span className="min-w-0 text-sm">
              <strong className="text-ink">{z.label}</strong>
              <span className="text-ink-soft"> — {z.postal_codes.join(", ") || "aucun code postal"}</span>
              {z.note ? <span className="block text-xs text-ink-muted">{z.note}</span> : null}
              {z.min_order ? <span className="block text-xs text-ink-muted">Minimum : {cents(z.min_order)} €</span> : null}
            </span>
            <form action={removeZone}>
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <input type="hidden" name="zoneId" value={z.id} />
              <button type="submit" aria-label={`Supprimer la zone ${z.label}`}
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-rosso-50 hover:text-rosso-600">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Section>
  );
}
