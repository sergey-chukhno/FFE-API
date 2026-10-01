import { describe, it, expect, beforeEach } from "vitest";
import {
  upsertPlayers,
  getPlayersByLicences,
  searchLocalPlayers,
  logSync,
  getLatestSyncLog,
  getPlayersCount,
  clearMemoryDb,
} from "../repository";
import { toPlayerRecord } from "../schema";
import { Player } from "../../scraper/types";

describe("Database Repository - Persistence & Batch Queries", () => {
  beforeEach(() => {
    clearMemoryDb();
  });

  const mockPlayer1: Player = {
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
    lienFFE: "https://www.echecs.asso.fr/FicheJoueur.aspx?Id=1242503",
    statut: "ACTIF",
  };

  const mockPlayer2: Player = {
    nrFFE: "A12345",
    nomPrenom: "MARTIN Louis",
    nom: "MARTIN",
    prenom: "Louis",
    af: "B",
    elo: "1600",
    rapide: "1580",
    blitz: "1550",
    cat: "SenM",
    club: "Marseille-Echecs",
    idFFE: "54321",
    statut: "ACTIF",
  };

  describe("toPlayerRecord conversion", () => {
    it("correctly generates normalized fields for indexing", () => {
      const record = toPlayerRecord(mockPlayer1);
      expect(record.nrFfe).toBe("X81304");
      expect(record.nomNormalized).toBe("chukhno");
      expect(record.prenomNormalized).toBe("maxime");
      expect(record.lienFfe).toBe("https://www.echecs.asso.fr/FicheJoueur.aspx?Id=1242503");
    });
  });

  describe("upsertPlayers", () => {
    it("inserts new players and updates existing on conflict without duplicates", async () => {
      const count1 = await upsertPlayers([mockPlayer1, mockPlayer2]);
      expect(count1).toBe(2);
      expect(await getPlayersCount()).toBe(2);

      // Mise à jour de l'Elo de Maxime
      const updatedPlayer1: Player = {
        ...mockPlayer1,
        elo: "1520 F",
      };

      const count2 = await upsertPlayers([updatedPlayer1]);
      expect(count2).toBe(1);
      expect(await getPlayersCount()).toBe(2); // Pas de doublon !

      const retrieved = await getPlayersByLicences(["X81304"]);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].elo).toBe("1520 F");
    });
  });

  describe("getPlayersByLicences (Batch Verification)", () => {
    it("retrieves players in batch with case-insensitivity in < 50ms", async () => {
      await upsertPlayers([mockPlayer1, mockPlayer2]);

      const t0 = performance.now();
      // Test avec minuscules et espaces
      const results = await getPlayersByLicences(["x81304", " A12345 ", "NON_EXISTANT"]);
      const duration = performance.now() - t0;

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.nrFfe).sort()).toEqual(["A12345", "X81304"]);
      expect(duration).toBeLessThan(50); // Performance garantie
    });

    it("returns empty array when given empty input", async () => {
      const results = await getPlayersByLicences([]);
      expect(results).toEqual([]);
    });
  });

  describe("searchLocalPlayers", () => {
    it("searches players with accent and case tolerance", async () => {
      await upsertPlayers([mockPlayer1, mockPlayer2]);

      const byName = await searchLocalPlayers("chukhno");
      expect(byName).toHaveLength(1);
      expect(byName[0].nom).toBe("CHUKHNO");

      const byFirstName = await searchLocalPlayers("louis");
      expect(byFirstName).toHaveLength(1);
      expect(byFirstName[0].nom).toBe("MARTIN");
    });
  });

  describe("logSync & getLatestSyncLog", () => {
    it("records a cron sync log and retrieves the latest one for UI banner", async () => {
      const log1 = await logSync({
        clubCode: "N06013",
        status: "SUCCESS",
        playersSynced: 342,
        durationMs: 4120,
      });

      expect(log1.id).toBeDefined();
      expect(log1.status).toBe("SUCCESS");
      expect(log1.playersSynced).toBe(342);

      const latest = await getLatestSyncLog();
      expect(latest).not.toBeNull();
      expect(latest?.clubCode).toBe("N06013");
      expect(latest?.playersSynced).toBe(342);
      expect(latest?.status).toBe("SUCCESS");
    });
  });
});
