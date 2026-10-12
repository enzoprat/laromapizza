/**
 * Génère le manifeste des photos produit.
 *
 * Le seed ne peut pas interroger le disque : sur un hébergeur serverless, le
 * dossier `public/` est servi par le CDN et n'est pas présent dans la fonction.
 * On fige donc la liste à la compilation, dans un module importé normalement.
 *
 * Lancé automatiquement avant chaque build (`prebuild`).
 */
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const dossier = path.join(process.cwd(), "public", "img", "food", "produits");
const slugs = existsSync(dossier)
  ? readdirSync(dossier)
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, ""))
      .sort()
  : [];

const sortie = path.join(process.cwd(), "src", "lib", "db", "photos.ts");
writeFileSync(
  sortie,
  `// Fichier généré par scripts/photos.mjs — ne pas modifier à la main.\n` +
    `// Régénéré automatiquement avant chaque build.\n\n` +
    `export const PHOTOS_PRODUITS: ReadonlySet<string> = new Set([\n` +
    slugs.map((s) => `  ${JSON.stringify(s)},`).join("\n") +
    `\n]);\n`,
  "utf8",
);

console.log(`[photos] ${slugs.length} photos produit recensées`);
