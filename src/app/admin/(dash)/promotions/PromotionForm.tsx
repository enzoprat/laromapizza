"use client";

import { useActionState, useState } from "react";
import { Field, Section, StatusMessage, SubmitButton, TextArea, Toggle } from "@/components/admin/ui";
import { savePromotion, type ActionState } from "./actions";
import type { AdminPromotion } from "@/lib/repo/admin";

const KINDS = [
  { value: "buy_x_get_y", label: "N achetées = 1 offerte" },
  { value: "bundle_price", label: "N produits pour un prix fixe" },
  { value: "percent", label: "Remise en pourcentage" },
  { value: "fixed", label: "Remise d'un montant fixe" },
];

export function PromotionForm({
  promotion,
  restaurants,
  categories,
}: {
  promotion?: AdminPromotion;
  restaurants: { id: number; name: string; city: string }[];
  categories: { id: number; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(savePromotion, {});
  const [kind, setKind] = useState(promotion?.kind ?? "buy_x_get_y");
  const euros = (v: number) => (v / 100).toFixed(2);

  return (
    <form action={action}>
      {promotion ? <input type="hidden" name="promotionId" value={promotion.id} /> : null}

      <Section
        title={promotion ? `Modifier « ${promotion.name} »` : "Nouvelle promotion"}
        description="Rien n'est codé en dur : le panier applique automatiquement ce qui est défini ici."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom affiché au client" name="name" defaultValue={promotion?.name ?? ""}
            placeholder="1 pizza achetée = 1 offerte" required className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <TextArea label="Description" name="description" defaultValue={promotion?.description ?? ""} rows={2} />
          </div>

          {!promotion ? (
            <Field label="Code interne" name="code" placeholder="EMPORTER-1-1"
              hint="Laisser vide pour le générer automatiquement." />
          ) : null}

          <div>
            <label htmlFor={`kind-${promotion?.id ?? "new"}`} className="mb-1.5 block text-sm font-medium text-ink-soft">
              Type de promotion
            </label>
            <select
              id={`kind-${promotion?.id ?? "new"}`}
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="field"
            >
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>

          {kind === "buy_x_get_y" ? (
            <>
              <Field label="Quantité achetée" name="buy_quantity" type="number" min={1}
                defaultValue={promotion?.buy_quantity ?? 1} />
              <Field label="Quantité offerte" name="free_quantity" type="number" min={1}
                defaultValue={promotion?.free_quantity ?? 1} hint="La ou les moins chères sont offertes." />
            </>
          ) : null}

          {kind === "bundle_price" ? (
            <>
              <Field label="Nombre de produits" name="buy_quantity" type="number" min={2}
                defaultValue={promotion?.buy_quantity ?? 2} />
              <Field label="Prix du lot (€)" name="discount_amount" inputMode="decimal"
                defaultValue={promotion ? euros(promotion.discount_value) : "20.00"} />
            </>
          ) : null}

          {kind === "percent" ? (
            <Field label="Remise (%)" name="discount_percent" type="number" min={1} max={100}
              defaultValue={promotion?.discount_value ?? 10} />
          ) : null}

          {kind === "fixed" ? (
            <Field label="Remise (€)" name="discount_amount" inputMode="decimal"
              defaultValue={promotion ? euros(promotion.discount_value) : "5.00"} />
          ) : null}

          <Field label="Minimum de commande (€)" name="min_order" inputMode="decimal"
            defaultValue={promotion ? euros(promotion.min_order) : "0.00"} />

          <div>
            <label htmlFor={`service-${promotion?.id ?? "new"}`} className="mb-1.5 block text-sm font-medium text-ink-soft">
              Service concerné
            </label>
            <select id={`service-${promotion?.id ?? "new"}`} name="service"
              defaultValue={promotion?.service ?? "all"} className="field">
              <option value="all">Midi et soir</option>
              <option value="midi">Midi uniquement</option>
              <option value="soir">Soir uniquement</option>
            </select>
          </div>

          <Field label="Tailles concernées" name="size_codes"
            defaultValue={promotion?.size_codes?.join(", ") ?? ""}
            placeholder="31, 40" hint="Vide = toutes les tailles." />

          <Field label="Début" name="starts_on" type="date" defaultValue={promotion?.starts_on ?? ""} />
          <Field label="Fin" name="ends_on" type="date" defaultValue={promotion?.ends_on ?? ""} />
          <Field label="Priorité" name="priority" type="number" defaultValue={promotion?.priority ?? 0}
            hint="La plus haute l'emporte entre deux promotions non cumulables." />
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-ink">Mode de récupération</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {[["pickup", "À emporter"], ["delivery", "En livraison"]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2.5">
                <input type="checkbox" name="order_types" value={value}
                  defaultChecked={promotion ? promotion.order_types.includes(value) : value === "pickup"}
                  className="size-4 accent-basil-600" />
                <span className="text-sm font-medium text-ink">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-ink">Établissements concernés</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {restaurants.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2.5">
                <input type="checkbox" name="restaurants" value={r.id}
                  defaultChecked={promotion ? promotion.restaurant_ids?.includes(r.id) : true}
                  className="size-4 accent-basil-600" />
                <span className="text-sm font-medium text-ink">{r.city}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-ink">
            Catégories concernées
            <span className="ml-2 text-xs font-medium text-ink-muted">aucune cochée = toute la carte</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2">
                <input type="checkbox" name="categories" value={c.id}
                  defaultChecked={promotion?.category_ids?.includes(c.id)}
                  className="size-4 accent-basil-600" />
                <span className="text-[13px] font-medium text-ink">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle label="Promotion active" name="is_active" defaultChecked={promotion?.is_active ?? true} />
          <Toggle label="Cumulable avec d'autres" name="is_stackable" defaultChecked={promotion?.is_stackable ?? false}
            hint="Sinon, seule la promotion la plus avantageuse s'applique." />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <SubmitButton>{promotion ? "Enregistrer" : "Créer la promotion"}</SubmitButton>
          <StatusMessage state={state} />
        </div>
      </Section>
    </form>
  );
}
