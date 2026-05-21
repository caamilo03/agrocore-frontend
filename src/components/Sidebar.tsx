"use client";

import {
  LayoutDashboard,
  Sprout,
  Layers,
  BarChart3,
  LogOut,
  Package,
  Building2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  OBSERVADOR: "Observador",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-emerald-100 text-emerald-700",
  OPERADOR: "bg-blue-100 text-blue-700",
  OBSERVADOR: "bg-slate-100 text-slate-600",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Panel Principal", path: "/", icon: LayoutDashboard, adminOnly: false },
    { name: "Gestión de Especies", path: "/species", icon: Sprout, adminOnly: false },
    { name: "Gestión de Sustratos", path: "/substrates", icon: Package, adminOnly: false },
    { name: "Gestión de Proveedores", path: "/suppliers", icon: Building2, adminOnly: false },
    { name: "Lotes Activos", path: "/batches", icon: Layers, adminOnly: false },
    { name: "Analítica Histórica", path: "/analytics", icon: BarChart3, adminOnly: false },
    { name: "Gestión de Usuarios", path: "/users", icon: Users, adminOnly: true },
  ].filter((item) => !item.adminOnly || user?.role === "ADMIN");

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col justify-between fixed top-0 left-0 z-40">
      <div>
        {/* Logo */}
        <div className="h-20 flex items-center px-6">
          <div className="bg-[#1e5631] rounded-lg p-2 mr-3 text-white shadow-card">
            <Sprout size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">AgroCore</span>
        </div>

        {/* Nav */}
        <nav className="mt-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#1e5631] text-white font-bold shadow-card"
                    : "text-slate-600 font-medium hover:bg-green-50 hover:text-[#1e5631]"
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-slate-200">
        {user && (
          <div className="flex items-center px-3 py-3 mb-3 bg-slate-50 rounded-xl">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                width={36}
                height={36}
                className="rounded-full mr-3 flex-shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1e5631] text-white flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{user.username}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase mt-0.5 ${user.role ? (ROLE_BADGE[user.role] ?? "bg-slate-100 text-slate-600") : "bg-amber-100 text-amber-700"}`}>
                {user.role ? (ROLE_LABEL[user.role] ?? user.role) : "PENDIENTE"}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition-colors text-sm"
        >
          <LogOut size={16} className="mr-2" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
