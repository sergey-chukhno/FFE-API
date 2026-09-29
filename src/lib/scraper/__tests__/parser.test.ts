import { describe, it, expect } from "vitest";
import {
  parseFfePlayersTable,
  parseFfeClubsTable,
  extractTotalPages,
  extractViewState,
} from "../parser";

describe("Scraper - HTML Parsers", () => {
  const sampleFfeHtml = `
    <table class="table-results">
      <tr class="liste_titre">
        <th>NrFFE</th><th>Nom Prénom</th><th>Af</th><th>Titre</th><th>Elo</th><th>Rapide</th><th>Blitz</th><th>Cat</th><th>Fede</th><th>Club</th>
      </tr>
      <tr class="liste_clair">
        <td>X12345</td>
        <td><a href="FicheJoueur.aspx?Id=98765">CHUKHNO Sergey</a></td>
        <td>A</td>
        <td></td>
        <td>1850</td>
        <td>1820</td>
        <td>1790</td>
        <td>SenM</td>
        <td>FRA</td>
        <td>Marseille-Échecs</td>
      </tr>
      <tr class="liste_fonce">
        <td>Y67890</td>
        <td><a href="FicheJoueur.aspx?Id=54321">DUPONT Jean</a></td>
        <td>B</td>
        <td></td>
        <td>1500</td>
        <td>1480</td>
        <td>1450</td>
        <td>VetM</td>
        <td>FRA</td>
        <td>Cannes Échecs</td>
      </tr>
      <tr class="liste_clair">
        <td>INVALID_ROW</td>
        <td>IGNORED</td>
      </tr>
    </table>
  `;

  describe("parseFfePlayersTable", () => {
    it("extracts valid players from alternating table rows matching FFE layout", () => {
      const players = parseFfePlayersTable(sampleFfeHtml);
      expect(players).toHaveLength(2);

      const p1 = players[0];
      expect(p1.nrFFE).toBe("X12345");
      expect(p1.nomPrenom).toBe("CHUKHNO Sergey");
      expect(p1.nom).toBe("CHUKHNO");
      expect(p1.prenom).toBe("Sergey");
      expect(p1.af).toBe("A");
      expect(p1.elo).toBe("1850");
      expect(p1.rapide).toBe("1820");
      expect(p1.blitz).toBe("1790");
      expect(p1.cat).toBe("SenM");
      expect(p1.club).toBe("Marseille-Échecs");
      expect(p1.idFFE).toBe("98765");
      expect(p1.lienFFE).toBe("https://www.echecs.asso.fr/FicheJoueur.aspx?Id=98765");

      const p2 = players[1];
      expect(p2.nrFFE).toBe("Y67890");
      expect(p2.nom).toBe("DUPONT");
      expect(p2.prenom).toBe("Jean");
      expect(p2.af).toBe("B");
      expect(p2.club).toBe("Cannes Échecs");
      expect(p2.idFFE).toBe("54321");
    });

    it("deduplicates multiple identical NrFFE rows cleanly", () => {
      const duplicateHtml = sampleFfeHtml + sampleFfeHtml;
      const players = parseFfePlayersTable(duplicateHtml);
      expect(players).toHaveLength(2);
    });

    it("returns empty array for empty or missing input", () => {
      expect(parseFfePlayersTable("")).toEqual([]);
    });
  });

  describe("extractTotalPages", () => {
    it("extracts highest page number from ASP.NET doPostBack signatures", () => {
      const paginatedHtml = `
        <div class="pager">
          <a href="javascript:__doPostBack('ctl00$Pager','1')">1</a>
          <a href="javascript:__doPostBack('ctl00$Pager','2')">2</a>
          <a href="javascript:__doPostBack('ctl00$Pager','4')">4</a>
          <a href="javascript:__doPostBack('ctl00$Pager','3')">3</a>
        </div>
      `;
      expect(extractTotalPages(paginatedHtml)).toBe(4);
    });

    it("defaults to 1 if no pager is present", () => {
      expect(extractTotalPages("<div>Page unique</div>")).toBe(1);
    });
  });

  describe("extractViewState", () => {
    it("extracts __VIEWSTATE and __VIEWSTATEGENERATOR correctly", () => {
      const aspNetHtml = `
        <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="wEPDwULLTE4MDI1" />
        <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="CA0B0334" />
      `;
      const state = extractViewState(aspNetHtml);
      expect(state.viewState).toBe("wEPDwULLTE4MDI1");
      expect(state.viewStateGenerator).toBe("CA0B0334");
    });
  });

  describe("parseFfeClubsTable", () => {
    it("extracts clubs from Dep table structure", () => {
      const clubHtml = `
        <table>
          <tr><th>Dep.</th><th>Ligue</th><th>Club</th></tr>
          <tr>
            <td>13</td>
            <td>PAC</td>
            <td><a href="FicheClub.aspx?Ref=1234">Marseille Echecs</a></td>
          </tr>
        </table>
      `;
      const clubs = parseFfeClubsTable(clubHtml);
      expect(clubs).toHaveLength(1);
      expect(clubs[0].nom).toBe("Marseille Echecs");
      expect(clubs[0].ref).toBe("1234");
    });
  });
});
