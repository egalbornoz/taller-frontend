import { useEffect, useState, useRef } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
  Cpu, Search, Plus, Pencil, Trash2, X, AlertCircle,
  UploadCloud, FileImage, Trash, Fuel, Maximize2
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//   <div className="flex flex-col items-center justify-center py-20 w-full">
//     <div className="relative w-12 h-12">
//       <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//       <div className="absolute top-0 left-0 w-full h-full border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//     </div>
//     <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando...</p>
//   </div>
// );

const Modulos = () => {
  const { auth } = useAuth();
  const [modulos, setModulos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [moduloEditar, setModuloEditar] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const fileInputRef = useRef(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageURL, setSelectedImageURL] = useState('');

  const [formData, setFormData] = useState({
    cliente_id: '', tipo: '', marca: '', modelo: '', numero_parte: '', serial: '', observaciones: '', tipo_combustible: ''
  });

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const timestamp = new Date().getTime();
      const [resM, resC, resT] = await Promise.allSettled([
        clienteAxios.get(`/modules?t=${timestamp}`),
        clienteAxios.get(`/clients/true?t=${timestamp}`),
        clienteAxios.get(`/tariffs?t=${timestamp}`)
      ]);

      if (resM.status === 'fulfilled') setModulos(Array.isArray(resM.value.data.data) ? resM.value.data.data : []);
      if (resC.status === 'fulfilled') setClientes(Array.isArray(resC.value.data.data) ? resC.value.data.data : (Array.isArray(resC.value.data) ? resC.value.data : []));
      if (resT.status === 'fulfilled') setTarifas(Array.isArray(resT.value.data) ? resT.value.data : (resT.value.data.data || []));

    } catch (error) { console.error(error); } finally { setTimeout(() => setCargando(false), 300); }
  };

  useEffect(() => { obtenerDatos(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const cerrarModal = () => {
    setIsModalOpen(false);
    setFormData({ cliente_id: '', tipo: '', marca: '', modelo: '', numero_parte: '', serial: '', observaciones: '', tipo_combustible: '' });
    setErrorModal(''); setModuloEditar(null); setArchivoImagen(null); setPreviewURL(null);
  };

  const cargarDatosEdicion = (modulo) => {
    setModuloEditar(modulo);

    // NORMALIZACIÓN ESTRICTA
    let categoriaGuardada = modulo.tipo_combustible ? String(modulo.tipo_combustible).trim().toUpperCase() : '';
    if (categoriaGuardada === 'DIÉSEL') categoriaGuardada = 'DIESEL';
    if (categoriaGuardada === 'NULL' || categoriaGuardada === 'UNDEFINED') categoriaGuardada = '';

    setFormData({
      cliente_id: modulo.cliente_id,
      tipo: modulo.tipo || '',
      marca: modulo.marca || '',
      modelo: modulo.modelo || '',
      numero_parte: modulo.numero_parte || '',
      serial: modulo.serial || '',
      observaciones: modulo.observaciones || '',
      tipo_combustible: categoriaGuardada
    });

    if (modulo.img_documento) {
      const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
      setPreviewURL(`${baseURL}/uploads/${encodeURI(modulo.img_documento)}`);
    } else { setPreviewURL(null); }
    setArchivoImagen(null); setIsModalOpen(true);
  };

  const handleVerImagen = (imgName) => {
    if (!imgName) return;
    const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
    setSelectedImageURL(`${baseURL}/uploads/${encodeURI(imgName)}`);
    setIsImageModalOpen(true);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); procesarArchivo(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

  const procesarArchivo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Debe ser imagen (JPG, PNG)', 'error');
    setArchivoImagen(file); setPreviewURL(URL.createObjectURL(file));
  };
  const removerImagen = () => { setArchivoImagen(null); setPreviewURL(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (!formData.cliente_id) return setErrorModal('Seleccione un propietario');
    if (!formData.tipo.trim() || !formData.serial.trim()) return setErrorModal('Tipo y Serial obligatorios');
    if (!formData.tipo_combustible) return setErrorModal('Seleccione la categoría/combustible para el tarifador');

    setGuardando(true);
    const payload = new FormData();
    Object.keys(formData).forEach(key => payload.append(key, formData[key]));
    if (archivoImagen) payload.append('img_documento', archivoImagen);

    try {
      if (moduloEditar) {
        await clienteAxios.put(`/modules/update/${moduloEditar.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 1500, showConfirmButton: false });
      } else {
        await clienteAxios.post('/modules/create', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        Swal.fire({ icon: 'success', title: '¡Registrado!', timer: 1500, showConfirmButton: false });
      }
      cerrarModal(); obtenerDatos();
    } catch (error) { setErrorModal(error.response?.data?.message || 'Error'); } finally { setGuardando(false); }
  };

  const handleEliminar = (id) => {
    Swal.fire({ title: '¿Eliminar Módulo?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar' }).then(async (result) => {
      if (result.isConfirmed) {
        try { await clienteAxios.delete(`/modules/delete/${id}`); Swal.fire('¡Eliminado!', '', 'success'); obtenerDatos(); } catch (error) { }
      }
    });
  };

  const modulosFiltrados = modulos.filter(m => m.serial?.toLowerCase().includes(busqueda.toLowerCase()) || m.tipo?.toLowerCase().includes(busqueda.toLowerCase()) || m.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="fade-in relative min-h-[500px] pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Cpu className="text-purple-600" size={28} /> Gestión de Módulos</h1>
          <p className="text-gray-500 text-sm mt-1">Administra ECUs y componentes electrónicos.</p>
        </div>
        {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
          <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-medium"><Plus size={20} /> Nuevo Módulo</button>
        )}
      </div>

      <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por serial, tipo o propietario..." className="w-full border-none outline-none text-gray-700 bg-transparent" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Serial / N. Parte</th>
                <th className="px-6 py-4">Imagen Ref.</th>
                <th className="px-6 py-4">Propietario</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modulosFiltrados.length > 0 ? modulosFiltrados.map((m) => (
                <tr key={m.id} className="hover:bg-purple-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {m.tipo}
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{m.tipo_combustible}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">{m.marca} {m.modelo}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-purple-700 font-bold tracking-wider">{m.serial} <br /><span className="text-xs text-gray-400">{m.numero_parte}</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">
                    {m.img_documento ? (
                      <button type="button" onClick={() => handleVerImagen(m.img_documento)} className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-sm cursor-pointer"><FileImage size={14} /> Ver Foto</button>
                    ) : (<span className="text-gray-300 italic">No registrada</span>)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.nombre_cliente}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
                        <>
                          <button onClick={() => cargarDatosEdicion(m)} className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100"><Pencil size={18} /></button>
                          <button onClick={() => handleEliminar(m.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (!cargando && <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400">No se encontraron módulos.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 backdrop-blur-[1px]"><Spinner /></div>}

      {isImageModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsImageModalOpen(false)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsImageModalOpen(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors"><X size={24} /></button>
            <img src={selectedImageURL} alt="Módulo ampliado" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain bg-white" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/600x400?text=Imagen+No+Encontrada"; }} />
            <p className="text-white/60 text-sm mt-4 flex items-center gap-2"><Maximize2 size={16} /> Haz clic fuera de la imagen para cerrar</p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] overflow-y-auto border-t-4 border-purple-600">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {moduloEditar ? <Pencil className="text-purple-600" size={18} /> : <Plus className="text-purple-600" size={18} />}
                {moduloEditar ? 'Editar Módulo' : 'Registrar Módulo'}
              </h3>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {errorModal && <div className="col-span-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2"><AlertCircle size={16} /> {errorModal}</div>}

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Propietario *</label>
                <select name="cliente_id" value={formData.cliente_id} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-medium text-gray-700">
                  <option value="">-- Seleccione el Cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Módulo *</label>
                <input type="text" name="tipo" value={formData.tipo} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white" placeholder="Ej: ECU Motor" required />
              </div>

              {/* INTEGRACIÓN TARIFADOR BLINDADA */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 items-center gap-1"><Fuel size={14} /> Categoría / Combustible *</label>
                <select name="tipo_combustible" value={formData.tipo_combustible} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-bold text-gray-700" required>
                  <option value="">-- Seleccionar Categoría --</option>
                  
                  {tarifas
                    .filter(t => String(t.tipo_entidad).trim().toUpperCase() === 'MODULO')
                    .map(tarifa => {
                        const categoriaLimpia = String(tarifa.categoria).trim().toUpperCase();
                        return <option key={tarifa.id} value={categoriaLimpia}>{categoriaLimpia}</option>
                    })
                  }
                  
                  {/* MAGIA DE RESCATE */}
                  {formData.tipo_combustible && !tarifas.some(t => String(t.tipo_entidad).trim().toUpperCase() === 'MODULO' && String(t.categoria).trim().toUpperCase() === formData.tipo_combustible) && (
                    <option value={formData.tipo_combustible}>{formData.tipo_combustible} (Tarifa Antigua)</option>
                  )}
                  
                </select>
              </div>

              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marca</label><input type="text" name="marca" value={formData.marca} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white" placeholder="Ej: Bosch" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modelo</label><input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white" placeholder="Ej: EDC17" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial (S/N) *</label><input type="text" name="serial" value={formData.serial} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-mono font-bold text-purple-700" placeholder="0000000000" required /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número de Parte</label><input type="text" name="numero_parte" value={formData.numero_parte} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-mono" placeholder="P/N" /></div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foto de Referencia del Módulo</label>
                {!previewURL ? (
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <UploadCloud size={40} className={isDragging ? 'text-purple-500' : 'text-gray-400'} />
                      <p className="text-sm text-gray-600 font-medium">Arrastra la imagen aquí o <span className="text-purple-600 underline">explora</span></p>
                      <p className="text-xs text-gray-400">JPG, PNG hasta 5MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center h-48 group overflow-hidden">
                    <img src={previewURL} alt="Previa" className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
                    <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={removerImagen} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all"><Trash size={16} /> Eliminar Imagen</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observaciones</label><textarea name="observaciones" value={formData.observaciones} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none h-16" placeholder="Detalles de daño físico, pines doblados, etc..."></textarea></div>

              <div className="col-span-2 mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={cerrarModal} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-6 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-all font-bold disabled:bg-purple-300">{guardando ? 'Guardando...' : (moduloEditar ? 'Actualizar Módulo' : 'Guardar Módulo')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modulos;