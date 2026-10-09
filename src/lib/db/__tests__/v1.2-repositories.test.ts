/**
 * Tests d'intégration pour les repositories v1.2 (Users, Classes, Inventory)
 * Auteur : Sergey CHUKHNO
 */

import { describe, it, expect } from "vitest";
import { getUserByEmail, getAllUsers } from "../users";
import { getAllClasses, getClassesByCoachId } from "../classes";
import { getAllInventoryItems, getLowStockAlerts, updateInventoryStock } from "../inventory";

describe("Repositories v1.2 Integration", () => {
  it("récupère les utilisateurs officiels du seed", async () => {
    const admin = await getUserByEmail("admin@marseille-echecs.com");
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe("superadmin");

    const director = await getUserByEmail("directeur@marseille-echecs.com");
    expect(director).not.toBeNull();
    expect(director?.role).toBe("director");

    const coach = await getUserByEmail("coach@marseille-echecs.com");
    expect(coach).not.toBeNull();
    expect(coach?.role).toBe("coach");

    const secretary = await getUserByEmail("secretaire@marseille-echecs.com");
    expect(secretary).not.toBeNull();
    expect(secretary?.role).toBe("secretary");

    const all = await getAllUsers();
    expect(all.length).toBeGreaterThanOrEqual(4);
  });

  it("récupère les cours assignés au coach", async () => {
    const coach = await getUserByEmail("coach@marseille-echecs.com");
    expect(coach).not.toBeNull();

    if (coach) {
      const coachClasses = await getClassesByCoachId(coach.id);
      expect(coachClasses.length).toBeGreaterThanOrEqual(2);
      expect(coachClasses.some((c) => c.name === "Poussins Débutants")).toBe(true);
      expect(coachClasses.some((c) => c.name === "Perfectionnement Jeunes")).toBe(true);
    }
  });

  it("récupère les articles de l\'inventaire et détecte les alertes de réassort", async () => {
    const items = await getAllInventoryItems();
    expect(items.length).toBeGreaterThanOrEqual(5);

    const categories = new Set(items.map((i) => i.category));
    expect(categories.has("BOUTIQUE")).toBe(true);
    expect(categories.has("BUVETTE")).toBe(true);
    expect(categories.has("BIBLIOTHEQUE")).toBe(true);

    const lowStock = await getLowStockAlerts();
    // La bouteille d'eau a un stock de 4 pour un seuil de 12
    expect(lowStock.length).toBeGreaterThanOrEqual(1);
    expect(lowStock.some((i) => i.name.includes("Bouteille Eau"))).toBe(true);
  });

  it("ajuste correctement les stocks et trace les mouvements dans l'historique", async () => {
    const items = await getAllInventoryItems();
    const dgtClock = items.find((i) => i.name.includes("Pendule"));
    expect(dgtClock).toBeDefined();

    if (dgtClock) {
      const initialStock = dgtClock.stockQuantity;
      // Vente de 1 pendule
      const { item, isAlert } = await updateInventoryStock(dgtClock.id, -1, "VENTE_TEST");
      expect(item?.stockQuantity).toBe(initialStock - 1);

      // Rétablissement du stock initial
      const restored = await updateInventoryStock(dgtClock.id, 1, "RESTORE_TEST");
      expect(restored.item?.stockQuantity).toBe(initialStock);
    }
  });
});
