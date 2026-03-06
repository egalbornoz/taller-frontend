import axios from 'axios';
import URL_BACKEND from '../utils/constants';
import Swal from 'sweetalert2'; // Importamos SweetAlert para el aviso de expulsión

const clienteAxios = axios.create({
    // Asegúrate de que esta URL apunte a tu backend
    baseURL: "https://api-taller.onrender.com" 
});



// --- INTERCEPTOR DE PETICIONES ---
// Este código se ejecuta automáticamente ANTES de enviar cualquier petición
clienteAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Enviar en ambos para asegurar compatibilidad con todos tus middlewares
        config.headers.Authorization = token; 
        config.headers['x-token'] = token; 
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- NUEVO: INTERCEPTOR DE RESPUESTAS (EL VIGILANTE) ---
// Este código revisa la respuesta del servidor ANTES de entregarla a tu pantalla
clienteAxios.interceptors.response.use(
    (response) => {
        // Si todo está correcto (status 200, 201, etc.), dejamos pasar la respuesta.
        return response;
    },
    (error) => {
        // Evaluamos si el servidor nos mandó un error
        if (error.response) {
            const status = error.response.status;

            // 401 = Token vencido/inválido | 403 = Usuario suspendido/sin permisos
            if (status === 401 || status === 403) {
                
                // 1. Destruimos las llaves de acceso localmente
                localStorage.removeItem('token');
                
                // 2. Bloqueamos la pantalla para informar al usuario
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'Tu sesión ha caducado o tu usuario fue desactivado por administración.',
                    confirmButtonText: 'Ir a Inicio',
                    allowOutsideClick: false, // Obliga a hacer clic en el botón
                    allowEscapeKey: false
                }).then(() => {
                    // 3. Patada a la ruta principal (Login). Cambia '/' por '/login' si es el caso en tu enrutador.
                    window.location.href = '/'; 
                });
            }
        }
        
        return Promise.reject(error);
    }
);

export default clienteAxios;