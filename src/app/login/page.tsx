"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Sprout, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/lib/auth";

const AUTH_API = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Already authenticated → go to dashboard
  useEffect(() => {
    if (!isLoading && user) router.replace("/");
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
        if (res.status === 401) {
          setError(body.error ?? "Token de Google inválido o expirado.");
        } else if (res.status === 400) {
          setError(body.error ?? "Solicitud incorrecta.");
        } else {
          setError(`Error inesperado (${res.status}).`);
        }
        return;
      }

      const { token, user: authUser } = await res.json() as { token: string; user: User };
      login(token, authUser);
      router.replace("/");
    } catch {
      setError("Error de red. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return null; // wait for hydration

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#1e5631] rounded-2xl flex items-center justify-center mb-4 shadow-card">
            <Sprout size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AgroCore</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Ecosistema de monitoreo agrícola inteligente
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8">
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
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[#1e5631]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
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

        <p className="text-center text-xs text-slate-400 mt-6">
          Solo usuarios autorizados pueden acceder a AgroCore.
        </p>
      </div>
    </div>
  );
}
