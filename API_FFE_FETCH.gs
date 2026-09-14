/*************************************************************
 * GLOBAL
 *************************************************************/
const NETWORK_CONFIG = {
  BASE_CHUNK_SIZE: 5,
  MIN_CHUNK_SIZE: 2,
  MAX_CHUNK_SIZE: 8,
  REQUEST_DELAY_MS: 50,
  MAX_RETRIES: 3
};

/*************************************************************
 * FETCH FFE
 *************************************************************/

/**
 * @function fetchUrl
 * @description Effectue une requête HTTP unique avec gestion des erreurs normalisée.
 * @param {string} url - URL cible
 * @param {object} options - Options UrlFetchApp
 * @returns {string} HTML brut de la réponse
 * @throws {Error} TIMEOUT, RATE_LIMIT, HTTP_ERROR, FETCH_ERROR
 */
function fetchUrl(url, options) {

  if (!url) {
    throw new Error("fetchUrl called with invalid URL");
  }

  const start = DEBUG ? Date.now() : null;

  try {

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (DEBUG) {
      const elapsed = Date.now() - start;
      Logger.log("FETCH " + elapsed + " ms → " + url);
    }

    if (responseCode !== 200) {
      throw new Error("HTTP_ERROR " + responseCode + " → " + url);
    }

    return response.getContentText();

  } catch (e) {

    const elapsed = DEBUG ? (Date.now() - start) : null;

    if (DEBUG) {
      Logger.log("FETCH " + elapsed + " ms (ERROR) → " + url);
    }

    const message = String(e.message || e).toLowerCase();

    if (message.includes("timeout")) {
      throw new Error("TIMEOUT → " + url);
    }

    if (message.includes("too many")) {
      throw new Error("RATE_LIMIT → " + url);
    }

    throw new Error("FETCH_ERROR → " + e.message + " → " + url);
  }
}

/**
 * @function fetchAll
 * @description Exécute un batch de requêtes HTTP en parallèle avec gestion d'erreurs homogène.
 * @param {Array<object>} requests - Tableau de requêtes UrlFetchApp
 * @param {string} [label] - Contexte pour logs/debug
 * @returns {Array<HTTPResponse>} Réponses HTTP valides
 * @throws {Error} TIMEOUT_BATCH, RATE_LIMIT_BATCH, FETCH_BATCH_ERROR
 */
function fetchAll(requests, label = "") {

  const start = DEBUG ? Date.now() : null;

  try {

    const responses = UrlFetchApp.fetchAll(requests);

    if (DEBUG) {
      const elapsed = Date.now() - start;
      Logger.log("BATCH FETCH (" + requests.length + ") " + elapsed + " ms → " + label);
    }

    return responses.map((resp, i) => {

      const code = resp.getResponseCode();
      const url = requests[i].url;

      if (code === 200) return resp;

      // Gestion des erreurs cohérente avec fetchUrl
      if (code === 429) {
        throw new Error("RATE_LIMIT → " + url);
      }

      if (code >= 500) {
        throw new Error("SERVER_ERROR " + code + " → " + url);
      }

      if (code >= 400) {
        throw new Error("HTTP_ERROR " + code + " → " + url);
      }

      return resp;

    });

  } catch (e) {

    if (DEBUG) {
      const elapsed = Date.now() - start;
      Logger.log("BATCH FETCH ERROR " + elapsed + " ms → " + label);
    }

    const message = String(e.message || e).toLowerCase();

    if (message.includes("timeout")) {
      throw new Error("TIMEOUT_BATCH → " + label);
    }

    if (message.includes("rate")) {
      throw new Error("RATE_LIMIT_BATCH → " + label);
    }

    throw new Error("FETCH_BATCH_ERROR → " + e.message);
  }
}

/**
 * @function fetchAllSafe
 * @description Wrapper de fetchAll avec retry exponentiel simple.
 * @param {Array<object>} requests
 * @param {string} [label]
 * @param {number} [retries=2]
 * @returns {Array<HTTPResponse>}
 */
function fetchAllSafe(requests, label = "", retries = 2) {

  let attempt = 0;

  while (attempt <= retries) {

    try {
      return fetchAll(requests, label);
    } catch (e) {

      attempt++;

      if (attempt > retries) throw e;

      Utilities.sleep(200 * attempt);
    }
  }
}

/**
 * @function fetchAllWithBackoff (pour FETCH_ANTI_BOT)
 * @description Wrapper autour de fetchAllSafe avec adaptation dynamique du chunkSize
 *              en cas de RATE_LIMIT. Ne duplique pas la logique de retry interne.
 *
 * @param {Array<Object>} requests - Liste de requêtes
 * @param {string} label - Contexte (ex: code club)
 * @param {number} chunkSize - Taille actuelle du batch
 *
 * @returns {{responses: HTTPResponse[], chunkSize: number}}
 *
 * @throws {Error} Si erreur non liée au rate limit ou échec persistant
 */
function fetchAllWithBackoff(requests, label, chunkSize) {

  let dynamicChunkSize = chunkSize;

  try {

    // ✅ On laisse fetchAllSafe gérer ses retries internes
    const responses = fetchAllSafe(requests, "club " + label);

    return {
      responses,
      chunkSize: dynamicChunkSize
    };

  } catch (e) {

    const message = String(e.message || e).toLowerCase();

    // ❌ Si ce n'est pas un rate limit → on remonte direct
    if (!message.includes("rate")) {
      throw e;
    }

    // 🔻 Réduction du chunk (UNE seule fois ici)
    dynamicChunkSize = Math.max(
      NETWORK_CONFIG.MIN_CHUNK_SIZE,
      Math.floor(dynamicChunkSize / 2)
    );

    const backoff = 400; // léger backoff (fetchAllSafe a déjà retry)

    if (DEBUG) {
      Logger.log(
        "RATE_LIMIT detected → reduce chunk=" + dynamicChunkSize +
        " | sleep=" + backoff +
        " | label=" + label
      );
    }

    Utilities.sleep(backoff);

    // 🔁 Nouveau try avec chunk réduit (SANS boucle)
    const reducedRequests = requests.slice(0, dynamicChunkSize);

    const responses = fetchAllSafe(reducedRequests, "club " + label);

    return {
      responses,
      chunkSize: dynamicChunkSize
    };
  }
}

/*************************************************************
 * RECHERCHE NOMINALE (ROUTEUR)
 *************************************************************/

/**
 * @function fetchPlayersList
 * @description Point d'entrée principal pour la recherche de joueurs. Aiguille vers la méthode appropriée selon la configuration.
 * @param {string} nom - Le nom du joueur
 * @param {string} prenom - Le prénom du joueur
 * @returns {Array<Player>} Liste des joueurs trouvés et dédupliqués
 */
function fetchPlayersList(nom, prenom) {
  // Aiguillage dynamique
  return OPTIMIZED 
    ? fetchPlayersListUltra(nom, prenom)
    : fetchPlayersListStandard(nom, prenom);
}

/*************************************************************
 * RECHERCHE NOMINALE : IMPLEMENTATIONS
 *************************************************************/

/**
 * @function fetchPlayersList
 * @description Récupère la liste des joueurs FFE correspondant à un nom et prénom donnés.
 *              Version classique : concaténation + déduplication via `dedupeByFFE`.
 *
 * @param {string} nom - Nom du joueur. Les accents seront retirés et le nom mis en majuscules.
 * @param {string} prenom - Prénom du joueur. Les accents seront retirés.
 *
 * @returns {Array<Player>} Liste des joueurs FFE trouvés pour ce nom/prénom.
 *
 * @note
 * - Pour chaque variante du nom (espaces remplacés par des tirets) :
 *    - Effectue une requête GET vers "ListeJoueurs.aspx?Action=FFE"
 *    - Parse le HTML via `parseFFEHtml`
 * - Tous les joueurs sont concaténés puis dédupliqués via `dedupeByFFE`
 * - Les erreurs de fetch sont loggées si `DEBUG` est activé
 */
function fetchPlayersListStandard(nom, prenom) {

  const variantes = buildSearchVariantes(nom);

  // ⚠️ gestion prénom selon mode strict
  const prenomNormalized = STRING_STRICT_COMPARE
    ? String(prenom).trim()
    : removeAccents(String(prenom).trim());

  let joueurs = [];

  const prenomEncoded = encodeURIComponent(prenomNormalized);
  variantes.forEach(n => {

    const url =
      "https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=FFE" +
      "&JrNom=" + encodeURIComponent(n) +
      "&JrPrenom=" + prenomEncoded;

    try {
      const html = fetchUrl(url, HTTP_CONFIG.OPTIONS_GET);
      joueurs = joueurs.concat(parseFFEHtml(html));
    } catch (e) {
      if (DEBUG) Logger.log(e.message);
    }

  });

  return dedupeByFFE(joueurs);
}

/**
 * @function fetchPlayersListUltra
 * @description Récupère la liste des joueurs FFE correspondant à un nom et prénom donnés.
 *              Version optimisée : accumulation via map pour une déduplication immédiate et plus rapide.
 *
 * @param {string} nom - Nom du joueur. Les accents seront retirés et le nom mis en majuscules.
 * @param {string} prenom - Prénom du joueur. Les accents seront retirés.
 *
 * @returns {Array<Player>} Liste des joueurs FFE dédupliqués trouvés pour ce nom/prénom.
 *
 * @note
 * - Pour chaque variante du nom (espaces remplacés par des tirets) :
 *    - Effectue une requête GET vers "ListeJoueurs.aspx?Action=FFE"
 *    - Parse le HTML via `parseFFEHtml`
 *    - Chaque joueur est inséré dans un objet clé/valeur basé sur `NrFFE()`
 * - À la fin, les valeurs de la map sont renvoyées comme tableau dédupliqué
 * - Les erreurs de fetch sont loggées si `DEBUG` est activé
 */
function fetchPlayersListUltra(nom, prenom) {

  const variantes = buildSearchVariantes(nom);

  const prenomNormalized = STRING_STRICT_COMPARE
    ? String(prenom).trim()
    : removeAccents(String(prenom).trim());

  const joueursMap = {};


  const prenomEncoded = encodeURIComponent(prenomNormalized);
  variantes.forEach(n => {

    const url =
      "https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=FFE" +
      "&JrNom=" + encodeURIComponent(n) +
      "&JrPrenom=" + prenomEncoded;

    try {
      const html = fetchUrl(url, HTTP_CONFIG.OPTIONS_GET);
      const joueurs = parseFFEHtml(html);

      joueurs.forEach(j => {
        const id = j.NrFFE();
        if (id && !joueursMap[id]) {
          joueursMap[id] = j;
        }
      });

    } catch (e) {
      if (DEBUG) Logger.log(e.message);
    }

  });

  return Object.values(joueursMap);
}

/*************************************************************
 * FETCH CLUB REF
 *************************************************************/

/**
 * @function fetchClubRef
 * @description Recherche des clubs FFE à partir d’un mot-clé et extrait leurs références (Ref).
 *
 * @param {string} motCle - Nom ou fragment du nom du club (ex: "marseille", "cavalier-noir")
 *
 * @returns {Club[]} Liste d’objets Club contenant :
 *   - nom (string) : nom du club
 *   - ref (string) : identifiant FFE (utilisé pour accéder à la fiche club)
 *   - code (null)  : non résolu ici (sera rempli via resolveClubCodesFromInput)
 *
 * @throws {Error} Propagée depuis fetchUrl en cas d’erreur réseau
 *
 * @note
 * - Effectue une requête POST sur ListeClubs.aspx
 * - Parse la table HTML contenant les résultats
 * - Ne résout PAS le ClubCode (XYYYYY), seulement la Ref
 *
 * @depends fetchUrl, stripTags, Club
 */
function fetchClubRef(motCle) {

  const url = "https://www.echecs.asso.fr/ListeClubs.aspx?Action=CLUB";

  const options = Object.assign({}, HTTP_CONFIG.OPTIONS_POST, {
    payload: { "ClubNom": motCle }
  });

  const html = fetchUrl(url, options);


  const tableMatch = html.match(/<table[^>]*>[\s\S]*?Dep\.[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[0];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  let match;
  const clubs = [];

  while ((match = rowRegex.exec(tableHtml)) !== null) {

    const row = match[1];

    const refMatch = row.match(/FicheClub\.aspx\?Ref=([A-Z0-9]+)/i);
    if (!refMatch) continue;

    const ref = refMatch[1];

    const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cols || cols.length < 3) continue;

    const nomClub = stripTags(cols[2]).trim();
    if (!nomClub) continue;

    clubs.push(new Club(nomClub, ref, null));
  }

  return clubs;
}

/*************************************************************
 * FETCH THREADED WITH SEQUENTIAL FALLBACK
 *************************************************************/

/**
 * @function fetchPlayersListClub
 * @description Point d'entrée principal avec fallback automatique (threaded → sequential).
 * @param {string} clubInput
 * @param {string} [taskId]
 * @returns {Array<Player>}
 */
function fetchPlayersListClub(clubInput, taskId) {

  const globalStart = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache();
  if (taskId) {
    cache.put(taskId, JSON.stringify({
      current: 0,
      total: 1
    }), 600);
  }

  try {

    if (FETCH_ANTI_BOT) {
      // jitter anti-pattern
      Utilities.sleep(20 + Math.floor(Math.random() * 30));
    }

    let joueurs;

    // 🔀 AIGUILLAGE DYNAMIQUE SELON LA CONFIGURATION
    if (!OPTIMIZED) {
      // Mode standard / debug
      joueurs = fetchPlayersListClubThreaded(clubInput, taskId);
    } else if (FETCH_ANTI_BOT) {
      // Mode optimisé avec sécurité anti-bot
      joueurs = fetchPlayersListClubThreadedV3(clubInput, taskId);
    } else {
      // Mode optimisé vitesse maximale (V4 corrigée)
      joueurs = fetchPlayersListClubThreadedV4(clubInput, taskId);
    }

    return joueurs;

  } catch (e) {

    const message = String(e.message || e).toLowerCase();

    if (FETCH_ANTI_BOT && message.includes("rate_limit")) {
      if (DEBUG) Logger.log("GLOBAL RATE_LIMIT → fallback sequential");
      Utilities.sleep(1500);
      return fetchPlayersListClubSequential(clubInput, taskId);
    }

    if (DEBUG) Logger.log("Fallback Sequential → " + e.message);
    return fetchPlayersListClubSequential(clubInput, taskId);

  } finally {
    if (DEBUG) {
      const elapsed = Date.now() - globalStart;
      Logger.log("TOTAL CLUB FETCH → " + elapsed + " ms");
    }
  }
}

/*************************************************************
 * SEQUENTIAL
 *************************************************************/

/**
 * @function fetchPlayersListClubSequential
 * @description Fallback séquentiel robuste en cas d'échec du mode threaded.
 * @param {string} clubInput
 * @param {string} [taskId]
 * @returns {Array<Player>}
 */
function fetchPlayersListClubSequential(clubInput, taskId) {

  const start = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache(); // Initialisation du cache

  try {

    const clubs = OPTIMIZED ? resolveClubCodesFromInputUltra(clubInput) : resolveClubCodesFromInput(clubInput);

    if (!clubs.length) return [];
    const totalClubs = clubs.length;

    let tousJoueurs = [];

    clubs.forEach(c => {

      let request = buildClubPageRequest(c.Code(), null, null, 1);
      let response = UrlFetchApp.fetch(request.url, request);
      let html = response.getContentText();

      let joueurs = parseFFEHtml(html);

      let viewStateMatch = html.match(/id="__VIEWSTATE" value="([^"]+)"/);
      let viewStateGenMatch = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);

      if (!viewStateMatch || !viewStateGenMatch) {
        tousJoueurs = tousJoueurs.concat(joueurs);
        return;
      }

      let viewState = viewStateMatch[1];
      let viewStateGenerator = viewStateGenMatch[1];

      const totalPages_per_club = extractTotalPages(html);
      const totalPages = totalPages_per_club * totalClubs;
      
      // --- MISE À JOUR DU CACHE (Première page) ---
      if (taskId) {
        cache.put(taskId, JSON.stringify({ current: 1, total: totalPages }), 600);
      }
      if (DEBUG) { Logger.log("page 1 / " + totalPages); }

      let pagesProcessed = 0;
      for (let page = 2; page <= totalPages_per_club; page++) {

        Utilities.sleep(50);

        request = buildClubPageRequest(c.Code(), viewState, viewStateGenerator, page);
        response = UrlFetchApp.fetch(request.url, request);

        if (response.getResponseCode() !== 200) continue;

        html = response.getContentText();
        joueurs = joueurs.concat(parseFFEHtml(html));

        viewStateMatch = html.match(/id="__VIEWSTATE" value="([^"]+)"/);
        viewStateGenMatch = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);

        if (viewStateMatch) viewState = viewStateMatch[1];
        if (viewStateGenMatch) viewStateGenerator = viewStateGenMatch[1];

        // --- MISE À JOUR DU CACHE (Pages suivantes) ---
        if (taskId) {
          cache.put(taskId, JSON.stringify({ current: (pagesProcessed + page), total: totalPages }), 600);
        }
        if (DEBUG) { Logger.log("page " + (pagesProcessed + page) + " / " + totalPages); }

      }
      pagesProcessed += totalPages_per_club;

      tousJoueurs = tousJoueurs.concat(joueurs);
    });

    return dedupeByFFE(tousJoueurs);

  } finally {

    if (DEBUG) {
      const elapsed = Date.now() - start;
      Logger.log("SEQUENTIAL TOTAL → " + elapsed + " ms");
    }

  }
}

/*************************************************************
 * THREADED
 *************************************************************/

/**
 * @function fetchPlayersListClubThreaded
 * @description Récupère les joueurs d'un club en parallèle avec adaptation dynamique du débit.
 * @param {string} clubInput
 * @param {string} [taskId] - ID pour suivi progression (cache)
 * @returns {Array<Player>}
 */
function fetchPlayersListClubThreaded(clubInput, taskId) {

  const start = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache();

  if (taskId) {
    cache.put(taskId, JSON.stringify({ current: 0, total: 1 }), 600);
  }

  try {

    const clubs = OPTIMIZED ? resolveClubCodesFromInputUltra(clubInput) : resolveClubCodesFromInput(clubInput);

    if (!clubs.length) return [];

    const totalClubs = clubs.length;

    let tousJoueurs = [];
    let pagesProcessedGlobal = 0;

    clubs.forEach(c => {

      let dynamicChunkSize = NETWORK_CONFIG.BASE_CHUNK_SIZE; // ✅ chunk LOCAL

      const firstRequest = buildClubPageRequest(c.Code(), null, null, 1);
      const firstResponse = UrlFetchApp.fetch(firstRequest.url, firstRequest);

      if (firstResponse.getResponseCode() !== 200) {
        throw new Error("Erreur page 1 club " + c.Code());
      }

      const firstHtml = firstResponse.getContentText();
      let joueurs = parseFFEHtml(firstHtml);

      const viewStateMatch = firstHtml.match(/id="__VIEWSTATE" value="([^"]+)"/);
      const viewStateGenMatch = firstHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);

      if (!viewStateMatch || !viewStateGenMatch) {
        tousJoueurs = tousJoueurs.concat(joueurs);
        return;
      }

      const viewState = viewStateMatch[1];
      const viewStateGenerator = viewStateGenMatch[1];

      const totalPages_per_club = extractTotalPages(firstHtml);
      const totalPages = totalPages_per_club * totalClubs;

      let pagesProcessed = 1;

      if (taskId) {
        cache.put(taskId, JSON.stringify({
          current: pagesProcessedGlobal + pagesProcessed,
          total: totalPages
        }), 600);
      }

      if (totalPages_per_club === 1) {
        tousJoueurs = tousJoueurs.concat(joueurs);
        pagesProcessedGlobal += 1;
        return;
      }

      const requests = [];

      for (let page = 2; page <= totalPages_per_club; page++) {
        requests.push(
          buildClubPageRequest(c.Code(), viewState, viewStateGenerator, page)
        );
      }

      for (let i = 0; i < requests.length; ) {

        const chunkSize = FETCH_ANTI_BOT ? dynamicChunkSize : NETWORK_CONFIG.BASE_CHUNK_SIZE;
        const chunk = requests.slice(i, i + chunkSize);

        let responses;

        if (FETCH_ANTI_BOT) {

          Utilities.sleep(NETWORK_CONFIG.REQUEST_DELAY_MS + Math.floor(Math.random() * 30));

          const result = fetchAllWithBackoff(
            chunk,
            c.Code(),
            dynamicChunkSize
          );

          responses = result.responses;
          dynamicChunkSize = result.chunkSize;

        } else {

          //responses = UrlFetchApp.fetchAll(chunk);
          responses = fetchAllSafe(chunk, "club " + c.Code());

        }

        for (let r = 0; r < responses.length; r++) {

          const resp = responses[r];
          if (resp.getResponseCode() !== 200) continue;

          joueurs = joueurs.concat(
            parseFFEHtml(resp.getContentText())
          );
        }

        pagesProcessed += chunk.length;

        if (taskId) {
          cache.put(taskId, JSON.stringify({
            current: pagesProcessedGlobal + pagesProcessed,
            total: totalPages
          }), 600);
        }

        if (DEBUG) {
          Logger.log(
            "page " +
            (pagesProcessedGlobal + pagesProcessed) +
            " / " +
            totalPages +
            (FETCH_ANTI_BOT ? " | chunk=" + dynamicChunkSize : "")
          );
        }
        i += chunkSize;
      }

      pagesProcessedGlobal += totalPages_per_club;
      tousJoueurs = tousJoueurs.concat(joueurs);
    });

    return dedupeByFFE(tousJoueurs);

  } finally {

    if (DEBUG) {
      Logger.log("THREADED TOTAL → " + (Date.now() - start) + " ms");
    }
  }
}

/**
 * @function fetchPlayersListClubThreadedUltra
 * @description Version optimisée du threaded :
 *              - batching réseau conservé
 *              - accumulation rapide (push)
 *              - déduplication finale optimisée (Set)
 *
 * @param {string} clubInput
 * @param {string} [taskId]
 *
 * @returns {Object[]} Liste des joueurs dédupliqués
 */
function fetchPlayersListClubThreadedUltra(clubInput, taskId) {

  const start = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache();

  if (taskId) {
    cache.put(taskId, JSON.stringify({ current: 0, total: 1 }), 600);
  }

  try {

    const clubs = OPTIMIZED ? resolveClubCodesFromInputUltra(clubInput) : resolveClubCodesFromInput(clubInput);

    if (!clubs.length) return [];

    const totalClubs = clubs.length;

    // ✅ tableau unique (pas de concat en chaîne)
    const allPlayers = [];

    let pagesProcessedGlobal = 0;

    for (let ci = 0; ci < clubs.length; ci++) {

      const c = clubs[ci];
      let dynamicChunkSize = NETWORK_CONFIG.BASE_CHUNK_SIZE;

      const firstRequest = buildClubPageRequest(c.Code(), null, null, 1);
      const firstResponse = UrlFetchApp.fetch(firstRequest.url, firstRequest);

      if (firstResponse.getResponseCode() !== 200) {
        throw new Error("Erreur page 1 club " + c.Code());
      }

      const firstHtml = firstResponse.getContentText();

      // ✅ push direct (plus rapide que concat)
      const parsedFirst = parseFFEHtml(firstHtml);
      for (let i = 0; i < parsedFirst.length; i++) {
        allPlayers.push(parsedFirst[i]);
      }

      const viewStateMatch = firstHtml.match(/id="__VIEWSTATE" value="([^"]+)"/);
      const viewStateGenMatch = firstHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);

      if (!viewStateMatch || !viewStateGenMatch) {
        pagesProcessedGlobal++;
        continue;
      }

      const viewState = viewStateMatch[1];
      const viewStateGenerator = viewStateGenMatch[1];

      const totalPages_per_club = extractTotalPages(firstHtml);
      const totalPages = totalPages_per_club * totalClubs;

      let pagesProcessed = 1;

      if (taskId) {
        cache.put(taskId, JSON.stringify({
          current: pagesProcessedGlobal + pagesProcessed,
          total: totalPages
        }), 600);
      }

      if (totalPages_per_club === 1) {
        pagesProcessedGlobal += 1;
        continue;
      }

      const requests = [];

      for (let page = 2; page <= totalPages_per_club; page++) {
        requests.push(
          buildClubPageRequest(c.Code(), viewState, viewStateGenerator, page)
        );
      }

      for (let i = 0; i < requests.length; ) {

        const chunkSize = FETCH_ANTI_BOT
          ? dynamicChunkSize
          : NETWORK_CONFIG.BASE_CHUNK_SIZE;

        const chunk = requests.slice(i, i + chunkSize);

        let responses;

        if (FETCH_ANTI_BOT) {

          Utilities.sleep(
            NETWORK_CONFIG.REQUEST_DELAY_MS +
            Math.floor(Math.random() * 30)
          );

          const result = fetchAllWithBackoff(
            chunk,
            c.Code(),
            dynamicChunkSize
          );

          responses = result.responses;
          dynamicChunkSize = result.chunkSize;

        } else {

          responses = fetchAllSafe(chunk, "club " + c.Code());
        }

        // ✅ push direct au lieu de concat
        for (let r = 0; r < responses.length; r++) {

          const resp = responses[r];
          if (resp.getResponseCode() !== 200) continue;

          const parsed = parseFFEHtml(resp.getContentText());

          for (let j = 0; j < parsed.length; j++) {
            allPlayers.push(parsed[j]);
          }
        }

        pagesProcessed += chunk.length;

        if (taskId) {
          cache.put(taskId, JSON.stringify({
            current: pagesProcessedGlobal + pagesProcessed,
            total: totalPages
          }), 600);
        }

        if (DEBUG) {
          Logger.log(
            "page " +
            (pagesProcessedGlobal + pagesProcessed) +
            " / " +
            totalPages +
            (FETCH_ANTI_BOT ? " | chunk=" + dynamicChunkSize : "")
          );
        }

        i += chunkSize;
      }

      pagesProcessedGlobal += totalPages_per_club;
    }

    // ✅ déduplication finale optimisée
    return dedupeByFFE(allPlayers);

  } finally {

    if (DEBUG) {
      Logger.log("THREADED ULTRA TOTAL → " + (Date.now() - start) + " ms");
    }
  }
}

/**
 * @function fetchPlayersListClubThreadedV3
 * @description Threaded version avec batching adaptatif et push direct.
 *              Micro-optimisation : ajuste le chunk dynamiquement selon perf et fin de batch.
 * @param {string} clubInput
 * @param {string} [taskId]
 * @returns {Array<Player>} Liste des joueurs dédupliqués
 */
function fetchPlayersListClubThreadedV3(clubInput, taskId) {

  const start = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache();

  if (taskId) {
    cache.put(taskId, JSON.stringify({ current: 0, total: 1 }), 600);
  }

  try {

    const clubs = OPTIMIZED ? resolveClubCodesFromInputUltra(clubInput) : resolveClubCodesFromInput(clubInput);

    if (!clubs.length) return [];

    const allPlayers = [];
    let pagesProcessedGlobal = 0;

    clubs.forEach(c => {

      let dynamicChunkSize = NETWORK_CONFIG.BASE_CHUNK_SIZE;

      // --- page 1
      const firstRequest = buildClubPageRequest(c.Code(), null, null, 1);
      const firstResponse = UrlFetchApp.fetch(firstRequest.url, firstRequest);

      if (firstResponse.getResponseCode() !== 200) {
        throw new Error("Erreur page 1 club " + c.Code());
      }

      const firstHtml = firstResponse.getContentText();
      const parsedFirst = parseFFEHtml(firstHtml);
      for (let p of parsedFirst) allPlayers.push(p);

      const viewStateMatch = firstHtml.match(/id="__VIEWSTATE" value="([^"]+)"/);
      const viewStateGenMatch = firstHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
      if (!viewStateMatch || !viewStateGenMatch) {
        pagesProcessedGlobal++;
        return;
      }

      let viewState = viewStateMatch[1];
      let viewStateGenerator = viewStateGenMatch[1];

      const totalPages_per_club = extractTotalPages(firstHtml);
      const totalPages = totalPages_per_club * clubs.length;

      let pagesProcessed = 1;
      if (taskId) {
        cache.put(taskId, JSON.stringify({
          current: pagesProcessedGlobal + pagesProcessed,
          total: totalPages
        }), 600);
      }

      if (totalPages_per_club === 1) {
        pagesProcessedGlobal++;
        return;
      }

      // --- construire toutes les requêtes pour les pages suivantes
      const requests = [];
      for (let page = 2; page <= totalPages_per_club; page++) {
        requests.push(buildClubPageRequest(c.Code(), viewState, viewStateGenerator, page));
      }

      // --- batching adaptatif
      for (let i = 0; i < requests.length; ) {

        // chunk réel (limite fin de batch)
        const chunkSize = Math.min(dynamicChunkSize, requests.length - i);
        const chunk = requests.slice(i, i + chunkSize);

        let responses;

        if (FETCH_ANTI_BOT) {
          Utilities.sleep(NETWORK_CONFIG.REQUEST_DELAY_MS + Math.floor(Math.random() * 30));
          const result = fetchAllWithBackoff(chunk, c.Code(), dynamicChunkSize);
          responses = result.responses;
          dynamicChunkSize = result.chunkSize;
        } else {
          responses = fetchAllSafe(chunk, "club " + c.Code());
        }

        const batchStart = Date.now();

        // --- push direct
        for (let resp of responses) {
          if (resp.getResponseCode() !== 200) continue;
          const parsed = parseFFEHtml(resp.getContentText());
          for (let j of parsed) allPlayers.push(j);
        }

        pagesProcessed += chunk.length;

        if (taskId) {
          cache.put(taskId, JSON.stringify({
            current: pagesProcessedGlobal + pagesProcessed,
            total: totalPages
          }), 600);
        }

        // --- micro-optimisation : ajustement dynamique chunk
        if (!FETCH_ANTI_BOT) {
          const batchDuration = Date.now() - batchStart;
          if (batchDuration < 6000 && dynamicChunkSize < NETWORK_CONFIG.MAX_CHUNK_SIZE) {
            dynamicChunkSize++;
          } else if (batchDuration > 10000 && dynamicChunkSize > NETWORK_CONFIG.MIN_CHUNK_SIZE) {
            dynamicChunkSize--;
          }
        }

        if (DEBUG) {
          Logger.log(
            "page " + (pagesProcessedGlobal + pagesProcessed) +
            " / " + totalPages +
            (FETCH_ANTI_BOT ? " | chunk=" + dynamicChunkSize : "")
          );
        }

        i += chunkSize;
      }

      pagesProcessedGlobal += totalPages_per_club;
    });

    // --- déduplication finale
    return dedupeByFFE(allPlayers);

  } finally {
    if (DEBUG) {
      Logger.log("THREADED V3 TOTAL → " + (Date.now() - start) + " ms");
    }
  }
}

/**
 * @function fetchPlayersListClubThreadedV4
 * @description Threaded ultra-optimisé avec chunk adaptatif et déduplication partielle.
 * @param {string} clubInput
 * @param {string} [taskId]
 * @returns {Array<Player>} Joueurs dédupliqués
 */
function fetchPlayersListClubThreadedV4(clubInput, taskId) {

  const start = DEBUG ? Date.now() : null;
  const cache = CacheService.getScriptCache();

  if (taskId) cache.put(taskId, JSON.stringify({ current: 0, total: 1 }), 600);

  const clubs = OPTIMIZED ? resolveClubCodesFromInputUltra(clubInput) : resolveClubCodesFromInput(clubInput);
  if (!clubs.length) return [];

  const allPlayers = [];
  let pagesProcessedGlobal = 0;

  clubs.forEach(c => {

    let dynamicChunkSize = NETWORK_CONFIG.BASE_CHUNK_SIZE;
    let viewState = null;
    let viewStateGenerator = null;

    // --- Page 1
    const firstReq = buildClubPageRequest(c.Code(), null, null, 1);
    const firstResp = UrlFetchApp.fetch(firstReq.url, firstReq);

    if (firstResp.getResponseCode() !== 200) throw new Error("Erreur page 1 club " + c.Code());

    const firstHtml = firstResp.getContentText();
    for (let p of parseFFEHtml(firstHtml)) allPlayers.push(p);

    const vsMatch = firstHtml.match(/id="__VIEWSTATE" value="([^"]+)"/);
    const vsGenMatch = firstHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
    if (vsMatch && vsGenMatch) { viewState = vsMatch[1]; viewStateGenerator = vsGenMatch[1]; }

    const totalPagesPerClub = extractTotalPages(firstHtml);
    const totalPages = totalPagesPerClub * clubs.length;

    let pagesProcessed = 1;
    if (taskId) cache.put(taskId, JSON.stringify({ current: pagesProcessedGlobal + pagesProcessed, total: totalPages }), 600);
    if (totalPagesPerClub === 1) { pagesProcessedGlobal++; return; }

    const requests = [];
    for (let page = 2; page <= totalPagesPerClub; page++) {
      requests.push(buildClubPageRequest(c.Code(), viewState, viewStateGenerator, page));
    }

    // Processing synchrone par batch garanti à 100%
    // ✅ On retire l'incrémentation du header de la boucle
    for (let i = 0; i < requests.length; ) {
      
      const chunkSize = Math.min(dynamicChunkSize, requests.length - i);
      const chunk = requests.slice(i, i + chunkSize);

      let responses;
      const batchStart = Date.now();

      if (FETCH_ANTI_BOT) {
        Utilities.sleep(NETWORK_CONFIG.REQUEST_DELAY_MS + Math.floor(Math.random() * 30));
        const result = fetchAllWithBackoff(chunk, c.Code(), dynamicChunkSize);
        responses = result.responses;
        dynamicChunkSize = result.chunkSize;
      } else {
        responses = fetchAllSafe(chunk, "club " + c.Code());
      }

      // Extraction immédiate du batch courant
      const seenPartial = new Set();
      for (let resp of responses) {
        if (resp.getResponseCode() !== 200) continue;
        const parsed = parseFFEHtml(resp.getContentText());
        for (let j of parsed) {
          const id = j.NrFFE();
          if (id && !seenPartial.has(id)) {
            seenPartial.add(id);
            allPlayers.push(j);
          }
        }
      }

      pagesProcessed += chunk.length;
      
      // ✅ On avance 'i' strictement du nombre d'éléments traités
      i += chunk.length;

      if (taskId) cache.put(taskId, JSON.stringify({ current: pagesProcessedGlobal + pagesProcessed, total: totalPages }), 600);

      // Adaptation dynamique du chunk (APRÈS avoir avancé l'index)
      if (!FETCH_ANTI_BOT) {
        const duration = Date.now() - batchStart;
        if (duration < 5000 && dynamicChunkSize < NETWORK_CONFIG.MAX_CHUNK_SIZE) dynamicChunkSize++;
        else if (duration > 9000 && dynamicChunkSize > NETWORK_CONFIG.MIN_CHUNK_SIZE) dynamicChunkSize--;
      }

      if (DEBUG) Logger.log("page " + (pagesProcessedGlobal + pagesProcessed - 1) + " / " + totalPages + (FETCH_ANTI_BOT ? " | chunk=" + dynamicChunkSize : ""));
    }

    pagesProcessedGlobal += totalPagesPerClub;
  });

  return dedupeByFFE(allPlayers);
}

/*************************************************************
 * RESOLUTION CLUB INPUT → LISTE CLUBCODES XYYYYY
 *************************************************************/

/**
 * @function resolveClubCodesFromInput
 * @description Résout les codes clubs via requêtes batch (fetchAll).
 * @param {string} clubInput
 * @returns {Array<Club>}
 */
function resolveClubCodesFromInput(clubInput) {

  const variantes = buildSearchVariantes(clubInput);

  let clubs = [];

  for (let i = 0; i < variantes.length; i++) {

    try {

      clubs = fetchClubRef(variantes[i]);

      if (clubs && clubs.length > 0) {
        break;
      }

    } catch (e) {
      if (DEBUG) Logger.log(e.message);
    }
  }

  if (!clubs || clubs.length === 0) {
    throw new Error("Club introuvable : " + clubInput);
  }

  // 🔽 reste inchangé
  clubs.forEach(c => {

    Utilities.sleep(10);

    const resp = UrlFetchApp.fetch(
      "https://www.echecs.asso.fr/FicheClub.aspx?Ref=" + c.Ref(),
      { muteHttpExceptions: true }
    );

    if (resp.getResponseCode() !== 200) return;

    const html = resp.getContentText();

    const match = html.match(
      /FicheComite\.aspx\?Ref=[^"]+">([A-Z][A-Z0-9]{5})/
    );

    if (match && typeof c.setCode === "function") {
      c.setCode(match[1]);
    }

  });

  return clubs;
}

/**
 * @function resolveClubCodesFromInputUltra
 * @description Optimized resolveClubCodesFromInput
 * @param {string} clubInput
 * @returns {Array<Club>}
 */
function resolveClubCodesFromInputUltra(clubInput) {

  const variantes = buildSearchVariantes(clubInput);

  if (clubInput.includes(" ")) {
    variantes.push(clubInput.replace(/\s+/g, "-"));
  }

  let clubs = [];

  for (let i = 0; i < variantes.length; i++) {

    try {

      clubs = fetchClubRef(variantes[i]);

      if (clubs && clubs.length > 0) {
        break;
      }

    } catch (e) {
      if (DEBUG) Logger.log(e.message);
    }
  }

  if (!clubs || clubs.length === 0) {
    throw new Error("Club introuvable : " + clubInput);
  }

  // --- batch résolution inchangée ---
  const requests = clubs.map(c => ({
    url: "https://www.echecs.asso.fr/FicheClub.aspx?Ref=" + c.Ref(),
    method: "get",
    muteHttpExceptions: true
  }));

  const responses = fetchAllSafe(requests, "resolve clubs");

  responses.forEach((resp, i) => {

    if (resp.getResponseCode() !== 200) return;

    const html = resp.getContentText();

    const match = html.match(
      /FicheComite\.aspx\?Ref=[^"]+">([A-Z][A-Z0-9]{5})/
    );

    if (match) {
      clubs[i].setCode(match[1]);
    }

  });

  return clubs;
}

/*************************************************************
 * FACTORISATION REQUETE CLUB
 *************************************************************/

/**
 * @function buildClubPageRequest
 * @description Construit une requête HTTP pour pagination des joueurs d'un club.
 * @param {string} codeClub
 * @param {string|null} viewState
 * @param {string|null} viewStateGenerator
 * @param {number} page
 * @returns {object} Requête compatible UrlFetchApp
 */
function buildClubPageRequest(codeClub, viewState, viewStateGenerator, page) {

   //if(DEBUG) { Logger.log(JSON.stringify(HTTP_CONFIG.OPTIONS_GET)); }
  const listUrl =
    "https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=CLUBCODE&ClubCode=" +
    codeClub;

  if (page === 1) {
    return {
      ...HTTP_CONFIG.OPTIONS_GET,
      url: listUrl
    };
  }

  return {
    url: listUrl,
    method: "post",
    payload: {
      "__VIEWSTATE": viewState,
      "__VIEWSTATEGENERATOR": viewStateGenerator,
      "__EVENTTARGET": "ctl00$ContentPlaceHolderMain$PagerHeader",
      "__EVENTARGUMENT": page.toString()
    },
    muteHttpExceptions: true
  };
}

/*************************************************************
 * DETECTION PAGES
 *************************************************************/

function extractTotalPages(html) {
  if (!html) return 1;
  const pageMatches = [...html.matchAll(/__doPostBack\('[^']+','(\d+)'\)/g)];

  if (pageMatches.length === 0) return 1;

  const pages = pageMatches.map(m => parseInt(m[1], 10));
  return Math.max(...pages);
}

/*************************************************************
 * SUPRESSION DOUBLONS
 *************************************************************/

if(!OPTIMIZED)
{
function dedupeByFFE(joueurs) {

  const map = {};

  joueurs.forEach(j => {
    if (j.NrFFE()) {
      map[j.NrFFE()] = j;
    }
  });

  return Object.values(map);
}
}
else{
function dedupeByFFE(joueurs) {

  const seen = new Set();
  const result = [];

  for (let i = 0; i < joueurs.length; i++) {

    const id = joueurs[i].NrFFE();

    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(joueurs[i]);
    }
  }

  return result;
}
}
