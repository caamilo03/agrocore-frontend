"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Edit, Trash2, Plus, AlertCircle, Phone } from "lucide-react";

interface Supplier {
  idSupplier?: string;
  nameSupplier: string;
  contactInfo: string;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/suppliers`;

export default function SuppliersPage() {
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formErrors, setFormErrors] = useState<{ nameSupplier?: string }>({});

  const [formData, setFormData] = useState<Supplier>({
    nameSupplier: "",
    contactInfo: "",
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setSuppliersList(data);
      }
    } catch (error) {
      console.error("Falló la conexión con el backend:", error);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: { nameSupplier?: string } = {};
    let isValid = true;

    if (!formData.nameSupplier.trim()) {
      errors.nameSupplier = "El nombre del proveedor es obligatorio.";
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
        fetchSuppliers(); 
        closeModal();
      }
    } catch (error) {
      console.error("Error guardando el proveedor:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que quiere borrar este proveedor?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) fetchSuppliers();
      } catch (error) {
        console.error("Error borrando el proveedor:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setFormData({ nameSupplier: "", contactInfo: "" });
    setIsModalOpen(true);
  };

  const openModalToEdit = (supplier: Supplier) => {
    setEditingId(supplier.idSupplier!);
    setFormErrors({});
    setFormData(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Proveedores</h1>
          <p className="text-slate-500 mt-1">Directorio de distribuidores de insumos y especies</p>
        </div>
        <button
          onClick={openModalToCreate}
          className="bg-[#1e5631] hover:bg-[#153f23] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliersList.length === 0 ? (
          <p className="text-slate-500 col-span-full">No hay proveedores registrados. ¡Cree el primero!</p>
        ) : (
          suppliersList.map((supplier) => (
            <div key={supplier.idSupplier} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
                    <Building2 size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">{supplier.nameSupplier}</h3>
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openModalToEdit(supplier)} className="text-slate-400 hover:text-[#1e5631] transition-colors p-1" title="Editar">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(supplier.idSupplier!)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg flex-grow border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                  <Phone size={12} className="mr-1"/> Información de Contacto
                </p>
                <p className="text-sm font-medium text-slate-700 break-words">
                  {supplier.contactInfo || "Sin datos de contacto."}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center">
              <Building2 className="mr-2 text-indigo-600" />
              {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre o Razón Social *</label>
                <input 
                  type="text" 
                  name="nameSupplier" 
                  required 
                  value={formData.nameSupplier} 
                  onChange={handleInputChange} 
                  className={`w-full border rounded-xl p-3 focus:outline-none transition-all font-medium text-slate-800 ${formErrors.nameSupplier ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/10'}`}
                  placeholder="Ej. Insumos Agrícolas S.A." 
                />
                {formErrors.nameSupplier && (
                  <p className="text-red-500 text-sm mt-2 flex items-center font-medium"><AlertCircle size={14} className="mr-1"/> {formErrors.nameSupplier}</p>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center">
                   Contacto (Teléfono, Email, Dirección)
                </label>
                <textarea 
                  name="contactInfo" 
                  rows={3}
                  value={formData.contactInfo} 
                  onChange={handleInputChange} 
                  className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all text-slate-800 resize-none"
                  placeholder="Ej. contacto@empresa.com - 3001234567"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 font-bold bg-[#1e5631] text-white rounded-xl hover:bg-[#153f23] transition-all shadow-md active:scale-95">
                  {editingId ? "Guardar Cambios" : "Crear Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}