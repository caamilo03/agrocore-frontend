import { Plus, Thermometer, Droplets, Wind, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function BatchesPage() {
  const batches = [
    {
      id: 1,
      name: 'Lote: Shiitake #082',
      idCode: 'ID: SH-2023-082',
      startDate: 'Inicio: 12/10/2023',
      phase: 'FASE: INCUBACIÓN',
      image: 'https://images.unsplash.com/photo-1595855768297-dc1fb50174aa?auto=format&fit=crop&q=80&w=800',
      supplier: 'BioFungi Labs',
      substrate: 'Roble + Salvado',
      telemetry: {
        temp: { current: '21.4°C', optimal: '18-24°C', iconColor: 'text-blue-400', bg: 'bg-blue-50' },
        hum: { current: '85%', optimal: '80-90%', iconColor: 'text-cyan-400', bg: 'bg-cyan-50' },
        co2: { current: '650 ppm', optimal: '<800', iconColor: 'text-orange-300', bg: 'bg-orange-50' }
      }
    },
    {
      id: 2,
      name: 'Lote: Ostra Blanca #045',
      idCode: 'ID: OB-2023-045',
      startDate: 'Inicio: 05/11/2023',
      phase: 'FASE: FRUCTIFICACIÓN',
      image: 'https://images.unsplash.com/photo-1610484738515-520e52ddb3e4?auto=format&fit=crop&q=80&w=800',
      supplier: 'AgroMyco Corp',
      substrate: 'Paja de Trigo',
      telemetry: {
        temp: { current: '19.8°C', optimal: '18-24°C', iconColor: 'text-blue-400', bg: 'bg-blue-50' },
        hum: { current: '88%', optimal: '85-95%', iconColor: 'text-cyan-400', bg: 'bg-cyan-50' },
        co2: { current: '720 ppm', optimal: '<800', iconColor: 'text-orange-300', bg: 'bg-orange-50' }
      }
    }
  ];

  return (
    <div className="p-8 text-gray-800 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Lotes Activos</h1>
          <p className="text-gray-500 font-medium">Supervisión y control de producción en tiempo real.</p>
        </div>
        <button className="bg-[#0F572B] hover:bg-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center text-sm active:scale-95">
          <Plus size={18} className="mr-2" />
          Crear Nuevo Lote
        </button>
      </header>

      {/* Grid de Lotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {batches.map((batch) => (
          <div key={batch.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
            
            {/* Header Image & Badge */}
            <div className="h-48 w-full relative">
              <img 
                src={batch.image} 
                alt={batch.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-4 right-4 bg-[#23de4b] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest shadow-sm uppercase z-10 flex items-center">
                {batch.phase}
              </div>
            </div>

            <div className="bg-white p-8">
              {/* Lote Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{batch.name}</h2>
                <p className="text-gray-400 text-sm font-medium">{batch.idCode} | {batch.startDate}</p>
              </div>

              {/* Detalles de Insumos */}
              <div className="flex bg-[#F8FAFC] rounded-xl p-5 mb-8 border border-gray-50">
                <div className="w-1/2">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Proveedor</p>
                  <p className="font-bold text-gray-800 text-sm">{batch.supplier}</p>
                </div>
                <div className="w-1/2">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Sustrato</p>
                  <p className="font-bold text-gray-800 text-sm">{batch.substrate}</p>
                </div>
              </div>

              {/* Telemetría */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">Telemetría en tiempo real</p>
                
                <div className="space-y-4">
                  {/* Item Temp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 w-1/3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${batch.telemetry.temp.bg}`}>
                        <Thermometer size={16} className={batch.telemetry.temp.iconColor} />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Temperatura</span>
                    </div>
                    <div className="flex items-center space-x-3 w-2/3 justify-end">
                      <span className="text-lg font-extrabold text-gray-900">{batch.telemetry.temp.current}</span>
                      <span className="text-[11px] text-gray-400 font-medium">| óptimo: {batch.telemetry.temp.optimal}</span>
                      <CheckCircle2 size={18} className="text-green-500" />
                    </div>
                  </div>

                  {/* Item Hum */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 w-1/3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${batch.telemetry.hum.bg}`}>
                        <Droplets size={16} className={batch.telemetry.hum.iconColor} />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">Humedad</span>
                    </div>
                    <div className="flex items-center space-x-3 w-2/3 justify-end">
                      <span className="text-lg font-extrabold text-gray-900">{batch.telemetry.hum.current}</span>
                      <span className="text-[11px] text-gray-400 font-medium">| óptimo: {batch.telemetry.hum.optimal}</span>
                      <CheckCircle2 size={18} className="text-green-500" />
                    </div>
                  </div>

                  {/* Item CO2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 w-1/3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${batch.telemetry.co2.bg}`}>
                        <Wind size={16} className={batch.telemetry.co2.iconColor} />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">CO2</span>
                    </div>
                    <div className="flex items-center space-x-3 w-2/3 justify-end">
                      <span className="text-lg font-extrabold text-gray-900">{batch.telemetry.co2.current}</span>
                      <span className="text-[11px] text-gray-400 font-medium">| óptimo: {batch.telemetry.co2.optimal}</span>
                      <CheckCircle2 size={18} className="text-green-500" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Botón Finalizar */}
              <button className="w-full mt-8 py-3 border-2 border-[#0F572B] text-[#0F572B] font-bold rounded-xl hover:bg-green-50 transition-colors text-sm">
                FINALIZAR LOTE
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
