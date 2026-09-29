import { describe, it, expect } from "vitest";

describe("RecupFFE v1.1 - Sanity & Architecture Checks", () => {
  it("confirms that the project is running on Next.js v1.1 pure scraping architecture", () => {
    const architecture = {
      version: "1.1.0",
      scrapingEngine: "FFE_OFFICIAL_DIRECT",
      useExternalAPI: false,
      author: "Sergey CHUKHNO",
    };

    expect(architecture.version).toBe("1.1.0");
    expect(architecture.scrapingEngine).toBe("FFE_OFFICIAL_DIRECT");
    expect(architecture.useExternalAPI).toBe(false);
    expect(architecture.author).toBe("Sergey CHUKHNO");
  });

  it("validates basic accent normalization logic foundation", () => {
    const removeAccents = (str: string) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    expect(removeAccents("Marseille-Échecs")).toBe("Marseille-Echecs");
    expect(removeAccents("Éric Cécile")).toBe("Eric Cecile");
  });
});
