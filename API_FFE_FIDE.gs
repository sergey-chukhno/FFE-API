/*************************************************************
 * ENRICHISSEMENT FIDE
 *************************************************************/
function enrichWithFideIds(joueurs) {
  joueurs.forEach(j => {
    try {
      const ffeId = getFFEId(j);
      if (!ffeId) {
        j.m_idFIDE = "?";
        return;
      }

      const ficheHtml = UrlFetchApp.fetch(`https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${ffeId}`).getContentText();
      const fideMatch = ficheHtml.match(/ratings\.fide\.com\/profile\/(\d+)/);
      j.m_idFIDE = fideMatch ? fideMatch[1] : "?";

    } catch(e) {
      console.log(`Erreur pour ${j.NP()}: ${e}`);
      j.m_idFIDE = "?";
    }
  });
}

function getFFEId(joueur) {
  const searchUrl = `https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=FFE&JrNom=${encodeURIComponent(joueur.NP().split(" ")[0])}&JrPrenom=${encodeURIComponent(joueur.NP().split(" ")[1]||"")}`;
  const html = UrlFetchApp.fetch(searchUrl).getContentText();

  // On récupère le vrai Id depuis le lien "FicheJoueur.aspx?Id=..."
  const match = html.match(/FicheJoueur\.aspx\?Id=(\d+)/);
  if (match) return match[1];
  return null;
}