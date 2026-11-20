import React, { useState } from 'react';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
  AlertaPlanAnual,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  IndicadorCalculado,
  PlanAnualVigencia,
  RegistroPeriodoIndicador,
  RequisitoObligatorioIdentificado,
  ResponsablePlanOption,
  SolicitudRevisionPlan,
  TrabajadorFichaSST,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { CaracterizacionEmpresaDinamica } from '../../types/dynamicConfig';
import { PlanAnualRiesgosNormasTab } from './PlanAnualRiesgosNormasTab';
import { PlanAnualObjetivosKpiTab } from './PlanAnualObjetivosKpiTab';
import { PlanAnualCronogramaTab } from './PlanAnualCronogramaTab';
import { PlanAnualPresupuestoTab } from './PlanAnualPresupuestoTab';
import { PlanAnualResponsablesTab } from './PlanAnualResponsablesTab';
import { PlanAnualAlertasEvidenciasTab } from './PlanAnualAlertasEvidenciasTab';
import { PlanAnualReportesTab } from './PlanAnualReportesTab';
import {
  ShieldAlert,
  Scale,
  Target,
  GanttChart,
  Bell,
  BarChart3,
  DollarSign,
  UserCheck,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import {
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../../services/gerenteControlService';

export type SubTabPlanear =
  | 'riesgos'
  | 'normativa'
  | 'objetivos'
  | 'cronograma'
  | 'presupuesto'
  | 'responsables'
  | 'alertas'
  | 'reportes';

interface PlanAnualPlanearTabProps {
  plan: PlanAnualVigencia;
  todasLasVigencias: Record<number, PlanAnualVigencia>;
  riesgos: RiesgoGTC45Item[];
  config: CaracterizacionEmpresaDinamica;
  requisitosObligatorios: RequisitoObligatorioIdentificado[];
  indicadoresCalculados: IndicadorCalculado[];
  hojasVidaIndicadores: HojaVidaIndicadorSST[];
  registrosPeriodosIndicadores: RegistroPeriodoIndicador[];
  trabajadores: TrabajadorFichaSST[];
  estandares: EvaluacionEstandarMinimo[];
  accionesMejora: AccionMejoraPlan[];
  alertas: AlertaPlanAnual[];
  responsables: ResponsablePlanOption[];
  subTabInicial?: SubTabPlanear;
  onUpdatePlan: (updated: PlanAnualVigencia, logAction?: string) => void;
  onSeleccionarVigencia: (anio: number) => void;
  onNuevaActividad: () => void;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onEliminarActividad: (actividadId: string) => void;
  onProgramarRiesgo: (riesgo: RiesgoGTC45Item) => void;
  onProgramarTodosRiesgosCriticos: (pendientes: RiesgoGTC45Item[]) => void;
  onIncorporarRequisito: (req: RequisitoObligatorioIdentificado) => void;
  onIncorporarTodosRequisitos: (reqsPendientes: RequisitoObligatorioIdentificado[]) => void;
  onResolverSolicitud: (
    solicitud: SolicitudRevisionPlan,
    decision: 'APROBADA' | 'RECHAZADA'
  ) => void;
  onReescanearFuentes: () => void;
  onIrAActuar: () => void;
}

export const PlanAnualPlanearTab: React.FC<PlanAnualPlanearTabProps> = ({
  plan,
  todasLasVigencias,
  riesgos,
  config,
  requisitosObligatorios,
  indicadoresCalculados,
  hojasVidaIndicadores,
  registrosPeriodosIndicadores,
  trabajadores,
  estandares,
  accionesMejora,
  alertas,
  responsables,
  subTabInicial = 'riesgos',
  onUpdatePlan,
  onSeleccionarVigencia,
  onNuevaActividad,
  onAbrirActividad,
  onEliminarActividad,
  onProgramarRiesgo,
  onProgramarTodosRiesgosCriticos,
  onIncorporarRequisito,
  onIncorporarTodosRequisitos,
  onResolverSolicitud,
  onReescanearFuentes,
  onIrAActuar,
}) => {
  const [subTab, setSubTab] = useState<SubTabPlanear>(subTabInicial);

  const accionesPendientes = accionesMejora.filter((a) => {
    const est = normalizarEstadoEstandar(a.estado);
    return est !== 'Cumplido' && est !== 'Aprobado';
  });
  const riesgosCriticosCount = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  ).length;
  const reqsPendientes = requisitosObligatorios.filter(
    (r) => r.aplicaEmpresaActual && !r.yaProgramadaEnPlan
  ).length;

  return (
    <div className="space-y-5 text-xs">
      {/* Cabecera interna de 1. PLANEAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-[#0f172a]">
            1. PLANEAR — Objetivos, Metas, Riesgos Nivel I y II, Normas, Fechas y Recursos ({plan.vigencia})
          </h3>
          <p className="text-[11px] text-slate-500">
            Organice todo el trabajo del año conectando los riesgos Nivel I y II de la matriz, las leyes aplicables, los objetivos y metas, los indicadores y el calendario editable.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {[
            {
              id: 'riesgos',
              label: 'A. Riesgos I y II',
              badge: riesgosCriticosCount,
              icon: ShieldAlert,
            },
            {
              id: 'normativa',
              label: 'B. Normas',
              badge: reqsPendientes > 0 ? `${reqsPendientes} pend.` : 'Al día',
              icon: Scale,
            },
            {
              id: 'objetivos',
              label: 'C–D. Objetivos e Ind.',
              badge: plan.objetivosEspecificos.length,
              icon: Target,
            },
            {
              id: 'cronograma',
              label: 'E. Cronograma',
              badge: plan.actividades.length,
              icon: GanttChart,
            },
            {
              id: 'presupuesto',
              label: 'Presupuesto',
              icon: DollarSign,
            },
            {
              id: 'responsables',
              label: 'Responsables',
              icon: UserCheck,
            },
            {
              id: 'alertas',
              label: 'F. Alertas',
              badge: alertas.length + accionesPendientes.length,
              icon: Bell,
            },
            {
              id: 'reportes',
              label: 'G. Reportes',
              icon: BarChart3,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as SubTabPlanear)}
                className={`px-2.5 py-2 rounded-xl font-bold flex items-center justify-between gap-1 border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                }`}
              >
                <span className="inline-flex items-center gap-1 truncate">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#f97316]'}`} />
                  <span className="truncate text-[11px]">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="px-1 py-0.5 rounded bg-white/90 text-slate-900 font-mono text-[9px] shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* A. Priorización de riesgos (Niveles I y II) */}
      {subTab === 'riesgos' && (
        <PlanAnualRiesgosNormasTab
          plan={plan}
          riesgos={riesgos}
          config={config}
          requisitos={requisitosObligatorios}
          mode="riesgos"
          onProgramarRiesgo={onProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={onProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={onIncorporarRequisito}
          onIncorporarTodosRequisitos={onIncorporarTodosRequisitos}
          onAbrirActividad={onAbrirActividad}
          onResolverSolicitud={onResolverSolicitud}
          onReescanearFuentes={onReescanearFuentes}
        />
      )}

      {/* B. Obligaciones de las normas */}
      {subTab === 'normativa' && (
        <PlanAnualRiesgosNormasTab
          plan={plan}
          riesgos={riesgos}
          config={config}
          requisitos={requisitosObligatorios}
          mode="normativa"
          onProgramarRiesgo={onProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={onProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={onIncorporarRequisito}
          onIncorporarTodosRequisitos={onIncorporarTodosRequisitos}
          onAbrirActividad={onAbrirActividad}
          onResolverSolicitud={onResolverSolicitud}
          onReescanearFuentes={onReescanearFuentes}
        />
      )}

      {/* C-D. Objetivos del Plan Anual e Indicadores relacionados (desde VERIFICAR sin duplicar) */}
      {subTab === 'objetivos' && (
        <PlanAnualObjetivosKpiTab
          plan={plan}
          indicadoresCalculados={indicadoresCalculados}
          hojasVidaIndicadores={hojasVidaIndicadores}
          riesgos={riesgos}
          estandares={estandares}
          responsables={responsables}
          mode="objetivos"
          onUpdatePlan={onUpdatePlan}
        />
      )}

      {/* E. Cronograma completo (Calendario, Lista, Gantt) */}
      {subTab === 'cronograma' && (
        <PlanAnualCronogramaTab
          plan={plan}
          responsables={responsables}
          onNuevaActividad={onNuevaActividad}
          onAbrirActividad={onAbrirActividad}
          onEliminarActividad={onEliminarActividad}
        />
      )}

      {subTab === 'presupuesto' && (
        <PlanAnualPresupuestoTab plan={plan} onAbrirActividad={onAbrirActividad} />
      )}

      {subTab === 'responsables' && (
        <PlanAnualResponsablesTab
          plan={plan}
          responsables={responsables}
          onAbrirActividad={onAbrirActividad}
        />
      )}

      {/* F. Alertas y notificaciones (incluye acciones de mejora pendientes en ACTUAR) */}
      {subTab === 'alertas' && (
        <div className="space-y-4">
          {accionesPendientes.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-[#0f172a] flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-[#f97316]" />
                  <span>
                    Acciones de Mejora Pendientes o en Proceso en ACTUAR ({accionesPendientes.length})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={onIrAActuar}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold cursor-pointer"
                >
                  <span>Ir a ACTUAR</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accionesPendientes.map((acc) => {
                  const badgeAcc = getBadgeClassesEstadoFrikaz(acc.estado);
                  return (
                    <div
                      key={acc.id}
                      className="p-2.5 rounded-xl bg-white border border-orange-200 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-mono text-[#0f172a]">{acc.codigo}</strong>
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badgeAcc.light}`}>
                          {badgeAcc.label}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1">{acc.actividadARealizar}</p>
                      <span className="text-[10px] text-slate-500">
                        Responsable: {acc.responsable} · Fecha límite: {acc.fechaLimite}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <PlanAnualAlertasEvidenciasTab
            plan={plan}
            alertas={alertas}
            responsables={responsables}
            mode="alertas"
            onAbrirActividad={onAbrirActividad}
            onUpdatePlan={onUpdatePlan}
          />
        </div>
      )}

      {/* G. Generación de reportes */}
      {subTab === 'reportes' && (
        <PlanAnualReportesTab
          plan={plan}
          indicadoresCalculados={indicadoresCalculados}
          todasLasVigencias={todasLasVigencias}
          responsables={responsables}
          hojasVidaIndicadores={hojasVidaIndicadores}
          registrosPeriodosIndicadores={registrosPeriodosIndicadores}
          trabajadores={trabajadores}
          config={config}
          riesgos={riesgos}
          estandares={estandares}
          accionesMejora={accionesMejora}
          onSeleccionarVigencia={onSeleccionarVigencia}
        />
      )}
    </div>
  );
};
