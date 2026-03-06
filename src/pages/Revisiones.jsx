import { socket } from '../socket';
import { useEffect, useState, useRef, useCallback } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
    FileSearch, Search, Plus, Pencil, X, Calendar, User, FileText,
    DollarSign, Filter, FileSpreadsheet, CheckSquare, Video, UploadCloud,
    Trash2, AlertTriangle, Car, Cpu
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando diagnósticos...</p>
//     </div>
// );

const Revisiones = () => {
    const { auth } = useAuth();

    const [revisiones, setRevisiones] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [totalPeriodo, setTotalPeriodo] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [revisionEditar, setRevisionEditar] = useState(null);

    // --- ESTADOS PARA VIDEO ---
    const [isDragging, setIsDragging] = useState(false);
    const [archivoVideo, setArchivoVideo] = useState(null);
    const [videoPreviewURL, setVideoPreviewURL] = useState(null);
    const fileInputRef = useRef(null);

    // --- REPRODUCTOR DE VIDEO ---
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const [selectedVideoURL, setSelectedVideoURL] = useState('');

    const [formData, setFormData] = useState({
        orden_id: '', diagnostico: '', costo_revision: ''
    });

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
            const [resRev, resOrd] = await Promise.allSettled([
                clienteAxios.get(`/reviews?_t=${stamp}`),
                clienteAxios.get(`/orders?_t=${stamp}`)
            ]);

            if (resRev.status === 'fulfilled') {
                setRevisiones(Array.isArray(resRev.value.data.data) ? resRev.value.data.data : (Array.isArray(resRev.value.data) ? resRev.value.data : []));
                setTotalPeriodo(0);
            } else { setRevisiones([]); }

            if (resOrd.status === 'fulfilled') {
                const dataOrd = Array.isArray(resOrd.value.data.data) ? resOrd.value.data.data : (Array.isArray(resOrd.value.data) ? resOrd.value.data : []);
                setOrdenes(dataOrd);
            } else { setOrdenes([]); }
        } catch (error) {
            console.error(error);
        } finally { setTimeout(() => setCargando(false), 300); }
    }, []);

    // ==========================================
    // ESCUCHAR AL SOCKET (SIN LOOP INFINITO)
    // ==========================================
    useEffect(() => {
        obtenerDatosInit();

        const onActualizacion = () => {
            console.log("⚡ Socket escuchado. Esperando 500ms...");
            setTimeout(() => {
                obtenerDatosInit();
            }, 500);
        };

        socket.on('actualizacion_taller', onActualizacion);

        return () => {
            socket.off('actualizacion_taller', onActualizacion);
        };
    }, [obtenerDatosInit]);

    const buscarPorFechas = async () => {
        if (!fechaInicio) return Swal.fire('Atención', 'Seleccione al menos la fecha de inicio', 'warning');
        setCargando(true);
        try {
            const url = `/reviews/reporte/fechas?inicio=${fechaInicio}&fin=${fechaFin || fechaInicio}`;
            const { data } = await clienteAxios.get(url);
            setRevisiones(data.data || []);
            setTotalPeriodo(data.total_periodo || 0);
        } catch (error) { Swal.fire('Error', 'No se pudieron obtener los reportes', 'error'); }
        finally { setCargando(false); }
    };

    const limpiarFiltros = () => { setFechaInicio(''); setFechaFin(''); setBusqueda(''); setTotalPeriodo(0); obtenerDatosInit(); };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // --- LÓGICA DE VIDEO EN FORMULARIO ---
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); procesarArchivo(e.dataTransfer.files[0]); };
    const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

    const procesarArchivo = (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) return Swal.fire('Error', 'Solo se permiten archivos de video (MP4, WEBM)', 'error');
        if (file.size > 50 * 1024 * 1024) return Swal.fire('Error', 'El video no debe pesar más de 50MB', 'error');
        setArchivoVideo(file);
        setVideoPreviewURL(URL.createObjectURL(file));
    };

    const removerVideo = () => {
        setArchivoVideo(null);
        setVideoPreviewURL(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setFormData({ orden_id: '', diagnostico: '', costo_revision: '' });
        setRevisionEditar(null);
        removerVideo();
    };

    const cargarDatosEdicion = (revision) => {
        setRevisionEditar(revision);
        setFormData({
            orden_id: revision.orden_id || '',
            diagnostico: revision.diagnostico === 'Pendiente de diagnóstico...' ? '' : (revision.diagnostico || ''),
            costo_revision: revision.costo_revision || ''
        });

        if (revision.video_diagnostico) {
            const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
            setVideoPreviewURL(`${baseURL}/uploads/${encodeURI(revision.video_diagnostico)}`);
        } else {
            setVideoPreviewURL(null);
        }
        setArchivoVideo(null);
        setIsModalOpen(true);
    };

    const handleVerVideo = (videoName) => {
        if (!videoName) return;
        const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
        setSelectedVideoURL(`${baseURL}/uploads/${encodeURI(videoName)}`);
        setIsVideoPlayerOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.orden_id) return Swal.fire('Error', 'Debe seleccionar una orden', 'error');
        if (!formData.diagnostico.trim()) return Swal.fire('Error', 'El diagnóstico es obligatorio', 'error');

        setGuardando(true);

        const payload = new FormData();
        payload.append('orden_id', formData.orden_id);
        payload.append('diagnostico', formData.diagnostico);
        payload.append('costo_revision', formData.costo_revision ? parseFloat(formData.costo_revision) : 0.00);

        if (archivoVideo) {
            payload.append('video_diagnostico', archivoVideo);
        }

        try {
            if (revisionEditar) {
                await clienteAxios.put(`/reviews/update/${revisionEditar.id}`, payload);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Diagnóstico guardado con éxito', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/reviews/create', payload);
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Diagnóstico registrado exitosamente', timer: 1500, showConfirmButton: false });
            }
            cerrarModal();
            if (fechaInicio) buscarPorFechas(); else obtenerDatosInit();
        } catch (error) {
            console.log("Error de validación del backend:", error.response?.data);
            const mensajeError = error.response?.data?.errors
                ? error.response.data.errors[0].msg
                : (error.response?.data?.message || 'Error al guardar la revisión');
            Swal.fire('Error', mensajeError, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const handleCerrarDiagnostico = async (id) => {
        Swal.fire({
            title: '¿Terminaste el diagnóstico?',
            text: "La orden pasará a estado DIAGNOSTICADO y se enviará a Recepción.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Cerrar Diagnóstico'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await clienteAxios.patch(`/reviews/close/${id}`);
                    Swal.fire('¡Cerrado!', 'El diagnóstico ha finalizado.', 'success');
                    obtenerDatosInit();
                } catch (error) { Swal.fire('Error', 'No se pudo cerrar el diagnóstico', 'error'); }
            }
        });
    };

    const revisionesFiltradas = revisiones.filter(r => {
        // 1. FILTRO DE SEGURIDAD (TÉCNICOS SOLO VEN LO SUYO)
        if (auth.nombre_rol === 'TECNICO') {
            // Buscamos la orden a la que pertenece esta revisión
            const ordenRelacionada = ordenes.find(o => String(o.id) === String(r.orden_id));

            // Si la orden no es de este técnico, la ocultamos inmediatamente
            if (ordenRelacionada && String(ordenRelacionada.tecnico_id) !== String(auth.id)) {
                return false;
            }

            // Si la orden ya no está en revisión, la ocultamos
            if (r.estado_orden !== 'EN_REVISION') {
                return false;
            }
        }

        // 2. FILTRO DE BÚSQUEDA (El buscador de texto de arriba)
        const searchTerm = busqueda.toLowerCase();
        const ordenRelacionada = ordenes.find(o => String(o.id) === String(r.orden_id));
        const motivo = ordenRelacionada?.motivo_ingreso || '';

        return (
            String(r.orden_id).includes(searchTerm) ||
            r.diagnostico?.toLowerCase().includes(searchTerm) ||
            r.tecnico_nombre?.toLowerCase().includes(searchTerm) ||
            r.cliente_nombre?.toLowerCase().includes(searchTerm) ||
            motivo.toLowerCase().includes(searchTerm)
        );
    });

    const getDetallesActivoActual = () => {
        if (!formData.orden_id) return null;
        const ordenSel = ordenes.find(o => String(o.id) === String(formData.orden_id));
        if (!ordenSel) return null;

        let activoText = 'Activo no especificado';
        let isVehiculo = false;

        if (ordenSel.vehiculo_id) {
            activoText = `Vehículo: ${ordenSel.marca || ''} ${ordenSel.modelo || ''} (Placa: ${ordenSel.placa || 'N/A'})`;
            isVehiculo = true;
        } else if (ordenSel.modulo_id) {
            activoText = `Módulo ECU: ${ordenSel.tipo_modulo || 'Sin Tipo'} (Serial: ${ordenSel.serial_modulo || 'N/A'})`;
        }

        return {
            falla: ordenSel.motivo_ingreso || 'Motivo no especificado en la orden.',
            activo: activoText,
            isVehiculo
        };
    };

    const detallesActivo = getDetallesActivoActual();

    // Validar si la orden seleccionada en el Modal está CERRADA
    const ordenActivaEnModal = isModalOpen ? ordenes.find(o => String(o.id) === String(formData.orden_id)) : null;
    const isOrdenCerrada = ordenActivaEnModal && ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(ordenActivaEnModal.estado);

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSearch className="text-indigo-600" size={28} /> Bandeja de Diagnósticos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión de dictámenes técnicos, videos y presupuestos.</p>
                </div>
                {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
                    <button onClick={() => { setRevisionEditar(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 font-bold shrink-0">
                        <Plus size={20} /> Nueva Revisión Manual
                    </button>
                )}
            </div>

            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col xl:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg flex-1 border border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                        <Search className="text-gray-400" size={20} />
                        <input type="text" placeholder="Buscar por diagnóstico, falla, orden, cliente..." className="w-full border-none outline-none text-gray-700 bg-transparent text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>

                    {auth.nombre_rol === 'ADMIN' && (
                        <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex-wrap sm:flex-nowrap">
                            <Filter size={16} className="text-indigo-600 ml-1 hidden sm:block" />
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-sm px-2 py-1.5 rounded outline-none border border-indigo-200" title="Fecha de inicio" />
                            <span className="text-indigo-600 font-bold">-</span>
                            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-sm px-2 py-1.5 rounded outline-none border border-indigo-200" title="Fecha fin (opcional)" />
                            <button onClick={buscarPorFechas} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1"><Search size={14} /> Buscar</button>
                            {(fechaInicio || fechaFin || busqueda) && (<button onClick={limpiarFiltros} className="bg-white text-gray-500 border border-gray-300 px-2 py-1.5 rounded text-sm hover:bg-gray-100" title="Limpiar Filtros"><X size={16} /></button>)}
                        </div>
                    )}
                </div>

                {auth.nombre_rol === 'ADMIN' && totalPeriodo > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">Costo Total de Revisiones en Periodo</p>
                            <h2 className="text-3xl font-black">${Number(totalPeriodo).toFixed(2)}</h2>
                        </div>
                        <FileSpreadsheet size={40} className="text-indigo-300 opacity-80" />
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Orden / Cliente</th>
                                <th className="px-6 py-4">Diagnóstico y Reporte</th>
                                <th className="px-6 py-4">Evidencia</th>
                                {auth.nombre_rol === 'ADMIN' && <th className="px-6 py-4">Costo Ref.</th>}
                                <th className="px-6 py-4">Técnico / Fecha</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {revisionesFiltradas.length > 0 ? (
                                revisionesFiltradas.map((rev) => {
                                    const ordenRelacionada = ordenes.find(o => String(o.id) === String(rev.orden_id));
                                    const motivoIngreso = rev.motivo_ingreso || ordenRelacionada?.motivo_ingreso || 'No especificado';
                                    const isRowCerrada = ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(rev.estado_orden);

                                    return (
                                        <tr key={rev.id} className={`hover:bg-indigo-50/50 transition-colors group ${isRowCerrada ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-indigo-700 flex items-center gap-2">
                                                    ORD-#{String(rev.orden_id).padStart(4, '0')}
                                                    {rev.estado_orden === 'DIAGNOSTICADO' && !isRowCerrada && (<span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">LISTO</span>)}
                                                    {isRowCerrada && (<span className="text-[9px] bg-slate-200 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded font-bold">CERRADO</span>)}
                                                </div>
                                                <div className="text-xs text-gray-800 font-bold mt-1">{rev.cliente_nombre || 'Desconocido'}</div>

                                                <div className="mt-2">
                                                    {ordenRelacionada?.vehiculo_id ? (
                                                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit" title="Vehículo">
                                                            <Car size={12} /> {ordenRelacionada.marca || ''} {ordenRelacionada.modelo || ''} - {ordenRelacionada.placa || ''}
                                                        </span>
                                                    ) : ordenRelacionada?.modulo_id ? (
                                                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit" title="Módulo ECU">
                                                            <Cpu size={12} /> ECU: {ordenRelacionada.serial_modulo || ordenRelacionada.tipo_modulo || 'Sin Serial'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Activo no especificado</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="mb-2">
                                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Falla Reportada:
                                                    </span>
                                                    <p className="text-xs font-semibold text-gray-800 line-clamp-1" title={motivoIngreso}>
                                                        {motivoIngreso}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Dictamen Técnico:</span>
                                                    {rev.diagnostico === 'Pendiente de diagnóstico...' ? (
                                                        <p className="text-gray-400 italic bg-gray-100 px-2 py-0.5 mt-1 rounded border border-gray-200 text-xs w-fit">Pendiente de rellenar...</p>
                                                    ) : (
                                                        <p className="line-clamp-2 max-w-xs text-sm text-gray-600" title={rev.diagnostico}>{rev.diagnostico}</p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {rev.video_diagnostico ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVerVideo(rev.video_diagnostico)}
                                                        className="flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                        title="Reproducir evidencia"
                                                    >
                                                        <Video size={16} /> Ver Video
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100">Sin video</span>
                                                )}
                                            </td>

                                            {auth.nombre_rol === 'ADMIN' && (
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-800 flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 w-fit">
                                                        $ {Number(rev.costo_revision).toFixed(2)}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700"><User size={14} className="text-gray-400" /> {rev.tecnico_nombre}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Calendar size={10} className="text-indigo-400" /> {formatearFecha(rev.fecha)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 transition-opacity">

                                                    {/* BOTÓN DINÁMICO: EDITAR / VER */}
                                                    {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'TECNICO') && (
                                                        <button
                                                            onClick={() => cargarDatosEdicion(rev)}
                                                            className={`p-2 rounded-lg transition-colors border ${isRowCerrada ? 'text-gray-500 bg-gray-50 hover:bg-gray-200 border-gray-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'}`}
                                                            title={isRowCerrada ? 'Ver Diagnóstico (Cerrado)' : (rev.diagnostico === 'Pendiente de diagnóstico...' ? 'Completar Diagnóstico' : 'Editar Diagnóstico')}
                                                        >
                                                            {isRowCerrada ? <FileText size={18} /> : <Pencil size={18} />}
                                                        </button>
                                                    )}

                                                    {/* BOTÓN TERMINAR DIAGNÓSTICO (Solo si NO está cerrada y está en REVISION) */}
                                                    {!isRowCerrada && (auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'TECNICO') && rev.estado_orden === 'EN_REVISION' && rev.diagnostico !== 'Pendiente de diagnóstico...' && (
                                                        <button onClick={() => handleCerrarDiagnostico(rev.id)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 flex items-center gap-1 font-bold text-sm" title="Finalizar Diagnóstico">
                                                            <CheckSquare size={18} /> <span className="hidden md:inline">Terminar</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (!cargando && <tr><td colSpan={auth.nombre_rol === 'ADMIN' ? "6" : "5"} className="px-6 py-20 text-center text-gray-400"><div className="text-lg font-medium text-gray-500 mb-1">Tu bandeja está limpia.</div><div className="text-sm">No tienes revisiones pendientes por diagnosticar.</div></td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {/* --- REPRODUCTOR DE VIDEO (MODAL) --- */}
            {isVideoPlayerOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsVideoPlayerOpen(false)}>
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsVideoPlayerOpen(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors"><X size={24} /></button>
                        <video src={selectedVideoURL} controls autoPlay className="w-full max-h-[80vh] rounded-xl shadow-2xl bg-black border border-gray-800">
                            Tu navegador no soporta la reproducción de este video.
                        </video>
                    </div>
                </div>
            )}

            {/* --- MODAL FORMULARIO EDICIÓN / VISUALIZACIÓN --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border-t-4 border-indigo-600 max-h-[95vh] overflow-y-auto">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {isOrdenCerrada ? <FileText size={18} className="text-gray-500" /> : (revisionEditar ? <Pencil size={18} className="text-indigo-600" /> : <FileSearch size={18} className="text-indigo-600" />)}
                                {revisionEditar ? (isOrdenCerrada ? 'Detalles del Diagnóstico (Cerrado)' : 'Completar / Editar Diagnóstico') : 'Registrar Nuevo Diagnóstico'}
                            </h3>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-5">

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden de Servicio *</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <select name="orden_id" value={formData.orden_id} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:text-gray-600 disabled:font-bold font-mono" disabled={revisionEditar} required>
                                        <option value="">-- Seleccionar Orden --</option>
                                        {ordenes.map(ord => <option key={ord.id} value={ord.id}>ORD-#{String(ord.id).padStart(4, '0')} - {ord.nombre_cliente}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* PANEL DE CONTEXTO PARA EL TÉCNICO */}
                            {formData.orden_id && detallesActivo && (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                                            {detallesActivo.isVehiculo ? <Car size={12} className="text-blue-500" /> : <Cpu size={12} className="text-purple-500" />}
                                            Equipo a Diagnosticar
                                        </label>
                                        <p className="text-sm font-bold text-slate-800 bg-white px-3 py-2 rounded border border-slate-200 shadow-sm inline-block">
                                            {detallesActivo.activo}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                                            <AlertTriangle size={12} /> Falla Reportada por el Cliente
                                        </label>
                                        <p className="text-sm font-medium text-red-800 italic bg-red-50/60 px-3 py-2 rounded border border-red-100">
                                            "{detallesActivo.falla}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Detalle del Diagnóstico *</label>
                                <textarea disabled={isOrdenCerrada} name="diagnostico" value={formData.diagnostico} onChange={handleChange} className="w-full border border-gray-300 bg-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 disabled:bg-gray-50 disabled:text-gray-600" placeholder="Describa los fallos encontrados, pruebas realizadas..." required></textarea>
                            </div>

                            {/* ZONA DRAG & DROP PARA VIDEO (Dinamica) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Video de Evidencia</label>

                                {isOrdenCerrada && !videoPreviewURL ? (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 italic text-center">
                                        No se adjuntó evidencia en video para este diagnóstico.
                                    </div>
                                ) : !videoPreviewURL ? (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current.click()}
                                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                                            ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                                        `}
                                    >
                                        <input type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                            <UploadCloud size={32} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
                                            <p className="text-sm text-gray-600 font-medium">Arrastra un video aquí o <span className="text-indigo-600 underline">explora</span></p>
                                            <p className="text-xs text-gray-400">MP4, WEBM hasta 50MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative border border-gray-200 rounded-xl p-2 bg-black flex items-center justify-center h-48 group overflow-hidden">
                                        <video src={videoPreviewURL} className="max-h-full max-w-full rounded-lg shadow-sm" controls />
                                        {!isOrdenCerrada && (
                                            <div className="absolute inset-0 bg-black/60  transition-opacity flex items-center justify-center">
                                                <button type="button" onClick={removerVideo} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                    <Trash2 size={16} /> Eliminar Video
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {auth.nombre_rol === 'ADMIN' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo de la Revisión ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input disabled={isOrdenCerrada} type="number" step="0.01" min="0" name="costo_revision" value={formData.costo_revision} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 disabled:bg-gray-100 disabled:text-gray-600" placeholder="0.00" />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={cerrarModal} className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors">
                                    {isOrdenCerrada ? 'Cerrar Detalles' : 'Cancelar'}
                                </button>
                                {!isOrdenCerrada && (
                                    <button type="submit" disabled={guardando} className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md font-bold disabled:bg-indigo-300 flex items-center gap-2 transition-colors">
                                        {guardando ? 'Guardando...' : 'Guardar Diagnóstico'}
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

export default Revisiones;