"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { LicenseBadge } from "../ui/LicenseBadge";
import { ExportToolbar } from "../ui/ExportToolbar";
import { ExportRow, BatchStatsSummary } from "@/lib/export/export_utils";

type FilterTab = "ALL" | "LICENCE_A" | "LICENCE_B" | "UNVERIFIED";

export function LicenseVerificationSection() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données vérifiées
  const [tableRows, setTableRows] = useState<ExportRow[]>([]);
  const [stats, setStats] = useState<BatchStatsSummary | null>(null);

  // Filtres et pagination
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Ko";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFileSelection = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls") && !selectedFile.name.endsWith(".csv")) {
      setError("Veuillez sélectionner un fichier au format .xlsx, .xls ou .csv.");
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(formatFileSize(selectedFile.size));
    setError(null);
  };

  const handleVerify = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setTableRows([]);
    setStats(null);
    setCurrentPage(1);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];

      // Extraction des lignes brutes JSON
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        throw new Error("Le fichier Excel sélectionné ne contient aucune donnée.");
      }

      // Appel de la route API de vérification vectorielle par lot
      const res = await fetch("/api/verify-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLines: rawRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la vérification par lot.");
      }

      // Construction de la liste unifiée des lignes pour affichage et export
      const rows: ExportRow[] = [];
      let seqIndex = 1;

      // 1. Licences A
      if (Array.isArray(data.verifiedA)) {
        data.verifiedA.forEach((item: any) => {
          rows.push({
            index: seqIndex++,
            participantExport: item.raw?.nomParticipant || `${item.raw?.nom || ""} ${item.raw?.prenom || ""}`.trim() || item.player?.nom || "Inconnu",
            nrFfe: item.player?.nrFfe || item.raw?.licence || "-",
            nomPrenomFfe: `${item.player?.nom || ""} ${item.player?.prenom || ""}`.trim(),
            af: "A",
            elo: item.player?.elo ? String(item.player.elo) : "-",
            categorie: item.player?.cat || "-",
            club: item.player?.club || "Marseille-Echecs",
            statut: "LICENCIE_A",
            remarque: item.raw?.paiement || "",
          });
        });
      }

      // 2. Licences B
      if (Array.isArray(data.verifiedB)) {
        data.verifiedB.forEach((item: any) => {
          rows.push({
            index: seqIndex++,
            participantExport: item.raw?.nomParticipant || `${item.raw?.nom || ""} ${item.raw?.prenom || ""}`.trim() || item.player?.nom || "Inconnu",
            nrFfe: item.player?.nrFfe || item.raw?.licence || "-",
            nomPrenomFfe: `${item.player?.nom || ""} ${item.player?.prenom || ""}`.trim(),
            af: "B",
            elo: item.player?.elo ? String(item.player.elo) : "-",
            categorie: item.player?.cat || "-",
            club: item.player?.club || "Marseille-Echecs",
            statut: "LICENCIE_B",
            remarque: item.raw?.paiement || "",
          });
        });
      }

      // 3. Non vérifiés
      if (Array.isArray(data.unverified)) {
        data.unverified.forEach((item: any) => {
          rows.push({
            index: seqIndex++,
            participantExport: item.raw?.nomParticipant || `${item.raw?.nom || ""} ${item.raw?.prenom || ""}`.trim() || "Inconnu",
            nrFfe: item.raw?.licence || "-",
            nomPrenomFfe: "-",
            af: "-",
            elo: "-",
            categorie: "-",
            club: "-",
            statut: "NON_VERIFIE",
            remarque: item.reason || item.raw?.paiement || "Non licencié à Marseille-Échecs",
          });
        });
      }

      setTableRows(rows);
      setStats({
        totalProcessed: data.totalProcessed || rows.length,
        totalVerified: data.totalVerified || (data.verifiedACount + data.verifiedBCount),
        verifiedACount: data.verifiedACount || 0,
        verifiedBCount: data.verifiedBCount || 0,
        unverifiedCount: data.unverifiedCount || 0,
        durationMs: data.durationMs || 0,
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des données
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      // Filtre d'onglet
      if (activeFilter === "LICENCE_A" && r.statut !== "LICENCIE_A") return false;
      if (activeFilter === "LICENCE_B" && r.statut !== "LICENCIE_B") return false;
      if (activeFilter === "UNVERIFIED" && r.statut !== "NON_VERIFIE") return false;

      // Filtre de recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.participantExport.toLowerCase().includes(q) ||
          r.nrFfe.toLowerCase().includes(q) ||
          r.nomPrenomFfe.toLowerCase().includes(q) ||
          (r.remarque && r.remarque.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tableRows, activeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      
      {/* Zone de Glisser-Déposer & Contrôles */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-marseille-500 dark:text-sky-400" />
            <span>Vérification des Licences par Fichier Excel</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Déposez votre fichier d&apos;inscription (HelloAsso, Billetweb, formulaire FFE) pour vérifier l&apos;intégralité des licences en moins de 50 ms.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelection(e.dataTransfer.files[0]);
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-marseille-500 bg-marseille-500/10 scale-[1.01]"
              : "border-slate-300 dark:border-slate-700/80 hover:border-marseille-500/60 dark:hover:border-sky-400/60 bg-slate-50/50 dark:bg-slate-800/20"
          }`}
          onClick={() => document.getElementById("excelFileInput")?.click()}
        >
          <input
            id="excelFileInput"
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-marseille-500/10 dark:bg-sky-500/10 flex items-center justify-center text-marseille-500 dark:text-sky-400 shadow-sm transition-transform transform group-hover:scale-110">
              <UploadCloud className="w-6 h-6" />
            </div>

            {fileName ? (
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {fileName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Taille du fichier : {fileSize} • Cliquez ou glissez pour remplacer
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                  Glissez-déposez votre fichier <strong>.xlsx</strong> ici, ou cliquez pour parcourir
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Prise en charge universelle : HelloAsso, Billetweb, Google Forms, exports FFE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bouton de déclenchement */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tableRows.length > 0 && `${tableRows.length} participant(s) analysé(s)`}
          </span>

          <button
            onClick={handleVerify}
            disabled={!file || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-marseille-500 to-marseille-600 hover:from-marseille-600 hover:to-marseille-700 text-white shadow-md shadow-marseille-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyse vectorielle en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Vérifier les Licences</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Synthèse Statistique */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fadeIn">
          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Inscrits
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.totalProcessed}
            </span>
          </div>

          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center border-l-4 border-l-emerald-500">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total Licenciés
            </span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.totalVerified}
            </span>
          </div>

          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Licence A
            </span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.verifiedACount}
            </span>
          </div>

          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Licence B
            </span>
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {stats.verifiedBCount}
            </span>
          </div>

          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Non Vérifiés
            </span>
            <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {stats.unverifiedCount}
            </span>
          </div>

          <div className="glass-card rounded-xl p-3.5 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
              Durée Vectorielle
            </span>
            <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400 font-mono flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {stats.durationMs}ms
            </span>
          </div>
        </div>
      )}

      {/* Barre d'outils, Filtres & Tableau de Résultats */}
      {tableRows.length > 0 && (
        <div className="glass-card rounded-2xl p-6 shadow-sm space-y-5 animate-fadeIn">
          
          {/* Header de tableau : Filtres & Exports */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            
            {/* Onglets de filtrage */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs">
              <button
                onClick={() => { setActiveFilter("ALL"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeFilter === "ALL"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Tous ({tableRows.length})
              </button>

              <button
                onClick={() => { setActiveFilter("LICENCE_A"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeFilter === "LICENCE_A"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                Licence A ({stats?.verifiedACount || 0})
              </button>

              <button
                onClick={() => { setActiveFilter("LICENCE_B"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeFilter === "LICENCE_B"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                }`}
              >
                Licence B ({stats?.verifiedBCount || 0})
              </button>

              <button
                onClick={() => { setActiveFilter("UNVERIFIED"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeFilter === "UNVERIFIED"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                Non vérifiés ({stats?.unverifiedCount || 0})
              </button>
            </div>

            {/* Barre d'export */}
            {stats && <ExportToolbar rows={filteredRows} stats={stats} />}
          </div>

          {/* Recherche rapide & Contrôle de taille */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Filtrer par nom, licence, remarque..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-marseille-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Lignes par page :</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Tableau paginé avec numérotation # */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4">Participant (Export)</th>
                  <th className="py-3 px-3 font-mono">N° FFE</th>
                  <th className="py-3 px-4">Nom Prénom (FFE)</th>
                  <th className="py-3 px-3 text-center">Licence</th>
                  <th className="py-3 px-3 text-center font-mono">Élo</th>
                  <th className="py-3 px-3 text-center">Cat.</th>
                  <th className="py-3 px-4">Remarque / Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Aucun participant correspondant aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r) => (
                    <tr
                      key={r.index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                        #{r.index}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {r.participantExport}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {r.nrFfe || "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        {r.nomPrenomFfe || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <LicenseBadge type={r.af} />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {r.elo || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.categorie || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 italic">
                        {r.remarque || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Contrôles de Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400 no-print">
            <div>
              Affichage de {paginatedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} à{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} sur {filteredRows.length} participants
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
