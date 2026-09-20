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

/**
 * Vérifie un lot de participants (import Excel) de façon optimisée.
 * Résout les licences en lot via ChessXP batch si des numéros de licence sont fournis,
 * ou via la recherche hybride nominale filtrée par club.
 *
 * @param {Array<Object>} participants - Liste des participants [{ nom, prenom, licence, paiement }]
 * @param {string} clubCible - Nom du club cible pour filtrer l'appartenance
 * @param {boolean} [forceScraping=false] - Forcer le scraping direct FFE
 * @returns {Array<Object>} Liste des résultats détaillés
 */
function ffeVerifierLicencesBatch(participants, clubCible, forceScraping = false) {
  if (!participants || !Array.isArray(participants)) return [];

  const licenceMap = new Map();
  const licencesToQuery = [];

  if (!forceScraping) {
    participants.forEach(p => {
      const lic = (p.licence || p.nrFFE || "").trim().toUpperCase();
      if (lic && /^[A-Z][0-9]+/.test(lic)) {
        licencesToQuery.push(lic);
      }
    });

    // Requêtes batch ChessXP par tranches de 50
    for (let i = 0; i < licencesToQuery.length; i += 50) {
      const chunk = licencesToQuery.slice(i, i + 50);
      try {
        const batchResults = chessXpGetPlayersBatch(chunk);
        batchResults.forEach(j => {
          if (j && j.NrFFE()) {
            licenceMap.set(j.NrFFE().toUpperCase(), j);
          }
        });
      } catch (e) {
        if (DEBUG) Logger.log("Erreur batch licences: " + e.message);
      }
    }
  }

  const resultats = [];

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const nom = (p.nom || p.nomExport || "").trim();
    const prenom = (p.prenom || p.prenomExport || "").trim();
    const lic = (p.licence || p.nrFFE || "").trim().toUpperCase();
    const paiement = (p.paiement || "").trim();

    let joueurTrouve = null;

    // 1. Si on a trouvé la licence via le batch ChessXP
    if (lic && licenceMap.has(lic)) {
      joueurTrouve = licenceMap.get(lic);
    }

    // 2. Sinon recherche nominale filtrée par club via la couche hybride
    if (!joueurTrouve && (nom || prenom)) {
      const res = ffeRechercheNominalClub(nom, prenom, clubCible, forceScraping);
      if (res && res.joueurs && res.joueurs.length > 0) {
        joueurTrouve = res.joueurs[0];
      }
    }

    resultats.push({
      nomExport: nom,
      prenomExport: prenom,
      paiement: paiement,
      nrFFE: joueurTrouve ? joueurTrouve.NrFFE() : "-",
      npFFE: joueurTrouve ? joueurTrouve.NP() : "-",
      af: joueurTrouve ? joueurTrouve.Af() : "-",
      elo: joueurTrouve ? joueurTrouve.Elo() : "-",
      club: joueurTrouve ? joueurTrouve.Club() : "-",
      trouve: !!joueurTrouve,
      source: joueurTrouve ? (joueurTrouve.Source ? joueurTrouve.Source() : (joueurTrouve.source || "CHESSXP")) : null,
      lienFFE: joueurTrouve && joueurTrouve.IdFFE()
        ? `https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${joueurTrouve.IdFFE()}`
        : null,
      lienFIDE: joueurTrouve && joueurTrouve.IdFIDE()
        ? `https://ratings.fide.com/profile/${joueurTrouve.IdFIDE()}`
        : null
    });
  }

  return resultats;
}


