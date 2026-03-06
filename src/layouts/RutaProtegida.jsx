import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const RutaProtegida = ({ rolesPermitidos }) => {
    const { auth, cargando } = useAuth();

    // 1. Mientras verifica
    if (cargando) return (
        <div className="flex justify-center items-center h-screen w-full bg-slate-50">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
    );

    // 2. Si NO hay usuario -> Al Login
    if (!auth.id) {
        return <Navigate to="/" replace />;
    }

    // 3. Validar permisos basados en NÚMEROS (rol_id)
    if (rolesPermitidos && rolesPermitidos.length > 0) {
        const userRolId = Number(auth.rol_id);
        
        // Verifica si el ID del rol del usuario está en el arreglo de permitidos
        const tienePermiso = rolesPermitidos.includes(userRolId);

        if (!tienePermiso) {
            // Si no tiene permiso y es Técnico (2), lo devolvemos a su área
            if (userRolId === 2) {
                return <Navigate to="/revisiones" replace />;
            }
            // Si es cualquier otro, lo mandamos al dashboard
            return <Navigate to="/dashboard" replace />; 
        }
    }

    // 4. Si tiene permiso, pasa.
    return <Outlet />;
};

export default RutaProtegida;