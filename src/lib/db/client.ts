/**
 * Gestionnaire de connexion PostgreSQL avec support Serverless (Neon/Vercel)
 * et adaptateur de repli résilient pour le développement et la CI.
 * Auteur : Sergey CHUKHNO
 */

import { Pool, PoolConfig } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const isRemote =
      connectionString.includes("neon.tech") ||
      connectionString.includes("supabase.co") ||
      connectionString.includes("sslmode=require");

    const config: PoolConfig = {
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    if (isRemote) {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(config);

    pool.on("error", (err) => {
      console.error("Erreur inattendue du pool PostgreSQL:", err);
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
