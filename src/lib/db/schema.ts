/**
 * Schéma relationnel et types pour la persistance PostgreSQL
 * Auteur : Sergey CHUKHNO
 */

import { Player } from "../scraper/types";
import { normalizeForMatch, removeAccents } from "../scraper/normalization";

export interface PlayerRecord {
  nrFfe: string;              // Clé primaire (ex: "X81304")
  nomPrenom: string;          // Format officiel FFE (ex: "CHUKHNO Maxime")
  nom: string;                // Nom de famille en majuscules (ex: "CHUKHNO")
  prenom: string;             // Prénom (ex: "Maxime")
  nomNormalized: string;      // Nom sans accent/tiret pour index SQL B-Tree
  prenomNormalized: string;   // Prénom sans accent pour index SQL B-Tree
  af: string;                 // Type de licence / affiliation (ex: "A", "B", "")
  elo: string;                // Elo Standard
  rapide: string;             // Elo Rapide
  blitz: string;              // Elo Blitz
  cat: string;                // Catégorie (ex: "PouM", "SenM")
  club: string;               // Club (ex: "Marseille-Echecs")
  idFfe: string;              // Identifiant interne FFE (ex: "1242503")
  idFide: string | null;      // Identifiant FIDE international (optionnel)
  lienFfe: string | null;     // URL directe fiche FFE
  updatedAt: Date;            // Horodatage de dernière synchronisation
}

export type SyncStatus = "SUCCESS" | "PARTIAL" | "FAILED";

export interface SyncLogRecord {
  id: number;
  clubCode: string;
  status: SyncStatus;
  playersSynced: number;
  durationMs: number;
  errorMessage: string | null;
  createdAt: Date;
}

/**
 * Convertit un objet joueur issu du scraper vers la structure de persistance SQL.
 */
export function toPlayerRecord(player: Player): Omit<PlayerRecord, "updatedAt"> & { updatedAt?: Date } {
  return {
    nrFfe: player.nrFFE.toUpperCase().trim(),
    nomPrenom: player.nomPrenom || `${player.nom} ${player.prenom}`.trim(),
    nom: player.nom.toUpperCase().trim(),
    prenom: player.prenom.trim(),
    nomNormalized: normalizeForMatch(player.nom),
    prenomNormalized: normalizeForMatch(player.prenom),
    af: player.af || "",
    elo: player.elo || "0",
    rapide: player.rapide || "0",
    blitz: player.blitz || "0",
    cat: player.cat || "",
    club: player.club || "Marseille-Echecs",
    idFfe: player.idFFE || "",
    idFide: player.idFIDE || null,
    lienFfe: player.lienFFE || (player.idFFE ? `https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${player.idFFE}` : null),
  };
}

/**
 * Définition DDL SQL des tables et index de haute performance.
 */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS players (
  nr_ffe VARCHAR(20) PRIMARY KEY,
  nom_prenom VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom_normalized VARCHAR(100) NOT NULL,
  prenom_normalized VARCHAR(100) NOT NULL,
  af VARCHAR(10) DEFAULT '',
  elo VARCHAR(20) DEFAULT '0',
  rapide VARCHAR(20) DEFAULT '0',
  blitz VARCHAR(20) DEFAULT '0',
  cat VARCHAR(20) DEFAULT '',
  club VARCHAR(255) NOT NULL DEFAULT 'Marseille-Echecs',
  id_ffe VARCHAR(50) DEFAULT '',
  id_fide VARCHAR(50),
  lien_ffe TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_nom_norm ON players(nom_normalized);
CREATE INDEX IF NOT EXISTS idx_players_prenom_norm ON players(prenom_normalized);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club);

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  club_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  players_synced INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
`;
