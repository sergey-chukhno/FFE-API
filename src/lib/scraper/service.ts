/**
 * Service de haut niveau orchestrant le scraping FFE officiel.
 * Auteur : Sergey CHUKHNO
 */

import { fetchFfePage } from "./fetcher";
import { parseFfePlayersTable, parseFfeClubsTable, extractTotalPages, extractViewState } from "./parser";
import { buildSearchVariantes, normalizeForMatch, removeAccents } from "./normalization";
import { Player, Club, SearchOptions, SearchResult } from "./types";

const FFE_BASE_URL = "https://www.echecs.asso.fr";

/**
 * Recherche des joueurs FFE par nom, prénom et éventuellement club.
 * Gère les variantes de tirets/espaces/accents et retourne l'intégralité des homonymes.
 */
export async function searchFfePlayers(options: SearchOptions): Promise<SearchResult> {
  const { nom, prenom, club, strict = false } = options;

  if (!nom || !nom.trim()) {
    return {
      status: "ERROR",
      players: [],
      count: 0,
      error: "Paramètre 'nom' obligatoire.",
    };
  }

  const variantes = buildSearchVariantes(nom, strict);
  const prenomNormalized = strict
    ? (prenom || "").trim()
    : removeAccents((prenom || "").trim());

  const allPlayersMap = new Map<string, Player>();

  for (const n of variantes) {
    const url = `${FFE_BASE_URL}/ListeJoueurs.aspx?Action=FFE&JrNom=${encodeURIComponent(
      n
    )}&JrPrenom=${encodeURIComponent(prenomNormalized)}`;

    try {
      const html = await fetchFfePage(url);
      const players = parseFfePlayersTable(html);

      for (const p of players) {
        if (!allPlayersMap.has(p.nrFFE)) {
          allPlayersMap.set(p.nrFFE, p);
        }
      }
    } catch (err: unknown) {
      // Tolérance aux erreurs réseau sur une variante individuelle
      console.error(`Erreur recherche variante ${n}:`, err);
    }
  }

  let players = Array.from(allPlayersMap.values());

  // Filtrage par club si spécifié
  if (club && club.trim()) {
    const clubCible = normalizeForMatch(club);
    players = players.filter((p) =>
      normalizeForMatch(p.club).includes(clubCible)
    );
  }

  const count = players.length;

  if (count === 0) {
    return {
      status: "NOT_FOUND",
      players: [],
      count: 0,
      error: club ? "Joueur non trouvé dans ce club." : "Joueur non trouvé.",
    };
  }

  if (count === 1) {
    return {
      status: "EXACT",
      players,
      count: 1,
    };
  }

  return {
    status: "HOMONYMS",
    players,
    count,
  };
}

/**
 * Résout les clubs FFE à partir d'un mot-clé ou nom de club.
 */
export async function resolveClub(clubInput: string): Promise<Club[]> {
  if (!clubInput || !clubInput.trim()) return [];

  const variantes = buildSearchVariantes(clubInput);
  let clubs: Club[] = [];

  for (const v of variantes) {
    const url = `${FFE_BASE_URL}/ListeClubs.aspx?Action=CLUB`;
    const body = new URLSearchParams({ ClubNom: v });

    try {
      const html = await fetchFfePage(url, {
        method: "POST",
        body: body.toString(),
      });

      clubs = parseFfeClubsTable(html);
      if (clubs.length > 0) break;
    } catch (err) {
      console.error(`Erreur recherche club ${v}:`, err);
    }
  }

  // Enrichissement avec le code club (ex: N06013) depuis la fiche club
  for (const c of clubs) {
    try {
      const ficheUrl = `${FFE_BASE_URL}/FicheClub.aspx?Ref=${encodeURIComponent(c.ref)}`;
      const ficheHtml = await fetchFfePage(ficheUrl, { timeoutMs: 5000 });
      const match = ficheHtml.match(/FicheComite\.aspx\?Ref=[^"]+">([A-Z][A-Z0-9]{5})/i);
      if (match) {
        c.code = match[1];
      }
    } catch {
      // Ignorer si la fiche ne répond pas rapidement
    }
  }

  return clubs;
}

/**
 * Télécharge la totalité des licenciés d'un club (ex: Marseille-Échecs)
 * en gérant la pagination ASP.NET multi-pages (__VIEWSTATE, __EVENTTARGET).
 */
export async function fetchAllClubMembers(
  clubCode: string,
  onProgress?: (current: number, total: number) => void
): Promise<Player[]> {
  if (!clubCode) return [];

  const listUrl = `${FFE_BASE_URL}/ListeJoueurs.aspx?Action=CLUBCODE&ClubCode=${encodeURIComponent(
    clubCode
  )}`;

  // 1. Page 1 (GET)
  const firstHtml = await fetchFfePage(listUrl);
  const totalPages = extractTotalPages(firstHtml);
  let { viewState, viewStateGenerator } = extractViewState(firstHtml);

  const allPlayersMap = new Map<string, Player>();

  // Parsing page 1
  for (const p of parseFfePlayersTable(firstHtml)) {
    allPlayersMap.set(p.nrFFE, p);
  }

  if (onProgress) {
    onProgress(1, totalPages);
  }

  // 2. Pages suivantes (POST ASP.NET)
  for (let page = 2; page <= totalPages; page++) {
    const postBody = new URLSearchParams({
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      __EVENTTARGET: "ctl00$ContentPlaceHolderMain$PagerHeader",
      __EVENTARGUMENT: page.toString(),
    });

    try {
      const pageHtml = await fetchFfePage(listUrl, {
        method: "POST",
        body: postBody.toString(),
      });

      // Mise à jour de l'état pour la page suivante
      const nextState = extractViewState(pageHtml);
      if (nextState.viewState) {
        viewState = nextState.viewState;
      }
      if (nextState.viewStateGenerator) {
        viewStateGenerator = nextState.viewStateGenerator;
      }

      for (const p of parseFfePlayersTable(pageHtml)) {
        allPlayersMap.set(p.nrFFE, p);
      }

      if (onProgress) {
        onProgress(page, totalPages);
      }
    } catch (err) {
      console.error(`Erreur pagination club ${clubCode} page ${page}:`, err);
    }
  }

  return Array.from(allPlayersMap.values());
}
