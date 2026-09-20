/*************************************************************
 * Classe Joueur
 *************************************************************/
function Joueur(nrFFE, np, af, elo, rapide, blitz, cat, M, club, idFFE) {
  this.m_nrFFE  = nrFFE  || "";
  this.m_np     = np     || "";
  this.m_af     = af     || "";
  this.m_elo    = elo    || "0";
  this.m_rapide = rapide || "0";
  this.m_blitz  = blitz  || "0";
  this.m_cat    = cat    || "";
  this.m_M      = M      || "";
  this.m_club   = club   || "Sans club";
  this.m_idFFE  = idFFE  || "";
  this.m_idFIDE = "";
  this.source   = "FFE_SCRAPING";
}

Joueur.prototype.NrFFE  = function() { return this.m_nrFFE; };
Joueur.prototype.NP     = function() { return this.m_np; };
Joueur.prototype.Af     = function() { return this.m_af; };
Joueur.prototype.Elo    = function() { return this.m_elo; };
Joueur.prototype.Rapide = function() { return this.m_rapide; };
Joueur.prototype.Blitz  = function() { return this.m_blitz; };
Joueur.prototype.Cat    = function() { return this.m_cat; };
Joueur.prototype.M      = function() { return this.m_M; };
Joueur.prototype.Club   = function() { return this.m_club; };
Joueur.prototype.IdFFE  = function() { return this.m_idFFE; };
Joueur.prototype.IdFIDE = function() { return this.m_idFIDE; };
Joueur.prototype.Source = function() { return this.source; };

Joueur.prototype.toString = function() {
  return this.m_nrFFE + " | " + this.m_np +
         " | Af. " + this.m_af +
         " | Elo " + this.m_elo +
         " | Rap " + this.m_rapide +
         " | Blz " + this.m_blitz +
         " | " + this.m_cat + (this.m_M || "") +
         " | " + this.m_club +
         (WITH_FIDE || this.m_idFIDE ? " | Fide " + (this.m_idFIDE || "?") : "");
};

Joueur.prototype.toJSON = function() {
  const npParts = (this.m_np || "").trim().split(" ");
  const json = {
    nrFFE: this.m_nrFFE,
    np: this.m_np,
    nom: this.m_nom || npParts[0] || "",
    prenom: this.m_prenom || npParts.slice(1).join(" ") || "",
    af: this.m_af,
    elo: this.m_elo,
    rapide: this.m_rapide,
    blitz: this.m_blitz,
    cat: this.m_cat,
    club: this.m_club,
    source: this.source || "FFE_SCRAPING",
    lienFFE: this.m_idFFE
      ? "https://www.echecs.asso.fr/FicheJoueur.aspx?Id=" + this.m_idFFE
      : null
  };
  if (WITH_FIDE || this.m_idFIDE) {
    json.lienFIDE = this.m_idFIDE
      ? "https://ratings.fide.com/profile/" + this.m_idFIDE
      : null;
  }
  return json;
};

/*************************************************************
 * Classe Club
 *************************************************************/
function Club(nom, ref, code) {
  this.m_nom    = nom   || "";
  this.m_ref    = ref   || "";
  this.m_code   = code  || "";
}
Club.prototype.setCode = function(code) { this.m_code = code; };
Club.prototype.Nom  = function() { return this.m_nom; };
Club.prototype.Ref = function() { return this.m_ref; };
Club.prototype.Code = function() { return this.m_code; };
Club.prototype.toString = function() {
  return this.m_nom  + 
      (this.m_code ? (" | " + this.m_code): null);
};
Club.prototype.toJSON = function() {
  return { nom: this.m_nom, code: this.m_code};
};
