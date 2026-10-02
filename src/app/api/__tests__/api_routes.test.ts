import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as verifyBatchHandler } from "../verify-batch/route";
import { GET as playersSearchHandler } from "../players/search/route";
import { GET as clubStatusHandler } from "../club/status/route";
import { NextRequest } from "next/server";
import { upsertPlayers, logSync, clearMemoryDb } from "@/lib/db/repository";
import { Player } from "@/lib/scraper/types";
import * as scraperService from "@/lib/scraper/service";

describe("API Backend Routes - Step 6 Integration Tests", () => {
  const mockMaxime: Player = {
    nrFFE: "X81304",
    nomPrenom: "CHUKHNO Maxime",
    nom: "CHUKHNO",
    prenom: "Maxime",
    af: "A",
    elo: "1471 F",
    rapide: "1472 F",
    blitz: "799 E",
    cat: "PouM",
    club: "Marseille-Echecs",
    idFFE: "1242503",
    statut: "ACTIF",
  };

  const mockAlice: Player = {
    nrFFE: "A12345",
    nomPrenom: "DUPONT Alice",
    nom: "DUPONT",
    prenom: "Alice",
    af: "B",
    elo: "1600",
    rapide: "1550",
    blitz: "1500",
    cat: "BenF",
    club: "Marseille-Echecs",
    idFFE: "99991",
    statut: "ACTIF",
  };

  beforeEach(async () => {
    clearMemoryDb();
    vi.restoreAllMocks();
    await upsertPlayers([mockMaxime, mockAlice]);
  });

  describe("POST /api/verify-batch", () => {
    it("verifies a batch from Excel rows, distinguishing Licence A and B in < 50ms", async () => {
      const excelRows = [
        {
          "Nom participant": "CHUKHNO",
          "Prénom participant": "Maxime",
          "N° Licence": "X81304",
          "Paiement": "Payé en ligne",
        },
        {
          "Nom participant": "DUPONT",
          "Prénom participant": "Alice",
          "N° Licence": "A12345",
          "Paiement": "Chèque",
        },
        {
          "Nom participant": "INCONNU",
          "Prénom participant": "Jean",
          "N° Licence": "Z99999", // N'existe pas
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/verify-batch", {
        method: "POST",
        body: JSON.stringify({ rows: excelRows }),
      });

      const res = await verifyBatchHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Statistiques globales
      expect(data.stats.total).toBe(3);
      expect(data.stats.verifiedCount).toBe(2);
      expect(data.stats.verifiedA).toBe(1); // Maxime (Licence A)
      expect(data.stats.verifiedB).toBe(1); // Alice (Licence B)
      expect(data.stats.unverifiedCount).toBe(1); // Inconnu
      expect(data.stats.durationMs).toBeLessThan(50);

      // Détail des vérifiés
      expect(data.verified).toHaveLength(2);
      expect(data.verified[0].player.nom).toBe("CHUKHNO");
      expect(data.verified[0].player.af).toBe("A");
      expect(data.verified[1].player.nom).toBe("DUPONT");
      expect(data.verified[1].player.af).toBe("B");

      // Détail des non vérifiés
      expect(data.unverified).toHaveLength(1);
      expect(data.unverified[0].inputNom).toBe("INCONNU");
    });

    it("handles hybrid resolution when a row has only Nom and Prénom without licence", async () => {
      const req = new NextRequest("http://localhost:3000/api/verify-batch", {
        method: "POST",
        body: JSON.stringify({
          players: [
            { nom: "CHUKHNO", prenom: "Maxime" }, // Pas de licence dans la ligne
          ],
        }),
      });

      const res = await verifyBatchHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stats.verifiedCount).toBe(1);
      expect(data.verified[0].player.nrFfe).toBe("X81304");
      expect(data.verified[0].matchType).toBe("NAME_EXACT");
    });
  });

  describe("GET /api/players/search", () => {
    it("searches locally in database when player is in Marseille-Echecs", async () => {
      const req = new NextRequest("http://localhost:3000/api/players/search?q=chukhno");
      const res = await playersSearchHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.source).toBe("LOCAL_DATABASE");
      expect(data.count).toBe(1);
      expect(data.players[0].nom).toBe("CHUKHNO");
    });

    it("falls back to live FFE scraping when requested or not found locally", async () => {
      vi.spyOn(scraperService, "searchFfePlayers").mockResolvedValue({
        status: "EXACT",
        count: 1,
        players: [
          {
            nrFFE: "K54321",
            nomPrenom: "KASPAROV Garry",
            nom: "KASPAROV",
            prenom: "Garry",
            af: "A",
            elo: "2812",
            rapide: "2800",
            blitz: "2820",
            cat: "VetM",
            club: "Paris Club",
            idFFE: "1001",
          },
        ],
      });

      const req = new NextRequest("http://localhost:3000/api/players/search?q=kasparov&live=true");
      const res = await playersSearchHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.source).toBe("FFE_OFFICIAL_SCRAPER");
      expect(data.players[0].nom).toBe("KASPAROV");
    });

    it("returns 400 error when query parameter is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/players/search");
      const res = await playersSearchHandler(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/club/status", () => {
    it("returns total players and latest sync log for UI header banner", async () => {
      await logSync({
        clubCode: "N06013",
        status: "SUCCESS",
        playersSynced: 342,
        durationMs: 3850,
      });

      const res = await clubStatusHandler();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.clubCode).toBe("N06013");
      expect(data.totalPlayers).toBe(2);
      expect(data.lastSync.status).toBe("SUCCESS");
      expect(data.lastSync.playersSynced).toBe(342);
      expect(data.lastSync.durationMs).toBe(3850);
    });
  });
});
