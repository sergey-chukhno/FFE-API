"use client";

import React, { useState } from "react";
import { Search, Globe, Database, User, Shield, Award, AlertCircle, Loader2 } from "lucide-react";
import { LicenseBadge } from "../ui/LicenseBadge";

interface PlayerData {
  nrFFE: string;
  nom: string;
  prenom: string;
  sexe?: string;
  cat?: string;
  club?: string;
  clubCode?: string;
  af?: string;
  elo?: number | string | null;
  rapide?: number | string | null;
  blitz?: number | string | null;
  titre?: string | null;
}

export function PlayerSearchSection() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [licence, setLicence] = useState("");
  const [club, setClub] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PlayerData[]>([]);
  const [source, setSource] = useState<"LOCAL" | "LIVE_FFE" | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() && !licence.trim()) {
      setError("Veuillez renseigner au moins un Nom ou un Numéro de Licence.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSource(null);

    try {
      const params = new URLSearchParams();
      if (licence.trim()) params.set("licence", licence.trim());
      if (nom.trim()) params.set("nom", nom.trim());
      if (prenom.trim()) params.set("prenom", prenom.trim());
      if (club.trim()) params.set("club", club.trim());
      if (isLive) params.set("live", "true");

      const res = await fetch(`/api/players/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la recherche du joueur.");
      }

      setResults(data.players || []);
      setSource(data.source || (isLive ? "LIVE_FFE" : "LOCAL"));

      if (!data.players || data.players.length === 0) {
        setError("Aucun joueur trouvé correspondant à vos critères.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de recherche en Glassmorphisme */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Search className="w-5 h-5 text-marseille-500 dark:text-sky-400" />
            <span>Recherche FFE de Joueur</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Recherchez instantanément un joueur dans la base locale de Marseille-Échecs ou interrogez le site officiel de la FFE en temps réel.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nom de famille *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: CHUKHNO, ANAND..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-marseille-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Prénom (optionnel)
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Maxime, Jean..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-marseille-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                N° de Licence FFE (optionnel)
              </label>
              <input
                type="text"
                value={licence}
                onChange={(e) => setLicence(e.target.value)}
                placeholder="Ex: X81304"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-marseille-500/50 transition-all font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Club cible (optionnel)
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="Ex: Marseille-Echecs"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-marseille-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
                className="w-4 h-4 rounded text-marseille-500 focus:ring-marseille-500 border-slate-300 dark:border-slate-700"
              />
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-500" />
                Interroger directement le site fédéral FFE (Live Scraper)
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-marseille-500 hover:bg-marseille-600 text-white shadow-md shadow-marseille-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recherche en cours...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Rechercher le joueur</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Résultats de la recherche */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{results.length} joueur{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {source === "LIVE_FFE" ? (
                  <>
                    <Globe className="w-3 h-3 text-sky-500" />
                    Source : echecs.asso.fr
                  </>
                ) : (
                  <>
                    <Database className="w-3 h-3 text-indigo-500" />
                    Source : Base locale PostgreSQL
                  </>
                )}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((player) => (
              <div
                key={player.nrFFE || `${player.nom}-${player.prenom}`}
                className="glass-card rounded-2xl p-5 shadow-sm space-y-4 hover:border-marseille-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-marseille-500 dark:text-sky-400" />
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {player.nom} {player.prenom}
                      </h4>
                      {player.titre && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          {player.titre}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Licence : <span className="font-semibold text-slate-800 dark:text-slate-200">{player.nrFFE || "-"}</span>
                      {player.cat && ` • Cat. ${player.cat}`}
                      {player.sexe && ` (${player.sexe})`}
                    </p>
                  </div>

                  <LicenseBadge type={player.af} />
                </div>

                {/* Élos et Club */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Standard</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {player.elo || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rapide</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {player.rapide || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Blitz</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {player.blitz || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 truncate">
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{player.club || "Club non spécifié"}</span>
                  </span>
                  {player.clubCode && (
                    <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {player.clubCode}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
