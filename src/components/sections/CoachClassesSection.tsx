import React from "react";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  ClipboardList,
  Sparkles,
  Search,
  BookOpen,
} from "lucide-react";

export function CoachClassesSection() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête du Module Entraîneur */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Mes Cours & Entraînements
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Espace Entraîneur
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Suivi pédagogique des groupes, listes d&apos;élèves licenciés et pointage des présences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              Étape 10C en préparation
            </span>
          </div>
        </div>
      </div>

      {/* Aperçu des Cours du Club */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cours 1 */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
              Groupe Jeunes
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Mercredi • 14h00 - 16h00
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Jeunes Espoirs & Compétition
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Perfectionnement tactique, finales élémentaires et préparation aux tournois homologués FFE.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>12 élèves inscrits</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              100% licenciés A
            </span>
          </div>
        </div>

        {/* Cours 2 */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Groupe Adultes
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Samedi • 10h00 - 12h00
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Adultes Débutants & Loisirs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Principes d&apos;ouverture, calcul des variantes et parties amicales analysées en club.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>8 élèves inscrits</span>
            </div>
            <span className="text-sky-600 dark:text-sky-400 font-medium">
              Licenciés A & B
            </span>
          </div>
        </div>
      </div>

      {/* Fonctionnalités Clés du Pôle Pédagogique */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Outils Pédagogiques dédiés aux Entraîneurs
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <span>Pointage d&apos;Assiduité</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Émargement en 1 clic par date avec suivi du taux de présence de chaque élève.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Search className="w-4 h-4 text-sky-500" />
              <span>Fiche FFE & Élo en Direct</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Accès immédiat à la fiche fédérale, au classement Rapide/Blitz et à la catégorie d&apos;âge.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Cahier Pédagogique</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Partage d&apos;exercices tactiques, thèmes d&apos;ouverture et devoirs entre séances.
            </p>
          </div>
        </div>
      </div>

      {/* Note d'information de transition */}
      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-sky-500 flex-shrink-0" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            Activation à l&apos;Étape 10C :
          </span>{" "}
          Le module d&apos;assiduité interactif et la liaison directe avec les 1 625 licenciés de Marseille-Échecs seront pleinement activés à l&apos;Étape 10C.
        </div>
      </div>
    </div>
  );
}
