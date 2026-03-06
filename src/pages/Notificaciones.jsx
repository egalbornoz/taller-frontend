import React, { useState, useEffect, useCallback } from 'react';
import clienteAxios from '../api/axios';
import { socket } from '../socket';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { 
    BellRing, Search, MessageCircle, Mail, History, 
    X, User, Car, Cpu, Clock, Filter, CheckCircle, Phone 
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando comunicaciones...</p>
//     </div>
// );

const Notificaciones = () => {
    const { auth } = useAuth();
    
    const [ordenes, setOrdenes] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [clientes, setClientes] = useState([]); 
    const [revisiones, setRevisiones] = useState([]); 
    const [reparaciones, setReparaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [busqueda, setBusqueda] = useState('');
    const [tecnicoFiltro, setTecnicoFiltro] = useState('');

    const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
    const [historialData, setHistorialData] = useState([]);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const obtenerDatos = useCallback(async () => {
        try {
            const stamp = new Date().getTime();
            const [resOrd, resTec, resCli, resRev, resRep] = await Promise.allSettled([
                clienteAxios.get(`/orders?_t=${stamp}`),
                clienteAxios.get(`/users/active-technicians?_t=${stamp}`),
                clienteAxios.get(`/clients/true?_t=${stamp}`),
                clienteAxios.get(`/reviews?_t=${stamp}`),
                clienteAxios.get(`/repairs?_t=${stamp}`)
            ]);

            if (resOrd.status === 'fulfilled') {
                const data = Array.isArray(resOrd.value.data) ? resOrd.value.data : resOrd.value.data.data;
                const ordenesImportantes = data.filter(o => 
                    ['PRESUPUESTADO', 'TERMINADO', 'RECHAZADO', 'ENTREGADO'].includes(o.estado)
                );
                setOrdenes(ordenesImportantes);
            }
            
            if (resTec.status === 'fulfilled') setTecnicos(Array.isArray(resTec.value.data) ? resTec.value.data : resTec.value.data.data);
            if (resCli.status === 'fulfilled') setClientes(Array.isArray(resCli.value.data) ? resCli.value.data : resCli.value.data.data);
            if (resRev.status === 'fulfilled') setRevisiones(Array.isArray(resRev.value.data.data) ? resRev.value.data.data : (Array.isArray(resRev.value.data) ? resRev.value.data : []));
            if (resRep.status === 'fulfilled') setReparaciones(Array.isArray(resRep.value.data.data) ? resRep.value.data.data : (Array.isArray(resRep.value.data) ? resRep.value.data : []));
            
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        obtenerDatos();
        socket.on('actualizacion_taller', () => setTimeout(obtenerDatos, 500));
        return () => socket.off('actualizacion_taller');
    }, [obtenerDatos]);

    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        return new Intl.DateTimeFormat('es-VE', { 
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit', hour12: true 
        }).format(new Date(fecha));
    };

    const limpiarTelefono = (telefono) => {
        if (!telefono) return '';
        let num = telefono.replace(/\D/g, '');
        if (num.length === 11 && num.startsWith('0')) num = '58' + num.substring(1);
        return num;
    };

    // --- BÚSQUEDA INTELIGENTE DEL CONTACTO ---
    const obtenerContactoCliente = (orden) => {
        return clientes.find(c => 
            (orden.cliente_id && String(c.id) === String(orden.cliente_id)) || 
            (c.nombre && orden.nombre_cliente && c.nombre.trim().toLowerCase() === orden.nombre_cliente.trim().toLowerCase())
        ) || {};
    };

    const generarMensajeWhatsApp = (orden) => {
        const equipo = orden.vehiculo_id 
            ? `su vehículo ${orden.marca || ''} ${orden.modelo || ''}` 
            : `su módulo ECU ${orden.tipo_modulo || ''}`;

        let mensaje = `Hola *${orden.nombre_cliente}*, le saludamos de *INGCOTEC* (Taller ECU Pro). 👨🏻‍🔧\n\n`;

        const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const revision = revisiones.find(r => String(r.orden_id) === String(orden.id));
        const reparacion = reparaciones.find(r => String(r.orden_id) === String(orden.id));

        let enlaceDiag = (revision && revision.video_diagnostico) ? `${baseURL}/uploads/${encodeURI(revision.video_diagnostico)}` : '';
        let enlaceRep = (reparacion && reparacion.video_reparacion) ? `${baseURL}/uploads/${encodeURI(reparacion.video_reparacion)}` : '';

        const estadoOrden = String(orden.estado).toUpperCase().trim();

        if (estadoOrden === 'PRESUPUESTADO') {
            mensaje += `Le informamos que ya tenemos el diagnóstico y el presupuesto listo para ${equipo}.\n`;
            mensaje += `*Total Presupuesto:* $${Number(orden.monto_presupuesto || 0).toFixed(2)}\n\n`;
            if (enlaceDiag) mensaje += `📹 *Evidencia del diagnóstico:*\n${enlaceDiag}\n\n`;
            mensaje += `Por favor, indíquenos si aprueba el trabajo para iniciar la reparación.`;
        } 
        else if (estadoOrden === 'TERMINADO') {
            mensaje += `¡Excelentes noticias! Le informamos que el trabajo en ${equipo} ha sido *TERMINADO* exitosamente. ✅\n\n`;
            mensaje += `*Saldo a cancelar:* $${Number(orden.monto_presupuesto || 0).toFixed(2)}\n\n`;
            if (enlaceRep) mensaje += `📹 *Video del trabajo finalizado:*\n${enlaceRep}\n\n`;
            else if (enlaceDiag) mensaje += `📹 *Video de referencia inicial:*\n${enlaceDiag}\n\n`;
            mensaje += `Ya puede pasar por nuestras instalaciones a retirarlo.`;
        }
        else if (estadoOrden === 'RECHAZADO' || estadoOrden === 'CANCELADO') {
            mensaje += `Le confirmamos que su orden para ${equipo} ha sido cerrada según sus indicaciones.\n\n`;
            if (enlaceDiag) mensaje += `📹 *Puede revisar la evidencia de nuestro diagnóstico aquí:*\n${enlaceDiag}\n\n`;
            mensaje += `Puede pasar retirando el equipo cuando guste. Estamos a su orden para futuros requerimientos.`;
        }
        else if (estadoOrden === 'ENTREGADO') {
            mensaje += `Le escribimos para agradecerle por confiar en nosotros la revisión/reparación de ${equipo}.\n\n`;
            if (enlaceRep) mensaje += `📹 *Respaldo del trabajo finalizado:*\n${enlaceRep}\n\n`;
            else if (enlaceDiag) mensaje += `📹 *Respaldo del diagnóstico inicial:*\n${enlaceDiag}\n\n`;
            mensaje += `Esperamos que todo esté funcionando perfectamente. ¡Estamos a su orden!`;
        }
        else {
            mensaje += `Le contactamos en relación a su orden #${String(orden.id).padStart(4, '0')} para ${equipo}.\n\n`;
            if (enlaceRep) mensaje += `📹 *Acá le dejamos la evidencia en video:*\n${enlaceRep}\n\n`;
            else if (enlaceDiag) mensaje += `📹 *Acá le dejamos la evidencia en video:*\n${enlaceDiag}\n\n`;
        }

        return encodeURIComponent(mensaje);
    };

    const enviarWhatsApp = (orden) => {
        const datosCliente = obtenerContactoCliente(orden);
        const numeroCrudo = datosCliente.telefono || orden.cliente_telefono || orden.telefono_cliente;
        const telefono = limpiarTelefono(numeroCrudo);
        
        if (!telefono) {
            return Swal.fire('Sin Teléfono', 'El cliente no tiene un número registrado.', 'warning');
        }
        const mensaje = generarMensajeWhatsApp(orden);
        const url = `https://wa.me/${telefono}?text=${mensaje}`;
        window.open(url, '_blank');
    };

    const enviarCorreo = (orden) => {
        const datosCliente = obtenerContactoCliente(orden);
        const email = datosCliente.email || orden.cliente_email || orden.email_cliente;
        
        if (!email) {
            return Swal.fire('Sin Correo', 'El cliente no tiene un email registrado.', 'warning');
        }
        
        const equipo = orden.vehiculo_id ? `${orden.marca || ''} ${orden.modelo || ''}` : `ECU ${orden.tipo_modulo || ''}`;
        const asunto = encodeURIComponent(`Notificación de Servicio INGCOTEC - Orden #${String(orden.id).padStart(4, '0')}`);
        let cuerpo = `Hola ${orden.nombre_cliente},\n\nNos comunicamos del taller INGCOTEC para actualizarle sobre el estado de su ${equipo}.\n\nEstado actual: ${orden.estado}\n\n`;
        
        const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const revision = revisiones.find(r => String(r.orden_id) === String(orden.id));
        const reparacion = reparaciones.find(r => String(r.orden_id) === String(orden.id));

        if (orden.estado === 'TERMINADO' && reparacion && reparacion.video_reparacion) {
            cuerpo += `Video del trabajo finalizado:\n${baseURL}/uploads/${encodeURI(reparacion.video_reparacion)}\n\n`;
        } else if (revision && revision.video_diagnostico) {
            cuerpo += `Evidencia en video:\n${baseURL}/uploads/${encodeURI(revision.video_diagnostico)}\n\n`;
        }
        cuerpo += `Por favor contáctenos para más detalles.`;
        
        window.location.href = `mailto:${email}?subject=${asunto}&body=${encodeURIComponent(cuerpo)}`;
    };

    const verHistorial = async (orden) => {
        setOrdenSeleccionada(orden);
        setModalHistorialOpen(true);
        setCargandoHistorial(true);
        try {
            const { data } = await clienteAxios.get(`/order_history/${orden.id}`);
            setHistorialData(data.data || []);
        } catch (error) {
            console.error("Error al cargar historial:", error);
            Swal.fire('Error', 'No se pudo obtener el historial de movimientos.', 'error');
            setModalHistorialOpen(false);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const ordenesFiltradas = ordenes.filter(o => {
        const matchSearch = String(o.id).includes(busqueda) || o.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase());
        const matchTecnico = tecnicoFiltro === '' || String(o.tecnico_id) === String(tecnicoFiltro);
        return matchSearch && matchTecnico;
    });

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BellRing className="text-blue-500" size={28} /> Centro de Comunicaciones
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Notifica a tus clientes y audita el historial de trabajo.</p>
                </div>
            </div>

            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {/* BARRA DE FILTROS */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg flex-1 border border-gray-200 focus-within:border-blue-500 transition-all">
                        <Search className="text-gray-400" size={20} />
                        <input type="text" placeholder="Buscar por ID o Cliente..." className="w-full border-none outline-none text-gray-700 bg-transparent text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 min-w-[200px]">
                        <Filter className="text-blue-500" size={18} />
                        <select value={tecnicoFiltro} onChange={(e) => setTecnicoFiltro(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-blue-800 cursor-pointer">
                            <option value="">Todos los Técnicos</option>
                            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* TABLA PRINCIPAL (RESPONSIVE) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">ID / Cliente</th>
                                <th className="px-6 py-4">Equipo Técnico</th>
                                <th className="px-6 py-4">Estado / Monto</th>
                                <th className="px-6 py-4">Auditoría</th>
                                <th className="px-6 py-4 text-center">Acciones Directas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ordenesFiltradas.length > 0 ? (
                                ordenesFiltradas.map((orden) => {
                                    const datosCliente = obtenerContactoCliente(orden);
                                    const telefonoAMostrar = datosCliente.telefono || orden.cliente_telefono || orden.telefono_cliente;
                                    const emailAMostrar = datosCliente.email || orden.cliente_email || orden.email_cliente;

                                    return (
                                        <tr key={orden.id} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-blue-700">ORD-#{String(orden.id).padStart(4, '0')}</div>
                                                <div className="text-sm text-gray-800 font-bold mt-1">{orden.nombre_cliente}</div>
                                                
                                                <div className="mt-1.5 flex flex-col gap-0.5">
                                                    {telefonoAMostrar && (
                                                        <span className="text-[10px] text-gray-600 flex items-center gap-1 font-medium">
                                                            <Phone size={10} className="text-gray-400" /> {telefonoAMostrar}
                                                        </span>
                                                    )}
                                                    {emailAMostrar && (
                                                        <span className="text-[10px] text-gray-600 flex items-center gap-1 font-medium">
                                                            <Mail size={10} className="text-gray-400" /> {emailAMostrar}
                                                        </span>
                                                    )}
                                                    {(!telefonoAMostrar && !emailAMostrar) && (
                                                        <span className="text-[9px] text-red-500 font-bold italic">Sin contacto registrado</span>
                                                    )}
                                                </div>

                                                <div className="text-[10px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                                                    {orden.vehiculo_id ? (
                                                        <><Car size={10} className="inline mr-1 text-blue-400"/> Vehículo: {orden.marca || ''} {orden.modelo || ''}</>
                                                    ) : (
                                                        <><Cpu size={10} className="inline mr-1 text-purple-400"/> ECU {orden.tipo_modulo || ''}</>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 font-bold text-sm text-gray-700">
                                                    <User size={14} className="text-gray-400" /> {orden.tecnico_nombre || 'No asignado'}
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-1 block uppercase tracking-wider">{orden.fecha_actualizacion ? formatearFecha(orden.fecha_actualizacion) : 'Sin fecha'}</span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border w-fit block mb-2
                                                    ${orden.estado === 'TERMINADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                                    orden.estado === 'PRESUPUESTADO' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 
                                                    orden.estado === 'ENTREGADO' ? 'bg-slate-200 text-slate-600 border-slate-300' : 
                                                    'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                                    {orden.estado}
                                                </span>
                                                <span className="font-mono font-black text-gray-800">${Number(orden.monto_presupuesto || 0).toFixed(2)}</span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <button onClick={() => verHistorial(orden)} className="flex items-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-800 hover:text-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                                    <History size={14} /> Trazabilidad
                                                </button>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => enviarWhatsApp(orden)} className="p-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 rounded-xl transition-all shadow-sm" title="Notificar por WhatsApp">
                                                        <MessageCircle size={20} />
                                                    </button>
                                                    <button onClick={() => enviarCorreo(orden)} className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-xl transition-all shadow-sm" title="Enviar Email Básico">
                                                        <Mail size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                !cargando && <tr><td colSpan="5" className="px-6 py-16 text-center text-gray-400 italic">No hay órdenes pendientes de notificación con estos filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE HISTORIAL (TIMELINE) */}
            {modalHistorialOpen && ordenSeleccionada && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col relative overflow-hidden">
                        
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <History size={20} className="text-blue-400" /> Historial de la Orden
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">
                                    ORD-#{String(ordenSeleccionada.id).padStart(4, '0')} | {ordenSeleccionada.nombre_cliente}
                                </p>
                            </div>
                            <button onClick={() => setModalHistorialOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                            {cargandoHistorial ? (
                                <div className="py-10 text-center text-slate-500 text-sm font-medium animate-pulse">Reconstruyendo trazabilidad...</div>
                            ) : historialData.length > 0 ? (
                                <div className="relative border-l-2 border-blue-200 ml-3 space-y-6">
                                    {historialData.map((hito, index) => (
                                        <div key={index} className="relative pl-6">
                                            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                                            
                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                                                        Cambio a: {hito.estado}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Clock size={10} /> {formatearFecha(hito.fecha_cambio)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 font-medium">
                                                    Acción realizada por: <span className="font-bold text-slate-800">{hito.usuario_nombre || 'Sistema'}</span>
                                                </p>
                                                {hito.observaciones && (
                                                    <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                                                        "{hito.observaciones}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <History size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-slate-500">No hay registros de historial para esta orden.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notificaciones;