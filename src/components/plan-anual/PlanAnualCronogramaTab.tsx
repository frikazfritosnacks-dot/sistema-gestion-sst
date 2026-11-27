import React, { useState, useMemo, useEffect } from 'react';
import {
  ActividadPlanAnual,
  AreaPlanAnual,
  OrigenActividadPlan,
  PlanAnualVigencia,
  ResponsablePlanOption,
} from '../../types/planAnual';
import {
  EstadoEstandarFrikaz,
  ESTADOS_ESTANDAR_FRIKAZ,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../../services/gerenteControlService';
import { formatPresupuestoProgramadoLabel } from '../../services/planAnualService';
import {
  Calendar,
  List,
  GanttChart,
  Plus,
  Search,
  FileCheck2,
  Edit3,
  Trash2,
  Repeat,
  ShieldAlert,
  Scale,
  UserCheck,
  Award,
} from 'lucide-react';

interface PlanAnualCronogramaTabProps {
  plan: PlanAnualVigencia;
  responsables: ResponsablePlanOption[];
  onNuevaActividad: () => void;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    initialTab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onEliminarActividad: (actividadId: string) => void;
  onGenerarCertificado?: (act: ActividadPlanAnual) => void;
  externalSearch?: string;
  externalEstadoFiltro?: string;
  navNonce?: number;
}

export function esActividadCapacitacion(act: ActividadPlanAnual): boolean {
  return Boolean(
    act.capacitacionNombre ||
      /capacit|charla|inducci|orientaci|socializaci/i.test(act.nombre)
  );
}

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const PlanAnualCronogramaTab: React.FC<PlanAnualCronogramaTabProps> = ({
  plan,
  responsables,
  onNuevaActividad,
  onAbrirActividad,
  onEliminarActividad,
  onGenerarCertificado,
  externalSearch,
  externalEstadoFiltro,
  navNonce,
}) => {
  const [vista, setVista] = useState<'gantt' | 'calendario' | 'lista'>('gantt');
  const [busqueda, setBusqueda] = useState(externalSearch || '');
  const [soloCapacitaciones, setSoloCapacitaciones] = useState(false);
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroTrimestre, setFiltroTrimestre] = useState<'TODOS' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('TODOS');
  const [filtroArea, setFiltroArea] = useState<AreaPlanAnual | 'TODAS'>('TODAS');
  const [filtroOrigen, setFiltroOrigen] = useState<OrigenActividadPlan | 'TODOS'>('TODOS');
  const [filtroRecurrencia, setFiltroRecurrencia] = useState<'TODAS' | 'RECURRENTES' | 'UNICAS'>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEstandarFrikaz | 'TODOS'>(() =>
    externalEstadoFiltro && ESTADOS_ESTANDAR_FRIKAZ.includes(externalEstadoFiltro as EstadoEstandarFrikaz)
      ? (externalEstadoFiltro as EstadoEstandarFrikaz)
      : 'TODOS'
  );
  const [filtroResponsable, setFiltroResponsable] = useState<string>('TODOS');
  const [mesCalendario, setMesCalendario] = useState<number>(() =>
    plan.vigencia >= 2027 ? 1 : new Date().getMonth() + 1
  );

  useEffect(() => {
    if (navNonce === undefined) return;
    if (externalSearch !== undefined) setBusqueda(externalSearch);
    if (
      externalEstadoFiltro &&
      ESTADOS_ESTANDAR_FRIKAZ.includes(externalEstadoFiltro as EstadoEstandarFrikaz)
    ) {
      setFiltroEstado(externalEstadoFiltro as EstadoEstandarFrikaz);
      setVista('lista');
    } else if (externalEstadoFiltro === 'TODOS') {
      setFiltroEstado('TODOS');
    }
  }, [navNonce, externalSearch, externalEstadoFiltro]);

  const mesesPorTrimestre: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number[]> = {
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12],
  };

  const actividadesFiltradas = useMemo(() => {
    return plan.actividades.filter((a) => {
      const q = busqueda.trim().toLowerCase();
      const matchQ =
        !q ||
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        (a.riesgoCodigo || '').toLowerCase().includes(q) ||
        (a.normaOficial || '').toLowerCase().includes(q);
      const matchMes =
        filtroMes === 'TODOS' || a.programacionMensual.includes(Number(filtroMes));
      const matchTrim =
        filtroTrimestre === 'TODOS' ||
        a.programacionMensual.some((m) => mesesPorTrimestre[filtroTrimestre].includes(m));
      const matchArea = filtroArea === 'TODAS' || a.area === filtroArea;
      const matchOrigen = filtroOrigen === 'TODOS' || a.origen === filtroOrigen;
      const matchRec =
        filtroRecurrencia === 'TODAS'
          ? true
          : filtroRecurrencia === 'RECURRENTES'
          ? a.esRecurrente
          : !a.esRecurrente;
      const matchEstado =
        filtroEstado === 'TODOS' || normalizarEstadoEstandar(a.estado) === filtroEstado;
      const matchResp =
        filtroResponsable === 'TODOS' || a.responsableNombre === filtroResponsable;
      const matchCap = !soloCapacitaciones || esActividadCapacitacion(a);
      return (
        matchQ &&
        matchMes &&
        matchTrim &&
        matchArea &&
        matchOrigen &&
        matchRec &&
        matchEstado &&
        matchResp &&
        matchCap
      );
    });
  }, [
    plan.actividades,
    busqueda,
    soloCapacitaciones,
    filtroMes,
    filtroTrimestre,
    filtroArea,
    filtroOrigen,
    filtroRecurrencia,
    filtroEstado,
    filtroResponsable,
  ]);

  const getEstadoBadge = (estado: string) => {
    return getBadgeClassesEstadoFrikaz(estado).light;
  };

  // Construcción de matriz de días para la vista Calendario Mensual
  const calendarioDias = useMemo(() => {
    const firstDay = new Date(plan.vigencia, mesCalendario - 1, 1);
    const daysInMonth = new Date(plan.vigencia, mesCalendario, 0).getDate();
    // Lunes=0 .. Domingo=6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ day: number | null; iso?: string }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(mesCalendario).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, iso: `${plan.vigencia}-${mm}-${dd}` });
    }
    return cells;
  }, [plan.vigencia, mesCalendario]);

  return (
    <div className="space-y-4 text-xs">
      {/* Barra de Filtros, Selector de Vista y Botón Nueva Actividad */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setVista('gantt')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                vista === 'gantt'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GanttChart className="h-3.5 w-3.5" />
              <span>Vista Año Completo (Gantt)</span>
            </button>
            <button
              type="button"
              onClick={() => setVista('calendario')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                vista === 'calendario'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Calendario por Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setVista('lista')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                vista === 'lista'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Tarjetas con Todos los Datos</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSoloCapacitaciones((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-black border cursor-pointer transition-colors ${
                soloCapacitaciones
                  ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                  : 'bg-[#f4faf8] text-[#0d3b36] border-[#b9dad3] hover:bg-[#e5f3ef]'
              }`}
              title="Filtrar solo las capacitaciones para generar certificados"
            >
              <Award className="h-4 w-4 text-[#f97316]" />
              <span>Solo capacitaciones</span>
            </button>
            <button
              type="button"
              onClick={onNuevaActividad}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nueva Tarea</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative sm:col-span-2">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tarea por nombre, código, peligro o norma..."
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
            />
          </div>

          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Mes: Todos (Ene - Dic)</option>
            {MESES_LARGOS.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                Mes: {m}
              </option>
            ))}
          </select>

          <select
            value={filtroTrimestre}
            onChange={(e) => setFiltroTrimestre(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Trimestre: Todos (Q1 - Q4)</option>
            <option value="Q1">Q1 (Ene - Mar)</option>
            <option value="Q2">Q2 (Abr - Jun)</option>
            <option value="Q3">Q3 (Jul - Sep)</option>
            <option value="Q4">Q4 (Oct - Dic)</option>
          </select>

          <select
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Responsable: Todos</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>

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

          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODAS">Tipo / Área: Todas</option>
            <option value="SST">Área: SST</option>
            <option value="AMBIENTAL">Área: Ambiental</option>
            <option value="INTEGRAL">Área: Integral</option>
          </select>

          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white"
            >
              <option value="TODOS">Origen: Todos</option>
              <option value="RIESGO_GTC45">Riesgo GTC 45</option>
              <option value="NORMA_OBLIGATORIA">Norma Legal</option>
              <option value="MANUAL">Manual</option>
            </select>
            <select
              value={filtroRecurrencia}
              onChange={(e) => setFiltroRecurrencia(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white"
            >
              <option value="TODAS">Frec.: Todas</option>
              <option value="RECURRENTES">Recurrentes</option>
              <option value="UNICAS">Únicas</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA 1: CRONOGRAMA GANTT ANUAL (12 MESES)                            */}
      {/* ===================================================================== */}
      {vista === 'gantt' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#0f172a] text-white text-[10px] uppercase tracking-wider">
                  <th className="p-3 min-w-[260px]">Tarea / De dónde sale</th>
                  <th className="p-3 whitespace-nowrap">Encargado</th>
                  <th className="p-3 whitespace-nowrap">Estado y Límite</th>
                  <th className="p-3 whitespace-nowrap text-right">Presup. / Usado</th>
                  {MESES_CORTOS.map((m) => (
                    <th key={m} className="p-2 text-center w-9">
                      {m}
                    </th>
                  ))}
                  <th className="p-3 text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actividadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-slate-500">
                      No hay tareas con estos filtros.
                    </td>
                  </tr>
                ) : (
                  actividadesFiltradas.map((act) => (
                    <tr key={act.id} className="hover:bg-orange-50/40">
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-black text-[10px] text-[#0f172a] bg-slate-100 px-1.5 py-0.5 rounded">
                            {act.codigo}
                          </span>
                          {act.riesgoCodigo && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] inline-flex items-center gap-0.5">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              {act.riesgoCodigo} (NR {act.riesgoNivelNR})
                            </span>
                          )}
                          {act.normaOficial && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-0.5">
                              <Scale className="h-2.5 w-2.5" />
                              Norma
                            </span>
                          )}
                          {act.esPlanEmergencias && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">
                              Emergencias
                            </span>
                          )}
                          {act.planMejoraRiesgoId && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                              Plan mejora
                            </span>
                          )}
                          {act.reprogramacionOrigen && (
                            <span className="px-1.5 py-0.5 rounded bg-[#e7f4f1] text-[#0f6b61] font-bold text-[10px]">
                              Reprog. de {act.reprogramacionOrigen.anioOrigen}
                            </span>
                          )}
                          {act.reprogramadaParaAnio && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                              Reprog. a {act.reprogramadaParaAnio}
                            </span>
                          )}
                          {act.historialCambiosFechas && act.historialCambiosFechas.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {act.historialCambiosFechas.length} cambio(s) fecha
                            </span>
                          )}
                          {act.esRecurrente && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] inline-flex items-center gap-0.5">
                              <Repeat className="h-2.5 w-2.5" />
                              {act.periodicidad}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onAbrirActividad(act, 'datos')}
                          className="font-bold text-slate-900 hover:text-[#f97316] text-left cursor-pointer"
                        >
                          {act.nombre}
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{act.responsableNombre}</p>
                        <p className="text-[10px] text-slate-400">
                          Aprueba: {act.aprobadorNombre.split(' ')[0]}
                        </p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded border font-black text-[10px] inline-block ${getEstadoBadge(
                            act.estado
                          )}`}
                        >
                          {getBadgeClassesEstadoFrikaz(act.estado).label}
                        </span>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                          Límite: {act.fechaLimite}
                        </p>
                      </td>
                      <td className="p-3 whitespace-nowrap text-right font-mono">
                        <p className="font-bold text-slate-900 text-[10px]">
                          Prog: {formatPresupuestoProgramadoLabel(act)}
                        </p>
                        <p className="text-[10px] text-[#0f6b61]">
                          Aprob: ${(act.presupuestoAprobado || 0).toLocaleString('es-CO')} · Ejec: $
                          {(act.gastoEjecutado || 0).toLocaleString('es-CO')}
                        </p>
                      </td>
                      {MESES_CORTOS.map((_, idx) => {
                        const mNum = idx + 1;
                        const prog = act.programacionMensual.includes(mNum);
                        const estNorm = normalizarEstadoEstandar(act.estado);
                        const colorCell = !prog
                          ? 'bg-transparent'
                          : estNorm === 'Cumplido' || estNorm === 'Aprobado'
                          ? 'bg-emerald-500'
                          : estNorm === 'Devuelto para ajustes'
                          ? 'bg-rose-500'
                          : estNorm === 'Pendiente de revisión'
                          ? 'bg-amber-500'
                          : estNorm === 'En proceso'
                          ? 'bg-[#f97316]'
                          : 'bg-[#0f172a]';

                        return (
                          <td key={mNum} className="p-1 text-center">
                            {prog && (
                              <div
                                title={`${act.nombre} (${MESES_LARGOS[idx]})`}
                                className={`h-5 w-full rounded-sm ${colorCell} opacity-90`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {onGenerarCertificado && esActividadCapacitacion(act) && (
                            <button
                              type="button"
                              onClick={() => onGenerarCertificado(act)}
                              className="px-2 py-1 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-[10px] inline-flex items-center gap-1 cursor-pointer"
                              title="Generar certificado de participación"
                            >
                              <Award className="h-3 w-3" />
                              <span>GENERAR CERTIFICADO</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onAbrirActividad(act, 'evidencias')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 cursor-pointer"
                            title="Evidencias y cierre"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAbrirActividad(act, 'datos')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-800 cursor-pointer"
                            title="Editar actividad"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: CALENDARIO MENSUAL                                           */}
      {/* ===================================================================== */}
      {vista === 'calendario' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-black text-sm text-[#0f172a]">
              Calendario de Cumplimiento — {MESES_LARGOS[mesCalendario - 1]} {plan.vigencia}
            </h4>
            <div className="flex flex-wrap gap-1">
              {MESES_CORTOS.map((m, i) => {
                const mesN = i + 1;
                const countMes = actividadesFiltradas.filter((a) =>
                  a.programacionMensual.includes(mesN)
                ).length;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMesCalendario(mesN)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                      mesCalendario === mesN
                        ? 'bg-[#f97316] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m} ({countMes})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center font-black text-[10px] uppercase text-slate-500">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="py-1 bg-slate-100 rounded">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarioDias.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <div key={`empty-${idx}`} className="min-h-[82px] bg-slate-50/50 rounded-xl" />;
              }
              const actsDia = actividadesFiltradas.filter((a) => a.fechaLimite === cell.iso);
              return (
                <div
                  key={cell.iso}
                  className="min-h-[82px] rounded-xl border border-slate-200 bg-white p-1.5 flex flex-col gap-1"
                >
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {cell.day}
                  </span>
                  {actsDia.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAbrirActividad(a, 'evidencias')}
                      className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-bold truncate border cursor-pointer ${getEstadoBadge(
                        a.estado
                      )}`}
                      title={`${a.codigo}: ${a.nombre} (${a.responsableNombre})`}
                    >
                      {a.codigo} {a.nombre}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: LISTADO DETALLADO CON LOS 9 CAMPOS                           */}
      {/* ===================================================================== */}
      {vista === 'lista' && (
        <div className="space-y-3">
          {actividadesFiltradas.map((act) => {
            const aprobado = act.presupuestoAprobado || 0;
            const ejecutado = act.gastoEjecutado || 0;
            const saldo = Math.max(0, aprobado - ejecutado);
            return (
              <div
                key={act.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-black text-[10px]">
                        {act.codigo}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {act.area}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border font-black text-[10px] ${getEstadoBadge(
                          act.estado
                        )}`}
                      >
                        {getBadgeClassesEstadoFrikaz(act.estado).label}
                      </span>
                      {act.reprogramacionOrigen && (
                        <span className="px-2 py-0.5 rounded bg-[#e7f4f1] text-[#0f6b61] font-bold text-[10px]">
                          Reprogramada de {act.reprogramacionOrigen.anioOrigen}
                        </span>
                      )}
                      {act.reprogramadaParaAnio && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                          Reprogramada a {act.reprogramadaParaAnio}
                        </span>
                      )}
                      {act.esRecurrente && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                          Recurrente ({act.periodicidad})
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">{act.nombre}</h4>
                    <p className="text-[11px] text-slate-600">{act.descripcion}</p>
                    {(act.capacitacionNombre || act.formatoNombre || act.recursosNecesarios) && (
                      <p className="text-[10px] text-[#0f6b61] font-semibold">
                        {act.recursosNecesarios ? `Recursos: ${act.recursosNecesarios}` : ''}
                        {act.capacitacionNombre ? ` · Capacitación: ${act.capacitacionNombre}` : ''}
                        {act.formatoNombre ? ` · Formato: ${act.formatoNombre}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onGenerarCertificado && esActividadCapacitacion(act) && (
                      <button
                        type="button"
                        onClick={() => onGenerarCertificado(act)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
                      >
                        <Award className="h-3.5 w-3.5" />
                        <span>GENERAR CERTIFICADO</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAbrirActividad(act, 'evidencias')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>Evidencias ({act.evidencias.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAbrirActividad(act, 'datos')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    {normalizarEstadoEstandar(plan.estadoAprobacion) !== 'Aprobado' &&
                      normalizarEstadoEstandar(plan.estadoAprobacion) !== 'Cumplido' && (
                        <button
                          type="button"
                          onClick={() => onEliminarActividad(act.id)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Criterio de aceptación
                    </span>
                    <span className="text-slate-800">{act.criterioAceptacion}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Responsable y revisión
                    </span>
                    <span className="text-slate-800 block font-semibold">
                      Ejecuta: {act.responsableNombre}
                    </span>
                    <span className="text-slate-500 block">Revisa: {act.aprobadorNombre}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Presupuesto diferenciado
                    </span>
                    <span className="font-mono font-bold text-slate-900 block">
                      Prog: {formatPresupuestoProgramadoLabel(act)}
                    </span>
                    <span className="font-mono text-[#0f6b61] block">
                      Aprob: ${aprobado.toLocaleString('es-CO')} · Ejec: ${ejecutado.toLocaleString('es-CO')}
                    </span>
                    <span className="font-mono font-black text-emerald-700">
                      Saldo disp.: ${saldo.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Fechas y trazabilidad
                    </span>
                    <span className="font-mono text-slate-800 block">
                      {act.fechaInicio} → {act.fechaLimite}
                    </span>
                    <span className="text-slate-500 line-clamp-2">
                      {act.observaciones || 'Sin novedades anotadas.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
