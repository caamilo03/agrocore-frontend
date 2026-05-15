"use client";

import { useState, useEffect, useCallback } from "react";
import { Thermometer, Droplets, Wind, Edit, Trash2, Plus, AlertCircle } from "lucide-react";

interface Species {
  idSpecies?: string;
  name: string;
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
  minCo2: number;
  maxCo2: number;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/species`;

export default function SpeciesPage() {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado para manejar los errores de validación
  const [formErrors, setFormErrors] = useState<{ temp?: string; hum?: string; co2?: string }>({});

  const [formData, setFormData] = useState<Species>({
    name: "",
    minTemperature: 0,
    maxTemperature: 0,
    minHumidity: 0,
    maxHumidity: 0,
    minCo2: 0,
    maxCo2: 0,
  });

  const fetchSpecies = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setSpeciesList(data);
      }
    } catch (error) {
      console.error("Falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    fetchSpecies();
  }, [fetchSpecies]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseFloat(value) || 0,
    }));
    // Limpiar errores al escribir
    setFormErrors({});
  };

  // Función de validación
  const validateForm = () => {
    const errors: { temp?: string; hum?: string; co2?: string } = {};
    let isValid = true;

    if (formData.minTemperature > formData.maxTemperature) {
      errors.temp = "La temperatura mínima no puede ser mayor a la máxima.";
      isValid = false;
    }
    
    if (formData.minHumidity < 0 || formData.maxHumidity > 100) {
      errors.hum = "La humedad debe estar en un rango de 0% a 100%.";
      isValid = false;
    } else if (formData.minHumidity > formData.maxHumidity) {
      errors.hum = "La humedad mínima no puede ser mayor a la máxima.";
      isValid = false;
    }

    if (formData.minCo2 > formData.maxCo2) {
      errors.co2 = "El nivel mínimo de CO2 no puede ser mayor al máximo.";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ejecutar validación antes de continuar
    if (!validateForm()) return;

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_URL}/${editingId}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSpecies(); 
        closeModal();
      }
    } catch (error) {
      console.error("Error guardando la especie:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar esta especie?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) fetchSpecies();
      } catch (error) {
        console.error("Error borrando la especie:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setFormData({ name: "", minTemperature: 0, maxTemperature: 0, minHumidity: 0, maxHumidity: 0, minCo2: 0, maxCo2: 0 });
    setIsModalOpen(true);
  };

  const openModalToEdit = (species: Species) => {
    setEditingId(species.idSpecies!);
    setFormErrors({});
    setFormData(species);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Especies</h1>
          <p className="text-slate-500 mt-1">Registro y configuración de parámetros óptimos por especie</p>
        </div>
        <button
          onClick={openModalToCreate}
          className="bg-[#1e5631] hover:bg-[#153f23] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Nueva Especie
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {speciesList.length === 0 ? (
          <p className="text-slate-500">No hay especies registradas. ¡Cree la primera!</p>
        ) : (
          speciesList.map((species) => (
            <div key={species.idSpecies} className="bg-white border border-slate-200 rounded-xl p-6 shadow-card hover:shadow-card-lg transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-slate-800">{species.name}</h3>
                <div className="flex gap-3">
                  <button onClick={() => openModalToEdit(species)} className="text-slate-400 hover:text-[#1e5631] transition-colors" title="Editar">
                    <Edit size={20} />
                  </button>
                  <button onClick={() => handleDelete(species.idSpecies!)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center text-slate-600">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mr-4">
                    <Thermometer size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Temperatura</p>
                    <p className="text-sm font-bold text-slate-800">{species.minTemperature}°C - {species.maxTemperature}°C</p>
                  </div>
                </div>
                
                <div className="flex items-center text-slate-600">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4">
                    <Droplets size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Humedad</p>
                    <p className="text-sm font-bold text-slate-800">{species.minHumidity}% - {species.maxHumidity}%</p>
                  </div>
                </div>
                
                <div className="flex items-center text-slate-600">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mr-4">
                    <Wind size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">CO2</p>
                    <p className="text-sm font-bold text-slate-800">{species.minCo2} - {species.maxCo2} ppm</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl transform transition-all">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6">
              {editingId ? "Editar Especie" : "Nueva Especie"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Input Principal */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Especie</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className="w-full border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 text-slate-800 transition-all font-medium" 
                  placeholder="Ej. Orellana" 
                />
              </div>

              {/* Bloque Temperatura */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center mb-4">
                  <Thermometer size={18} className="text-orange-500 mr-2" />
                  <h4 className="font-bold text-slate-700">Rango de Temperatura (°C)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mínima</label>
                    <input type="number" step="0.1" name="minTemperature" required value={formData.minTemperature} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.temp ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Máxima</label>
                    <input type="number" step="0.1" name="maxTemperature" required value={formData.maxTemperature} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.temp ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                </div>
                {formErrors.temp && (
                  <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.temp}</p>
                )}
              </div>

              {/* Bloque Humedad */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center mb-4">
                  <Droplets size={18} className="text-blue-500 mr-2" />
                  <h4 className="font-bold text-slate-700">Rango de Humedad (%)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mínima</label>
                    <input type="number" step="0.1" name="minHumidity" required value={formData.minHumidity} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.hum ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Máxima</label>
                    <input type="number" step="0.1" name="maxHumidity" required value={formData.maxHumidity} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.hum ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                </div>
                {formErrors.hum && (
                  <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.hum}</p>
                )}
              </div>

              {/* Bloque CO2 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center mb-4">
                  <Wind size={18} className="text-slate-500 mr-2" />
                  <h4 className="font-bold text-slate-700">Rango de CO2 (ppm)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mínimo</label>
                    <input type="number" step="0.1" name="minCo2" required value={formData.minCo2} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.co2 ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Máximo</label>
                    <input type="number" step="0.1" name="maxCo2" required value={formData.maxCo2} onChange={handleInputChange} className={`w-full border rounded-lg p-2.5 focus:outline-none transition-all text-slate-800 ${formErrors.co2 ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'}`} />
                  </div>
                </div>
                {formErrors.co2 && (
                  <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.co2}</p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 font-bold bg-[#1e5631] text-white rounded-xl hover:bg-[#153f23] transition-all shadow-md active:scale-95">
                  {editingId ? "Guardar Cambios" : "Crear Especie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}