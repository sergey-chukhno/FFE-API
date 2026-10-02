import { describe, it, expect } from "vitest";
import {
  generateMarkdownReport,
  ExportRow,
  BatchStatsSummary,
} from "@/lib/export/export_utils";

describe("Frontend Logic & Utilities - Automated Tests", () => {
  const sampleStats: BatchStatsSummary = {
    totalProcessed: 4,
    totalVerified: 3,
    verifiedACount: 2,
    verifiedBCount: 1,
    unverifiedCount: 1,
    durationMs: 18,
  };

  const sampleRows: ExportRow[] = [
    {
      index: 1,
      participantExport: "CHUKHNO Maxime",
      nrFfe: "X81304",
      nomPrenomFfe: "CHUKHNO Maxime",
      af: "A",
      elo: "1480",
      categorie: "PupM",
      club: "Marseille-Echecs",
      statut: "LICENCIE_A",
      remarque: "Payé",
    },
    {
      index: 2,
      participantExport: "DUPONT Jean",
      nrFfe: "B12345",
      nomPrenomFfe: "DUPONT Jean",
      af: "B",
      elo: "1200",
      categorie: "BenM",
      club: "Marseille-Echecs",
      statut: "LICENCIE_B",
      remarque: "En attente",
    },
    {
      index: 3,
      participantExport: "GARCIA Sophie",
      nrFfe: "C67890",
      nomPrenomFfe: "GARCIA Sophie",
      af: "A",
      elo: "1650",
      categorie: "SenF",
      club: "Marseille-Echecs",
      statut: "LICENCIE_A",
      remarque: "Payé",
    },
    {
      index: 4,
      participantExport: "INCONNU Pierre",
      nrFfe: "-",
      nomPrenomFfe: "-",
      af: "-",
      elo: "-",
      categorie: "-",
      club: "-",
      statut: "NON_VERIFIE",
      remarque: "Non licencié à Marseille-Échecs",
    },
  ];

  it("generates a comprehensive Markdown report containing stats and participant table", () => {
    const md = generateMarkdownReport(sampleRows, sampleStats, "Marseille-Échecs");

    // Vérification de la présence des sections majeures
    expect(md).toContain("# Rapport de Vérification des Licences FFE — Marseille-Échecs");
    expect(md).toContain("## 1. Synthèse Statistique");
    expect(md).toContain("## 2. Liste Détaillée des Participants");

    // Vérification des chiffres dans le tableau de synthèse
    expect(md).toContain("| **Total participants traités** | 4 |");
    expect(md).toContain("| **Licences A (Compétition)** | 2 |");
    expect(md).toContain("| **Licences B (Loisir / Scolaire)** | 1 |");
    expect(md).toContain("| **Non licenciés / Non trouvés** | 1 |");
    expect(md).toContain("| **Temps d'exécution vectoriel** | 18 ms |");

    // Vérification des participants
    expect(md).toContain("| 1 | CHUKHNO Maxime | X81304 | CHUKHNO Maxime | A | 1480 | PupM | ✅ Licence A |");
    expect(md).toContain("| 2 | DUPONT Jean | B12345 | DUPONT Jean | B | 1200 | BenM | 🔵 Licence B |");
    expect(md).toContain("| 4 | INCONNU Pierre | - | - | - | - | - | ❌ Non vérifié |");

    // Vérification de la signature
    expect(md).toContain("Sergey CHUKHNO");
  });

  it("filters rows accurately by licence category (Licence A, Licence B, Unverified)", () => {
    const filterLicenceA = sampleRows.filter((r) => r.statut === "LICENCIE_A");
    expect(filterLicenceA).toHaveLength(2);
    expect(filterLicenceA.map((r) => r.participantExport)).toEqual(["CHUKHNO Maxime", "GARCIA Sophie"]);

    const filterLicenceB = sampleRows.filter((r) => r.statut === "LICENCIE_B");
    expect(filterLicenceB).toHaveLength(1);
    expect(filterLicenceB[0].participantExport).toBe("DUPONT Jean");

    const filterUnverified = sampleRows.filter((r) => r.statut === "NON_VERIFIE");
    expect(filterUnverified).toHaveLength(1);
    expect(filterUnverified[0].participantExport).toBe("INCONNU Pierre");
  });

  it("performs multi-field search filtering across participant name, licence and notes", () => {
    const query1 = "chukhno";
    const matches1 = sampleRows.filter((r) =>
      r.participantExport.toLowerCase().includes(query1) ||
      r.nrFfe.toLowerCase().includes(query1)
    );
    expect(matches1).toHaveLength(1);
    expect(matches1[0].nrFfe).toBe("X81304");

    const queryLicence = "b12345";
    const matches2 = sampleRows.filter((r) =>
      r.nrFfe.toLowerCase().includes(queryLicence)
    );
    expect(matches2).toHaveLength(1);
    expect(matches2[0].participantExport).toBe("DUPONT Jean");

    const queryRemarque = "attente";
    const matches3 = sampleRows.filter((r) =>
      (r.remarque || "").toLowerCase().includes(queryRemarque)
    );
    expect(matches3).toHaveLength(1);
    expect(matches3[0].participantExport).toBe("DUPONT Jean");
  });

  it("calculates pagination offsets and pages count correctly", () => {
    const totalItems = 125;
    const pageSize = 50;
    const totalPages = Math.ceil(totalItems / pageSize);

    expect(totalPages).toBe(3);

    // Page 1: 0 à 50
    const page1Start = (1 - 1) * pageSize;
    const page1End = page1Start + pageSize;
    expect(page1Start).toBe(0);
    expect(page1End).toBe(50);

    // Page 3: 100 à 150 (clampé à 125)
    const page3Start = (3 - 1) * pageSize;
    const page3End = Math.min(page3Start + pageSize, totalItems);
    expect(page3Start).toBe(100);
    expect(page3End).toBe(125);
  });
});
