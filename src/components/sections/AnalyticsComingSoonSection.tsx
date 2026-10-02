import React from "react";
import { BarChart3, Lock, TrendingUp, Users, PieChart, CheckCircle2 } from "lucide-react";

export function AnalyticsComingSoonSection() {
  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-6 max-w-2xl mx-auto">
      <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
        <BarChart3 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Lock className="w-3 h-3 text-amber-500" />
          <span>Bientôt disponible • Version 1.2</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Tableau de Bord & Analytique du Club
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Statistiques décisionnelles et suivi démographique de l&apos;ensemble des adhérents de Marseille-Échecs au fil des saisons.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <PieChart className="w-4 h-4 text-sky-500" />
            <span>Répartition Démographique</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pyramide des âges (Poussins, Pupilles, Juniors, Seniors, Vétérans) et taux de féminisation.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Progression des Élos</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Graphiques d&apos;évolution mensuelle des classements Standard, Rapide et Blitz du club.
          </p>
        </div>
      </div>

      <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-indigo-500" />
        <span>Rapports annuels pour l&apos;Assemblée Générale et les subventions</span>
      </div>
    </div>
  );
}
