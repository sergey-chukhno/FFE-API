/**
 * Utilitaires de normalisation métier et assainissement HTML
 * Préservation stricte de la logique historique pour la tolérance aux accents, tirets et casses.
 * Auteur : Sergey CHUKHNO
 */

/**
 * Supprime les accents et diacritiques d'une chaîne (ex: "Échecs" -> "Echecs").
 */
export function removeAccents(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalise une chaîne pour comparaison souple :
 * - Sans accents
 * - En minuscules
 * - Tirets remplacés par des espaces
 * - Espaces multiples regroupés en un seul espace
 * - Trim
 */
export function normalizeForMatch(str: string | null | undefined): string {
  if (!str) return "";
  return removeAccents(String(str))
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Élimine rapidement les balises HTML sans faire d'allocations de regex massives.
 */
export function stripTagsFast(str: string | null | undefined): string {
  if (!str) return "";
  let result = "";
  let inside = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "<") {
      inside = true;
      continue;
    }
    if (c === ">") {
      inside = false;
      continue;
    }
    if (!inside) result += c;
  }
  return result;
}

/**
 * Décode les entités HTML standard rencontrées sur les pages FFE.
 */
export function decodeHTMLEntities(text: string | null | undefined): string {
  if (!text) return "";
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&#39;": "'",
    "&apos;": "'",
    "&quot;": '"',
    "&eacute;": "é",
    "&egrave;": "è",
    "&agrave;": "à",
    "&ccedil;": "ç",
    "&ecirc;": "ê",
    "&Eacute;": "É",
    "&Egrave;": "È",
    "&Agrave;": "À",
    "&Ccedil;": "Ç",
    "&ocirc;": "ô",
    "&icirc;": "î",
    "&ugrave;": "ù",
    "&ucirc;": "û",
    "&iuml;": "ï",
    "&euml;": "ë",
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    if (entities[match]) return entities[match];
    // Décodage décimal &#233;
    if (match.startsWith("&#") && !match.startsWith("&#x")) {
      const code = parseInt(match.slice(2, -1), 10);
      if (!isNaN(code)) return String.fromCharCode(code);
    }
    // Décodage hexadécimal &#xE9;
    if (match.startsWith("&#x") || match.startsWith("&#X")) {
      const code = parseInt(match.slice(3, -1), 16);
      if (!isNaN(code)) return String.fromCharCode(code);
    }
    return match;
  });
}

/**
 * Génère les variantes de recherche pour un nom / club :
 * - Gestion des espaces convertis en tirets et inversement
 * - Retrait des accents
 * - Mise en majuscules
 */
export function buildSearchVariantes(input: string | null | undefined, strict = false): string[] {
  if (!input) return [];
  const raw = String(input).trim();
  if (!raw) return [];

  if (strict) {
    return [raw];
  }

  const normalized = removeAccents(raw).toUpperCase();
  const variantes: string[] = [normalized];

  // variante espace -> tiret
  if (normalized.includes(" ")) {
    variantes.push(normalized.replace(/\s+/g, "-"));
  }

  // variante tiret -> espace
  if (normalized.includes("-")) {
    variantes.push(normalized.replace(/-/g, " "));
  }

  // déduplication
  return Array.from(new Set(variantes));
}
