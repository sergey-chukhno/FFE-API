/**
 * Point d'accès de recherche unitaire intelligente (/api/players/search)
 * Recherche en priorité dans la base PostgreSQL de Marseille-Échecs,
 * avec bascule automatique vers le scraper officiel FFE si demandé ou non trouvé.
 * Auteur : Sergey CHUKHNO
 */

import { NextRequest, NextResponse } from "next/server";
import { searchLocalPlayers } from "@/lib/db/repository";
import { searchFfePlayers } from "@/lib/scraper/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const nom = searchParams.get("nom") || q;
  const prenom = searchParams.get("prenom") || undefined;
  const club = searchParams.get("club") || undefined;
  const live = searchParams.get("live") === "true";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!nom || !nom.trim()) {
    return NextResponse.json(
      { success: false, error: "Paramètre 'nom' ou 'q' requis" },
      { status: 400 }
    );
  }

  // 1. Recherche locale instantanée dans la base PostgreSQL
  const localResults = await searchLocalPlayers(nom, limit);

  // Si on a des résultats locaux et que le mode live n'est pas forcé
  if (localResults.length > 0 && !live) {
    return NextResponse.json({
      success: true,
      source: "LOCAL_DATABASE",
      count: localResults.length,
      players: localResults.map((r) => ({
        nrFfe: r.nrFfe,
        nomPrenom: r.nomPrenom,
        nom: r.nom,
        prenom: r.prenom,
        af: r.af,
        elo: r.elo,
        rapide: r.rapide,
        blitz: r.blitz,
        cat: r.cat,
        club: r.club,
        lienFfe: r.lienFfe,
      })),
    });
  }

  // 2. Bascule vers le scraping officiel FFE en direct
  try {
    const ffeResult = await searchFfePlayers({
      nom,
      prenom,
      club,
    });

    return NextResponse.json({
      success: true,
      source: "FFE_OFFICIAL_SCRAPER",
      status: ffeResult.status,
      count: ffeResult.count,
      players: ffeResult.players,
      error: ffeResult.error,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        source: "FFE_OFFICIAL_SCRAPER",
        error: `Erreur lors de la recherche FFE: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
