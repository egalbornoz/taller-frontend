Para que todas las páginas "internas" del sistema (Dashboard, Inventario, Clientes, etc.) compartan el mismo diseño (barra lateral, encabezado, fondo) sin tener que copiar y pegar código en cada archivo, la solución profesional en React es usar un Layout Component (Componente de Diseño) combinado con react-router-dom.

Aquí tienes los 3 pasos para implementarlo:

Paso 1: Configura tus "Colores de Marca" (El Tema)
Para no estar escribiendo códigos hexadecimales (#1e293b) en cada botón, define tu paleta en el archivo de configuración. Así, si un día quieres cambiar el azul por rojo, solo lo cambias aquí y se actualiza en todo el sistema.

Edita tu tailwind.config.js:

JavaScript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nombres personalizados para tu taller
        'taller-dark': '#0f172a',   // Fondo oscuro
        'taller-primary': '#3b82f6', // Color principal (botones, enlaces)
        'taller-bg': '#f1f5f9',      // Fondo gris clarito para el contenido
      },
    },
  },
  plugins: [],
}
Paso 2: Crea el ComponenteMainLayout
Este será el "marco" de tu cuadro. Contendrá el menú lateral (Sidebar) y el área donde cambia el contenido.

Crea un archivo src/layouts/MainLayout.jsx:

JavaScript
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-taller-bg">
      {/* --- BARRA LATERAL (Sidebar) --- */}
      <aside className="w-64 bg-taller-dark text-white p-5 hidden md:block">
        <h1 className="text-2xl font-bold mb-10">Gestion Taller</h1>
        <nav className="flex flex-col gap-4">
          <a href="/dashboard" className="hover:text-taller-primary">Dashboard</a>
          <a href="/clientes" className="hover:text-taller-primary">Clientes</a>
          <a href="/vehiculos" className="hover:text-taller-primary">Vehículos</a>
        </nav>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Aquí se renderizarán las páginas hijas (Dashboard, Clientes, etc.) */}
        <Outlet /> 
      </main>
    </div>
  );
};

export default MainLayout;
Paso 3: Configura las Rutas (Router)
Ahora debes decirle a React: "La página de Login va sola, pero el Dashboard y Clientes van DENTRO del Layout".

En tu src/App.jsx (o donde definas las rutas):

JavaScript
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Routes>
      {/* Ruta PÚBLICA (Sin barra lateral) */}
      <Route path="/" element={<Login />} />

      {/* Rutas PRIVADAS (Con el Layout compartido) */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Aquí agregarás las demás:
        <Route path="/clientes" element={<Clientes />} /> 
        <Route path="/vehiculos" element={<Vehiculos />} /> 
        */}
      </Route>
    </Routes>
  );
}

export default App;
¿Qué acabamos de hacer?
Login se ve a pantalla completa (sin menú).

Cuando entras a /dashboard, React carga MainLayout y pone el componente Dashboard dentro del hueco donde escribimos <Outlet />.

Los colores bg-taller-dark y bg-taller-bg ahora están disponibles en todo tu proyecto.