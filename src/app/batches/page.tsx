"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Thermometer, Droplets, Wind, CheckCircle2, Edit, Trash2 } from 'lucide-react';

// 1. Interfaz que hace match con el Backend
interface CropBatch {
  id?: string;
  idSpecies: string | null;
  idSubstrate: string | null;
  idSpeciesSupplier: string | null;
  idSubstrateSupplier: string | null;
  idUser: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  yieldKg: number;
}

const API_URL = "http://localhost:8080/api/v1/batches";

export default function BatchesPage() {
  const [batchesList, setBatchesList] = useState<CropBatch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CropBatch>({
    idSpecies: "",
    idSubstrate: "",
    idSpeciesSupplier: "",
    idSubstrateSupplier: "",
    idUser: "",
    startDate: "",
    endDate: "",
    status: "ACTIVO",
    yieldKg: 0,
  });

  // 2. Traer los Lotes desde el backend
  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setBatchesList(data);
      }
    } catch (error) {
      console.error("Falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // 3. Manejadores del Formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "yieldKg" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Limpiamos los UUID vacíos para que no estalle el backend
      const payload: any = { ...formData };
      if (!payload.idSpecies) payload.idSpecies = null;
      if (!payload.idSubstrate) payload.idSubstrate = null;
      if (!payload.idSpeciesSupplier) payload.idSpeciesSupplier = null;
      if (!payload.idSubstrateSupplier) payload.idSubstrateSupplier = null;
      if (!payload.idUser) payload.idUser = null;
      if (!payload.endDate) payload.endDate = null;

      const isEditing = editingId !== null;
      const url = isEditing ? `${API_URL}/${editingId}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchBatches();
        closeModal();
      } else {
        alert("Fallo al guardar. ¿Verificó que los UUID existan en la BD?");
      }
    } catch (error) {
      console.error("Error guardando el lote:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar este lote?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        if (response.ok) fetchBatches();
      } catch (error) {
        console.error("Error borrando el lote:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormData({
      idSpecies: "", idSubstrate: "", idSpeciesSupplier: "", idSubstrateSupplier: "", idUser: "",
      startDate: "", endDate: "", status: "ACTIVO", yieldKg: 0
    });
    setIsModalOpen(true);
  };

  const openModalToEdit = (batch: CropBatch) => {
    setEditingId(batch.id!);
    setFormData({
      ...batch,
      startDate: batch.startDate ? batch.startDate.substring(0, 16) : "",
      endDate: batch.endDate ? batch.endDate.substring(0, 16) : ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-8 text-gray-800 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Lotes Activos</h1>
          <p className="text-gray-500 font-medium">Supervisión y control de producción en tiempo real.</p>
        </div>
        <button 
          onClick={openModalToCreate}
          className="bg-[#0F572B] hover:bg-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center text-sm active:scale-95"
        >
          <Plus size={18} className="mr-2" />
          Crear Nuevo Lote
        </button>
      </header>

      {/* Grid de Lotes desde la BD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {batchesList.length === 0 ? (
          <p className="text-gray-500 font-medium">No hay lotes registrados en la base de datos.</p>
        ) : (
          batchesList.map((batch) => (
            <div key={batch.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
              
              {/* Header Image & Badge */}
              <div className="h-48 w-full relative">
                <img 
                  src="https://images.unsplash.com/photo-1595855768297-dc1fb50174aa?auto=format&fit=crop&q=80&w=800" 
                  alt="Cultivo"
                  className="w-full h-full object-cover object-center"
                />
                <div className={`absolute top-4 right-4 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest shadow-sm uppercase z-10 flex items-center ${batch.status === 'ACTIVO' ? 'bg-[#23de4b]' : 'bg-orange-500'}`}>
                  {batch.status}
                </div>
              </div>

              <div className="bg-white p-8 relative">
                
                {/* Botones de Acción (Editar/Eliminar) */}
                <div className="absolute top-6 right-6 flex gap-3">
                  <button onClick={() => openModalToEdit(batch)} className="text-gray-400 hover:text-[#0F572B] transition-colors" title="Editar Lote">
                    <Edit size={20} />
                  </button>
                  <button onClick={() => handleDelete(batch.id!)} className="text-gray-400 hover:text-red-500 transition-colors" title="Eliminar Lote">
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Lote Info */}
                <div className="mb-6 pr-16">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Lote: {batch.id?.substring(0, 8)}</h2>
                  <p className="text-gray-400 text-sm font-medium">Inicio: {new Date(batch.startDate).toLocaleDateString()} | Rendimiento: {batch.yieldKg} kg</p>
                </div>

                {/* Detalles de Insumos (Usando los UUID por ahora) */}
                <div className="flex bg-[#F8FAFC] rounded-xl p-5 mb-8 border border-gray-50">
                  <div className="w-1/2 overflow-hidden pr-2">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">ID Especie</p>
                    <p className="font-bold text-gray-800 text-xs truncate" title={batch.idSpecies || "N/A"}>{batch.idSpecies || "No asignada"}</p>
                  </div>
                  <div className="w-1/2 overflow-hidden">
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">ID Sustrato</p>
                    <p className="font-bold text-gray-800 text-xs truncate" title={batch.idSubstrate || "N/A"}>{batch.idSubstrate || "No asignado"}</p>
                  </div>
                </div>

                {/* Telemetría Estática (Placeholder mientras se conecta el módulo IoT real) */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">Telemetría en tiempo real (Simulada)</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 w-1/3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                          <Thermometer size={16} className="text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-600">Temperatura</span>
                      </div>
                      <div className="flex items-center space-x-3 w-2/3 justify-end">
                        <span className="text-lg font-extrabold text-gray-900">21.4°C</span>
                        <CheckCircle2 size={18} className="text-green-500" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 w-1/3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-50">
                          <Droplets size={16} className="text-cyan-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-600">Humedad</span>
                      </div>
                      <div className="flex items-center space-x-3 w-2/3 justify-end">
                        <span className="text-lg font-extrabold text-gray-900">85%</span>
                        <CheckCircle2 size={18} className="text-green-500" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Formulario con diseño limpio */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
              {editingId ? "Editar Lote" : "Crear Nuevo Lote"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fecha de Inicio</label>
                  <input type="datetime-local" name="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-[#0F572B] focus:ring-0 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fecha de Fin</label>
                  <input type="datetime-local" name="endDate" value={formData.endDate || ""} onChange={handleInputChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-[#0F572B] focus:ring-0 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estado</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-[#0F572B] focus:ring-0 transition-colors font-semibold">
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="COSECHADO">COSECHADO</option>
                    <option value="PERDIDO">PERDIDO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Rendimiento (kg)</label>
                  <input type="number" step="0.01" name="yieldKg" value={formData.yieldKg} onChange={handleInputChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-[#0F572B] focus:ring-0 transition-colors" />
                </div>
              </div>

              <div className="mt-6 p-5 bg-[#F8FAFC] rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">IDs de Relación (UUIDs de BD)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Especie</label>
                    <input type="text" name="idSpecies" value={formData.idSpecies || ""} onChange={handleInputChange} placeholder="Opcional..." className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Sustrato</label>
                    <input type="text" name="idSubstrate" value={formData.idSubstrate || ""} onChange={handleInputChange} placeholder="Opcional..." className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-800" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-6 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-[#0F572B] text-white font-bold rounded-xl hover:bg-green-800 transition-all shadow-md active:scale-95">
                  {editingId ? "Guardar Cambios" : "Crear Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}