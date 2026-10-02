/**
 * Point d'accès du Cron 24h & Synchronisation Automatique de l'Effectif Club
 * Route appelée automatiquement chaque nuit à 03h00 par Vercel Cron
 * ou manuellement par un administrateur.
 * Auteur : Sergey CHUKHNO
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllClubMembers } from "@/lib/scraper/service";
import { upsertPlayers, logSync } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/**
 * Vérifie l'autorisation d'accès via le jeton secret CRON_SECRET.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // En local de développement si aucun secret n'est défini
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  // 1. En-tête standard Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 2. Paramètre de requête (?secret=... ou ?key=...)
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret") || searchParams.get("key");
  if (secretParam === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Catégorise et explicite la cause d'un échec pour le diagnostic.
 */
function categorizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("timeout") || lower.includes("abort")) {
    return `FFE_TIMEOUT: Le serveur fédéral echecs.asso.fr n'a pas répondu dans le délai imparti (${msg})`;
  }
  if (lower.includes("503") || lower.includes("502") || lower.includes("maintenance")) {
    return `FFE_MAINTENANCE: Le serveur fédéral echecs.asso.fr est temporairement inaccessible pour maintenance (${msg})`;
  }
  if (lower.includes("http_error") || lower.includes("403") || lower.includes("404")) {
    return `FFE_HTTP_ERROR: Erreur HTTP retournée par le serveur de la FFE (${msg})`;
  }
  if (lower.includes("parsing") || lower.includes("table")) {
    return `PARSING_ERROR: Structure HTML inattendue sur les pages du club FFE (${msg})`;
  }
  if (lower.includes("postgres") || lower.includes("connection") || lower.includes("database")) {
    return `DATABASE_ERROR: Erreur d'enregistrement dans la base de données PostgreSQL (${msg})`;
  }
  return `SYNC_ERROR: ${msg}`;
}

/**
 * Exécute la logique de synchronisation pour le club indiqué.
 */
async function executeSync(request: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const clubCode = searchParams.get("club") || process.env.DEFAULT_CLUB_CODE || "N06013";

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        reason: "AUTH_ERROR: Jeton secret CRON_SECRET invalide ou manquant",
        clubCode,
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  try {
    // 1. Scraping complet des pages de l'effectif FFE
    const players = await fetchAllClubMembers(clubCode);

    if (!players || players.length === 0) {
      throw new Error(`Aucun joueur extrait pour le club ${clubCode}`);
    }

    // 2. Enregistrement atomique en base de données
    const playersSynced = await upsertPlayers(players);
    const durationMs = Date.now() - start;

    // 3. Journalisation de succès dans sync_logs
    await logSync({
      clubCode,
      status: "SUCCESS",
      playersSynced,
      durationMs,
      errorMessage: null,
    });

    return NextResponse.json({
      success: true,
      status: "SUCCESS",
      clubCode,
      playersSynced,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const reason = categorizeError(err);

    // Journalisation détaillée de l'échec dans sync_logs
    await logSync({
      clubCode,
      status: "FAILED",
      playersSynced: 0,
      durationMs,
      errorMessage: `REASON: ${reason}`,
    });

    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        reason,
        clubCode,
        durationMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return executeSync(request);
}

export async function POST(request: NextRequest) {
  return executeSync(request);
}
