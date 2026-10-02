import React from "react";
import { Users, Lock, Shield, Award, Calendar, CheckCircle2 } from "lucide-react";

export function TeamsComingSoonSection() {
  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-6 max-w-2xl mx-auto">
      <div className="inline-flex p-4 rounded-3xl bg-marseille-500/10 dark:bg-sky-500/10 text-marseille-500 dark:text-sky-400">
        <Users className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Lock className="w-3 h-3 text-amber-500" />
          <span>Bientôt disponible • Version 1.2</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Gestion des Équipes & Rondes
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Préparez et validez vos compositions d&apos;équipes pour les compétitions fédérales (Top 16, Nationale 1, 2, 3, 4 et Régionale).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Shield className="w-4 h-4 text-marseille-500 dark:text-sky-400" />
            <span>Conformité FIDE & FFE</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contrôle automatique de l&apos;ordre strict des échiquiers selon le classement Élo officiel du mois.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Vérification Licence A</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alerte immédiate si un joueur sélectionné ne dispose que d&apos;une Licence B ou n&apos;est pas qualifié.
          </p>
        </div>
      </div>

      <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-sky-500" />
        <span>Feuille de match officielle FFE pré-remplie en 1 clic</span>
      </div>
    </div>
  );
}
