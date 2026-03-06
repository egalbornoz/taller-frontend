import { useState } from 'react';
import clienteAxios from '../api/axios';
import {
    BarChart, Download, Calendar, Activity,
    DollarSign, ClipboardList, ShieldAlert, CheckCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

const Reportes = () => {
    const [filtros, setFiltros] = useState({ inicio: '', fin: '', estado: '' });
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    const consultarReporte = async () => {
        if (!filtros.inicio || !filtros.fin) return alert("Seleccione fechas");

        setLoading(true);
        try {
            const stamp = new Date().getTime(); // Genera un ID único para la petición
            const { data } = await clienteAxios.get(`/debug-reports/audit?_t=${stamp}`, {
                params: { ...filtros }
            });
            setReporte(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const descargarExcel = async () => {
        try {
            setLoading(true);
            // 1. Petición con arraybuffer
            const response = await clienteAxios.get('/debug-reports/audit', {
                params: { ...filtros, exportar: 'excel' },
                responseType: 'arraybuffer'
            });

            // 2. Crear el Blob con el MIME Type exacto de Excel
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // 3. Crear link de descarga
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Auditoria_Taller_${filtros.inicio}.xlsx`);
            document.body.appendChild(link);
            link.click();

            // Limpieza
            window.URL.revokeObjectURL(url);
            link.remove();
        } catch (error) {
            console.error("Error descarga:", error);
            Swal.fire('Error', 'No se pudo generar el archivo', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart className="text-blue-600" size={28} /> Auditoría Gerencial
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Análisis de rendimiento, garantías y recaudación.</p>
                </div>
            </div>

            {/* PANEL DE FILTROS - IDÉNTICO A TU CAPTURA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input type="date" name="inicio" onChange={handleInputChange} className="w-full pl-10 border border-gray-200 bg-gray-50 rounded-xl p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm text-gray-600" />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input type="date" name="fin" onChange={handleInputChange} className="w-full pl-10 border border-gray-200 bg-gray-50 rounded-xl p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm text-gray-600" />
                    </div>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                    <button onClick={consultarReporte} disabled={loading} className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-100">
                        {loading ? 'Cargando...' : 'Generar Informe'}
                    </button>
                    <button onClick={descargarExcel} disabled={!reporte || loading} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50">
                        <Download size={18} /> Excel
                    </button>
                </div>
            </div>

            {reporte && (
                <>
                    {/* DASHBOARD DE MÉTRICAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <MetricCard
                            title="Órdenes Totales"
                            value={reporte.metricas?.total_ordenes || 0}
                            icon={<ClipboardList size={20} />}
                            color="blue"
                        />
                        <MetricCard
                            title="Monto Cotizado"
                            value={`$${Number(reporte.metricas?.monto_total_cotizado || 0).toFixed(2)}`}
                            icon={<DollarSign size={20} />}
                            color="slate"
                        />
                        <MetricCard
                            title="Total Recaudado"
                            value={`$${Number(reporte.metricas?.monto_total_recaudado || 0).toFixed(2)}`}
                            icon={<CheckCircle size={20} />}
                            color="green"
                        />
                        <MetricCard
                            title="Eficiencia"
                            value={reporte.metricas?.eficiencia_cobro || "0.00%"}
                            icon={<Activity size={20} />}
                            color="orange"
                        />
                        <MetricCard
                            title="Garantías"
                            value={reporte.metricas?.total_garantias || 0}
                            icon={<ShieldAlert size={20} />}
                            color="rose"
                        />
                    </div>

                    {/* TABLA DE DETALLES - BASADA EN TU GESTIÓN DE ÓRDENES */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">ID Orden</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Monto Presupuesto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reporte.detalles?.length > 0 ? (
                                        reporte.detalles.map(row => (
                                            <tr key={row.orden_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-blue-600 flex items-center gap-2">
                                                    #{String(row.orden_id).padStart(4, '0')}
                                                    {row.es_garantia === 'SÍ' && (
                                                        <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-rose-200">GARANTÍA</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs">
                                                    {row.cliente}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${row.estado === 'ENTREGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                                        }`}>
                                                        {row.estado}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-black text-slate-800">
                                                    $ {Number(row.total_cotizado || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center py-20 text-gray-400 italic">No hay registros.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const MetricCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: "border-blue-500 text-blue-600 bg-blue-50",
        slate: "border-slate-500 text-slate-600 bg-slate-50",
        green: "border-green-500 text-green-600 bg-green-50",
        orange: "border-orange-500 text-orange-600 bg-orange-50",
        rose: "border-rose-500 text-rose-600 bg-rose-50"
    };
    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 ${colorClasses[color].split(' ')[0]}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-xl font-black text-slate-800">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[1]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default Reportes;