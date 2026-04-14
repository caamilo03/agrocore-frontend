"use client";

import { Thermometer, Droplets, Wind, Download, Filter, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const tempData = [
    { name: 'Lun', temp: 23 },
    { name: 'Mar', temp: 24.2 },
    { name: 'Mie', temp: 25.5 },
    { name: 'Jue', temp: 24.8 },
    { name: 'Vie', temp: 23.5 },
    { name: 'Sab', temp: 26.5 },
    { name: 'Dom', temp: 24.5 },
  ];

  const humData = [
    { name: 'Lun', hum: 68 },
    { name: 'Mar', hum: 66 },
    { name: 'Mie', hum: 64 },
    { name: 'Jue', hum: 67 },
    { name: 'Vie', hum: 71 },
    { name: 'Sab', hum: 65 },
    { name: 'Dom', hum: 69 },
  ];

  return (
    <div className="p-8 text-gray-800 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Analítica Histórica</h1>
        <p className="text-gray-500 font-medium">Monitoreo profundo de variables climáticas y de suelo</p>
      </header>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-1 flex-wrap gap-8 w-full">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-gray-500 mb-2 tracking-widest uppercase">Seleccionar Lote</label>
            <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 outline-none focus:border-green-500 hover:border-gray-300 transition-colors cursor-pointer bg-white">
              <option>Lote Norte - Maíz</option>
              <option>Lote Sur - Shiitake</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-gray-500 mb-2 tracking-widest uppercase">Rango de Fechas</label>
            <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 outline-none focus:border-green-500 hover:border-gray-300 transition-colors cursor-pointer bg-white">
              <option>Últimos 7 días</option>
              <option>Último mes</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-gray-500 mb-2 tracking-widest uppercase">Tipo de Sensor</label>
            <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 outline-none focus:border-green-500 hover:border-gray-300 transition-colors cursor-pointer bg-white">
              <option>Todos los sensores</option>
              <option>Temperatura</option>
            </select>
          </div>
        </div>
        <button className="bg-[#0F572B] hover:bg-green-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center md:self-end active:scale-95 text-sm whitespace-nowrap">
          <Filter size={16} className="mr-2" />
          Aplicar Filtros
        </button>
      </div>

      {/* Main Grid area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Temperature Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-gray-800 font-bold">Tendencia de Temperatura</h3>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-extrabold text-gray-900 mr-2">24.5°C</span>
                  <span className="text-gray-400 text-xs font-semibold">promedio</span>
                </div>
              </div>
              <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-md">
                +2.4% vs mes ant.
              </div>
            </div>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Line type="monotone" dataKey="temp" stroke="#22c55e" strokeWidth={4} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-gray-800 font-bold">Tendencia de Humedad</h3>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-extrabold text-gray-900 mr-2">68%</span>
                  <span className="text-gray-400 text-xs font-semibold">promedio</span>
                </div>
              </div>
              <div className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-md">
                -1.2% vs mes ant.
              </div>
            </div>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={humData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <Line type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          {/* Averages List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-gray-800 font-bold mb-6 text-lg">Promedios del Periodo</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-gray-500 font-medium">
                  <Thermometer size={16} className="text-orange-500 mr-3" />
                  Temperatura
                </div>
                <span className="font-extrabold text-gray-900">24.2°C</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-gray-500 font-medium">
                  <Droplets size={16} className="text-blue-500 mr-3" />
                  Humedad
                </div>
                <span className="font-extrabold text-gray-900">65.4%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-gray-500 font-medium">
                  <Wind size={16} className="text-green-500 mr-3" />
                  CO2
                </div>
                <span className="font-extrabold text-gray-900">412 ppm</span>
              </div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-gray-800 font-bold mb-4 text-lg">Reporte Detallado</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Se detectó un pico de humedad el día Jueves a las 04:00 AM, coincidiendo con el ciclo de riego automático programado.
            </p>
            <button className="w-full py-2 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center">
              <Download size={16} className="mr-2" />
              Descargar PDF
            </button>
          </div>

          {/* Map Placeholder */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-40 bg-green-50 relative">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
                alt="map" 
                className="w-full h-full object-cover opacity-40 grayscale"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white px-4 py-2 rounded-full font-extrabold text-xs shadow-md text-gray-800 flex items-center tracking-widest">
                  <MapPin size={12} className="mr-1 text-green-600" /> LOTE NORTE
                </div>
              </div>
            </div>
            <div className="px-6 py-4 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              Última actualización: hace 5 min
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
