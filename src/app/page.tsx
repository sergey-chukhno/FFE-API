"use client";

import React, { useState } from "react";
import { HeaderBanner } from "@/components/HeaderBanner";
import { TabNavigation, TabKey } from "@/components/TabNavigation";
import { LicenseVerificationSection } from "@/components/sections/LicenseVerificationSection";
import { PlayerSearchSection } from "@/components/sections/PlayerSearchSection";
import { TeamsComingSoonSection } from "@/components/sections/TeamsComingSoonSection";
import { AnalyticsComingSoonSection } from "@/components/sections/AnalyticsComingSoonSection";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("verify");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-[#080d1a] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Header & Live Health Bar */}
      <HeaderBanner />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Navigation Tabs (Style ChatGPT / Google Material) */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Section Active */}
        <div className="transition-all duration-300">
          {activeTab === "verify" && <LicenseVerificationSection />}
          {activeTab === "search" && <PlayerSearchSection />}
          {activeTab === "teams" && <TeamsComingSoonSection />}
          {activeTab === "analytics" && <AnalyticsComingSoonSection />}
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400 no-print glass-panel mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Marseille-Échecs : Boîte à outils & Gestion administrative v1.1 — powered by{" "}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">Grégory CHIRON</strong> &{" "}
            <strong className="text-marseille-500 dark:text-sky-400 font-semibold">Sergey CHUKHNO</strong>
          </p>
          <p className="text-[11px] text-slate-400">
            Next.js • Pure Scraping FFE Officiel (echecs.asso.fr) • PostgreSQL haute performance
          </p>
        </div>
      </footer>
    </div>
  );
}
