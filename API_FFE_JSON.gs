/*************************************************************
 * COUCHE JSON
 *************************************************************/
function RECHERCHE_FFE_NOMINAL_JSON(nom, prenom, forceScraping = false) {
  const result = ffeRechercheNominal(nom, prenom, forceScraping);
  if (result.error) return { error: result.error, source: result.source || null };

  return {
    count: result.joueurs.length,
    source: result.source || "CHESSXP",
    joueurs: result.joueurs.map(j => j.toJSON())
  };
}

function RECHERCHE_FFE_NOMINAL_CLUB_JSON(nom, prenom, club, forceScraping = false) {
  const result = ffeRechercheNominalClub(nom, prenom, club, forceScraping);
  if (result.error) return { error: result.error, source: result.source || null };

  return {
    count: result.joueurs.length,
    source: result.source || "CHESSXP",
    joueurs: result.joueurs.map(j => j.toJSON())
  };
}

function RECHERCHE_FFE_CLUB_REF_JSON(club) {
  const result = ffeRechercheClubRef(club);

  if (result.error) {
    return { error: result.error, count: 0, clubs: [] };
  }

  return {
    count: result.clubs.length,
    clubs: result.clubs.map(c => c.toJSON())
  };
}

function RECHERCHE_FFE_CLUB_JOUEURS_JSON(club, taskId, forceScraping = false) {
  const result = ffeRechercheClubJoueurs(club, taskId, forceScraping);

  if (result.error) {
    return { error: result.error, count: 0, joueurs: [], source: result.source || null };
  }

  return {
    count: result.joueurs.length,
    source: result.source || "CHESSXP",
    joueurs: result.joueurs.map(j => j.toJSON())
  };
}

/*************************************************************
 * POLLING VIA CACHE SERVICE
 *************************************************************/
function getSearchProgress(taskId) {

  const cache = CacheService.getScriptCache();
  const progressStr = cache.get(taskId);

  Logger.log("PROGRESS READ → " + progressStr);

  if (progressStr) {
    return JSON.parse(progressStr);
  }

  return null;
}
