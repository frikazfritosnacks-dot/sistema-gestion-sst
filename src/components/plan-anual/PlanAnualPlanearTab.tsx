import React, { useState, useEffect } from 'react';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
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
import { PlanAnualReportesTab } from './PlanAnualReportesTab';
import {
  ShieldAlert,
  Target,
  GanttChart,
  BarChart3,
  DollarSign,
  UserCheck,
} from 'lucide-react';

export type SubTabPlanear =
  | 'objetivos'
  | 'riesgosNormas'
  | 'cronograma'
  | 'responsables'
  | 'presupuesto'
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
  responsables,
  subTabInicial = 'objetivos',
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
}) => {
  const [subTab, setSubTab] = useState<SubTabPlanear>(subTabInicial);

  useEffect(() => {
    setSubTab(subTabInicial);
  }, [subTabInicial]);

  const riesgosCriticosCount = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  ).length;
  const reqsPendientes = requisitosObligatorios.filter(
    (r) => r.aplicaEmpresaActual && !r.yaProgramadaEnPlan
  ).length;
  const solicitudesPendientes = plan.solicitudesRevision.filter(
    (s) => s.estado === 'PENDIENTE'
  ).length;

  return (
    <div className="space-y-4 text-xs">
      {/* Cabecera compacta de 1. PLANEAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-[#0f172a]">
            1. PLANEAR — Organización del Plan {plan.vigencia}
          </h3>
          <p className="text-[11px] text-slate-500">
            Defina objetivos y metas, atienda riesgos prioritarios y normas, y programe fechas, responsables y presupuesto.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {[
            {
              id: 'objetivos' as const,
              label: 'Objetivos y metas',
              badge: plan.objetivosEspecificos.length,
              icon: Target,
            },
            {
              id: 'riesgosNormas' as const,
              label: 'Riesgos y normas',
              badge:
                solicitudesPendientes > 0
                  ? `${solicitudesPendientes} rev.`
                  : reqsPendientes > 0
                  ? `${riesgosCriticosCount} / ${reqsPendientes}`
                  : riesgosCriticosCount,
              icon: ShieldAlert,
            },
            {
              id: 'cronograma' as const,
              label: 'Actividades',
              badge: plan.actividades.length,
              icon: GanttChart,
            },
            {
              id: 'responsables' as const,
              label: 'Responsables',
              icon: UserCheck,
            },
            {
              id: 'presupuesto' as const,
              label: 'Presupuesto',
              icon: DollarSign,
            },
            {
              id: 'reportes' as const,
              label: 'Reportes',
              icon: BarChart3,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center justify-between gap-1.5 border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#f97316]'}`}
                  />
                  <span className="truncate text-[11px]">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-mono tabular-nums text-[10px] shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Objetivos y metas */}
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

      {/* Riesgos que requieren atención y normas aplicables */}
      {subTab === 'riesgosNormas' && (
        <PlanAnualRiesgosNormasTab
          plan={plan}
          riesgos={riesgos}
          config={config}
          requisitos={requisitosObligatorios}
          mode="ambos"
          onProgramarRiesgo={onProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={onProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={onIncorporarRequisito}
          onIncorporarTodosRequisitos={onIncorporarTodosRequisitos}
          onAbrirActividad={onAbrirActividad}
          onResolverSolicitud={onResolverSolicitud}
          onReescanearFuentes={onReescanearFuentes}
        />
      )}

      {/* Actividades programadas (Cronograma) */}
      {subTab === 'cronograma' && (
        <PlanAnualCronogramaTab
          plan={plan}
          responsables={responsables}
          onNuevaActividad={onNuevaActividad}
          onAbrirActividad={onAbrirActividad}
          onEliminarActividad={onEliminarActividad}
        />
      )}

      {/* Responsables y fechas */}
      {subTab === 'responsables' && (
        <PlanAnualResponsablesTab
          plan={plan}
          responsables={responsables}
          onAbrirActividad={onAbrirActividad}
        />
      )}

      {/* Recursos y presupuesto */}
      {subTab === 'presupuesto' && (
        <PlanAnualPresupuestoTab plan={plan} onAbrirActividad={onAbrirActividad} />
      )}

      {/* Reportes y comparativos */}
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
