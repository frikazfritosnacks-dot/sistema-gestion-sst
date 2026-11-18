import React, { useState, useMemo } from 'react';
import {
  ActividadPlanAnual,
  PlanAnualVigencia,
  RequisitoObligatorioIdentificado,
  SolicitudRevisionPlan,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { CaracterizacionEmpresaDinamica } from '../../types/dynamicConfig';
import {
  crearRiesgoSnapshot,
  determinarGrupoEstandares0312,
  extraerMedidasRiesgo,
} from '../../services/planAnualService';
import {
  ShieldAlert,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ExternalLink,
  RefreshCw,
  GitPullRequest,
  Filter,
  Search,
  Check,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface PlanAnualRiesgosNormasTabProps {
  plan: PlanAnualVigencia;
  riesgos: RiesgoGTC45Item[];
  config: CaracterizacionEmpresaDinamica;
  requisitos: RequisitoObligatorioIdentificado[];
  mode?: 'riesgos' | 'normativa' | 'ambos';
  onProgramarRiesgo: (riesgo: RiesgoGTC45Item) => void;
  onProgramarTodosRiesgosCriticos: (riesgosPendientes: RiesgoGTC45Item[]) => void;
  onIncorporarRequisito: (req: RequisitoObligatorioIdentificado) => void;
  onIncorporarTodosRequisitos: (reqsPendientes: RequisitoObligatorioIdentificado[]) => void;
  onAbrirActividad: (actividad: ActividadPlanAnual, tab?: 'datos' | 'evidencias' | 'historial') => void;
  onResolverSolicitud: (solicitud: SolicitudRevisionPlan, decision: 'APROBADA' | 'RECHAZADA') => void;
  onReescanearFuentes: () => void;
}

export const PlanAnualRiesgosNormasTab: React.FC<PlanAnualRiesgosNormasTabProps> = ({
  plan,
  riesgos,
  config,
  requisitos,
  mode = 'ambos',
  onProgramarRiesgo,
  onProgramarTodosRiesgosCriticos,
  onIncorporarRequisito,
  onIncorporarTodosRequisitos,
  onAbrirActividad,
  onResolverSolicitud,
  onReescanearFuentes,
}) => {
  const [subSeccion, setSubSeccion] = useState<'riesgos' | 'normas' | 'cambios'>(
    mode === 'normativa' ? 'normas' : 'riesgos'
  );
  const [filtroNivel, setFiltroNivel] = useState<'CRITICOS_I_II' | 'TODOS' | 'I' | 'II' | 'III' | 'IV'>('CRITICOS_I_II');
  const [busquedaRiesgo, setBusquedaRiesgo] = useState('');
  const [soloPendientesNorma, setSoloPendientesNorma] = useState(false);

  const info0312 = useMemo(() => determinarGrupoEstandares0312(config), [config]);

  const riesgosFiltrados = useMemo(() => {
    return riesgos.filter((r) => {
      const matchNivel =
        filtroNivel === 'TODOS'
          ? true
          : filtroNivel === 'CRITICOS_I_II'
          ? r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
          : r.interpretacionNR === filtroNivel;
      const q = busquedaRiesgo.trim().toLowerCase();
      const matchTexto =
        !q ||
        (r.codigo || '').toLowerCase().includes(q) ||
        (r.cargo || r.cargosExpuestos || '').toLowerCase().includes(q) ||
        r.proceso.toLowerCase().includes(q) ||
        r.actividades.toLowerCase().includes(q) ||
        r.peligroDescripcion.toLowerCase().includes(q);
      return matchNivel && matchTexto;
    });
  }, [riesgos, filtroNivel, busquedaRiesgo]);

  const riesgosCriticos = useMemo(
    () => riesgos.filter((r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'),
    [riesgos]
  );

  const riesgosCriticosPendientes = useMemo(
    () => riesgosCriticos.filter((r) => !plan.actividades.some((a) => a.riesgoId === r.id)),
    [riesgosCriticos, plan.actividades]
  );

  const requisitosAplicables = useMemo(
    () => requisitos.filter((r) => r.aplicaEmpresaActual),
    [requisitos]
  );

  const requisitosPendientes = useMemo(
    () => requisitosAplicables.filter((r) => !r.yaProgramadaEnPlan),
    [requisitosAplicables]
  );

  const requisitosVisibles = useMemo(
    () => (soloPendientesNorma ? requisitosPendientes : requisitos),
    [requisitos, requisitosPendientes, soloPendientesNorma]
  );

  const solicitudesPendientes = useMemo(
    () => plan.solicitudesRevision.filter((s) => s.estado === 'PENDIENTE'),
    [plan.solicitudesRevision]
  );

  const activeSubSeccion =
    mode === 'riesgos'
      ? 'riesgos'
      : mode === 'normativa' && subSeccion === 'riesgos'
      ? 'normas'
      : subSeccion;

  return (
    <div className="space-y-5 text-xs">
      {/* Navegación interna de Fuentes Automáticas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {mode !== 'normativa' && (
            <button
              type="button"
              onClick={() => setSubSeccion('riesgos')}
              className={`px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubSeccion === 'riesgos'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-[#f97316]" />
              <span>Peligros Altos de la Matriz GTC 45 (Niveles I y II: {riesgosCriticos.length})</span>
            </button>
          )}

          {mode !== 'riesgos' && (
            <button
              type="button"
              onClick={() => setSubSeccion('normas')}
              className={`px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubSeccion === 'normas'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Scale className="h-4 w-4 text-emerald-400" />
              <span>
                Lo que Pide la Ley (Res. 0312 / Normas: {requisitosPendientes.length} por agregar)
              </span>
            </button>
          )}

          {mode !== 'riesgos' && (
            <button
              type="button"
              onClick={() => setSubSeccion('cambios')}
              className={`px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubSeccion === 'cambios'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : solicitudesPendientes.length > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <GitPullRequest className="h-4 w-4" />
              <span>Cambios por Revisar ({solicitudesPendientes.length} pendientes)</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onReescanearFuentes}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
          title="Volver a revisar si cambiaron los peligros, las normas o el número de trabajadores"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#f97316]" />
          <span>Revisar Cambios Ahora</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SECCIÓN 1: RIESGOS GTC 45 CONECTADOS AL PLAN ANUAL                    */}
      {/* ===================================================================== */}
      {activeSubSeccion === 'riesgos' && (
        <div className="space-y-4">
          {/* Header Resumen + Acción Masiva */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>Peligros Más Graves Conectados con el Plan Anual (Niveles I y II)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Estos peligros vienen directo de la Matriz GTC 45 sin tener que volver a escribirlos. Puede filtrar por nivel, ver el puesto de trabajo y agregarlos como tarea al Plan {plan.vigencia}.
                </p>
              </div>

              {riesgosCriticosPendientes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onProgramarTodosRiesgosCriticos(riesgosCriticosPendientes)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] shadow-xs cursor-pointer shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Agregar {riesgosCriticosPendientes.length} Riesgo(s) Nivel I y II al Plan
                  </span>
                </button>
              )}
            </div>

            {/* KPI Strip de Riesgos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-700 block">
                  Nivel I (Muy grave — parar o corregir ya)
                </span>
                <span className="text-xl font-black text-rose-950 font-mono">
                  {riesgos.filter((r) => r.interpretacionNR === 'I').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                <span className="text-[10px] font-bold uppercase text-orange-700 block">
                  Nivel II (Alto — corregir pronto)
                </span>
                <span className="text-xl font-black text-orange-950 font-mono">
                  {riesgos.filter((r) => r.interpretacionNR === 'II').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                  Peligros I y II ya en el Plan
                </span>
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {riesgosCriticos.length - riesgosCriticosPendientes.length} / {riesgosCriticos.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">
                  Faltan por Agregar (I y II)
                </span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {riesgosCriticosPendientes.length}
                </span>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  Nivel de Calificación:
                </span>
                {(
                  [
                    { id: 'CRITICOS_I_II', label: 'Prioritarios (I y II)' },
                    { id: 'I', label: 'Nivel I' },
                    { id: 'II', label: 'Nivel II' },
                    { id: 'III', label: 'Nivel III' },
                    { id: 'IV', label: 'Nivel IV' },
                    { id: 'TODOS', label: 'Todos' },
                  ] as const
                ).map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setFiltroNivel(op.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                      filtroNivel === op.id
                        ? 'bg-[#0f172a] text-[#fed7aa]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busquedaRiesgo}
                  onChange={(e) => setBusquedaRiesgo(e.target.value)}
                  placeholder="Filtrar por cargo, proceso, actividad o peligro..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Lista de Riesgos Filtrados */}
          <div className="space-y-3">
            {riesgosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No se encontraron riesgos para el filtro seleccionado.
              </div>
            ) : (
              riesgosFiltrados.map((r) => {
                const actVinculada = plan.actividades.find((a) => a.riesgoId === r.id);
                const medidas = extraerMedidasRiesgo(r);
                const snapActual = crearRiesgoSnapshot(r);
                const necesitaRevision =
                  actVinculada?.riesgoSnapshot &&
                  (actVinculada.riesgoSnapshot.nivelRiesgo !== snapActual.nivelRiesgo ||
                    actVinculada.riesgoSnapshot.interpretacionNR !== snapActual.interpretacionNR ||
                    actVinculada.riesgoSnapshot.medidasResumen !== snapActual.medidasResumen ||
                    actVinculada.riesgoSnapshot.peligroDescripcion !== snapActual.peligroDescripcion);

                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border bg-white p-4 shadow-xs transition-all space-y-3 ${
                      necesitaRevision
                        ? 'border-amber-400 ring-1 ring-amber-200'
                        : r.interpretacionNR === 'I'
                        ? 'border-rose-200'
                        : r.interpretacionNR === 'II'
                        ? 'border-orange-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#0f172a] text-white font-mono font-black text-[10px]">
                            {r.codigo || r.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              r.interpretacionNR === 'I'
                                ? 'bg-rose-600 text-white'
                                : r.interpretacionNR === 'II'
                                ? 'bg-[#f97316] text-white'
                                : r.interpretacionNR === 'III'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Nivel {r.interpretacionNR} (NR {r.nivelRiesgo})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {r.peligroClasificacion}
                          </span>
                          {actVinculada ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Vinculado a {actVinculada.codigo} ({actVinculada.estado})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Sin actividad en Plan {plan.vigencia}
                            </span>
                          )}
                          {necesitaRevision && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px] inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Matriz modificada: revisar actividad
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900">
                          {r.peligroDescripcion}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                          <div>
                            <strong className="text-slate-800">Puesto:</strong>{' '}
                            {r.cargo || r.cargosExpuestos || 'Personal Operativo'} ({r.numeroExpuestos} pers.)
                          </div>
                          <div>
                            <strong className="text-slate-800">Área:</strong> {r.proceso}
                          </div>
                          <div>
                            <strong className="text-slate-800">Labor / Tarea:</strong>{' '}
                            {r.actividades} — {r.tareas}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-700">
                          <strong className="text-[#0f172a]">
                            Cómo cuidarnos y prevenirlo (desde la Matriz GTC 45):
                          </strong>{' '}
                          {medidas}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {actVinculada ? (
                          <button
                            type="button"
                            onClick={() => onAbrirActividad(actVinculada, 'datos')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-[#fed7aa]" />
                            <span>Ver o Revisar Tarea</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onProgramarRiesgo(r)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Agregar al Plan Anual</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECCIÓN 2: ACTIVIDADES OBLIGATORIAS (RES. 0312 Y MATRIZ NORMATIVA)    */}
      {/* ===================================================================== */}
      {activeSubSeccion === 'normas' && (
        <div className="space-y-4">
          {/* Contexto Res. 0312 de 2019 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  <span>
                    Tareas que Pide la Ley (Resolución 0312/2019 y Lista de Normas)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Calculado según los datos reales de Frikaz S.A.S. (cantidad de trabajadores, nivel de riesgo y máquinas). Solo se proponen los tiempos que marca cada norma.
                </p>
              </div>

              {requisitosPendientes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onIncorporarTodosRequisitos(requisitosPendientes)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xs cursor-pointer shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Agregar las {requisitosPendientes.length} Tareas Legales al Plan
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Trabajadores y Nivel de Riesgo
                </span>
                <span className="font-black text-slate-900">
                  {config.numeroTrabajadores} trabajadores · {config.claseRiesgoSST}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Puntos que exige la Res. 0312
                </span>
                <span className="font-black text-emerald-800">{info0312.grupo}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  A qué se dedica Frikaz
                </span>
                <span className="font-bold text-slate-800">
                  CIIU {config.ciiuPrincipal} · Alimentos Fritos
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Comité o Vigía de Seguridad
                </span>
                <span className="font-bold text-slate-800">{info0312.organoParticipacion}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">
                Mostrando {requisitosVisibles.length} obligaciones revisadas ({requisitosPendientes.length}{' '}
                faltan por meter al Plan {plan.vigencia})
              </span>
              <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloPendientesNorma}
                  onChange={(e) => setSoloPendientesNorma(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Ver solo las que faltan por agregar</span>
              </label>
            </div>
          </div>

          {/* Tabla de 7 columnas obligatorias */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0f172a] text-white uppercase text-[10px] tracking-wider">
                    <th className="p-3">Qué exige la ley</th>
                    <th className="p-3">Norma</th>
                    <th className="p-3">Qué tarea hay que hacer</th>
                    <th className="p-3">Cada cuánto</th>
                    <th className="p-3">Encargado</th>
                    <th className="p-3">Prueba necesaria</th>
                    <th className="p-3">Cuándo / Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requisitosVisibles.map((req) => {
                    const actVinculada = req.actividadVinculadaId
                      ? plan.actividades.find((a) => a.id === req.actividadVinculadaId)
                      : undefined;
                    return (
                      <tr key={req.id} className="hover:bg-orange-50/40 align-top">
                        <td className="p-3 max-w-[220px]">
                          <p className="font-bold text-slate-900">{req.requisitoObligatorio}</p>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              req.aplicaEmpresaActual
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {req.aplicaEmpresaActual ? 'Aplica a Frikaz S.A.S.' : 'No aplica hoy'}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">{req.motivoAplicabilidad}</p>
                        </td>
                        <td className="p-3 max-w-[160px]">
                          <p className="font-bold text-[#0f172a]">{req.normaOficial}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{req.articulos}</p>
                        </td>
                        <td className="p-3 max-w-[210px] text-slate-700">
                          {req.actividadPropuesta}
                        </td>
                        <td className="p-3 max-w-[160px]">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-black text-[10px]">
                            {req.frecuenciaRespaldada}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">{req.sustentoFrecuencia}</p>
                        </td>
                        <td className="p-3 max-w-[140px]">
                          <p className="font-bold text-slate-800">{req.responsableSugerido}</p>
                          <p className="text-[10px] text-slate-400">
                            Aprueba: {req.aprobadorSugerido}
                          </p>
                        </td>
                        <td className="p-3 max-w-[190px] text-slate-600">
                          {req.evidenciaNecesaria}
                        </td>
                        <td className="p-3 whitespace-nowrap space-y-2">
                          <span className="block font-bold text-slate-800">
                            {req.periodoCumplimiento}
                          </span>
                          {req.yaProgramadaEnPlan && actVinculada ? (
                            <button
                              type="button"
                              onClick={() => onAbrirActividad(actVinculada, 'datos')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Ver ({actVinculada.codigo})</span>
                            </button>
                          ) : req.aplicaEmpresaActual ? (
                            <button
                              type="button"
                              onClick={() => onIncorporarRequisito(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Agregar al Plan</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No aplica hoy</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECCIÓN 3: BANDEJA DE CONTROL DE CAMBIOS (RESGUARDO PLAN APROBADO)    */}
      {/* ===================================================================== */}
      {activeSubSeccion === 'cambios' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-[#f97316]" />
              <span>Revisión de Cambios en Peligros, Normas o Personal de la Empresa</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Cuando cambia algo en la Matriz de Peligros, las Normas o la cantidad de trabajadores, el sistema le avisa aquí.{' '}
              <strong>
                Ningún plan ya aprobado ({plan.estadoAprobacion}) se cambia ni se borra solo
              </strong>
              : primero espera a que usted revise y apruebe cada ajuste.
            </p>
          </div>

          {plan.solicitudesRevision.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center text-emerald-900 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="font-black text-sm">El Plan Anual {plan.vigencia} está 100% al día</p>
              <p className="text-xs text-emerald-800">
                No hay cambios pendientes por revisar en peligros, normas o datos de Frikaz S.A.S.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.solicitudesRevision.map((sol) => (
                <div
                  key={sol.id}
                  className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    sol.estado === 'PENDIENTE'
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 opacity-85'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-[10px]">
                        {sol.tipoFuente.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          sol.estado === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-900'
                            : sol.estado === 'APROBADA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sol.estado}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Detectado: {sol.fechaDeteccion}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">{sol.titulo}</h4>
                    <p className="text-[11px] text-slate-600">{sol.descripcion}</p>
                    <p className="text-[11px] text-indigo-900 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200">
                      <strong>Impacto propuesto:</strong> {sol.impactoPlan}
                    </p>
                  </div>

                  {sol.estado === 'PENDIENTE' ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResolverSolicitud(sol, 'APROBADA')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 cursor-pointer shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Aprobar e Incorporar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolverSolicitud(sol, 'RECHAZADA')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-rose-100 hover:text-rose-800 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 text-right shrink-0">
                      <p className="font-bold">Resuelto: {sol.fechaDecision || '-'}</p>
                      <p>{sol.decididoPor || 'Responsable SG-SST'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
