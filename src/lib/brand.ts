/**
 * Présence en ligne de La Roma, hors base de données.
 *
 * Ces liens changent très rarement : ils vivent ici plutôt que dans une table
 * d'administration. Pour en modifier un, c'est le seul endroit à toucher.
 */
export type SocialLink = { name: string; url: string; handle: string };

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "Instagram",
    // À CONFIRMER : deux comptes coexistent, voir la note du README.
    url: "https://www.instagram.com/laromapizzaofficiel/",
    handle: "@laromapizzaofficiel",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/p/La-Roma-Pizza-100054518016914/",
    handle: "La Roma Pizza",
  },
];

/** Renseigné dans les données structurées (`sameAs`) et le pied de page. */
export const SOCIAL_URLS = SOCIAL_LINKS.map((s) => s.url);
