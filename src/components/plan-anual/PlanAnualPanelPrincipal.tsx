import React, { useMemo } from 'react';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
  AlertaPlanAnual,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  PlanAnualVigencia,
} from '../../types/planAnual';
import { normalizarEstadoEstandar } from '../../services/gerenteControlService';
import { calcularResumenPresupuestoPlan } from '../../services/planAnualService';
import {
  CalendarRange,
  TrendingUp,
  Wrench,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ListChecks,
  ShieldCheck,
  Bell,
  FileCheck2,
  DollarSign,
  Users,
  Activity,
  Brain,
  Flame,
  ShieldAlert,
  Vote,
} from 'lucide-react';

export type SeccionPlanAnual =
  | 'resumen'
  | 'objetivos'
  | 'actividades'
  | 'evidencias'
  | 'indicadores'
  | 'presupuesto'
  | 'conexiones'
  | 'planes_riesgo'
  | 'plan_emergencias'
  | 'riesgo_psicosocial'
  | 'copasst';

export interface NavegacionPlanAnualOpciones {
  subActividades?: 'cronograma' | 'avances' | 'responsables';
  subIndicadores?: 'tablero' | 'captura' | 'riesgos' | 'estandares';
  subPresupuesto?: 'recursos' | 'reportes';
  subConexiones?: 'riesgosNormas' | 'personal' | 'mejoras';
  subPlanesMejora?: 'planes' | 'certificados' | 'repositorio';
  subPsicosocial?: 'registro' | 'aplicacion' | 'repositorio' | 'consolidado' | 'excel';
  subCopasst?:
    | 'conformacion'
    | 'votacion'
    | 'miembros'
    | 'funciones'
    | 'notificaciones'
    | 'simulacion'
    | 'repositorio';
}

interface PlanAnualPanelPrincipalProps {
  plan: PlanAnualVigencia;
  alertas: AlertaPlanAnual[];
  accionesMejora: AccionMejoraPlan[];
  estandares: EvaluacionEstandarMinimo[];
  hojasVidaIndicadores: HojaVidaIndicadorSST[];
  trabajadoresActivosCount: number;
  riesgosCriticosCount: number;
  solicitudesPendientesCount: number;
  planesMejoraCount: number;
  emergenciasEscenariosCount: number;
  onIrASeccion: (seccion: SeccionPlanAnual, opciones?: NavegacionPlanAnualOpciones) => void;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
}

export const PlanAnualPanelPrincipal: React.FC<PlanAnualPanelPrincipalProps> = ({
  plan,
  alertas,
  accionesMejora,
  estandares,
  hojasVidaIndicadores,
  trabajadoresActivosCount,
  riesgosCriticosCount,
  solicitudesPendientesCount,
  planesMejoraCount,
  emergenciasEscenariosCount,
  onIrASeccion,
  onAbrirActividad,
}) => {
  const hoyIso = new Date().toISOString().split('T')[0];

  const resumenPresupuesto = useMemo(
    () =>
      calcularResumenPresupuestoPlan(
        plan.actividades,
        plan.presupuestoGeneralAprobado || 0
      ),
    [plan.actividades, plan.presupuestoGeneralAprobado]
  );

  const metricas = useMemo(() => {
    const total = plan.actividades.length;
    let verificadas = 0;
    let enRevision = 0;
    let enProceso = 0;
    let porHacer = 0;
    let devueltas = 0;
    let vencidasSinCerrar = 0;
    let reprogramadas2027 = 0;
    let reprogramadasDesde2026 = 0;
    let totalEvidencias = 0;

    let sst = 0;
    let ambiental = 0;
    let integral = 0;

    plan.actividades.forEach((act) => {
      const est = normalizarEstadoEstandar(act.estado);
      totalEvidencias += act.evidencias.length;
      if (act.reprogramadaParaAnio && act.reprogramadaParaAnio > plan.vigencia) {
        reprogramadas2027 += 1;
      }
      if (act.reprogramacionOrigen) {
        reprogramadasDesde2026 += 1;
      }

      if (est === 'Cumplido' || est === 'Aprobado') {
        verificadas += 1;
      } else {
        if (
          act.fechaLimite &&
          act.fechaLimite < hoyIso &&
          !(act.reprogramadaParaAnio && act.reprogramadaParaAnio > plan.vigencia)
        ) {
          vencidasSinCerrar += 1;
        }
        if (est === 'Pendiente de revisión') enRevision += 1;
        else if (est === 'En proceso') enProceso += 1;
        else if (est === 'Devuelto para ajustes') devueltas += 1;
        else porHacer += 1;
      }

      if (act.area === 'SST') sst += 1;
      else if (act.area === 'AMBIENTAL') ambiental += 1;
      else integral += 1;
    });

    const pendientes = porHacer + devueltas;
    const pctAvance = total > 0 ? Math.round((verificadas / total) * 1000) / 10 : 0;
    const pctPresupuesto = resumenPresupuesto.porcentajeEjecucion;

    return {
      total,
      verificadas,
      enRevision,
      enProceso,
      porHacer,
      devueltas,
      pendientes,
      vencidasSinCerrar,
      reprogramadas2027,
      reprogramadasDesde2026,
      totalEvidencias,
      pctPresupuesto,
      pctAvance,
      sst,
      ambiental,
      integral,
    };
  }, [plan.actividades, plan.vigencia, hoyIso, resumenPresupuesto]);

  const proximasActividades = useMemo(() => {
    return plan.actividades
      .filter((a) => {
        const est = normalizarEstadoEstandar(a.estado);
        return est !== 'Cumplido' && est !== 'Aprobado';
      })
      .sort((a, b) => (a.fechaLimite || '9999-12-31').localeCompare(b.fechaLimite || '9999-12-31'))
      .slice(0, 5);
  }, [plan.actividades]);

  const alertasPrioritarias = useMemo(() => {
    const peso: Record<'CRITICA' | 'ALTA' | 'MEDIA', number> = { CRITICA: 0, ALTA: 1, MEDIA: 2 };
    return [...alertas]
      .sort((a, b) => peso[a.severidad] - peso[b.severidad])
      .slice(0, 5);
  }, [alertas]);

  const accionesAbiertas = useMemo(() => {
    return accionesMejora
      .filter((a) => {
        const est = normalizarEstadoEstandar(a.estado);
        return est !== 'Cumplido' && est !== 'Aprobado';
      })
      .slice(0, 5);
  }, [accionesMejora]);

  const estandaresVerificados = useMemo(
    () =>
      estandares.filter((e) => {
        const est = normalizarEstadoEstandar(e.estadoRevision);
        return est === 'Cumplido' || est === 'Aprobado';
      }).length,
    [estandares]
  );

  return (
    <div className="space-y-5 text-xs">
      {/* ZONA 0: RESUMEN EJECUTIVO 2027 (AÑO, PRESUPUESTO GENERAL, EJECUTADO, SALDO Y ACTIVIDADES PROGRAMADAS) */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-[#eef6f4] border border-[#cfe5df] p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-[#26524c] block">
              Vigencia del Plan
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36] block">
              Año {plan.vigencia}
            </span>
            <span className="text-[10px] text-[#355b56] block">Enero – Diciembre 2027</span>
          </div>

          <button
            type="button"
            onClick={() => onIrASeccion('presupuesto', { subPresupuesto: 'recursos' })}
            className="text-left rounded-xl bg-[#f4faf8] border border-[#d6ebe5] hover:border-[#0f6b61] p-3 space-y-0.5 transition-colors cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-[#3f6660] block">
              Presupuesto general 2027
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36] block">
              ${resumenPresupuesto.presupuestoGeneral.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-[#0f6b61] font-bold block">
              {resumenPresupuesto.presupuestoGeneral === 0
                ? 'Definir presupuesto →'
                : 'Editar en Presupuesto →'}
            </span>
          </button>

          <div className="rounded-xl bg-orange-50/70 border border-orange-200 p-3 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-orange-900 block">
              Presupuesto ejecutado
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-[#f97316] block">
              ${resumenPresupuesto.ejecutado.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-orange-800 font-mono tabular-nums block">
              {metricas.pctPresupuesto}% ejecutado
            </span>
          </div>

          <div
            className={`rounded-xl border p-3 space-y-0.5 ${
              resumenPresupuesto.saldoDisponibleGeneral < 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase block ${
                resumenPresupuesto.saldoDisponibleGeneral < 0
                  ? 'text-rose-800'
                  : 'text-emerald-900'
              }`}
            >
              Saldo disponible
            </span>
            <span
              className={`text-lg font-black font-mono tabular-nums block ${
                resumenPresupuesto.saldoDisponibleGeneral < 0
                  ? 'text-rose-700'
                  : 'text-emerald-800'
              }`}
            >
              ${resumenPresupuesto.saldoDisponible.toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] text-slate-600 block">
              Distribuido: ${resumenPresupuesto.aprobado.toLocaleString('es-CO')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onIrASeccion('actividades', { subActividades: 'cronograma' })}
            className="text-left rounded-xl bg-[#f4faf8] border border-[#d6ebe5] hover:border-[#0f6b61] p-3 space-y-0.5 transition-colors cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-[#3f6660] block">
              Actividades programadas
            </span>
            <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36] block">
              {metricas.total}
            </span>
            <span className="text-[10px] text-slate-600 tabular-nums block">
              {metricas.sst} SST · {metricas.ambiental} Amb · {metricas.integral} Int
            </span>
          </button>
        </div>

        {(resumenPresupuesto.superaPresupuestoGeneral || resumenPresupuesto.ejecucionSuperaGeneral) && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Alerta presupuestal 2027:</strong>{' '}
              {resumenPresupuesto.ejecucionSuperaGeneral
                ? 'El monto ejecutado supera el Presupuesto General 2027.'
                : 'El presupuesto distribuido en actividades supera el Presupuesto General 2027.'}
            </span>
          </div>
        )}
      </div>

      {/* ZONA 1: ESTADO GENERAL DE ACTIVIDADES CON CIFRAS REALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Avance general verificado */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-[#3f6660] block">
                Avance general
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-[#0d3b36]">
                {metricas.pctAvance}%
              </span>
            </div>
            <span className="p-2 rounded-xl bg-[#e7f4f1] text-[#0f6b61]">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="w-full bg-[#e9f2f0] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0f6b61] h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, metricas.pctAvance)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5 tabular-nums">
            <p>
              <strong className="text-[#0d3b36]">{metricas.verificadas}</strong> de{' '}
              <strong>{metricas.total}</strong> aprobadas por Andrea Orjuela – Gerente.
            </p>
            <p className="text-[10px] text-slate-500">
              Registradas: {metricas.total} · En proceso: {metricas.enProceso} · Por revisar:{' '}
              {metricas.enRevision}
            </p>
          </div>
        </div>

        {/* 2. Actividades por hacer */}
        <button
          type="button"
          onClick={() => onIrASeccion('actividades', { subActividades: 'cronograma' })}
          className="text-left rounded-2xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] p-4 shadow-xs flex flex-col justify-between space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-[#3f6660] block">
                Actividades por hacer
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-[#0d3b36]">
                {metricas.pendientes}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-[#f1f6f5] text-slate-700">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5 tabular-nums">
            <p>Pendientes de iniciar o con ajustes solicitados.</p>
            <p className="text-[10px] text-slate-500">
              {metricas.porHacer} por hacer
              {metricas.devueltas > 0 ? ` · ${metricas.devueltas} devueltas para ajustes` : ''}
            </p>
          </div>
        </button>

        {/* 3. Actividades en proceso */}
        <button
          type="button"
          onClick={() => onIrASeccion('actividades', { subActividades: 'avances' })}
          className="text-left rounded-2xl border border-[#b9dad3] bg-white hover:border-[#f97316] p-4 shadow-xs flex flex-col justify-between space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-[#3f6660] block">
                Actividades en proceso
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-[#f97316]">
                {metricas.enProceso}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-orange-50 text-[#f97316]">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5">
            <p>Actividades en desarrollo activo por sus responsables.</p>
            <p className="text-[10px] text-[#f97316] font-bold">Registrar avances →</p>
          </div>
        </button>

        {/* 4. Pendientes de revisión */}
        <button
          type="button"
          onClick={() => onIrASeccion('evidencias')}
          className="text-left rounded-2xl border border-amber-200 bg-white hover:border-amber-400 p-4 shadow-xs flex flex-col justify-between space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-900 block">
                Pendientes de revisión
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-amber-950">
                {metricas.enRevision}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-slate-700 space-y-0.5">
            <p>Esperan aprobación de Andrea Orjuela – Gerente.</p>
            <p className="text-[10px] text-amber-800 font-bold">Revisar evidencias →</p>
          </div>
        </button>
      </div>

      {/* ZONA 2: RESUMEN VISUAL DE PILARES DEL PLAN ANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objetivos y metas */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                <Target className="h-4 w-4 text-[#0f6b61]" />
                <span>Objetivos y metas</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {plan.objetivosEspecificos.length} metas específicas
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              {plan.objetivoGeneral}
            </p>
            {plan.objetivosEspecificos.length > 0 && (
              <ul className="divide-y divide-[#e8f2ef] pt-1">
                {plan.objetivosEspecificos.slice(0, 3).map((obj) => {
                  const actsObj = plan.actividades.filter((a) => a.objetivoEspecificoId === obj.id);
                  const cumpObj = actsObj.filter((a) => {
                    const est = normalizarEstadoEstandar(a.estado);
                    return est === 'Cumplido' || est === 'Aprobado';
                  }).length;
                  return (
                    <li
                      key={obj.id}
                      className="py-1.5 flex items-center justify-between gap-3 text-[11px]"
                    >
                      <span className="text-slate-700 truncate">
                        <strong className="font-mono text-[#0d3b36] mr-1.5">{obj.codigo}</strong>
                        {obj.titulo}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#0f6b61] shrink-0 tabular-nums">
                        {cumpObj}/{actsObj.length} aprob.
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="pt-2 border-t border-[#e8f2ef] flex justify-end">
            <button
              type="button"
              onClick={() => onIrASeccion('objetivos')}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] cursor-pointer"
            >
              <span>Consultar objetivos y metas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Actividades programadas */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[#0f6b61]" />
                <span>Actividades programadas</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {metricas.total} en {plan.vigencia}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">SST</span>
                <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36]">
                  {metricas.sst}
                </span>
              </div>
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">Ambiental</span>
                <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36]">
                  {metricas.ambiental}
                </span>
              </div>
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">Integral</span>
                <span className="text-lg font-black font-mono tabular-nums text-[#0d3b36]">
                  {metricas.integral}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600">
              {metricas.vencidasSinCerrar > 0 ? (
                <span className="text-rose-700 font-bold">
                  Atención: {metricas.vencidasSinCerrar} actividad(es) superaron su fecha límite sin aprobación.
                </span>
              ) : metricas.reprogramadas2027 > 0 ? (
                <span>
                  {metricas.reprogramadas2027} actividad(es) sin ejecución en 2026 fueron reprogramadas para 2027 ·{' '}
                  <strong>{riesgosCriticosCount}</strong> riesgos prioritarios vigilados.
                </span>
              ) : (
                <span>
                  {metricas.reprogramadasDesde2026 > 0
                    ? `${metricas.reprogramadasDesde2026} reprogramadas desde 2026 · `
                    : ''}
                  Evidencias cargadas: <strong>{metricas.totalEvidencias}</strong> · Riesgos prioritarios:{' '}
                  <strong>{riesgosCriticosCount}</strong>.
                </span>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-[#e8f2ef] flex justify-end">
            <button
              type="button"
              onClick={() => onIrASeccion('actividades', { subActividades: 'cronograma' })}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] cursor-pointer"
            >
              <span>Ver cronograma y responsables</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Indicadores relacionados */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0f6b61]" />
                <span>Indicadores y cumplimiento</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {hojasVidaIndicadores.length} indicadores
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Incluye los 6 indicadores mínimos de la Resolución 0312 de 2019 (Art. 30) y la evaluación de los 7 estándares mínimos con datos reales del año {plan.vigencia}.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">
                  Estándares aprobados
                </span>
                <span className="text-base font-black font-mono tabular-nums text-[#0d3b36]">
                  {estandaresVerificados} / {estandares.length}
                </span>
              </div>
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">
                  Evidencias registradas
                </span>
                <span className="text-base font-black font-mono tabular-nums text-[#0d3b36]">
                  {metricas.totalEvidencias}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-[#e8f2ef] flex justify-end">
            <button
              type="button"
              onClick={() => onIrASeccion('indicadores', { subIndicadores: 'tablero' })}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] cursor-pointer"
            >
              <span>Consultar indicadores y estándares</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Presupuesto y recursos */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#0f6b61]" />
                <span>Presupuesto y recursos</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-[#0f6b61] tabular-nums">
                {resumenPresupuesto.ejecutado === 0
                  ? '$0 ejecutado'
                  : `${metricas.pctPresupuesto}% ejecutado`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">
                  Presupuesto general 2027
                </span>
                <span className="text-sm font-black font-mono tabular-nums text-[#0d3b36]">
                  ${resumenPresupuesto.presupuestoGeneral.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Programado: ${resumenPresupuesto.programado.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5">
                <span className="text-[10px] font-bold text-[#3f6660] block">
                  Distribuido en actividades
                </span>
                <span className="text-sm font-black font-mono tabular-nums text-[#0d3b36]">
                  ${resumenPresupuesto.aprobado.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {resumenPresupuesto.pendientesValoracionCount} por valorar ·{' '}
                  {resumenPresupuesto.recursosExistentesCount} propios
                </span>
              </div>
              <div className="rounded-xl bg-orange-50/60 border border-orange-200 p-2.5">
                <span className="text-[10px] font-bold text-orange-900 block">
                  Presupuesto ejecutado
                </span>
                <span className="text-sm font-black font-mono tabular-nums text-[#f97316]">
                  ${resumenPresupuesto.ejecutado.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-2.5">
                <span className="text-[10px] font-bold text-emerald-900 block">
                  Saldo disponible
                </span>
                <span className="text-sm font-black font-mono tabular-nums text-emerald-800">
                  ${resumenPresupuesto.saldoDisponible.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-[#e8f2ef] flex justify-end">
            <button
              type="button"
              onClick={() => onIrASeccion('presupuesto', { subPresupuesto: 'recursos' })}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] cursor-pointer"
            >
              <span>Editar presupuesto y ver reportes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ZONA 3: ACCESO DIRECTO A CADA SECCIÓN DEL PLAN ANUAL */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#26524c]">
          Secciones del Plan Anual
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              id: 'objetivos' as const,
              titulo: 'Objetivos y metas',
              desc: 'Propósito general, metas específicas y avance vinculado.',
              dato: `${plan.objetivosEspecificos.length} metas`,
              icon: Target,
            },
            {
              id: 'actividades' as const,
              titulo: 'Actividades, responsables y fechas',
              desc: 'Cronograma, registro de avances y fechas límite por persona.',
              dato: `${metricas.total} actividades`,
              icon: CalendarRange,
            },
            {
              id: 'evidencias' as const,
              titulo: 'Evidencias y revisión',
              desc: 'Soportes cargados, recordatorios y aprobación de Gerencia.',
              dato: `${metricas.totalEvidencias} soportes`,
              icon: FileCheck2,
            },
            {
              id: 'indicadores' as const,
              titulo: 'Indicadores y estándares',
              desc: 'Indicadores Res. 0312, resultados y evaluación de estándares.',
              dato: `${hojasVidaIndicadores.length} KPIs`,
              icon: TrendingUp,
            },
            {
              id: 'presupuesto' as const,
              titulo: 'Presupuesto y reportes',
              desc: 'Programado, aprobado, ejecutado ($0 inicial), saldo e informes.',
              dato:
                resumenPresupuesto.ejecutado === 0
                  ? '$0 ejec.'
                  : `${metricas.pctPresupuesto}% usado`,
              icon: DollarSign,
            },
            {
              id: 'conexiones' as const,
              titulo: 'Riesgos, personal y mejoras',
              desc: 'Conexión con riesgos I/II, normas, trabajadores y mejoras.',
              dato: `${trabajadoresActivosCount} trabajadores`,
              icon: Users,
            },
            {
              id: 'planes_riesgo' as const,
              titulo: 'Planes de mejora por riesgo',
              desc: 'Plan individual por cada peligro, capacitación completa y formatos Word.',
              dato: `${planesMejoraCount} planes`,
              icon: ShieldAlert,
            },
            {
              id: 'plan_emergencias' as const,
              titulo: 'Plan de emergencias',
              desc: 'Prevención, preparación, procedimientos seguros, simulacros y formatos.',
              dato: `${emergenciasEscenariosCount} escenarios`,
              icon: Flame,
            },
            {
              id: 'riesgo_psicosocial' as const,
              titulo: 'Batería de riesgo psicosocial',
              desc: 'Cuestionarios Forma A y B, estrés, confidencialidad médica e informes.',
              dato: `${trabajadoresActivosCount} trabajadores`,
              icon: Brain,
            },
            {
              id: 'copasst' as const,
              titulo: 'COPASST – Comité Paritario SST',
              desc: 'Votación, conformación, funciones, correos, repositorio y simulación en organigrama.',
              dato: 'Interno Plan Anual',
              icon: Vote,
            },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onIrASeccion(sec.id)}
                className="text-left rounded-2xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] hover:bg-[#f7fbfa] p-4 shadow-xs transition-colors cursor-pointer flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-black text-xs sm:text-sm text-[#0d3b36]">
                    <Icon className="h-4 w-4 text-[#0f6b61] shrink-0" />
                    <span>{sec.titulo}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#3f6660] tabular-nums shrink-0">
                    {sec.dato}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{sec.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ZONA 4: SEGUIMIENTO INMEDIATO (PRÓXIMAS ACTIVIDADES + ALERTAS + ACCIONES DE MEJORA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Próximas actividades */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
              <h4 className="font-black text-[#0d3b36] flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-[#0f6b61]" />
                <span>Próximas actividades</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                {proximasActividades.length} mostradas
              </span>
            </div>

            {proximasActividades.length === 0 ? (
              <p className="text-[11px] text-[#0f6b61] py-4 text-center font-semibold">
                Todas las actividades de {plan.vigencia} están aprobadas.
              </p>
            ) : (
              <div className="divide-y divide-[#eef5f3]">
                {proximasActividades.map((act) => {
                  const reprogramada = Boolean(act.reprogramadaParaAnio && act.reprogramadaParaAnio > plan.vigencia);
                  const vencida = !reprogramada && act.fechaLimite && act.fechaLimite < hoyIso;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => onAbrirActividad(act, 'datos')}
                      className="w-full text-left py-2 hover:bg-[#f4faf8] rounded-lg px-1.5 transition-colors cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-mono font-bold text-[#0d3b36]">
                          {act.codigo}
                          {act.reprogramacionOrigen && (
                            <span className="ml-1.5 font-sans text-[#0f6b61]">
                              (De {act.reprogramacionOrigen.anioOrigen})
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            reprogramada
                              ? 'text-[#0f6b61]'
                              : vencida
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {reprogramada
                            ? `Reprogramada a ${act.reprogramadaParaAnio}`
                            : vencida
                            ? `Vencida (${act.fechaLimite})`
                            : act.fechaLimite}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-[11px] truncate">{act.nombre}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {act.responsableNombre} · {normalizarEstadoEstandar(act.estado)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onIrASeccion('actividades', { subActividades: 'cronograma' })}
            className="text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] inline-flex items-center gap-1 pt-2 border-t border-[#e8f2ef] cursor-pointer"
          >
            <span>Abrir cronograma completo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Alertas importantes */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
              <h4 className="font-black text-[#0d3b36] flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-rose-600" />
                <span>Alertas importantes</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                {alertas.length + (solicitudesPendientesCount > 0 ? 1 : 0)} avisos
              </span>
            </div>

            {solicitudesPendientesCount > 0 && (
              <button
                type="button"
                onClick={() => onIrASeccion('conexiones', { subConexiones: 'riesgosNormas' })}
                className="w-full text-left p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-bold hover:bg-amber-100 cursor-pointer"
              >
                Hay {solicitudesPendientesCount} cambio(s) en riesgos o normas por revisar.
              </button>
            )}

            {alertasPrioritarias.length === 0 && solicitudesPendientesCount === 0 ? (
              <p className="text-[11px] text-[#0f6b61] py-4 text-center font-semibold">
                Sin alertas urgentes por ahora.
              </p>
            ) : (
              <div className="divide-y divide-[#eef5f3]">
                {alertasPrioritarias.map((al) => {
                  const act = plan.actividades.find((a) => a.id === al.actividadId);
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => {
                        if (act) {
                          onAbrirActividad(
                            act,
                            al.tipo === 'EVIDENCIA_PENDIENTE_REVISION' ? 'evidencias' : 'datos'
                          );
                        } else {
                          onIrASeccion('evidencias');
                        }
                      }}
                      className="w-full text-left py-2 hover:bg-[#f4faf8] rounded-lg px-1.5 transition-colors cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800">
                          <AlertTriangle
                            className={`h-3 w-3 ${
                              al.severidad === 'CRITICA' || al.severidad === 'ALTA'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            }`}
                          />
                          {al.actividadCodigo}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">{al.fechaLimite}</span>
                      </div>
                      <p className="font-bold text-slate-800 text-[11px] truncate">
                        {al.actividadNombre}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{al.motivo}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onIrASeccion('evidencias')}
            className="text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] inline-flex items-center gap-1 pt-2 border-t border-[#e8f2ef] cursor-pointer"
          >
            <span>Gestionar alertas y soportes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Acciones de mejora */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
              <h4 className="font-black text-[#0d3b36] flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-[#f97316]" />
                <span>Acciones de mejora</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                {accionesAbiertas.length} activas
              </span>
            </div>

            {accionesAbiertas.length === 0 ? (
              <p className="text-[11px] text-[#0f6b61] py-4 text-center font-semibold">
                No hay acciones correctivas o preventivas abiertas.
              </p>
            ) : (
              <div className="divide-y divide-[#eef5f3]">
                {accionesAbiertas.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onIrASeccion('conexiones', { subConexiones: 'mejoras' })}
                    className="w-full text-left py-2 hover:bg-[#f4faf8] rounded-lg px-1.5 transition-colors cursor-pointer space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono font-bold text-[#0d3b36]">
                        {acc.codigo} · {acc.tipo}
                      </span>
                      <span className="font-bold text-amber-800">
                        {normalizarEstadoEstandar(acc.estado)}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px] line-clamp-1">
                      {acc.actividadARealizar}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {acc.responsable} · Límite: {acc.fechaLimite}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onIrASeccion('conexiones', { subConexiones: 'mejoras' })}
            className="text-[11px] font-black text-[#0f6b61] hover:text-[#0d3b36] inline-flex items-center gap-1 pt-2 border-t border-[#e8f2ef] cursor-pointer"
          >
            <span>Ver acciones de mejora</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
