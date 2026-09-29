/**
 * Module de parsing HTML FFE optimisé et résistant.
 * Analyse les tableaux de résultats de la FFE (ListeJoueurs, ListeClubs, etc.).
 * Auteur : Sergey CHUKHNO
 */

import { Player, Club } from "./types";
import { stripTagsFast, decodeHTMLEntities } from "./normalization";

/**
 * Extrait le nom et le prénom à partir du champ combiné "Nom Prénom" retourné par la FFE.
 */
function splitNomPrenom(np: string): { nom: string; prenom: string } {
  const trimmed = np.trim();
  if (!trimmed) return { nom: "", prenom: "" };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { nom: parts[0], prenom: "" };
  }

  // Sur la FFE, le nom de famille est généralement en majuscules (ex: "CHUKHNO Sergey", "DE LA TOUR Jean")
  const nomParts: string[] = [];
  const prenomParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Si nous n'avons pas encore rencontré de prénom (qui commence par une majuscule suivie de minuscules)
    // ou si la partie est entièrement en majuscules / particule
    const isAllUpper = /^[A-ZÉÈÀÇÎÏÔÙÛÜ'-]+$/.test(part);
    if (prenomParts.length === 0 && (isAllUpper || ["DE", "DU", "VAN", "VON", "DA"].includes(part.toUpperCase()))) {
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
 * Analyse le HTML d'une page de joueurs FFE et extrait la liste typée des joueurs.
 * Utilise un scan optimisé compatible avec les formats de tables FFE.
 */
export function parseFfePlayersTable(html: string): Player[] {
  if (!html) return [];

  const clean = html.replace(/[\r\n\t]+/g, " ");
  const players: Player[] = [];
  const seenFFE = new Set<string>();

  const rowRegex = /<tr[^>]*class=['"]?(?:liste_clair|liste_fonce)['"]?[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(clean)) !== null) {
    const rowHtml = rowMatch[1];

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;
    const cells: string[] = [];

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let rawVal = stripTagsFast(cellMatch[1]);
      if (rawVal.includes("&")) {
        rawVal = decodeHTMLEntities(rawVal);
      }
      cells.push(rawVal.replace(/&nbsp;/g, " ").trim());
    }

    if (cells.length < 10) continue;

    const nrFFE = cells[0];
    if (!nrFFE || !/^[A-Z][0-9]+/i.test(nrFFE)) continue;

    const upperNrFFE = nrFFE.toUpperCase();
    if (seenFFE.has(upperNrFFE)) continue;
    seenFFE.add(upperNrFFE);

    const nomPrenom = cells[1] || "";
    const { nom, prenom } = splitNomPrenom(nomPrenom);

    // Extraction de l'Id interne FFE
    const idMatch = rowHtml.match(/FicheJoueur\.aspx\?Id=(\d+)/i);
    const idFFE = idMatch ? idMatch[1] : "";

    players.push({
      nrFFE: upperNrFFE,
      nomPrenom,
      nom,
      prenom,
      af: cells[2] || "",
      elo: cells[4] || "0",
      rapide: cells[5] || "0",
      blitz: cells[6] || "0",
      cat: cells[7] || "",
      club: cells[9] || "Sans club",
      idFFE,
      lienFFE: idFFE
        ? `https://www.echecs.asso.fr/FicheJoueur.aspx?Id=${idFFE}`
        : undefined,
      statut: "ACTIF",
    });
  }

  return players;
}

/**
 * Analyse le HTML de la page ListeClubs.aspx et extrait les clubs correspondants.
 */
export function parseFfeClubsTable(html: string): Club[] {
  if (!html) return [];

  const tableMatch = html.match(/<table[^>]*>[\s\S]*?Dep\.[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[0];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  const clubs: Club[] = [];
  const seenRefs = new Set<string>();

  while ((match = rowRegex.exec(tableHtml)) !== null) {
    const row = match[1];

    const refMatch = row.match(/FicheClub\.aspx\?Ref=([A-Z0-9]+)/i);
    if (!refMatch) continue;

    const ref = refMatch[1];
    if (seenRefs.has(ref)) continue;

    const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cols || cols.length < 3) continue;

    const nomClub = stripTagsFast(cols[2]).trim();
    if (!nomClub) continue;

    seenRefs.add(ref);
    clubs.push({
      nom: decodeHTMLEntities(nomClub),
      ref,
      code: "",
    });
  }

  return clubs;
}

/**
 * Extrait le nombre total de pages d'un résultat paginé ASP.NET FFE.
 */
export function extractTotalPages(html: string): number {
  if (!html) return 1;
  const pageMatches = [...html.matchAll(/__doPostBack\('[^']+','(\d+)'\)/g)];
  if (pageMatches.length === 0) return 1;

  const pages = pageMatches.map((m) => parseInt(m[1], 10)).filter((p) => !isNaN(p));
  return pages.length > 0 ? Math.max(...pages) : 1;
}

/**
 * Extrait les champs cachés ASP.NET nécessaires à la pagination par POST.
 */
export function extractViewState(html: string): {
  viewState: string;
  viewStateGenerator: string;
} {
  const vsMatch = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/i) ||
                  html.match(/name="__VIEWSTATE"\s+value="([^"]+)"/i);
  const vsGenMatch = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/i) ||
                     html.match(/name="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/i);

  return {
    viewState: vsMatch ? vsMatch[1] : "",
    viewStateGenerator: vsGenMatch ? vsGenMatch[1] : "",
  };
}
