/**
 * Tests unitaires pour la matrice de permissions RBAC
 * Auteur : Sergey CHUKHNO
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canViewClass,
  canManageClass,
  canAccessInventory,
  ROLE_PERMISSIONS,
  PermissionKey,
} from "../permissions";
import { UserRole } from "../../db/schema";

describe("RBAC Permissions Matrix", () => {
  it("attribue toutes les 12 permissions au superadmin", () => {
    const allPermissions: PermissionKey[] = [
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
    ];

    for (const perm of allPermissions) {
      expect(hasPermission("superadmin", perm)).toBe(true);
    }
  });

  it("accorde les permissions métier au directeur mais refuse la gestion des utilisateurs et logs", () => {
    expect(hasPermission("director", "license:verify")).toBe(true);
    expect(hasPermission("director", "license:export")).toBe(true);
    expect(hasPermission("director", "player:search")).toBe(true);
    expect(hasPermission("director", "sync:execute")).toBe(true);
    expect(hasPermission("director", "teams:view")).toBe(true);
    expect(hasPermission("director", "teams:manage")).toBe(true);
    expect(hasPermission("director", "inventory:view")).toBe(true);
    expect(hasPermission("director", "classes:view_all")).toBe(true);

    // Refusés au directeur
    expect(hasPermission("director", "inventory:manage")).toBe(false);
    expect(hasPermission("director", "classes:manage_own")).toBe(false);
    expect(hasPermission("director", "users:manage")).toBe(false);
    expect(hasPermission("director", "system:logs")).toBe(false);
  });

  it("restreint les droits du coach à la recherche, la vue des équipes et ses cours", () => {
    expect(hasPermission("coach", "player:search")).toBe(true);
    expect(hasPermission("coach", "teams:view")).toBe(true);
    expect(hasPermission("coach", "classes:manage_own")).toBe(true);

    // Refusés au coach
    expect(hasPermission("coach", "license:verify")).toBe(false);
    expect(hasPermission("coach", "sync:execute")).toBe(false);
    expect(hasPermission("coach", "teams:manage")).toBe(false);
    expect(hasPermission("coach", "inventory:view")).toBe(false);
    expect(hasPermission("coach", "inventory:manage")).toBe(false);
    expect(hasPermission("coach", "classes:view_all")).toBe(false);
    expect(hasPermission("coach", "users:manage")).toBe(false);
  });

  it("confère à la secrétaire la recherche et le plein contrôle sur l'inventaire", () => {
    expect(hasPermission("secretary", "player:search")).toBe(true);
    expect(hasPermission("secretary", "inventory:view")).toBe(true);
    expect(hasPermission("secretary", "inventory:manage")).toBe(true);

    // Refusés à la secrétaire
    expect(hasPermission("secretary", "license:verify")).toBe(false);
    expect(hasPermission("secretary", "sync:execute")).toBe(false);
    expect(hasPermission("secretary", "teams:view")).toBe(false);
    expect(hasPermission("secretary", "teams:manage")).toBe(false);
    expect(hasPermission("secretary", "classes:view_all")).toBe(false);
    expect(hasPermission("secretary", "classes:manage_own")).toBe(false);
  });

  it("retourne false pour un rôle inconnu ou null", () => {
    expect(hasPermission(null, "player:search")).toBe(false);
    expect(hasPermission(undefined, "player:search")).toBe(false);
    expect(hasPermission("guest" as any, "player:search")).toBe(false);
  });
});

describe("Contrôle d'accès aux Classes (Cours)", () => {
  const coachUser = { id: "coach-uuid-1", role: "coach" as UserRole };
  const otherCoachUser = { id: "coach-uuid-2", role: "coach" as UserRole };
  const directorUser = { id: "director-uuid", role: "director" as UserRole };
  const superadminUser = { id: "admin-uuid", role: "superadmin" as UserRole };
  const secretaryUser = { id: "sec-uuid", role: "secretary" as UserRole };

  it("permet au coach de voir et gérer ses propres cours mais pas ceux des collègues", () => {
    expect(canViewClass(coachUser, "coach-uuid-1")).toBe(true);
    expect(canManageClass(coachUser, "coach-uuid-1")).toBe(true);

    // Tentative d'accès au cours d'un autre coach
    expect(canViewClass(otherCoachUser, "coach-uuid-1")).toBe(false);
    expect(canManageClass(otherCoachUser, "coach-uuid-1")).toBe(false);
  });

  it("permet au directeur de superviser (voir) tous les cours sans droit de modification directe", () => {
    expect(canViewClass(directorUser, "coach-uuid-1")).toBe(true);
    expect(canViewClass(directorUser, "coach-uuid-2")).toBe(true);
    expect(canManageClass(directorUser, "coach-uuid-1")).toBe(false);
  });

  it("accorde les pleins pouvoirs de consultation et modification au superadmin", () => {
    expect(canViewClass(superadminUser, "coach-uuid-1")).toBe(true);
    expect(canManageClass(superadminUser, "coach-uuid-1")).toBe(true);
  });

  it("interdit la consultation et modification des cours à la secrétaire", () => {
    expect(canViewClass(secretaryUser, "coach-uuid-1")).toBe(false);
    expect(canManageClass(secretaryUser, "coach-uuid-1")).toBe(false);
  });
});

describe("Contrôle d'accès au Module Inventaire", () => {
  it("permet à la secrétaire de consulter et modifier les stocks", () => {
    const rights = canAccessInventory("secretary");
    expect(rights.view).toBe(true);
    expect(rights.manage).toBe(true);
  });

  it("permet au directeur de consulter les stocks sans les modifier", () => {
    const rights = canAccessInventory("director");
    expect(rights.view).toBe(true);
    expect(rights.manage).toBe(false);
  });

  it("permet au superadmin d'avoir tous les accès à l'inventaire", () => {
    const rights = canAccessInventory("superadmin");
    expect(rights.view).toBe(true);
    expect(rights.manage).toBe(true);
  });

  it("interdit l'inventaire au coach", () => {
    const rights = canAccessInventory("coach");
    expect(rights.view).toBe(false);
    expect(rights.manage).toBe(false);
  });
});
