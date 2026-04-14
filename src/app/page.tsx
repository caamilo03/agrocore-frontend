import { Search, Sprout, PackageOpen, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function PanelPrincipal() {
  return (
    <div className="p-8 text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Principal</h1>
          <p className="text-gray-500 text-sm">Bienvenido de nuevo, Administrador</p>
        </div>
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input 
            type="search" 
            className="block w-full p-2.5 pl-10 text-sm text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:ring-green-500 focus:border-green-500 outline-none" 
            placeholder="Buscar..." 
            required 
          />
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Especies Registradas', value: '12', subtitle: '+2 este mes', icon: Sprout, color: 'text-green-500', bg: 'bg-green-100', subColor: 'text-green-500' },
          { title: 'Lotes Activos', value: '45', subtitle: 'En producción', icon: PackageOpen, color: 'text-blue-500', bg: 'bg-blue-100', subColor: 'text-green-500' },
          { title: 'Lotes Completados', value: '128', subtitle: 'Histórico total', icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-100', subColor: 'text-gray-400' },
          { title: 'Rendimiento Total', value: '89.2%', subtitle: 'Promedio global', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-100', subColor: 'text-orange-500' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:border-green-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500 w-20 leading-tight">{kpi.title}</span>
                <div className={`${kpi.bg} p-2 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-800">{kpi.value}</h2>
              <span className={`text-xs font-semibold mt-2 ${kpi.subColor}`}>{kpi.subtitle}</span>
            </div>
          );
        })}
      </div>

      {/* Listado de vista rápida */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Lotes Activos - Vista Rápida</h2>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">Actualizado hace 2 min</span>
        </div>

        <div className="divide-y divide-gray-50">
          {[
            { name: 'Shiitake', id: '#SH-042', date: 'Iniciado: 12 Oct 2023', phase: 'Fase: Incubación', hum: '85%', temp: '24°C', co2: '800 ppm', ico: 'bg-green-100 text-green-500' },
            { name: 'Oyster Mushroom', id: '#OY-108', date: 'Iniciado: 15 Oct 2023', phase: 'Fase: Fructificación', hum: '92%', temp: '19°C', co2: '650 ppm', ico: 'bg-blue-100 text-blue-500' },
            { name: 'Lion\'s Mane', id: '#LM-005', date: 'Iniciado: 18 Oct 2023', phase: 'Fase: Colonización', hum: '88%', temp: '22°C', co2: '920 ppm', ico: 'bg-orange-100 text-orange-500' },
          ].map((lote, idx) => (
             <div key={idx} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${lote.ico}`}>
                    <Sprout size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{lote.name} <span className="text-gray-400 font-medium text-sm ml-1">{lote.id}</span></h3>
                    <p className="text-xs text-gray-500">{lote.date} • {lote.phase}</p>
                  </div>
                </div>

                <div className="flex space-x-12 items-center">
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">HUMEDAD</p>
                      <p className="font-bold text-gray-800 text-sm">{lote.hum}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">TEMPERATURA</p>
                      <p className="font-bold text-gray-800 text-sm">{lote.temp}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">CO2</p>
                      <p className="font-bold text-gray-800 text-sm">{lote.co2}</p>
                   </div>
                   <div className="text-gray-300">
                     <ChevronRight size={20} />
                   </div>
                </div>
             </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex justify-center">
          <Link href="/batches">
            <button className="bg-[#1cc03b] hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-md active:scale-95 text-sm">
               Ver todos los lotes activos →
            </button>
          </Link>
        </div>
      </div>

    </div>
  );
}
