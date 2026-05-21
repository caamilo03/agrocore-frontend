"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import { Sprout, Clock, LogOut } from "lucide-react";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, isLoading, isLoginPage, router]);

  // Login page — no chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading / auth check in progress
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-12 h-12 bg-[#1e5631] rounded-xl flex items-center justify-center animate-pulse">
            <Sprout size={24} className="text-white" />
          </div>
          <span className="text-sm font-medium">Cargando AgroCore…</span>
        </div>
      </div>
    );
  }

  // Pending approval screen — user exists but not yet approved
  if (user.status === "PENDIENTE") {
    return (
      <div className="min-h-screen bg-[#F9FBF9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Clock size={32} className="text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
            Cuenta en revisión
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Tu cuenta está pendiente de aprobación por un administrador.
            Cuando sea aprobada podrás acceder a la plataforma.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 font-medium mb-6">
            Sesión iniciada como <span className="font-bold">{user.email}</span>
          </div>
          <button
            onClick={() => { logout(); router.replace("/login"); }}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut size={14} className="mr-1.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen bg-[#F9FBF9]">
        {children}
      </main>
    </div>
  );
}
