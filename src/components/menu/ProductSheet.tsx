"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Minus, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/domain/money";
import type { OptionGroup, Product } from "@/lib/types";
import { useCart, type CartOption } from "@/store/cart";

export type SheetEdit = {
  key: string;
  variantId: number;
  optionIds: number[];
  extraIds: number[];
  quantity: number;
  instructions: string | null;
};

/**
 * Une étape du parcours guidé. Les formules en enchaînent plusieurs : « votre
 * pizza », puis « votre dessert », puis « votre boisson », puis le récapitulatif.
 */
type Step =
  | { kind: "variant"; key: string; title: string }
  | { kind: "group"; key: string; title: string; group: OptionGroup }
  | { kind: "review"; key: string; title: string };

/** Au-delà de ce nombre de choix, on affiche un champ de recherche. */
const SEARCHABLE_FROM = 12;

/**
 * Configuration d'un produit.
 * Bottom sheet sur mobile (le pouce atteint le bouton d'ajout), fenêtre centrée
 * à partir de `sm`. Le prix du bouton se met à jour à chaque choix.
 *
 * Deux présentations :
 *  - produit simple (une seule liste d'options, ou aucune) : tout sur un écran ;
 *  - formule (plusieurs choix à faire) : une étape par choix. Empiler trente-six
 *    pizzas, puis les desserts, puis les boissons dans un même défilement rendait
 *    la fin de la liste invisible.
 */

/** Comparaison insensible à la casse ET aux accents : « chevre » trouve « Chèvre ». */
const fold = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Ces sous-composants sont volontairement définis en dehors de ProductSheet.
 * Déclarés à l'intérieur, React les recréait à chaque rendu et remontait leur
 * arbre : le champ de recherche perdait le focus à chaque lettre — et donc le
 * clavier se refermait à chaque frappe sur mobile.
 */
function VariantPicker({
  variants, variantId, onSelect,
}: {
  variants: Product["variants"];
  variantId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {variants.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          aria-pressed={variantId === v.id}
          className={cn(
            "flex flex-col items-start rounded-xl border-2 px-4 py-3 text-left transition-all duration-150",
            variantId === v.id ? "border-rosso-600 bg-rosso-50" : "border-line bg-white hover:border-ink/25",
          )}
        >
          <span className="text-[15px] font-semibold text-ink">{v.name}</span>
          <span className="text-sm font-medium text-rosso-600">{formatPrice(v.price)}</span>
        </button>
      ))}
    </div>
  );
}

function GroupPicker({
  group, selected, onToggle, guided, search, onSearch,
}: {
  group: OptionGroup;
  selected: number[];
  onToggle: (optionId: number) => void;
  guided: boolean;
  search: string;
  onSearch: (value: string) => void;
}) {
  const searchable = guided && group.options.length >= SEARCHABLE_FROM;
  const needle = fold(search.trim());
  const visible = searchable && needle
    ? group.options.filter((o) => fold(o.name).includes(needle))
    : group.options;
  const single = group.max_select === 1;

  return (
    <>
      {searchable ? (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label={`Rechercher dans ${group.name}`}
            className="field pl-10"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        {visible.map((o) => {
          const checked = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              aria-pressed={checked}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                checked ? "border-rosso-600 bg-rosso-50" : "border-line bg-white hover:bg-sand",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center border-2 transition-colors",
                  single ? "rounded-full" : "rounded",
                  checked ? "border-rosso-600 bg-rosso-600 text-white" : "border-line",
                )}
              >
                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span className="flex-1 text-[15px] text-ink">{o.name}</span>
              {o.price_delta > 0 ? (
                <span className="text-sm font-semibold text-ink-soft">+{formatPrice(o.price_delta)}</span>
              ) : null}
            </button>
          );
        })}
        {searchable && !visible.length ? (
          <p className="py-6 text-center text-sm text-ink-muted">Aucun résultat pour « {search} ».</p>
        ) : null}
      </div>
    </>
  );
}

function ExtrasPicker({
  extras, selected, onToggle,
}: {
  extras: Product["extras"];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {extras.map((e) => {
        const checked = selected.includes(e.id);
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onToggle(e.id)}
            aria-pressed={checked}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-95",
              checked
                ? "border-rosso-600 bg-rosso-600 text-white"
                : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink",
            )}
          >
            {e.name}
          </button>
        );
      })}
    </div>
  );
}

function InstructionsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="instructions" className="text-sm font-bold text-ink">
        Instructions particulières
        <span className="ml-2 text-xs font-medium text-ink-muted">facultatif</span>
      </label>
      <input
        id="instructions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        placeholder="Sans olives, bien cuite…"
        className="field mt-2"
      />
    </div>
  );
}

export function ProductSheet({
  product,
  edit,
  onClose,
  onAdded,
}: {
  product: Product | null;
  /** Présent = on modifie une ligne du panier au lieu d'en ajouter une. */
  edit?: SheetEdit | null;
  onClose: () => void;
  /** Appelé après l'ajout, pour proposer une boisson ou un dessert. */
  onAdded?: (product: Product) => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const removeLine = useCart((s) => s.removeLine);

  const [variantId, setVariantId] = useState<number | null>(null);
  const [options, setOptions] = useState<Record<number, number[]>>({});
  const [extras, setExtras] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [search, setSearch] = useState("");

  const advanceTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Une formule = plusieurs choix à faire. C'est ce qui déclenche le mode guidé.
  const isWizard = (product?.optionGroups.length ?? 0) >= 2;

  const steps = useMemo<Step[]>(() => {
    if (!product || !isWizard) return [];
    const list: Step[] = [];
    if (product.variants.length > 1) list.push({ kind: "variant", key: "variant", title: "Choisissez la taille" });
    for (const g of product.optionGroups) list.push({ kind: "group", key: `g${g.id}`, title: g.name, group: g });
    list.push({ kind: "review", key: "review", title: "Votre formule" });
    return list;
  }, [product, isWizard]);

  // Réinitialise à chaque ouverture.
  useEffect(() => {
    if (!product) return;
    const wizard = product.optionGroups.length >= 2;

    if (edit) {
      setVariantId(edit.variantId);
      const grouped: Record<number, number[]> = {};
      for (const g of product.optionGroups) {
        grouped[g.id] = g.options.filter((o) => edit.optionIds.includes(o.id)).map((o) => o.id);
      }
      setOptions(grouped);
      setExtras(edit.extraIds);
      setQuantity(edit.quantity);
      setInstructions(edit.instructions ?? "");
      // En modification, tout est déjà rempli : on ouvre sur le récapitulatif.
      setStepIndex(wizard ? product.optionGroups.length + (product.variants.length > 1 ? 1 : 0) : 0);
      setSearch("");
      return;
    }

    const preferred = product.variants.find((v) => v.is_default) ?? product.variants[0];
    setVariantId(preferred?.id ?? null);

    const defaults: Record<number, number[]> = {};
    for (const g of product.optionGroups) {
      // Dans une formule, chaque choix mérite un geste explicite : pré-cocher
      // une pizza au hasard ferait sortir des commandes que personne n'a voulues.
      const def = g.options.find((o) => o.is_default);
      defaults[g.id] = !wizard && g.min_select > 0 && def ? [def.id] : [];
    }
    setOptions(defaults);
    setExtras([]);
    setQuantity(1);
    setInstructions("");
    setStepIndex(0);
    setSearch("");
  }, [product, edit]);

  // Verrouille le défilement de la page derrière la feuille.
  useEffect(() => {
    if (!product) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, [product, onClose]);

  // Chaque étape repart du haut, et le champ de recherche se vide.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setSearch("");
  }, [stepIndex]);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId],
  );

  const extraPrice = useCallback(
    (extraId: number) => {
      const extra = product?.extras.find((e) => e.id === extraId);
      if (!extra) return 0;
      const bySize = variant?.size_code ? Number(extra.price_by_size?.[variant.size_code]) : NaN;
      return Number.isFinite(bySize) ? bySize : Number(extra.price_default);
    },
    [product, variant],
  );

  const chosenOptions: CartOption[] = useMemo(() => {
    if (!product) return [];
    const list: CartOption[] = [];
    for (const g of product.optionGroups) {
      for (const id of options[g.id] ?? []) {
        const o = g.options.find((x) => x.id === id);
        if (o) list.push({ id: o.id, name: o.name, priceDelta: o.price_delta, kind: "option" });
      }
    }
    for (const id of extras) {
      const e = product.extras.find((x) => x.id === id);
      if (e) list.push({ id: e.id, name: e.name, priceDelta: extraPrice(id), kind: "extra" });
    }
    return list;
  }, [product, options, extras, extraPrice]);

  const unitPrice = (variant?.price ?? 0) + chosenOptions.reduce((t, o) => t + o.priceDelta, 0);

  const missingGroup = product?.optionGroups.find(
    (g) => g.min_select > 0 && (options[g.id]?.length ?? 0) < g.min_select,
  );

  const step = steps[stepIndex];
  const isLastStep = !isWizard || stepIndex >= steps.length - 1;

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  if (!product) return null;

  const toggleOption = (groupId: number, optionId: number, max: number) => {
    setOptions((prev) => {
      const current = prev[groupId] ?? [];
      if (max === 1) return { ...prev, [groupId]: [optionId] };
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : current.length < max || max <= 0
          ? [...current, optionId]
          : current;
      return { ...prev, [groupId]: next };
    });
  };

  const toggleExtra = (id: number) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /** Dans une formule, un choix unique enchaîne sur l'étape suivante. */
  const pickAndAdvance = (fn: () => void) => {
    fn();
    if (!isWizard) return;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    // Court délai : le temps de voir sa sélection se cocher.
    advanceTimer.current = window.setTimeout(goNext, 240);
  };

  const submit = () => {
    if (!variant || missingGroup) return;
    if (edit) removeLine(edit.key);
    addLine(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        image: product.image,
        variantId: variant.id,
        variantName: product.variants.length > 1 ? variant.name : null,
        sizeCode: variant.size_code,
        unitPrice,
        options: chosenOptions,
        instructions: instructions.trim() || null,
      },
      quantity,
    );
    onClose();
    if (!edit) onAdded?.(product);
  };

  // ------------------------------------------------------------------ RENDU

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="animate-sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-lift sm:max-w-lg sm:rounded-3xl"
      >
        {/* ---------------------------------------------------------- EN-TÊTE */}
        {isWizard ? (
          <div className="shrink-0 rounded-t-3xl border-b border-line px-4 pb-3 pt-4">
            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  aria-label="Étape précédente"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-sand"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {product.name} · étape {stepIndex + 1} sur {steps.length}
                </p>
                <h2 className="truncate font-display text-xl font-bold leading-tight text-ink">
                  {step?.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {/* Progression : cliquable vers l'arrière pour corriger un choix. */}
            <ol className="mt-3 flex gap-1.5">
              {steps.map((s, i) => (
                <li key={s.key} className="flex-1">
                  <button
                    type="button"
                    disabled={i > stepIndex}
                    onClick={() => setStepIndex(i)}
                    aria-label={`Étape ${i + 1} : ${s.title}`}
                    aria-current={i === stepIndex ? "step" : undefined}
                    className={cn(
                      "h-1.5 w-full rounded-full transition-colors",
                      i < stepIndex ? "bg-basil-600" : i === stepIndex ? "bg-rosso-600" : "bg-line",
                      i <= stepIndex ? "cursor-pointer" : "cursor-default",
                    )}
                  />
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="relative shrink-0">
            {product.image ? (
              <div className="relative h-40 overflow-hidden rounded-t-3xl sm:h-48">
                <Image src={product.image} alt={product.name} fill sizes="512px" className="object-cover" />
              </div>
            ) : (
              <div aria-hidden className="h-2 rounded-t-3xl bg-gradient-to-r from-rosso-600 to-basil-600" />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-card transition-transform active:scale-95"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------- CONTENU */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4">
          {isWizard ? (
            <>
              {step?.kind === "variant" ? (
                <VariantPicker
                  variants={product.variants}
                  variantId={variantId}
                  onSelect={(id) => pickAndAdvance(() => setVariantId(id))}
                />
              ) : null}
              {step?.kind === "group" ? (
                <GroupPicker
                  group={step.group}
                  guided
                  selected={options[step.group.id] ?? []}
                  search={search}
                  onSearch={setSearch}
                  onToggle={(optionId) => {
                    const g = step.group;
                    if (g.max_select === 1) pickAndAdvance(() => toggleOption(g.id, optionId, g.max_select));
                    else toggleOption(g.id, optionId, g.max_select);
                  }}
                />
              ) : null}
              {step?.kind === "review" ? (
                <div className="space-y-5">
                  <div className="rounded-card border border-line bg-cream p-4">
                    <p className="font-display text-lg font-bold text-ink">{product.name}</p>
                    {product.description ? (
                      <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{product.description}</p>
                    ) : null}
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {product.variants.length > 1 && variant ? (
                        <li className="flex justify-between gap-3 text-sm">
                          <span className="text-ink-soft">Taille</span>
                          <span className="font-semibold text-ink">{variant.name}</span>
                        </li>
                      ) : null}
                      {product.optionGroups.map((g) => {
                        const picked = g.options.filter((o) => (options[g.id] ?? []).includes(o.id));
                        return (
                          <li key={g.id} className="flex justify-between gap-3 text-sm">
                            <span className="text-ink-soft">{g.name}</span>
                            <span className="text-right font-semibold text-ink">
                              {picked.length ? picked.map((o) => o.name).join(", ") : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {product.extras.length ? (
                    <div>
                      <p className="text-sm font-bold text-ink">
                        Suppléments
                        <span className="ml-2 text-xs font-medium text-ink-muted">facultatif</span>
                      </p>
                      <div className="mt-2.5">
                        <ExtrasPicker extras={product.extras} selected={extras} onToggle={toggleExtra} />
                      </div>
                    </div>
                  ) : null}

                  <InstructionsField value={instructions} onChange={setInstructions} />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold leading-tight text-ink">{product.name}</h2>
              {product.description ? (
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{product.description}</p>
              ) : null}

              {product.variants.length > 1 ? (
                <fieldset className="mt-5">
                  <legend className="text-sm font-bold text-ink">Choisissez la taille</legend>
                  <div className="mt-2.5">
                    <VariantPicker variants={product.variants} variantId={variantId} onSelect={setVariantId} />
                  </div>
                </fieldset>
              ) : null}

              {product.optionGroups.map((g) => (
                <fieldset key={g.id} className="mt-5">
                  <legend className="flex items-baseline gap-2 text-sm font-bold text-ink">
                    {g.name}
                    {g.min_select > 0 ? (
                      <span className="text-xs font-medium text-rosso-600">obligatoire</span>
                    ) : (
                      <span className="text-xs font-medium text-ink-muted">facultatif</span>
                    )}
                  </legend>
                  <div className="mt-2.5">
                    <GroupPicker
                      group={g}
                      guided={false}
                      selected={options[g.id] ?? []}
                      search={search}
                      onSearch={setSearch}
                      onToggle={(optionId) => toggleOption(g.id, optionId, g.max_select)}
                    />
                  </div>
                </fieldset>
              ))}

              {product.extras.length ? (
                <fieldset className="mt-5">
                  <legend className="flex items-baseline gap-2 text-sm font-bold text-ink">
                    Suppléments
                    <span className="text-xs font-medium text-ink-muted">
                      {variant?.size_code === "40" ? "+1,50 € chacun" : "+1,00 € chacun"}
                    </span>
                  </legend>
                  <div className="mt-2.5">
                    <ExtrasPicker extras={product.extras} selected={extras} onToggle={toggleExtra} />
                  </div>
                </fieldset>
              ) : null}

              <div className="mt-5">
                <InstructionsField value={instructions} onChange={setInstructions} />
              </div>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------- ACTIONS */}
        <div className="shrink-0 border-t border-line bg-white p-4 pb-safe">
          {isLastStep ? (
            <div className="flex items-center gap-3">
              <div className="flex h-14 items-center gap-1 rounded-full border border-line bg-white px-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Diminuer la quantité"
                  className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-sand disabled:opacity-30"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span aria-live="polite" className="w-6 text-center text-base font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  disabled={quantity >= 20}
                  aria-label="Augmenter la quantité"
                  className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-sand disabled:opacity-30"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!variant || !!missingGroup}
                className="btn-primary btn-lg flex-1"
              >
                {missingGroup ? `Choisir : ${missingGroup.name}` : (
                  <>
                    {edit ? "Mettre à jour" : "Ajouter"} <span aria-hidden>•</span>{" "}
                    {formatPrice(unitPrice * quantity)}
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={step?.kind === "group" && (options[step.group.id]?.length ?? 0) < step.group.min_select}
              className="btn-primary btn-lg w-full"
            >
              {step?.kind === "group" && (options[step.group.id]?.length ?? 0) < step.group.min_select
                ? "Faites votre choix"
                : "Continuer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
