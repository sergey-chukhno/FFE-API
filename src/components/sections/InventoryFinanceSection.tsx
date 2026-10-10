import React from "react";
import {
  PackageCheck,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  Mail,
  BellRing,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Download,
} from "lucide-react";

export function InventoryFinanceSection() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête du Module */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Coins className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Inventaire & Trésorerie du Club
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Secrétariat & Direction
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gestion des stocks (Buvette, Boutique, Bibliothèque), suivi des flux financiers et alertes de réassort.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Étape 10B en préparation
            </span>
          </div>
        </div>
      </div>

      {/* Cartes KPI Synthèse Financière Prévisionnelle */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Revenus & Ventes (Mois)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            1 845,00 €
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Buvette, boutique & inscriptions stages
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Dépenses & Réassort (Mois)</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            620,00 €
          </div>
          <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 font-medium">
            Achats stocks, pendules DGT & logistique
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">
            <span>Résultat Net d&apos;Exploitation</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            + 1 225,00 €
          </div>
          <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-medium">
            Marge opérationnelle positive (+66.4 %)
          </p>
        </div>
      </div>

      {/* Piliers Fonctionnels du Module */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pilier 1 : Gestion d'Inventaire & Alertes */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Articles & Alertes de Réassort
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Boutique (pendules, jeux), Buvette (boissons, snacks), Bibliothèque
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Alertes sur Dashboard</span>
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md">
                Badge réassort immédiat
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Notifications E-mail Brevo</span>
              </div>
              <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-md">
                Alertes automatiques secrétaire
              </span>
            </div>
          </div>
        </div>

        {/* Pilier 2 : Rapports, Graphiques & Exports */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Rapports Financiers & Exports Analytiques
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Génération de synthèses comptables et partage officiel
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Exports Multi-Formats</span>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold bg-slate-200/70 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                Excel (.xlsx), CSV & PDF Club
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Partage Email Trésorerie</span>
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                Envoi 1 clic au Directoire
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Note d'information de transition */}
      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            Implémentation complète en cours (Étape 10B) :
          </span>{" "}
          Le formulaire interactif CRUD des articles, la saisie des encaissements/dépenses, les graphiques analytiques et le moteur d&apos;export Excel/PDF seront entièrement câblés à l&apos;Étape 10B.
        </div>
      </div>
    </div>
  );
}
