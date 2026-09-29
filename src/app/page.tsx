import React from "react";
import { CheckCircle2, ShieldCheck, Database, Clock, Terminal, Cpu } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                RecupFFE
              </h1>
              <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-sky-500/20">
                v1.1 (Scraping Pur FFE)
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Plateforme automatisée pour Marseille-Échecs • Conçu et développé par <strong className="text-slate-700 dark:text-slate-200">Sergey CHUKHNO</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Socle Next.js Opérationnel
            </span>
          </div>
        </div>
      </header>

      {/* Hero / Architecture Card */}
      <section className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-500" />
            Architecture Technique v1.1
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Transition réussie de Google Apps Script vers une application Next.js native déployable sur Vercel. 
            Toutes les fonctionnalités métier (accents, homonymes, vérification Excel par lots) sont strictement préservées en s&apos;appuyant à 100 % sur notre propre moteur de scraping officiel FFE.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Zéro Dépendance API</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suppression intégrale de l&apos;API tierce ChessXP. Moteur de scraping FFE officiel autonome et souverain.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <Database className="w-4 h-4" />
              <span>Base PostgreSQL</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stockage persistant des licenciés pour des vérifications de tournois ultra-rapides (&lt; 50 ms).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              <span>Cron 24h Nocturne</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synchronisation automatique nocturne de l&apos;effectif du club sans faire attendre les utilisateurs.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Progression */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          Avancement de la Feuille de Route (7 Étapes)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Étape 1</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <p className="text-slate-600 dark:text-slate-300">Branche Git v1.1 &amp; Socle pur scraping</p>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-sky-600 dark:text-sky-400">
              <span>Étape 2</span>
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">Next.js + TypeScript + CI/CD Actions</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 opacity-70">
            <div className="font-semibold text-slate-500">Étape 3</div>
            <p className="text-slate-500">Port TypeScript du Scraper FFE</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 opacity-70">
            <div className="font-semibold text-slate-500">Étapes 4 à 7</div>
            <p className="text-slate-500">PostgreSQL, Cron 24h, API &amp; IHM</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 pt-8 border-t border-slate-200 dark:border-slate-800">
        RecupFFE • Développé par Sergey CHUKHNO • Licence propriétaire Marseille-Échecs
      </footer>
    </main>
  );
}
