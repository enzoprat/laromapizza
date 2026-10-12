import "server-only";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Couche d'accès aux données.
 *
 * Un seul dialecte SQL (Postgres), deux pilotes :
 *  - DATABASE_URL défini  -> postgres.js, branché sur Supabase / Postgres managé.
 *  - DATABASE_URL absent  -> PGlite, un vrai Postgres compilé en WASM, persisté
 *    dans ./.pglite. Aucune installation, aucun Docker : `npm run dev` suffit.
 *
 * Conséquence : les migrations, les requêtes et le seed sont rigoureusement
 * identiques en local et en production. Pas de "mode démo" qui diverge.
 */

export type Row = Record<string, unknown>;

export interface Database {
  /** Une seule instruction, avec paramètres liés ($1, $2…). */
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Plusieurs instructions d'affilée, sans paramètres (migrations). */
  exec(text: string): Promise<void>;
  /** Tout ou rien : indispensable à la création d'une commande. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  driver: "postgres" | "pglite";
}

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

let ready: Promise<Database> | null = null;

// En dev, Next recharge les modules à chaque édition : on épingle l'instance sur
// globalThis pour ne pas rouvrir une base (et relancer les migrations) à chaque fois.
const globalForDb = globalThis as unknown as { __laRomaDb?: Promise<Database> };

async function createPostgres(url: string): Promise<Database> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // compatible avec le pooler transactionnel de Supabase
  });
  return {
    driver: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    async exec(text: string) {
      // Sans paramètre, postgres.js bascule sur le protocole simple : il accepte
      // donc plusieurs instructions séparées par des points-virgules.
      await sql.unsafe(text).simple();
    },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      return sql.begin(async (tx) => fn({
        async query<R>(text: string, params: unknown[] = []) {
          return (await tx.unsafe(text, params as never[])) as unknown as R[];
        },
      })) as Promise<T>;
    },
  };
}

/**
 * Ouvre la base locale, avec quelques tentatives espacées.
 *
 * PGlite n'accepte qu'un seul accès à la fois sur un répertoire. En
 * développement, Next compile les routes à la demande et peut tenter une
 * seconde ouverture pendant que la première s'initialise : l'échec est alors
 * transitoire et une courte attente suffit.
 */
async function openPglite(dir: string | undefined, tentatives = 6) {
  const { PGlite } = await import("@electric-sql/pglite");
  let derniereErreur: unknown;

  for (let i = 0; i < tentatives; i++) {
    try {
      const pg = dir ? new PGlite(dir) : new PGlite();
      await pg.waitReady;
      return pg;
    } catch (erreur) {
      derniereErreur = erreur;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }

  /**
   * On ne supprime JAMAIS la base automatiquement.
   *
   * Une version précédente effaçait le répertoire dès qu'une ouverture
   * échouait, en supposant une corruption. Un simple conflit d'accès suffisait
   * alors à détruire les commandes en cours — exactement le genre de « réparation »
   * qui fait plus de dégâts que la panne. En cas d'échec persistant, on
   * s'arrête et on explique quoi faire.
   */
  throw new Error(
    `Base locale inaccessible (${dir}). Un autre serveur l'utilise peut-être déjà : ` +
      `n'en lancez qu'un seul à la fois. Si le problème persiste, ` +
      `\`npm run db:reset\` repart d'une base neuve — les commandes de test seront perdues.`,
    { cause: derniereErreur },
  );
}

async function createPglite(): Promise<Database> {
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  /**
   * En production sans DATABASE_URL — typiquement une preview déployée —, le
   * répertoire de l'application est en lecture seule. On écrit alors dans le
   * dossier temporaire, seul emplacement inscriptible. La base y est recréée
   * à chaque démarrage à froid : parfait pour une démonstration, inadapté à
   * une exploitation réelle, qui doit passer par DATABASE_URL.
   */
  const ephemere = !isBuild && process.env.NODE_ENV === "production";
  const dir = isBuild
    ? undefined
    : ephemere
      ? path.join(os.tmpdir(), "laroma-pglite")
      : path.join(process.cwd(), ".pglite");

  const pg = await openPglite(dir);

  if (dir) {
    // Fermeture propre à l'arrêt : limite les incohérences sur disque.
    const shutdown = async () => {
      try { await pg.close(); } catch { /* déjà fermée */ }
      process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  return {
    driver: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params as never[]);
      return res.rows;
    },
    async exec(text: string) {
      // query() de PGlite n'accepte qu'une instruction : exec() gère les scripts.
      await pg.exec(text);
    },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      return pg.transaction(async (tx) => fn({
        async query<R>(text: string, params: unknown[] = []) {
          return (await tx.query<R>(text, params as never[])).rows;
        },
      })) as Promise<T>;
    },
  };
}

async function bootstrap(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();
  const db = url ? await createPostgres(url) : await createPglite();

  // Migration : le schéma est idempotent (CREATE TABLE IF NOT EXISTS).
  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await db.exec(schema);

  // Seed unique : on ne réinjecte pas si les restaurants existent déjà.
  const [{ count }] = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM restaurants",
  );
  if (Number(count) === 0) {
    const { seed } = await import("./seed");
    await seed(db);
  }

  return db;
}

export function getDb(): Promise<Database> {
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__laRomaDb ??= bootstrap();
    return globalForDb.__laRomaDb;
  }
  ready ??= bootstrap();
  return ready;
}

/** Raccourci : `const rows = await sql<T>('SELECT …', [param])`. */
export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(text, params);
}

/** Exécute `fn` dans une transaction. */
export async function transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(fn);
}

/** Première ligne ou null. */
export async function sqlOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}
