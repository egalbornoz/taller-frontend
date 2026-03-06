import { useState, useEffect, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import clienteAxios from '../api/axios';

// 1. Creamos el contexto
const AuthContext = createContext();

// 2. Definimos el componente Provider
const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({});
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const autenticarUsuario = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setCargando(false);
                return;
            }

            try {
                const userStorage = localStorage.getItem('usuario_data');
                if(userStorage) {
                    setAuth(JSON.parse(userStorage));
                }
            } catch (error) {
                console.log(error);
                localStorage.removeItem('token');
                localStorage.removeItem('usuario_data');
                setAuth({});
            } finally {
                setCargando(false);
            }
        }
        autenticarUsuario();
    }, []);

    const cerrarSesion = () => {
        setAuth({});
        localStorage.removeItem('token');
        localStorage.removeItem('usuario_data');
    }

    const iniciarSesion = async (email, password) => {
        try {
            const { data } = await clienteAxios.post('/auth/login', { 
                email, password_hash: password 
            });

            localStorage.setItem('token', data.data.sessiontoken);
            localStorage.setItem('usuario_data', JSON.stringify(data.data));
            setAuth(data.data);
            
            return { error: false, msg: 'Login correcto' };
        } catch (error) {
            return { error: true, msg: error.response?.data?.message || error.message };
        }
    }

    return (
        <AuthContext.Provider
            value={{ auth, setAuth, cargando, cerrarSesion, iniciarSesion }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// 3. EXPORTACIONES "VITE-FRIENDLY"
export { AuthContext }; // Exportación nombrada para el objeto Context
export default AuthProvider; // Exportación por defecto para el Componente