import { useEffect, useState, useCallback } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import {
    ShieldCheck, Search, Plus, Pencil, X, Mail, User as UserIcon, 
    Shield, Power, PowerOff, Phone, Wrench, Headset, Crown
} from 'lucide-react';
import Spinner from '../componets/Spinner';
// const Spinner = () => (
//     <div className="flex flex-col items-center justify-center py-20 w-full">
//         <div className="relative w-12 h-12">
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
//             <div className="absolute top-0 left-0 w-full h-full border-4 border-t-red-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//         </div>
//         <p className="mt-3 text-gray-500 text-sm font-medium animate-pulse">Cargando personal...</p>
//     </div>
// );

// Componente visual para los roles
const RoleBadge = ({ rol }) => {
    const roleName = String(rol || 'DESCONOCIDO').toUpperCase();
    
    if (roleName.includes('ADMIN')) {
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 w-fit"><Crown size={12}/> {roleName}</span>;
    }
    if (roleName.includes('TECNICO') || roleName.includes('TÉCNICO')) {
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 w-fit"><Wrench size={12}/> {roleName}</span>;
    }
    if (roleName.includes('RECEPCION') || roleName.includes('RECEPCIÓN')) {
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 w-fit"><Headset size={12}/> {roleName}</span>;
    }
    
    return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 w-fit"><UserIcon size={12}/> {roleName}</span>;
};

const Usuarios = () => {
    const { auth } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioEditar, setUsuarioEditar] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '', email: '', telefono: '', password: '', rol_id: ''
    });

    const obtenerDatos = useCallback(async () => {
        try {
            const timestamp = new Date().getTime();
            const [resUsers, resRoles] = await Promise.allSettled([
                clienteAxios.get(`/users?t=${timestamp}`),
                clienteAxios.get(`/users/roles?t=${timestamp}`)
            ]);

            if (resUsers.status === 'fulfilled') {
                const usersData = resUsers.value.data?.data || resUsers.value.data;
                setUsuarios(Array.isArray(usersData) ? usersData : []);
            }
            if (resRoles.status === 'fulfilled') {
                const rolesData = resRoles.value.data?.data || resRoles.value.data;
                setRoles(Array.isArray(rolesData) ? rolesData : []);
            }
        } catch (error) {
            console.error("Error cargando usuarios", error);
            Swal.fire('Error', 'No se pudo cargar la información del sistema', 'error');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { obtenerDatos(); }, [obtenerDatos]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const cerrarModal = () => {
        setIsModalOpen(false);
        setUsuarioEditar(null);
        setFormData({ nombre: '', email: '', telefono: '', password: '', rol_id: '' });
    };

    const abrirModalEdicion = (user) => {
        setUsuarioEditar(user);
        setFormData({
            nombre: user?.nombre || '',
            email: user?.email || '',
            telefono: user?.telefono || '', 
            password: '', 
            rol_id: user?.rol_id || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!usuarioEditar && formData.password.length < 6) {
            return Swal.fire('Atención', 'La contraseña debe tener al menos 6 caracteres por seguridad.', 'warning');
        }

        setGuardando(true);
        try {
            const payload = {
                nombre: formData.nombre,
                email: formData.email,
                telefono: formData.telefono, 
                rol_id: Number(formData.rol_id),
                password: formData.password
            };

            if (usuarioEditar) {
                await clienteAxios.put(`/users/${usuarioEditar.id}`, payload);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Credenciales actualizadas.', timer: 1500, showConfirmButton: false });
            } else {
                await clienteAxios.post('/users/create', payload);
                Swal.fire({ icon: 'success', title: 'Usuario Creado', text: 'El nuevo miembro ya puede iniciar sesión.', timer: 2000, showConfirmButton: false });
            }
            
            cerrarModal();
            await obtenerDatos(); 
            
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar el usuario', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const toggleEstado = async (user) => {
        const accion = user.activo ? 'Suspender' : 'Reactivar';
        const confirm = await Swal.fire({
            title: `¿${accion} acceso?`,
            text: user.activo 
                ? `El usuario ${user.nombre} será desconectado y no podrá entrar al sistema.` 
                : `El usuario ${user.nombre} recuperará sus credenciales de acceso.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: user.activo ? '#dc2626' : '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Sí, ${accion}`,
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                await clienteAxios.patch(`/users/toggle-status/${user.id}`);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Acceso ${user.activo ? 'suspendido' : 'reactivado'}`, timer: 2000, showConfirmButton: false });
                await obtenerDatos();
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Error al cambiar el estado', 'error');
            }
        }
    };

    const usuariosFiltrados = usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.nombre_rol?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (u.telefono && u.telefono.includes(busqueda)) 
    );

    return (
        <div className="fade-in relative min-h-[500px] pb-24">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="text-red-600" size={28} /> Control de Personal
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión de accesos, roles y credenciales del taller.</p>
                </div>
                <button onClick={() => { setUsuarioEditar(null); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center gap-2 font-bold shrink-0">
                    <Plus size={20} /> Nuevo Usuario
                </button>
            </div>

            {/* TABLA Y BUSCADOR */}
            <div className={`transition-all duration-300 ${cargando ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3 focus-within:border-red-400 transition-colors">
                    <Search className="text-gray-400" size={20} />
                    <input type="text" placeholder="Buscar por nombre, correo, teléfono o rol..." className="w-full border-none outline-none text-gray-700 bg-transparent text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Rol en Sistema</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuariosFiltrados.length > 0 ? (
                                usuariosFiltrados.map((user) => (
                                    <tr key={user.id} className={`transition-colors group ${!user.activo ? 'bg-gray-50/80 opacity-60' : 'hover:bg-red-50/30'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${user.activo ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'bg-gray-300'}`}>
                                                    {user.nombre?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <span className={`font-bold block ${user.activo ? 'text-gray-800' : 'text-gray-500 line-through decoration-gray-400'}`}>{user.nombre}</span>
                                                    {String(auth.id) === String(user.id) && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-black mt-0.5 inline-block">TÚ</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs text-gray-600">
                                                <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-400"/> {user.email}</span>
                                                <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400"/> {user.telefono || <i className="text-gray-400">Sin teléfono</i>}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <RoleBadge rol={user.nombre_rol} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.activo ? (
                                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-200 flex items-center gap-1.5 w-fit shadow-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> ACTIVO
                                                </span>
                                            ) : (
                                                <span className="bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold border border-gray-300 flex items-center gap-1.5 w-fit">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> SUSPENDIDO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2  transition-opacity">
                                                <button onClick={() => abrirModalEdicion(user)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Editar Credenciales">
                                                    <Pencil size={18} />
                                                </button>

                                                {String(auth.id) !== String(user.id) && (
                                                    <button
                                                        onClick={() => toggleEstado(user)}
                                                        className={`p-2 rounded-lg transition-colors border ${user.activo ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100'}`}
                                                        title={user.activo ? 'Suspender Acceso' : 'Reactivar Acceso'}
                                                    >
                                                        {user.activo ? <PowerOff size={18} /> : <Power size={18} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (!cargando && <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400">No se encontraron usuarios en el sistema.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {cargando && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50"><Spinner /></div>}

            {/* --- MODAL CREAR/EDITAR --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative border-t-4 border-red-600">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Shield size={20} className="text-red-600" />
                                {usuarioEditar ? 'Actualizar Credenciales' : 'Registrar Nuevo Usuario'}
                            </h3>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo *</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors" placeholder="Ej: Carlos Ávila" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico (Login) *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors" placeholder="usuario@taller.com" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors" placeholder="+58 414 0000000" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol de Acceso *</label>
                                    <select name="rol_id" value={formData.rol_id} onChange={handleChange} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-700 focus:bg-white transition-colors cursor-pointer" required>
                                        <option value="">-- Seleccionar --</option>
                                        {roles.map(rol => (
                                            <option key={rol.id} value={rol.id}>{rol.nombre || rol.nombre_rol}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                    {usuarioEditar ? 'Cambiar Contraseña (Opcional)' : 'Contraseña de Acceso *'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder:text-sm font-mono"
                                    placeholder={usuarioEditar ? 'Dejar en blanco para mantener la actual' : '•••••••• (Mínimo 6 caracteres)'}
                                    required={!usuarioEditar}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={cerrarModal} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={guardando} className="px-6 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md shadow-red-200 font-bold disabled:bg-red-300 transition-all flex items-center gap-2">
                                    {guardando ? 'Guardando...' : (usuarioEditar ? 'Guardar Cambios' : 'Registrar Personal')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;