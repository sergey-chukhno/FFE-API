/*************************************************************
 * SERVICES METIER
 *************************************************************/
function ffeRechercheNominal(nom, prenom) {
  if (!nom) return { error: "Paramètre 'Nom' manquant" };

  let joueurs = fetchPlayersList(nom, prenom);

  if (!joueurs.length) return { error: "Joueur Non trouvé" };

  if (WITH_FIDE) {
    enrichWithFideIds(joueurs); // <-- ne pas réassigner
  }

  return { joueurs: joueurs };
}

function ffeRechercheNominalClub(nom, prenom, club) {
  if (!nom) return { error: "Paramètre 'Nom' manquant" };
  if (!club) return { error: "Paramètre 'Club' manquant" };

  const clubCible = normalizeForMatch(club);
  let joueurs = fetchPlayersList(nom, prenom);

  joueurs = joueurs.filter(j => normalizeForMatch(j.Club()).includes(clubCible));

  if (!joueurs.length) return { error: "Joueur non trouvé dans ce club" };

  if (WITH_FIDE) {
    enrichWithFideIds(joueurs); // <-- ne pas réassigner
  }

  return { joueurs: joueurs };
}

function ffeRechercheClubRef(club) {
  if (!club) return { error: "Paramètre 'Club' manquant" };

  try {
    //const clubs = fetchClubRef(club);
    const clubs = resolveClubCodesFromInput(club);
    if (!clubs || clubs.length === 0) {
      return { error: "Aucun club trouvé", count: 0, clubs: [] };
    }

    return { clubs: clubs, count: clubs.length };

  } catch (e) {
    return { error: e.message, count: 0, clubs: [] };
  }
}

function ffeRechercheClubJoueurs(club, taskId) {
  if (!club) return { error: "Paramètre 'Club' manquant" };

  try {
    //const joueurs = fetchPlayersListClub(club);
    const joueurs = fetchPlayersListClub(club, taskId); // Propagation

    if (!joueurs || joueurs.length === 0) {
      return { error: "Aucun joueur trouvé pour ce club", count: 0, joueurs: [] };
    }

    if (WITH_FIDE) {
      enrichWithFideIds(joueurs);
    }

    return { joueurs: joueurs, count: joueurs.length };

  } catch (e) {
    return { error: e.message, count: 0, joueurs: [] };
  }
}
