import { describe, it, expect } from "vitest";
import {
  removeAccents,
  normalizeForMatch,
  buildSearchVariantes,
  decodeHTMLEntities,
  stripTagsFast,
} from "../normalization";

describe("Scraper - Normalization & String Utilities", () => {
  describe("removeAccents", () => {
    it("strips common French diacritics", () => {
      expect(removeAccents("Marseille-Échecs")).toBe("Marseille-Echecs");
      expect(removeAccents("Hélène François Cécile")).toBe("Helene Francois Cecile");
      expect(removeAccents("ÀÉÈÊËÎÏÔÙÛÜÇàéèêëîïôùûüç")).toBe("AEEEEIIOUUUCaeeeeiiouuuc");
    });

    it("handles null and undefined safely", () => {
      expect(removeAccents(null)).toBe("");
      expect(removeAccents(undefined)).toBe("");
      expect(removeAccents("")).toBe("");
    });
  });

  describe("normalizeForMatch", () => {
    it("handles hyphens vs spaces seamlessly", () => {
      const a = normalizeForMatch("Marseille-Echecs");
      const b = normalizeForMatch("Marseille Échecs");
      const c = normalizeForMatch("  marseille   echecs  ");
      expect(a).toBe("marseille echecs");
      expect(b).toBe("marseille echecs");
      expect(c).toBe("marseille echecs");
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it("normalizes player names with hyphens and accents", () => {
      expect(normalizeForMatch("Jean-François")).toBe("jean francois");
      expect(normalizeForMatch("JEAN FRANÇOIS")).toBe("jean francois");
    });
  });

  describe("buildSearchVariantes", () => {
    it("creates alternate space and hyphen versions in uppercase without accents", () => {
      const vars = buildSearchVariantes("Saint-Tropez");
      expect(vars).toContain("SAINT-TROPEZ");
      expect(vars).toContain("SAINT TROPEZ");

      const vars2 = buildSearchVariantes("Marseille Échecs");
      expect(vars2).toContain("MARSEILLE ECHECS");
      expect(vars2).toContain("MARSEILLE-ECHECS");
    });

    it("honors strict mode", () => {
      const vars = buildSearchVariantes("Saint-Tropez", true);
      expect(vars).toEqual(["Saint-Tropez"]);
    });
  });

  describe("decodeHTMLEntities", () => {
    it("decodes named, decimal and hex entities", () => {
      expect(decodeHTMLEntities("&Eacute;checs &amp; Cie")).toBe("Échecs & Cie");
      expect(decodeHTMLEntities("Caf&#233;")).toBe("Café");
      expect(decodeHTMLEntities("Caf&#xE9;")).toBe("Café");
      expect(decodeHTMLEntities("Test&nbsp;Space")).toBe("Test Space");
    });
  });

  describe("stripTagsFast", () => {
    it("strips HTML tags cleanly without allocating heavy regexes", () => {
      expect(stripTagsFast("<a href='link'><strong>CHUKHNO</strong> Sergey</a>")).toBe(
        "CHUKHNO Sergey"
      );
      expect(stripTagsFast("<td>1234</td>")).toBe("1234");
    });
  });
});
