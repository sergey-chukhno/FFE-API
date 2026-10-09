/**
 * Tests unitaires pour le Next.js Edge Middleware
 * Auteur : Sergey CHUKHNO
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

describe("Next.js Edge Middleware", () => {
  it("laisse passer les chemins publics sans redirection (ex: /favicon.ico, /api/auth)", () => {
    const req1 = new NextRequest("http://localhost:3000/favicon.ico");
    const res1 = middleware(req1);
    expect(res1.headers.get("location")).toBeNull();

    const req2 = new NextRequest("http://localhost:3000/api/auth/session");
    const res2 = middleware(req2);
    expect(res2.headers.get("location")).toBeNull();
  });

  it("laisse passer les requêtes d'API protégées pour que les Route Handlers renvoient du JSON 401/403", () => {
    const req = new NextRequest("http://localhost:3000/api/verify-batch");
    const res = middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirige les requêtes de page non authentifiées vers /login", () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = middleware(req);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?callbackUrl=%2F");
  });

  it("laisse accéder à /login si non authentifié", () => {
    const req = new NextRequest("http://localhost:3000/login");
    const res = middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirige un utilisateur déjà connecté vers / lorsqu'il tente d'aller sur /login", () => {
    const req = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: "recupffe.session_token=mock_session_token_123",
      },
    });
    const res = middleware(req);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("laisse un utilisateur connecté accéder à la page d'accueil /", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        cookie: "recupffe.session_token=mock_session_token_123",
      },
    });
    const res = middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });
});
