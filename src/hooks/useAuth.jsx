import { useContext } from 'react';
import { AuthContext } from '../context/AuthProvider'; // Si AuthContext sigue siendo default
// O SI CAMBIASTE A LA SOLUCIÓN ROBUSTA:
// import { AuthContext } from '../context/AuthProvider'; 

const useAuth = () => {
    return useContext(AuthContext);
}

export default useAuth;