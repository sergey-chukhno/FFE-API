# Étude de Faisabilité & Spécifications : Migration vers l'API ChessXP FFE

Ce document synthétise l'analyse technique relative au remplacement du moteur de web scraping FFE actuel par l'API REST officielle **ChessXP FFE Player API v1.0.0** (`https://ffe.chessxp.com/docs`).

---

## 1. Contexte & Problématique

Le moteur actuel de **RecupFFE** s'appuie sur le scraping direct du site de la FFE (`echecs.asso.fr`) via des requêtes HTTP émulant ASP.NET WebForms (`__VIEWSTATE`, postbacks de pagination) et du parsing HTML par expressions régulières et parcours de chaînes.

### Limites critiques du Web Scraping actuel :
1. **Fragilité extrême** : Rupture immédiate de service au moindre changement de balisage HTML, classes CSS (`liste_clair`, `liste_fonce`) ou mise en place d'un anti-bot (Cloudflare, CAPTCHA).
2. **Complexité de maintenance** : Près de 1 850 lignes de code dédiées uniquement au parsing et à la plomberie réseau (`API_FFE_PARSE.gs` et `API_FFE_FETCH.gs`).
3. **Goulet d'étranglement FIDE (N+1)** : L'enrichissement FIDE nécessite 2 requêtes HTTP séquentielles par joueur, rendant l'opération impossible pour un club entier sans dépasser le timeout de 6 minutes de Google Apps Script.
4. **Risque de bannissement IP** lors de requêtes massives ou répétées.

---

## 2. Analyse Comparative : Scraping FFE vs API ChessXP

| Critère | Scraping FFE Actuel | API REST ChessXP (v1.0.0) | Bénéfice / Impact |
| :--- | :--- | :--- | :--- |
| **Type d'interface** | Scraping HTML non officiel | API REST JSON (OpenAPI 3.1) | **Pérennité & contrat d'interface stable** |
| **Complexité du code** | ~1 850 lignes complexes | ~150 lignes de requêtes HTTP | **Maintenance divisée par 10** |
| **Données FIDE** | $2N$ requêtes séquentielles (N+1) | Incluses nativement (`?include=fide`) | **0 requête HTTP supplémentaire** |
| **Pagination de club** | Multiples POSTs ASP.NET avec ViewState | 1 seul appel `GET` (`limit=1000`) | **Gain de vitesse x5 à x10** |
| **Vérification Excel** | 1 appel par ligne dans `licence.html` | Batch natif jusqu'à 50 licences/appel | **Vérification Excel quasi instantanée** |
| **Recherche tolérante** | Permutations de chaînes faites main | Insensible casse & accents nativement | **Fiabilité des recherches accrue** |
| **Limites de débit** | Imprévisibles (blocage d'IP) | 120 req/min avec header `Retry-After` | **Visibilité et gestion d'erreurs claire** |
| **Fraîcheur des données** | Temps réel FFE | Hebdomadaire (lundi à 03h00) | **À considérer pour les licences récentes** |

---

## 3. Correspondance Fonctionnelle

| Fonctionnalité RecupFFE | Endpoint ChessXP Recommandé | Paramètres Clés |
| :--- | :--- | :--- |
| **Recherche nominale** (`nom`, `prenom`) | `GET /api/player/search-by-name` | `last_name`, `first_name`, `include=fide`, `include_inactive=true` |
| **Recherche nominale filtrée par club** | `GET /api/player/search-by-name` | Filtrage local sur le champ `.club` retourné par l'API |
| **Effectif complet d'un club** | `GET /api/player/search-by-club` | `club="Marseille Echecs"`, `limit=1000`, `include=fide` |
| **Vérification en lot (Excel)** | `GET /api/player/batch` | `licences=W53002,B12345,...` (jusqu'à 50 par lot) |
| **Fiche individuelle par licence** | `GET /api/player/{licence_number}` | `licence_number="W53002"`, `include=fide` |
| **Répertoire des clubs & slugs** | `GET /api/club/list` | `league`, `federation`, `limit=500` |

---

## 4. Architecture Cible Proposée

L'architecture conserve strictement les contrats avec l'IHM (`index.html`, `licence.html`) et les formules Google Sheets, permettant un remplacement "drop-in" transparent.

```
       ┌───────────────────────────────┐
       │   index.html / licence.html   │
       │   Formules Google Sheets      │
       └───────────────┬───────────────┘
                       │ (Contrat JSON / Textuel inchangé)
                       ▼
       ┌───────────────────────────────┐
       │  API_FFE.gs / API_FFE_JSON.gs │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │   API_FFE_BUSINESS_LOGIC.gs   │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │       API_FFE_CLIENT.gs       │ ◄── NOUVEAU MODULE
       │   (Client HTTP REST ChessXP)  │ (Remplace API_FFE_FETCH & API_FFE_PARSE)
       └───────────────┬───────────────┘
                       │ HTTPS + X-API-Key
                       ▼
       ┌───────────────────────────────┐
       │   https://ffe.chessxp.com     │
       └───────────────────────────────┘
```

---

## 5. Spécifications Techniques d'Implémentation

### A. Configuration & Client HTTP (`API_FFE_CLIENT.gs`)

```javascript
const CHESSXP_CONFIG = {
  BASE_URL: "https://ffe.chessxp.com",
  // La clé peut être stockée dans PropertiesService.getScriptProperties()
  API_KEY: "VOTRE_CLE_API_ICI"
};

/**
 * Exécute un appel HTTP GET sécurisé vers l'API ChessXP.
 * @param {string} endpoint - Ex: "/api/player/search-by-name"
 * @param {Object} params - Paramètres de requête
 * @returns {any} Données JSON parsées
 */
function chessXpFetch(endpoint, params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
    .join("&");

  const url = `${CHESSXP_CONFIG.BASE_URL}${endpoint}${query ? "?" + query : ""}`;

  const options = {
    method: "get",
    headers: {
      "X-API-Key": CHESSXP_CONFIG.API_KEY,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code === 200) {
    return JSON.parse(response.getContentText());
  }
  if (code === 404) {
    return [];
  }
  if (code === 429) {
    throw new Error("RATE_LIMIT_EXCEEDED : Quota d'appels API dépassé (120 req/min).");
  }
  if (code === 403) {
    throw new Error("AUTH_ERROR : Clé API ChessXP invalide ou absente.");
  }

  throw new Error(`HTTP_ERROR ${code} : ${response.getContentText()}`);
}
```

### B. Adaptateur Modèle (Mapping `PlayerPublic` $\rightarrow$ `Joueur`)

Permet de conserver intactes les classes et propriétés existantes :

```javascript
/**
 * Convertit un objet PlayerPublic de l'API ChessXP en instance Joueur.
 * @param {Object} p - Objet renvoyé par l'API
 * @returns {Joueur}
 */
function mapChessXpToJoueur(p) {
  // Détermination du code de licence : 'A', 'B' ou 'N'
  let af = p.licence_type;
  if (!af) {
    if (p.ffe_licence === 2) af = "A";
    else if (p.ffe_licence === 3) af = "B";
    else af = "N";
  }

  const j = new Joueur(
    p.ffe_licence_number || "",
    `${p.last_name || ""} ${p.first_name || ""}`.trim(),
    af || "",
    p.standard_rating ? String(p.standard_rating) : "0",
    p.rapid_rating ? String(p.rapid_rating) : "0",
    p.blitz_rating ? String(p.blitz_rating) : "0",
    p.category || "",
    p.gender === 1 ? "M" : p.gender === 2 ? "F" : "",
    p.club || "Sans club",
    p.ffe_id ? String(p.ffe_id) : ""
  );

  // ID FIDE directement disponible sans appel réseau additionnel !
  if (p.fide_id) {
    j.m_idFIDE = String(p.fide_id);
  }

  return j;
}
```

### C. Réécriture de la Couche Métier (`API_FFE_BUSINESS_LOGIC.gs`)

```javascript
function ffeRechercheNominal(nom, prenom) {
  if (!nom) return { error: "Paramètre 'Nom' manquant" };

  try {
    const raw = chessXpFetch("/api/player/search-by-name", {
      last_name: nom.trim(),
      first_name: prenom ? prenom.trim() : undefined,
      limit: 50,
      include_inactive: true,
      include: "fide"
    });

    if (!raw || !raw.length) return { error: "Joueur Non trouvé" };

    const joueurs = raw.map(mapChessXpToJoueur);
    return { joueurs: joueurs };
  } catch (e) {
    return { error: e.message };
  }
}

function ffeRechercheNominalClub(nom, prenom, club) {
  const result = ffeRechercheNominal(nom, prenom);
  if (result.error) return result;

  const clubCible = normalizeForMatch(club);
  const filtres = result.joueurs.filter(j => normalizeForMatch(j.Club()).includes(clubCible));

  if (!filtres.length) return { error: "Joueur non trouvé dans ce club" };
  return { joueurs: filtres };
}

function ffeRechercheClubJoueurs(clubNom) {
  if (!clubNom) return { error: "Paramètre 'Club' manquant" };

  try {
    const raw = chessXpFetch("/api/player/search-by-club", {
      club: clubNom.trim(),
      limit: 1000,
      include_inactive: true,
      include: "fide"
    });

    if (!raw || !raw.length) return { error: "Aucun joueur trouvé pour ce club", count: 0, joueurs: [] };

    const joueurs = raw.map(mapChessXpToJoueur);
    return { joueurs: joueurs, count: joueurs.length };
  } catch (e) {
    return { error: e.message, count: 0, joueurs: [] };
  }
}
```

---

## 6. Arbitrages & Questions Préalables

Avant d'exécuter la migration, trois points méritent votre arbitrage :

1. **Obtention de la clé d'API (`X-API-Key`)** :
   - L'API requiert une clé externe (120 requêtes/minute).
   - *Action requise* : Disposer d'une clé active (via le formulaire de contact sur [api-ffe.chessxp.com](https://api-ffe.chessxp.com/)).
2. **Délai de synchronisation hebdomadaire** :
   - Les données de l'API sont régénérées chaque **lundi à 03h00**.
   - *Conséquence* : Une licence prise en milieu de semaine apparaîtra le lundi suivant.
   - *Question* : Ce délai de quelques jours est-il acceptable pour la gestion habituelle du club ?
3. **Stratégie de cohabitation (Optionnelle)** :
   - *Option A (Remplacement total)* : Supprimer le scraping et basculer 100% sur l'API ChessXP.
   - *Option B (Hybride / Fallback)* : Utiliser l'API ChessXP par défaut (rapide et propre), et conserver un fallback vers le scraping unitaire uniquement si un joueur n'est pas trouvé (pour interroger le direct FFE).

---

## 7. Feuille de Route de Mise en Œuvre

1. [ ] **Mise en place de la clé API** dans les propriétés du script (`ScriptProperties`).
2. [ ] **Création du module `API_FFE_CLIENT.gs`** avec gestion des erreurs HTTP et rate-limiting.
3. [ ] **Adaptation de `API_FFE_BUSINESS_LOGIC.gs`** pour appeler le client API et convertir les réponses.
4. [ ] **Optimisation de `licence.html`** avec le endpoint `/api/player/batch` (vérification de 50 licences par requête).
5. [ ] **Archivage propre** des fichiers de scraping devenus obsolètes (`API_FFE_FETCH.gs`, `API_FFE_PARSE.gs`, `API_FFE_FIDE.gs`).
6. [ ] **Validation sur la suite de tests** `API_FFE_TESTS.gs`.
