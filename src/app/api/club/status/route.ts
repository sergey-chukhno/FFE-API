/**
 * Point d'accès de statut et de santé du club (/api/club/status)
 * Alimente en direct le bandeau supérieur de l'interface utilisateur.
 * Auteur : Sergey CHUKHNO
 */

import { NextResponse } from "next/server";
import { getPlayersCount, getLatestSyncLog } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalPlayers = await getPlayersCount();
    const lastSync = await getLatestSyncLog();

    const clubCode = process.env.DEFAULT_CLUB_CODE || "N06013";
    const clubName = process.env.DEFAULT_CLUB_NAME || "Marseille-Echecs";

    return NextResponse.json({
      success: true,
      clubCode,
      clubName,
      totalPlayers,
      totalMembers: totalPlayers,
      lastSync: lastSync
        ? {
            id: lastSync.id,
            status: lastSync.status,
            playersSynced: lastSync.playersSynced,
            durationMs: lastSync.durationMs,
            errorMessage: lastSync.errorMessage,
            createdAt: lastSync.createdAt,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Erreur récupération statut: ${errorMsg}` },
      { status: 500 }
    );
  }
}
