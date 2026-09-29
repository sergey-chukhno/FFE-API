/*************************************************************
 * PARSE FFE
 *************************************************************/

function parseFFEHtml(html) { 
  if(OPTIMIZED) {
    return parseFFEHtmlScanner(html); 
  }
  else return parseFFEHtmlBasic(html); 
}

/**
 * Parser HTML FFE version "classique".
 *
 * ✔ Très lisible et simple à comprendre
 * ✔ Basé sur regex + map/filter (approche déclarative)
 *
 * ❌ Lent (multi-pass + nombreuses allocations)
 * ❌ Consommation mémoire élevée (GC)
 *
 * 👉 À utiliser pour debug, maintenance ou référence fonctionnelle.
 * 👉 Non recommandé en production (peu performant).
 */
function parseFFEHtmlBasic(html) {
  if (!html) return [];
  var clean = html.replace(/[\r\n\t]+/g, " ");
  var tables = clean.match(/<table[^>]*>(.*?)<\/table>/gi);
  //var tables = clean.match(/<table[^>]*>[\s\S]*?(?:liste_clair|liste_fonce)[\s\S]*?<\/table>/gi);
  if (!tables) return [];

  var results = [];

  tables.forEach(table => {
    var rows = table.match(/<tr[^>]*class=['"]?(?:liste_clair|liste_fonce)['"]?[^>]*>(.*?)<\/tr>/gi);
    if (!rows) return;

    rows.forEach(rowHtml => {
      var colMatches = rowHtml.match(/<td[^>]*>(.*?)<\/td>/gi);
      if (!colMatches || colMatches.length < 10) return;

      var cols = colMatches.map(c =>
        decodeHTMLEntities(stripTags(c)).trim()
      );

      var nrFFE = cols[0];
      if (!/^[A-Z][0-9]+/.test(nrFFE)) return;

      let numericCols = cols.filter(v => /^[0-9]{3,4}\s?[A-Z]?$/.test(v));

      let idMatch = rowHtml.match(/FicheJoueur\.aspx\?Id=(\d+)/i);

      results.push(new Joueur(
        nrFFE,
        cols[1],
        cols[2],
        numericCols[0] || "0",
        numericCols[1] || "0",
        numericCols[2] || "0",
        cols[7],
        "",
        cols[9],
        idMatch ? idMatch[1] : ""
      ));
    });
  });

  return results;
}

/**
 * Parser HTML FFE optimisé (version recommandée).
 *
 * ✔ Bon compromis performance / lisibilité
 * ✔ Réduction des allocations (pas de map/filter)
 * ✔ Parsing plus direct (boucles while)
 *
 * ❌ Utilise encore des regex (coût modéré)
 *
 * 👉 Version recommandée en production.
 * 👉 Suffisamment rapide et robuste pour la majorité des cas.
 */
function parseFFEHtmlTurbo(html) {

  if (!html) return [];

  const clean = html.replace(/[\r\n\t]+/g, " ");

  const joueurs = [];
  let j = 0;

  const rowRegex =
    /<tr[^>]*class=['"]?(?:liste_clair|liste_fonce)['"]?[^>]*>(.*?)<\/tr>/gi;

  let rowMatch;

  while ((rowMatch = rowRegex.exec(clean)) !== null) {

    const row = rowMatch[1];

    const cells = [];
    let c = 0;

    const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(row)) !== null) {

      /*let value = decodeHTMLEntities(
        cellMatch[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
      ).trim();*/

      let value = stripTagsFast(cellMatch[1]);

      if (value.indexOf("&") !== -1) {
        value = decodeHTMLEntities(value);
      }

      value = value.replace(/&nbsp;/g, " ").trim();

      cells[c++] = value;

    }

    if (c < 10) continue;

    const nrFFE = cells[0];
    if (!nrFFE || nrFFE.length < 2) continue;

    if (!/^[A-Z][0-9]+/.test(nrFFE)) continue;

    try {

      const idMatch = row.match(/FicheJoueur\.aspx\?Id=(\d+)/i);

      joueurs[j++] = new Joueur(
        nrFFE,
        cells[1],
        cells[2],
        cells[4] || "0",
        cells[5] || "0",
        cells[6] || "0",
        cells[7],
        "",
        cells[9],
        idMatch ? idMatch[1] : ""
      );

    }
    catch (e) {

      if (DEBUG) Logger.log("Erreur parsing ligne : " + e.message);

    }

  }

  joueurs.length = j;

  return joueurs;
}

/**
 * Parser HTML FFE haute performance (scan manuel).
 *
 * ✔ Très rapide (évite les regex lourdes)
 * ✔ Parsing linéaire via indexOf (faible coût CPU)
 * ✔ Réduction forte du GC
 *
 * ❌ Moins lisible (logique impérative)
 * ❌ Plus sensible aux variations HTML
 *
 * 👉 À utiliser si besoin de performance maximale.
 * 👉 Trade-off lisibilité / robustesse.
 */
function parseFFEHtmlScanner(html) {

  if (!html) return [];

  const clean = html.replace(/[\r\n\t]+/g, " ");

  const joueurs = [];
  let j = 0;

  let pos = 0;

  while (true) {

    const trStart = clean.indexOf("<tr", pos);
    if (trStart === -1) break;

    const trEnd = clean.indexOf("</tr>", trStart);
    if (trEnd === -1) break;

    const row = clean.substring(trStart, trEnd);

    pos = trEnd + 5;

    // filtrer uniquement les lignes joueurs
    if (
      row.indexOf("liste_clair") === -1 &&
      row.indexOf("liste_fonce") === -1
    ) continue;

    const cells = [];
    let c = 0;

    let tdPos = 0;

    while (true) {

      const tdStart = row.indexOf("<td", tdPos);
      if (tdStart === -1) break;

      const tdOpenEnd = row.indexOf(">", tdStart);
      if (tdOpenEnd === -1) break;

      const tdClose = row.indexOf("</td>", tdOpenEnd);
      if (tdClose === -1) break;

      let value = row.substring(tdOpenEnd + 1, tdClose);

      value = stripTagsFast(value);

      if (value.indexOf("&") !== -1) {
        value = decodeHTMLEntities(value);
      }

      value = value.replace(/&nbsp;/g, " ").trim();

      cells[c++] = value;

      tdPos = tdClose + 5;

    }

    if (c < 10) continue;

    const nrFFE = cells[0];

    if (!nrFFE || nrFFE.length < 2) continue;
    if (!/^[A-Z][0-9]+/.test(nrFFE)) continue;

    try {

      let id = "";
      const idPos = row.indexOf("FicheJoueur.aspx?Id=");

      if (idPos !== -1) {

        const start = idPos + 19;
        let end = start;

        while (end < row.length && row[end] >= "0" && row[end] <= "9") {
          end++;
        }

        id = row.substring(start, end);

      }

      joueurs[j++] = new Joueur(
        nrFFE,
        cells[1],
        cells[2],
        cells[4] || "0",
        cells[5] || "0",
        cells[6] || "0",
        cells[7],
        "",
        cells[9],
        id
      );

    }
    catch (e) {

      if (DEBUG) Logger.log("Erreur parsing ligne : " + e.message);

    }

  }

  joueurs.length = j;

  return joueurs;

}

/**
 * Parser HTML FFE ultra optimisé (version agressive).
 *
 * ✔ Performance maximale (zéro structure intermédiaire)
 * ✔ Minimisation extrême des allocations
 * ✔ Parsing direct sans tableau ni regex
 *
 * ❌ Complexe et peu lisible
 * ❌ Maintenance difficile
 * ❌ Plus fragile aux changements HTML
 *
 * 👉 Gain marginal vs Scanner (~5-10%)
 * 👉 À réserver aux cas extrêmes (volume massif).
 */
function parseFFEHtmlScannerV3(html) {

  if (!html) return [];

  const clean = html.replace(/[\r\n\t]+/g, " ");

  const joueurs = [];
  let j = 0;
  let pos = 0;

  while (true) {

    const trStart = clean.indexOf("<tr", pos);
    if (trStart === -1) break;

    const trEnd = clean.indexOf("</tr>", trStart);
    if (trEnd === -1) break;

    pos = trEnd + 5;

    // filtrage rapide sans substring
    if (
      clean.indexOf("liste_clair", trStart) === -1 &&
      clean.indexOf("liste_fonce", trStart) === -1
    ) continue;

    let tdPos = trStart;

    let c = 0;

    let nrFFE="", nom="", prenom="", elo="", rap="", blitz="", cat="", club="";

    while (true) {

      const tdStart = clean.indexOf("<td", tdPos);
      if (tdStart === -1 || tdStart > trEnd) break;

      const tdOpenEnd = clean.indexOf(">", tdStart);
      if (tdOpenEnd === -1) break;

      const tdClose = clean.indexOf("</td>", tdOpenEnd);
      if (tdClose === -1) break;

      let value = clean.substring(tdOpenEnd + 1, tdClose);

      // nettoyage minimal conditionnel
      if (value.indexOf("<") !== -1) {
        value = stripTagsFast(value);
      }

      if (value.indexOf("&") !== -1) {
        value = decodeHTMLEntities(value);
      }

      if (value.indexOf("&nbsp;") !== -1) {
        value = value.replace(/&nbsp;/g, " ");
      }

      value = value.trim();

      // affectation directe (pas de tableau)
      switch (c) {
        case 0: nrFFE = value; break;
        case 1: nom = value; break;
        case 2: prenom = value; break;
        case 4: elo = value; break;
        case 5: rap = value; break;
        case 6: blitz = value; break;
        case 7: cat = value; break;
        case 9: club = value; break;
      }

      c++;
      tdPos = tdClose + 5;

    }

    if (c < 10) continue;
    if (!nrFFE || nrFFE.length < 2) continue;
    if (!/^[A-Z][0-9]+/.test(nrFFE)) continue;

    // extraction ID sans substring globale
    let id = "";
    const idPos = clean.indexOf("FicheJoueur.aspx?Id=", trStart);

    if (idPos !== -1 && idPos < trEnd) {

      let start = idPos + 19;
      let end = start;

      while (end < trEnd && clean[end] >= "0" && clean[end] <= "9") {
        end++;
      }

      id = clean.substring(start, end);
    }

    try {
      joueurs[j++] = new Joueur(
        nrFFE, nom, prenom,
        elo || "0", rap || "0", blitz || "0",
        cat, "", club, id
      );
    }
    catch (e) {
      if (DEBUG) Logger.log("Erreur parsing ligne : " + e.message);
    }

  }

  joueurs.length = j;
  return joueurs;
}

/*************************************************************
 * TEST
 *************************************************************/

function benchmarkParsersUnified() {

  const html = UrlFetchApp.fetch(
    "https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=FFE&JrNom=MARTIN&JrPrenom=Louis"
  ).getContentText();

  const ITER = 1000;

  function bench(fn, name) {

    const times = [];
    let totalPlayers = 0;

    for (let i = 0; i < ITER; i++) {

      const t0 = Date.now();

      const result = fn(html);

      const t1 = Date.now();

      times.push(t1 - t0);
      totalPlayers += result.length;

    }

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / ITER;
    const min = Math.min.apply(null, times);
    const max = Math.max.apply(null, times);

    // écart-type (important pour Apps Script)
    const variance = times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / ITER;
    const stddev = Math.sqrt(variance);

    Logger.log(
      "------------------------------------\n" +
      name + "\n" +
      "runs     : " + ITER + "\n" +
      "players  : " + (totalPlayers / ITER) + "\n" +
      "avg      : " + avg.toFixed(2) + " ms\n" +
      "min      : " + min + " ms\n" +
      "max      : " + max + " ms\n" +
      "stddev   : " + stddev.toFixed(2) + " ms\n" +
      "total    : " + sum + " ms"
    );

  }

  Logger.log("===== BENCHMARK PARSERS (UNIFIED) =====");

  bench(parseFFEHtmlBasic, "BASIC");
  bench(parseFFEHtmlTurbo, "TURBO");
  bench(parseFFEHtmlScanner, "SCANNER");
  bench(parseFFEHtmlScannerV3, "SCANNER V3");

}
