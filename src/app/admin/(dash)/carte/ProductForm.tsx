"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Field, Section, StatusMessage, SubmitButton, TextArea, Toggle } from "@/components/admin/ui";
import { saveProduct, type ActionState } from "./actions";

type Variant = { id: number | null; name: string; price: number; size_code: string | null };

export function ProductForm({
  product,
  categories,
  restaurants,
  variants,
  availability,
  localPrices,
}: {
  product: {
    id: number | null; name: string; description: string | null; image: string | null;
    category_id: number | null; is_new: boolean; is_popular: boolean; is_vegetarian: boolean;
    is_active: boolean; kind: string; evening_surcharge: number; availability: string;
    allergens: string[];
  };
  categories: { id: number; name: string }[];
  restaurants: { id: number; name: string; city: string }[];
  variants: Variant[];
  availability: Record<number, boolean>;
  localPrices: Record<string, number>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct, {});
  const [rows, setRows] = useState<Variant[]>(
    variants.length ? variants : [{ id: null, name: "Unité", price: 0, size_code: null }],
  );

  const euros = (cents: number) => (cents / 100).toFixed(2);

  return (
    <form action={action} className="space-y-4">
      {product.id ? <input type="hidden" name="productId" value={product.id} /> : null}

      <Section title="Produit">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" name="name" defaultValue={product.name} required className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <TextArea
              label="Description / ingrédients"
              name="description"
              defaultValue={product.description ?? ""}
              hint="C'est le texte affiché sous le nom, sur la carte en ligne."
            />
          </div>

          <div>
            <label htmlFor="category_id" className="mb-1.5 block text-sm font-medium text-ink-soft">Catégorie</label>
            <select id="category_id" name="category_id" defaultValue={product.category_id ?? ""} className="field" required>
              <option value="" disabled>Choisir…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="kind" className="mb-1.5 block text-sm font-medium text-ink-soft">Type</label>
            <select id="kind" name="kind" defaultValue={product.kind} className="field">
              <option value="simple">Produit simple</option>
              <option value="pizza">Pizza</option>
              <option value="menu">Menu / formule</option>
            </select>
          </div>

          <Field label="Photo" name="image" defaultValue={product.image ?? ""}
            placeholder="/img/food/roma.jpg" hint="Laisser vide si aucune photo." />

          <div>
            <label htmlFor="availability" className="mb-1.5 block text-sm font-medium text-ink-soft">Disponible</label>
            <select id="availability" name="availability" defaultValue={product.availability} className="field">
              <option value="all">À emporter et en livraison</option>
              <option value="pickup">À emporter uniquement</option>
              <option value="delivery">En livraison uniquement</option>
            </select>
          </div>

          <Field label="Majoration du soir (€)" name="evening_surcharge" inputMode="decimal"
            defaultValue={euros(product.evening_surcharge)} hint="0 si le prix ne change pas le soir." />

          <Field label="Allergènes" name="allergens" defaultValue={product.allergens.join(", ")}
            placeholder="gluten, lait, œuf" hint="Séparés par des virgules. Affichés sur la fiche produit." />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle label="Nouveau" name="is_new" defaultChecked={product.is_new} />
          <Toggle label="Populaire" name="is_popular" defaultChecked={product.is_popular} />
          <Toggle label="Végétarien" name="is_vegetarian" defaultChecked={product.is_vegetarian} />
          <Toggle label="Actif" name="is_active" defaultChecked={product.is_active} />
        </div>
      </Section>

      {/* ------------------------------------------------------------ TAILLES */}
      <Section
        title="Tailles et prix"
        description="Le premier tarif est la référence. Une pizza a typiquement 31 cm et 40 cm."
        aside={
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { id: null, name: "", price: 0, size_code: null }])}
            className="btn-ghost btn-sm"
          >
            <Plus className="size-4" aria-hidden />
            Ajouter une taille
          </button>
        }
      >
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="variant_id" value={row.id ?? ""} />
              <Field label="Libellé" name={`variant_name_${index}`} defaultValue={row.name} placeholder="31 cm" />
              <Field label="Prix (€)" name={`variant_price_${index}`} inputMode="decimal" defaultValue={euros(row.price)} />
              <Field label="Code taille" name={`variant_size_${index}`} defaultValue={row.size_code ?? ""}
                placeholder="31" hint="Sert aux promos et suppléments." />
              {row.id ? (
                <label className="flex h-13 items-center gap-2 text-xs font-medium text-rosso-600">
                  <input type="checkbox" name={`variant_delete_${index}`} className="size-4 accent-rosso-600" />
                  Retirer
                </label>
              ) : (
                <button type="button" onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
                  aria-label="Retirer cette ligne"
                  className="grid h-13 w-11 place-items-center rounded-xl text-ink-muted hover:text-rosso-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------- DISPONIBILITÉ PAR RESTAURANT */}
      <Section
        title="Disponibilité et tarifs par établissement"
        description="Laissez un prix vide pour appliquer le tarif de référence."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted">
                <th className="pb-2">Établissement</th>
                <th className="pb-2">Proposé</th>
                {rows.filter((r) => r.id).map((r) => (
                  <th key={r.id} className="pb-2">{r.name} (€)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-ink">{r.city}</th>
                  <td className="py-2 pr-3">
                    <input type="hidden" name="restaurant_id" value={r.id} />
                    <input type="checkbox" name={`available_${r.id}`}
                      defaultChecked={availability[r.id] ?? true}
                      aria-label={`Proposé à ${r.city}`}
                      className="size-5 accent-basil-600" />
                  </td>
                  {rows.filter((v) => v.id).map((v) => (
                    <td key={v.id} className="py-2 pr-3">
                      <input
                        name={`price_${r.id}_${v.id}`}
                        defaultValue={localPrices[`${r.id}_${v.id}`] !== undefined ? euros(localPrices[`${r.id}_${v.id}`]) : ""}
                        placeholder={euros(v.price)}
                        inputMode="decimal"
                        aria-label={`Prix ${v.name} à ${r.city}`}
                        className="h-10 w-24 rounded-lg border border-line px-2 text-sm tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 rounded-card border border-line bg-white/95 p-4 backdrop-blur">
        <SubmitButton />
        <Link href="/admin/carte" className="btn-ghost btn-md">Retour à la carte</Link>
        <StatusMessage state={state} />
      </div>
    </form>
  );
}
