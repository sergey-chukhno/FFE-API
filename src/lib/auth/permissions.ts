/**
 * Matrice de Contrôle d'Accès Basé sur les Rôles (RBAC) pour Marseille-Échecs v1.2
 * Auteur : Sergey CHUKHNO
 */

import { UserRole } from "../db/schema";

export type PermissionKey =
  | "license:verify"
  | "license:export"
  | "player:search"
  | "sync:execute"
  | "teams:view"
  | "teams:manage"
  | "inventory:view"
  | "inventory:manage"
  | "classes:view_all"
  | "classes:manage_own"
  | "users:manage"
  | "system:logs";

/**
 * Matrice stricte des permissions par rôle
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionKey[]> = {
  superadmin: [
    "license:verify",
    "license:export",
    "player:search",
    "sync:execute",
    "teams:view",
    "teams:manage",
    "inventory:view",
    "inventory:manage",
    "classes:view_all",
    "classes:manage_own",
    "users:manage",
    "system:logs",
  ],
  director: [
    "license:verify",
    "license:export",
    "player:search",
    "sync:execute",
    "teams:view",
    "teams:manage",
    "inventory:view",
    "classes:view_all",
  ],
  coach: [
    "player:search",
    "teams:view",
    "classes:manage_own",
  ],
  secretary: [
    "player:search",
    "inventory:view",
    "inventory:manage",
  ],
} as const;

/**
 * Vérifie si un rôle possède une permission spécifique
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Vérifie l'accès en lecture à un cours
 * Le superadmin et le directeur peuvent consulter tous les cours du club.
 * Le coach ne peut consulter que ses propres cours.
 */
export function canViewClass(user: { id: string; role: UserRole }, classCoachId: string | null): boolean {
  if (user.role === "superadmin" || user.role === "director") {
    return true;
  }
  if (user.role === "coach") {
    return Boolean(classCoachId && user.id === classCoachId);
  }
  return false;
}

/**
 * Vérifie le droit de modification sur un cours
 * Le superadmin ou le coach assigné peuvent modifier le cours.
 */
export function canManageClass(user: { id: string; role: UserRole }, classCoachId: string | null): boolean {
  if (user.role === "superadmin") {
    return true;
  }
  if (user.role === "coach") {
    return Boolean(classCoachId && user.id === classCoachId);
  }
  return false;
}

/**
 * Vérifie les privilèges d'accès au module inventaire
 */
export function canAccessInventory(role: UserRole | string | undefined | null): { view: boolean; manage: boolean } {
  return {
    view: hasPermission(role as UserRole, "inventory:view"),
    manage: hasPermission(role as UserRole, "inventory:manage"),
  };
}
