/**
 * Typages stricts pour le moteur de scraping FFE v1.1
 * Auteur : Sergey CHUKHNO
 */

export interface Player {
  nrFFE: string;       // ex: "X12345"
  nomPrenom: string;   // ex: "CHUKHNO Sergey" (champ historique "np")
  nom: string;         // ex: "CHUKHNO"
  prenom: string;      // ex: "Sergey"
  af: string;          // Affiliation / statut licence (ex: "A", "B", "")
  elo: string;         // Elo FIDE / Standard
  rapide: string;      // Elo Rapide
  blitz: string;       // Elo Blitz
  cat: string;         // Catégorie d'âge (ex: "SenM", "VetM", "CadM")
  club: string;        // Nom du club (ex: "Marseille-Échecs")
  idFFE: string;       // Identifiant interne FFE (FicheJoueur.aspx?Id=XXXXX)
  idFIDE?: string;     // Identifiant FIDE (optionnel)
  lienFFE?: string;    // URL directe vers la fiche FFE
  statut?: "ACTIF" | "INACTIF" | "HOMONYME" | "NON_TROUVE";
}

export interface Club {
  nom: string;         // Nom du club (ex: "Marseille-Echecs")
  ref: string;         // Référence FicheClub (ex: "1234")
  code: string;        // Code club FFE à 6 caractères (ex: "N06013")
}

export interface SearchOptions {
  nom: string;
  prenom?: string;
  club?: string;
  ligue?: string;
  strict?: boolean;
}

export type SearchStatus = "EXACT" | "HOMONYMS" | "NOT_FOUND" | "ERROR";

export interface SearchResult {
  status: SearchStatus;
  players: Player[];
  count: number;
  error?: string;
}
