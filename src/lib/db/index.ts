import "server-only";
import { readFile, rm } from "node:fs/promises";
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

async function openPglite(dir: string | undefined) {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.waitReady;
  return pg;
}

async function createPglite(): Promise<Database> {
  /**
   * Pendant `next build`, plusieurs processus pré-rendent en parallèle. PGlite
   * n'accepte pas deux processus sur le même répertoire, et copier une base
   * qu'un serveur de développement est en train d'écrire donne une copie
   * incohérente — qui fait *geler* le worker, pas échouer proprement.
   *
   * Chaque worker de build travaille donc sur une base en mémoire, reconstruite
   * par les migrations et le seed. Le pré-rendu ne fait que lire un catalogue
   * déterministe, et il n'y a plus ni contention ni fichiers temporaires.
   * En production (DATABASE_URL renseigné) ce chemin ne sert jamais.
   */
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const dir = isBuild ? undefined : path.join(process.cwd(), ".pglite");

  let pg: Awaited<ReturnType<typeof openPglite>>;
  try {
    pg = await openPglite(dir);
  } catch {
    // Un arrêt brutal du serveur peut laisser le répertoire dans un état que
    // Postgres refuse de rouvrir. Plutôt que de planter au démarrage, on repart
    // d'une base neuve : migrations et seed la reconstruisent à l'identique.
    console.warn("[db] Base locale illisible — recréation depuis le schéma et le seed.");
    if (dir) await rm(dir, { recursive: true, force: true });
    pg = await openPglite(dir);
  }

  if (dir) {
    // Fermeture propre à l'arrêt : c'est elle qui évite la corruption ci-dessus.
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
