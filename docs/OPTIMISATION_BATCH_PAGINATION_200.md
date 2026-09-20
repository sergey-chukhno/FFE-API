# Optimisation des Performances de l'Import Excel : Pipelining, Pagination et Justification du Lot de 200

*Auteur : Sergey CHUKHNO*  
*Date : Septembre 2026*  
*Branche associée : `feat/batch-pipeline-pagination-200`*

---

## 1. Contexte et Problématique Initiale

Lors des premiers tests de validation de l'Étape 4 sur des volumes massifs (1 000 participants), une divergence notable a été constatée entre :
* **Le benchmark brut backend** : **~3,42 secondes** pour interroger et résoudre 1 000 licences via l'API ChessXP.
* **L'expérience perçue dans le navigateur Web** : **~12 à 15 secondes** entre le clic sur « Vérifier licences » et l'affichage complet du tableau.

Cette documentation détaille l'analyse des goulets d'étranglement côté client, les trois optimisations architecturales apportées, et la justification technique du choix d'un **lot de 200 participants**.

---

## 2. Décomposition de la Latence Initiale (~12 à 15 secondes)

L'audit de l'exécution dans le navigateur a révélé que le temps total n'était pas imputable à l'API ChessXP, mais à l'enchaînement de 4 phases distinctes :

```
[ Temps Total Navigateur Initial : ~12 à 15 s ]
├── 1. Parsing du tableur .xlsx par SheetJS (navigateur)        : ~0,4 s
├── 2. 40 allers-retours réseau séquentiels (BATCH_SIZE = 25)   : ~8,0 s  👈 Goulet n°1
├── 3. Traitement API backend (20 batches de 50 vers ChessXP)    : ~3,4 s
└── 4. Construction et rendu DOM de 1 000 lignes (10 000 balises): ~1,5 s  👈 Goulet n°2
```

### Goulet n°1 : Le hachage en 40 requêtes séquentielles (`BATCH_SIZE = 25`)
À l'origine dimensionnée pour le scraping HTML historique, la constante `BATCH_SIZE = 25` forçait le navigateur à émettre **40 requêtes HTTP consécutives** via une boucle `for ... await`. Même avec une latence réseau modeste (200 ms par aller-retour), la simple attente sélective des requêtes consommait **8 secondes** de pure latence inactive.

### Goulet n°2 : Le rendu graphique synchrone de 10 000 nœuds DOM
L'injection d'un bloc `innerHTML` contenant 1 000 lignes `<tr>` et 10 colonnes `<td>` provoquait un gel (*freeze*) du thread principal du navigateur pendant 1 à 2 secondes pour le calcul des styles CSS et le rendu graphique.

---

## 3. Les Trois Optimisations Implémentées

Pour ramener le temps perçu au niveau des performances du backend (~3,5 s), trois leviers complémentaires ont été activés :

### A. Passage à `BATCH_SIZE = 200`
* Le nombre de requêtes HTTP pour 1 000 joueurs passe de **40 à seulement 5**.
* Gain direct : **~6 secondes** de latence réseau éliminées.

### B. Pipelining Concurrent (`CONCURRENCY = 2`)
* Remplacement de la boucle séquentielle par un **worker pool asynchrone** traitant 2 requêtes simultanément.
* Préservation garantie de l'ordre initial des lignes (`resultsByChunk[index]`).
* Incrémentation dynamique et fluide de la barre de progression en temps réel (`200/1000`, `400/1000`, etc.).

### C. Pagination du tableau par 200 lignes (`PAGE_SIZE = 200`)
* Seules les 200 lignes de la page active sont injectées dans le DOM (~2 000 balises au lieu de 10 000).
* Rendu quasi instantané (**~20 ms** au lieu de ~1 500 ms).
* Contrôles de navigation ergonomiques : `[◀ Précédent] Page X sur Y [Suivant ▶]` avec indicateur de plage et défilement doux vers le haut lors du changement de page.
* Ajout d'une colonne globale **`#`** (numéro d'ordre de 1 à 1 000) pour une identification sans ambiguïté des participants.

---

## 4. Pourquoi le lot de 200 est le « Sweet Spot » Optimal

La question d'augmenter encore la taille des lots (par exemple à 500 participants) a été analysée techniquement. Le tableau comparatif ci-dessous résume les compromis :

| Critère | Lots de 25 *(Initial)* | Lots de 200 *(Retenu)* | Lots de 500 *(Alternative)* |
| :--- | :--- | :--- | :--- |
| **Nombre de requêtes (1 000 joueurs)** | 40 requêtes | **5 requêtes (2 simultanées)** | 2 requêtes |
| **Temps réseau global** | ~8 à 10 s | **~3,4 à 3,5 s** | ~3,2 s (*gain minime de 0,2 s*) |
| **Granularité de la jauge (Feedback UX)** | 40 micro-étapes | **5 crans réguliers (20%, 40%, ...)** | 2 à-coups brutaux (0% $\rightarrow$ 50% $\rightarrow$ 100%) |
| **Résilience au scraping de repli** | Faible (trop morcelé) | **Excellente (impact isolé)** | **Critique / Risque de timeout** |
| **Lignes rendues par page** | 25 (trop de clics) | **200 (1 lot = 1 page, 0 lag)** | 500 (lenteur DOM au scroll) |

### Justifications majeures en faveur du lot de 200 :

1. **Règle des rendements décroissants** :
   Passer de 25 à 200 permet d'économiser 35 allers-retours réseau (gain massif de ~6 s). Passer de 200 à 500 n'élimine que 3 requêtes de plus, pour un gain inférieur à 0,3 seconde.

2. **Résilience face aux participants sans licence (Scraping de repli)** :
   Si un fichier importé comporte des participants sans numéro de licence (ou nouvellement enregistrés), le système bascule sur le scraping officiel FFE en temps réel (qui peut prendre 2 à 4 secondes par joueur selon la charge des serveurs fédéraux) :
   * **Dans un lot de 200** : l'impact d'un ou deux joueurs à scraper reste circonscrit à ce lot, tandis que les autres lots parallélisés continuent d'avancer.
   * **Dans un lot de 500** : si 5 ou 10 joueurs doivent être scrapés, la requête unique peut durer 30 à 45 secondes d'affilée, donnant à l'utilisateur l'impression d'un blocage complet et risquant de provoquer un timeout HTTP.

3. **Alignement parfait Lot / Page** :
   Chaque lot traité correspond exactement à **une page de 200 résultats**. Cela crée une cohérence mentale naturelle pour l'utilisateur entre le volume téléchargé et la pagination affichée.

---

## 5. Cas Particulier du Benchmark Cyclique et Ajout de la Colonne `#`

Lors des tests sur `test_grand_import_1000.xlsx`, une particularité visuelle a été observée : les pages 1, 2 et 3 commençaient toutes par *GIRI Anish* et se terminaient par *LOPEZ MARTINEZ Josep Manuel*.

* **Explication** : Le fichier de test de 1 000 lignes a été constitué en répétant 20 fois une série de 50 joueurs de référence. Comme 200 est un multiple exact de 50 ($4 \times 50 = 200$), chaque page de 200 lignes contenait exactement 4 répétitions complètes de cette série.
* **Solution apportée** : L'ajout de la colonne **`#`** tout à gauche du tableau affiche le numéro absolu du participant (lignes 1 à 200 en page 1, 201 à 400 en page 2, 401 à 600 en page 3, etc.), garantissant une lisibilité immédiate lors de la navigation.

---

## 6. Synthèse des Performances Obtenues

| Métrique | Avant Optimisation | Après Optimisation | Facteur de Gain |
| :--- | :--- | :--- | :--- |
| **Allers-retours réseau** | 40 requêtes | **5 requêtes pipelinées (x2)** | **x8 moins de requêtes** |
| **Temps réseau & API** | ~10 à 12 s | **~3,49 s** | **x3,2 plus rapide** |
| **Rendu graphique DOM** | ~1,5 s (10 000 balises) | **~0,02 s (2 000 balises)** | **x75 plus rapide (instantané)** |
| **Temps total perçu (1 000 joueurs)** | **~12 à 15 secondes** | **~3,5 secondes** | **~4x plus rapide globalement** 🚀 |

---
*Document validé et intégré au référentiel technique FFE-API.*
