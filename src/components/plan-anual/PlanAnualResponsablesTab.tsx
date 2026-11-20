import React, { useState, useMemo } from 'react';
import {
  ActividadPlanAnual,
  PlanAnualVigencia,
  ResponsablePlanOption,
} from '../../types/planAnual';
import {
  EstadoEstandarFrikaz,
  ESTADOS_ESTANDAR_FRIKAZ,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../../services/gerenteControlService';
import {
  UserCheck,
  Search,
  FileCheck2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PlanAnualResponsablesTabProps {
  plan: PlanAnualVigencia;
  responsables: ResponsablePlanOption[];
  onAbrirActividad: (
    act: ActividadPlanAnual,
    initialTab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
}

export const PlanAnualResponsablesTab: React.FC<PlanAnualResponsablesTabProps> = ({
  plan,
  responsables,
  onAbrirActividad,
}) => {
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEstandarFrikaz | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const resumenPorResponsable = useMemo(() => {
    return responsables.map((r) => {
      const asignadas = plan.actividades.filter((a) => a.responsableNombre === r.nombre);
      const cumplidas = asignadas.filter((a) => {
        const est = normalizarEstadoEstandar(a.estado);
        return est === 'Cumplido' || est === 'Aprobado';
      }).length;
      const devueltas = asignadas.filter(
        (a) => normalizarEstadoEstandar(a.estado) === 'Devuelto para ajustes'
      ).length;
      const pendientes = asignadas.length - cumplidas - devueltas;
      const pct = asignadas.length > 0 ? Math.round((cumplidas / asignadas.length) * 100) : 0;
      const porAprobar = plan.actividades.filter(
        (a) =>
          a.aprobadorNombre === r.nombre &&
          (normalizarEstadoEstandar(a.estado) === 'Pendiente de revisión' ||
            a.evidencias.some(
              (e) => normalizarEstadoEstandar(e.estadoRevision) === 'Pendiente de revisión'
            ))
      ).length;
      return {
        ...r,
        total: asignadas.length,
        cumplidas,
        pendientes,
        vencidas: devueltas,
        pct,
        porAprobar,
      };
    });
  }, [plan.actividades, responsables]);

  const actividadesFiltradas = useMemo(() => {
    return plan.actividades.filter((a) => {
      const mResp =
        responsableSeleccionado === 'TODOS' || a.responsableNombre === responsableSeleccionado;
      const mEstado =
        filtroEstado === 'TODOS' || normalizarEstadoEstandar(a.estado) === filtroEstado;
      const q = busqueda.trim().toLowerCase();
      const mQ =
        !q ||
        a.nombre.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q) ||
        a.aprobadorNombre.toLowerCase().includes(q);
      return mResp && mEstado && mQ;
    });
  }, [plan.actividades, responsableSeleccionado, filtroEstado, busqueda]);

  return (
    <div className="space-y-5 text-xs">
      {/* Tarjetas de Seguimiento por Responsable */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#f97316]" />
              <span>Quién hace y quién revisa las tareas — Año {plan.vigencia}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Toque una tarjeta para ver solo las tareas de esa persona, sus fechas límite y las pruebas por revisar.
            </p>
          </div>
          {responsableSeleccionado !== 'TODOS' && (
            <button
              type="button"
              onClick={() => setResponsableSeleccionado('TODOS')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Ver a todos los encargados
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumenPorResponsable
            .filter((r) => r.total > 0 || r.porAprobar > 0)
            .map((r) => {
              const selected = responsableSeleccionado === r.nombre;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setResponsableSeleccionado(selected ? 'TODOS' : r.nombre)
                  }
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    selected
                      ? 'border-[#f97316] bg-orange-50/70 ring-1 ring-[#f97316]'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900">{r.nombre}</h4>
                      <p className="text-[10px] text-slate-500">{r.area}</p>
                    </div>
                    <span className="font-mono font-black text-sm text-[#0f172a]">
                      {r.pct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {r.total} tareas
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {r.cumplidas} cumplido(s)
                    </span>
                    {r.vencidas > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                        {r.vencidas} devuelto(s) para ajustes
                      </span>
                    )}
                    {r.porAprobar > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        {r.porAprobar} pendiente(s) de revisión
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Tabla Detallada de Actividades Asignadas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-black text-slate-900">
            Lista de tareas de cada persona ({actividadesFiltradas.length})
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar tarea o quién revisa..."
                className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-56"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="TODOS">Estado: Todos</option>
              {ESTADOS_ESTANDAR_FRIKAZ.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0f172a] text-white uppercase text-[10px]">
                <th className="p-3">Tarea</th>
                <th className="p-3">Encargado de hacer la tarea</th>
                <th className="p-3">Quien revisa y aprueba</th>
                <th className="p-3">Fecha límite</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actividadesFiltradas.map((a) => (
                <tr key={a.id} className="hover:bg-orange-50/40">
                  <td className="p-3">
                    <span className="font-mono font-black text-[10px] bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                      {a.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAbrirActividad(a, 'datos')}
                      className="font-bold text-slate-900 hover:text-[#f97316] text-left cursor-pointer"
                    >
                      {a.nombre}
                    </button>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{a.responsableNombre}</td>
                  <td className="p-3 text-slate-600">{a.aprobadorNombre}</td>
                  <td className="p-3 font-mono whitespace-nowrap">{a.fechaLimite}</td>
                  <td className="p-3 whitespace-nowrap">
                    {(() => {
                      const badge = getBadgeClassesEstadoFrikaz(a.estado);
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-black text-[10px] ${badge.light}`}
                        >
                          {badge.label === 'Cumplido' || badge.label === 'Aprobado' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : badge.label === 'Devuelto para ajustes' ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(a, 'evidencias')}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 cursor-pointer"
                        title="Ver pruebas y aprobación"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(a, 'datos')}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-800 cursor-pointer"
                        title="Abrir ficha de la tarea"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
