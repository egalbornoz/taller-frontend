import { useEffect, useState } from 'react';
import clienteAxios from '../api/axios';
import Swal from 'sweetalert2';
import { 
    Package, Search, Plus, Pencil, Archive, 
    AlertTriangle, CheckCircle, X, DollarSign 
} from 'lucide-react';

const Inventario = () => {
    const [inventario, setInventario] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    
    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemEditar, setItemEditar] = useState(null);
    
    const [formData, setFormData] = useState({
        codigo: '', nombre: '', descripcion: '', categoria: 'REPUESTO',
        stock_actual: '', stock_minimo: '5', costo_unitario: '', precio_venta: ''
    });

    const obtenerInventario = async () => {
        setCargando(true);
        try {
            const stamp = new Date().getTime();
            const { data } = await clienteAxios.get(`/inventory?_t=${stamp}`);
            setInventario(data.data || []);
        } catch (error) {
            console.error("Error cargando inventario:", error);
            Swal.fire('Error', 'No se pudo cargar el inventario', 'error');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        obtenerInventario();
    }, []);

    const abrirModal = (item = null) => {
        if (item) {
            setItemEditar(item);
            setFormData({
                codigo: item.codigo || '',
                nombre: item.nombre,
                descripcion: item.descripcion || '',
                categoria: item.categoria,
                stock_actual: item.stock_actual,
                stock_minimo: item.stock_minimo,
                costo_unitario: item.costo_unitario,
                precio_venta: item.precio_venta
            });
        } else {
            setItemEditar(null);
            setFormData({
                codigo: '', nombre: '', descripcion: '', categoria: 'REPUESTO',
                stock_actual: '', stock_minimo: '5', costo_unitario: '', precio_venta: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (itemEditar) {
                await clienteAxios.put(`/inventory/update/${itemEditar.id}`, formData);
                Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/inventory/create', formData);
                Swal.fire({ icon: 'success', title: 'Registrado', timer: 1500, showConfirmButton: false });
            }
            setIsModalOpen(false);
            obtenerInventario();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar el ítem', 'error');
        }
    };

    const toggleEstado = async (id, estadoActual) => {
        const accion = estadoActual ? 'desactivar' : 'activar';
        const { isConfirmed } = await Swal.fire({
            title: `¿${accion.toUpperCase()} Ítem?`,
            text: estadoActual ? "No aparecerá en los nuevos presupuestos, pero se conservará en el historial." : "Volverá a estar disponible para venta.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: estadoActual ? '#ef4444' : '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Sí, ${accion}`
        });

        if (isConfirmed) {
            try {
                await clienteAxios.delete(`/inventory/delete/${id}`);
                obtenerInventario();
            } catch (error) {
                Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
            }
        }
    };

    const inventarioFiltrado = inventario.filter(item => 
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        (item.codigo && item.codigo.toLowerCase().includes(busqueda.toLowerCase()))
    );

    return (
        <div className="fade-in pb-20">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-blue-600" size={28} /> Control de Inventario
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona repuestos, insumos y herramientas del taller.</p>
                </div>
                <button onClick={() => abrirModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold transition-all shrink-0">
                    <Plus size={20} /> Nuevo Producto
                </button>
            </div>

            {/* BUSCADOR */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all max-w-md">
                    <Search className="text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, SKU o código..." 
                        className="w-full bg-transparent border-none outline-none text-slate-700 font-medium"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Código / SKU</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-right">Costo</th>
                            <th className="px-6 py-4 text-right">Venta</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cargando ? (
                            <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-medium animate-pulse">Cargando inventario...</td></tr>
                        ) : inventarioFiltrado.length > 0 ? (
                            inventarioFiltrado.map(item => {
                                const stockCritico = Number(item.stock_actual) <= Number(item.stock_minimo);
                                const margen = Number(item.precio_venta) - Number(item.costo_unitario);
                                
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.activo ? 'opacity-60 bg-slate-50' : ''}`}>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                                            {item.codigo || 'S/N'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{item.nombre}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{item.categoria}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center justify-center gap-1 w-fit mx-auto ${stockCritico ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {stockCritico && <AlertTriangle size={12} />}
                                                {Number(item.stock_actual)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-500">
                                            ${Number(item.costo_unitario).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-mono font-bold text-slate-800">${Number(item.precio_venta).toFixed(2)}</p>
                                            <p className="text-[9px] text-emerald-600 font-bold" title="Ganancia neta">+${margen.toFixed(2)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.activo ? (
                                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded uppercase flex items-center justify-center gap-1 w-fit mx-auto"><CheckCircle size={12}/> Activo</span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase flex items-center justify-center gap-1 w-fit mx-auto"><Archive size={12}/> Inactivo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => abrirModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => toggleEstado(item.id, item.activo)} className={`p-1.5 rounded transition-colors ${item.activo ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={item.activo ? 'Desactivar' : 'Activar'}>
                                                    {item.activo ? <Archive size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="7" className="text-center py-12 text-slate-400 italic">No se encontraron productos en el inventario.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL CREAR/EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Package className="text-blue-600" size={20} /> 
                                {itemEditar ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre del Producto *</label>
                                    <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ej: Bobina de Encendido"/>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                    <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-700">
                                        <option value="REPUESTO">Repuesto / Pieza</option>
                                        <option value="INSUMO">Insumo (Estaño, Limpiador...)</option>
                                        <option value="HERRAMIENTA">Herramienta</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código / SKU (Opcional)</label>
                                    <input type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono uppercase" placeholder="Ej: BOB-CHEV-001"/>
                                </div>

                                <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stock Actual *</label>
                                    <input type="number" step="0.01" required value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 font-mono font-bold text-lg" placeholder="0"/>
                                </div>
                                <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1" title="El sistema te avisará cuando llegues a este número">Alerta Stock Mínimo *</label>
                                    <input type="number" step="0.01" required value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-orange-500 font-mono font-bold text-lg text-orange-600" placeholder="5"/>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[11px] font-bold text-red-500 uppercase mb-1 items-center gap-1"><DollarSign size={12}/> Costo Compra *</label>
                                    <input type="number" step="0.01" min="0" required value={formData.costo_unitario} onChange={e => setFormData({...formData, costo_unitario: e.target.value})} className="w-full border border-red-200 bg-red-50 rounded-lg px-3 py-2 outline-none focus:border-red-500 font-mono font-bold text-red-700" placeholder="0.00"/>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[11px] font-bold text-emerald-600 uppercase mb-1 items-center gap-1"><DollarSign size={12}/> Precio Público *</label>
                                    <input type="number" step="0.01" min="0" required value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: e.target.value})} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 font-mono font-bold text-emerald-700" placeholder="0.00"/>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-600 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md transition-colors">
                                    {itemEditar ? 'Guardar Cambios' : 'Registrar Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventario;