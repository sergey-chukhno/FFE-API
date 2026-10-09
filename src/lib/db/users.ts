/**
 * Dépôt de données pour les utilisateurs et rôles
 * Avec adaptateur de repli en mémoire pour tests isolés et CI
 * Auteur : Sergey CHUKHNO
 */

import { getDbPool } from "./client";
import { UserRecord, UserRole } from "./schema";

// Mémoire de repli pour les tests unitaires et la CI
const memoryUsers = new Map<string, UserRecord>([
  [
    "admin@marseille-echecs.com",
    {
      id: "admin-uuid",
      name: "Sergey Superadmin",
      email: "admin@marseille-echecs.com",
      emailVerified: true,
      image: null,
      role: "superadmin",
      phone: "06 00 00 00 01",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    "directeur@marseille-echecs.com",
    {
      id: "director-uuid",
      name: "Directeur Sportif Marseille-Échecs",
      email: "directeur@marseille-echecs.com",
      emailVerified: true,
      image: null,
      role: "director",
      phone: "06 00 00 00 02",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    "coach@marseille-echecs.com",
    {
      id: "coach-uuid",
      name: "Entraîneur Principal",
      email: "coach@marseille-echecs.com",
      emailVerified: true,
      image: null,
      role: "coach",
      phone: "06 00 00 00 03",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    "secretaire@marseille-echecs.com",
    {
      id: "secretary-uuid",
      name: "Secrétariat Marseille-Échecs",
      email: "secretaire@marseille-echecs.com",
      emailVerified: true,
      image: null,
      role: "secretary",
      phone: "06 00 00 00 04",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const pool = getDbPool();
  if (!pool) {
    return memoryUsers.get(normalizedEmail) || null;
  }

  const res = await pool.query(
    `SELECT "id", "name", "email", "emailVerified", "image", "role", "phone", "createdAt", "updatedAt"
     FROM "user"
     WHERE "email" = $1;`,
    [normalizedEmail]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    role: row.role as UserRole,
    phone: row.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const pool = getDbPool();
  if (!pool) {
    for (const u of memoryUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  const res = await pool.query(
    `SELECT "id", "name", "email", "emailVerified", "image", "role", "phone", "createdAt", "updatedAt"
     FROM "user"
     WHERE "id" = $1;`,
    [id]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    role: row.role as UserRole,
    phone: row.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    for (const u of memoryUsers.values()) {
      if (u.id === userId) {
        u.role = newRole;
        u.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  const res = await pool.query(
    `UPDATE "user" SET "role" = $1, "updatedAt" = NOW() WHERE "id" = $2;`,
    [newRole, userId]
  );

  return (res.rowCount ?? 0) > 0;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const pool = getDbPool();
  if (!pool) {
    return Array.from(memoryUsers.values());
  }

  const res = await pool.query(
    `SELECT "id", "name", "email", "emailVerified", "image", "role", "phone", "createdAt", "updatedAt"
     FROM "user"
     ORDER BY "createdAt" ASC;`
  );

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    role: row.role as UserRole,
    phone: row.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}
