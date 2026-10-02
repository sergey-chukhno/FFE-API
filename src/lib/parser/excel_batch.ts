/**
 * Parseur intelligent de lots de participants (Excel / Tableaux d'inscriptions)
 * Intègre les 5 super-pouvoirs :
 * 1. Détection flexible des en-têtes (Fuzzy Header Matching)
 * 2. Reconnaissance automatique par Regex des licences FFE (^[A-Za-z][0-9]{4,6}$)
 * 3. Prise en charge des colonnes combinées "Nom & Prénom"
 * 4. Nettoyage des parasites d'Excel (espaces insécables, tabulations, apostrophes courbes)
 * 5. Résolution hybride (Licence prioritaire, Nom/Prénom en relais)
 * 
 * Auteur : Sergey CHUKHNO
 */

export interface ParsedParticipant {
  rawRow?: Record<string, unknown>;
  licence?: string;
  nom?: string;
  prenom?: string;
  nomPrenom?: string;
  paiement?: string;
  email?: string;
}

// Regex universelle de licence FFE : 1 lettre suivie de 4 à 6 chiffres
export const FFE_LICENCE_REGEX = /^[A-Za-z][0-9]{4,6}$/;

/**
 * Nettoie une chaîne de caractères issue d'Excel.
 */
export function sanitizeExcelString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/\u00A0/g, " ")      // Espaces insécables Excel
    .replace(/[\r\n\t]+/g, " ")    // Retours à la ligne et tabulations
    .replace(/[’‘`]/g, "'")       // Apostrophes typographiques courbes
    .replace(/\s+/g, " ")         // Espaces multiples
    .trim();
}

/**
 * Normalise un nom d'en-tête de colonne pour correspondance floue.
 */
function normalizeHeaderName(header: string): string {
  return sanitizeExcelString(header)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Découpe intelligemment un champ combiné "Nom Prénom" (ex: "CHUKHNO Maxime").
 */
export function splitCombinedName(fullName: string): { nom: string; prenom: string } {
  const clean = sanitizeExcelString(fullName);
  if (!clean) return { nom: "", prenom: "" };

  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { nom: parts[0], prenom: "" };
  }

  const nomParts: string[] = [];
  const prenomParts: string[] = [];

  for (const part of parts) {
    // Si entièrement en majuscules (ou particule noble)
    const isUpper = /^[A-ZÉÈÀÇÎÏÔÙÛÜ'-]+$/.test(part);
    if (prenomParts.length === 0 && (isUpper || ["DE", "DU", "VAN", "VON", "DA"].includes(part.toUpperCase()))) {
      nomParts.push(part);
    } else {
      prenomParts.push(part);
    }
  }

  if (nomParts.length === 0) {
    nomParts.push(parts[0]);
    prenomParts.push(...parts.slice(1));
  }

  return {
    nom: nomParts.join(" "),
    prenom: prenomParts.join(" "),
  };
}

/**
 * Analyse une ligne d'objet issue d'une feuille Excel (ex: XLSX.utils.sheet_to_json)
 * et extrait de manière robuste les données du participant.
 */
export function parseExcelRow(row: Record<string, unknown>): ParsedParticipant {
  const result: ParsedParticipant = {
    rawRow: row,
  };

  let foundLicenceCol = false;
  let foundNomCol = false;
  let foundPrenomCol = false;

  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = normalizeHeaderName(rawKey);
    const val = sanitizeExcelString(rawVal);
    if (!val) continue;

    // 1. Détection de la colonne Licence
    if (
      key.includes("licence") ||
      key.includes("nrffe") ||
      key.includes("numffe") ||
      key.includes("codeffe")
    ) {
      if (FFE_LICENCE_REGEX.test(val)) {
        result.licence = val.toUpperCase();
        foundLicenceCol = true;
      }
    }

    // 2. Détection du Prénom
    else if (
      key.includes("prenom") ||
      key.includes("firstname")
    ) {
      result.prenom = val;
      foundPrenomCol = true;
    }

    // 3. Détection colonne combinée Nom & Prénom
    else if (
      key.includes("nomprenom") ||
      key.includes("nomcomplet") ||
      key.includes("fullname") ||
      key.includes("joueur") ||
      key.includes("participant") ||
      key.includes("adherent")
    ) {
      result.nomPrenom = val;
    }

    // 4. Détection du Nom de famille seul
    else if (
      key.includes("nom") ||
      key.includes("lastname") ||
      key.includes("famille")
    ) {
      result.nom = val;
      foundNomCol = true;
    }

    // 5. Détection Paiement
    else if (key.includes("paiement") || key.includes("tarif") || key.includes("reglement")) {
      result.paiement = val;
    }

    // 6. Détection Email
    else if (key.includes("email") || key.includes("mail") || key.includes("courriel")) {
      result.email = val;
    }

    // 7. Détection par Regex dans N'IMPORTE QUELLE cellule si pas encore trouvée
    if (!foundLicenceCol && FFE_LICENCE_REGEX.test(val)) {
      result.licence = val.toUpperCase();
      foundLicenceCol = true;
    }
  }

  // Si on a un nomPrenom combiné mais pas de nom/prenom séparés
  if (result.nomPrenom && (!foundNomCol || !foundPrenomCol)) {
    const split = splitCombinedName(result.nomPrenom);
    if (!result.nom) result.nom = split.nom;
    if (!result.prenom) result.prenom = split.prenom;
  }

  // Formatage final
  if (result.nom) result.nom = result.nom.toUpperCase();

  return result;
}

/**
 * Traite un lot entier de lignes Excel.
 */
export function parseExcelRows(rows: Record<string, unknown>[]): ParsedParticipant[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(parseExcelRow).filter((p) => p.licence || p.nom || p.prenom);
}
