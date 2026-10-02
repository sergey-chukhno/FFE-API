import React from "react";
import { Info, X, Zap, Database, Globe, CheckCircle2 } from "lucide-react";

interface SyncExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncExplanationModal({ isOpen, onClose }: SyncExplanationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg p-6 rounded-2xl glass-panel shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-marseille-500 dark:text-sky-400">
            <div className="p-2 rounded-xl bg-marseille-500/10 dark:bg-sky-500/10">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Pourquoi synchroniser le club ?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            La Fédération Française des Échecs (FFE) publie quotidiennement de nouvelles prises de licence et actualise les classements Élo le 1er de chaque mois.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <Globe className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block font-semibold">1. Extraction FFE Officielle</strong>
                Notre moteur de scraping autonome extrait l&apos;intégralité des licenciés actifs de <strong>Marseille-Échecs</strong> directement depuis le site fédéral officiel <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">echecs.asso.fr</code>.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <Database className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block font-semibold">2. Stockage PostgreSQL Local</strong>
                Les données (numéros FFE, Élos, catégories d&apos;âge, type de licence A ou B) sont enregistrées dans la base de données locale du club.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-950 dark:text-emerald-200 block font-semibold">3. Bénéfice : Vérification Instantanée (&lt; 50 ms)</strong>
                Vérifier un fichier Excel de 100 participants via le site FFE prendrait plusieurs minutes avec un risque élevé de blocage. Grâce à la synchronisation, la vérification se fait en <strong>quelques millisecondes</strong> en base locale !
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Un cron automatique effectue déjà cette mise à jour toutes les nuits à 03h00 UTC.</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-marseille-500 hover:bg-marseille-600 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-marseille-500/20"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
