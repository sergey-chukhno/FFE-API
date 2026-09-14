/**************************************
 * API EXPOSEE AUX TESTS
 **************************************/

function RECHERCHE_FFE_NOMINAL(nom, prenom) {
  const result = ffeRechercheNominal(nom, prenom);
  if (result.error) return result.error;

  if (result.joueurs.length === 1)
    return result.joueurs[0].toString();

  return formatHomonymes(result.joueurs);
}


function RECHERCHE_FFE_NOMINAL_CLUB(nom, prenom, club) {
  const result = ffeRechercheNominalClub(nom, prenom, club);
  if (result.error) return result.error;

  if (result.joueurs.length === 1)
    return result.joueurs[0].toString();

  return formatHomonymes(result.joueurs);
}

function RECHERCHE_FFE_CLUB_REF(club) {
  const result = ffeRechercheClubRef(club);
  if (result.error) return result.error;

  if (result.clubs.length === 1)
    return result.clubs[0].toString();

  return formatListeClubs(result.clubs);
}

function RECHERCHE_FFE_CLUB_JOUEURS(club) {
  const result = ffeRechercheClubJoueurs(club);
  if (result.error) return result.error;

  if (result.joueurs.length === 1)
    return result.joueurs[0].toString();

  return formatHomonymes(result.joueurs);
}

/*************************************************************
 * UTILITAIRES AFFICHAGE STRING
 *************************************************************/
function formatListeJoueurs(joueurs) {
  return joueurs.map((j, i) => (i + 1) + ") " + j.toString()).join("\n");
}

// Format pour homonymes : "Attention : Homonymes (n)" + liste
function formatHomonymes(joueurs) {

  if (!joueurs || !joueurs.length) return "";

  const count = joueurs.length;

  const lignes = joueurs.map((j, i) =>
    `   ${i + 1}) ${j.toString()}`
  );

  return `Homonymes (${count})\n${lignes.join("\n")}`;
}

function formatListeClubs(clubs) {
  if (!clubs || !clubs.length) return "";
  const count = clubs.length;
  const lines = clubs.map((c, i) => (i + 1) + ") " + c.toString());
  return `Attention : Plusieurs clubs (${count})\n` + lines.join("\n");
}

/*************************************************************
 * WEB APP
 *************************************************************/
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Recherche FFE");
}
