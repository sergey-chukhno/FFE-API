/*************************************************************
 * API_FFE_TESTS
 *************************************************************/

/*************************************************************
 * RUN ALL TESTS
 *************************************************************/

function test_ALL() {

  test_NOMINAL();
  test_NOMINAL_CLUB();

  test_FETCH_COMPARE();
  test_CLUB_JOUEURS();

  test_HTML_STRUCTURE();
  test_SENTINEL();

  test_CHESSXP_API();
  test_HYBRID_FALLBACK();
  test_BENCHMARK_SCRAPING_VS_API();

  TestRunner.summary();

}

/*************************************************************
 * TEST RUNNER
 *************************************************************/

const TestRunner = {

  suite: "",
  testIndex: 0,
  success: 0,
  total: 0,

  globalSuccess: 0,
  globalTotal: 0,

  startSuite(name) {

    this.suite = name;
    this.testIndex = 0;
    this.success = 0;
    this.total = 0;

    Logger.log("=== " + name + " ===");

  },

  run(test) {

    this.total++;
    this.globalTotal++;
    this.testIndex++;

    const label = "[Test " + this.testIndex + "] " + test.desc;

    let params = [];

    if (test.nom !== undefined) params.push('nom:"' + test.nom + '"');
    if (test.prenom !== undefined) params.push('prenom:"' + test.prenom + '"');
    if (test.club !== undefined) params.push('club:"' + test.club + '"');

    Logger.log(label + (params.length ? ", " + params.join(", ") : ""));

    const start = Date.now();

    let result;
    let ok = false;

    try {

      result = test.fn(test);

      if (test.validator) {
        ok = test.validator(result, test.expected);
      } else {
        ok = result === test.expected;
      }

    } catch (e) {
      result = "ERROR: " + e.message;
    }

    const elapsed = Date.now() - start;

    Logger.log("Attendu : " + test.expected);
    //Logger.log("Obtenu  : " + JSON.stringify(result));
    if (typeof result === "string") {
      Logger.log("Obtenu  : " + result);
    } else {
      Logger.log("Obtenu  : " + JSON.stringify(result, null, 2));
    }

    if (ok) {
      this.success++;
      this.globalSuccess++;
    }

    Logger.log(
      "STATUS  : " +
      (ok ? "OK" : "KO") +
      " (" + this.success + "/" + this.total + ")" +
      " [" + elapsed + " ms]"
    );
    Logger.log("------------------------------------");
  },

  summary() {

    Logger.log("");
    Logger.log("===== TEST SUMMARY =====");
    Logger.log("TOTAL : " + this.globalTotal);
    Logger.log("OK    : " + this.globalSuccess);
    Logger.log("KO    : " + (this.globalTotal - this.globalSuccess));
    Logger.log("========================");

  }

};

/*************************************************************
 * VALIDATORS
 *************************************************************/

function validateEquals(actual, expected) {
  return actual === expected;
}

function validateContains(actual, expected) {
  return String(actual).includes(expected);
}

function validateJoueur(obj) {
  return obj && typeof obj === "object";
}

function validateJoueurMetier(actual) {

  if (!actual) return false;
  if (typeof actual !== "string") return false;

  const parts = actual.split("|").map(p => p.trim());

  if (parts.length < 8) return false;

  const nrFFE = parts[0];
  const af = parts[2].replace("Af. ","");
  const elo = parts[3];
  const rap = parts[4];
  const blz = parts[5];

  if (!nrFFE) return false;
  if (!(af === "A" || af === "B" || af === "N")) return false;
  if (!elo || !rap || !blz) return false;

  return true;

}

function validateExact(expected) {

  return (actual) =>
    normalizeTestString(actual) === normalizeTestString(expected);

}

/*************************************************************
 * TEST NOMINAL
 *************************************************************/

function test_NOMINAL() {

  TestRunner.startSuite("NOMINAL");

  TestRunner.run({
    desc: "Nom manquant",
    nom: "",
    prenom: "William",
    expected: "Paramètre 'Nom' manquant",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: validateEquals
  });

  TestRunner.run({
    desc: "Prénom manquant",
    nom: "Azari",
    prenom: "",
    expected: "Homonymes (2)",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: validateContains
  });

  TestRunner.run({

    desc:"Cas nominal Azari",
    nom:"Azari",
    prenom:"William",
    expected:"joueur AZARI William",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: validateExact

  });

  TestRunner.run({
    desc: "Joueur introuvable",
    nom: "ZYZYGY",
    prenom: "Robot",
    expected: "Joueur Non trouvé",  
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: validateEquals
  });

  TestRunner.run({
    desc: "Homonymes Louis Martin",
    nom: "MARTIN",
    prenom: "Louis",
    expected: "Homonymes (4)",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: validateContains
  });

  TestRunner.run({
    desc: "Nom composé sans tiret",
    nom: "VACHIER LAGRAVE",
    prenom: "Maxime",
    expected: STRING_STRICT_COMPARE ? "Joueur Non trouvé" : "Joueur VACHIER-LAGRAVE Maxime",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: (res, exp) => STRING_STRICT_COMPARE ? res === exp : validateJoueurMetier(res)
  });

  TestRunner.run({
    desc: "Accent prénom",
    nom: "CHIRON",
    prenom: "Grégory",
    expected: STRING_STRICT_COMPARE ? "Joueur Non trouvé" : "Joueur CHIRON Gregory",
    fn: (t) => RECHERCHE_FFE_NOMINAL(t.nom, t.prenom),
    validator: (res, exp) => STRING_STRICT_COMPARE ? res === exp : validateJoueurMetier(res)
  });

}

/*************************************************************
 * TEST NOMINAL CLUB
 *************************************************************/

function test_NOMINAL_CLUB() {

  TestRunner.startSuite("NOMINAL CLUB");

  TestRunner.run({
    desc: "Filtre club Marseille",
    nom: "AZARI",
    prenom: "William",
    club: "marseille-echecs",
    expected: "joueur AZARI William",
    fn: (t) =>RECHERCHE_FFE_NOMINAL_CLUB(t.nom,t.prenom,t.club),
    validator: validateJoueurMetier
  });

  TestRunner.run({

    desc: "Filtre club Marseille",
    nom: "CHIRON*",
    prenom: "",
    club: "marseille",
    expected: "Homonymes (2)",
    fn: (t) =>RECHERCHE_FFE_NOMINAL_CLUB(t.nom,t.prenom,t.club),
    validator: validateContains

  });

  TestRunner.run({

    desc: "Filtre club cavalier",
    nom: "CHIRON",
    prenom: "",
    club: "cavalier-noir",
    expected: "Homonymes (3)",
    fn: (t) =>RECHERCHE_FFE_NOMINAL_CLUB(t.nom,t.prenom,t.club),
    validator: validateContains

  });

}

/*************************************************************
 * TEST FETCH CLUB (PERFORMANCE)
 *************************************************************/

function test_FETCH_COMPARE() {

  TestRunner.startSuite("FETCH COMPARE");

  TestRunner.run({

    desc: "Sequential vs Threaded",
    club: "Hay Chess",

    expected: "mêmes joueurs pour toutes les variantes",

    fn: (t) => {

      Logger.log("---------------------------------");
      Logger.log("=> fetchPlayersListClubSequential");
      const t1 = Date.now();
      const sequential = fetchPlayersListClubSequential(t.club);
      const seqTime = Date.now() - t1;

      Logger.log("-------------------------------");
      Logger.log("=> fetchPlayersListClubThreaded");
      const t2 = Date.now();
      const threaded = fetchPlayersListClubThreaded(t.club);
      const thrTime = Date.now() - t2;

      Logger.log("------------------------------------");
      Logger.log("=> fetchPlayersListClubThreadedUltra");
      const t3 = Date.now();
      const threadedUltra = fetchPlayersListClubThreadedUltra(t.club);
      const thrTimeUltra = Date.now() - t3;

      Logger.log("------------------------------------");
      Logger.log("=> fetchPlayersListClubThreadedV3");
      const t4 = Date.now();
      const threadedV3 = fetchPlayersListClubThreadedV3(t.club);
      const thrTimeV3 = Date.now() - t4;

      Logger.log("------------------------------------");
      Logger.log("=> fetchPlayersListClubThreadedV4");
      const t5 = Date.now();
      const threadedV4 = fetchPlayersListClubThreadedV4(t.club);
      const thrTimeV4 = Date.now() - t5;

      return {
        sequential: seqTime + " ms",
        threaded: thrTime + " ms",
        threadedUltra: thrTimeUltra + " ms",
        threadedV3: thrTimeV3 + " ms",
        threadedV4: thrTimeV4 + " ms",
        seqPlayers: sequential.length,
        thrPlayers: threaded.length,
        thrPlayersUltra: threadedUltra.length,
        thrPlayersV3: threadedV3.length,
        thrPlayersV4: threadedV4.length
      };

    },

    validator: (r) => {

      const ref = r.seqPlayers;

      Logger.log("Sequential    (Réf) : " + ref + " joueurs [" + r.sequential + "]");
      Logger.log("Threaded            : " + r.thrPlayers + " joueurs [" + r.threaded + "]");
      Logger.log("ThreadedUltra       : " + r.thrPlayersUltra + " joueurs [" + r.threadedUltra + "]");
      Logger.log("ThreadedV3          : " + r.thrPlayersV3 + " joueurs [" + r.threadedV3 + "]");
      Logger.log("ThreadedV4          : " + r.thrPlayersV4 + " joueurs [" + r.threadedV4 + "]");

      // ✅ Validation stricte : toutes les variantes doivent égaler la référence (seqPlayers)
      return (
        ref > 0 &&
        r.thrPlayers === ref &&
        r.thrPlayersUltra === ref &&
        r.thrPlayersV3 === ref &&
        r.thrPlayersV4 === ref
      );
    }

  });

}

/*************************************************************
 * TEST FETCH CLUB (JOUEURS)
 *************************************************************/

function test_CLUB_JOUEURS() {

  TestRunner.startSuite("CLUB JOUEURS");

  TestRunner.run({
    desc: "fetchPlayersListClub Marseille",
    club: "MARSEILLE ECHECS", //tout en majuscules, sans tiret
    expected: STRING_STRICT_COMPARE ? "Club introuvable" : "joueurs trouvés",
    fn: (t) => {
      try {
        const joueurs = fetchPlayersListClub(t.club);
        return joueurs.length;
      } catch (e) {
        return e.message;
      }
    },
    validator: (res, exp) => {
      if (STRING_STRICT_COMPARE) return String(res).includes("Club introuvable");
      return typeof res === "number" && res > 0;
    }
});

}

/*************************************************************
 * TEST STRUCTURE HTML
 *************************************************************/

function test_HTML_STRUCTURE() {

  TestRunner.startSuite("HTML STRUCTURE");

  TestRunner.run({

    desc: "Structure HTML table joueurs",

    expected: "structure parseable",

    fn: () => {

      const html = fetchUrl(
        "https://www.echecs.asso.fr/ListeJoueurs.aspx?Action=FFE&JrNom=AZARI",
        HTTP_CONFIG.OPTIONS_GET
      );

      return {
        table: /<table/i.test(html),
        rows: /(liste_clair|liste_fonce)/i.test(html),
        fiche: /FicheJoueur\.aspx\?Id=/i.test(html),
        td: (html.match(/<td/gi) || []).length
      };

    },

    validator: (actual) => {

      Logger.log(JSON.stringify(actual));

      return (
        actual.table &&
        actual.rows &&
        actual.fiche &&
        actual.td > 20
      );

    }

  });

}

/*************************************************************
 * TEST SENTINEL JOUEUR
 *************************************************************/

function test_SENTINEL() {

  TestRunner.startSuite("SENTINEL");

  TestRunner.run({

    desc: "Scraper trouve SONG Julien",
    nom: "SONG",
    prenom: "Julien",

    expected: "joueur trouvé",

    fn: (t) => {

      const joueurs = fetchPlayersList(t.nom,t.prenom);

      Logger.log("Nb joueurs retournés : " + joueurs.length);

      if (joueurs.length > 0) {
        Logger.log("Premier joueur brut : " + JSON.stringify(joueurs[0]));
      }

      return joueurs.length;

    },

    validator: (n) => n > 0

  });

}

/*************************************************************
 * TEST CHESSXP API (CLIENT & MAPPING)
 *************************************************************/

function test_CHESSXP_API() {

  TestRunner.startSuite("CHESSXP API");

  TestRunner.run({
    desc: "Recherche nominale AZARI William",
    nom: "AZARI",
    prenom: "William",
    expected: "K51184 (FIDE enrichi)",
    fn: (t) => {
      const joueurs = chessXpSearchPlayersByName(t.nom, t.prenom);
      if (!joueurs || !joueurs.length) return "Aucun résultat";
      const j = joueurs[0];
      return `${j.NrFFE()} | ${j.NP()} | ${j.Club()} | Fide ${j.IdFIDE()}`;
    },
    validator: (actual) => {
      return actual.includes("K51184") && actual.includes("AZARI William") && actual.includes("Marseille-Echecs") && actual.includes("Fide 36062375");
    }
  });

  TestRunner.run({
    desc: "Homonymes MARTIN (au moins 2 joueurs actifs)",
    nom: "MARTIN",
    prenom: "",
    expected: "au moins 2 joueurs",
    fn: (t) => {
      const joueurs = chessXpSearchPlayersByName(t.nom, t.prenom);
      return joueurs.length;
    },
    validator: (count) => count >= 2
  });

  TestRunner.run({
    desc: "Nom composé VACHIER-LAGRAVE Maxime",
    nom: "VACHIER-LAGRAVE",
    prenom: "Maxime",
    expected: "Trouvé avec Elo > 2700",
    fn: (t) => {
      const joueurs = chessXpSearchPlayersByName(t.nom, t.prenom);
      if (!joueurs || !joueurs.length) return "Non trouvé";
      return parseInt(joueurs[0].Elo(), 10) > 2700 ? "OK" : "Elo trop bas";
    },
    validator: (res) => res === "OK"
  });

  TestRunner.run({
    desc: "Joueur introuvable ZYZYGY Robot",
    nom: "ZYZYGY",
    prenom: "Robot",
    expected: 0,
    fn: (t) => {
      const joueurs = chessXpSearchPlayersByName(t.nom, t.prenom);
      return joueurs.length;
    },
    validator: validateEquals
  });

  TestRunner.run({
    desc: "Récupération unitaire par licence K51184",
    licence: "K51184",
    expected: "AZARI William",
    fn: (t) => {
      const j = chessXpGetPlayerByLicence(t.licence);
      return j ? j.NP() : "null";
    },
    validator: (np) => np.includes("AZARI")
  });

  TestRunner.run({
    desc: "Récupération par lot (batch) 2 licences",
    licences: ["K51184", "R00057"],
    expected: 2,
    fn: (t) => {
      const batch = chessXpGetPlayersBatch(t.licences);
      return batch.length;
    },
    validator: validateEquals
  });

}

/*************************************************************
 * TEST COUCHE METIER HYBRIDE & FALLBACK AUTOMATIQUE
 *************************************************************/

function test_HYBRID_FALLBACK() {

  TestRunner.startSuite("HYBRID & FALLBACK");

  // Test 1: Recherche nominale servie par ChessXP (source = CHESSXP)
  TestRunner.run({
    desc: "Recherche nominale standard via ChessXP",
    nom: "AZARI",
    prenom: "William",
    expected: "CHESSXP (1 joueur)",
    fn: (t) => {
      const res = ffeRechercheNominal(t.nom, t.prenom);
      return `${res.source} (${res.joueurs ? res.joueurs.length : 0} joueur)`;
    },
    validator: (act) => act.includes("CHESSXP (1 joueur)")
  });

  // Test 2: Fallback automatique sur FFE Scraping pour les licences N inactives absentes de ChessXP
  TestRunner.run({
    desc: "Fallback automatique FFE pour joueur absent de ChessXP (MARTIN Louis)",
    nom: "MARTIN",
    prenom: "Louis",
    expected: "FFE_SCRAPING",
    fn: (t) => {
      const res = ffeRechercheNominal(t.nom, t.prenom);
      return res.source;
    },
    validator: (src) => src === "FFE_SCRAPING"
  });

  // Test 3: Forçage manuel du scraping direct (forceScraping = true)
  TestRunner.run({
    desc: "Forçage manuel scraping direct (forceScraping=true)",
    nom: "AZARI",
    prenom: "William",
    expected: "FFE_SCRAPING",
    fn: (t) => {
      const res = ffeRechercheNominal(t.nom, t.prenom, true);
      return res.source;
    },
    validator: (src) => src === "FFE_SCRAPING"
  });

  // Test 4: Joueur introuvable nulle part
  TestRunner.run({
    desc: "Joueur introuvable nulle part (ZYZYGY Robot)",
    nom: "ZYZYGY",
    prenom: "Robot",
    expected: "Joueur Non trouvé",
    fn: (t) => {
      const res = ffeRechercheNominal(t.nom, t.prenom);
      return res.error;
    },
    validator: validateEquals
  });

  // Test 5: Recherche Club Hybride
  TestRunner.run({
    desc: "Effectif Club Hybride (Marseille-Echecs)",
    club: "Marseille-Echecs",
    expected: "CHESSXP avec joueurs",
    fn: (t) => {
      const res = ffeRechercheClubJoueurs(t.club);
      return `${res.source} (${res.count} joueurs)`;
    },
    validator: (act) => act.startsWith("CHESSXP") && !act.includes("(0 joueurs)")
  });

  // Test 6: Couche JSON Hybride (avec source et lienFIDE)
  TestRunner.run({
    desc: "Couche JSON avec source et lienFIDE",
    nom: "AZARI",
    prenom: "William",
    expected: "CHESSXP avec lienFIDE",
    fn: (t) => {
      const json = RECHERCHE_FFE_NOMINAL_JSON(t.nom, t.prenom);
      const hasFide = json.joueurs && json.joueurs[0] && json.joueurs[0].lienFIDE;
      return `${json.source} | FIDE: ${!!hasFide}`;
    },
    validator: (act) => act === "CHESSXP | FIDE: true"
  });

}

/*************************************************************
 * BENCHMARK COMPARATIF : SCRAPING vs CHESSXP API
 *************************************************************/

function test_BENCHMARK_SCRAPING_VS_API() {

  TestRunner.startSuite("BENCHMARK SCRAPING vs API");

  TestRunner.run({
    desc: "Comparatif Recherche Nominale (AZARI William)",
    expected: "API plus rapide que Scraping",
    fn: () => {
      // 1. Scraping FFE
      const t0 = Date.now();
      const scrapPlayers = fetchPlayersList("AZARI", "William");
      const scrapDuration = Date.now() - t0;

      // 2. API ChessXP
      const t1 = Date.now();
      const apiPlayers = chessXpSearchPlayersByName("AZARI", "William");
      const apiDuration = Date.now() - t1;

      const speedup = scrapDuration > 0 ? (scrapDuration / Math.max(1, apiDuration)).toFixed(1) : "N/A";

      Logger.log("=== RÉSULTATS COMPARATIFS NOMINAL ===");
      Logger.log(`Scraping FFE : ${scrapDuration} ms (${scrapPlayers.length} joueur(s))`);
      Logger.log(`API ChessXP  : ${apiDuration} ms (${apiPlayers.length} joueur(s))`);
      Logger.log(`Accélération : x${speedup}`);

      return {
        scraping_ms: scrapDuration,
        api_ms: apiDuration,
        speedup: `x${speedup}`,
        scraping_count: scrapPlayers.length,
        api_count: apiPlayers.length
      };
    },
    validator: (res) => {
      return res.api_count > 0 && res.scraping_count > 0;
    }
  });

}
