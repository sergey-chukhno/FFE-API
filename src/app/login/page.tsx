"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth/client";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  Crown,
  GraduationCap,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  Sparkles,
  Info,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  // Thème clair/sombre synchronisé
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        setErrorMessage(res.error.message || "Identifiants invalides. Veuillez vérifier vos accès.");
        setLoading(false);
        return;
      }

      // Connexion réussie : redirection
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion au serveur.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Raccourci pour remplir les identifiants de test (mode dev)
  const handleSelectDemoUser = (role: string, demoEmail: string, demoPass: string) => {
    setSelectedDemoRole(role);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  // Clic Google OAuth
  const handleGoogleSignIn = async () => {
    // L'activation officielle aura lieu lors du déploiement avec le compte club (Étape 11)
    setShowGoogleNotice(true);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#070b14] overflow-hidden transition-colors duration-200">
      {/* Arrière-plan dynamique et halos de lumière glassmorphiques */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/15 dark:bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/15 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Bouton de bascule Day/Dark Mode en haut à droite */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Basculer le thème"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>
      </div>

      {/* Carte Glassmorphique Principale */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-900/10 dark:shadow-black/40">
          
          {/* En-tête / Logo Marseille-Échecs */}
          <div className="text-center space-y-2 mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-2 shadow-lg shadow-sky-600/10 mb-1">
              <Image
                src="/logo-marseille-echecs.png"
                alt="Logo officiel Marseille-Échecs"
                width={56}
                height={56}
                className="w-full h-full object-contain filter drop-shadow-sm"
                priority
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Marseille-Échecs
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Boîte à outils & Gestion administrative <span className="inline-block px-1.5 py-0.5 ml-1 text-[11px] font-semibold rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">v1.2</span>
            </p>
          </div>

          {/* Bannière d'erreur */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulaire de Connexion Email/Mot de passe */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@marseille-echecs.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white/80 dark:bg-slate-900 px-3 text-slate-400 font-semibold">
                Ou
              </span>
            </div>
          </div>

          {/* Bouton Google OAuth préparé */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          {/* Modal / Alerte Google OAuth non encore actif */}
          {showGoogleNotice && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Activation Google OAuth</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  L&apos;authentification Google sera activée lors de la configuration du compte officiel du club (Étape 11). Veuillez utiliser l&apos;e-mail et mot de passe pour le moment.
                </p>
              </div>
            </div>
          )}

          {/* Encart Raccourcis de Test (Strictement en Mode Développement) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Comptes de test (Mode Dev)
                </span>
                <span className="text-[10px] text-slate-400 italic">1 clic pour remplir</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("superadmin", "admin@marseille-echecs.com", "MarseilleAdmin2026!")}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    selectedDemoRole === "superadmin"
                      ? "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-[11px]">Superadmin</div>
                    <div className="text-[10px] opacity-70 truncate">admin@...</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("director", "directeur@marseille-echecs.com", "Directeur2026!")}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    selectedDemoRole === "director"
                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-[11px]">Directeur</div>
                    <div className="text-[10px] opacity-70 truncate">directeur@...</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("coach", "coach@marseille-echecs.com", "Coach2026!")}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    selectedDemoRole === "coach"
                      ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-[11px]">Entraîneur</div>
                    <div className="text-[10px] opacity-70 truncate">coach@...</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("secretary", "secretaire@marseille-echecs.com", "Secretaire2026!")}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    selectedDemoRole === "secretary"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-[11px]">Secrétaire</div>
                    <div className="text-[10px] opacity-70 truncate">secretaire@...</div>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070b14]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-800 animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

