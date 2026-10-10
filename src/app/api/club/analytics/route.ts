/**
 * Route API /api/club/analytics
 * Statistiques et analytique du club réservées au Directeur et Superadmin.
 * Auteur : Sergey CHUKHNO
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth/session";
import { getClubDemographicStats } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Sécurisation stricte RBAC : Seuls le directeur et le superadmin peuvent accéder
  const { auth, errorResponse } = await authenticateApi(req);
  if (errorResponse) {
    return errorResponse;
  }

  if (auth.user.role !== "director" && auth.user.role !== "superadmin") {
    return NextResponse.json(
      { error: "Accès refusé : module réservé au Directeur du club" },
      { status: 403 }
    );
  }

  try {
    const stats = await getClubDemographicStats();
    return NextResponse.json({
      success: true,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
