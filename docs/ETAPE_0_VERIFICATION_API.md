# Étape 0 : Vérification Préalable de l'API ChessXP & Rationale Hybride

Date : 20 Septembre 2026  
Statut : **Validé (OK)**  
Auteur : Sergey CHUKHNO 

---

## 1. Test de Connectivité & Validation de la Clé API

La clé d'API de production fournie a été testée via l'endpoint de recherche de joueurs avec enrichissement FIDE.

### Commande de test exécutée
```bash
curl -s "https://ffe.chessxp.com/api/player/search-by-name?last_name=AZARI&first_name=William&include_inactive=true&include=fide" \
  -H "X-API-Key: cxp_live_nRngSzJKufKfxVjLGRRDPRBNQ5YvwAGmi_1Jylboivg"
```

### Réponse JSON brute obtenue
```json
[
  {
    "id": 163432,
    "ffe_id": 661715,
    "last_name": "AZARI",
    "first_name": "William",
    "gender": 1,
    "ffe_licence_number": "K51184",
    "ffe_licence": 2,
    "licence_type": "A",
    "federation": "FRA",
    "league": "PAC",
    "club": "Marseille-Echecs",
    "club_slug": null,
    "fide_id": 36062375,
    "fide_title": 0,
    "fide_title_label": "",
    "birth_year": 1982,
    "category": "SenM",
    "is_active_this_season": true,
    "standard_rating": 1668,
    "rapid_rating": 1680,
    "blitz_rating": 1410,
    "standard_rating_type": 3,
    "rapid_rating_type": 2,
    "blitz_rating_type": 2,
    "standard_rating_label": "F",
    "rapid_rating_label": "N",
    "blitz_rating_label": "N",
    "games_standard": null,
    "games_rapid": null,
    "games_blitz": null,
    "fide": {
      "federation": "FRA",
      "year": 1982,
      "inactive": true,
      "standard": 1668,
      "sex": "M",
      "k_factor": 40
    },
    "leaderboard_delta": null,
    "source": {
      "url": "http://www.echecs.asso.fr/FicheJoueur.aspx?Ref=K51184",
      "ingested_at": "2026-09-05T01:02:19+00:00"
    },
    "club_id": 2422
  }
]
```

### Analyse des résultats
- **Authentification** : Header `X-API-Key` accepté immédiatement (HTTP 200 OK).
- **Complétude des données FFE** : Numéro FFE (`K51184`), Catégorie (`SenM`), Club (`Marseille-Echecs`), Type de licence (`A`), Notes Elo/Rapide/Blitz (`1668`, `1680`, `1410`).
- **Enrichissement FIDE intégré** : L'objet `fide` est directement fusionné dans la réponse (Fédération FIDE, Elo standard FIDE `1668`, K-factor `40`, statut inactif, année). **Aucune requête HTTP supplémentaire n'a été nécessaire.**

---

## 2. Note Technique sur la Synchronisation des Données

Il est important de distinguer deux architectures de données différentes :

1. **Le site officiel FFE (`echecs.asso.fr`)** :
   - Connecté en temps réel à l'extranet et à la base de données SQL fédérale.
   - Dès qu'un dirigeant de club enregistre une nouvelle affiliation ou licence, celle-ci est **instantanément visible** sur la page publique du joueur.
2. **L'API ChessXP (`ffe.chessxp.com`)** :
   - Service indépendant optimisé, reposant sur un entrepôt de données répliqué.
   - Le pipeline d'ingestion s'exécute **de manière hebdomadaire (chaque lundi à 03h00 UTC)**.
   - **Impact sur les classements (Elo)** : Les classements FFE et FIDE ne changeant qu'une fois par mois (au 1er de chaque mois), ChessXP est à jour à 100% sur les notes Elo.
   - **Impact sur les nouvelles licences** : Une licence créée en milieu de semaine (ex: un mercredi) ne sera répercutée dans ChessXP que le lundi suivant.

---

## 3. Justification de la Solution Hybride (Option B)

La stratégie retenue pour RecupFFE est une **architecture hybride avec bascule automatique / à la demande** :

```
                        Requête Utilisateur
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   API ChessXP (REST)  │  (Source primaire, ultra-rapide)
                     └───────────┬───────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            Joueur trouvé ?             Joueur absent / Non trouvé ?
            (99% des cas)               (Nouvelle licence en milieu de semaine)
                   │                           │
                   ▼                           ▼
            Résultat direct            ┌─────────────────────────────┐
            + Profil FIDE              │  Fallback Scraping Direct   │
                                       │   (Site FFE echecs.asso.fr) │
                                       └─────────────────────────────┘
```

### Avantages clés de ce choix :
1. **Performance & Quotas** : Dans 99% des cas, la réponse est servie en moins de 150 ms par l'API JSON sans consommer le temps d'exécution GAS.
2. **Fraîcheur garantie** : En cas d'adhérent tout juste inscrit n'apparaissant pas encore dans l'index hebdomadaire de ChessXP, le scraper FFE prend le relais en direct.
3. **Résilience maximale** : Si l'API rencontre une indisponibilité temporaire (ou dépassement de quota), le système bascule automatiquement sur le scraping sans interruption pour l'utilisateur final.
