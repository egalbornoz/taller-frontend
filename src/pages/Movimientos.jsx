import { useEffect, useState, useCallback } from 'react';
import clienteAxios from '../api/axios';
import Swal from 'sweetalert2';
import { TrendingDown, TrendingUp, Plus, X, DollarSign } from 'lucide-react';
import { socket } from '../socket'; // <-- Tu conexión centralizada perfecta

const Movimientos = () => {
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ tipo: 'EGRESO', concepto: '', monto: '' });

    // 1. Envolvemos la llamada a la API en useCallback (buena práctica Senior para UseEffect)
    const obtenerMovimientos = useCallback(async () => {
        try {
            // Añadimos el _t para evitar que el navegador guarde los datos viejos en caché
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/movements?_t=${stamp}`);
            setMovimientos(data.data || []);
        } catch (error) {
            console.error("Error cargando finanzas:", error);
        } finally {
            setCargando(false);
        }
    }, []);

    // 2. EL HOOK MAESTRO (Aquí va el Socket)
    useEffect(() => {
        // A) Carga inicial de datos
        obtenerMovimientos();

        // B) Ponemos la oreja a escuchar APENAS se abre la pantalla
        const escucharCambios = () => {
            console.log("⚡ ¡Grito del Backend escuchado! Recargando Movimientos...");
            // Le damos 300ms de respiro a la base de datos para que termine de guardar antes de consultar
            setTimeout(() => {
                obtenerMovimientos();
            }, 300); 
        };

        socket.on('actualizacion_taller', escucharCambios);

        // C) Limpiamos la oreja cuando cerramos la pantalla o cambiamos de menú
        return () => {
            socket.off('actualizacion_taller', escucharCambios);
        };
    }, [obtenerMovimientos]); 

    // 3. LA FUNCIÓN DE GUARDAR (Ya sin el Socket adentro)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await clienteAxios.post('/movements/create', formData);
            Swal.fire({ icon: 'success', title: '¡Registrado!', timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            setFormData({ tipo: 'EGRESO', concepto: '', monto: '' });
            
            // Emitimos el grito para que las demás pantallas se enteren
            if (socket && socket.connected) {
                socket.emit('actualizacion_taller', { mensaje: 'Nuevo gasto manual registrado' });
            }
            
            obtenerMovimientos(); // Recargamos nuestra propia tabla
        } catch (error) {
            Swal.fire('Error', 'No se pudo registrar el movimiento', 'error');
        }
    };

    const formatearFecha = (fecha) => new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fecha));

    return (
        <div className="fade-in">
            {/* ... Todo tu código de Renderizado (UI) queda exactamente igual ... */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" size={28} /> Finanzas y Gastos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Registra salidas de dinero como compras o pagos de servicios.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold">
                    <Plus size={20} /> Registrar Gasto
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Concepto (Motivo)</th>
                            <th className="px-6 py-4">Registrado por</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {movimientos.map(mov => (
                            <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-xs">{formatearFecha(mov.created_at)}</td>
                                <td className="px-6 py-4">
                                    {mov.tipo === 'EGRESO'
                                        ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-[10px] flex items-center gap-1 w-fit"><TrendingDown size={12} /> EGRESO</span>
                                        : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold text-[10px] flex items-center gap-1 w-fit"><TrendingUp size={12} /> INGRESO</span>
                                    }
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800">{mov.concepto}</td>
                                <td className="px-6 py-4 text-xs">{mov.usuario}</td>
                                <td className={`px-6 py-4 font-black text-right ${mov.tipo === 'EGRESO' ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {mov.tipo === 'EGRESO' ? '-' : '+'}${Number(mov.monto).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {movimientos.length === 0 && !cargando && (
                            <tr><td colSpan="5" className="py-10 text-center text-gray-400">No hay movimientos registrados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL PARA REGISTRAR GASTO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Nuevo Movimiento</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Movimiento</label>
                                <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-slate-50 font-bold outline-none">
                                    <option value="EGRESO">Gasto / Salida de Dinero (Egreso)</option>
                                    <option value="INGRESO">Ingreso Extra (No de órdenes)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Concepto (¿En qué se gastó?)</label>
                                <input type="text" required value={formData.concepto} onChange={e => setFormData({ ...formData, concepto: e.target.value })} placeholder="Ej: Compra de estaño, Pago de luz..." className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto ($)</label>
                                <input type="number" step="0.01" required value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono font-bold text-lg text-slate-700" />
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-2 hover:bg-slate-800 transition-colors">Guardar Movimiento</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Movimientos;