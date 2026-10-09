/**
 * Gestionnaire de Session Serveur & Gardes d'Accès API
 * Auteur : Sergey CHUKHNO
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { hasPermission, PermissionKey } from "./permissions";
import { UserRole } from "../db/schema";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string | null;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

/**
 * Récupère la session courante côté serveur (Server Components, Server Actions ou Route Handlers)
 */
export async function getServerSession(reqHeaders?: Headers): Promise<AuthSession | null> {
  try {
    const h = reqHeaders || headers();

    // Gestion des environnements de tests automatisés (Vitest)
    if (process.env.NODE_ENV === "test") {
      if (h.get("x-test-unauthenticated") === "true") {
        return null;
      }
      const testRole = h.get("x-test-role");
      if (testRole) {
        return {
          user: {
            id: `test-${testRole}-id`,
            email: `${testRole}@marseille-echecs.com`,
            name: `Test ${testRole}`,
            role: testRole as UserRole,
            image: null,
          },
          session: {
            id: `test-session-${testRole}`,
            userId: `test-${testRole}-id`,
            token: `token-${testRole}`,
            expiresAt: new Date(Date.now() + 3600000),
          },
        };
      }
      // Si aucun cookie n'est présent dans le test unitaire hérité, rôle directeur par défaut
      if (!h.get("cookie")) {
        return {
          user: {
            id: "test-director-id",
            email: "directeur@marseille-echecs.com",
            name: "Directeur Test",
            role: "director",
            image: null,
          },
          session: {
            id: "test-session-director",
            userId: "test-director-id",
            token: "token-director",
            expiresAt: new Date(Date.now() + 3600000),
          },
        };
      }
    }

    const sessionData = await auth.api.getSession({ headers: h });
    if (!sessionData?.user) return null;

    return {
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        role: (sessionData.user.role as UserRole) || "coach",
        image: sessionData.user.image,
      },
      session: {
        id: sessionData.session.id,
        userId: sessionData.session.userId,
        token: sessionData.session.token,
        expiresAt: new Date(sessionData.session.expiresAt),
      },
    };
  } catch (err) {
    console.error("Erreur récupération session serveur:", err);
    return null;
  }
}

/**
 * Garde API standard pour sécuriser les Route Handlers
 * Renvoie un objet avec soit `auth` (session valide), soit `errorResponse` (401 ou 403).
 */
export async function authenticateApi(
  req: NextRequest,
  requiredPermission?: PermissionKey
): Promise<{ auth: AuthSession; errorResponse?: never } | { auth?: never; errorResponse: NextResponse }> {
  const session = await getServerSession(req.headers);

  if (!session) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Authentification requise pour accéder à cette ressource",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      ),
    };
  }

  if (requiredPermission && !hasPermission(session.user.role, requiredPermission)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Accès refusé : le rôle '${session.user.role}' ne possède pas la permission '${requiredPermission}'`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return { auth: session };
}
