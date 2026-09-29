/*************************************************************
 * COUCHE JSON
 *************************************************************/
function RECHERCHE_FFE_NOMINAL_JSON(nom, prenom) {
  const result = ffeRechercheNominal(nom, prenom);
  if (result.error) return { error: result.error };

  return {
    count: result.joueurs.length,
    joueurs: result.joueurs.map(j => j.toJSON())
  };
}

function RECHERCHE_FFE_NOMINAL_CLUB_JSON(nom, prenom, club) {
  const result = ffeRechercheNominalClub(nom, prenom, club);
  if (result.error) return { error: result.error };

  return {
    count: result.joueurs.length,
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

function RECHERCHE_FFE_CLUB_JOUEURS_JSON(club, taskId) {
  const result = ffeRechercheClubJoueurs(club, taskId); // Propagation

  if (result.error) {
    return { error: result.error, count: 0, joueurs: [] };
  }

  return {
    count: result.joueurs.length,
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
