import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecupFFE v1.1 — Plateforme FFE & Marseille-Échecs",
  description: "Plateforme moderne de vérification et d'extraction des licences FFE pour Marseille-Échecs. Architecture Next.js, Pure Scraping et PostgreSQL.",
  authors: [{ name: "Sergey CHUKHNO" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
