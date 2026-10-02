import React from "react";
import { Search, FileSpreadsheet, Users, BarChart3, Lock } from "lucide-react";

export type TabKey = "search" | "verify" | "teams" | "analytics";

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    {
      key: "verify" as TabKey,
      label: "Vérification des Licences",
      icon: FileSpreadsheet,
      active: true,
      badge: "Cœur",
    },
    {
      key: "search" as TabKey,
      label: "Recherche FFE",
      icon: Search,
      active: true,
      badge: null,
    },
    {
      key: "teams" as TabKey,
      label: "Gestion des Équipes",
      icon: Users,
      active: false,
      badge: "Bientôt disponible",
    },
    {
      key: "analytics" as TabKey,
      label: "Analytique",
      icon: BarChart3,
      active: false,
      badge: "Bientôt disponible",
    },
  ];

  return (
    <nav className="w-full no-print">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-card max-w-full overflow-x-auto scrollbar-none shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          const isEnabled = tab.active;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 transform ${
                isSelected
                  ? "bg-marseille-500 text-white shadow-md shadow-marseille-500/25 scale-[1.01]"
                  : isEnabled
                  ? "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 opacity-75"
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? "text-white" : isEnabled ? "text-marseille-500 dark:text-sky-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>

              {tab.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isEnabled
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1"
                  }`}
                >
                  {!isEnabled && <Lock className="w-2.5 h-2.5" />}
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
