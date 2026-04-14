import { Sprout, Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SpeciesPage() {
  const species = [
    {
      id: 1,
      name: 'Shiitake',
      temp: '18°C - 24°C',
      hum: '75% - 85%',
      co2: '800 - 1200 ppm',
      color: 'bg-green-100 text-green-500'
    },
    {
      id: 2,
      name: 'Oyster Mushroom',
      temp: '20°C - 26°C',
      hum: '80% - 90%',
      co2: '600 - 1000 ppm',
      color: 'bg-blue-100 text-green-500'
    }
  ];

  return (
    <div className="p-8 text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Gestión de Especies</h1>
          <p className="text-gray-500 mt-1">Registro y configuración de parámetros óptimos por especie</p>
        </div>
        <button className="bg-[#0F572B] hover:bg-green-800 text-white font-bold py-2.5 px-5 rounded-lg transition-colors flex items-center shadow-md text-sm">
          <Plus size={18} className="mr-2" />
          Nueva Especie
        </button>
      </header>

      {/* Título Colección */}
      <div className="flex items-center mb-6">
        <Sprout className="text-green-500 mr-2" size={24} />
        <h2 className="text-lg font-bold text-gray-800">Catálogo de Especies</h2>
      </div>

      {/* Grid de Especies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Tarjetas de Especies Existentes */}
        {species.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative group hover:border-green-300 transition-colors">
            {/* Actions (Edit / Delete) */}
            <div className="absolute top-4 right-4 flex space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"><Pencil size={14} /></button>
              <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
            </div>

            {/* Content */}
            <div className="flex items-center mb-6 mt-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${s.color}`}>
                <Sprout size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">{s.name}</h3>
            </div>

            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm font-medium text-gray-500 flex items-center text-[13px]"><span className="mr-2 text-gray-400">🌡</span> Temperatura</span>
                <span className="font-bold text-sm text-gray-800">{s.temp}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm font-medium text-gray-500 flex items-center text-[13px]"><span className="mr-2 text-gray-400">💧</span> Humedad</span>
                <span className="font-bold text-sm text-gray-800">{s.hum}</span>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-gray-500 flex items-center text-[13px]"><span className="mr-2 text-gray-400">💨</span> CO2</span>
                <span className="font-bold text-sm text-gray-800">{s.co2}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 text-[10px] font-bold text-gray-400 tracking-wider">
              REGISTRADO: 24 OCT 2023 | 14:30
            </div>
          </div>
        ))}

        {/* Tarjeta de Añadir Nueva */}
        <button className="rounded-2xl p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors h-full min-h-[300px]">
          <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-4">
            <Plus size={24} />
          </div>
          <span className="font-medium text-sm">Añadir nueva especie al catálogo</span>
        </button>

      </div>
    </div>
  );
}
