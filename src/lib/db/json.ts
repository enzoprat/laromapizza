/**
 * Normalisation des colonnes JSON.
 *
 * Les deux pilotes ne rendent pas le même type pour une colonne `json`/`jsonb` :
 * PGlite désérialise toujours, postgres.js peut renvoyer la chaîne brute selon
 * la façon dont la valeur a été écrite. Un `.map()` sur une chaîne provoque
 * alors une erreur à l'exécution, et un accès par clé sur une chaîne renvoie
 * silencieusement `undefined` — ce qui est pire, car le prix devient faux sans
 * rien signaler.
 *
 * On normalise donc à la frontière des dépôts : le reste de l'application
 * reçoit toujours un tableau ou un objet.
 */

export function jsonArray<T>(valeur: unknown): T[] {
  if (Array.isArray(valeur)) return valeur as T[];
  if (typeof valeur === "string") {
    try {
      const parsed = JSON.parse(valeur);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function jsonObject<T extends object>(valeur: unknown): T {
  if (valeur && typeof valeur === "object" && !Array.isArray(valeur)) return valeur as T;
  if (typeof valeur === "string") {
    try {
      const parsed = JSON.parse(valeur);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : ({} as T);
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}
