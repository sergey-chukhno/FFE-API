# Audit Technique : Points Faibles et Solutions Proposées

Ce document présente l'analyse détaillée des vulnérabilités, défauts d'architecture et goulets d'étranglement identifiés dans le projet **RecupFFE**, accompagnés de solutions concrètes et d'exemples de code prêts à être implémentés.

---

## Sommaire

1. [1. Problème JavaScript : Déclaration conditionnelle de fonctions et Hoisting](#1-problème-javascript--déclaration-conditionnelle-de-fonctions-et-hoisting)
2. [2. Performance Réseau : Goulet d'étranglement FIDE (N+1 requêtes HTTP)](#2-performance-réseau--goulet-détranglement-fide-n1-requêtes-http)
3. [3. Sécurité Front-End : Risque de Cross-Site Scripting (XSS) via `innerHTML`](#3-sécurité-front-end--risque-de-cross-site-scripting-xss-via-innerhtml)
4. [4. Points Faibles Complémentaires](#4-points-faibles-complémentaires)
5. [5. Plan d'Action Recommandé](#5-plan-daction-recommandé)

---

## 1. Problème JavaScript : Déclaration conditionnelle de fonctions et Hoisting

### Localisation
Fichier : `API_FFE_FETCH.gs` (lignes 1341 à 1374)

```javascript
// ❌ CODE ACTUEL DÉFECTUEUX
if (!OPTIMIZED) {
  function dedupeByFFE(joueurs) {
    const map = {};
    joueurs.forEach(j => {
      if (j.NrFFE()) {
        map[j.NrFFE()] = j;
      }
    });
    return Object.values(map);
  }
} else {
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
```

### Analyse du problème
- **Comportement des déclarations de fonction (`function declaration`)** : Selon la spécification ECMAScript (et le moteur V8 de Google Apps Script), les déclarations de fonctions nommées dans des blocs `if/else` ont un comportement ambigu (Block-Level Function Declarations) ou subissent un hissage (*hoisting*) en début de portée.
- **Risque concret** : En mode non-strict ou selon la phase d'évaluation V8, la deuxième déclaration de `dedupeByFFE` écrase silencieusement la première dès la phase de parsing, rendant la condition `if (!OPTIMIZED)` totalement inopérante. Pire, dans certains contextes JS stricts, une fonction déclarée dans un bloc n'est pas accessible en dehors de ce bloc.

### Solution recommandée

Remplacer les déclarations de fonction concurrentes par une fonction unique et propre, ou une affectation d'expression de fonction. L'implémentation basée sur `Set` étant universellement plus rapide et plus économe en mémoire (complexité temporelle $O(n)$ et aucune allocation de clés d'objet superflues), une fonction unifiée est la meilleure approche :

```javascript
// ✅ SOLUTION OPTIMISÉE ET FIABLE
/**
 * Déduplique une liste de joueurs par leur numéro FFE en préservant l'ordre.
 * Complexité temporelle : O(N) | Complexité spatiale : O(N)
 * @param {Array<Joueur>} joueurs
 * @returns {Array<Joueur>}
 */
function dedupeByFFE(joueurs) {
  if (!joueurs || !joueurs.length) return [];
  
  const seen = new Set();
  const result = [];

  for (let i = 0; i < joueurs.length; i++) {
    const j = joueurs[i];
    const id = typeof j.NrFFE === "function" ? j.NrFFE() : j.m_nrFFE;

    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(j);
    }
  }

  return result;
}
```

---

## 2. Performance Réseau : Goulet d'étranglement FIDE (N+1 requêtes HTTP)

### Localisation
Fichier : `API_FFE_FIDE.gs` (lignes 4 à 32)

```javascript
// ❌ CODE ACTUEL SYNCHRONE ET NON SCALABLE
function enrichWithFideIds(joueurs) {
  joueurs.forEach(j => {
    try {
      const ffeId = getFFEId(j); // ⚠️ 1er appel HTTP synchrone
      if (!ffeId) {
        j.m_idFIDE = "?";
        return;
      }

      // ⚠️ 2e appel HTTP synchrone
      const ficheHtml = UrlFetchApp.fetch(`https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${ffeId}`).getContentText();
      const fideMatch = ficheHtml.match(/ratings\.fide\.com\/profile\/(\d+)/);
      j.m_idFIDE = fideMatch ? fideMatch[1] : "?";
    } catch(e) {
      j.m_idFIDE = "?";
    }
  });
}
```

### Analyse du problème
1. **Multiplication explosive des requêtes ($2N$ requêtes)** : Pour un club de 150 licenciés, la fonction effectue $150 \times 2 = 300$ requêtes HTTP séquentielles.
2. **Dépassement garanti des quotas Apps Script** :
   - **Limite de temps d'exécution** : 6 minutes maximum par script. À 200 ms par requête, 300 requêtes prennent $\ge 60$ secondes rien qu'en latence réseau, frôlant ou dépassant le timeout sous forte charge.
   - **Quota journalier d'appels `UrlFetchApp`** : 20 000 appels/jour (compte gratuit) ou 100 000 (Google Workspace). L'enrichissement de quelques clubs épuise le quota quotidien.
3. **Redondance flagrante** : Le parser (`API_FFE_PARSE.gs`) extrait **déjà** l'identifiant FFE (`IdFFE`) via l'expression `FicheJoueur.aspx?Id=(\d+)` présente dans les résultats de recherche ! La fonction `getFFEId(joueur)` qui fait une nouvelle recherche par nom/prénom est donc totalement inutile pour 95% des joueurs.

### Solutions recommandées

#### Option A : Éliminer `getFFEId` et paralléliser avec `UrlFetchApp.fetchAll` (Batching)
Si l'enrichissement FIDE global reste requis côté backend, utiliser l'`IdFFE` déjà extrait et batcher les requêtes par paquets de 20 :

```javascript
// ✅ SOLUTION BACKEND PARALLÉLISÉE
function enrichWithFideIds(joueurs) {
  if (!joueurs || !joueurs.length) return;

  // Filtrer les joueurs ayant un IdFFE valide
  const aEnrichir = joueurs.filter(j => j.IdFFE && j.IdFFE());
  const CHUNK_SIZE = 20;

  for (let i = 0; i < aEnrichir.length; i += CHUNK_SIZE) {
    const chunk = aEnrichir.slice(i, i + CHUNK_SIZE);
    
    const requests = chunk.map(j => ({
      url: `https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${j.IdFFE()}`,
      method: "get",
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0" }
    }));

    try {
      const responses = UrlFetchApp.fetchAll(requests);
      responses.forEach((resp, idx) => {
        if (resp.getResponseCode() === 200) {
          const html = resp.getContentText();
          const fideMatch = html.match(/ratings\.fide\.com\/profile\/(\d+)/);
          chunk[idx].m_idFIDE = fideMatch ? fideMatch[1] : "?";
        } else {
          chunk[idx].m_idFIDE = "?";
        }
      });
    } catch (e) {
      Logger.log("Erreur batch FIDE: " + e.message);
    }
  }
}
```

#### Option B : Enrichissement à la demande (*Lazy Loading*) côté Front-End
Ne pas enrichir les 200 joueurs en amont. Côté front-end, afficher un bouton ou charger l'ID FIDE uniquement au clic ou à l'ouverture de la fiche du joueur spécifique.

---

## 3. Sécurité Front-End : Risque de Cross-Site Scripting (XSS) via `innerHTML`

### Localisation
1. `index.html` (ligne 215)
2. `licence.html` (lignes 344 à 352)

```javascript
// ❌ CODE ACTUEL VULNÉRABLE (Exemple tiré de licence.html)
html += `<tr>
  <td><strong>${item.nomExport}</strong> ${item.prenomExport}</td>
  <td>${item.nrFFE}</td>
  <td>${item.npFFE}</td>
  <td><span class="badge-af">${item.af}</span></td>
  <td>${item.paiement}</td>
  <td class="${statusClass}">${statusText}</td>
</tr>`;
```

### Analyse du problème
- **Vecteur d'attaque 1 (Fichier Excel malveillant)** : `item.nomExport` et `item.prenomExport` proviennent directement de cellules du fichier `.xlsx` déposé par l'utilisateur. Si un fichier contient une cellule comme `<img src=x onerror=alert(document.cookie)>` ou `<svg onload=fetch(...)>`, le code JavaScript s'exécute immédiatement dans le navigateur de l'administrateur.
- **Vecteur d'attaque 2 (Données FFE scrapées)** : Les données du club ou les noms de joueurs retournés par le scraping sont insérés sans assainissement.
- **Impact dans Google Apps Script** : Un attaquant peut usurper la session de l'utilisateur Google connecté, accéder à ses fichiers Google Drive, ou interagir silencieusement avec les services Google Workspace via `google.script.run`.

### Solution recommandée

Créer un utilitaire universel d'échappement HTML ou manipuler directement le DOM avec des propriétés sécurisées (`textContent`).

#### Approche 1 : Fonction d'échappement universelle (Drop-in replacement)
Ajouter dans la balise `<script>` de `index.html` et `licence.html` :

```javascript
// ✅ UTILITAIRE D'ÉCHAPPEMENT ANTI-XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

Et sécuriser la génération des lignes de tableau :

```javascript
// ✅ APPLICATION DANS LE RENDU DU TABLEAU
html += `<tr>
  <td><strong>${escapeHtml(item.nomExport)}</strong> ${escapeHtml(item.prenomExport)}</td>
  <td>${escapeHtml(item.nrFFE)}</td>
  <td>${escapeHtml(item.npFFE)}</td>
  <td><span class="badge-af">${escapeHtml(item.af)}</span></td>
  <td>${escapeHtml(item.paiement)}</td>
  <td class="${escapeHtml(statusClass)}">${escapeHtml(statusText)}</td>
</tr>`;
```

#### Approche 2 : Construction déclarative du DOM avec `createElement`
Pour une sécurité maximale sans manipulation de chaînes HTML brutes :
```javascript
const tr = document.createElement("tr");
const tdNom = document.createElement("td");
tdNom.textContent = `${item.nomExport} ${item.prenomExport}`;
tr.appendChild(tdNom);
// ... textContent garantit qu'aucune balise ne sera jamais interprétée
```

---

## 4. Points Faibles Complémentaires

### A. Club cible codé en dur dans `licence.html`
- **Constat** (ligne 287) : `const clubCible = "Marseille-Echecs";`
- **Problème** : L'outil est verrouillé pour un seul club. Tout changement nécessite d'éditer le code source.
- **Solution** : Ajouter un champ texte `<input id="clubCible" value="Marseille-Echecs">` dans l'interface pour permettre à n'importe quel club d'utiliser l'outil.

### B. Prolifération de code mort et variantes de test
- **Constat** : `API_FFE_FETCH.gs` contient 5 implémentations de fetch club (`Sequential`, `Threaded`, `ThreadedUltra`, `ThreadedV3`, `ThreadedV4`). De même, `API_FFE_PARSE.gs` contient 4 parsers.
- **Problème** : Dette technique, complexité de lecture pour les futurs mainteneurs, et risque de corriger un bug sur une variante inactive.
- **Solution** : 
  - Conserver uniquement `parseFFEHtmlScanner` (le plus performant et validé par les tests).
  - Conserver uniquement `fetchPlayersListClubThreadedV4` (avec son fallback séquentiel éprouvé).
  - Déplacer les anciennes versions dans un fichier d'archives ou de benchmark isolé (`ARCHIVE_BENCHMARKS.gs`).

### C. Gestion des erreurs et valeurs de retour hétérogènes
- **Constat** : Selon les fonctions, les erreurs renvoient tantôt une chaîne brute (`"Paramètre manquant"`), tantôt un objet `{ error: "..." }`, tantôt lancent une exception `throw new Error(...)`.
- **Solution** : Unifier le contrat d'interface API : toutes les fonctions de la couche business/JSON doivent retourner `{ success: true, data: [...] }` ou `{ success: false, error: "message", code: "ERR_CODE" }`.

---
