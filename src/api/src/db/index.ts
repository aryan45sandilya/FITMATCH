import pg from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { config } from "../config.js";

/**
 * Minimal database abstraction. Production uses node-postgres against Neon;
 * development and tests fall back to PGlite (real PostgreSQL compiled to WASM),
 * so the exact same SQL runs everywhere.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface Database extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// numeric → number, int8 → number (counts never exceed 2^53 here)
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

function fromPool(pool: pg.Pool): Database {
  return {
    async query(text, params) {
      const res = await pool.query(text, params as unknown[]);
      return { rows: res.rows };
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          async query(text, params) {
            const res = await client.query(text, params as unknown[]);
            return { rows: res.rows };
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export async function createPglite(dataDir?: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const parsers = {
    1700: (v: string) => parseFloat(v),
    20: (v: string) => parseInt(v, 10),
  };
  const db: PGlite = dataDir ? new PGlite(dataDir, { parsers }) : new PGlite({ parsers });
  await db.waitReady;
  return {
    async query(text, params) {
      const res = await db.query(text, params as unknown[]);
      return { rows: res.rows as never[] };
    },
    async tx(fn) {
      return db.transaction(async (t) =>
        fn({
          async query(text, params) {
            const res = await t.query(text, params as unknown[]);
            return { rows: res.rows as never[] };
          },
        }),
      );
    },
    close: () => db.close(),
  };
}

let instance: Database | undefined;

export async function getDb(): Promise<Database> {
  if (instance) return instance;
  if (config.databaseUrl) {
    instance = fromPool(
      new pg.Pool({
        connectionString: config.databaseUrl,
        max: 10,
        ssl: config.databaseUrl.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
      }),
    );
  } else {
    if (config.isProd) throw new Error("DATABASE_URL is required in production");
    instance = await createPglite(config.isTest ? undefined : config.pgliteDir);
  }
  return instance;
}

/** Test hook: inject a database (e.g. in-memory PGlite). */
export function setDb(db: Database | undefined): void {
  instance = db;
}
