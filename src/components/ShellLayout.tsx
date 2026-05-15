"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import { Sprout } from "lucide-react";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen bg-[#F9FBF9]">
        {children}
      </main>
    </div>
  );
}
