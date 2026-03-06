import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import clienteAxios from '../api/axios';
import { socket } from '../socket';
import {
  LayoutDashboard, Users, Car, ClipboardList, Search, BarChart,
  Wrench, Cpu, DollarSign, Bell, ShieldCheck, LogOut, Menu, X, Tag,Warehouse,
} from 'lucide-react';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { auth, cerrarSesion } = useAuth();
  const location = useLocation();

  const [pendientes, setPendientes] = useState({ revisiones: 0, reparaciones: 0 });

  // --- CÁLCULO CON RAYOS X ---
  const cargarPendientes = useCallback(async (origen = "Inicial") => {
    try {
      console.log(`[Menú] 🔍 Consultando BD desde: ${origen}`);
      const stamp = new Date().getTime();

      const { data } = await clienteAxios.get(`/orders?_t=${stamp}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
      });

      const ordenesData = Array.isArray(data.data) ? data.data : (data || []);
      console.log(`[Menú] 📦 Total órdenes recibidas: ${ordenesData.length}`);

      let countRevs = 0;
      let countReps = 0;

      if (auth.nombre_rol === 'ADMIN' || auth.nombre_rol === 'RECEPCION') {
        countRevs = ordenesData.filter(o => o.estado === 'EN_REVISION').length;
        countReps = ordenesData.filter(o => o.estado === 'EN_REPARACION').length;
      } else {
        // MODO TÉCNICO
        const misOrdenes = ordenesData.filter(o => String(o.tecnico_id) === String(auth.id));
        console.log(`[Menú] 🧑‍🔧 Órdenes de este técnico (ID ${auth.id}):`, misOrdenes.map(o => ({ id: o.id, estado: o.estado })));

        countRevs = misOrdenes.filter(o => o.estado === 'EN_REVISION').length;
        countReps = misOrdenes.filter(o => o.estado === 'EN_REPARACION').length;
      }

      console.log(`[Menú] 🎯 Resultado final -> Revisiones: ${countRevs} | Reparaciones: ${countReps}`);
      setPendientes({ revisiones: countRevs, reparaciones: countReps });
    } catch (error) {
      console.error("Error al calcular notificaciones del menú:", error);
    }
  }, [auth.id, auth.nombre_rol]);

  // --- ESCUCHA DEL SOCKET ---
  useEffect(() => {
    cargarPendientes("Al cargar la página");

    const onActualizacion = () => {
      console.log("⚡ [Menú] SOCKET RECIBIDO: Alguien actualizó una orden.");
      setTimeout(() => {
        cargarPendientes("Respuesta al Socket");
      }, 500);
    };

    socket.on('actualizacion_taller', onActualizacion);

    return () => {
      socket.off('actualizacion_taller', onActualizacion);
    };
  }, [cargarPendientes]);


  // CONFIGURACIÓN DEL MENÚ
  const MENU_ITEMS = [
    {
      titulo: 'Principal',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MECANICO', 'RECEPCION'] },
        { path: '/notificaciones', label: 'Notificaciones', icon: Bell, roles: ['ADMIN', 'RECEPCION'] },
      ]
    },
    {
      titulo: 'Gestión',
      items: [
        { path: '/clientes', label: 'Clientes', icon: Users, roles: ['ADMIN', 'RECEPCION'] },
        { path: '/vehiculos', label: 'Vehículos', icon: Car, roles: ['ADMIN', 'MECANICO', 'RECEPCION'] },
        { path: '/modulos-ecu', label: 'Módulos ECU', icon: Cpu, roles: ['ADMIN', 'MECANICO'] },
      ]
    },
    {
      titulo: 'Taller',
      items: [
        { path: '/ordenes', label: 'Órdenes', icon: ClipboardList, roles: ['ADMIN', 'MECANICO', 'RECEPCION'] },
        {
          path: '/revisiones', label: 'Diagnósticos', icon: Search, roles: ['ADMIN', 'MECANICO', 'TECNICO'],
          notificacion: pendientes.revisiones, colorNotificacion: 'bg-red-500'
        },
        {
          path: '/reparaciones', label: 'Reparaciones', icon: Wrench, roles: ['ADMIN', 'MECANICO', 'TECNICO'],
          notificacion: pendientes.reparaciones, colorNotificacion: 'bg-orange-500'
        },
      ]
    },
    {
      titulo: 'Administración',
      items: [
        { path: '/reportes', label: 'Reportes de Auditoría', icon: BarChart, roles: ['ADMIN'] },
        { path: '/inventario', label: 'Inventario', icon: Warehouse, roles: ['ADMIN'] },
        { path: '/tarifas', label: 'Tarifador', icon: DollarSign, roles: ['ADMIN'] },
        { path: '/movimientos', label: 'Finanzas', icon: ClipboardList, roles: ['ADMIN'] },
        { path: '/usuarios', label: 'Usuarios', icon: ShieldCheck, roles: ['ADMIN'] },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity" onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="h-20 flex shrink-0 items-center justify-between px-6 border-b border-slate-700/50 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/50 flex-shrink-0">
              <Wrench size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-wide select-none">TALLER<span className="text-blue-500">PRO</span></h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {MENU_ITEMS.map((seccion, index) => {
            const itemsVisibles = seccion.items.filter(item => item.roles.includes(auth.nombre_rol));
            if (itemsVisibles.length === 0) return null;

            return (
              <div key={index}>
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">{seccion.titulo}</h3>
                <div className="space-y-1">
                  {itemsVisibles.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = item.icon;

                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                          {isActive && <span className="absolute left-0 w-1 h-6 bg-white rounded-r-full" aria-hidden="true"></span>}
                          <Icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.notificacion > 0 && (
                          <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white rounded-full shadow-md transition-all duration-300 ${item.colorNotificacion} ${item.path === '/revisiones' ? 'animate-pulse' : ''}`}>
                            {item.notificacion}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 shrink-0">

          {/* NUEVO ENLACE HACIA EL PERFIL DEL USUARIO */}
          <Link to="/perfil" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 mb-3 px-1 py-2 hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer group">
            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm border-2 border-transparent group-hover:border-blue-400 transition-all select-none">
              {auth.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors" title={auth.nombre}>{auth.nombre}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{auth.nombre_rol}</p>
            </div>
          </Link>

          <button onClick={cerrarSesion} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-red-300 bg-slate-800 hover:bg-red-900/40 hover:text-red-200 rounded-lg transition-all border border-slate-700 hover:border-red-800 focus:ring-2 focus:ring-red-500 shadow-sm">
            <LogOut size={16} /> CERRAR SESIÓN
          </button>

        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full w-full relative min-w-0">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between md:hidden z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg flex-shrink-0"><Wrench size={16} /></div>
            <span className="font-bold text-slate-800 tracking-wide">TALLER<span className="text-blue-600">PRO</span></span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 p-2 -mr-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu size={24} />
          </button>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-[1920px] mx-auto w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;