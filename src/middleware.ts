/**
 * Next.js Edge Middleware pour la protection des routes et redirections d'authentification
 * Auteur : Sergey CHUKHNO
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Chemins publics exemptés de vérification
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Détection du cookie de session Better-Auth
  const sessionToken =
    request.cookies.get("recupffe.session_token")?.value ||
    request.cookies.get("__Secure-recupffe.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 3. Si l'utilisateur est sur la page /login
  if (pathname === "/login") {
    // S'il est déjà connecté, redirection vers le tableau de bord principal
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 4. Si la route est une route d'API protégée et non authentifiée, laisser passer pour que le Route Handler retourne un 401 JSON propre
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 5. Pour toutes les autres pages applicatives (ex: /) : redirection vers /login si non connecté
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
