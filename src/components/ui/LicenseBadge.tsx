import React from "react";

interface LicenseBadgeProps {
  type: string | null | undefined;
  className?: string;
}

export function LicenseBadge({ type, className = "" }: LicenseBadgeProps) {
  const cleanType = (type || "").trim().toUpperCase();

  if (cleanType === "A") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 ${className}`}
        title="Licence A — Compétition homologuée (FIDE & FFE)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Licence A
      </span>
    );
  }

  if (cleanType === "B") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-sm shadow-blue-500/10 ${className}`}
        title="Licence B — Loisir, scolaire, parties rapides"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        Licence B
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 ${className}`}
      title="Non licencié ou non trouvé dans la base du club"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
      Non vérifié
    </span>
  );
}
