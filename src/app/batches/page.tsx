"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Calendar, Sprout, Layers, Package, Activity, Leaf } from 'lucide-react';

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

interface Species {
  idSpecies: string;
  name: string;
}

const BATCHES_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/batches`;
const SPECIES_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/species`;

// MOCK: Sustratos con UUIDs reales para la BD
const MOCK_SUBSTRATES = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Paja de Trigo Pasteurizada" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Aserrín de Roble" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Fibra de Coco y Cascarilla" }
];

export default function BatchesPage() {
  const [batchesList, setBatchesList] = useState<CropBatch[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ dates?: string; species?: string; substrate?: string }>({});

  const [formData, setFormData] = useState<CropBatch>({
    idSpecies: "", idSubstrate: "", idSpeciesSupplier: "", idSubstrateSupplier: "",
    idUser: "", startDate: "", endDate: "", status: "ACTIVO", yieldKg: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [batchesRes, speciesRes] = await Promise.all([
        fetch(BATCHES_API_URL),
        fetch(SPECIES_API_URL)
      ]);

      if (batchesRes.ok) setBatchesList(await batchesRes.json());
      if (speciesRes.ok) setSpeciesList(await speciesRes.json());
      
    } catch (error) {
      console.error("Falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Funciones auxiliares para mostrar nombres en lugar de UUIDs
  const getSpeciesName = (id: string | null) => {
    if (!id) return "Sin asignar";
    const species = speciesList.find(s => s.idSpecies === id);
    return species ? species.name : "Especie desconocida";
  };

  const getSubstrateName = (id: string | null) => {
    if (!id) return "Sin asignar";
    const substrate = MOCK_SUBSTRATES.find(s => s.id === id);
    return substrate ? substrate.name : "Sustrato desconocido";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "yieldKg" ? parseFloat(value) || 0 : value,
    }));
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: { dates?: string; species?: string; substrate?: string } = {};
    let isValid = true;

    if (formData.endDate && formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        errors.dates = "La fecha de fin no puede ser anterior a la de inicio.";
        isValid = false;
      }
    }

    if (!formData.idSpecies || formData.idSpecies === "") {
      errors.species = "Debe seleccionar una especie obligatoriamente.";
      isValid = false;
    }

    if (!formData.idSubstrate || formData.idSubstrate === "") {
      errors.substrate = "Debe seleccionar un sustrato obligatoriamente.";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${BATCHES_API_URL}/${editingId}` : BATCHES_API_URL;
      const method = isEditing ? "PUT" : "POST";

      const payload = { ...formData };
      if (!isEditing) {
        payload.status = "ACTIVO";
        payload.yieldKg = 0;
      }
      
      if (!payload.endDate) payload.endDate = null;
      if (!payload.idSpeciesSupplier) payload.idSpeciesSupplier = null;
      if (!payload.idSubstrateSupplier) payload.idSubstrateSupplier = null;
      if (!payload.idUser) payload.idUser = null;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchData();
        closeModal();
      } else {
        alert("Fallo al guardar. Verifique los datos enviados.");
      }
    } catch (error) {
      console.error("Error guardando el lote:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar este lote de producción?")) {
      try {
        const response = await fetch(`${BATCHES_API_URL}/${id}`, { method: "DELETE" });
        if (response.ok) fetchData();
      } catch (error) {
        console.error("Error borrando el lote:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormErrors({});
    const now = new Date().toISOString().substring(0, 16); 
    setFormData({
      idSpecies: "", idSubstrate: "", idSpeciesSupplier: "", idSubstrateSupplier: "", idUser: "",
      startDate: now, endDate: "", status: "ACTIVO", yieldKg: 0
    });
    setIsModalOpen(true);
  };

  const openModalToEdit = (batch: CropBatch) => {
    setEditingId(batch.id!);
    setFormErrors({});
    setFormData({
      ...batch,
      startDate: batch.startDate ? batch.startDate.substring(0, 16) : "",
      endDate: batch.endDate ? batch.endDate.substring(0, 16) : ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-8 text-slate-800 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Lotes de Producción</h1>
          <p className="text-slate-500 font-medium">Supervisión y control del ciclo de cultivo en tiempo real.</p>
        </div>
        <button 
          onClick={openModalToCreate}
          className="bg-[#1e5631] hover:bg-[#153f23] text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center text-sm"
        >
          <Plus size={18} className="mr-2" />
          Nuevo Lote
        </button>
      </header>

      {/* Grid de Lotes Rediseñado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batchesList.length === 0 ? (
          <p className="text-slate-500 col-span-full">No hay lotes de producción registrados.</p>
        ) : (
          batchesList.map((batch) => (
            <div key={batch.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
              
              {/* Header de la tarjeta */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <div className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase mb-2 ${batch.status === 'ACTIVO' ? 'bg-green-100 text-green-700' : batch.status === 'COSECHADO' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    <Activity size={12} className="mr-1.5" />
                    {batch.status}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 truncate" title={batch.id}>
                    Lote {batch.id?.substring(0, 6).toUpperCase()}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModalToEdit(batch)} className="text-slate-400 hover:text-[#1e5631] transition-colors p-1" title="Editar Lote"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(batch.id!)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Eliminar Lote"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* Cuerpo de la tarjeta */}
              <div className="p-5 space-y-4 flex-grow">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <Leaf size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Especie</p>
                    <p className="text-sm font-semibold text-slate-800">{getSpeciesName(batch.idSpecies)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <Package size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sustrato Base</p>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1" title={getSubstrateName(batch.idSubstrate)}>{getSubstrateName(batch.idSubstrate)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <Calendar size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inicio de Ciclo</p>
                    <p className="text-sm font-semibold text-slate-800">{new Date(batch.startDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Footer de Rendimiento (Si está cosechado) */}
              {batch.status === 'COSECHADO' && (
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Rendimiento Final</span>
                  <span className="text-sm font-extrabold text-blue-700">{batch.yieldKg} kg</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL REDISEÑADO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6">
              {editingId ? "Editar Lote de Producción" : "Crear Nuevo Lote"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Bloque: Tiempos del Lote */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center mb-4">
                  <Calendar size={18} className="text-blue-500 mr-2" />
                  <h4 className="font-bold text-slate-700">Tiempos de Producción</h4>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha de Inicio *</label>
                    <input type="datetime-local" name="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha de Fin</label>
                    <input type="datetime-local" name="endDate" value={formData.endDate || ""} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 text-slate-800 focus:outline-none transition-all ${formErrors.dates ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                </div>
                {formErrors.dates && (
                   <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.dates}</p>
                )}
              </div>

              {/* Bloque: Configuración Biológica */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center mb-4">
                  <Sprout size={18} className="text-green-600 mr-2" />
                  <h4 className="font-bold text-slate-700">Configuración Biológica</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Especie a Cultivar *</label>
                    <select name="idSpecies" value={formData.idSpecies || ""} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 text-slate-800 focus:outline-none bg-white transition-all ${formErrors.species ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`}>
                      <option value="" disabled>Seleccione una especie...</option>
                      {speciesList.map(sp => (
                        <option key={sp.idSpecies} value={sp.idSpecies}>{sp.name}</option>
                      ))}
                    </select>
                    {formErrors.species && <p className="text-red-500 text-xs mt-1 font-medium flex items-center"><AlertCircle size={12} className="mr-1"/>{formErrors.species}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sustrato Base *</label>
                    <select name="idSubstrate" value={formData.idSubstrate || ""} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 text-slate-800 focus:outline-none bg-white transition-all ${formErrors.substrate ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`}>
                      <option value="" disabled>Seleccione un sustrato...</option>
                      {MOCK_SUBSTRATES.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                    {formErrors.substrate && <p className="text-red-500 text-xs mt-1 font-medium flex items-center"><AlertCircle size={12} className="mr-1"/>{formErrors.substrate}</p>}
                  </div>
                </div>
              </div>

              {/* Bloque Condicional: Cierre y Producción */}
              {editingId !== null && (
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-4">
                    <Layers size={18} className="text-blue-600 mr-2" />
                    <h4 className="font-bold text-blue-900">Cierre y Producción</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Estado del Lote</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-blue-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold transition-all">
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="COSECHADO">COSECHADO</option>
                        <option value="PERDIDO">PERDIDO</option>
                      </select>
                    </div>
                    
                    {formData.status === "COSECHADO" && (
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Rendimiento Final (kg)</label>
                        <input type="number" step="0.01" name="yieldKg" value={formData.yieldKg} onChange={handleInputChange} className="w-full border border-blue-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 font-bold bg-[#1e5631] text-white rounded-lg hover:bg-[#153f23] transition-all shadow-sm active:scale-95">
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