/*************************************************************
 * API_FFE_CLIENT : CLIENT REST OFFICIEL CHESSXP FFE
 *
 * Fournit une interface sécurisée, typée et hautement performante
 * pour interroger l'API REST ChessXP FFE au lieu du scraping HTML.
 *************************************************************/

/**
 * Exécute une requête HTTP GET vers l'API ChessXP avec gestion d'erreurs et authentification.
 *
 * @param {string} endpoint - Chemin de l'endpoint (ex: "/api/player/search-by-name")
 * @param {Object} [params={}] - Paramètres de requête (query string)
 * @returns {any} Données JSON parsées retournées par l'API
 * @throws {Error} En cas d'erreur HTTP non récupérable ou d'authentification
 */
function chessXpFetch(endpoint, params = {}) {
  if (!CHESSXP_CONFIG.API_KEY) {
    throw new Error("CHESSXP_API_KEY_MISSING : Clé API non configurée dans CHESSXP_CONFIG.");
  }

  // Construction propre de la query string en ignorant les valeurs nulles/undefined/vides
  const queryParts = [];
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== "") {
      queryParts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(val)));
    }
  }
  const queryString = queryParts.length ? "?" + queryParts.join("&") : "";
  const fullUrl = `${CHESSXP_CONFIG.BASE_URL}${endpoint}${queryString}`;

  const start = DEBUG ? Date.now() : null;

  try {
    const options = {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        "X-API-Key": CHESSXP_CONFIG.API_KEY,
        "Accept": "application/json",
        "User-Agent": "RecupFFE-Client/1.0"
      }
    };

    const response = UrlFetchApp.fetch(fullUrl, options);
    const code = response.getResponseCode();
    const contentText = response.getContentText();

    if (DEBUG) {
      const elapsed = Date.now() - start;
      Logger.log(`[CHESSXP FETCH] ${code} (${elapsed} ms) → ${fullUrl}`);
    }

    if (code === 200) {
      return JSON.parse(contentText);
    }

    if (code === 404) {
      return [];
    }

    if (code === 429) {
      let retryAfter = "";
      try {
        const errJson = JSON.parse(contentText);
        if (errJson.retry_after_seconds) retryAfter = ` (Réessayer après ${errJson.retry_after_seconds}s)`;
      } catch (e) {}
      throw new Error(`CHESSXP_RATE_LIMIT_EXCEEDED : Quota de requêtes dépassé (120 req/min)${retryAfter}`);
    }

    if (code === 403) {
      throw new Error("CHESSXP_AUTH_ERROR : Clé d'API ChessXP invalide ou non autorisée.");
    }

    if (code === 422) {
      throw new Error(`CHESSXP_VALIDATION_ERROR : Paramètres de requête invalides : ${contentText}`);
    }

    throw new Error(`CHESSXP_HTTP_ERROR ${code} : ${contentText}`);

  } catch (e) {
    if (DEBUG) {
      const elapsed = DEBUG ? (Date.now() - start) : null;
      Logger.log(`[CHESSXP ERROR] (${elapsed} ms) : ${e.message}`);
    }
    throw e;
  }
}

/**
 * Mappe un objet PlayerPublic de l'API ChessXP vers la classe Joueur interne de RecupFFE.
 *
 * @param {Object} p - Données brutes renvoyées par l'API ChessXP
 * @returns {Joueur} Instance de Joueur enrichie et prête pour l'IHM et les calculs
 */
function mapChessXpToJoueur(p) {
  if (!p) return null;

  // Résolution du type de licence : 'A' (compétition), 'B' (loisir), ou 'N' (expirée/inactive)
  let af = p.licence_type;
  if (!af) {
    if (p.ffe_licence === 2) af = "A";
    else if (p.ffe_licence === 3) af = "B";
    else af = "N";
  }

  // Formatage du nom complet "NOM Prénom"
  const nom = (p.last_name || "").trim().toUpperCase();
  const prenom = (p.first_name || "").trim();
  const np = `${nom} ${prenom}`.trim();

  // Genre (1 = Homme, 2 = Femme, 0 = Inconnu)
  let genre = "";
  if (p.gender === 1) genre = "M";
  else if (p.gender === 2) genre = "F";

  const joueur = new Joueur(
    p.ffe_licence_number || "",
    np,
    af || "",
    p.standard_rating ? String(p.standard_rating) : "0",
    p.rapid_rating ? String(p.rapid_rating) : "0",
    p.blitz_rating ? String(p.blitz_rating) : "0",
    p.category || "",
    genre,
    p.club || "Sans club",
    p.ffe_id ? String(p.ffe_id) : ""
  );

  // Intégration immédiate de l'ID FIDE sans requête supplémentaire
  if (p.fide_id) {
    joueur.m_idFIDE = String(p.fide_id);
  }

  // Métadonnées d'audit de la source
  joueur.source = "CHESSXP";
  if (p.source && p.source.ingested_at) {
    joueur.ingestedAt = p.source.ingested_at;
  }

  return joueur;
}

/*************************************************************
 * FONCTIONS D'ACCÈS SPÉCIFIQUES DU CLIENT
 *************************************************************/

/**
 * Recherche des joueurs par nom et prénom optionnel.
 * Insensible aux accents et à la casse.
 *
 * @param {string} nom - Nom de famille (au moins 2 caractères)
 * @param {string} [prenom] - Prénom optionnel
 * @param {Object} [options={}] - Options (limit, include_inactive, include)
 * @returns {Array<Joueur>} Liste des joueurs trouvés
 */
function chessXpSearchPlayersByName(nom, prenom, options = {}) {
  if (!nom || nom.trim().length < 2) {
    return [];
  }

  const params = {
    last_name: nom.trim(),
    first_name: prenom ? prenom.trim() : undefined,
    limit: options.limit || CHESSXP_CONFIG.DEFAULT_SEARCH_LIMIT,
    include_inactive: options.include_inactive !== undefined ? options.include_inactive : true,
    include: options.include !== undefined ? options.include : (CHESSXP_CONFIG.INCLUDE_FIDE_DEFAULT ? "fide" : undefined)
  };

  const rawList = chessXpFetch("/api/player/search-by-name", params);
  if (!Array.isArray(rawList)) return [];

  return rawList.map(mapChessXpToJoueur).filter(Boolean);
}

/**
 * Recherche les joueurs appartenant à un club donné.
 *
 * @param {string} club - Nom ou partie du nom du club
 * @param {Object} [options={}] - Options (limit, include_inactive, include)
 * @returns {Array<Joueur>} Liste des joueurs du club
 */
function chessXpSearchPlayersByClub(club, options = {}) {
  if (!club || club.trim().length < 2) {
    return [];
  }

  const params = {
    club: club.trim(),
    limit: options.limit || 1000,
    include_inactive: options.include_inactive !== undefined ? options.include_inactive : true,
    include: options.include !== undefined ? options.include : (CHESSXP_CONFIG.INCLUDE_FIDE_DEFAULT ? "fide" : undefined)
  };

  const rawList = chessXpFetch("/api/player/search-by-club", params);
  if (!Array.isArray(rawList)) return [];

  return rawList.map(mapChessXpToJoueur).filter(Boolean);
}

/**
 * Récupère un joueur spécifique via son numéro de licence FFE unique (ex: "K51184").
 *
 * @param {string} licenceNumber - Numéro de licence FFE
 * @param {Object} [options={}] - Options (include)
 * @returns {Joueur|null} Le joueur trouvé ou null
 */
function chessXpGetPlayerByLicence(licenceNumber, options = {}) {
  if (!licenceNumber || !licenceNumber.trim()) return null;

  const cleanLicence = licenceNumber.trim().toUpperCase();
  const params = {
    include: options.include !== undefined ? options.include : (CHESSXP_CONFIG.INCLUDE_FIDE_DEFAULT ? "fide" : undefined)
  };

  try {
    const raw = chessXpFetch(`/api/player/${encodeURIComponent(cleanLicence)}`, params);
    if (!raw || !raw.ffe_licence_number) return null;
    return mapChessXpToJoueur(raw);
  } catch (e) {
    if (e.message && e.message.includes("404")) return null;
    throw e;
  }
}

/**
 * Récupère un lot de joueurs en une seule requête HTTP (jusqu'à 50 licences).
 *
 * @param {Array<string>} licenceNumbers - Tableau de numéros de licence
 * @param {Object} [options={}] - Options
 * @returns {Array<Joueur>}
 */
function chessXpGetPlayersBatch(licenceNumbers, options = {}) {
  if (!licenceNumbers || !licenceNumbers.length) return [];

  const cleanLicences = licenceNumbers
    .map(l => String(l).trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50); // L'API autorise 1..50 licences

  if (!cleanLicences.length) return [];

  const params = {
    licences: cleanLicences.join(","),
    include: options.include !== undefined ? options.include : (CHESSXP_CONFIG.INCLUDE_FIDE_DEFAULT ? "fide" : undefined)
  };

  const rawList = chessXpFetch("/api/player/batch", params);
  if (!Array.isArray(rawList)) return [];

  return rawList.map(mapChessXpToJoueur).filter(Boolean);
}
