"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Sprout, AlertCircle, Clock, ShieldOff, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/lib/auth";

const AUTH_API = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

type LoginScreen = "form" | "pending" | "blocked";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [screen, setScreen] = useState<LoginScreen>("form");
  const [pendingEmail, setPendingEmail] = useState<string>("");

  // Already authenticated (ACTIVO) → go to dashboard
  useEffect(() => {
    if (!isLoading && user && user.status === "ACTIVO") router.replace("/");
  }, [user, isLoading, router]);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("No se recibió token de Google. Intenta de nuevo.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        if (res.status === 403) {
          setError(body.error ?? "Tu cuenta ha sido suspendida. Contacta al administrador.");
          setScreen("blocked");
        } else if (res.status === 401) {
          setError(body.error ?? "Token de Google inválido o expirado.");
        } else if (res.status === 400) {
          setError(body.error ?? "Solicitud incorrecta.");
        } else {
          setError(`Error inesperado (${res.status}).`);
        }
        return;
      }

      const { token, user: authUser } = await res.json() as { token: string; user: User };

      if (authUser.status === "PENDIENTE") {
        setPendingEmail(authUser.email);
        setScreen("pending");
        return;
      }

      if (authUser.status === "BLOQUEADO") {
        setError("Tu cuenta ha sido suspendida. Contacta al administrador.");
        setScreen("blocked");
        return;
      }

      login(token, authUser);
      router.replace("/");
    } catch {
      setError("Error de red. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return null;

  // Shared background wrapper
  const Bg = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#f4f8f5]">
      {/* Soft green radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(30,86,49,0.10) 0%, transparent 70%)",
        }}
      />
      {/* Subtle corner accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(30,86,49,0.12) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(45,122,71,0.15) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  );

  // ── Pending approval screen ──────────────────────────────────────────────
  if (screen === "pending") {
    return (
      <Bg>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white shadow-card-lg p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Clock size={28} className="text-amber-600" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
            Cuenta en revisión
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-5">
            Tu cuenta está pendiente de aprobación por un administrador.
            Cuando sea aprobada podrás acceder a la plataforma.
          </p>
          {pendingEmail && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium mb-6">
              Solicitud registrada para{" "}
              <span className="font-bold">{pendingEmail}</span>
            </div>
          )}
          <button
            onClick={() => { setScreen("form"); setError(null); }}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <LogIn size={14} className="mr-1.5" />
            Volver a iniciar sesión
          </button>
        </div>
      </Bg>
    );
  }

  // ── Blocked screen ───────────────────────────────────────────────────────
  if (screen === "blocked") {
    return (
      <Bg>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white shadow-card-lg p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
              <ShieldOff size={28} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
            Acceso suspendido
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            {error ?? "Tu cuenta ha sido suspendida. Contacta al administrador."}
          </p>
          <button
            onClick={() => { setScreen("form"); setError(null); }}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <LogIn size={14} className="mr-1.5" />
            Volver a iniciar sesión
          </button>
        </div>
      </Bg>
    );
  }

  // ── Login form ───────────────────────────────────────────────────────────
  return (
    <Bg>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#1e5631] rounded-2xl flex items-center justify-center mb-4 shadow-card-lg">
          <Sprout size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AgroCore</h1>
        <p className="text-slate-500 text-sm mt-1 text-center">
          Ecosistema de monitoreo agrícola inteligente
        </p>
      </div>

      {/* Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white shadow-card-lg p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Iniciar sesión</h2>
        <p className="text-slate-500 text-sm mb-6">
          Usa tu cuenta de Google corporativa para acceder.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start text-sm text-red-700">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {processing ? (
            <div className="text-sm text-slate-500 flex items-center gap-2 py-1">
              <svg className="animate-spin h-4 w-4 text-[#1e5631]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Verificando cuenta…
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError("Inicio de sesión con Google cancelado o fallido.")}
              useOneTap
              theme="outline"
              shape="rectangular"
              size="large"
              text="signin_with"
            />
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-5">
        Solo usuarios autorizados pueden acceder a AgroCore.
      </p>
    </Bg>
  );
}
