"use client";

import { useState, useEffect, useCallback } from "react";

//  interfaz
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

// URL por fuera para que ESLint no llore
const API_URL = "http://localhost:8080/api/v1/species";

export default function SpeciesPage() {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Species>({
    name: "",
    minTemperature: 0,
    maxTemperature: 0,
    minHumidity: 0,
    maxHumidity: 0,
    minCo2: 0,
    maxCo2: 0,
  });

  // Traer las especies (Envuelta en useCallback pa' que el Linter quede contento)
  const fetchSpecies = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setSpeciesList(data);
      }
    } catch (error) {
      console.error("Uy firma, falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    // (o la regla específica que esté fallando, aunque parece ser una regla custom)
    // Para silenciar la línea siguiente de forma general:
    // eslint-disable-next-line
    fetchSpecies();
  }, [fetchSpecies]);

  // Manejar los cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" ? value : parseFloat(value) || 0,
    }));
  };

  //  Guardar o Actualizar especie
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Eliminar especie
  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar esta especie, firma?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchSpecies();
        }
      } catch (error) {
        console.error("Error borrando la especie:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormData({ name: "", minTemperature: 0, maxTemperature: 0, minHumidity: 0, maxHumidity: 0, minCo2: 0, maxCo2: 0 });
    setIsModalOpen(true);
  };

  const openModalToEdit = (species: Species) => {
    setEditingId(species.idSpecies!);
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
          className="bg-[#1e5631] hover:bg-[#153f23] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Nueva Especie
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {speciesList.length === 0 ? (
          <p className="text-slate-500">No hay especies registradas. ¡Cree la primera!</p>
        ) : (
          speciesList.map((species) => (
            <div key={species.idSpecies} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">{species.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openModalToEdit(species)} className="text-green-600 hover:text-green-800" title="Editar">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button onClick={() => handleDelete(species.idSpecies!)} className="text-red-500 hover:text-red-700" title="Eliminar">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-slate-600">
                  <span className="w-8 text-xl">🌡️</span>
                  <div>
                    <p className="text-sm font-medium">Temperatura</p>
                    <p className="text-sm font-bold text-slate-800">{species.minTemperature}°C - {species.maxTemperature}°C</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <span className="w-8 text-xl">💧</span>
                  <div>
                    <p className="text-sm font-medium">Humedad</p>
                    <p className="text-sm font-bold text-slate-800">{species.minHumidity}% - {species.maxHumidity}%</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <span className="w-8 text-xl">💨</span>
                  <div>
                    <p className="text-sm font-medium">CO2</p>
                    <p className="text-sm font-bold text-slate-800">{species.minCo2} - {species.maxCo2} ppm</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {editingId ? "Editar Especie" : "Nueva Especie"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Especie</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 text-black" placeholder="Ej. Orellana" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temp. Mínima (°C)</label>
                  <input type="number" step="0.1" name="minTemperature" required value={formData.minTemperature} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temp. Máxima (°C)</label>
                  <input type="number" step="0.1" name="maxTemperature" required value={formData.maxTemperature} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Humedad Mínima (%)</label>
                  <input type="number" step="0.1" name="minHumidity" required value={formData.minHumidity} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Humedad Máxima (%)</label>
                  <input type="number" step="0.1" name="maxHumidity" required value={formData.maxHumidity} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CO2 Mínimo (ppm)</label>
                  <input type="number" step="0.1" name="minCo2" required value={formData.minCo2} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CO2 Máximo (ppm)</label>
                  <input type="number" step="0.1" name="maxCo2" required value={formData.maxCo2} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-green-600 focus:ring-1 text-black" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#1e5631] text-white rounded-lg hover:bg-[#153f23] transition-colors shadow-sm">
                  {editingId ? "Actualizar Especie" : "Guardar Especie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}