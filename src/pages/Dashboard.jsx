import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import clienteAxios from '../api/axios';
import { socket } from '../socket';
import {
  Activity, DollarSign, ClipboardList, Car, CheckCircle,
  TrendingDown, TrendingUp, Medal, Wrench, ChevronRight, Wallet, ShieldAlert,
  AlertTriangle // <-- Importado el icono de alerta
} from 'lucide-react';

import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const EstadoBadgeMini = ({ estado }) => {
  if (!estado) return <span className="text-gray-400">-</span>;
  const config = {
    'RECIBIDO': 'bg-gray-100 text-gray-700', 'EN_REVISION': 'bg-yellow-100 text-yellow-700',
    'DIAGNOSTICADO': 'bg-purple-100 text-purple-700', 'PRESUPUESTADO': 'bg-indigo-100 text-indigo-700',
    'APROBADO': 'bg-blue-100 text-blue-700', 'EN_REPARACION': 'bg-orange-100 text-orange-700',
    'TERMINADO': 'bg-emerald-100 text-emerald-700', 'ENTREGADO': 'bg-slate-200 text-slate-600',
    'CANCELADO': 'bg-red-100 text-red-700', 'RECHAZADO': 'bg-rose-100 text-rose-700',
  };
  const color = config[estado] || 'bg-gray-50 text-gray-500';
  return <span className={`${color} px-2.5 py-1 rounded-full text-[10px] font-bold border border-current opacity-80 uppercase`}>{String(estado).replace(/_/g, ' ')}</span>;
};

const Dashboard = () => {
  const { auth } = useAuth();

  const [stats, setStats] = useState({
    recentOrders: [], statusCounts: [], topTecnicos: [],
    alertasInventario: [], // <-- Estado añadido
    kpis: { 
        total_ordenes: 0, ordenes_activas: 0, ordenes_listas: 0, vehiculos_taller: 0, 
        ingresos_esperados: 0, gastos_totales: 0, garantias_activas: 0, tasa_garantias: 0 
    }
  });
  const [cargando, setCargando] = useState(true);

  const obtenerEstadisticas = useCallback(async () => {
    try {
      const stamp = new Date().getTime();
      const { data } = await clienteAxios.get(`/orders/dashboard/stats?_t=${stamp}`);

      setStats({
        recentOrders: Array.isArray(data?.data?.recentOrders) ? data.data.recentOrders : [],
        statusCounts: Array.isArray(data?.data?.statusCounts) ? data.data.statusCounts : [],
        topTecnicos: Array.isArray(data?.data?.topTecnicos) ? data.data.topTecnicos : [],
        alertasInventario: Array.isArray(data?.data?.alertasInventario) ? data.data.alertasInventario : [], // <-- Asignación de datos
        kpis: {
          total_ordenes: Number(data?.data?.kpis?.total_ordenes) || 0,
          ordenes_activas: Number(data?.data?.kpis?.ordenes_activas) || 0,
          ordenes_listas: Number(data?.data?.kpis?.ordenes_listas) || 0,
          vehiculos_taller: Number(data?.data?.kpis?.vehiculos_taller) || 0,
          ingresos_reales: Number(data?.data?.kpis?.ingresos_reales) || 0,
          ingresos_proyectados: Number(data?.data?.kpis?.ingresos_proyectados) || 0,
          gastos_reales: Number(data?.data?.kpis?.gastos_reales) || 0,
          gastos_proyectados: Number(data?.data?.kpis?.gastos_proyectados) || 0,
          garantias_activas: Number(data?.data?.kpis?.garantias_activas) || 0,
          tasa_garantias: Number(data?.data?.kpis?.tasa_garantias) || 0
        }
      });
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerEstadisticas();
    socket.on('actualizacion_taller', () => setTimeout(obtenerEstadisticas, 500));
    return () => socket.off('actualizacion_taller');
  }, [obtenerEstadisticas]);

  const coloresEstados = {
    'RECIBIDO': '#94a3b8', 'EN_REVISION': '#eab308', 'DIAGNOSTICADO': '#a855f7',
    'PRESUPUESTADO': '#6366f1', 'APROBADO': '#3b82f6', 'EN_REPARACION': '#f97316',
    'TERMINADO': '#10b981', 'ENTREGADO': '#64748b', 'CANCELADO': '#ef4444', 'RECHAZADO': '#f43f5e'
  };

  const validStatusCounts = Array.isArray(stats?.statusCounts) ? stats.statusCounts : [];

  const statusData = {
    labels: validStatusCounts.map(s => String(s?.estado || 'OTROS').replace(/_/g, ' ')),
    datasets: [{
      data: validStatusCounts.map(s => Number(s?.cantidad || 0)),
      backgroundColor: validStatusCounts.map(s => coloresEstados[s?.estado] || '#cbd5e1'),
      borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4,
    }],
  };

  const ingresos = stats?.kpis?.ingresos_esperados || 0;
  const gastos = stats?.kpis?.gastos_totales || 0;
  const utilidad = ingresos - gastos;

  const financeData = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      { label: 'Utilidad Mensual', data: [0, 0, 0, utilidad], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
    ],
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try { return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fecha)); } catch (e) { return '-'; }
  };

  if (cargando) return (
    <div className="flex flex-col items-center justify-center py-20 w-full">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-gray-500 text-sm font-medium">Calculando métricas en tiempo real...</p>
    </div>
  );

  return (
    <div className="fade-in space-y-6 pb-10">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="text-indigo-600" size={28} /> Resumen Operativo y Financiero
        </h1>
      </div>

      {/* --- 🚨 ALERTAS DE STOCK CRÍTICO (MAGIA INYECTADA AQUÍ) 🚨 --- */}
      {stats.alertasInventario && stats.alertasInventario.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 shadow-sm fade-in animate-pulse-slow">
              <h3 className="text-red-700 font-bold flex items-center gap-2 mb-4 uppercase text-sm tracking-wider">
                  <AlertTriangle size={20} /> ¡Atención! Repuestos en Stock Crítico
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {stats.alertasInventario.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow relative overflow-hidden">
                          {/* Borde rojo lateral para darle estilo */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                          
                          <div className="pl-2">
                              <p className="text-sm font-bold text-slate-800 line-clamp-1" title={item.nombre}>{item.nombre}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.codigo || 'Sin código'}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xl font-black text-red-600 leading-none">{Number(item.stock_actual)}</p>
                              <p className="text-[9px] uppercase font-bold text-red-400 mt-1">Min: {Number(item.stock_minimo)}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- EL CORAZÓN FINANCIERO (3 TARJETAS PRINCIPALES) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* INGRESOS REALES Y PROYECTADOS */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.02] border-b-4 border-b-blue-500 relative overflow-hidden">
          <div className="z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ingresos Seguros</p>
            <h3 className="text-3xl font-black text-slate-800">${Number(stats?.kpis?.ingresos_reales || 0).toFixed(2)}</h3>
            <p className="text-[11px] text-blue-500 font-bold mt-1.5 flex items-center gap-1 bg-blue-50 w-fit px-2 py-0.5 rounded">
              <TrendingUp size={12} /> + ${Number(stats?.kpis?.ingresos_proyectados || 0).toFixed(2)} Proyectados
            </p>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 z-10">
            <DollarSign size={28} />
          </div>
        </div>

        {/* GASTOS REALES Y PROYECTADOS */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.02] border-b-4 border-b-rose-500 relative overflow-hidden">
          <div className="z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos Operativos</p>
            <h3 className="text-3xl font-black text-slate-800">${Number(stats?.kpis?.gastos_reales || 0).toFixed(2)}</h3>
            <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1 bg-rose-50 w-fit px-2 py-0.5 rounded">
              <Activity size={12} /> + ${Number(stats?.kpis?.gastos_proyectados || 0).toFixed(2)} en Presupuestos
            </p>
          </div>
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 z-10">
            <TrendingDown size={28} />
          </div>
        </div>

        {/* GANANCIA NETA REAL Y PROYECTADA */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 p-5 rounded-2xl shadow-md text-white flex items-center justify-between transition-transform hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10">
            <Wallet size={120} className="transform translate-x-4 -translate-y-4" />
          </div>
          <div className="z-10">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Ganancia Neta</p>
            <h3 className="text-3xl font-black">${(Number(stats?.kpis?.ingresos_reales || 0) - Number(stats?.kpis?.gastos_reales || 0)).toFixed(2)}</h3>
            <p className="text-[11px] text-emerald-50 font-bold mt-1.5 flex items-center gap-1 bg-black/10 w-fit px-2 py-0.5 rounded backdrop-blur-sm">
              Esperando: + ${(Number(stats?.kpis?.ingresos_proyectados || 0) - Number(stats?.kpis?.gastos_proyectados || 0)).toFixed(2)}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
            <Wallet size={28} />
          </div>
        </div>
      </div>

      {/* --- KPIS OPERATIVOS SECUNDARIOS (AHORA 5 COLUMNAS) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Órdenes Activas</p><h3 className="text-xl font-black text-slate-800">{stats?.kpis?.ordenes_activas || 0}</h3></div>
          <ClipboardList className="text-indigo-400" size={24} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Listos (Entrega)</p><h3 className="text-xl font-black text-slate-800">{stats?.kpis?.ordenes_listas || 0}</h3></div>
          <CheckCircle className="text-emerald-500" size={24} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Procesadas (Mes)</p><h3 className="text-xl font-black text-slate-800">{stats?.kpis?.total_ordenes || 0}</h3></div>
          <Wrench className="text-slate-400" size={24} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Equipos Físicos</p><h3 className="text-xl font-black text-slate-800">{stats?.kpis?.vehiculos_taller || 0}</h3></div>
          <Car className="text-amber-500" size={24} />
        </div>
        
        {/* 🚨 SENSOR DE GARANTÍAS (CAMBIA DE COLOR SI HAY PELIGRO) */}
        <div className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-colors ${stats?.kpis?.garantias_activas > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div>
            <p className={`text-[10px] font-bold uppercase ${stats?.kpis?.garantias_activas > 0 ? 'text-red-600' : 'text-slate-400'}`}>Garantías Activas</p>
            <h3 className={`text-xl font-black ${stats?.kpis?.garantias_activas > 0 ? 'text-red-700' : 'text-slate-800'}`}>{stats?.kpis?.garantias_activas || 0}</h3>
            {stats?.kpis?.tasa_garantias > 0 && <p className="text-[9px] text-red-500 font-bold mt-1">Tasa Retorno: {stats.kpis.tasa_garantias}%</p>}
          </div>
          <ShieldAlert className={stats?.kpis?.garantias_activas > 0 ? 'text-red-500 animate-pulse' : 'text-slate-300'} size={24} />
        </div>
      </div>

      {/* --- GRÁFICOS Y TABLAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800">Crecimiento de Utilidad (Mensual)</h3><span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded">Activo</span></div>
          <div className="h-[250px] w-full"><Line data={financeData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-2">Distribución de Trabajo</h3>
          <div className="h-[180px] w-full relative mb-4">
            {validStatusCounts.length > 0 ? (<Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }} />) : (<div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50 rounded-full border border-gray-100">Sin datos</div>)}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-2xl font-black text-slate-800">{stats?.kpis?.total_ordenes || 0}</span></div>
          </div>
          <div className="mt-auto space-y-2 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
            {validStatusCounts.map((s, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-600 border-b border-slate-50 pb-1 items-center">
                <span className="flex items-center gap-2 truncate"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: coloresEstados[s?.estado] || '#ccc' }}></span>{String(s?.estado || 'Desconocido').replace(/_/g, ' ')}</span>
                <span className="font-bold">{s?.cantidad || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">Últimas Órdenes Ingresadas</h3>
            <a href="/ordenes" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center">Ver todas <ChevronRight size={16} /></a>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">Cliente / Equipo</th><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentOrders && stats.recentOrders.length > 0 ? stats.recentOrders.map((order) => (
                  <tr key={order?.id || Math.random()} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-700 font-mono">
                      #{String(order?.id || '0').padStart(4, '0')}
                    </td>
                    
                    <td className="px-6 py-4">
                      {/* 🚨 ETIQUETA VISUAL DE GARANTÍA */}
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {order?.cliente || 'Desconocido'}
                        {order?.orden_padre_id && (
                          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1 border border-red-200 uppercase tracking-wider" title={`Viene de la orden #${order.orden_padre_id}`}>
                            <ShieldAlert size={10} /> Garantía
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {order?.marca ? `${order.marca} ${order.modelo}` : (order?.tipo_modulo ? `ECU: ${order.tipo_modulo}` : 'Sin equipo')}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">{formatearFecha(order?.created_at)}</td>
                    <td className="px-6 py-4"><EstadoBadgeMini estado={order?.estado} /></td>
                  </tr>
                )) : (<tr><td colSpan="4" className="py-10 text-center text-gray-400 italic font-medium">Aún no hay trabajo en el taller.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-400 text-white flex items-center gap-2">
            <Medal size={20} className="text-amber-100" /><h3 className="font-bold text-lg">Top Técnicos</h3>
          </div>
          <div className="p-5 flex-1">
            {stats.topTecnicos && stats.topTecnicos.length > 0 ? (
              <div className="space-y-4">
                {stats.topTecnicos.map((tecnico, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="relative"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${index === 0 ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-300'}`}>{tecnico.tecnico ? tecnico.tecnico.charAt(0).toUpperCase() : '?'}</div>{index === 0 && <span className="absolute -top-1 -right-1 text-lg" title="Mejor Técnico">👑</span>}</div>
                      <div><h4 className="font-bold text-slate-800 text-sm">{tecnico.tecnico || 'Sin Asignar'}</h4><p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Wrench size={10} className="text-amber-500" /> {tecnico.ordenes_completadas} trabajos finalizados</p></div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Generó</p>
                      <p className="font-mono font-black text-emerald-600 text-sm">${Number(tecnico.dinero_generado).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (<div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60"><Medal size={40} className="text-slate-300 mb-2" /><p className="text-sm font-medium text-slate-500">Aún no hay reparaciones finalizadas.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;