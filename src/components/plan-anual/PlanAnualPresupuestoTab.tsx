import React, { useState, useMemo } from 'react';
import {
  ActividadPlanAnual,
  AreaPlanAnual,
  PlanAnualVigencia,
} from '../../types/planAnual';
import { getBadgeClassesEstadoFrikaz } from '../../services/gerenteControlService';
import {
  DollarSign,
  Search,
  Edit3,
  PieChart,
  TrendingUp,
} from 'lucide-react';

interface PlanAnualPresupuestoTabProps {
  plan: PlanAnualVigencia;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    initialTab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
}

export const PlanAnualPresupuestoTab: React.FC<PlanAnualPresupuestoTabProps> = ({
  plan,
  onAbrirActividad,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState<AreaPlanAnual | 'TODAS'>('TODAS');

  const actividades = useMemo(() => {
    return plan.actividades.filter((a) => {
      const q = busqueda.trim().toLowerCase();
      const matchQ =
        !q ||
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.responsableNombre.toLowerCase().includes(q);
      const matchArea = filtroArea === 'TODAS' || a.area === filtroArea;
      return matchQ && matchArea;
    });
  }, [plan.actividades, busqueda, filtroArea]);

  const resumen = useMemo(() => {
    const asignado = actividades.reduce((s, a) => s + (a.presupuestoEstimado || 0), 0);
    const ejecutado = actividades.reduce((s, a) => s + (a.gastoEjecutado || 0), 0);
    const disponible = asignado - ejecutado;
    const pct = asignado > 0 ? Math.round((ejecutado / asignado) * 1000) / 10 : 0;
    return { asignado, ejecutado, disponible, pct };
  }, [actividades]);

  const porArea = useMemo(() => {
    return (['SST', 'AMBIENTAL', 'INTEGRAL'] as AreaPlanAnual[]).map((area) => {
      const acts = plan.actividades.filter((a) => a.area === area);
      const asignado = acts.reduce((s, a) => s + (a.presupuestoEstimado || 0), 0);
      const ejecutado = acts.reduce((s, a) => s + (a.gastoEjecutado || 0), 0);
      const disponible = asignado - ejecutado;
      const pct = asignado > 0 ? Math.round((ejecutado / asignado) * 1000) / 10 : 0;
      return { area, cantidad: acts.length, asignado, ejecutado, disponible, pct };
    });
  }, [plan.actividades]);

  return (
    <div className="space-y-5 text-xs">
      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-[#0f172a]" />
            Presupuesto Separado
          </span>
          <span className="text-xl font-black font-mono text-[#0f172a] block mt-1">
            ${resumen.asignado.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-slate-500">Año {plan.vigencia}</span>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-orange-800 block">
            Dinero Gastado
          </span>
          <span className="text-xl font-black font-mono text-orange-950 block mt-1">
            ${resumen.ejecutado.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-orange-800">{resumen.pct}% ya usado</span>
        </div>

        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            resumen.disponible < 0
              ? 'border-rose-300 bg-rose-50'
              : 'border-emerald-200 bg-emerald-50/70'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-600 block">
            Queda Disponible
          </span>
          <span
            className={`text-xl font-black font-mono block mt-1 ${
              resumen.disponible < 0 ? 'text-rose-800' : 'text-emerald-900'
            }`}
          >
            ${resumen.disponible.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-slate-600">
            {resumen.disponible < 0 ? 'Se gastó más de lo planeado' : 'Plata disponible para usar'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-[#f97316]" />
              Cuánto se ha usado
            </span>
            <span className="font-mono font-black text-slate-900">{resumen.pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
            <div
              className="bg-[#f97316] h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, resumen.pct)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {actividades.length} tarea(s) revisadas
          </span>
        </div>
      </div>

      {/* Distribución por Área */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
          <PieChart className="h-4 w-4 text-[#f97316]" />
          <span>Cómo se reparte el dinero por área</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {porArea.map((item) => (
            <div
              key={item.area}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">{item.area}</span>
                <span className="text-[10px] font-bold text-slate-500">
                  {item.cantidad} tarea(s)
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Separado:</span>
                  <strong className="text-slate-900">${item.asignado.toLocaleString('es-CO')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gastado:</span>
                  <strong className="text-orange-700">${item.ejecutado.toLocaleString('es-CO')}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-600">Queda:</span>
                  <strong className={item.disponible < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    ${item.disponible.toLocaleString('es-CO')}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de Presupuesto por Actividad */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#0f172a]">
              Detalle del dinero planeado y gastado en cada tarea
            </h3>
            <p className="text-[11px] text-slate-500">
              Haga clic en «Actualizar» en cualquier tarea si necesita anotar lo que se gastó o cambiar su valor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar tarea o encargado..."
                className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-56"
              />
            </div>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="TODAS">Área: Todas</option>
              <option value="SST">SST (Seguridad y Salud)</option>
              <option value="AMBIENTAL">Cuidado Ambiental</option>
              <option value="INTEGRAL">SST + Ambiental</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0f172a] text-white uppercase text-[10px] tracking-wider">
                <th className="p-3">Código y Tarea</th>
                <th className="p-3">Área</th>
                <th className="p-3">Encargado</th>
                <th className="p-3 text-right">Separado</th>
                <th className="p-3 text-right">Gastado</th>
                <th className="p-3 text-right">Disponible</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Cambiar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actividades.map((a) => {
                const disp = (a.presupuestoEstimado || 0) - (a.gastoEjecutado || 0);
                return (
                  <tr key={a.id} className="hover:bg-orange-50/40">
                    <td className="p-3">
                      <span className="font-mono font-black text-[10px] text-[#0f172a] bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                        {a.codigo}
                      </span>
                      <span className="font-bold text-slate-900">{a.nombre}</span>
                    </td>
                    <td className="p-3 font-semibold">{a.area}</td>
                    <td className="p-3 text-slate-600">{a.responsableNombre}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      ${(a.presupuestoEstimado || 0).toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right font-mono text-orange-700 font-bold">
                      ${(a.gastoEjecutado || 0).toLocaleString('es-CO')}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-black ${
                        disp < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      ${disp.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const badge = getBadgeClassesEstadoFrikaz(a.estado);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badge.light}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(a, 'datos')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Actualizar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
