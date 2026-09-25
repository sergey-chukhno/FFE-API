# Questions & Réponses Techniques et Fonctionnelles (FAQ)

*Auteur : Sergey CHUKHNO*  
*Date : Septembre 2026*  
*Projet : RecupFFE — Modernisation et Optimisation Hybride*

---

## Sommaire

1. [Comment tester du code Google Apps Script (.gs) hors de l'écosystème Google ?](#1-comment-tester-du-code-google-apps-script-gs-hors-de-lécosystème-google-)
2. [Préservation des fonctionnalités initiales : gestion des accents, tirets et normalisation](#2-préservation-des-fonctionnalités-initiales--gestion-des-accents-tirets-et-normalisation)
3. [Gestion des homonymes : l'API retourne-t-elle tous les résultats ou seulement le premier ?](#3-gestion-des-homonymes--lapi-retourne-t-elle-tous-les-résultats-ou-seulement-le-premier-)
4. [Vérification de la mise à jour de l'API ChessXP et justification de l'architecture hybride](#4-vérification-de-la-mise-à-jour-de-lapi-chessxp-et-justification-de-larchitecture-hybride)

---

## 1. Comment tester du code Google Apps Script (.gs) hors de l'écosystème Google ?

### Principe technique
Bien que les fichiers portent l'extension `.gs`, **Google Apps Script repose depuis 2020 sur le moteur JavaScript moderne standard (V8)** — le même moteur qui anime Node.js, Google Chrome et Microsoft Edge.  
L'intégralité du code algorithmique (parsing, structures de données, classes orientées objet, filtres, logique métier) est donc du pur JavaScript standard et s'exécute à l'identique en environnement local.

### Les spécificités Google Apps Script
Dans le cloud Google, l'environnement met à disposition des services globaux propriétaires :
* `UrlFetchApp` (requêtes HTTP),
* `CacheService` (mémoire cache temporaire),
* `Logger` (journalisation des traces),
* `google.script.run` (pont RPC asynchrone entre la page HTML cliente et le serveur Apps Script).

### Notre dispositif de test en local (sans compte Google)
Pour permettre un développement et des tests rapides en local sans déploiement intermédiaire :

1. **Polyfills et Mocks légers** (implémentés dans `scratch/run_gas_tests.js`) :
   * `UrlFetchApp.fetch(url, options)` et `fetchAll(requests)` sont redirigés vers le protocole HTTP natif de Node.js (`https` / `http`).
   * `CacheService.getScriptCache()` est simulé par une `Map` mémoire avec expiration de type TTL.
   * `Logger.log()` est redirigé vers le flux standard `console.log()`.

2. **Serveur de développement autonome (`dev_server.js`)** :
   * Lance un serveur HTTP local sur le port `3030`.
   * Sert directement `index.html` et `licence.html`.
   * Intercepte les appels clients `google.script.run.NOM_FONCTION(...)` via un proxy JavaScript et les achemine vers un point d'entrée RPC local (`POST /api/rpc`).
   * **Bénéfice** : Possibilité de tester l'interface graphique complète (glisser-déposer de fichiers Excel, pagination, filtres, barre de chargement) dans n'importe quel navigateur en local.

3. **Déploiement final vers Google Apps Script** :
   * Réalisable à tout moment via l'outil en ligne de commande officiel Google **`@google/clasp`** (`clasp login` puis `clasp push`).

---

## 2. Préservation des fonctionnalités initiales : gestion des accents, tirets et normalisation

Toutes les règles de normalisation et d'insensibilité du code historique ont été scrupuleusement conservées et consolidées dans `API_FFE_UTILITIES.gs` et `API_FFE_BUSINESS_LOGIC.gs`.

### A. Traitement des accents
La fonction `removeAccents(str)` utilise la décomposition canonique Unicode NFD pour isoler et supprimer les signes diacritiques :
```javascript
function removeAccents(str) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}
```
Tous les caractères accentués (`é`, `è`, `ê`, `ë`, `à`, `â`, `î`, `ï`, `ô`, `ù`, `ç`, `É`, etc.) sont systématiquement convertis en leur lettre de base sans accent (`e`, `a`, `i`, `o`, `u`, `c`, `E`).

### B. Traitement des tirets et des espaces
La fonction `normalizeForMatch(str)` standardise les chaînes de comparaison :
```javascript
function normalizeForMatch(str) {
  if (!str) return "";
  return removeAccents(str)
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```
* **Exemple concret** :
  * `"Marseille-Echecs"` $\rightarrow$ `"marseille echecs"`
  * `"Marseille échecs"` $\rightarrow$ `"marseille echecs"`
  * `"Marseille  Échecs"` $\rightarrow$ `"marseille echecs"`
  Ces trois variantes produisent une chaîne strictement équivalente.

### C. Génération de variantes de recherche (`buildSearchVariantes`)
Pour le scraping direct sur le site officiel de la FFE (`echecs.asso.fr`), la fonction historique `buildSearchVariantes` génère automatiquement les permutations avec espaces et avec tirets afin de maximiser le taux de succès si la recherche stricte (`STRING_STRICT_COMPARE`) est désactivée.

---

## 3. Gestion des homonymes : l'API retourne-t-elle tous les résultats ou seulement le premier ?

Le comportement a été calibré selon les deux interfaces de l'application :

### A. Dans la Recherche Joueurs (`index.html`)
* **L'API retourne TOUS les homonymes disponibles** (jusqu'à 50 résultats par défaut, paramètre configurable `CHESSXP_CONFIG.DEFAULT_SEARCH_LIMIT`).
* **Exemple** : Lors d'une recherche sur le nom de famille **"CHIRON"** (sans spécifier de prénom) :
  * L'API renvoie la liste complète des joueurs licenciés portant ce nom (*CHIRON Gabin*, *CHIRON Jules*, *CHIRON Sacha*).
  * L'utilisateur peut ainsi identifier visuellement le bon joueur via sa catégorie, son club ou son classement Elo.

### B. Dans l'Import Excel par lot (`licence.html`)
* **Cas 1 : Le numéro de licence est renseigné dans le tableur Excel** :
  * Aucune ambiguïté : la licence FFE (ex: `K51184`) est un identifiant unique national. Le joueur correspondant est résolu sans risque d'erreur.
* **Cas 2 : Pas de numéro de licence, uniquement Nom + Prénom** :
  * Le moteur recherche en priorité le joueur portant ce nom et ce prénom **au sein du Club cible** (`clubCible`).
  * S'il n'existe aucun homonyme dans le club cible, il effectue une recherche nominale ouverte et associe le joueur trouvé en affichant son club réel avec le statut ambre :  
    `⚠️ Autre club (NomDuClub)`.

---

## 4. Vérification de la mise à jour de l'API ChessXP et justification de l'architecture hybride

### Peut-on vérifier si l'API ChessXP est mise à jour chaque semaine ?
**Oui.** L'API ChessXP expose publiquement un point d'accès d'état de santé :  
👉 **`GET https://ffe.chessxp.com/health`**

Chaque joueur renvoie également un bloc de métadonnées `source` contenant l'horodatage précis de son ingestion (`ingested_at`).

### Relevé technique effectué le 25 septembre 2026
L'interrogation de l'endpoint `/health` produit la réponse suivante :

```json
{
  "status": "healthy",
  "database": {
    "exists": true,
    "accessible": true,
    "row_count": 3687,
    "last_refresh_utc": "2026-09-05T01:02:19+00:00",
    "stale_days_since_refresh": 20
  }
}
```

### Analyse des données
1. **Dernière mise à jour réelle** : La base de données a été rafraîchie le **samedi 5 septembre 2026 à 01h02 UTC** (`last_refresh_utc`).
2. **Constat de caducité** : Au 25 septembre 2026, la base de données compte **20 jours d'ancienneté** sans mise à jour (`stale_days_since_refresh: 20`).
3. **Conclusion** : Le rafraîchissement hebdomadaire n'est pas systématique ni garanti à jour fixe (comme le lundi) par le fournisseur externe.

### Enseignement majeur : La valeur critique de notre Architecture Hybride (Option B)
Ce constat confirme la pertinence du choix architectural opéré :

* **Si nous avions basculé à 100 % sur l'API ChessXP** : tous les nouveaux licenciés de mi-septembre (comme le joueur *CHUKHNO Maxime*, licencié récemment) auraient été introuvables.
* **Grâce à notre architecture hybride avec fallback automatique** :
  1. Dès qu'un joueur n'est pas présent dans l'API ChessXP, l'application bascule **automatiquement et de manière transparente vers le scraping officiel en direct sur `echecs.asso.fr`** (temps réel).
  2. Le bouton **`🔄 Re-vérifier FFE`** permet à l'organisateur de forcer la vérification officielle d'une ligne d'un simple clic.
  3. L'application bénéficie ainsi du **meilleur des deux mondes** : une vitesse extrême (~3,5 secondes pour 1 000 joueurs) via l'API, combinée à une fraîcheur et une exactitude absolues garanties par le site fédéral officiel.
