/**
 * Tests unitaires pour les gardes d'authentification et de session
 * Auteur : Sergey CHUKHNO
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession, authenticateApi } from "../session";

describe("Session & API Authentication Guards", () => {
  it("retourne null quand aucun utilisateur n'est connecté", async () => {
    const headers = new Headers();
    headers.set("x-test-unauthenticated", "true");

    const session = await getServerSession(headers);
    expect(session).toBeNull();
  });

  it("récupère correctement la session et le rôle spécifié", async () => {
    const headers = new Headers();
    headers.set("x-test-role", "director");

    const session = await getServerSession(headers);
    expect(session).not.toBeNull();
    expect(session?.user.role).toBe("director");
    expect(session?.user.email).toBe("director@marseille-echecs.com");
  });

  it("authenticateApi renvoie HTTP 401 en cas d'absence de session", async () => {
    const req = new NextRequest("http://localhost:3000/api/verify-batch", {
      method: "POST",
      headers: {
        "x-test-unauthenticated": "true",
      },
    });

    const result = await authenticateApi(req, "license:verify");
    expect(result.auth).toBeUndefined();
    expect(result.errorResponse).toBeDefined();

    if (result.errorResponse) {
      expect(result.errorResponse.status).toBe(401);
      const json = await result.errorResponse.json();
      expect(json.code).toBe("UNAUTHORIZED");
    }
  });

  it("authenticateApi renvoie HTTP 403 quand le rôle n'a pas la permission requise", async () => {
    const req = new NextRequest("http://localhost:3000/api/verify-batch", {
      method: "POST",
      headers: {
        "x-test-role": "coach", // Le coach n'a pas license:verify
      },
    });

    const result = await authenticateApi(req, "license:verify");
    expect(result.auth).toBeUndefined();
    expect(result.errorResponse).toBeDefined();

    if (result.errorResponse) {
      expect(result.errorResponse.status).toBe(403);
      const json = await result.errorResponse.json();
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("coach");
    }
  });

  it("authenticateApi valide l'accès quand le rôle possède la permission requise", async () => {
    const req = new NextRequest("http://localhost:3000/api/verify-batch", {
      method: "POST",
      headers: {
        "x-test-role": "director", // Le directeur possède license:verify
      },
    });

    const result = await authenticateApi(req, "license:verify");
    expect(result.errorResponse).toBeUndefined();
    expect(result.auth).toBeDefined();
    expect(result.auth?.user.role).toBe("director");
  });
});
