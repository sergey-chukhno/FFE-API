import React from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import {
  ExportRow,
  BatchStatsSummary,
  generateMarkdownReport,
  downloadMarkdownFile,
  downloadExcelReport,
} from "@/lib/export/export_utils";

interface ExportToolbarProps {
  rows: ExportRow[];
  stats: BatchStatsSummary;
  disabled?: boolean;
}

export function ExportToolbar({ rows, stats, disabled = false }: ExportToolbarProps) {
  const handleExportExcel = () => {
    if (rows.length === 0) return;
    downloadExcelReport(rows, `licences_marseille_echecs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportMarkdown = () => {
    if (rows.length === 0) return;
    const md = generateMarkdownReport(rows, stats);
    downloadMarkdownFile(md, `rapport_licences_marseille_echecs_${new Date().toISOString().slice(0, 10)}.md`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <button
        onClick={handleExportExcel}
        disabled={disabled || rows.length === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-700/20"
        title="Télécharger les résultats au format Excel enrichi (.xlsx)"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Export Excel</span>
      </button>

      <button
        onClick={handleExportMarkdown}
        disabled={disabled || rows.length === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        title="Télécharger le rapport synthétique en Markdown (.md)"
      >
        <FileText className="w-4 h-4 text-sky-400" />
        <span>Rapport Markdown</span>
      </button>

      <button
        onClick={handlePrint}
        disabled={disabled || rows.length === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        title="Imprimer ou enregistrer en PDF la feuille de vérification"
      >
        <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>Imprimer / PDF</span>
      </button>
    </div>
  );
}
