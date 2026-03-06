import React, { useEffect, useState, useCallback } from 'react';
import clienteAxios from '../api/axios';
import Swal from 'sweetalert2';
import { 
    Users, Search, UserPlus, Eye, Pencil, MapPin, Mail, Phone, 
    Car, Cpu, ClipboardList, DollarSign, Activity, Calendar, X 
} from 'lucide-react';
import Spinner from '../componets/Spinner';

// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando directorio...</p>
//     </div>
// );

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Estados para el CRUD de clientes
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteEditar, setClienteEditar] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', direccion: '' });

    // Estados para la Vista 360° (Perfil)
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [cargandoPerfil, setCargandoPerfil] = useState(false);
    const [perfilData, setPerfilData] = useState(null);

    const obtenerClientes = useCallback(async () => {
        try {
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/clients/true?_t=${stamp}`);
            setClientes(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
        } catch (error) {
            console.error("Error al obtener clientes", error);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        obtenerClientes();
    }, [obtenerClientes]);

    const handleOpenModal = (cliente = null) => {
        if (cliente) {
            setClienteEditar(cliente);
            setFormData({ nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono || '', direccion: cliente.direccion || '' });
        } else {
            setClienteEditar(null);
            setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
        }
        setIsModalOpen(true);
    };

const handleGuardarCliente = async (e) => {
        e.preventDefault();

        // --- 🛡️ NUEVO BLINDAJE ANTI-FANTASMAS ---
        if (!formData.nombre.trim()) {
            return Swal.fire('Atención', 'El nombre del cliente no puede estar vacío o contener solo espacios.', 'warning');
        }
        
        // Limpiamos la basura antes de enviar a la base de datos
        const payload = {
            ...formData,
            nombre: formData.nombre.trim(),
            email: formData.email.trim(),
            telefono: formData.telefono ? formData.telefono.trim() : '',
            direccion: formData.direccion ? formData.direccion.trim() : ''
        };
        // ------------------------------------
        
        try {
            if (clienteEditar) {
                await clienteAxios.put(`/clients/update/${clienteEditar.id}`, payload);
                Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/clients/create', payload);
                Swal.fire({ icon: 'success', title: 'Creado', timer: 1500, showConfirmButton: false });
            }
            setIsModalOpen(false);
            obtenerClientes();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Hubo un problema al guardar', 'error');
        }
    };

    // --- ABRIR VISTA 360° DEL CLIENTE ---
    const abrirPerfilCliente = async (id) => {
        setIsProfileOpen(true);
        setCargandoPerfil(true);
        setPerfilData(null);
        try {
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/clients/profile/${id}?_t=${stamp}`);
            setPerfilData(data.data);
        } catch (error) {
            Swal.fire('Error', 'No se pudo cargar el expediente del cliente', 'error');
            setIsProfileOpen(false);
        } finally {
            setCargandoPerfil(false);
        }
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fecha));
    };

    const clientesFiltrados = clientes.filter(c => 
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
        c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.telefono?.includes(busqueda)
    );

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-600" size={28} /> Directorio de Clientes
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión de expedientes e historial de servicios.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold transition-all shrink-0">
                    <UserPlus size={20} /> Nuevo Cliente
                </button>
            </div>

            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3 focus-within:border-blue-500 transition-all">
                    <Search className="text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, correo o teléfono..." 
                        className="w-full border-none outline-none text-gray-700 bg-transparent" 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Nombre / Contacto</th>
                                <th className="px-6 py-4">Ubicación</th>
                                <th className="px-6 py-4">Registro</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {clientesFiltrados.length > 0 ? (
                                clientesFiltrados.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-blue-50/40 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-gray-500">#{cliente.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 text-base">{cliente.nombre}</div>
                                            <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Mail size={12}/> {cliente.email}</span>
                                                <span className="flex items-center gap-1"><Phone size={12}/> {cliente.telefono || 'Sin teléfono'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-1 line-clamp-2 max-w-[200px]" title={cliente.direccion}>
                                                <MapPin size={14} className="text-gray-400 shrink-0"/> {cliente.direccion || 'No registrada'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {formatearFecha(cliente.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2  transition-opacity">
                                                <button onClick={() => abrirPerfilCliente(cliente.id)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-transparent hover:border-indigo-200 shadow-sm" title="Ver Expediente 360°">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleOpenModal(cliente)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (!cargando && <tr><td colSpan="5" className="px-6 py-16 text-center text-gray-400 font-medium">No se encontraron clientes.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {/* --- MODAL CREAR / EDITAR --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <UserPlus className="text-blue-600" size={20} />
                                {clienteEditar ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleGuardarCliente} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo *</label>
                                <input type="text" name="nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico *</label>
                                <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                                <input type="text" name="telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Física</label>
                                <textarea name="direccion" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md font-bold">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL VISTA 360° (EXPEDIENTE) --- */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-50 w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        
                        <div className="bg-indigo-900 text-white px-6 py-5 flex justify-between items-center shrink-0 shadow-md z-10 relative">
                            <div>
                                <h2 className="text-xl font-black flex items-center gap-2">
                                    <Activity className="text-indigo-400" /> Expediente del Cliente
                                </h2>
                                {!cargandoPerfil && perfilData && (
                                    <p className="text-indigo-200 text-sm mt-1">{perfilData.cliente?.nombre}</p>
                                )}
                            </div>
                            <button onClick={() => setIsProfileOpen(false)} className="text-indigo-200 hover:text-white bg-indigo-800 hover:bg-indigo-700 p-2 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {cargandoPerfil ? (
                                <div className="py-20 text-center text-indigo-400 animate-pulse font-medium">Recopilando información en la base de datos...</div>
                            ) : perfilData ? (
                                <>
                                    {/* 1. RESUMEN FINANCIERO Y CONTACTO */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Información de Contacto</p>
                                            <div className="space-y-2">
                                                <p className="text-sm text-slate-700 flex items-center gap-2"><Mail size={14} className="text-indigo-500"/> {perfilData.cliente?.email}</p>
                                                <p className="text-sm text-slate-700 flex items-center gap-2"><Phone size={14} className="text-indigo-500"/> {perfilData.cliente?.telefono || 'N/D'}</p>
                                                <p className="text-sm text-slate-700 flex items-start gap-2"><MapPin size={14} className="text-indigo-500 shrink-0 mt-0.5"/> <span className="line-clamp-2">{perfilData.cliente?.direccion || 'N/D'}</span></p>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-xl shadow-md text-white col-span-2 sm:col-span-1 flex flex-col justify-center">
                                            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1">Valor Total del Cliente (LTV)</p>
                                            <h3 className="text-3xl font-black flex items-center gap-1"><DollarSign size={28} className="opacity-80"/> {Number(perfilData.totalGastado || 0).toFixed(2)}</h3>
                                            <p className="text-xs text-emerald-50 mt-2 bg-black/10 w-fit px-2 py-1 rounded">Generado en el taller</p>
                                        </div>
                                    </div>

                                    {/* 2. EQUIPOS ASOCIADOS (VEHÍCULOS Y MÓDULOS) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                                            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2"><Car size={16} className="text-blue-500"/> Activos Registrados</h4>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {perfilData.vehiculos.map(v => (
                                                <div key={v.id} className="border border-blue-100 bg-blue-50/50 p-3 rounded-lg relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-bl-lg">VEHÍCULO</div>
                                                    <p className="font-bold text-slate-800 text-sm mt-2">{v.marca} {v.modelo}</p>
                                                    <p className="text-xs text-slate-500 mt-1 font-mono">{v.placa} | Año: {v.anio}</p>
                                                </div>
                                            ))}
                                            {perfilData.modulos.map(m => (
                                                <div key={m.id} className="border border-purple-100 bg-purple-50/50 p-3 rounded-lg relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-bl-lg">MÓDULO ECU</div>
                                                    <p className="font-bold text-slate-800 text-sm mt-2">{m.tipo} - {m.serial}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{m.marca || 'Genérico'} {m.modelo || ''}</p>
                                                </div>
                                            ))}
                                            {perfilData.vehiculos.length === 0 && perfilData.modulos.length === 0 && (
                                                <p className="text-xs text-slate-400 italic col-span-2 text-center py-2">El cliente no tiene equipos registrados.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. HISTORIAL DE ÓRDENES */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2"><ClipboardList size={16} className="text-indigo-500"/> Historial de Servicios</h4>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full">{perfilData.ordenes.length} Visitas</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {perfilData.ordenes.length > 0 ? perfilData.ordenes.map(ord => (
                                                <div key={ord.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="font-mono font-bold text-indigo-700 text-sm mr-2">ORD-#{String(ord.id).padStart(4, '0')}</span>
                                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{ord.estado.replace(/_/g, ' ')}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-400">{formatearFecha(ord.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 line-clamp-2 italic mb-2">"{ord.motivo_ingreso}"</p>
                                                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                                                        <span className="text-xs font-medium text-slate-500">
                                                            Aplica a: {ord.vehiculo_id ? 'Vehículo' : 'Módulo ECU'}
                                                        </span>
                                                        <span className="font-black text-slate-800">${Number(ord.monto_presupuesto || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-6 text-center text-sm text-slate-400 italic">No hay historial de visitas para este cliente.</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;