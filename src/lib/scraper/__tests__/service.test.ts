import { describe, it, expect, vi } from "vitest";
import { searchFfePlayers } from "../service";
import * as fetcher from "../fetcher";

describe("Scraper - Service High-Level Logic", () => {
  it("returns ERROR status if name is missing", async () => {
    const result = await searchFfePlayers({ nom: "" });
    expect(result.status).toBe("ERROR");
    expect(result.count).toBe(0);
    expect(result.error).toBeDefined();
  });

  it("processes EXACT match when single player is found", async () => {
    const fakeHtml = `
      <table>
        <tr class="liste_clair">
          <td>X12345</td>
          <td><a href="FicheJoueur.aspx?Id=100">CHUKHNO Sergey</a></td>
          <td>A</td><td></td><td>1900</td><td>1850</td><td>1800</td><td>SenM</td><td>FRA</td><td>Marseille Echecs</td>
        </tr>
      </table>
    `;

    vi.spyOn(fetcher, "fetchFfePage").mockResolvedValue(fakeHtml);

    const result = await searchFfePlayers({ nom: "CHUKHNO", prenom: "Sergey" });
    expect(result.status).toBe("EXACT");
    expect(result.count).toBe(1);
    expect(result.players[0].nom).toBe("CHUKHNO");
    expect(result.players[0].prenom).toBe("Sergey");

    vi.restoreAllMocks();
  });

  it("detects HOMONYMS and preserves all matching players", async () => {
    const fakeHtml = `
      <table>
        <tr class="liste_clair">
          <td>A11111</td>
          <td><a href="FicheJoueur.aspx?Id=101">MARTIN Louis</a></td>
          <td>A</td><td></td><td>1600</td><td>1550</td><td>1500</td><td>SenM</td><td>FRA</td><td>Paris Club</td>
        </tr>
        <tr class="liste_fonce">
          <td>B22222</td>
          <td><a href="FicheJoueur.aspx?Id=102">MARTIN Louis</a></td>
          <td>A</td><td></td><td>1700</td><td>1650</td><td>1600</td><td>VetM</td><td>FRA</td><td>Lyon Club</td>
        </tr>
      </table>
    `;

    vi.spyOn(fetcher, "fetchFfePage").mockResolvedValue(fakeHtml);

    const result = await searchFfePlayers({ nom: "MARTIN", prenom: "Louis" });
    expect(result.status).toBe("HOMONYMS");
    expect(result.count).toBe(2);
    expect(result.players).toHaveLength(2);
    expect(result.players[0].nrFFE).toBe("A11111");
    expect(result.players[1].nrFFE).toBe("B22222");

    vi.restoreAllMocks();
  });

  it("filters accurately by club with accent/hyphen tolerance", async () => {
    const fakeHtml = `
      <table>
        <tr class="liste_clair">
          <td>A11111</td>
          <td><a href="FicheJoueur.aspx?Id=101">MARTIN Louis</a></td>
          <td>A</td><td></td><td>1600</td><td>1550</td><td>1500</td><td>SenM</td><td>FRA</td><td>Marseille-Échecs</td>
        </tr>
        <tr class="liste_fonce">
          <td>B22222</td>
          <td><a href="FicheJoueur.aspx?Id=102">MARTIN Louis</a></td>
          <td>A</td><td></td><td>1700</td><td>1650</td><td>1600</td><td>VetM</td><td>FRA</td><td>Lyon Club</td>
        </tr>
      </table>
    `;

    vi.spyOn(fetcher, "fetchFfePage").mockResolvedValue(fakeHtml);

    // Recherche avec filtre "Marseille Echecs" sans accent et avec espace
    const result = await searchFfePlayers({
      nom: "MARTIN",
      prenom: "Louis",
      club: "marseille echecs",
    });

    expect(result.status).toBe("EXACT");
    expect(result.count).toBe(1);
    expect(result.players[0].club).toBe("Marseille-Échecs");

    vi.restoreAllMocks();
  });
});
