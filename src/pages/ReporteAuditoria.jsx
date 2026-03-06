import { useState, useEffect } from 'react';

export const ReporteAuditoria = () => {
    // 1. Estados para los filtros y paginación
    const [filtros, setFiltros] = useState({ inicio: '', fin: '', estado: '' });
    const [page, setPage] = useState(1);
    
    // 2. Estados para la data y UI
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reemplaza esto con la forma en que obtienes tu token real (Zustand, Redux, localStorage, etc.)
    const token = localStorage.getItem('token') || ''; 

    // Función para obtener la data JSON para la tabla
    const fetchReportData = async (paginaActual = 1) => {
        if (!filtros.inicio || !filtros.fin) {
            setError('Por favor selecciona una fecha de inicio y fin.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Construimos la URL dinámica
            const query = new URLSearchParams({
                inicio: filtros.inicio,
                fin: filtros.fin,
                page: paginaActual,
                limit: 50, // Lo fijamos a 50 como pide tu backend
                ...(filtros.estado && { estado: filtros.estado }) // Solo se envía si hay estado
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/audit/final?${query}`, {
                headers: {
                    'x-token': token // Tu middleware valida esto
                }
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error al cargar el reporte');

            setReporte(data);
            setPage(paginaActual); // Actualizamos la página actual
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Función "Mágica" para descargar el Excel correctamente
    const exportarExcel = async () => {
        if (!filtros.inicio || !filtros.fin) {
            setError('Selecciona fechas antes de exportar.');
            return;
        }

        try {
            setLoading(true);
            const query = new URLSearchParams({
                inicio: filtros.inicio,
                fin: filtros.fin,
                exportar: 'excel',
                ...(filtros.estado && { estado: filtros.estado })
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/audit/final?${query}`, {
                headers: { 'x-token': token }
            });

            if (!response.ok) throw new Error('Error al generar el Excel');

            // 1. Convertimos la respuesta en un Blob (Binario)
            const blob = await response.blob();

            // 2. Creamos una URL temporal para el archivo
            const urlBlob = window.URL.createObjectURL(blob);
            
            // 3. Forzamos la descarga creando un enlace <a> invisible
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `Auditoria_${filtros.inicio}_al_${filtros.fin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            
            // 4. Limpiamos la memoria
            a.remove();
            window.URL.revokeObjectURL(urlBlob);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Manejador de cambios en los inputs
    const handleInputChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Reporte de Auditoría Final</h1>

            {/* --- SECCIÓN DE FILTROS --- */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded shadow-sm bg-gray-50">
                <div>
                    <label className="block text-sm font-medium">Inicio</label>
                    <input type="date" name="inicio" value={filtros.inicio} onChange={handleInputChange} className="border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Fin</label>
                    <input type="date" name="fin" value={filtros.fin} onChange={handleInputChange} className="border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Estado (Opcional)</label>
                    <select name="estado" value={filtros.estado} onChange={handleInputChange} className="border p-2 rounded">
                        <option value="">Todos</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                        <option value="PENDIENTE">Pendiente</option>
                    </select>
                </div>
                
                <div className="flex items-end gap-2">
                    <button 
                        onClick={() => fetchReportData(1)} 
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                    </button>
                    <button 
                        onClick={exportarExcel} 
                        disabled={loading || !reporte}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
                    >
                        Exportar Excel
                    </button>
                </div>
            </div>

            {error && <div className="text-red-600 mb-4">{error}</div>}

            {/* --- SECCIÓN DE MÉTRICAS --- */}
            {reporte?.metricas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 border rounded bg-white shadow-sm">
                        <p className="text-sm text-gray-500">Órdenes Totales</p>
                        <p className="text-xl font-bold">{reporte.metricas.total_ordenes}</p>
                    </div>
                    <div className="p-4 border rounded bg-white shadow-sm">
                        <p className="text-sm text-gray-500">Total Cotizado</p>
                        <p className="text-xl font-bold">${reporte.metricas.monto_total_cotizado.toFixed(2)}</p>
                    </div>
                    <div className="p-4 border rounded bg-white shadow-sm">
                        <p className="text-sm text-gray-500">Total Recaudado</p>
                        <p className="text-xl font-bold text-green-600">${reporte.metricas.monto_total_recaudado.toFixed(2)}</p>
                    </div>
                    <div className="p-4 border rounded bg-white shadow-sm">
                        <p className="text-sm text-gray-500">Eficiencia</p>
                        <p className="text-xl font-bold text-blue-600">{reporte.metricas.eficiencia_cobro}</p>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN DE TABLA --- */}
            {reporte?.detalles && (
                <div className="overflow-x-auto mb-4 border rounded shadow-sm">
                    <table className="min-w-full text-left bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border-b">ID</th>
                                <th className="p-3 border-b">Fecha</th>
                                <th className="p-3 border-b">Estado</th>
                                <th className="p-3 border-b">Cotizado</th>
                                <th className="p-3 border-b">Pagado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reporte.detalles.length === 0 ? (
                                <tr><td colSpan="5" className="p-4 text-center">No hay registros</td></tr>
                            ) : (
                                reporte.detalles.map((orden) => (
                                    <tr key={orden.id} className="hover:bg-gray-50">
                                        <td className="p-3 border-b">{orden.id}</td>
                                        {/* Ajusta estos nombres según los campos reales de tu tabla MySQL */}
                                        <td className="p-3 border-b">{new Date(orden.fecha_creacion).toLocaleDateString()}</td>
                                        <td className="p-3 border-b">{orden.estado}</td>
                                        <td className="p-3 border-b">${Number(orden.total_cotizado || 0).toFixed(2)}</td>
                                        <td className="p-3 border-b">${Number(orden.total_pagado || 0).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- SECCIÓN DE PAGINACIÓN --- */}
            {reporte?.paginacion && reporte.paginacion.total_paginas > 1 && (
                <div className="flex justify-between items-center mt-4 p-4 bg-white border rounded shadow-sm">
                    <span className="text-sm text-gray-600">
                        Mostrando página {reporte.paginacion.pagina_actual} de {reporte.paginacion.total_paginas} ({reporte.paginacion.total_registros} registros totales)
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1 || loading}
                            onClick={() => fetchReportData(page - 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button 
                            disabled={page === reporte.paginacion.total_paginas || loading}
                            onClick={() => fetchReportData(page + 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};