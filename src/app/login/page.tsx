"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  Sprout,
  AlertCircle,
  Clock,
  ShieldOff,
  LogIn,
  Activity,
  Bell,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/lib/auth";

const AUTH_API = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

type LoginScreen = "form" | "pending" | "blocked";

// ── Shared left panel ────────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden md:flex md:w-3/5 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-b from-[#1e5631] via-[#2d7a47] to-[#1a4d2b]">
      {/* Dot pattern */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern
            id="dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Top — logo + name */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-1 ring-white/20 shadow-lg">
            <Sprout size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
              AgroCore
            </h1>
            <p className="text-green-200 text-sm font-medium mt-0.5">
              Smart Farming Platform
            </p>
          </div>
        </div>

        <h2 className="text-white/90 text-2xl font-bold leading-snug max-w-sm mb-3">
          Monitoreo agrícola en tiempo real
        </h2>
        <p className="text-green-200/80 text-sm leading-relaxed max-w-xs">
          Controla las condiciones de tus cultivos, detecta anomalías y toma
          decisiones basadas en datos desde cualquier dispositivo.
        </p>
      </div>

      {/* Middle — feature list */}
      <div className="relative z-10 space-y-4">
        {[
          {
            icon: Activity,
            title: "Telemetría en vivo",
            desc: "Temperatura, humedad y CO₂ actualizados cada 5 segundos.",
          },
          {
            icon: Bell,
            title: "Alertas automáticas",
            desc: "Detecta desviaciones fuera del rango óptimo de cada especie.",
          },
          {
            icon: BarChart3,
            title: "Analítica histórica",
            desc: "Gráficas de ciclo completo y trazabilidad post-cosecha.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 ring-1 ring-white/15">
              <Icon size={16} className="text-green-200" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{title}</p>
              <p className="text-green-200/70 text-xs leading-snug mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom — badge */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 bg-white/10 ring-1 ring-white/20 text-green-100 text-xs font-semibold px-3 py-1.5 rounded-full">
          <CheckCircle2 size={12} />
          Proyecto Integrador · 2026
        </span>
      </div>
    </div>
  );
}

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

  // ── Pending approval screen ──────────────────────────────────────────────
  if (screen === "pending") {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-xs text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shadow-card">
                <Clock size={30} className="text-amber-600" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
              Cuenta en revisión
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Tu cuenta está pendiente de aprobación por un administrador.
              Cuando sea aprobada podrás acceder a la plataforma.
            </p>
            {pendingEmail && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 font-medium mb-8">
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
        </div>
      </div>
    );
  }

  // ── Blocked screen ───────────────────────────────────────────────────────
  if (screen === "blocked") {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-xs text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shadow-card">
                <ShieldOff size={30} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
              Acceso suspendido
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
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
        </div>
      </div>
    );
  }

  // ── Login form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        {/* Mobile-only logo */}
        <div className="flex flex-col items-center mb-10 md:hidden">
          <div className="w-14 h-14 bg-[#1e5631] rounded-2xl flex items-center justify-center mb-3 shadow-card">
            <Sprout size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AgroCore</h1>
          <p className="text-slate-500 text-sm mt-1">Ecosistema de monitoreo agrícola</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Bienvenido
            </h2>
            <p className="text-slate-500 text-sm">
              Inicia sesión para acceder al panel de control.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-start text-sm text-red-700">
              <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">Accede con</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="flex flex-col items-center gap-4">
            {processing ? (
              <div className="text-sm text-slate-500 flex items-center gap-2.5 py-3">
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

          <p className="text-center text-xs text-slate-400 mt-10 leading-relaxed">
            Solo usuarios autorizados pueden acceder a AgroCore.
            <br />
            Contacta a un administrador si no tienes acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
