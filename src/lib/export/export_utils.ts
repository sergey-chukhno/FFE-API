import * as XLSX from "xlsx";

export interface ExportRow {
  index: number;
  participantExport: string;
  nrFfe: string;
  nomPrenomFfe: string;
  af: string;
  elo: string;
  categorie: string;
  club: string;
  statut: "LICENCIE_A" | "LICENCIE_B" | "NON_VERIFIE";
  remarque?: string;
}

export interface BatchStatsSummary {
  totalProcessed: number;
  totalVerified: number;
  verifiedACount: number;
  verifiedBCount: number;
  unverifiedCount: number;
  durationMs: number;
}

/**
 * Génère le contenu d'un rapport synthétique au format Markdown
 */
export function generateMarkdownReport(
  rows: ExportRow[],
  stats: BatchStatsSummary,
  clubName = "Marseille-Échecs"
): string {
  const now = new Date().toLocaleString("fr-FR");

  let md = `# Rapport de Vérification des Licences FFE — ${clubName}\n\n`;
  md += `*Généré le : ${now} via RecupFFE v1.1*\n\n`;
  md += `## 1. Synthèse Statistique\n\n`;
  md += `| Métrique | Valeur |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Total participants traités** | ${stats.totalProcessed} |\n`;
  md += `| **Licenciés vérifiés (Marseille-Échecs)** | ${stats.totalVerified} (${Math.round((stats.totalVerified / (stats.totalProcessed || 1)) * 100)}%) |\n`;
  md += `| **Licences A (Compétition)** | ${stats.verifiedACount} |\n`;
  md += `| **Licences B (Loisir / Scolaire)** | ${stats.verifiedBCount} |\n`;
  md += `| **Non licenciés / Non trouvés** | ${stats.unverifiedCount} |\n`;
  md += `| **Temps d'exécution vectoriel** | ${stats.durationMs} ms |\n\n`;

  md += `## 2. Liste Détaillée des Participants\n\n`;
  md += `| # | Participant (Export) | N° FFE | Nom Prénom (FFE) | Type Licence | Élo | Cat. | Statut |\n`;
  md += `| :-: | :--- | :-: | :--- | :-: | :-: | :-: | :--- |\n`;

  rows.forEach((r) => {
    const statutLabel =
      r.statut === "LICENCIE_A"
        ? "✅ Licence A"
        : r.statut === "LICENCIE_B"
        ? "🔵 Licence B"
        : "❌ Non vérifié";

    md += `| ${r.index} | ${r.participantExport} | ${r.nrFfe || "-"} | ${r.nomPrenomFfe || "-"} | ${r.af || "-"} | ${r.elo || "-"} | ${r.categorie || "-"} | ${statutLabel} |\n`;
  });

  md += `\n---\n*Plateforme RecupFFE — Développée par Sergey CHUKHNO*\n`;
  return md;
}

/**
 * Déclenche le téléchargement d'un fichier Markdown côté client
 */
export function downloadMarkdownFile(content: string, filename = "rapport_licences_ffe.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Génère et télécharge un classeur Excel (.xlsx) enrichi avec les résultats
 */
export function downloadExcelReport(rows: ExportRow[], filename = "verification_licences_ffe.xlsx") {
  const excelData = rows.map((r) => ({
    "#": r.index,
    "Participant (Export)": r.participantExport,
    "N° FFE": r.nrFfe,
    "Nom Prénom (FFE)": r.nomPrenomFfe,
    "Type Licence": r.af,
    "Élo": r.elo,
    "Catégorie": r.categorie,
    "Club": r.club,
    "Statut":
      r.statut === "LICENCIE_A"
        ? "Licence A (Compétition)"
        : r.statut === "LICENCIE_B"
        ? "Licence B (Loisir)"
        : "Non vérifié",
    "Remarque": r.remarque || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vérification FFE");

  // Ajustement automatique de la largeur des colonnes
  const colWidths = [
    { wch: 5 },  // #
    { wch: 26 }, // Participant Export
    { wch: 10 }, // N° FFE
    { wch: 26 }, // Nom Prénom FFE
    { wch: 12 }, // Type
    { wch: 8 },  // Elo
    { wch: 8 },  // Cat
    { wch: 20 }, // Club
    { wch: 22 }, // Statut
    { wch: 30 }, // Remarque
  ];
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, filename);
}
