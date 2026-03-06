import { useEffect, useState, useRef } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
  Car, Search, Plus, Pencil, Trash2, X, AlertCircle,
  UploadCloud, FileImage, Trash, Fuel, Maximize2
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//   <div className="flex flex-col items-center justify-center py-20 w-full">
//     <div className="relative w-12 h-12">
//       <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//       <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//     </div>
//     <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando...</p>
//   </div>
// );

const Vehiculos = () => {
  const { auth } = useAuth();

  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [vehiculoEditar, setVehiculoEditar] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const fileInputRef = useRef(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageURL, setSelectedImageURL] = useState('');

  const [formData, setFormData] = useState({
    cliente_id: '', marca: '', modelo: '', anio: '', placa: '', vin: '', tipo_combustible: ''
  });

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const timestamp = new Date().getTime();
      const [resC, resV, resT] = await Promise.allSettled([
        clienteAxios.get(`/clients/true?t=${timestamp}`),
        clienteAxios.get(`/vehicles?t=${timestamp}`),
        clienteAxios.get(`/tariffs?t=${timestamp}`)
      ]);

      if (resC.status === 'fulfilled') setClientes(Array.isArray(resC.value.data) ? resC.value.data : (resC.value.data.data || []));
      if (resV.status === 'fulfilled') setVehiculos(Array.isArray(resV.value.data) ? resV.value.data : (resV.value.data.data || []));
      if (resT.status === 'fulfilled') setTarifas(Array.isArray(resT.value.data) ? resT.value.data : (resT.value.data.data || []));

    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setCargando(false), 300);
    }
  };

  useEffect(() => { obtenerDatos(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const cerrarModal = () => {
    setIsModalOpen(false);
    setFormData({ cliente_id: '', marca: '', modelo: '', anio: '', placa: '', vin: '', tipo_combustible: '' });
    setErrorModal('');
    setVehiculoEditar(null);
    setArchivoImagen(null);
    setPreviewURL(null);
  };

  const cargarDatosEdicion = (vehiculo) => {
    setVehiculoEditar(vehiculo);

    // NORMALIZACIÓN ESTRICTA
    let categoriaGuardada = vehiculo.tipo_combustible ? String(vehiculo.tipo_combustible).trim().toUpperCase() : '';
    if (categoriaGuardada === 'DIÉSEL') categoriaGuardada = 'DIESEL';
    if (categoriaGuardada === 'NULL' || categoriaGuardada === 'UNDEFINED') categoriaGuardada = '';

    setFormData({
      cliente_id: vehiculo.cliente_id,
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || '',
      placa: vehiculo.placa || '',
      vin: vehiculo.vin || '',
      tipo_combustible: categoriaGuardada
    });

    if (vehiculo.img_documento) {
      const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
      setPreviewURL(`${baseURL}/uploads/${encodeURI(vehiculo.img_documento)}`);
    } else {
      setPreviewURL(null);
    }
    setArchivoImagen(null);
    setIsModalOpen(true);
  };

  const handleVerImagen = (imgName) => {
    if (!imgName) return;
    const baseURL = clienteAxios.defaults.baseURL.replace('/api/v1', '');
    const fullUrl = `${baseURL}/uploads/${encodeURI(imgName)}`;
    setSelectedImageURL(fullUrl);
    setIsImageModalOpen(true);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    procesarArchivo(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

  const procesarArchivo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Debe ser una imagen (JPG, PNG)', 'error');
    setArchivoImagen(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const removerImagen = () => {
    setArchivoImagen(null);
    setPreviewURL(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorModal('');

    if (!formData.cliente_id) return setErrorModal('Seleccione un propietario');
    if (!formData.marca.trim()) return setErrorModal('La marca es obligatoria');
    if (!formData.placa.trim()) return setErrorModal('La placa es obligatoria');
    if (!formData.tipo_combustible) return setErrorModal('Seleccione la categoría/combustible para el tarifador');

    setGuardando(true);

    const payload = new FormData();
    payload.append('cliente_id', formData.cliente_id);
    payload.append('marca', formData.marca);
    payload.append('modelo', formData.modelo);
    payload.append('anio', formData.anio);
    payload.append('placa', formData.placa);
    payload.append('vin', formData.vin);
    payload.append('tipo_combustible', formData.tipo_combustible);

    if (archivoImagen) payload.append('img_documento', archivoImagen);

    try {
      if (vehiculoEditar) {
        await clienteAxios.put(`/vehicles/update/${vehiculoEditar.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        Swal.fire({ icon: 'success', title: '¡Actualizado!', text: 'Vehículo actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await clienteAxios.post('/vehicles/create', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        Swal.fire({ icon: 'success', title: '¡Registrado!', text: 'Vehículo registrado', timer: 1500, showConfirmButton: false });
      }
      cerrarModal();
      obtenerDatos();
    } catch (error) {
      setErrorModal(error.response?.data?.message || 'Error al procesar la solicitud');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (id) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará permanentemente el vehículo y sus documentos.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await clienteAxios.delete(`/vehicles/delete/${id}`);
          Swal.fire('¡Eliminado!', 'El vehículo ha sido borrado.', 'success');
          obtenerDatos();
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar el vehículo', 'error');
        }
      }
    });
  };

  const vehiculosFiltrados = vehiculos.filter(v =>
    v.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="fade-in relative min-h-[500px] pb-24">

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="text-blue-600" size={28} /> Gestión de Vehículos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Administra la flota y documentos de tus clientes.</p>
        </div>

        {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 font-medium">
            <Plus size={20} /> Nuevo Vehículo
          </button>
        )}
      </div>

      <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por placa, marca o propietario..." className="w-full border-none outline-none text-gray-700 placeholder-gray-400 bg-transparent" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Vehículo / Año</th>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Doc. Identidad</th>
                <th className="px-6 py-4">Propietario</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehiculosFiltrados.length > 0 ? (
                vehiculosFiltrados.map((v) => (
                  <tr key={v.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {v.marca}
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {v.tipo_combustible}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                        {v.modelo} {v.anio ? `— ${v.anio}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-blue-700 font-bold tracking-wider">
                      {v.placa}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {v.img_documento ? (
                        <button
                          type="button"
                          onClick={() => handleVerImagen(v.img_documento)}
                          className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg w-fit border border-emerald-200 transition-colors shadow-sm cursor-pointer"
                          title="Haz clic para ampliar"
                        >
                          <FileImage size={14} /> Ver Adjunto
                        </button>
                      ) : (
                        <span className="text-gray-300 italic">No registrado</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {v.nombre_cliente}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') ? (
                          <>
                            <button onClick={() => cargarDatosEdicion(v)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100" title="Editar"><Pencil size={18} /></button>
                            <button onClick={() => handleEliminar(v.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100" title="Eliminar"><Trash2 size={18} /></button>
                          </>
                        ) : (
                          <span className="text-gray-300 italic text-xs">Solo lectura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (!cargando && <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400">No se encontraron vehículos.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 backdrop-blur-[1px]"><Spinner /></div>}

      {isImageModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsImageModalOpen(false)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsImageModalOpen(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors" title="Cerrar"><X size={24} /></button>
            <img src={selectedImageURL} alt="Documento ampliado" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain bg-white" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/600x400?text=Imagen+No+Encontrada"; }} />
            <p className="text-white/60 text-sm mt-4 flex items-center gap-2"><Maximize2 size={16} /> Haz clic fuera de la imagen para cerrar</p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] overflow-y-auto border-t-4 border-blue-600">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {vehiculoEditar ? <Pencil className="text-blue-600" size={18} /> : <Plus className="text-blue-600" size={18} />}
                {vehiculoEditar ? 'Editar Vehículo y Documento' : 'Registrar Vehículo'}
              </h3>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {errorModal && (
                <div className="col-span-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                  <AlertCircle size={16} /> {errorModal}
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Propietario *</label>
                <select name="cliente_id" value={formData.cliente_id} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-700">
                  <option value="">-- Seleccione el Cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marca *</label>
                <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Ej: Toyota" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modelo</label>
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Ej: Corolla" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Año</label>
                <input type="number" name="anio" value={formData.anio} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Ej: 2022" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Placa *</label>
                <input type="text" name="placa" value={formData.placa} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono font-bold text-blue-700 uppercase" placeholder="AAA-000" required />
              </div>

              {/* INTEGRACIÓN TARIFADOR BLINDADA */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 items-center gap-1"><Fuel size={14} /> Categoría / Combustible *</label>
                <select name="tipo_combustible" value={formData.tipo_combustible} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700" required>
                  <option value="">-- Seleccionar Categoría --</option>

                  {tarifas
                    .filter(t => String(t.tipo_entidad).trim().toUpperCase() === 'VEHICULO')
                    .map(tarifa => {
                      const categoriaLimpia = String(tarifa.categoria).trim().toUpperCase();
                      return <option key={tarifa.id} value={categoriaLimpia}>{categoriaLimpia}</option>
                    })
                  }

                  {/* MAGIA DE RESCATE: Si la categoría guardada no existe en las tarifas, la mostramos igual */}
                  {formData.tipo_combustible && !tarifas.some(t => String(t.tipo_entidad).trim().toUpperCase() === 'VEHICULO' && String(t.categoria).trim().toUpperCase() === formData.tipo_combustible) && (
                    <option value={formData.tipo_combustible}>{formData.tipo_combustible} (Tarifa Antigua)</option>
                  )}

                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">VIN (Número de Chasis)</label>
                <input type="text" name="vin" value={formData.vin} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all uppercase" placeholder="Opcional" />
              </div>

              <div className="col-span-2 mt-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Documento de Identidad del Propietario (Img)</label>

                {!previewURL ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}
                        `}
                  >
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <UploadCloud size={40} className={isDragging ? 'text-blue-500' : 'text-gray-400'} />
                      <p className="text-sm text-gray-600 font-medium">Arrastra la imagen aquí o <span className="text-blue-600 underline">explora</span></p>
                      <p className="text-xs text-gray-400">JPG, PNG hasta 5MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center h-48 group overflow-hidden">
                    <img src={previewURL} alt="Documento Previa" className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
                    <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={removerImagen} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                        <Trash size={16} /> Eliminar Imagen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2 mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={cerrarModal} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all font-bold disabled:bg-blue-300">
                  {guardando ? 'Guardando...' : (vehiculoEditar ? 'Actualizar Vehículo' : 'Guardar Vehículo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehiculos;