"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Edit, Trash2, Plus, AlertCircle, AlignLeft } from "lucide-react";

interface Substrate {
  idSubstrate?: string;
  typeName: string;
  description: string;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/substrates`;

export default function SubstratesPage() {
  const [substratesList, setSubstratesList] = useState<Substrate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formErrors, setFormErrors] = useState<{ typeName?: string }>({});

  const [formData, setFormData] = useState<Substrate>({
    typeName: "",
    description: "",
  });

  const fetchSubstrates = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setSubstratesList(data);
      }
    } catch (error) {
      console.error("Falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    fetchSubstrates();
  }, [fetchSubstrates]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: { typeName?: string } = {};
    let isValid = true;

    if (!formData.typeName.trim()) {
      errors.typeName = "El nombre del sustrato es obligatorio.";
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
      const url = isEditing ? `${API_URL}/${editingId}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSubstrates(); 
        closeModal();
      }
    } catch (error) {
      console.error("Error guardando el sustrato:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar este sustrato?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) fetchSubstrates();
      } catch (error) {
        console.error("Error borrando el sustrato:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setFormData({ typeName: "", description: "" });
    setIsModalOpen(true);
  };

  const openModalToEdit = (substrate: Substrate) => {
    setEditingId(substrate.idSubstrate!);
    setFormErrors({});
    setFormData(substrate);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Sustratos</h1>
          <p className="text-slate-500 mt-1">Inventario y configuración de bases para cultivo</p>
        </div>
        <button
          onClick={openModalToCreate}
          className="bg-[#1e5631] hover:bg-[#153f23] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Nuevo Sustrato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {substratesList.length === 0 ? (
          <p className="text-slate-500 col-span-full">No hay sustratos registrados. ¡Cree el primero!</p>
        ) : (
          substratesList.map((substrate) => (
            <div key={substrate.idSubstrate} className="bg-white border border-slate-200 rounded-xl p-6 shadow-card hover:shadow-card-lg transition-shadow flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mr-3">
                    <Package size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">{substrate.typeName}</h3>
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openModalToEdit(substrate)} className="text-slate-400 hover:text-[#1e5631] transition-colors p-1" title="Editar">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(substrate.idSubstrate!)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg flex-grow border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                  <AlignLeft size={12} className="mr-1"/> Descripción
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {substrate.description || "Sin descripción proporcionada."}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center">
              <Package className="mr-2 text-amber-600" />
              {editingId ? "Editar Sustrato" : "Nuevo Sustrato"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Sustrato *</label>
                <input 
                  type="text" 
                  name="typeName" 
                  required 
                  value={formData.typeName} 
                  onChange={handleInputChange} 
                  className={`w-full border rounded-xl p-3 focus:outline-none transition-all font-medium text-slate-800 ${formErrors.typeName ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/10'}`}
                  placeholder="Ej. Paja de Trigo Pasteurizada" 
                />
                {formErrors.typeName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.typeName}</p>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center">
                   Detalles Adicionales
                </label>
                <textarea 
                  name="description" 
                  rows={4}
                  value={formData.description} 
                  onChange={handleInputChange} 
                  className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all text-slate-800 resize-none"
                  placeholder="Describa la composición, proceso de esterilización o características clave..."
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 font-bold bg-[#1e5631] text-white rounded-xl hover:bg-[#153f23] transition-all shadow-md active:scale-95">
                  {editingId ? "Guardar Cambios" : "Crear Sustrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}