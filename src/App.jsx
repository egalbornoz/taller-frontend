import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import RutaProtegida from './layouts/RutaProtegida';
import Clientes from './pages/Clientes';
import Vehiculos from './pages/Vehiculos';
import ModulosEcu from './pages/ModulosEcu';
import Ordenes from './pages/Ordenes';
import Revisiones from './pages/Revisiones';
import Reparaciones from './pages/Reparaciones';
import Usuarios from './pages/Usuarios';
import Tarifas from './pages/Tarifas';
import MiPerfil from './pages/MiPerfil';
import Movimientos from './pages/Movimientos';
import Notificaciones from './pages/Notificaciones';
import Reportes from './pages/Reportes';
import Inventario from './pages/Inventario';

function App() {
  const { auth, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-screen w-full bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  // Función inteligente para saber a qué pantalla enviar al usuario apenas abre la app
  const obtenerRutaDeInicio = () => {
    const rolId = Number(auth.rol_id);
    if (rolId === 2) return '/revisiones'; // Técnicos van directo a trabajar
    return '/dashboard'; // Administradores y Recepción van al panel directivo
  };

  return (
    <Routes>

      {/* RUTA PÚBLICA: Si ya estoy logueado, evalúa mi rol y mándame a mi área */}
      <Route path="/" element={
        auth.id ? <Navigate to={obtenerRutaDeInicio()} replace /> : <Login />
      } />

      {/* RUTAS PRIVADAS */}
      {/* CAPA 1: Solo logueados pueden pasar */}
      <Route element={<RutaProtegida />}>
        <Route element={<MainLayout />}>

          {/* ============================================================== */}
          {/* ZONA DE ALTO MANDO: Solo Administradores (1)                     */}
          {/* ============================================================== */}
          <Route element={<RutaProtegida rolesPermitidos={[1]} />}>
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/tarifas" element={<Tarifas />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>

          {/* ============================================================== */}
          {/* ZONA COMERCIAL: Solo Administradores (1) y Recepción (3)         */}
          {/* ============================================================== */}
          <Route element={<RutaProtegida rolesPermitidos={[1, 3]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/movimientos" element={<Movimientos />} /> {/* <-- Dinero asegurado aquí */}
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/vehiculos" element={<Vehiculos />} />
            <Route path="/modulos-ecu" element={<ModulosEcu />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/inventario" element={<Inventario />} />
          </Route>

          {/* ============================================================== */}
          {/* ZONA DE TALLER: Solo Administradores (1) y Técnicos (2)          */}
          {/* ============================================================== */}
          <Route element={<RutaProtegida rolesPermitidos={[1, 2]} />}>
            <Route path="/revisiones" element={<Revisiones />} />
            <Route path="/reparaciones" element={<Reparaciones />} />
          </Route>

          {/* ============================================================== */}
          {/* ZONA COMPARTIDA: Todo el equipo logueado                         */}
          {/* ============================================================== */}
          <Route path="/ordenes" element={<Ordenes />} />
          <Route path="/perfil" element={<MiPerfil />} />

        </Route>
      </Route>

      {/* CUALQUIER OTRA RUTA INVENTADA -> LOGIN */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

export default App;