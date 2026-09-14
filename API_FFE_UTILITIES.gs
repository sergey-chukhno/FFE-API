/*************************************************************
 * UTILITAIRES
 *************************************************************/
function removeAccents(str) {
  return str
    ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : "";
}

function normalizeForMatch(str) {
  if (!str) return "";
  return removeAccents(str)
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(str) {
   if (!str) return "";
  return str.replace(/<[^>]+>/g, "");
}

function stripTagsFast(str) {
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

function decodeHTMLEntities(text) {
  if (!text) return "";
  var entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&#39;': "'",
    '&quot;': '"',
    '&eacute;': 'é',
    '&egrave;': 'è',
    '&agrave;': 'à',
    '&ccedil;': 'ç',
    '&Eacute;': 'É'
  };
  return text.replace(/&[a-zA-Z0-9#]+;/g, m => entities[m] || m);
}

function buildSearchVariantes(input) {

  if (STRING_STRICT_COMPARE) {
    // 🔒 mode strict → aucune transformation
    return [String(input)];
  }

  // 🔓 mode tolérant
  const normalized = removeAccents(String(input).trim().toUpperCase());

  const variantes = [normalized];

  // espace → tiret
  if (normalized.includes(" ")) {
    variantes.push(normalized.replace(/\s+/g, "-"));
  }

  // tiret → espace
  if (normalized.includes("-")) {
    variantes.push(normalized.replace(/-/g, " "));
  }

  return variantes;
}
