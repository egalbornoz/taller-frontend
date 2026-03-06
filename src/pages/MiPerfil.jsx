import { useState } from 'react';
import clienteAxios from '../api/axios';
import useAuth from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { 
    UserCircle, ShieldCheck, Mail, Phone, Lock, CheckCircle, AlertCircle
} from 'lucide-react';

const MiPerfil = () => {
    const { auth } = useAuth();
    const [guardando, setGuardando] = useState(false);
    
    const [passwords, setPasswords] = useState({
        passwordActual: '',
        nuevaPassword: '',
        confirmarPassword: ''
    });

    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setErrorMsg(''); // Limpiar errores al escribir
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Validaciones del Frontend
        if (passwords.nuevaPassword.length < 6) {
            return setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        }
        if (passwords.nuevaPassword !== passwords.confirmarPassword) {
            return setErrorMsg('Las nuevas contraseñas no coinciden. Verifícalas.');
        }
        if (passwords.passwordActual === passwords.nuevaPassword) {
            return setErrorMsg('La nueva contraseña no puede ser igual a la anterior.');
        }

        setGuardando(true);
        try {
            await clienteAxios.put('/users/change-password', {
                passwordActual: passwords.passwordActual,
                nuevaPassword: passwords.nuevaPassword
            });

            Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Tu nueva contraseña ya está activa. Úsala en tu próximo inicio de sesión.',
                confirmButtonColor: '#10b981'
            });

            // Limpiar formulario
            setPasswords({ passwordActual: '', nuevaPassword: '', confirmarPassword: '' });

        } catch (error) {
            Swal.fire('Error de Autenticación', error.response?.data?.message || 'Error al cambiar la contraseña.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fade-in relative">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <UserCircle className="text-blue-600" size={28} /> Mi Perfil
                </h1>
                <p className="text-gray-500 text-sm mt-1">Consulta tus datos y administra la seguridad de tu cuenta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMNA IZQUIERDA: TARJETA DE IDENTIDAD */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto w-full custom-scrollbar">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 h-24 relative"></div>
                        <div className="px-6 pb-6 relative">
                            {/* Avatar Flotante */}
                            <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-600 flex items-center justify-center text-3xl font-black text-white shadow-md absolute -top-10 left-6">
                                {auth.nombre?.charAt(0).toUpperCase()}
                            </div>
                            
                            <div className="pt-12">
                                <h2 className="text-xl font-bold text-gray-800">{auth.nombre}</h2>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1 mb-4 flex items-center gap-1.5">
                                    <ShieldCheck size={16} /> {auth.nombre_rol}
                                </p>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Mail size={12}/> Correo Electrónico (Login)</p>
                                        <p className="text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{auth.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Phone size={12}/> Teléfono de Contacto</p>
                                        <p className="text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{auth.telefono || 'No registrado'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: CAMBIO DE CONTRASEÑA */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="border-b border-gray-100 pb-4 mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Lock className="text-slate-500" size={20} /> Seguridad de la Cuenta
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Asegúrate de usar una contraseña fuerte y no compartirla con nadie.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="max-w-md space-y-5">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 flex items-start gap-2">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p>{errorMsg}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña Actual *</label>
                                <input 
                                    type="password" name="passwordActual" 
                                    value={passwords.passwordActual} onChange={handleChange} 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" 
                                    placeholder="Ingresa tu contraseña actual" required 
                                />
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Nueva Contraseña *</label>
                                <input 
                                    type="password" name="nuevaPassword" 
                                    value={passwords.nuevaPassword} onChange={handleChange} 
                                    className="w-full border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans" 
                                    placeholder="Mínimo 6 caracteres" required 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Confirmar Nueva Contraseña *</label>
                                <input 
                                    type="password" name="confirmarPassword" 
                                    value={passwords.confirmarPassword} onChange={handleChange} 
                                    className="w-full border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans" 
                                    placeholder="Repite la nueva contraseña" required 
                                />
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" disabled={guardando} 
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:bg-slate-400"
                                >
                                    {guardando ? 'Verificando...' : <><CheckCircle size={18}/> Guardar Nueva Contraseña</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MiPerfil;