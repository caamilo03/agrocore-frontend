"use client";

import { 
  LayoutDashboard, 
  Sprout, 
  Layers, 
  BarChart3, 
  LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Panel Principal', path: '/', icon: LayoutDashboard },
    { name: 'Gestión de Especies', path: '/species', icon: Sprout },
    { name: 'Lotes Activos', path: '/batches', icon: Layers },
    { name: 'Analítica Histórica', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col justify-between fixed">
      <div>
        <div className="h-20 flex items-center px-6">
          <div className="bg-green-500 rounded p-2 mr-3 text-white">
            <Sprout size={24} />
          </div>
          <span className="text-xl font-bold text-gray-800">AgroCore</span>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-[#0F572B] text-white' 
                    : 'text-gray-500 hover:bg-green-50'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center px-4 py-3 mb-4 bg-gray-50 rounded-xl cursor-not-allowed">
          <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex-shrink-0"></div>
          <div className="flex flex-col text-sm">
            <span className="font-bold text-gray-800">Admin Usuario</span>
            <span className="text-gray-500 text-xs">Supervisor de Planta</span>
          </div>
        </div>

        <button className="flex w-full items-center justify-center px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
          <LogOut size={18} className="mr-2" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
