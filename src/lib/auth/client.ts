/**
 * Client d'authentification Better-Auth pour l'interface React Next.js
 * avec inférence typée des champs personnalisés (role, phone)
 * Auteur : Sergey CHUKHNO
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    inferAdditionalFields<typeof auth>(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
