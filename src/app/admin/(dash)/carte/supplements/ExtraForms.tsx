"use client";

import { useActionState } from "react";
import { Field, Section, StatusMessage, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveExtra, type ActionState } from "../actions";

const CATEGORIES = [
  { value: "ingredient", label: "Ingrédient" },
  { value: "fromage", label: "Fromage" },
  { value: "viande", label: "Viande" },
  { value: "poisson", label: "Poisson" },
  { value: "sauce", label: "Sauce" },
];

export function NewExtraForm() {
  const [state, action] = useActionState<ActionState, FormData>(saveExtra, {});
  return (
    <Section title="Nouveau supplément" description="Proposé automatiquement sur toutes les pizzas.">
      <form action={action} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Nom" name="name" placeholder="Burrata" required />
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink-soft">Famille</label>
          <select id="category" name="category" className="field">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <Field label="Prix 31 cm (€)" name="price_31" inputMode="decimal" defaultValue="1.00" />
        <Field label="Prix 40 cm (€)" name="price_40" inputMode="decimal" defaultValue="1.50" />
        <SubmitButton>Ajouter</SubmitButton>
      </form>
      <div className="mt-3"><StatusMessage state={state} /></div>
    </Section>
  );
}

export function ExtraRow({
  extra,
}: {
  extra: {
    id: number; name: string; category: string; is_active: boolean;
    price_by_size: Record<string, number>; price_default: number;
  };
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveExtra, {});
  const euros = (v: number | undefined, fallback: number) => ((v ?? fallback) / 100).toFixed(2);

  return (
    <form action={action} className="grid gap-3 border-t border-line py-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto] sm:items-end">
      <input type="hidden" name="extraId" value={extra.id} />
      <Field label="Nom" name="name" defaultValue={extra.name} />
      <div>
        <label htmlFor={`cat-${extra.id}`} className="mb-1.5 block text-sm font-medium text-ink-soft">Famille</label>
        <select id={`cat-${extra.id}`} name="category" defaultValue={extra.category} className="field">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <Field label="31 cm (€)" name="price_31" inputMode="decimal"
        defaultValue={euros(extra.price_by_size?.["31"], extra.price_default)} />
      <Field label="40 cm (€)" name="price_40" inputMode="decimal"
        defaultValue={euros(extra.price_by_size?.["40"], extra.price_default)} />
      <Toggle label="Actif" name="is_active" defaultChecked={extra.is_active} />
      <SubmitButton>Enregistrer</SubmitButton>
      <div className="sm:col-span-6"><StatusMessage state={state} /></div>
    </form>
  );
}
