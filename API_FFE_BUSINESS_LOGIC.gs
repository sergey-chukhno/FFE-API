/*************************************************************
 * SERVICES METIER HYBRIDES (CHESSXP API + FALLBACK SCRAPING)
 *************************************************************/

/**
 * Recherche nominale d'un joueur avec stratégie hybride.
 * Tente d'abord l'API ChessXP ; bascule automatiquement sur le scraping FFE si aucun joueur n'est trouvé.
 *
 * @param {string} nom - Nom du joueur
 * @param {string} [prenom] - Prénom optionnel
 * @param {boolean} [forceScraping=false] - Si true, contourne l'API et interroge le site FFE en direct
 * @returns {{joueurs: Array<Joueur>, source: string}|{error: string}}
 */
function ffeRechercheNominal(nom, prenom, forceScraping = false) {
  if (!nom) return { error: "Paramètre 'Nom' manquant" };

  const hasPrenom = prenom && String(prenom).trim().length > 0;

  // 1. TENTATIVE VIA API CHESSXP (sauf si forçage scraping)
  if (!forceScraping) {
    try {
      const apiJoueurs = chessXpSearchPlayersByName(nom, prenom);
      // Si on cherche avec prénom précis ou si l'API retourne plusieurs homonymes (>1)
      if (apiJoueurs && apiJoueurs.length > 0) {
        if (hasPrenom || apiJoueurs.length > 1) {
          return { joueurs: apiJoueurs, source: "CHESSXP" };
        }
      }
    } catch (e) {
      if (DEBUG) Logger.log(`[FALLBACK ACTIVÉ] Erreur API ChessXP: ${e.message} → Bascule Scraping`);
    }
  }

  // 2. FALLBACK VERS SCRAPING OFFICIEL FFE
  let joueurs = fetchPlayersList(nom, prenom);

  if (!joueurs || !joueurs.length) {
    return { error: "Joueur Non trouvé" };
  }

  joueurs.forEach(j => { j.source = "FFE_SCRAPING"; });

  if (WITH_FIDE) {
    enrichWithFideIds(joueurs);
  }

  return { joueurs: joueurs, source: "FFE_SCRAPING" };
}

/**
 * Recherche nominale filtrée par club avec stratégie hybride et fallback.
 *
 * @param {string} nom - Nom du joueur
 * @param {string} [prenom] - Prénom optionnel
 * @param {string} club - Nom ou mot-clé du club
 * @param {boolean} [forceScraping=false] - Forcer le scraping direct FFE
 * @returns {{joueurs: Array<Joueur>, source: string}|{error: string}}
 */
function ffeRechercheNominalClub(nom, prenom, club, forceScraping = false) {
  if (!nom) return { error: "Paramètre 'Nom' manquant" };
  if (!club) return { error: "Paramètre 'Club' manquant" };

  const clubCible = normalizeForMatch(club);

  // 1. TENTATIVE VIA API CHESSXP
  if (!forceScraping) {
    try {
      const apiJoueurs = chessXpSearchPlayersByName(nom, prenom);
      if (apiJoueurs && apiJoueurs.length > 0) {
        const filtres = apiJoueurs.filter(j => normalizeForMatch(j.Club()).includes(clubCible));
        if (filtres.length > 0) {
          return { joueurs: filtres, source: "CHESSXP" };
        }
      }
    } catch (e) {
      if (DEBUG) Logger.log(`[FALLBACK ACTIVÉ] Erreur API ChessXP: ${e.message} → Bascule Scraping`);
    }
  }

  // 2. FALLBACK VERS SCRAPING FFE
  let joueurs = fetchPlayersList(nom, prenom);
  joueurs = joueurs.filter(j => normalizeForMatch(j.Club()).includes(clubCible));

  if (!joueurs.length) {
    return { error: "Joueur non trouvé dans ce club" };
  }

  joueurs.forEach(j => { j.source = "FFE_SCRAPING"; });

  if (WITH_FIDE) {
    enrichWithFideIds(joueurs);
  }

  return { joueurs: joueurs, source: "FFE_SCRAPING" };
}

function ffeRechercheClubRef(club) {
  if (!club) return { error: "Paramètre 'Club' manquant" };

  try {
    const clubs = resolveClubCodesFromInput(club);
    if (!clubs || clubs.length === 0) {
      return { error: "Aucun club trouvé", count: 0, clubs: [] };
    }
    return { clubs: clubs, count: clubs.length };
  } catch (e) {
    return { error: e.message, count: 0, clubs: [] };
  }
}

/**
 * Récupère l'effectif complet d'un club avec stratégie hybride.
 * Tente d'abord ChessXP (récupère tout le club en 1 seul appel sans scraping multi-pages).
 * En cas d'échec ou de forçage, bascule vers le scraping historique paginé.
 *
 * @param {string} club - Nom du club
 * @param {string} [taskId] - ID de tâche pour le cache d'avancement
 * @param {boolean} [forceScraping=false] - Forcer le scraping direct FFE
 * @returns {{joueurs: Array<Joueur>, count: number, source: string}|{error: string}}
 */
function ffeRechercheClubJoueurs(club, taskId, forceScraping = false) {
  if (!club) return { error: "Paramètre 'Club' manquant" };

  // 1. TENTATIVE VIA API CHESSXP
  if (!forceScraping) {
    try {
      const apiJoueurs = chessXpSearchPlayersByClub(club, { limit: 1000 });
      if (apiJoueurs && apiJoueurs.length > 0) {
        if (taskId) {
          const cache = CacheService.getScriptCache();
          cache.put(taskId, JSON.stringify({ current: apiJoueurs.length, total: apiJoueurs.length }), 600);
        }
        return { joueurs: apiJoueurs, count: apiJoueurs.length, source: "CHESSXP" };
      }
    } catch (e) {
      if (DEBUG) Logger.log(`[FALLBACK ACTIVÉ] Erreur Club API: ${e.message} → Bascule Scraping`);
    }
  }

  // 2. FALLBACK VERS SCRAPING FFE
  try {
    const joueurs = fetchPlayersListClub(club, taskId);

    if (!joueurs || joueurs.length === 0) {
      return { error: "Aucun joueur trouvé pour ce club", count: 0, joueurs: [] };
    }

    joueurs.forEach(j => { j.source = "FFE_SCRAPING"; });

    if (WITH_FIDE) {
      enrichWithFideIds(joueurs);
    }

    return { joueurs: joueurs, count: joueurs.length, source: "FFE_SCRAPING" };
  } catch (e) {
    return { error: e.message, count: 0, joueurs: [] };
  }
}

