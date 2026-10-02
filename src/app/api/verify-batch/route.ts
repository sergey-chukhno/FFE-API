/**
 * Point d'accès de Vérification par Lot (< 50 ms)
 * Reçoit un lot de participants (licences, joueurs ou lignes Excel brutes),
 * interroge la base PostgreSQL en une requête vectorielle et catégorise l'effectif.
 * Auteur : Sergey CHUKHNO
 */

import { NextRequest, NextResponse } from "next/server";
import { getPlayersByLicences, searchLocalPlayers } from "@/lib/db/repository";
import { parseExcelRows, ParsedParticipant } from "@/lib/parser/excel_batch";
import { PlayerRecord } from "@/lib/db/schema";
import { normalizeForMatch } from "@/lib/scraper/normalization";

export const dynamic = "force-dynamic";

export interface BatchItemResult {
  inputNom?: string;
  inputPrenom?: string;
  inputLicence?: string;
  inputPaiement?: string;
  matched: boolean;
  matchType?: "LICENCE_EXACT" | "NAME_EXACT" | "NOT_FOUND";
  player?: {
    nrFfe: string;
    nomPrenom: string;
    nom: string;
    prenom: string;
    af: string; // "A" | "B" | ""
    elo: string;
    rapide: string;
    blitz: string;
    cat: string;
    club: string;
    lienFfe: string | null;
  };
}

export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const body = await request.json();

    let participants: ParsedParticipant[] = [];

    // 1. Ingestion selon le format envoyé
    const rawInput = body.rows || body.rawLines;
    if (Array.isArray(rawInput)) {
      participants = parseExcelRows(rawInput);
    } else if (Array.isArray(body.players)) {
      participants = body.players.map((p: any) => ({
        licence: p.licence ? String(p.licence).trim().toUpperCase() : undefined,
        nom: p.nom ? String(p.nom).trim().toUpperCase() : undefined,
        prenom: p.prenom ? String(p.prenom).trim() : undefined,
        paiement: p.paiement,
      }));
    } else if (Array.isArray(body.licences)) {
      participants = body.licences.map((lic: string) => ({
        licence: String(lic).trim().toUpperCase(),
      }));
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Format de requête invalide. Attendu: { rows: [] } ou { rawLines: [] } ou { players: [] } ou { licences: [] }",
        },
        { status: 400 }
      );
    }

    if (participants.length === 0) {
      return NextResponse.json({
        success: true,
        verified: [],
        unverified: [],
        stats: {
          total: 0,
          verifiedCount: 0,
          verifiedA: 0,
          verifiedB: 0,
          unverifiedCount: 0,
          durationMs: 0,
        },
      });
    }

    // 2. Collecte de toutes les licences pour requête vectorielle unique
    const directLicences: string[] = participants
      .map((p) => p.licence)
      .filter((lic): lic is string => Boolean(lic && lic.length >= 2));

    // Requête vectorielle PostgreSQL < 50ms
    const matchedRecords = await getPlayersByLicences(directLicences);
    const recordsByLicence = new Map<string, PlayerRecord>();
    for (const r of matchedRecords) {
      recordsByLicence.set(r.nrFfe.toUpperCase(), r);
    }

    // 3. Traitement et catégorisation de chaque participant
    const verified: BatchItemResult[] = [];
    const unverified: BatchItemResult[] = [];
    let countA = 0;
    let countB = 0;

    for (const p of participants) {
      let matchedRecord: PlayerRecord | undefined;
      let matchType: "LICENCE_EXACT" | "NAME_EXACT" | "NOT_FOUND" = "NOT_FOUND";

      // A. Recherche par licence en priorité
      if (p.licence && recordsByLicence.has(p.licence)) {
        matchedRecord = recordsByLicence.get(p.licence);
        matchType = "LICENCE_EXACT";
      }

      // B. Si non trouvé par licence, recherche par Nom & Prénom en relais
      if (!matchedRecord && p.nom) {
        const localMatches = await searchLocalPlayers(p.nom, 5);
        if (localMatches.length > 0) {
          if (p.prenom) {
            const prenomNorm = normalizeForMatch(p.prenom);
            const exactPrenomMatch = localMatches.find(
              (m) => m.prenomNormalized === prenomNorm
            );
            if (exactPrenomMatch) {
              matchedRecord = exactPrenomMatch;
              matchType = "NAME_EXACT";
            }
          } else {
            // Un seul résultat avec ce nom
            if (localMatches.length === 1) {
              matchedRecord = localMatches[0];
              matchType = "NAME_EXACT";
            }
          }
        }
      }

      if (matchedRecord) {
        const afType = (matchedRecord.af || "").trim().toUpperCase();
        if (afType === "A") countA++;
        else if (afType === "B") countB++;

        verified.push({
          inputNom: p.nom,
          inputPrenom: p.prenom,
          inputLicence: p.licence,
          inputPaiement: p.paiement,
          matched: true,
          matchType,
          player: {
            nrFfe: matchedRecord.nrFfe,
            nomPrenom: matchedRecord.nomPrenom,
            nom: matchedRecord.nom,
            prenom: matchedRecord.prenom,
            af: afType,
            elo: matchedRecord.elo,
            rapide: matchedRecord.rapide,
            blitz: matchedRecord.blitz,
            cat: matchedRecord.cat,
            club: matchedRecord.club,
            lienFfe: matchedRecord.lienFfe,
          },
        });
      } else {
        unverified.push({
          inputNom: p.nom,
          inputPrenom: p.prenom,
          inputLicence: p.licence,
          inputPaiement: p.paiement,
          matched: false,
          matchType: "NOT_FOUND",
        });
      }
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    const verifiedA = verified.filter((v) => v.player?.af === "A");
    const verifiedB = verified.filter((v) => v.player?.af === "B");

    return NextResponse.json({
      success: true,
      verified,
      verifiedA,
      verifiedB,
      unverified,
      totalProcessed: participants.length,
      totalVerified: verified.length,
      verifiedACount: countA,
      verifiedBCount: countB,
      unverifiedCount: unverified.length,
      durationMs,
      stats: {
        total: participants.length,
        verifiedCount: verified.length,
        verifiedA: countA,
        verifiedB: countB,
        unverifiedCount: unverified.length,
        durationMs,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Erreur traitement par lot: ${errorMsg}` },
      { status: 500 }
    );
  }
}
