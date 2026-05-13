"use client";

import { 
  LayoutDashboard, 
  Sprout, 
  Layers, 
  BarChart3, 
  LogOut,
  Package,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Panel Principal', path: '/', icon: LayoutDashboard },
    { name: 'Gestión de Especies', path: '/species', icon: Sprout },
    { name: 'Gestión de Sustratos', path: '/substrates', icon: Package },
    { name: 'Gestión de Proveedores', path: '/suppliers', icon: Building2 },
    { name: 'Lotes Activos', path: '/batches', icon: Layers },
    { name: 'Analítica Histórica', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col justify-between fixed">
      <div>
        <div className="h-20 flex items-center px-6">
          <div className="bg-[#1e5631] rounded-lg p-2 mr-3 text-white shadow-card">
            <Sprout size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">AgroCore</span>
        </div>

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
                    ? 'bg-[#1e5631] text-white font-bold shadow-card'
                    : 'text-slate-600 font-medium hover:bg-green-50 hover:text-[#1e5631]'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center px-4 py-3 mb-4 bg-slate-50 rounded-xl cursor-not-allowed">
          <div className="w-8 h-8 rounded-full bg-slate-300 mr-3 flex-shrink-0"></div>
          <div className="flex flex-col text-sm">
            <span className="font-bold text-slate-800">Admin Usuario</span>
            <span className="text-slate-500 text-xs">Supervisor de Planta</span>
          </div>
        </div>

        <button className="flex w-full items-center justify-center px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors">
          <LogOut size={18} className="mr-2" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}