/**
 * Script de Seeding pour RecupFFE v1.2 (Marseille-Échecs)
 * Initialise les 4 comptes de test, 2 cours et 5 articles d'inventaire avec alerte de réassort.
 * Usage : npx tsx scripts/seed-v1.2.ts
 * Auteur : Sergey CHUKHNO
 */

import { auth } from "../src/lib/auth/auth";
import { getDbPool, closeDbPool } from "../src/lib/db/client";
import { initDatabase } from "../src/lib/db/repository";
import { getUserByEmail } from "../src/lib/db/users";
import { createClass, getAllClasses } from "../src/lib/db/classes";
import { createInventoryItem, getAllInventoryItems } from "../src/lib/db/inventory";

async function seed() {
  console.log("🌱 Démarrage du Seeding Marseille-Échecs v1.2...");

  // 1. Initialisation des tables DDL
  await initDatabase();
  const pool = getDbPool();
  if (!pool) {
    console.error("❌ Impossible de se connecter à PostgreSQL.");
    process.exit(1);
  }

  // 2. Création des 4 comptes officiels
  const demoUsers = [
    {
      email: "admin@marseille-echecs.com",
      password: "MarseilleAdmin2026!",
      name: "Sergey Superadmin",
      role: "superadmin" as const,
      phone: "06 00 00 00 01",
    },
    {
      email: "directeur@marseille-echecs.com",
      password: "Directeur2026!",
      name: "Directeur Sportif Marseille-Échecs",
      role: "director" as const,
      phone: "06 00 00 00 02",
    },
    {
      email: "coach@marseille-echecs.com",
      password: "Coach2026!",
      name: "Entraîneur Principal",
      role: "coach" as const,
      phone: "06 00 00 00 03",
    },
    {
      email: "secretaire@marseille-echecs.com",
      password: "Secretaire2026!",
      name: "Secrétariat Marseille-Échecs",
      role: "secretary" as const,
      phone: "06 00 00 00 04",
    },
  ];

  for (const u of demoUsers) {
    const existing = await getUserByEmail(u.email);
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
            role: u.role,
            phone: u.phone,
          },
        });
        console.log(`✅ Compte créé : ${u.email} [${u.role}]`);
      } catch (err) {
        console.error(`Erreur création compte ${u.email}:`, err);
      }
    } else {
      console.log(`ℹ️ Compte existant : ${u.email} [${existing.role}]`);
    }
  }

  // 3. Récupération du coach pour assignation des cours
  const coachUser = await getUserByEmail("coach@marseille-echecs.com");
  const coachId = coachUser?.id || null;

  // 4. Seeding des Classes
  const existingClasses = await getAllClasses();
  if (existingClasses.length === 0) {
    await createClass({
      name: "Poussins Débutants",
      dayOfWeek: "Mercredi",
      startTime: "14:00",
      endTime: "15:30",
      level: "Débutants",
      coachId: coachId,
    });
    await createClass({
      name: "Perfectionnement Jeunes",
      dayOfWeek: "Samedi",
      startTime: "10:00",
      endTime: "12:00",
      level: "Initiés",
      coachId: coachId,
    });
    console.log("✅ 2 cours de démonstration créés pour le coach.");
  } else {
    console.log(`ℹ️ ${existingClasses.length} cours déjà présents.`);
  }

  // 5. Seeding de l'Inventaire
  const existingItems = await getAllInventoryItems();
  if (existingItems.length === 0) {
    const items = [
      {
        name: "T-shirt officiel Marseille-Échecs",
        category: "BOUTIQUE" as const,
        stockQuantity: 25,
        unitPrice: 15.0,
        alertThreshold: 5,
        description: "T-shirt respirant floqué logo officiel du club",
      },
      {
        name: "Pendule électronique DGT 2010",
        category: "BOUTIQUE" as const,
        stockQuantity: 8,
        unitPrice: 45.0,
        alertThreshold: 3,
        description: "Pendule officielle homologuée FIDE",
      },
      {
        name: "Café expresso Illy",
        category: "BUVETTE" as const,
        stockQuantity: 100,
        unitPrice: 1.0,
        alertThreshold: 20,
        description: "Capsule café pour buvette des tournois",
      },
      {
        name: "Bouteille Eau Minérale 50cl",
        category: "BUVETTE" as const,
        stockQuantity: 4, // ⚠️ En alerte de réassort (4 <= 12)
        unitPrice: 1.0,
        alertThreshold: 12,
        description: "Pack eau fraîche 50cl",
      },
      {
        name: "Mon Système - Aaron Nimzowitsch",
        category: "BIBLIOTHEQUE" as const,
        stockQuantity: 2,
        unitPrice: 22.0,
        alertThreshold: 1,
        description: "Livre classique de stratégie échiquéenne",
      },
    ];

    for (const item of items) {
      await createInventoryItem(item);
    }
    console.log("✅ 5 articles d'inventaire créés (dont 1 en alerte de réassort : Eau 50cl).");
  } else {
    console.log(`ℹ️ ${existingItems.length} articles d'inventaire déjà présents.`);
  }

  await closeDbPool();
  console.log("🎉 Seeding terminé avec succès !");
}

seed().catch((err) => {
  console.error("Erreur générale seeding:", err);
  process.exit(1);
});
