/** Les montants circulent en centimes. Ce module est le seul à les mettre en forme. */

const FORMAT = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", minimumFractionDigits: 2,
});

/** 1690 -> "16,90 €" */
export const formatPrice = (cents: number) => FORMAT.format(cents / 100);

/** 1690 -> "16,90" (sans le symbole, pour les gros boutons) */
export const formatAmount = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(cents / 100);

/** Pour Schema.org / JSON-LD : 1690 -> "16.90" */
export const priceForSchema = (cents: number) => (cents / 100).toFixed(2);
