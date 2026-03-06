import { socket } from '../socket';
import { useEffect, useState, useRef, useCallback } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
    Wrench, Search, Plus, X, Calendar, User, FileText, DollarSign,
    Filter, FileSpreadsheet, ShieldAlert, Pencil, Activity, AlertTriangle, CheckCircle, Video, UploadCloud, Trash2, Tag
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando reparaciones...</p>
//     </div>
// );

const Reparaciones = () => {
    const { auth } = useAuth();

    const [reparaciones, setReparaciones] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [revisiones, setRevisiones] = useState([]); 
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [totalPeriodo, setTotalPeriodo] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reparacionEditar, setReparacionEditar] = useState(null);
    const [bloquearSelect, setBloquearSelect] = useState(false); // 🛡️ Evita cambiar orden si editamos fila
    const [formData, setFormData] = useState({ orden_id: '', descripcion: '', costo_reparacion: '' });

    // --- ESTADOS PARA VIDEO ---
    const [isDragging, setIsDragging] = useState(false);
    const [archivoVideo, setArchivoVideo] = useState(null);
    const [videoPreviewURL, setVideoPreviewURL] = useState(null);
    const fileInputRef = useRef(null);

    // --- REPRODUCTOR DE VIDEO ---
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const [selectedVideoURL, setSelectedVideoURL] = useState('');

    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        return new Intl.DateTimeFormat('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }).format(new Date(fecha));
    };

    const obtenerDatosInit = useCallback(async () => {
        try {
            const stamp = new Date().getTime();
            
            const [resRep, resOrd, resRev] = await Promise.allSettled([
                clienteAxios.get(`/repairs?_t=${stamp}`),
                clienteAxios.get(`/orders?_t=${stamp}`),
                clienteAxios.get(`/reviews?_t=${stamp}`)
            ]);

            if (resRep.status === 'fulfilled') setReparaciones(Array.isArray(resRep.value.data.data) ? resRep.value.data.data : []);
            if (resOrd.status === 'fulfilled') setOrdenes(Array.isArray(resOrd.value.data?.data || resOrd.value.data) ? (resOrd.value.data?.data || resOrd.value.data) : []);
            if (resRev.status === 'fulfilled') setRevisiones(Array.isArray(resRev.value.data?.data || resRev.value.data) ? (resRev.value.data?.data || resRev.value.data) : []);
            
        } catch (error) {
            console.error("Error al inicializar datos:", error);
        } finally {
            setTimeout(() => setCargando(false), 300);
        }
    }, []);

    useEffect(() => {
        obtenerDatosInit(); 

        const onActualizacion = () => {
            console.log("⚡ [Reparaciones] Socket escuchado. Esperando 500ms...");
            setTimeout(() => { obtenerDatosInit(); }, 500);
        };

        socket.on('actualizacion_taller', onActualizacion);
        return () => { socket.off('actualizacion_taller', onActualizacion); };
    }, [obtenerDatosInit]);

    const buscarPorFechas = async () => {
        if (!fechaInicio) return Swal.fire('Atención', 'Seleccione al menos la fecha de inicio', 'warning');
        setCargando(true);
        try {
            const url = `/repairs/reporte/fechas?inicio=${fechaInicio}&fin=${fechaFin || fechaInicio}`;
            const { data } = await clienteAxios.get(url);
            let filas = data.data || [];
            if (Array.isArray(filas) && Array.isArray(filas[0])) filas = filas[0];
            else if (!Array.isArray(filas)) filas = [];
            setReparaciones(filas);
            setTotalPeriodo(data.total_periodo || 0);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron obtener los datos de esa fecha', 'error');
        } finally { setCargando(false); }
    };

    const limpiarFiltros = () => { setFechaInicio(''); setFechaFin(''); setBusqueda(''); setTotalPeriodo(0); obtenerDatosInit(); };
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // --- LÓGICA DE VIDEO ---
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); procesarArchivo(e.dataTransfer.files[0]); };
    const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

    const procesarArchivo = (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) return Swal.fire('Error', 'Solo se permiten archivos de video', 'error');
        if (file.size > 50 * 1024 * 1024) return Swal.fire('Error', 'El video no debe pesar más de 50MB', 'error');
        setArchivoVideo(file);
        setVideoPreviewURL(URL.createObjectURL(file));
    };

    const removerVideo = () => { setArchivoVideo(null); setVideoPreviewURL(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleVerVideo = (videoName) => {
        if (!videoName) return;
        const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
        setSelectedVideoURL(`${baseURL}/uploads/${encodeURI(videoName)}`);
        setIsVideoPlayerOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setReparacionEditar(null);
        setBloquearSelect(false);
        setFormData({ orden_id: '', descripcion: '', costo_reparacion: '' });
        removerVideo();
    };

    // 🚀 MAGIA: Función Inteligente que Detecta si vas a Crear o Editar
    const cargarDatosEdicion = (rep) => {
        // Si el objeto dice 'isPending', no tiene ID en BD, pasamos null para que el backend haga un POST
        setReparacionEditar(rep.isPending ? null : rep);
        setBloquearSelect(true); // Bloqueamos el select para que no cambie la orden por error
        
        const ordenMaster = rep._ordenMaster || {};
        
        setFormData({
            orden_id: rep.orden_id || '',
            descripcion: rep.descripcion || '',
            costo_reparacion: rep.costo_reparacion > 0 ? rep.costo_reparacion : (ordenMaster?.monto_presupuesto || '') 
        });

        if (rep.video_reparacion) {
            const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
            setVideoPreviewURL(`${baseURL}/uploads/${encodeURI(rep.video_reparacion)}`);
        } else {
            setVideoPreviewURL(null);
        }
        setArchivoVideo(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.orden_id) return Swal.fire('Error', 'Debe seleccionar una orden', 'error');
        if (!formData.descripcion.trim()) return Swal.fire('Error', 'La descripción es obligatoria', 'error');

        setGuardando(true);
        const ordenMaster = ordenes.find(o => String(o.id) === String(formData.orden_id));
        
        let costoFinal = parseFloat(formData.costo_reparacion);
        if (isNaN(costoFinal) || costoFinal <= 0) {
            costoFinal = parseFloat(ordenMaster?.monto_presupuesto || 0);
        }

        const payload = new FormData();
        payload.append('orden_id', formData.orden_id);
        payload.append('descripcion', formData.descripcion);
        payload.append('costo_reparacion', costoFinal);
        if (archivoVideo) payload.append('video_reparacion', archivoVideo);

        try {
            if (reparacionEditar) {
                await clienteAxios.put(`/repairs/${reparacionEditar.id}`, payload);
                Swal.fire({ icon: 'success', title: 'Actualizada', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/repairs/create', payload);
                Swal.fire({ icon: 'success', title: 'Registrada', timer: 1500, showConfirmButton: false });
            }
            cerrarModal();
            if (fechaInicio) buscarPorFechas(); else obtenerDatosInit();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar la reparación', 'error');
        } finally { setGuardando(false); }
    };

    const handleFinalizarReparacion = async (rep) => {
        // 🛡️ BLINDAJE: Evita finalizar la orden si no han llenado la bitácora
        if (rep.isPending) {
            return Swal.fire('Falta Información', 'No puedes finalizar el trabajo sin registrar lo que hiciste. Haz clic en el botón del lápiz para llenar la bitácora.', 'warning');
        }

        const confirm = await Swal.fire({
            title: '¿Terminar Reparación?',
            text: "La orden pasará a estado TERMINADO y se enviará a recepción.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, terminar trabajo'
        });

        if (confirm.isConfirmed) {
            try {
                const ordenMaster = rep._ordenMaster;
                await clienteAxios.put(`/orders/update/${rep.orden_id}`, {
                    cliente_id: ordenMaster.cliente_id, 
                    vehiculo_id: ordenMaster.vehiculo_id,
                    modulo_id: ordenMaster.modulo_id, 
                    motivo_ingreso: ordenMaster.motivo_ingreso,
                    observaciones: ordenMaster.observaciones, 
                    tecnico_id: ordenMaster.tecnico_id,
                    monto_presupuesto: ordenMaster.monto_presupuesto, 
                    estado: 'TERMINADO'
                });
                
                Swal.fire({ icon: 'success', title: '¡Trabajo Terminado!', timer: 1500, showConfirmButton: false });
                obtenerDatosInit();
            } catch (error) { 
                Swal.fire('Error', 'No se pudo finalizar la reparación', 'error'); 
            }
        }
    };

    const getDetallesExtraFormulario = () => {
        if (!formData.orden_id) return null;
        const ordenSel = ordenes.find(o => String(o.id) === String(formData.orden_id));
        const revSel = revisiones.find(r => String(r.orden_id) === String(formData.orden_id));
        return {
            falla: ordenSel?.motivo_ingreso || 'No especificada',
            diagnostico: revSel?.diagnostico || 'Sin diagnóstico registrado',
            presupuestoOriginal: ordenSel?.monto_presupuesto || 0
        };
    };

    const detallesExtra = getDetallesExtraFormulario();

    // 🚀 BANDEJA UNIFICADA: Junta los trabajos pendientes (Órdenes) y el historial (Reparaciones)
    const obtenerBandejaUnificada = () => {
        let filas = [];

        if (auth.nombre_rol === 'TECNICO') {
            // El técnico ve sus órdenes que están en reparación en este momento
            const misOrdenes = ordenes.filter(o => String(o.tecnico_id) === String(auth.id) && o.estado === 'EN_REPARACION');
            
            misOrdenes.forEach(orden => {
                const repLog = reparaciones.find(r => String(r.orden_id) === String(orden.id));
                filas.push({
                    ...repLog,
                    isPending: !repLog, // 🔔 Si no existe log, es PENDIENTE
                    id_virtual: repLog ? repLog.id : `ord-${orden.id}`,
                    orden_id: orden.id,
                    cliente_nombre: orden.nombre_cliente,
                    tecnico_nombre: orden.tecnico_nombre || auth.nombre,
                    descripcion: repLog ? repLog.descripcion : '',
                    video_reparacion: repLog ? repLog.video_reparacion : null,
                    fecha: repLog ? repLog.fecha : orden.fecha_creacion,
                    costo_reparacion: repLog ? repLog.costo_reparacion : 0,
                    _ordenMaster: orden,
                    _revMaster: revisiones.find(r => String(r.orden_id) === String(orden.id)) || {}
                });
            });
        } else {
            // ADMIN: Ve el historial completo de reparaciones
            reparaciones.forEach(rep => {
                const orden = ordenes.find(o => String(o.id) === String(rep.orden_id)) || {};
                filas.push({
                    ...rep,
                    isPending: false,
                    id_virtual: rep.id,
                    _ordenMaster: orden,
                    _revMaster: revisiones.find(r => String(r.orden_id) === String(rep.orden_id)) || {}
                });
            });

            // Si el admin no está buscando fechas viejas, le inyectamos también lo pendiente de hoy
            if (!fechaInicio) {
                const ordenesPendientes = ordenes.filter(o => o.estado === 'EN_REPARACION' && !reparaciones.some(r => String(r.orden_id) === String(o.id)));
                ordenesPendientes.forEach(orden => {
                    filas.push({
                        isPending: true,
                        id_virtual: `ord-${orden.id}`,
                        orden_id: orden.id,
                        cliente_nombre: orden.nombre_cliente,
                        tecnico_nombre: orden.tecnico_nombre,
                        descripcion: '',
                        video_reparacion: null,
                        fecha: orden.fecha_creacion,
                        costo_reparacion: 0,
                        _ordenMaster: orden,
                        _revMaster: revisiones.find(r => String(r.orden_id) === String(orden.id)) || {}
                    });
                });
            }
        }

        // Aplicar el buscador a nuestra lista fusionada
        const term = busqueda.toLowerCase();
        return filas.filter(row => {
            return String(row.orden_id).includes(term) || 
                   (row.descripcion || '').toLowerCase().includes(term) ||
                   (row.tecnico_nombre || '').toLowerCase().includes(term) || 
                   (row.cliente_nombre || '').toLowerCase().includes(term) ||
                   (row._ordenMaster?.motivo_ingreso || '').toLowerCase().includes(term);
        });
    };

    const bandejaLista = obtenerBandejaUnificada();

    const ordenActivaEnModal = isModalOpen ? ordenes.find(o => String(o.id) === String(formData.orden_id)) : null;
    const isOrdenCerrada = ordenActivaEnModal && ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(ordenActivaEnModal.estado);

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Wrench className="text-emerald-600" size={28} /> Trabajos de Reparación</h1>
                    <p className="text-gray-500 text-sm mt-1">Bandeja de pendientes y bitácora de los técnicos.</p>
                </div>
                {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
                    <button onClick={() => { setReparacionEditar(null); setBloquearSelect(false); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-bold"><Plus size={20} /> Registro Manual</button>
                )}
            </div>

            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col xl:flex-row gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg flex-1 border border-gray-200 focus-within:border-emerald-50 transition-all">
                        <Search className="text-gray-400" size={20} />
                        <input type="text" placeholder="Buscar por palabra clave, falla, cliente o ID..." className="w-full border-none outline-none bg-transparent text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>

                    {auth.nombre_rol === 'ADMIN' && (
                        <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <Filter size={16} className="text-emerald-600 ml-1" />
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-sm px-2 py-1.5 rounded outline-none border border-emerald-200" />
                            <span className="text-emerald-600 font-bold">-</span>
                            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-sm px-2 py-1.5 rounded outline-none border border-emerald-200" />
                            <button onClick={buscarPorFechas} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-700">Buscar</button>
                            {(fechaInicio || fechaFin || busqueda) && (<button onClick={limpiarFiltros} className="bg-white text-gray-500 border border-gray-300 px-2 py-1.5 rounded"><X size={16} /></button>)}
                        </div>
                    )}
                </div>

                {auth.nombre_rol === 'ADMIN' && totalPeriodo > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between animate-in fade-in">
                        <div>
                            <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Total Generado en Periodo</p>
                            <h2 className="text-3xl font-black">${Number(totalPeriodo).toFixed(2)}</h2>
                        </div>
                        <FileSpreadsheet size={40} className="text-emerald-300 opacity-80" />
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Orden / Cliente</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Historial y Reparación</th>
                                <th className="px-6 py-4">Video</th>
                                {auth.nombre_rol === 'ADMIN' && <th className="px-6 py-4">Costo Final</th>}
                                <th className="px-6 py-4">Técnico / Fecha</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bandejaLista.length > 0 ? (
                                bandejaLista.map((rep) => {
                                    const ordenMaster = rep._ordenMaster || {};
                                    const revMaster = rep._revMaster || {};

                                    const motivoIngreso = ordenMaster.motivo_ingreso || 'No especificado';
                                    const diagnostico = revMaster.diagnostico || 'Sin diagnóstico registrado';
                                    const estadoOrden = ordenMaster.estado || 'DESCONOCIDO';
                                    const costoFinal = Number(rep.costo_reparacion > 0 ? rep.costo_reparacion : (ordenMaster.monto_presupuesto || 0)).toFixed(2);
                                    
                                    const isRowCerrada = ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(estadoOrden);

                                    return (
                                        <tr key={rep.id_virtual} className={`hover:bg-emerald-50/40 transition-colors group ${isRowCerrada ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-emerald-700">ORD-#{String(rep.orden_id).padStart(4, '0')}</div>
                                                <div className="text-xs text-gray-500 font-medium mt-0.5">{rep.cliente_nombre || 'Cliente'}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit uppercase border ${estadoOrden === 'EN_REPARACION' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                    <Activity size={12} /> {estadoOrden.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 max-w-sm">
                                                    <div className="flex gap-2">
                                                        <div className="bg-red-50 border-l-2 border-red-400 p-2 rounded flex-1">
                                                            <span className="text-[9px] font-black text-red-600 uppercase flex items-center gap-1"><AlertTriangle size={10} /> Falla Reportada:</span>
                                                            <p className="text-[10px] text-red-800 line-clamp-2 italic font-medium mt-1" title={motivoIngreso}>{motivoIngreso}</p>
                                                        </div>
                                                        <div className="bg-indigo-50 border-l-2 border-indigo-400 p-2 rounded flex-1">
                                                            <span className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Search size={10} /> Diagnóstico:</span>
                                                            <p className="text-[10px] text-indigo-800 line-clamp-2 italic font-medium mt-1" title={diagnostico}>{diagnostico}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 🔔 ALERTA DE PENDIENTE O TRABAJO TERMINADO */}
                                                    {rep.isPending ? (
                                                        <div className="bg-orange-50 border border-orange-200 p-2 rounded shadow-sm flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] font-black text-orange-600 uppercase block">Registro Pendiente</span>
                                                                <span className="text-xs text-orange-800">Haz clic en el lápiz para detallar.</span>
                                                            </div>
                                                            <AlertTriangle className="text-orange-400" size={24} />
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white border border-emerald-100 p-2 rounded shadow-sm">
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Trabajo Realizado / Notas:</span>
                                                            <p className="text-xs text-gray-700 line-clamp-2 mt-1" title={rep.descripcion}>{rep.descripcion}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {rep.video_reparacion ? (
                                                    <button type="button" onClick={() => handleVerVideo(rep.video_reparacion)} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                                        <Video size={14} /> Ver Video
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">Sin evidencia</span>
                                                )}
                                            </td>

                                            {auth.nombre_rol === 'ADMIN' && (
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-800 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 w-fit whitespace-nowrap inline-block">
                                                        $ {costoFinal}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex items-center gap-1.5 font-bold text-gray-700"><User size={12} className="text-gray-400" /> {rep.tecnico_nombre}</div>
                                                <div className="text-gray-400 flex items-center gap-1 mt-1"><Calendar size={10} className="text-emerald-500" /> {formatearFecha(rep.fecha)}</div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 transition-opacity">
                                                    {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'TECNICO') && estadoOrden === 'EN_REPARACION' && (
                                                        <button 
                                                            onClick={() => handleFinalizarReparacion(rep)} 
                                                            className={`p-2 text-white rounded-lg shadow-sm flex items-center gap-1 text-xs font-bold ${rep.isPending ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-emerald-500 hover:bg-emerald-600'}`} 
                                                            title={rep.isPending ? "Llena la bitácora primero" : "Finalizar Reparación"}
                                                        >
                                                            <CheckCircle size={16} /> <span className="hidden md:inline">Finalizar</span>
                                                        </button>
                                                    )}
                                                    {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'TECNICO') && (
                                                        <button 
                                                            onClick={() => cargarDatosEdicion(rep)} 
                                                            className={`p-2 ${isRowCerrada ? 'text-gray-500 hover:bg-gray-200 bg-gray-50 border-gray-200' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'} rounded-lg border transition-colors`} 
                                                            title={isRowCerrada ? "Ver Detalles (Cerrado)" : (rep.isPending ? "Agregar Bitácora" : "Editar / Adjuntar Video")}
                                                        >
                                                            {isRowCerrada ? <FileText size={18} /> : (rep.isPending ? <Plus size={18} /> : <Pencil size={18} />)}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (!cargando && (
                                <tr><td colSpan={auth.nombre_rol === 'ADMIN' ? "7" : "6"} className="px-6 py-20 text-center text-gray-400">No hay trabajos asignados en este momento.</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {isVideoPlayerOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in" onClick={() => setIsVideoPlayerOpen(false)}>
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsVideoPlayerOpen(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-red-500 text-white rounded-full p-2"><X size={24} /></button>
                        <video src={selectedVideoURL} controls autoPlay className="w-full max-h-[80vh] rounded-xl shadow-2xl bg-black border border-gray-800">
                            Navegador no soporta video.
                        </video>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border-t-4 border-emerald-500 max-h-[95vh] overflow-y-auto">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {isOrdenCerrada ? <FileText size={18} className="text-gray-500" /> : <Wrench size={18} className="text-emerald-600" />}
                                {reparacionEditar ? (isOrdenCerrada ? 'Detalles de la Reparación (Cerrado)' : 'Actualizar Trabajo') : 'Registrar Trabajo / Bitácora'}
                            </h3>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden de Servicio *</label>
                                <select disabled={bloquearSelect} name="orden_id" value={formData.orden_id} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none font-mono text-gray-600 disabled:opacity-70 disabled:cursor-not-allowed" required>
                                    <option value="">-- Seleccionar Orden --</option>
                                    {ordenes.map(ord => <option key={ord.id} value={ord.id}>ORD-#{String(ord.id).padStart(4, '0')} - {ord.nombre_cliente}</option>)}
                                </select>
                            </div>

                            {detallesExtra && (
                                <div className="flex gap-2 animate-in fade-in">
                                    <div className="bg-red-50 border-l-2 border-red-500 p-2 rounded flex-1">
                                        <label className="block text-[9px] font-bold text-red-500 uppercase mb-0.5"><AlertTriangle size={10} className="inline" /> Falla</label>
                                        <p className="text-[11px] font-medium text-red-800 italic leading-tight">{detallesExtra.falla}</p>
                                    </div>
                                    <div className="bg-indigo-50 border-l-2 border-indigo-500 p-2 rounded flex-1">
                                        <label className="block text-[9px] font-bold text-indigo-500 uppercase mb-0.5"><Search size={10} className="inline" /> Diagnóstico</label>
                                        <p className="text-[11px] font-medium text-indigo-800 italic leading-tight">{detallesExtra.diagnostico}</p>
                                    </div>
                                    <div className="bg-green-50 border-l-2 border-green-500 p-2 rounded flex-1 flex flex-col justify-center items-center text-center">
                                        <label className="block text-[9px] font-bold text-green-600 uppercase mb-0.5"><Tag size={10} className="inline" /> Ppto. Aprobado</label>
                                        <p className="text-sm font-black text-green-800">${Number(detallesExtra.presupuestoOriginal).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción del Trabajo Realizado *</label>
                                <textarea disabled={isOrdenCerrada} name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full border border-gray-300 bg-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24 disabled:bg-gray-50 disabled:text-gray-600" placeholder="Detalla las reparaciones realizadas..." required></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Video de Evidencia Final</label>
                                {isOrdenCerrada && !videoPreviewURL ? (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 italic text-center">
                                        No se adjuntó evidencia en video para este trabajo.
                                    </div>
                                ) : !videoPreviewURL ? (
                                    <div
                                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}
                                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        <input type="file" accept="video/mp4,video/webm" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                        <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                                            <UploadCloud size={24} className={isDragging ? 'text-emerald-500' : 'text-gray-400'} />
                                            <p className="text-sm text-gray-600 font-medium">Arrastra un video aquí o explora</p>
                                            <p className="text-[10px] text-gray-400">MP4, WEBM (Max. 50MB)</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative border border-gray-200 rounded-xl p-1 bg-black flex items-center justify-center h-40 group overflow-hidden">
                                        <video src={videoPreviewURL} className="max-h-full max-w-full rounded-lg" controls />
                                        {!isOrdenCerrada && (
                                            <div className="absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center">
                                                <button type="button" onClick={removerVideo} className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all text-sm">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {auth.nombre_rol === 'ADMIN' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo de Reparación ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input disabled={isOrdenCerrada} type="number" step="0.01" min="0" name="costo_reparacion" value={formData.costo_reparacion} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 disabled:bg-gray-100 disabled:text-gray-600" placeholder="0.00" />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button type="button" onClick={cerrarModal} className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors">
                                    {isOrdenCerrada ? 'Cerrar Detalles' : 'Cancelar'}
                                </button>
                                {!isOrdenCerrada && (
                                    <button type="submit" disabled={guardando} className="px-6 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md font-bold disabled:bg-emerald-300">
                                        {guardando ? 'Guardando...' : 'Guardar Información'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reparaciones;