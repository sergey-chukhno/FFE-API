import { describe, it, expect } from "vitest";
import {
  parseExcelRow,
  parseExcelRows,
  splitCombinedName,
  sanitizeExcelString,
  FFE_LICENCE_REGEX,
} from "../excel_batch";

describe("Intelligent Batch Parser (5 Superpowers)", () => {
  describe("Superpower 1: Fuzzy Header Matching", () => {
    it("recognizes French, English, and standard platform header variants", () => {
      // Format HelloAsso standard
      const rowHelloAsso = {
        "Nom participant": "Dupont",
        "Prénom participant": "Jean",
        "Paiement": "Payé",
      };
      const p1 = parseExcelRow(rowHelloAsso);
      expect(p1.nom).toBe("DUPONT");
      expect(p1.prenom).toBe("Jean");
      expect(p1.paiement).toBe("Payé");

      // Format Billetweb / Anglais
      const rowEnglish = {
        "Last Name": "Martin",
        "First Name": "Alice",
        "Licence": "A12345",
      };
      const p2 = parseExcelRow(rowEnglish);
      expect(p2.nom).toBe("MARTIN");
      expect(p2.prenom).toBe("Alice");
      expect(p2.licence).toBe("A12345");
    });
  });

  describe("Superpower 2: Regex Licence Recognition in Any Cell", () => {
    it("detects FFE licence syntax (^[A-Za-z][0-9]{4,6}$) even with unknown column name", () => {
      const row = {
        "Code Barres Inconnu": "X81304",
        "Participant": "CHUKHNO Maxime",
      };
      const p = parseExcelRow(row);
      expect(p.licence).toBe("X81304");
      expect(p.nom).toBe("CHUKHNO");
      expect(p.prenom).toBe("Maxime");
    });

    it("verifies FFE_LICENCE_REGEX strictly", () => {
      expect(FFE_LICENCE_REGEX.test("X81304")).toBe(true);
      expect(FFE_LICENCE_REGEX.test("a12345")).toBe(true);
      expect(FFE_LICENCE_REGEX.test("Z1234")).toBe(true);
      expect(FFE_LICENCE_REGEX.test("12345")).toBe(false);
      expect(FFE_LICENCE_REGEX.test("XX12345")).toBe(false);
    });
  });

  describe("Superpower 3: Merged 'Nom & Prénom' Column Split", () => {
    it("splits all-caps family names from mixed-case first names", () => {
      const s1 = splitCombinedName("CHUKHNO Maxime");
      expect(s1.nom).toBe("CHUKHNO");
      expect(s1.prenom).toBe("Maxime");

      const s2 = splitCombinedName("DE LA TOUR Jean-François");
      expect(s2.nom).toBe("DE LA TOUR");
      expect(s2.prenom).toBe("Jean-François");
    });
  });

  describe("Superpower 4: Sanitization of Excel Parasites", () => {
    it("removes non-breaking spaces, curly quotes, tabs and multiple spaces", () => {
      const dirty = "  Marseille\u00A0Échecs \t d’or  ";
      expect(sanitizeExcelString(dirty)).toBe("Marseille Échecs d'or");
    });

    it("sanitizes rows seamlessly during parse", () => {
      const dirtyRow = {
        " Nom\u00A0participant ": " CHUKHNO \t",
        "Prénom ": " Maxime\u00A0",
        " Licence ": " x81304 ",
      };
      const p = parseExcelRow(dirtyRow);
      expect(p.nom).toBe("CHUKHNO");
      expect(p.prenom).toBe("Maxime");
      expect(p.licence).toBe("X81304");
    });
  });

  describe("Superpower 5: Hybrid Resolution Batch Processing", () => {
    it("processes complete batches with both licence-first and name-first rows", () => {
      const rows = [
        { "Licence": "X81304", "Nom": "Chukhno", "Prénom": "Maxime" },
        { "Nom complet": "MARTIN Louis" }, // Sans licence
      ];
      const parsed = parseExcelRows(rows);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].licence).toBe("X81304");
      expect(parsed[1].nom).toBe("MARTIN");
      expect(parsed[1].prenom).toBe("Louis");
    });
  });
});
