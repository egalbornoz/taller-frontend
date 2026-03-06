import { useEffect, useState, useCallback } from 'react';
import clienteAxios from '../api/axios';
import Swal from 'sweetalert2';
import {
    DollarSign, Plus, Pencil, Trash2, X, Car, Cpu, Tag
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-600"></div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando tarifas...</p>
//     </div>
// );

const Tarifas = () => {
    const [tarifas, setTarifas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tarifaEditar, setTarifaEditar] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [formData, setFormData] = useState({
        tipo_entidad: 'VEHICULO',
        categoria: '',
        costo: ''
    });

    const obtenerTarifas = useCallback(async () => {
        try {
            const { data } = await clienteAxios.get('/tariffs');
            setTarifas(data.data || []);
        } catch (error) {
            console.error("Error cargando tarifas", error);
            Swal.fire('Error', 'No se pudieron cargar las tarifas.', 'error');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        obtenerTarifas();
    }, [obtenerTarifas]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const abrirModal = (tarifa = null) => {
        setTarifaEditar(tarifa);
        if (tarifa) {
            setFormData({
                tipo_entidad: tarifa.tipo_entidad,
                categoria: tarifa.categoria,
                costo: tarifa.costo
            });
        } else {
            setFormData({ tipo_entidad: 'VEHICULO', categoria: '', costo: '' });
        }
        setIsModalOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setTarifaEditar(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.categoria || formData.costo === '') {
            return Swal.fire('Atención', 'Todos los campos son obligatorios.', 'warning');
        }

        setGuardando(true);
        try {
            const payload = {
                tipo_entidad: formData.tipo_entidad,
                categoria: formData.categoria.toUpperCase(),
                costo: Number(formData.costo)
            };

            if (tarifaEditar) {
                await clienteAxios.put(`/tariffs/${tarifaEditar.id}`, payload);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa actualizada', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/tariffs/create', payload);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa creada', timer: 1500, showConfirmButton: false });
            }
            
            cerrarModal();
            obtenerTarifas();
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la tarifa', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarTarifa = async (id, categoria) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar tarifa?',
            text: `Se borrará la tarifa para: ${categoria}. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                await clienteAxios.delete(`/tariffs/${id}`);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa eliminada', timer: 1500, showConfirmButton: false });
                obtenerTarifas();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la tarifa.', 'error');
            }
        }
    };

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" size={28} /> Tarifador Dinámico
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Configura los costos base de revisión según el tipo de equipo.</p>
                </div>
                <button onClick={() => abrirModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 font-bold shrink-0">
                    <Plus size={20} /> Nueva Tarifa
                </button>
            </div>

            {/* TABLA */}
            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-1/4">Tipo de Entidad</th>
                                <th className="px-6 py-4 w-2/4">Clasificación / Categoría</th>
                                <th className="px-6 py-4 w-1/4">Costo de Revisión</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tarifas.length > 0 ? (
                                tarifas.map((tarifa) => (
                                    <tr key={tarifa.id} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            {tarifa.tipo_entidad === 'VEHICULO' ? (
                                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1.5 w-fit">
                                                    <Car size={14}/> VEHÍCULO
                                                </span>
                                            ) : (
                                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1.5 w-fit">
                                                    <Cpu size={14}/> MÓDULO ECU
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-700 flex items-center gap-2">
                                            <Tag size={14} className="text-gray-400" /> {tarifa.categoria}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-black text-emerald-700 text-lg">
                                            $ {Number(tarifa.costo).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => abrirModal(tarifa)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => eliminarTarifa(tarifa.id, tarifa.categoria)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Eliminar">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (!cargando && <tr><td colSpan="4" className="px-6 py-20 text-center text-gray-400">No hay tarifas configuradas.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {/* --- MODAL CREAR/EDITAR --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative border-t-4 border-emerald-500">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <DollarSign size={20} className="text-emerald-600" />
                                {tarifaEditar ? 'Editar Tarifa' : 'Nueva Tarifa'}
                            </h3>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Aplica Para *</label>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button type="button" onClick={() => setFormData({ ...formData, tipo_entidad: 'VEHICULO' })} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2 ${formData.tipo_entidad === 'VEHICULO' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Car size={16}/> Vehículo</button>
                                    <button type="button" onClick={() => setFormData({ ...formData, tipo_entidad: 'MODULO' })} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2 ${formData.tipo_entidad === 'MODULO' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}><Cpu size={16}/> Módulo</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría / Clasificación *</label>
                                <input type="text" name="categoria" value={formData.categoria} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-bold text-gray-700" placeholder="Ej: DIESEL MAQUINARIA PESADA" required />
                                <p className="text-[10px] text-gray-400 mt-1">Este nombre aparecerá en las opciones al crear una orden.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Base de Revisión *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 font-black">$</span>
                                    <input type="number" step="0.01" min="0" name="costo" value={formData.costo} onChange={handleChange} className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-700 text-lg" placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={cerrarModal} className="w-full text-gray-600 bg-gray-100 hover:bg-gray-200 p-2.5 rounded-lg font-bold transition-colors">Cancelar</button>
                                <button type="submit" disabled={guardando} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-lg shadow-md transition-colors disabled:opacity-50">
                                    {guardando ? 'Guardando...' : 'Guardar Tarifa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tarifas;