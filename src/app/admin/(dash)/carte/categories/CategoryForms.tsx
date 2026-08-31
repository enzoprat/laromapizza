"use client";

import { useActionState } from "react";
import { Field, Section, StatusMessage, SubmitButton, TextArea, Toggle } from "@/components/admin/ui";
import { saveCategory, type ActionState } from "../actions";

export function NewCategoryForm() {
  const [state, action] = useActionState<ActionState, FormData>(saveCategory, {});
  return (
    <Section title="Nouvelle catégorie" description="Elle apparaîtra dans la barre de navigation de la carte.">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <Field label="Nom" name="name" placeholder="Paninis" required />
        <Field label="Description" name="description" placeholder="Servis avec des frites" />
        <SubmitButton>Ajouter</SubmitButton>
      </form>
      <div className="mt-3"><StatusMessage state={state} /></div>
    </Section>
  );
}

export function CategoryRow({
  category,
}: {
  category: { id: number; name: string; description?: string | null; position: number; is_active: boolean };
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveCategory, {});
  return (
    <form action={action} className="grid gap-3 border-t border-line py-3 sm:grid-cols-[1fr_2fr_5rem_auto_auto] sm:items-end">
      <input type="hidden" name="categoryId" value={category.id} />
      <Field label="Nom" name="name" defaultValue={category.name} />
      <TextArea label="Description" name="description" defaultValue={category.description ?? ""} rows={1} />
      <Field label="Ordre" name="position" type="number" defaultValue={category.position} />
      <Toggle label="Active" name="is_active" defaultChecked={category.is_active} />
      <SubmitButton>Enregistrer</SubmitButton>
      <div className="sm:col-span-5"><StatusMessage state={state} /></div>
    </form>
  );
}
