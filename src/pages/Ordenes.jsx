import { generarFacturaPDF } from '../utils/generarFactura';
import { socket } from '../socket';
import { useEffect, useState, useRef, useCallback } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
    ClipboardList, Search, Plus, Eye, Pencil, Trash2, X, Calendar,
    Car, Cpu, User, AlertCircle, CheckCircle, Clock, Wrench, FileText, Ban,
    UserCog, Users, Briefcase, UploadCloud, FileImage, Trash, DollarSign, PlusCircle,
    ListOrdered, AlertTriangle, XOctagon, Activity, Video, PackageCheck, Download, ShieldAlert
} from 'lucide-react';
import Spinner from '../componets/Spinner';

// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando sistema...</p>
//     </div>
// );

const EstadoBadge = ({ estado }) => {
    if (!estado) return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit uppercase tracking-wide bg-gray-50 text-gray-400 border-gray-200"><Clock size={12} /> SIN ESTADO</span>;

    const config = {
        'RECIBIDO': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ClipboardList },
        'EN_REVISION': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Search },
        'DIAGNOSTICADO': { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle },
        'PRESUPUESTADO': { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: FileText },
        'APROBADO': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
        'EN_REPARACION': { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Wrench },
        'TERMINADO': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
        'ENTREGADO': { color: 'bg-slate-200 text-slate-600 border-slate-300', icon: PackageCheck },
        'CANCELADO': { color: 'bg-red-100 text-red-700 border-red-200', icon: Ban },
        'RECHAZADO': { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XOctagon },
    };

    const { color, icon: Icon } = config[estado] || { color: 'bg-gray-50 text-gray-500 border-gray-200', icon: Clock };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit uppercase tracking-wide ${color}`}><Icon size={12} /> {String(estado).replace(/_/g, ' ')}</span>;
};

const Ordenes = () => {
    const { auth } = useAuth();

    const [ordenes, setOrdenes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [inventario, setInventario] = useState([]); // <-- NUEVO ESTADO
    const [vehiculos, setVehiculos] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [colaboradoresDb, setColaboradoresDb] = useState([]);

    const [detallesPresupuesto, setDetallesPresupuesto] = useState([]);
    const [vehiculosFiltrados, setVehiculosFiltrados] = useState([]);
    const [modulosFiltrados, setModulosFiltrados] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ordenEditar, setOrdenEditar] = useState(null);
    const [tipoServicio, setTipoServicio] = useState('VEHICULO');

    const [formData, setFormData] = useState({
        cliente_id: '', vehiculo_id: '', modulo_id: '', estado: 'RECIBIDO',
        motivo_ingreso: '', observaciones: '', tecnico_id: ''
    });

    const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
    const [ordenParaAsignar, setOrdenParaAsignar] = useState(null);
    const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('');
    const [colaboradoresSeleccionados, setColaboradoresSeleccionados] = useState([]);

    const [modalClienteOpen, setModalClienteOpen] = useState(false);
    const [modalVehiculoOpen, setModalVehiculoOpen] = useState(false);
    const [modalModuloOpen, setModalModuloOpen] = useState(false);
    const [modalColabOpen, setModalColabOpen] = useState(false);

    const [newCliente, setNewCliente] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
    const [newVehiculo, setNewVehiculo] = useState({ marca: '', modelo: '', placa: '', anio: '', vin: '', tipo_combustible: '' });
    const [newModulo, setNewModulo] = useState({
        tipo: '', marca: '', modelo: '', numero_parte: '', serial: '', observaciones: '', tipo_combustible: ''
    });
    const [tarifas, setTarifas] = useState([]);
    const [newColab, setNewColab] = useState({ nombre: '', especialidad: '', telefono: '' });

    const [isDragging, setIsDragging] = useState(false);
    const [archivoImagen, setArchivoImagen] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const fileInputRef = useRef(null);

    const [modalBitacoraOpen, setModalBitacoraOpen] = useState(false);
    const [ordenBitacora, setOrdenBitacora] = useState(null);
    const [datosBitacora, setDatosBitacora] = useState({ diagnostico: null, reparacion: null });
    const [cargandoBitacora, setCargandoBitacora] = useState(false);

    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const [selectedVideoURL, setSelectedVideoURL] = useState('');

    // ===========================================================================
    // ESTADOS Y FUNCIONES PARA EL PRESUPUESTO (DETALLES)
    // ===========================================================================
    const [isPresupuestoModalOpen, setIsPresupuestoModalOpen] = useState(false);
    const [ordenPresupuesto, setOrdenPresupuesto] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [cargandoDetalles, setCargandoDetalles] = useState(false);

    const [formDetalle, setFormDetalle] = useState({
        tipo_item: 'MANO_OBRA', descripcion: '', cantidad: 1, costo_unitario: '', precio_unitario: '', inventario_id: null
    });

    const abrirModalPresupuesto = (orden) => {
        setOrdenPresupuesto(orden);
        setIsPresupuestoModalOpen(true);
        obtenerDetalles(orden.id);
    };

    const cerrarModalPresupuesto = async () => {
        const idOrden = ordenPresupuesto?.id;
        const estadoActual = ordenPresupuesto?.estado;
        const ordenTemp = { ...ordenPresupuesto };
        const totalCalculado = detalles.reduce((acc, item) => acc + (Number(item.precio_unitario) * Number(item.cantidad)), 0);

        // 🛡️ BLINDAJE DE SINCRONIZACIÓN: Siempre guardamos el nuevo total de dinero al cerrar el modal
        if (idOrden && !['ENTREGADO', 'CANCELADO'].includes(estadoActual)) {
            try {
                // Lógica de estados: Solo auto-avanza a PRESUPUESTADO si estaba en etapas iniciales
                let nuevoEstado = estadoActual;
                if (detalles.length > 0 && ['RECIBIDO', 'EN_REVISION', 'DIAGNOSTICADO'].includes(estadoActual)) {
                    nuevoEstado = 'PRESUPUESTADO';
                }

                // Disparamos la actualización a la Base de Datos
                await clienteAxios.put(`/orders/update/${idOrden}`, {
                    cliente_id: ordenTemp.cliente_id,
                    vehiculo_id: ordenTemp.vehiculo_id,
                    modulo_id: ordenTemp.modulo_id,
                    estado: nuevoEstado, // Respeta si ya está en TERMINADO
                    motivo_ingreso: ordenTemp.motivo_ingreso,
                    observaciones: ordenTemp.observaciones,
                    tecnico_id: ordenTemp.tecnico_id,
                    monto_presupuesto: totalCalculado // 🔥 Aquí inyectamos los $380.00 a la tabla principal
                });

                // Solo mostramos la alerta si hubo un cambio de estado automático
                if (nuevoEstado !== estadoActual) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Pasó a Presupuestado', timer: 2000, showConfirmButton: false });
                }
            } catch (error) {
                console.error("Error al sincronizar monto del presupuesto", error);
            }
        }

        if (socket && socket.connected) {
            socket.emit('actualizacion_taller', { mensaje: 'Cambios en presupuesto' });
        }

        setIsPresupuestoModalOpen(false);
        setOrdenPresupuesto(null);
        setDetalles([]);
        setFormDetalle({ tipo_item: 'MANO_OBRA', descripcion: '', cantidad: 1, costo_unitario: '', precio_unitario: '' });

        obtenerDatos();
    };

    const obtenerDetalles = async (id) => {
        setCargandoDetalles(true);
        try {
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/orders/${id}/detalles?_t=${stamp}`);
            setDetalles(data.data || []);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los detalles', 'error');
        } finally {
            setCargandoDetalles(false);
        }
    };

    const handleAgregarDetalle = async (e) => {
        e.preventDefault();
        try {
            await clienteAxios.post(`/orders/${ordenPresupuesto.id}/detalles`, formDetalle);
            setFormDetalle({ tipo_item: 'MANO_OBRA', descripcion: '', cantidad: 1, costo_unitario: '', precio_unitario: '' });
            obtenerDetalles(ordenPresupuesto.id);
        } catch (error) {
            Swal.fire('Error', 'No se pudo agregar el ítem. Verifica los datos.', 'error');
        }
    };

    const handleEliminarDetalle = async (detalleId) => {
        try {
            await clienteAxios.delete(`/orders/${ordenPresupuesto.id}/detalles/${detalleId}`);
            obtenerDetalles(ordenPresupuesto.id);
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar el ítem', 'error');
        }
    };

    const totalPresupuesto = detalles.reduce((acc, item) => acc + (Number(item.precio_unitario) * Number(item.cantidad)), 0);
    const totalCosto = detalles.reduce((acc, item) => acc + (Number(item.costo_unitario) * Number(item.cantidad)), 0);
    const gananciaNeta = totalPresupuesto - totalCosto;

    const descargarRecibo = async (idOrden) => {
        try {
            Swal.fire({ title: 'Generando PDF...', text: 'Recopilando historial', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/orders/${idOrden}/receipt?_t=${stamp}`);
            generarFacturaPDF(data.data);
            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo generar el recibo.', 'error');
        }
    };

    const obtenerDatos = useCallback(async () => {
        const stamp = new Date().getTime();

        const [resOrd, resCli, resVeh, resMod, resUsers, resColab, resTarifas, resInv] = await Promise.allSettled([
            clienteAxios.get(`/orders?_t=${stamp}`),
            clienteAxios.get(`/clients/true?_t=${stamp}`),
            clienteAxios.get(`/vehicles?_t=${stamp}`),
            clienteAxios.get(`/modules?_t=${stamp}`),
            clienteAxios.get(`/users/active-technicians?_t=${stamp}`),
            clienteAxios.get(`/colaborators?_t=${stamp}`),
            clienteAxios.get(`/tariffs?_t=${stamp}`),
            clienteAxios.get(`/inventory?_t=${stamp}`)
        ]);

        if (resOrd.status === 'fulfilled') setOrdenes(Array.isArray(resOrd.value.data) ? resOrd.value.data : (resOrd.value.data.data || []));
        if (resCli.status === 'fulfilled') setClientes(Array.isArray(resCli.value.data) ? resCli.value.data : (resCli.value.data.data || []));
        if (resVeh.status === 'fulfilled') setVehiculos(Array.isArray(resVeh.value.data) ? resVeh.value.data : (resVeh.value.data.data || []));
        if (resMod.status === 'fulfilled') setModulos(Array.isArray(resMod.value.data) ? resMod.value.data : (resMod.value.data.data || []));
        if (resUsers.status === 'fulfilled') setTecnicos(Array.isArray(resUsers.value.data) ? resUsers.value.data : (resUsers.value.data.data || []));
        if (resColab.status === 'fulfilled') setColaboradoresDb(Array.isArray(resColab.value.data) ? resColab.value.data : (resColab.value.data.data || []));
        if (resTarifas.status === 'fulfilled') setTarifas(resTarifas.value.data.data || []);
        if (resInv?.status === 'fulfilled') setInventario(resInv.value.data.data || []);
        setCargando(false);
    }, []);

    useEffect(() => {
        obtenerDatos();

        const onActualizacion = () => {
            console.log("⚡ [Órdenes] Socket escuchado. Esperando 500ms para BD...");
            setTimeout(() => { obtenerDatos(); }, 500);
        };

        socket.on('actualizacion_taller', onActualizacion);
        return () => { socket.off('actualizacion_taller', onActualizacion); };
    }, [obtenerDatos]);

    useEffect(() => {
        if (formData.cliente_id) {
            setVehiculosFiltrados(vehiculos.filter(v => String(v.cliente_id) === String(formData.cliente_id)));
            setModulosFiltrados(modulos);
        } else {
            setVehiculosFiltrados([]);
            setModulosFiltrados([]);
        }
    }, [formData.cliente_id, vehiculos, modulos]);

    const handleMarcarEntregado = async (orden) => {

        // 🛡️ BLINDAJE ANTI-TRABAJO GRATIS: Exigir dinero si no es garantía
        if (!orden.orden_padre_id && Number(orden.monto_presupuesto || 0) <= 0) {
            return Swal.fire({
                icon: 'error',
                title: 'Falta Facturar',
                text: 'No puedes marcar como "Entregado" una orden con monto en $0.00 (a menos que sea por Garantía). Por favor, ve al botón del dólar ($) y genérale el presupuesto.'
            });
        }

        const { value: diasGarantia, isConfirmed } = await Swal.fire({
            title: '¿Entregar Equipo?',
            html: `
                <div class="text-left text-sm text-gray-600 mb-4">
                    ¿Confirmas que el equipo de <b>${orden.nombre_cliente}</b> ha sido entregado? Esto cerrará el ciclo de la orden.
                </div>
                <div class="text-left">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Días de Garantía Otorgados:</label>
                    <select id="swal-dias" class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-emerald-500 font-bold text-gray-700 bg-gray-50">
                        <option value="0">Sin Garantía</option>
                        <option value="15">15 Días</option>
                        <option value="30" selected>30 Días (1 Mes)</option>
                        <option value="90">90 Días (3 Meses)</option>
                        <option value="180">180 Días (6 Meses)</option>
                    </select>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, marcar como Entregado',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return document.getElementById('swal-dias').value;
            }
        });

        if (isConfirmed) {
            try {
                const payload = {
                    cliente_id: orden.cliente_id,
                    vehiculo_id: orden.vehiculo_id,
                    modulo_id: orden.modulo_id,
                    estado: 'ENTREGADO',
                    motivo_ingreso: orden.motivo_ingreso,
                    observaciones: orden.observaciones,
                    tecnico_id: orden.tecnico_id,
                    monto_presupuesto: orden.monto_presupuesto,
                    dias_garantia: diasGarantia
                };

                await clienteAxios.put(`/orders/update/${orden.id}`, payload);
                Swal.fire({ icon: 'success', title: '¡Entregado!', text: 'El reloj de la garantía ha comenzado.', timer: 2000, showConfirmButton: false });
                obtenerDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el estado a entregado.', 'error');
            }
        }
    };

    const handleGenerarGarantia = async (orden) => {
        const { value: motivo } = await Swal.fire({
            title: `Aplicar Garantía`,
            html: `Se generará una nueva orden a costo $0 basada en la orden <b>#${String(orden.id).padStart(4, '0')}</b>.<br><br>¿Cuál es el motivo de reingreso?`,
            input: 'textarea',
            inputPlaceholder: 'Ej: El cliente reporta que la falla de encendido regresó...',
            showCancelButton: true,
            confirmButtonColor: '#d97706',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Crear Orden de Garantía',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) return 'Debes ingresar el motivo reportado por el cliente.';
            }
        });

        if (motivo) {
            try {
                Swal.fire({ title: 'Generando...', text: 'Clonando expediente', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                await clienteAxios.post(`/orders/${orden.id}/garantia`, { motivo_ingreso: motivo });
                Swal.fire('¡Garantía Asignada!', 'La orden fue enviada directamente a Reparación con el técnico original.', 'success');
                await obtenerDatos();
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'No se pudo generar la garantía', 'error');
            }
        }
    };

    const abrirModalAsignacion = (orden) => {
        setOrdenParaAsignar(orden);
        setTecnicoSeleccionado(orden.tecnico_id ? String(orden.tecnico_id) : '');
        setColaboradoresSeleccionados(orden.colaboradores_ids ? String(orden.colaboradores_ids).split(',') : []);
        setModalAsignarOpen(true);
    };

    const handleCheckboxChange = (idStr) => {
        if (colaboradoresSeleccionados.includes(idStr)) {
            setColaboradoresSeleccionados(colaboradoresSeleccionados.filter(c => c !== idStr));
        } else {
            setColaboradoresSeleccionados([...colaboradoresSeleccionados, idStr]);
        }
    };

    const handleAsignarTecnico = async (e) => {
        e.preventDefault();
        if (!tecnicoSeleccionado) return Swal.fire('Error', 'Seleccione el técnico principal', 'warning');
        try {
            await clienteAxios.put(`/orders/assign/${ordenParaAsignar.id}`, {
                tecnico_id: Number(tecnicoSeleccionado),
                colaboradores: colaboradoresSeleccionados.map(Number)
            });

            // 📢 MAGIA EN TIEMPO REAL: Le gritamos al servidor que hubo un cambio
            if (socket && socket.connected) {
                socket.emit('actualizacion_taller', { mensaje: 'Nueva asignación técnica' });
            }

            Swal.fire({ icon: 'success', title: '¡Asignado!', timer: 2000, showConfirmButton: false });
            setModalAsignarOpen(false);
            obtenerDatos();
        } catch (error) {
            Swal.fire('Error', 'Fallo de asignación', 'error');
        }
    };

    const abrirBitacora = async (orden) => {
        setOrdenBitacora(orden);
        setModalBitacoraOpen(true);
        setCargandoBitacora(true);
        try {
            const stamp = new Date().getTime();
            const [resRev, resRep] = await Promise.allSettled([
                clienteAxios.get(`/reviews?_t=${stamp}`),
                clienteAxios.get(`/repairs?_t=${stamp}`)
            ]);

            let diagEncontrado = null;
            let repEncontrada = null;

            if (resRev.status === 'fulfilled') {
                const dataRevs = Array.isArray(resRev.value.data.data) ? resRev.value.data.data : (resRev.value.data || []);
                diagEncontrado = dataRevs.find(r => String(r.orden_id) === String(orden.id));
            }
            if (resRep.status === 'fulfilled') {
                const dataReps = Array.isArray(resRep.value.data.data) ? resRep.value.data.data : (resRep.value.data || []);
                repEncontrada = dataReps.find(r => String(r.orden_id) === String(orden.id));
            }

            setDatosBitacora({ diagnostico: diagEncontrado, reparacion: repEncontrada });
        } catch (error) {
            console.error("Error obteniendo bitácora:", error);
        } finally {
            setCargandoBitacora(false);
        }
    };

    const handleVerVideo = (videoName) => {
        if (!videoName) return;
        const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
        setSelectedVideoURL(`${baseURL}/uploads/${encodeURI(videoName)}`);
        setIsVideoPlayerOpen(true);
    };

    const agregarDetalle = () => setDetallesPresupuesto([...detallesPresupuesto, { tipo: 'REPUESTO', descripcion: '', monto: '' }]);
    const removerDetalle = (index) => { const nuevosDetalles = [...detallesPresupuesto]; nuevosDetalles.splice(index, 1); setDetallesPresupuesto(nuevosDetalles); };
    const cambiarValorDetalle = (index, campo, valor) => { const nuevosDetalles = [...detallesPresupuesto]; nuevosDetalles[index][campo] = valor; setDetallesPresupuesto(nuevosDetalles); };
    const calcularTotalPresupuesto = () => detallesPresupuesto.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);

    const cargarDatosEdicion = async (orden) => {
        setOrdenEditar(orden);
        const tipo = orden.vehiculo_id ? 'VEHICULO' : 'MODULO';
        setTipoServicio(tipo);
        setDetallesPresupuesto([]);

        setFormData({
            cliente_id: orden.cliente_id || '',
            vehiculo_id: orden.vehiculo_id || '',
            modulo_id: orden.modulo_id || '',
            estado: orden.estado,
            motivo_ingreso: orden.motivo_ingreso || '',
            observaciones: orden.observaciones || '',
            tecnico_id: orden.tecnico_id || ''
        });

        setIsModalOpen(true);
    };

    const handleSubmitOrden = async (e) => {
        e.preventDefault();
        if (!formData.cliente_id) return Swal.fire('Error', 'Seleccione un cliente', 'error');
        if (!formData.motivo_ingreso.trim()) return Swal.fire('Error', 'El motivo es obligatorio', 'error');

        if (tipoServicio === 'VEHICULO' && !formData.vehiculo_id) return Swal.fire('Error', 'Seleccione vehículo', 'error');
        if (tipoServicio === 'MODULO' && !formData.modulo_id) return Swal.fire('Error', 'Seleccione módulo', 'error');

        // 🛡️ BLINDAJE ANTI-SALTOS: No dejar pasar a etapas avanzadas sin cobrar
        const estadosCobro = ['PRESUPUESTADO', 'APROBADO', 'EN_REPARACION', 'TERMINADO', 'ENTREGADO'];
        const esGarantia = ordenEditar && ordenEditar.orden_padre_id;
        const montoActual = ordenEditar ? Number(ordenEditar.monto_presupuesto || 0) : 0;

        if (ordenEditar && estadosCobro.includes(formData.estado) && !esGarantia && montoActual <= 0) {
            return Swal.fire({
                icon: 'error',
                title: 'Alto ahí',
                text: `No puedes avanzar esta orden a "${formData.estado}" si el costo es $0.00. Cierra esta ventana y usa el botón del dólar ($) para hacer el presupuesto.`
            });
        }

        try {
            const payload = {
                cliente_id: Number(formData.cliente_id),
                vehiculo_id: (tipoServicio === 'VEHICULO' && formData.vehiculo_id) ? Number(formData.vehiculo_id) : null,
                modulo_id: (tipoServicio === 'MODULO' && formData.modulo_id) ? Number(formData.modulo_id) : null,
                estado: formData.estado || 'RECIBIDO',
                motivo_ingreso: formData.motivo_ingreso,
                observaciones: formData.observaciones,
                tecnico_id: formData.tecnico_id ? Number(formData.tecnico_id) : null,

                // 🛡️ BLINDAJE: Le decimos al backend que preserve el dinero exacto que ya tenía la orden
                monto_presupuesto: ordenEditar ? Number(ordenEditar.monto_presupuesto || 0) : 0
            };
            if (ordenEditar) {
                await clienteAxios.put(`/orders/update/${ordenEditar.id}`, payload);
                Swal.fire({ icon: 'success', title: '¡Actualizada!', timer: 1500, showConfirmButton: false });
            } else {
                // 1. CREAMOS LA ORDEN NORMALMENTE
                const { data } = await clienteAxios.post('/orders/create', payload);
                const nuevaOrdenId = data.data?.id || data.id || data.insertId;

                // 2. 🚀 MAGIA DEL TARIFADOR: AUTO-FACTURACIÓN DE DIAGNÓSTICO
                if (nuevaOrdenId && !esGarantia) {
                    let precioRevision = 0;
                    let nombreCategoria = "";

                    // A) Averiguamos la categoría del equipo seleccionado
                    if (tipoServicio === 'VEHICULO') {
                        const vehiculoSel = vehiculosFiltrados.find(v => String(v.id) === String(formData.vehiculo_id));
                        if (vehiculoSel) {
                            nombreCategoria = vehiculoSel.tipo_combustible; // Aquí tienes guardada la categoría tarifaria
                            const tarifa = tarifas.find(t => t.categoria === nombreCategoria && t.tipo_entidad === 'VEHICULO');
                            // 🔥 Corregido: Usamos tarifa.costo
                            if (tarifa) precioRevision = Number(tarifa.costo || 0);
                        }
                    } else {
                        const moduloSel = modulosFiltrados.find(m => String(m.id) === String(formData.modulo_id));
                        if (moduloSel) {
                            nombreCategoria = moduloSel.tipo_combustible;
                            const tarifa = tarifas.find(t => t.categoria === nombreCategoria && t.tipo_entidad === 'MODULO');
                            // 🔥 Corregido: Usamos tarifa.costo
                            if (tarifa) precioRevision = Number(tarifa.costo || 0);
                        }
                    }

                    // B) Si encontramos un costo en el tarifador, inyectamos el ítem a la factura
                    if (precioRevision > 0) {
                        try {
                            await clienteAxios.post(`/orders/${nuevaOrdenId}/detalles`, {
                                tipo_item: 'MANO_OBRA',
                                descripcion: `Revisión y Diagnóstico (${nombreCategoria})`,
                                cantidad: 1,
                                costo_unitario: 0,
                                precio_unitario: precioRevision
                            });

                            // Actualizamos el monto total de la orden principal para que se vea reflejado en la tabla
                            await clienteAxios.put(`/orders/update/${nuevaOrdenId}`, {
                                monto_presupuesto: precioRevision
                            });
                        } catch (err) {
                            console.warn("Aviso: No se pudo auto-generar la tarifa de revisión", err);
                        }
                    }
                }

                Swal.fire({ icon: 'success', title: '¡Orden Generada!', text: 'El equipo ha sido ingresado al taller.', timer: 2000, showConfirmButton: false });
            }

            setIsModalOpen(false);
            obtenerDatos();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar', 'error');
        }
    };
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); procesarArchivo(e.dataTransfer.files[0]); };
    const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

    const procesarArchivo = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imagen', 'error');
        setArchivoImagen(file);
        setPreviewURL(URL.createObjectURL(file));
    };

    const removerImagen = () => { setArchivoImagen(null); setPreviewURL(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
    const closeVehiculoModal = () => { setModalVehiculoOpen(false); setNewVehiculo({ marca: '', modelo: '', placa: '', anio: '', vin: '', tipo_combustible: 'GASOLINA' }); removerImagen(); }

    const saveQuickClient = async (e) => {
        e.preventDefault();
        if (!newCliente.nombre.trim()) {
            return Swal.fire('Atención', 'El nombre del cliente no puede estar vacío o contener solo espacios.', 'warning');
        }
        const payload = {
            ...newCliente,
            nombre: newCliente.nombre.trim(),
            email: newCliente.email.trim(),
            telefono: newCliente.telefono ? newCliente.telefono.trim() : '',
            direccion: newCliente.direccion ? newCliente.direccion.trim() : ''
        };

        try {
            const { data } = await clienteAxios.post('/clients/create', payload);
            obtenerDatos();
            const nuevoId = data.data?.id || data.id || data.insertId;
            setFormData({ ...formData, cliente_id: nuevoId });
            setModalClienteOpen(false);
            setNewCliente({ nombre: '', email: '', telefono: '', direccion: '' });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente creado', timer: 1500, showConfirmButton: false });
        } catch (error) {
            const mensajeBackend = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Error del servidor';
            Swal.fire('Error', `No se pudo crear: ${mensajeBackend}`, 'error');
        }
    };

    const saveQuickVehicle = async (e) => {
        e.preventDefault();
        if (!newVehiculo.placa.trim() || !newVehiculo.marca.trim() || !newVehiculo.modelo.trim()) {
            return Swal.fire('Atención', 'La placa, marca y modelo son obligatorios y no pueden estar vacíos.', 'warning');
        }
        const payload = new FormData();
        payload.append('cliente_id', formData.cliente_id);
        payload.append('marca', newVehiculo.marca.trim());
        payload.append('modelo', newVehiculo.modelo.trim());
        payload.append('anio', newVehiculo.anio);
        payload.append('placa', newVehiculo.placa.trim().toUpperCase());
        payload.append('vin', newVehiculo.vin ? newVehiculo.vin.trim().toUpperCase() : '');
        payload.append('tipo_combustible', newVehiculo.tipo_combustible);
        if (archivoImagen) payload.append('img_documento', archivoImagen);

        try {
            const { data } = await clienteAxios.post('/vehicles/create', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            obtenerDatos();
            setFormData({ ...formData, vehiculo_id: data.data?.id || data.id });
            closeVehiculoModal();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Vehículo creado', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'Fallo al guardar el vehículo', 'error');
        }
    };

    const saveQuickModule = async (e) => {
        e.preventDefault();
        if (!newModulo.tipo.trim() || !newModulo.serial.trim()) {
            return Swal.fire('Atención', 'El tipo de módulo y el serial no pueden estar vacíos.', 'warning');
        }
        const payload = new FormData();
        payload.append('cliente_id', formData.cliente_id);
        payload.append('tipo', newModulo.tipo.trim());
        payload.append('marca', newModulo.marca ? newModulo.marca.trim() : '');
        payload.append('modelo', newModulo.modelo ? newModulo.modelo.trim() : '');
        payload.append('numero_parte', newModulo.numero_parte ? newModulo.numero_parte.trim() : '');
        payload.append('serial', newModulo.serial.trim());
        payload.append('tipo_combustible', newModulo.tipo_combustible);
        payload.append('observaciones', newModulo.observaciones ? newModulo.observaciones.trim() : 'Ingreso rápido');
        if (archivoImagen) payload.append('img_documento', archivoImagen);

        try {
            const { data } = await clienteAxios.post('/modules/create', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            obtenerDatos();
            setFormData({ ...formData, modulo_id: data.data?.id || data.id });
            setModalModuloOpen(false);
            setNewModulo({ tipo: '', marca: '', modelo: '', numero_parte: '', serial: '', observaciones: '', tipo_combustible: 'GASOLINA' });
            removerImagen();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Módulo creado', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'Fallo al guardar el módulo', 'error');
        }
    };

    const saveQuickColab = async (e) => {
        e.preventDefault();
        if (!newColab.nombre) return Swal.fire('Error', 'Falta nombre', 'warning');
        try {
            await clienteAxios.post('/colaborators/create', newColab);
            obtenerDatos();
            setModalColabOpen(false);
            setNewColab({ nombre: '', especialidad: '', telefono: '' });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Colaborador creado', timer: 1500, showConfirmButton: false });
        } catch (error) { Swal.fire('Error', 'Fallo colaborador', 'error'); }
    };

    const ordenesFiltradas = ordenes.filter(o => {
        const matchSearch = String(o.id).includes(busqueda) || o.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase());
        const estadosInactivos = ['ENTREGADO', 'CANCELADO', 'RECHAZADO'];
        const matchEstado = mostrarHistorial ? true : !estadosInactivos.includes(o.estado);
        return matchSearch && matchEstado;
    });

    const isOrdenYaCerrada = ordenEditar && ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(ordenEditar.estado);

    // 🛡️ VARIABLE MAGICA PARA DETECTAR SI EL PRESUPUESTO ESTÁ CERRADO
    const isPresupuestoCerrado = ordenPresupuesto && ['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(ordenPresupuesto.estado);

    const formatearNumeroOrden = (orden) => {
        if (orden.orden_padre_id) {
            return (
                <div className="flex flex-col">
                    <span className="font-mono font-black text-amber-600">
                        #{String(orden.orden_padre_id).padStart(4, '0')}-{String(orden.indice_garantia).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded w-fit mt-0.5 font-bold">GARANTÍA</span>
                </div>
            );
        }
        return (
            <span className="font-mono font-bold text-gray-500">
                #{String(orden.id).padStart(4, '0')}
            </span>
        );
    };

    const calcularGarantiaRestante = (orden) => {
        if (orden.estado !== 'ENTREGADO' || !orden.fecha_entrega || !orden.dias_garantia || orden.dias_garantia === 0) return null;

        const fechaEntrega = new Date(orden.fecha_entrega);
        const fechaVencimiento = new Date(fechaEntrega.getTime() + (orden.dias_garantia * 24 * 60 * 60 * 1000));
        const hoy = new Date();

        const msRestantes = fechaVencimiento - hoy;
        const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
            return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black w-fit mt-1 flex items-center gap-1 shadow-sm"><Ban size={10} /> GARANTÍA VENCIDA</span>;
        }

        return (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black w-fit mt-1 flex items-center gap-1 shadow-sm">
                <ShieldAlert size={10} /> VÁLIDA: {diasRestantes} DÍAS RESTANTES
            </span>
        );
    };

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ClipboardList className="text-blue-600" size={28} /> Órdenes de Servicio
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión operativa del taller.</p>
                </div>
                {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
                    <button onClick={() => { setOrdenEditar(null); setIsModalOpen(true); setFormData({ cliente_id: '', vehiculo_id: '', modulo_id: '', estado: 'RECIBIDO', motivo_ingreso: '', observaciones: '', tecnico_id: '' }); setDetallesPresupuesto([]); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold shrink-0">
                        <Plus size={20} /> Nueva Orden
                    </button>
                )}
            </div>

            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg w-full sm:w-1/2 border border-gray-200 focus-within:border-blue-500 transition-all">
                        <Search className="text-gray-400" size={20} />
                        <input type="text" placeholder="Buscar por ID o Cliente..." className="w-full border-none outline-none text-gray-700 bg-transparent" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 select-none">
                        <input type="checkbox" checked={mostrarHistorial} onChange={() => setMostrarHistorial(!mostrarHistorial)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                        Ver Historial (Inactivas)
                    </label>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Cliente / Equipo Asignado</th>
                                <th className="px-6 py-4">Motivo Ingreso</th>
                                <th className="px-6 py-4">Equipo Técnico</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Costo Total</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ordenesFiltradas.length > 0 ? (
                                ordenesFiltradas.map((orden) => {
                                    const isCerrada = ['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(orden.estado);

                                    return (
                                        <tr key={orden.id} className={`hover:bg-blue-50/50 transition-colors group ${isCerrada ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                {formatearNumeroOrden(orden)}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{orden.nombre_cliente}</div>
                                                <div className="mt-1.5">
                                                    {orden.vehiculo_id ? (
                                                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit" title="Vehículo">
                                                            <Car size={12} /> Vehículo: {orden.marca || ''} {orden.modelo || ''} - {orden.placa || ''}
                                                        </span>
                                                    ) : orden.modulo_id ? (
                                                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit" title="Módulo ECU">
                                                            <Cpu size={12} /> ECU: {orden.tipo_modulo || ''} - {orden.serial_modulo || ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 italic bg-gray-50 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                                            Sin equipo registrado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600 line-clamp-2 max-w-[200px]" title={orden.motivo_ingreso}>
                                                    {orden.motivo_ingreso}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                {orden.tecnico_nombre ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-bold border border-blue-100 flex w-fit items-center gap-1" title="Técnico Principal">
                                                            <User size={12} /> {orden.tecnico_nombre}
                                                        </span>
                                                        {orden.colaboradores_nombres && (
                                                            <span className="text-[10px] text-orange-600 font-medium flex items-center gap-1 ml-1" title="Servicios Externos">
                                                                <Briefcase size={10} /> + {orden.colaboradores_nombres}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sin asignar</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <EstadoBadge estado={orden.estado} />
                                                    {calcularGarantiaRestante(orden)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {/* 🔓 AHORA MOSTRAMOS EL DINERO SIEMPRE QUE SEA MAYOR A CERO, SIN IMPORTAR EL ESTADO */}
                                                {Number(orden.monto_presupuesto) > 0 ? (
                                                    <span className={`font-bold px-2.5 py-1 rounded-md border w-fit whitespace-nowrap inline-block ${orden.estado === 'RECHAZADO' ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-gray-800 bg-green-50 border-green-200'}`}>
                                                        $ {Number(orden.monto_presupuesto).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100 whitespace-nowrap inline-block">
                                                        Por cotizar
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && orden.estado === 'ENTREGADO' && (
                                                        <button
                                                            onClick={() => handleGenerarGarantia(orden)}
                                                            className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg border border-amber-200 transition-colors shadow-sm"
                                                            title="Aplicar Garantía"
                                                        >
                                                            <ShieldAlert size={18} />
                                                        </button>
                                                    )}

                                                    {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') &&
                                                        (orden.estado === 'TERMINADO' || orden.estado === 'RECHAZADO') && (
                                                            <button onClick={() => handleMarcarEntregado(orden)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 transition-colors shadow-sm" title="Marcar como Entregado al Cliente">
                                                                <PackageCheck size={18} />
                                                            </button>
                                                        )}

                                                    {orden.estado !== 'RECIBIDO' && (
                                                        <button onClick={() => abrirBitacora(orden)} className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Ver Detalles Técnicos">
                                                            <Eye size={18} />
                                                        </button>
                                                    )}

                                                    {!isCerrada && (auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
                                                        <button onClick={() => abrirModalAsignacion(orden)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Asignar Equipo Técnico"><UserCog size={18} /></button>
                                                    )}

                                                    <button onClick={() => cargarDatosEdicion(orden)} className={`p-2 ${isCerrada ? 'text-gray-500 hover:bg-gray-200' : 'text-blue-600 hover:bg-blue-100'} rounded-lg transition-colors`} title={isCerrada ? "Ver Orden" : "Editar Orden"}>
                                                        {isCerrada ? <FileText size={18} /> : <Pencil size={18} />}
                                                    </button>

                                                    {/* BOTÓN PARA ABRIR PRESUPUESTO */}
                                                    <button
                                                        onClick={() => abrirModalPresupuesto(orden)}
                                                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                                        title="Presupuestar / Ver Costos"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>

                                                    {['TERMINADO', 'ENTREGADO', 'RECHAZADO'].includes(orden.estado) && (
                                                        <button
                                                            onClick={() => descargarRecibo(orden.id)}
                                                            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-200 transition-colors shadow-sm"
                                                            title="Descargar Recibo (PDF)"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (!cargando && <tr><td colSpan="7" className="px-6 py-20 text-center text-gray-400">No hay órdenes registradas bajo este criterio.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {/* --- REPRODUCTOR DE VIDEO FULLSCREEN --- */}
            {isVideoPlayerOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in" onClick={() => setIsVideoPlayerOpen(false)}>
                    <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsVideoPlayerOpen(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors">
                            <X size={24} />
                        </button>
                        <video src={selectedVideoURL} controls autoPlay className="w-full max-h-[80vh] rounded-xl shadow-2xl bg-black border border-gray-800">
                            Tu navegador no soporta la reproducción de este video.
                        </video>
                    </div>
                </div>
            )}

            {/* --- MODAL BITÁCORA TÉCNICA --- */}
            {modalBitacoraOpen && ordenBitacora && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden">

                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Activity size={20} className="text-blue-400" /> Bitácora Técnica
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">
                                    {ordenBitacora.orden_padre_id ? `ORD-#${String(ordenBitacora.orden_padre_id).padStart(4, '0')}-${String(ordenBitacora.indice_garantia).padStart(2, '0')}` : `ORD-#${String(ordenBitacora.id).padStart(4, '0')}`} | {ordenBitacora.nombre_cliente}
                                </p>
                            </div>
                            <button onClick={() => setModalBitacoraOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                            {cargandoBitacora ? (
                                <div className="py-10 text-center text-slate-500 text-sm font-medium animate-pulse">Recopilando reportes del técnico...</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* BLOQUE 1: FALLA */}
                                    <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm relative">
                                        <div className="absolute -left-[18px] top-4 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center border-4 border-slate-50"><AlertTriangle size={14} className="text-red-600" /></div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pl-4">1. Falla Reportada por Cliente</h4>
                                        <p className="text-sm font-medium text-slate-700 pl-4">{ordenBitacora.motivo_ingreso}</p>
                                    </div>

                                    {/* BLOQUE 2: DIAGNÓSTICO */}
                                    <div className="bg-white p-4 rounded-xl border-l-4 border-indigo-500 shadow-sm relative">
                                        <div className="absolute -left-[18px] top-4 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-slate-50"><Search size={14} className="text-indigo-600" /></div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pl-4">2. Diagnóstico del Técnico</h4>
                                        {datosBitacora.diagnostico ? (
                                            <div className="pl-4">
                                                <p className="text-sm font-medium text-slate-700 italic">{datosBitacora.diagnostico.diagnostico}</p>
                                                {datosBitacora.diagnostico.video_diagnostico && (
                                                    <div className="mt-3">
                                                        <button onClick={() => handleVerVideo(datosBitacora.diagnostico.video_diagnostico)} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm w-fit">
                                                            <Video size={14} /> Ver Evidencia (Diagnóstico)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic pl-4">El equipo aún no ha sido diagnosticado por el técnico.</p>
                                        )}
                                    </div>

                                    {/* BLOQUE 3: REPARACIÓN */}
                                    <div className="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm relative">
                                        <div className="absolute -left-[18px] top-4 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-slate-50"><Wrench size={14} className="text-emerald-600" /></div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pl-4">3. Trabajo de Reparación</h4>
                                        {datosBitacora.reparacion ? (
                                            <div className="pl-4">
                                                <p className="text-sm font-medium text-slate-700">{datosBitacora.reparacion.descripcion}</p>
                                                {datosBitacora.reparacion.video_reparacion && (
                                                    <div className="mt-3">
                                                        <button onClick={() => handleVerVideo(datosBitacora.reparacion.video_reparacion)} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm w-fit">
                                                            <Video size={14} /> Ver Evidencia (Reparación)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic pl-4">La reparación aún no ha sido iniciada o registrada.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL ORDEN (CREAR/EDITAR) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-gray-800">
                                {ordenEditar ? (isOrdenYaCerrada ? 'Detalles de la Orden (Cerrada)' : 'Editar Orden') : 'Nueva Orden de Servicio'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmitOrden} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 flex justify-center pb-2">
                                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                                    <button type="button" disabled={isOrdenYaCerrada} onClick={() => setTipoServicio('VEHICULO')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tipoServicio === 'VEHICULO' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Vehículo</button>
                                    <button type="button" disabled={isOrdenYaCerrada} onClick={() => setTipoServicio('MODULO')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tipoServicio === 'MODULO' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>Módulo ECU</button>
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente *</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <select disabled={isOrdenYaCerrada} name="cliente_id" value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-gray-100">
                                            <option value="">-- Seleccionar --</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    {!isOrdenYaCerrada && (
                                        <button type="button" onClick={() => setModalClienteOpen(true)} className="bg-green-100 text-green-600 hover:bg-green-200 p-2 rounded-lg border border-green-200" title="Nuevo Cliente"><Plus size={20} /></button>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{tipoServicio === 'VEHICULO' ? 'Vehículo *' : 'Módulo *'}</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        {tipoServicio === 'VEHICULO' ? <Car className="absolute left-3 top-2.5 text-gray-400" size={16} /> : <Cpu className="absolute left-3 top-2.5 text-gray-400" size={16} />}
                                        <select
                                            name={tipoServicio === 'VEHICULO' ? 'vehiculo_id' : 'modulo_id'}
                                            value={tipoServicio === 'VEHICULO' ? formData.vehiculo_id : formData.modulo_id}
                                            onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                                            className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-70"
                                            disabled={(!formData.cliente_id && tipoServicio === 'VEHICULO') || isOrdenYaCerrada}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {tipoServicio === 'VEHICULO' ? vehiculosFiltrados.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</option>) : modulosFiltrados.map(m => <option key={m.id} value={m.id}>{m.tipo} - {m.serial}</option>)}
                                        </select>
                                    </div>
                                    {!isOrdenYaCerrada && (
                                        <button type="button" onClick={() => { if (!formData.cliente_id) return Swal.fire('Atención', 'Seleccione cliente', 'warning'); tipoServicio === 'VEHICULO' ? setModalVehiculoOpen(true) : setModalModuloOpen(true); }} className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 rounded-lg border border-blue-200" title={`Nuevo ${tipoServicio}`}><Plus size={20} /></button>
                                    )}
                                </div>
                            </div>

                            {ordenEditar && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado de la Orden</label>
                                    <select disabled={isOrdenYaCerrada} name="estado" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full border border-gray-200 bg-blue-50 text-blue-800 font-bold rounded-lg px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-600">
                                        <option value="RECIBIDO">RECIBIDO</option>
                                        <option value="EN_REVISION">EN REVISIÓN</option>
                                        <option value="DIAGNOSTICADO">DIAGNOSTICADO</option>
                                        <option value="PRESUPUESTADO">PRESUPUESTADO</option>
                                        <option value="APROBADO">APROBADO</option>
                                        <option value="EN_REPARACION">EN REPARACIÓN</option>
                                        <option value="TERMINADO">TERMINADO</option>
                                        <option value="ENTREGADO">ENTREGADO</option>
                                        <option value="RECHAZADO">RECHAZADO POR CLIENTE</option>
                                        <option value="CANCELADO">CANCELADO (ANULADO)</option>
                                    </select>
                                </div>
                            )}
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo Ingreso *</label>
                                <input disabled={isOrdenYaCerrada} type="text" name="motivo_ingreso" value={formData.motivo_ingreso} onChange={(e) => setFormData({ ...formData, motivo_ingreso: e.target.value })} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none disabled:opacity-70" required />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observaciones / Detalles Visuales</label>
                                <textarea disabled={isOrdenYaCerrada} name="observaciones" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none h-20 disabled:opacity-70"></textarea>
                            </div>
                            <div className="col-span-2 flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors">
                                    {isOrdenYaCerrada ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {!isOrdenYaCerrada && (
                                    <button type="submit" className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md font-bold">Guardar Orden</button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL ASIGNAR TÉCNICO --- */}
            {modalAsignarOpen && ordenParaAsignar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border-2 border-indigo-100 overflow-hidden">
                        <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                            <h4 className="font-bold text-indigo-900 flex items-center gap-2"><UserCog size={18} /> Asignar Equipo Técnico</h4>
                            <button onClick={() => setModalAsignarOpen(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
                        </div>
                        <div className="p-5">
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-5 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Detalle del Trabajo</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <User size={14} className="text-gray-400" />
                                    <span className="text-sm font-bold text-gray-800">{ordenParaAsignar.nombre_cliente}</span>
                                </div>
                                <div className="mb-3">
                                    {ordenParaAsignar.vehiculo_id ? (
                                        <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                            <Car size={12} /> Vehículo: {ordenParaAsignar.placa || 'Sin Placa'}
                                        </span>
                                    ) : ordenParaAsignar.modulo_id ? (
                                        <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                            <Cpu size={12} /> Módulo: {ordenParaAsignar.serial_modulo || 'Sin Serial'}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="bg-red-50 border-l-2 border-red-400 p-2 rounded">
                                    <span className="text-[9px] font-bold text-red-600 uppercase flex items-center gap-1"><AlertTriangle size={10} /> Falla Reportada:</span>
                                    <p className="text-xs text-red-800 font-medium italic mt-0.5">{ordenParaAsignar.motivo_ingreso}</p>
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Técnico Principal (Nómina) *</label>
                                <select value={tecnicoSeleccionado} onChange={(e) => setTecnicoSeleccionado(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-bold text-gray-700">
                                    <option value="">-- Seleccionar Técnico --</option>
                                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase items-center gap-1"><Briefcase size={14} className="inline mr-1" /> Especialistas Externos (Opcional)</label>
                                    <button type="button" onClick={() => setModalColabOpen(true)} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded"><Plus size={12} /> Nuevo</button>
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
                                    {colaboradoresDb.length > 0 ? (
                                        colaboradoresDb.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-orange-50 p-1.5 rounded transition-colors border border-transparent hover:border-orange-200">
                                                <input type="checkbox" className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" checked={colaboradoresSeleccionados.includes(String(c.id))} onChange={() => handleCheckboxChange(String(c.id))} />
                                                <div><span className="font-bold block">{c.nombre}</span><span className="text-[10px] text-gray-500 uppercase">{c.especialidad || 'General'}</span></div>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic p-2 text-center">No hay colaboradores externos registrados.</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={handleAsignarTecnico} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all flex justify-center gap-2 mt-2">
                                <CheckCircle size={18} /> Confirmar Asignación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CLIENTE */}
            {modalClienteOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
                        <form onSubmit={saveQuickClient} className="p-5 space-y-3">
                            <div className="flex justify-between items-center border-b pb-2 mb-2">
                                <h4 className="font-bold text-green-700 flex items-center gap-2"><User size={18} /> Nuevo Cliente</h4>
                                <button type="button" onClick={() => setModalClienteOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                            </div>
                            <input placeholder="Nombre Completo *" value={newCliente.nombre} onChange={e => setNewCliente({ ...newCliente, nombre: e.target.value })} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-green-500" required />
                            <input type="email" placeholder="Email *" value={newCliente.email} onChange={e => setNewCliente({ ...newCliente, email: e.target.value })} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-green-500" required />
                            <input placeholder="Teléfono" value={newCliente.telefono} onChange={e => setNewCliente({ ...newCliente, telefono: e.target.value })} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-green-500" />
                            <div className="flex gap-2 pt-3">
                                <button type="button" onClick={() => setModalClienteOpen(false)} className="w-full text-gray-500 bg-gray-100 p-2.5 rounded font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 font-bold text-white p-2.5 rounded shadow transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL VEHICULO */}
            {modalVehiculoOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 overflow-y-auto animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-md my-8 shadow-2xl">
                        <form onSubmit={saveQuickVehicle} className="p-5 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h4 className="font-bold text-blue-700 flex items-center gap-2"><Car size={18} /> Registro Rápido de Vehículo</h4>
                                <button type="button" onClick={closeVehiculoModal} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="Placa *" value={newVehiculo.placa} onChange={e => setNewVehiculo({ ...newVehiculo, placa: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" required />
                                <select value={newVehiculo.tipo_combustible} onChange={e => setNewVehiculo({ ...newVehiculo, tipo_combustible: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" required>
                                    <option value="">-- Categoría / Tarifa --</option>
                                    {tarifas.filter(t => t.tipo_entidad === 'VEHICULO').map(tarifa => (
                                        <option key={tarifa.id} value={tarifa.categoria}>{tarifa.categoria}</option>
                                    ))}
                                </select>
                                <input placeholder="Marca *" value={newVehiculo.marca} onChange={e => setNewVehiculo({ ...newVehiculo, marca: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                                <input placeholder="Modelo *" value={newVehiculo.modelo} onChange={e => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                                <input placeholder="Año *" type="number" value={newVehiculo.anio} onChange={e => setNewVehiculo({ ...newVehiculo, anio: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                                <input placeholder="VIN / Chasis" value={newVehiculo.vin} onChange={e => setNewVehiculo({ ...newVehiculo, vin: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                            </div>
                            <div className="border-t pt-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Doc. Identidad del Propietario</label>
                                {!previewURL ? (
                                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                        <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                                            <UploadCloud size={24} className={isDragging ? 'text-blue-500' : 'text-gray-400'} />
                                            <p className="text-xs text-gray-600 font-medium">Arrastra la foto o haz clic</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center h-32 group overflow-hidden">
                                        <img src={previewURL} alt="Previa" className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
                                        <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={removerImagen} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-red-600"><Trash size={14} /> Quitar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={closeVehiculoModal} className="w-full text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-white p-2 rounded shadow transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL MODULO */}
            {modalModuloOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 overflow-y-auto animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-md my-8 shadow-2xl">
                        <form onSubmit={saveQuickModule} className="p-5 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h4 className="font-bold text-purple-700 flex items-center gap-2"><Cpu size={18} /> Registro Rápido de Módulo</h4>
                                <button type="button" onClick={() => { setModalModuloOpen(false); removerImagen(); }} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="Tipo (Ej: ECU) *" value={newModulo.tipo} onChange={e => setNewModulo({ ...newModulo, tipo: e.target.value })} className="col-span-2 w-full border p-2 rounded focus:ring-2 focus:ring-purple-500 outline-none" required />
                                <input placeholder="Serial *" value={newModulo.serial} onChange={e => setNewModulo({ ...newModulo, serial: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500 outline-none font-bold" required />
                                <select value={newModulo.tipo_combustible} onChange={e => setNewModulo({ ...newModulo, tipo_combustible: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500 outline-none text-gray-700 font-bold" required>
                                    <option value="">-- Categoría / Tarifa --</option>
                                    {tarifas.filter(t => t.tipo_entidad === 'MODULO').map(tarifa => (
                                        <option key={tarifa.id} value={tarifa.categoria}>{tarifa.categoria}</option>
                                    ))}
                                </select>
                                <input placeholder="Marca" value={newModulo.marca} onChange={e => setNewModulo({ ...newModulo, marca: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500 outline-none" />
                                <input placeholder="Modelo" value={newModulo.modelo} onChange={e => setNewModulo({ ...newModulo, modelo: e.target.value })} className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div className="border-t pt-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foto Referencia del Módulo</label>
                                {!previewURL ? (
                                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                        <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                                            <UploadCloud size={24} className={isDragging ? 'text-purple-500' : 'text-gray-400'} />
                                            <p className="text-xs text-gray-600 font-medium">Arrastra la foto o haz clic</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center h-32 group overflow-hidden">
                                        <img src={previewURL} alt="Previa" className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
                                        <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={removerImagen} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-red-600"><Trash size={14} /> Quitar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => { setModalModuloOpen(false); removerImagen(); }} className="w-full text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 font-bold text-white p-2 rounded shadow transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL COLABORADOR */}
            {modalColabOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border-t-4 border-indigo-500 overflow-hidden">
                        <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                            <h4 className="font-bold text-indigo-800 flex items-center gap-2"><Briefcase size={18} /> Nuevo Especialista</h4>
                            <button type="button" onClick={() => setModalColabOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveQuickColab} className="p-5 space-y-3">
                            <input placeholder="Nombre Completo *" value={newColab.nombre} onChange={e => setNewColab({ ...newColab, nombre: e.target.value })} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700" required />
                            <input placeholder="Especialidad (Ej: Tornero, Cerrajero)" value={newColab.especialidad} onChange={e => setNewColab({ ...newColab, especialidad: e.target.value })} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700" />
                            <input placeholder="Teléfono" value={newColab.telefono} onChange={e => setNewColab({ ...newColab, telefono: e.target.value })} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700" />
                            <div className="flex gap-2 pt-3">
                                <button type="button" onClick={() => setModalColabOpen(false)} className="w-full text-gray-600 bg-gray-100 hover:bg-gray-200 p-2.5 rounded-lg font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg shadow transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ================================================================================= */}
            {/* MODAL DE PRESUPUESTO Y COSTOS (TIPO FACTURADOR) */}
            {/* ================================================================================= */}

            {isPresupuestoModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">

                        {/* CABECERA DEL MODAL */}
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <DollarSign className="text-emerald-400" /> Presupuesto Detallado
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    Orden #{String(ordenPresupuesto?.id).padStart(4, '0')} — {ordenPresupuesto?.nombre_cliente}
                                </p>
                            </div>
                            <button onClick={cerrarModalPresupuesto} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        {/* CUERPO DIVIDIDO EN 2 COLUMNAS */}
                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                            {/* COLUMNA IZQUIERDA: FORMULARIO */}
                            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-wider">Agregar Ítem</h4>

                                {/* 🛡️ BLINDAJE: Solo mostramos el formulario si la orden NO está cerrada */}
                                {!isPresupuestoCerrado ? (
                                    <form onSubmit={handleAgregarDetalle} className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo de Ítem</label>
                                            <select
                                                value={formDetalle.tipo_item}
                                                onChange={e => setFormDetalle({ ...formDetalle, tipo_item: e.target.value })}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-sm"
                                            >
                                                <option value="MANO_OBRA">Mano de Obra</option>
                                                <option value="REPUESTO">Repuesto / Pieza</option>
                                                <option value="TERCEROS">Servicio Externo (Terceros)</option>
                                                <option value="OTROS">Otros Gastos</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                                {['REPUESTO', 'INSUMO'].includes(formDetalle.tipo_item) ? 'Seleccionar Producto *' : 'Descripción *'}
                                            </label>

                                            {/* MAGIA: Si es Repuesto, mostramos el Select del Inventario */}
                                            {['REPUESTO', 'INSUMO'].includes(formDetalle.tipo_item) ? (
                                                <select
                                                    required
                                                    value={formDetalle.inventario_id || ''}
                                                    onChange={(e) => {
                                                        const idSeleccionado = e.target.value;
                                                        const producto = inventario.find(i => String(i.id) === String(idSeleccionado));

                                                        if (producto) {
                                                            setFormDetalle({
                                                                ...formDetalle,
                                                                inventario_id: producto.id,
                                                                descripcion: producto.nombre,
                                                                costo_unitario: producto.costo_unitario, // Autocompleta Costo
                                                                precio_unitario: producto.precio_venta   // Autocompleta Precio Venta
                                                            });
                                                        } else {
                                                            setFormDetalle({ ...formDetalle, inventario_id: null, descripcion: '', costo_unitario: '', precio_unitario: '' });
                                                        }
                                                    }}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm"
                                                >
                                                    <option value="">-- Buscar en Inventario --</option>
                                                    {inventario.filter(i => i.activo).map(item => (
                                                        <option key={item.id} value={item.id} disabled={Number(item.stock_actual) <= 0}>
                                                            {item.codigo ? `[${item.codigo}] ` : ''}{item.nombre} - Disp: {item.stock_actual}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                /* Si es Mano de Obra, mostramos el Input de texto normal */
                                                <input
                                                    type="text" required placeholder="Ej: Reparación de pistas..."
                                                    value={formDetalle.descripcion}
                                                    onChange={e => setFormDetalle({ ...formDetalle, descripcion: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                                                />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                                                <input
                                                    type="number" step="0.01" min="0.01" required
                                                    value={formDetalle.cantidad}
                                                    onChange={e => setFormDetalle({ ...formDetalle, cantidad: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm font-mono"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-red-500 uppercase mb-1" title="Lo que le cuesta al taller">Costo Taller ($)</label>
                                                <input
                                                    type="number" step="0.01" min="0" required placeholder="0.00"
                                                    value={formDetalle.costo_unitario}
                                                    onChange={e => setFormDetalle({ ...formDetalle, costo_unitario: e.target.value })}
                                                    className="w-full border border-red-200 bg-red-50 rounded-lg px-3 py-2 outline-none focus:border-red-500 text-sm font-mono font-bold text-red-700"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-emerald-600 uppercase mb-1" title="Lo que se le cobra al cliente">Precio Cliente ($)</label>
                                                <input
                                                    type="number" step="0.01" min="0" required placeholder="0.00"
                                                    value={formDetalle.precio_unitario}
                                                    onChange={e => setFormDetalle({ ...formDetalle, precio_unitario: e.target.value })}
                                                    className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-mono font-bold text-emerald-700"
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm mt-2">
                                            <Plus size={16} /> Agregar al Presupuesto
                                        </button>
                                    </form>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-center font-bold text-sm mb-4">
                                        🔒 Esta orden está en estado {ordenPresupuesto?.estado}. El presupuesto está bloqueado por seguridad y no puede ser alterado.
                                    </div>
                                )}
                            </div>

                            {/* COLUMNA DERECHA: LA FACTURA / LISTA DE DETALLES */}
                            <div className="w-full md:w-2/3 flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-0">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3">Descripción</th>
                                                <th className="px-4 py-3 text-center">Cant.</th>
                                                <th className="px-4 py-3 text-right text-red-500" title="Costo Operativo">Costo U.</th>
                                                <th className="px-4 py-3 text-right text-emerald-600">Precio U.</th>
                                                <th className="px-4 py-3 text-right text-slate-900">Subtotal</th>
                                                <th className="px-4 py-3 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {cargandoDetalles ? (
                                                <tr><td colSpan="6" className="text-center py-10 text-slate-400">Cargando detalles...</td></tr>
                                            ) : detalles.length > 0 ? (
                                                detalles.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className="font-bold text-slate-800 block">{item.descripcion}</span>
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.tipo_item}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">{Number(item.cantidad)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-red-500">${Number(item.costo_unitario).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-emerald-600">${Number(item.precio_unitario).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">${(Number(item.precio_unitario) * Number(item.cantidad)).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {!isPresupuestoCerrado && (
                                                                <button onClick={() => handleEliminarDetalle(item.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors" title="Borrar ítem">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" className="text-center py-12 text-slate-400 italic">No hay ítems registrados en el presupuesto.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* TABLERO DE RESULTADOS FINALES (FOOTER) */}
                                <div className="bg-slate-50 p-5 border-t border-slate-200 grid grid-cols-3 gap-4 shrink-0">
                                    <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm text-center">
                                        <p className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Costo Operativo</p>
                                        <p className="text-xl font-mono font-black text-slate-800 mt-1">${totalCosto.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm text-center">
                                        <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Total Presupuesto</p>
                                        <p className="text-xl font-mono font-black text-slate-800 mt-1">${totalPresupuesto.toFixed(2)}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg shadow-sm text-center border ${gananciaNeta > 0 ? 'bg-emerald-50 border-emerald-200' : gananciaNeta < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-100 border-slate-200'}`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${gananciaNeta > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>Ganancia Neta</p>
                                        <p className={`text-xl font-mono font-black mt-1 ${gananciaNeta > 0 ? 'text-emerald-600' : gananciaNeta < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                            ${gananciaNeta.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ordenes;