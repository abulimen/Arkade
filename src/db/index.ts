import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

export function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const isLocal = databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: isLocal ? 10 : 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  globalForDb.__arenaNextJsPostgresqlPool = pool;
  return pool;
}

export function getDb(): NodePgDatabase {
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(getPool());
  }
  return globalForDb.__arenaNextJsPostgresqlDb;
}
