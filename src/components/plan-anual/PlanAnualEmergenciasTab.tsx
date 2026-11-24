import React, { useMemo, useState, useEffect } from 'react';
import type { ActividadPlanAnual, EvidenciaActividad } from '../../types/planAnual';
import type {
  ActividadCapacitacionSimulacro,
  EscenarioEmergenciaFrikaz,
  EstadoValidacionReal,
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
  PlanEmergenciasFrikaz,
  RecursoEmergenciaItem,
} from '../../types/planAnualMejoraEmergencias';
import { exportarPlanEmergenciasCompletoWordDocx } from '../../services/planMejoraEmergenciasService';
import {
  ESTADOS_TRABAJADOR_FRIKAZ,
  crearRegistroRevisionGerente,
  esEstadoExclusivoGerente,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
  type EstadoEstandarFrikaz,
} from '../../services/gerenteControlService';
import { CajaCalidadVisualCard } from './PlanAnualCajaCalidadEditor';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Flame,
  MapPin,
  Paperclip,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';

interface PlanAnualEmergenciasTabProps {
  planEmergencias: PlanEmergenciasFrikaz;
  formatos: Record<string, FormatoEditableDocumento>;
  actividadesPlan?: ActividadPlanAnual[];
  onAbrirActividadPlan?: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  externalSubVista?: SubVistaEmergencias;
  externalEscenarioId?: string;
  navNonce?: number;
  onSavePlanEmergencias: (next: PlanEmergenciasFrikaz, auditDetail?: string) => void;
  onAbrirFormato: (formatoId: string) => void;
  onAbrirCapacitacion: (
    material: MaterialCapacitacionPlan,
    contexto: string,
    onSave: (nextMat: MaterialCapacitacionPlan) => void
  ) => void;
}

export type SubVistaEmergencias =
  | 'documento'
  | 'amenazas'
  | 'recursos_org'
  | 'capacitaciones'
  | 'formatos_cierre';

export const PlanAnualEmergenciasTab: React.FC<PlanAnualEmergenciasTabProps> = ({
  planEmergencias,
  formatos,
  actividadesPlan = [],
  onAbrirActividadPlan,
  externalSubVista,
  externalEscenarioId,
  navNonce,
  onSavePlanEmergencias,
  onAbrirFormato,
  onAbrirCapacitacion,
}) => {
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();
  const [subVista, setSubVista] = useState<SubVistaEmergencias>(externalSubVista || 'amenazas');
  const [escenarioActivoId, setEscenarioActivoId] = useState<string>(
    externalEscenarioId || planEmergencias.escenarios[0]?.id || 'esc-incendio'
  );
  const [filtroValidacionEsc, setFiltroValidacionEsc] = useState<
    'TODOS' | 'CONFIRMADO' | 'PENDIENTE_VALIDACION'
  >('TODOS');
  const [exportandoWord, setExportandoWord] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (navNonce === undefined) return;
    if (externalSubVista) setSubVista(externalSubVista);
    if (externalEscenarioId) setEscenarioActivoId(externalEscenarioId);
  }, [navNonce, externalSubVista, externalEscenarioId]);

  // Evidencias del plan de emergencias
  const [evNombre, setEvNombre] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDataUrl, setEvDataUrl] = useState<string | undefined>(undefined);
  const [obsGerenciaDraft, setObsGerenciaDraft] = useState('');

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const metricas = useMemo(() => {
    const totalEsc = planEmergencias.escenarios.length;
    const escConfirmados = planEmergencias.escenarios.filter(
      (e) => e.estadoValidacion === 'CONFIRMADO'
    ).length;
    const escPendientes = totalEsc - escConfirmados;
    const recursosPendientes = planEmergencias.recursosDisponibles.filter(
      (r) => r.estadoVerificacion === 'Pendiente por verificar en planta'
    ).length;
    const rolesPendientes = planEmergencias.organizacionEmergencias.filter((o) =>
      o.responsablePrincipal.toLowerCase().includes('pendiente')
    ).length;
    const actsCumplidas = planEmergencias.programaCapacitacionSimulacros.filter((a) => {
      const est = normalizarEstadoEstandar(a.estado);
      return est === 'Aprobado' || est === 'Cumplido';
    }).length;
    return {
      totalEsc,
      escConfirmados,
      escPendientes,
      recursosPendientes,
      rolesPendientes,
      actsCumplidas,
      totalActs: planEmergencias.programaCapacitacionSimulacros.length,
    };
  }, [planEmergencias]);

  const escenariosFiltrados = useMemo(() => {
    return planEmergencias.escenarios.filter((e) =>
      filtroValidacionEsc === 'TODOS' ? true : e.estadoValidacion === filtroValidacionEsc
    );
  }, [planEmergencias.escenarios, filtroValidacionEsc]);

  const escenarioSeleccionado: EscenarioEmergenciaFrikaz | undefined = useMemo(
    () =>
      escenariosFiltrados.find((e) => e.id === escenarioActivoId) ||
      escenariosFiltrados[0],
    [escenariosFiltrados, escenarioActivoId]
  );

  const badgePlan = getBadgeClassesEstadoFrikaz(
    planEmergencias.seguimientoActualizacion.estado
  );

  const handleDescargarPlanCompleto = async () => {
    setExportandoWord(true);
    try {
      await exportarPlanEmergenciasCompletoWordDocx(planEmergencias);
    } finally {
      setExportandoWord(false);
    }
  };

  const handleToggleValidacionEscenario = (esc: EscenarioEmergenciaFrikaz) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const nextVal: EstadoValidacionReal =
      esc.estadoValidacion === 'CONFIRMADO' ? 'PENDIENTE_VALIDACION' : 'CONFIRMADO';
    const nextEscenarios = planEmergencias.escenarios.map((item) =>
      item.id === esc.id
        ? {
            ...item,
            estadoValidacion: nextVal,
            nivelPrioridad:
              nextVal === 'CONFIRMADO' && item.nivelPrioridad === 'POR_VALIDAR'
                ? ('MEDIA' as const)
                : item.nivelPrioridad,
          }
        : item
    );
    onSavePlanEmergencias(
      { ...planEmergencias, escenarios: nextEscenarios },
      `Escenario "${esc.nombre}" marcado como ${nextVal}`
    );
  };

  const handleUpdateRecurso = (
    id: string,
    patch: Partial<RecursoEmergenciaItem>
  ) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const next = planEmergencias.recursosDisponibles.map((r) =>
      r.id === id ? { ...r, ...patch } : r
    );
    onSavePlanEmergencias({ ...planEmergencias, recursosDisponibles: next });
  };

  const handleUpdateActividadCap = (
    act: ActividadCapacitacionSimulacro,
    patch: Partial<ActividadCapacitacionSimulacro>
  ) => {
    if (patch.estado && esEstadoExclusivoGerente(patch.estado) && !esGerente) {
      solicitarAccesoGerente();
      showToast(
        `Solo Andrea Orjuela – Gerente puede marcar como "${patch.estado}".`
      );
      return;
    }
    const nextActs = planEmergencias.programaCapacitacionSimulacros.map((item) =>
      item.id === act.id
        ? {
            ...item,
            ...patch,
            revisionGerente:
              patch.estado && esEstadoExclusivoGerente(patch.estado)
                ? crearRegistroRevisionGerente(
                    patch.estado as 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes'
                  )
                : item.revisionGerente,
          }
        : item
    );
    onSavePlanEmergencias(
      { ...planEmergencias, programaCapacitacionSimulacros: nextActs },
      `Actualización en ${act.titulo}`
    );
  };

  const handleFileEvidencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!evNombre) setEvNombre(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setEvDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdjuntarEvidenciaPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evNombre.trim()) return;
    const hoy = new Date().toISOString().split('T')[0];
    const nuevaEv: EvidenciaActividad = {
      id: `ev-emg-${Date.now()}`,
      nombreArchivo: evNombre.trim(),
      tipoSoporte: 'ACTA',
      descripcionSoporte:
        evDesc.trim() || 'Soporte del Plan de Emergencias para revisión de Gerencia.',
      archivoDataUrl: evDataUrl,
      fechaCarga: hoy,
      cargadoPor: 'Equipo Frikaz S.A.S.',
      estadoRevision: 'PENDIENTE_REVISION',
    };

    const estAct = normalizarEstadoEstandar(
      planEmergencias.seguimientoActualizacion.estado
    );
    const nextEst: EstadoEstandarFrikaz =
      estAct === 'Por hacer' || estAct === 'En proceso' || estAct === 'Devuelto para ajustes'
        ? 'Pendiente de revisión'
        : estAct;

    onSavePlanEmergencias(
      {
        ...planEmergencias,
        evidenciasPlan: [nuevaEv, ...planEmergencias.evidenciasPlan],
        seguimientoActualizacion: {
          ...planEmergencias.seguimientoActualizacion,
          estado: nextEst,
        },
      },
      `Evidencia agregada al Plan de Emergencias: ${nuevaEv.nombreArchivo}`
    );
    setEvNombre('');
    setEvDesc('');
    setEvDataUrl(undefined);
    showToast(
      'Soporte agregado. El Plan de Emergencias NO se aprueba automáticamente hasta la revisión de Andrea Orjuela – Gerente.'
    );
  };

  const handleCambiarEstadoPlan = (nuevoEstado: EstadoEstandarFrikaz) => {
    if (esEstadoExclusivoGerente(nuevoEstado) && !esGerente) {
      solicitarAccesoGerente();
      showToast(
        `Solo Andrea Orjuela – Gerente puede marcar el Plan de Emergencias como "${nuevoEstado}".`
      );
      return;
    }
    const obs =
      obsGerenciaDraft || planEmergencias.seguimientoActualizacion.observacionesGerencia;
    const hoy = new Date().toISOString().split('T')[0];

    onSavePlanEmergencias(
      {
        ...planEmergencias,
        seguimientoActualizacion: {
          ...planEmergencias.seguimientoActualizacion,
          estado: nuevoEstado,
          ultimaRevision: esEstadoExclusivoGerente(nuevoEstado)
            ? hoy
            : planEmergencias.seguimientoActualizacion.ultimaRevision,
          observacionesGerencia: obs,
          revisionGerente: esEstadoExclusivoGerente(nuevoEstado)
            ? crearRegistroRevisionGerente(
                nuevoEstado as 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes',
                obs
              )
            : planEmergencias.seguimientoActualizacion.revisionGerente,
        },
      },
      `Plan de Emergencias actualizado a "${nuevoEstado}"`
    );
    showToast(`Estado del Plan de Emergencias actualizado a "${nuevoEstado}".`);
  };

  const formatosEmergencia = planEmergencias.formatosEmergenciaIds
    .map((id) => formatos[id])
    .filter((f): f is FormatoEditableDocumento => Boolean(f));

  return (
    <div className="space-y-4 text-xs">
      {/* Encabezado principal del Plan de Emergencias */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-black text-[10px] uppercase">
                Plan de Prevención, Preparación y Respuesta ante Emergencias
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${badgePlan.light}`}
              >
                {badgePlan.label}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#0d3b36] flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-600 shrink-0" />
              <span>PLAN DE EMERGENCIAS — Frikaz S.A.S. (10 trabajadores)</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Preparado para planta de snacks fritos (selección, pelado, fritura, empaque y entrega). Diferencia con claridad lo confirmado en operación de los datos que deben verificarse en planta sin inventar información.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDescargarPlanCompleto}
            disabled={exportandoWord}
            className="px-4 py-2.5 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] inline-flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>
              {exportandoWord
                ? 'Generando documento...'
                : 'Descargar Plan Completo (.docx)'}
            </span>
          </button>
        </div>

        {/* Métricas reales y avisos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
            <span className="text-[11px] font-bold text-[#3f6660] block">
              Escenarios evaluados
            </span>
            <span className="text-xl font-black font-mono text-[#0d3b36]">
              {metricas.escConfirmados}{' '}
              <span className="text-[11px] font-normal text-slate-600">
                confirm. / {metricas.escPendientes} por validar
              </span>
            </span>
          </div>
          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3">
            <span className="text-[11px] font-bold text-amber-900 block">
              Equipos por verificar
            </span>
            <span className="text-xl font-black font-mono text-amber-950">
              {metricas.recursosPendientes} / {planEmergencias.recursosDisponibles.length}
            </span>
          </div>
          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3">
            <span className="text-[11px] font-bold text-amber-900 block">
              Roles por asignar
            </span>
            <span className="text-xl font-black font-mono text-amber-950">
              {metricas.rolesPendientes} / {planEmergencias.organizacionEmergencias.length}
            </span>
          </div>
          <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
            <span className="text-[11px] font-bold text-[#3f6660] block">
              Capacitaciones y simulacro
            </span>
            <span className="text-xl font-black font-mono text-[#0f6b61]">
              {metricas.actsCumplidas} / {metricas.totalActs} aprob.
            </span>
          </div>
        </div>

        {/* Sub-navegación interna clara */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#e8f2ef]">
          {[
            { id: 'amenazas' as const, label: 'Amenazas y Qué hacer (10)', icon: ShieldAlert },
            { id: 'documento' as const, label: 'Documento completo (20 puntos)', icon: FileText },
            { id: 'recursos_org' as const, label: 'Equipos, Rutas y Roles (10 trab.)', icon: Users },
            { id: 'capacitaciones' as const, label: 'Capacitaciones y Simulacros', icon: BookOpen },
            { id: 'formatos_cierre' as const, label: 'Formatos, Soportes y Aprobación', icon: ClipboardCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subVista === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubVista(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-black inline-flex items-center gap-1.5 cursor-pointer transition-colors border ${
                  active
                    ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                    : 'bg-[#f4faf8] text-[#173f3a] border-[#cfe5df] hover:bg-[#e5f3ef]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-2.5 text-emerald-900 font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 1: AMENAZAS Y PROCEDIMIENTOS SEGUROS                       */}
      {/* ==================================================================== */}
      {subVista === 'amenazas' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-[#0d3b36] text-sm">
                Procedimientos sencillos y seguros por tipo de emergencia
              </h4>
              <p className="text-[11px] text-slate-600">
                Ningún trabajador sin formación especializada debe apagar incendios grandes, reparar fugas de gas ni intervenir cables eléctricos.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-[#eef6f4] border border-[#cce3dd] p-1 gap-1">
              {[
                { id: 'TODOS' as const, label: 'Todos (10)' },
                { id: 'CONFIRMADO' as const, label: `Confirmados (${metricas.escConfirmados})` },
                { id: 'PENDIENTE_VALIDACION' as const, label: `Por validar (${metricas.escPendientes})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroValidacionEsc(f.id)}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    filtroValidacionEsc === f.id
                      ? 'bg-[#0f5b53] text-white'
                      : 'text-[#1c4b45] hover:bg-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Lista de escenarios */}
            <div className="lg:col-span-4 space-y-2">
              {escenariosFiltrados.map((esc) => {
                const active = escenarioSeleccionado?.id === esc.id;
                return (
                  <button
                    key={esc.id}
                    type="button"
                    onClick={() => setEscenarioActivoId(esc.id)}
                    className={`w-full text-left rounded-2xl border p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                      active
                        ? 'bg-[#0f5b53] text-white border-[#0f5b53] shadow-xs'
                        : 'bg-white text-slate-800 border-[#b9dad3] hover:border-[#0f6b61]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          esc.estadoValidacion === 'CONFIRMADO'
                            ? active
                              ? 'bg-emerald-400/20 text-emerald-100'
                              : 'bg-emerald-100 text-emerald-800'
                            : active
                              ? 'bg-amber-400/25 text-amber-100'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {esc.estadoValidacion === 'CONFIRMADO'
                          ? 'Confirmado'
                          : 'Pendiente de validación'}
                      </span>
                      <span
                        className={`text-[10px] font-black ${
                          active ? 'text-[#fed7aa]' : 'text-slate-500'
                        }`}
                      >
                        {esc.nivelPrioridad === 'ALTA'
                          ? 'Prioridad ALTA'
                          : esc.nivelPrioridad === 'MEDIA'
                            ? 'Prioridad MEDIA'
                            : 'Por validar'}
                      </span>
                    </div>
                    <p className="font-black text-xs leading-snug">{esc.nombre}</p>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta detalle del escenario */}
            {escenarioSeleccionado && (
              <div className="lg:col-span-8 rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8f2ef] pb-3">
                  <div>
                    <h4 className="text-base font-black text-[#0d3b36]">
                      {escenarioSeleccionado.nombre}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      <strong>Sustento en Frikaz S.A.S.:</strong>{' '}
                      {escenarioSeleccionado.sustentoEnFrikaz}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleValidacionEscenario(escenarioSeleccionado)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    {escenarioSeleccionado.estadoValidacion === 'CONFIRMADO'
                      ? 'Confirmado en planta (cambiar)'
                      : 'Confirmar tras inspección (Gerente)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-1.5">
                    <h5 className="font-black text-emerald-900 uppercase text-[11px]">
                      Qué hacer paso a paso
                    </h5>
                    <ul className="list-disc pl-4 space-y-1 text-emerald-950 leading-relaxed">
                      {escenarioSeleccionado.queHacer.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1.5">
                    <h5 className="font-black text-rose-900 uppercase text-[11px]">
                      Qué NO hacer (para proteger su vida)
                    </h5>
                    <ul className="list-disc pl-4 space-y-1 text-rose-950 leading-relaxed">
                      {escenarioSeleccionado.queNoHacer.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
                    <span className="font-black text-[#0d3b36] block">Cómo informar y a quién avisar</span>
                    <p className="text-slate-700 mt-1">
                      <strong>Cómo informar:</strong> {escenarioSeleccionado.comoInformar}
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      <strong>A quién avisar:</strong> {escenarioSeleccionado.aQuienAvisar}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
                    <span className="font-black text-[#0d3b36] block">Cuándo evacuar y cómo protegerse</span>
                    <p className="text-slate-700 mt-1">
                      <strong>Cuándo evacuar:</strong> {escenarioSeleccionado.cuandoEvacuar}
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      <strong>Protección:</strong> {escenarioSeleccionado.comoProtegerse}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 flex items-start gap-2">
                  <PhoneCall className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Cómo solicitar ayuda externa:</strong>{' '}
                    {escenarioSeleccionado.comoSolicitarAyudaExterna}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 2: DOCUMENTO COMPLETO CON LOS 20 PUNTOS OBLIGATORIOS       */}
      {/* ==================================================================== */}
      {subVista === 'documento' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-[#0d3b36]">
                  Estructura completa del Plan de Emergencias (20 apartados)
                </h4>
                <p className="text-[11px] text-slate-600">
                  Los datos físicos no verificados aparecen marcados como «Pendiente por definir / verificar en planta» para evitar información inventada. Andrea Orjuela – Gerente puede editar y guardar cada campo.
                </p>
              </div>
            </div>

            <CajaCalidadVisualCard
              caja={planEmergencias.cajaCalidad}
              readOnly={!esGerente}
              onChange={(cajaCalidad) =>
                onSavePlanEmergencias(
                  { ...planEmergencias, cajaCalidad },
                  'Caja de Calidad del Plan de Emergencias actualizada'
                )
              }
            />

            {/* 1. Identificación empresa */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h5 className="font-black text-[#0f5b53] uppercase">
                1. Identificación de la empresa
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { k: 'razonSocial' as const, label: 'Razón social' },
                  { k: 'nit' as const, label: 'NIT (confirmar)' },
                  { k: 'actividadEconomica' as const, label: 'Actividad económica' },
                  { k: 'numeroTrabajadores' as const, label: 'Número de trabajadores' },
                  { k: 'direccionVerificada' as const, label: 'Dirección verificada de planta' },
                  { k: 'telefonoEmergenciasInterno' as const, label: 'Teléfono interno de emergencias' },
                  { k: 'horarioOperacion' as const, label: 'Horario de operación' },
                  { k: 'procesosPrincipales' as const, label: 'Procesos reales' },
                ].map((f) => {
                  const val = planEmergencias.identificacionEmpresa[f.k];
                  const esPend = val.toLowerCase().includes('pendiente');
                  return (
                    <div key={f.k}>
                      <label className="font-bold text-slate-700 block mb-1">{f.label}</label>
                      <input
                        type="text"
                        disabled={!esGerente}
                        value={val}
                        onChange={(e) =>
                          onSavePlanEmergencias({
                            ...planEmergencias,
                            identificacionEmpresa: {
                              ...planEmergencias.identificacionEmpresa,
                              [f.k]: e.target.value,
                            },
                          })
                        }
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                          esPend
                            ? 'border-amber-300 bg-amber-50/70 text-amber-950 font-semibold'
                            : 'border-slate-300 bg-white'
                        } disabled:opacity-85`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2, 3, 4, 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                <h5 className="font-black text-[#0f5b53] uppercase">2. Objetivo general</h5>
                <textarea
                  rows={3}
                  disabled={!esGerente}
                  value={planEmergencias.objetivoGeneral}
                  onChange={(e) =>
                    onSavePlanEmergencias({ ...planEmergencias, objetivoGeneral: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 p-2 text-slate-700"
                />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                <h5 className="font-black text-[#0f5b53] uppercase">4. Alcance y 5. Actividades de Frikaz</h5>
                <p className="text-slate-700 leading-relaxed">{planEmergencias.alcance}</p>
                <p className="text-slate-700 leading-relaxed pt-1 border-t border-slate-100">
                  {planEmergencias.descripcionActividadesFrikaz}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
              <h5 className="font-black text-[#0f5b53] uppercase">3. Objetivos específicos</h5>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {planEmergencias.objetivosEspecificos.map((obj, idx) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* 6, 7, 8 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                <h5 className="font-black text-[#0f5b53] uppercase">6. Identificación de amenazas</h5>
                <p className="text-slate-700 leading-relaxed">
                  {planEmergencias.identificacionAmenazasResumen}
                </p>
                <button
                  type="button"
                  onClick={() => setSubVista('amenazas')}
                  className="text-[11px] font-black text-[#0f6b61] underline cursor-pointer"
                >
                  Ver los 10 escenarios →
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                <h5 className="font-black text-[#0f5b53] uppercase">7. Análisis de vulnerabilidad</h5>
                <p className="text-[11px] text-slate-700">
                  <strong>Personas:</strong> {planEmergencias.analisisVulnerabilidad.enPersonas}
                </p>
                <p className="text-[11px] text-slate-700">
                  <strong>Equipos:</strong> {planEmergencias.analisisVulnerabilidad.enRecursosYEquipos}
                </p>
                <p className="text-[11px] text-amber-900 font-bold">
                  Nivel: {planEmergencias.analisisVulnerabilidad.nivelVulnerabilidadActual}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                <h5 className="font-black text-[#0f5b53] uppercase">8. Evaluación y priorización</h5>
                <p className="text-slate-700 leading-relaxed">
                  {planEmergencias.evaluacionPriorizacion}
                </p>
              </div>
            </div>

            {/* 11. Procedimiento general */}
            <div className="rounded-xl border border-[#cfe5df] bg-[#f4faf8] p-4 space-y-2">
              <h5 className="font-black text-[#0d3b36] uppercase">
                11. Procedimiento general ante emergencias (Para los 10 trabajadores)
              </h5>
              <div className="space-y-1 text-slate-800">
                {planEmergencias.procedimientoGeneral.map((paso, idx) => (
                  <p key={idx}>{paso}</p>
                ))}
              </div>
            </div>

            {/* Referencia rápida puntos 9, 10, 12-20 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <button
                type="button"
                onClick={() => setSubVista('recursos_org')}
                className="text-left rounded-xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] p-3 cursor-pointer"
              >
                <strong className="text-[#0d3b36] block">9, 10, 13, 14 y 15</strong>
                <span className="text-slate-600">
                  Recursos, Organización (10 trab.), Rutas, Punto de encuentro y Ayuda externa →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSubVista('amenazas')}
                className="text-left rounded-xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] p-3 cursor-pointer"
              >
                <strong className="text-[#0d3b36] block">12. Procedimientos específicos</strong>
                <span className="text-slate-600">
                  Qué hacer y qué NO hacer en las 10 emergencias →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSubVista('capacitaciones')}
                className="text-left rounded-xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] p-3 cursor-pointer"
              >
                <strong className="text-[#0d3b36] block">16, 17 y 18</strong>
                <span className="text-slate-600">
                  Capacitación, Simulacros e Inspección de equipos →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSubVista('formatos_cierre')}
                className="text-left rounded-xl border border-[#b9dad3] bg-white hover:border-[#0f6b61] p-3 cursor-pointer"
              >
                <strong className="text-[#0d3b36] block">19 y 20</strong>
                <span className="text-slate-600">
                  Formatos, Evidencias y Aprobación de Gerencia →
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 3: RECURSOS, RUTAS, PUNTO DE ENCUENTRO Y ORGANIZACIÓN      */}
      {/* ==================================================================== */}
      {subVista === 'recursos_org' && (
        <div className="space-y-4">
          {/* 9. Recursos disponibles (verificables) */}
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#0f6b61]" />
                  <span>9. Recursos y equipos de emergencia (Confirmar en planta)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  No se asume ningún equipo como existente hasta que el equipo lo verifique físicamente en la planta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAbrirFormato('fmt-emg-inspeccion-recursos')}
                className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] cursor-pointer"
              >
                Abrir Formato de Inspección de Equipos
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead className="bg-[#eaf5f2] text-[#0d3b36] text-[11px]">
                  <tr>
                    <th className="p-2.5 font-black">Equipo / Recurso</th>
                    <th className="p-2.5 font-black w-52">Estado real en planta</th>
                    <th className="p-2.5 font-black">Cantidad y ubicación verificada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {planEmergencias.recursosDisponibles.map((rec) => (
                    <tr key={rec.id} className="bg-white">
                      <td className="p-2.5">
                        <p className="font-bold text-slate-900">{rec.recurso}</p>
                        <p className="text-[10px] text-slate-500">
                          {rec.categoria} · {rec.observaciones}
                        </p>
                      </td>
                      <td className="p-2">
                        <select
                          disabled={!esGerente}
                          value={rec.estadoVerificacion}
                          onChange={(e) =>
                            handleUpdateRecurso(rec.id, {
                              estadoVerificacion: e.target.value as RecursoEmergenciaItem['estadoVerificacion'],
                            })
                          }
                          className={`w-full rounded-lg border px-2 py-1 text-[11px] font-bold ${
                            rec.estadoVerificacion === 'Confirmado disponible'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : rec.estadoVerificacion === 'Faltante / Por conseguir'
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : 'bg-amber-50 border-amber-300 text-amber-950'
                          }`}
                        >
                          <option value="Pendiente por verificar en planta">
                            Pendiente por verificar en planta
                          </option>
                          <option value="Confirmado disponible">Confirmado disponible</option>
                          <option value="Faltante / Por conseguir">Faltante / Por conseguir</option>
                          <option value="No aplica">No aplica</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={!esGerente}
                          value={rec.cantidadUbicacion}
                          onChange={(e) =>
                            handleUpdateRecurso(rec.id, { cantidadUbicacion: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10. Organización y responsabilidades para 10 trabajadores */}
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
            <div>
              <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0f6b61]" />
                <span>10. Organización sencilla de emergencias (Para 10 trabajadores)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Roles prácticos para que todos sepan qué hacer sin estructuras pesadas de empresas grandes.
              </p>
            </div>

            <div className="space-y-2.5">
              {planEmergencias.organizacionEmergencias.map((rol, idx) => (
                <div
                  key={rol.id}
                  className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                >
                  <div className="lg:col-span-6">
                    <p className="font-black text-[#0d3b36]">{rol.rol}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{rol.funcionSencilla}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Encargado principal
                    </label>
                    <input
                      type="text"
                      disabled={!esGerente}
                      value={rol.responsablePrincipal}
                      onChange={(e) => {
                        const next = planEmergencias.organizacionEmergencias.map((item, i) =>
                          i === idx ? { ...item, responsablePrincipal: e.target.value } : item
                        );
                        onSavePlanEmergencias({ ...planEmergencias, organizacionEmergencias: next });
                      }}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[11px] bg-white"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Suplente (si falta)
                    </label>
                    <input
                      type="text"
                      disabled={!esGerente}
                      value={rol.suplente}
                      onChange={(e) => {
                        const next = planEmergencias.organizacionEmergencias.map((item, i) =>
                          i === idx ? { ...item, suplente: e.target.value } : item
                        );
                        onSavePlanEmergencias({ ...planEmergencias, organizacionEmergencias: next });
                      }}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[11px] bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 13, 14, 15: Rutas, Punto de encuentro y Ayuda externa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#f97316]" />
                  <span>13 y 14. Rutas, salidas y punto de encuentro</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onAbrirFormato('fmt-emg-rutas-evacuacion')}
                  className="text-[11px] font-black text-[#0f6b61] underline cursor-pointer"
                >
                  Lista chequeo rutas
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ruta principal de evacuación (definir en planta)
                  </label>
                  <textarea
                    rows={2}
                    disabled={!esGerente}
                    value={planEmergencias.rutasSalidasEvacuacion.rutaPrincipal}
                    onChange={(e) =>
                      onSavePlanEmergencias({
                        ...planEmergencias,
                        rutasSalidasEvacuacion: {
                          ...planEmergencias.rutasSalidasEvacuacion,
                          rutaPrincipal: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Salidas verificadas (ancho y apertura sin candado)
                  </label>
                  <textarea
                    rows={2}
                    disabled={!esGerente}
                    value={planEmergencias.rutasSalidasEvacuacion.salidasEmergencia}
                    onChange={(e) =>
                      onSavePlanEmergencias({
                        ...planEmergencias,
                        rutasSalidasEvacuacion: {
                          ...planEmergencias.rutasSalidasEvacuacion,
                          salidasEmergencia: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Punto de encuentro seguro (ubicado y verificado)
                  </label>
                  <textarea
                    rows={2}
                    disabled={!esGerente}
                    value={planEmergencias.puntoEncuentro.ubicacionDefinida}
                    onChange={(e) =>
                      onSavePlanEmergencias({
                        ...planEmergencias,
                        puntoEncuentro: {
                          ...planEmergencias.puntoEncuentro,
                          ubicacionDefinida: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
              <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-[#0f6b61]" />
                <span>15. Comunicación interna y solicitud de ayuda externa</span>
              </h4>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Señal o alarma interna acordada
                </label>
                <input
                  type="text"
                  disabled={!esGerente}
                  value={planEmergencias.comunicacionAyudaExterna.mecanismoAlarmaInterna}
                  onChange={(e) =>
                    onSavePlanEmergencias({
                      ...planEmergencias,
                      comunicacionAyudaExterna: {
                        ...planEmergencias.comunicacionAyudaExterna,
                        mecanismoAlarmaInterna: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">
                  Directorio de teléfonos reales (verificar y publicar en cartelera):
                </span>
                {planEmergencias.comunicacionAyudaExterna.directorioExterno.map((dir, idx) => (
                  <div
                    key={dir.id}
                    className="rounded-xl border border-slate-200 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/60"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-[11px]">{dir.entidad}</p>
                      <p className="text-[10px] text-slate-500">{dir.cuandoLlamar}</p>
                    </div>
                    <input
                      type="text"
                      disabled={!esGerente}
                      value={dir.telefono}
                      onChange={(e) => {
                        const nextDir = planEmergencias.comunicacionAyudaExterna.directorioExterno.map(
                          (item, i) =>
                            i === idx ? { ...item, telefono: e.target.value } : item
                        );
                        onSavePlanEmergencias({
                          ...planEmergencias,
                          comunicacionAyudaExterna: {
                            ...planEmergencias.comunicacionAyudaExterna,
                            directorioExterno: nextDir,
                          },
                        });
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-mono bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 4: CAPACITACIONES Y SIMULACROS (NUNCA PRE-MARCADOS)        */}
      {/* ==================================================================== */}
      {subVista === 'capacitaciones' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-2">
            <h4 className="font-black text-sm text-[#0d3b36]">
              16, 17 y 18. Programa de Capacitaciones, Simulacros e Inspecciones
            </h4>
            <p className="text-[11px] text-slate-600">
              Ninguna capacitación ni simulacro se marca como cumplido por defecto. Programe la fecha real, descargue la guía o formato, realice la actividad y sométala a revisión de Andrea Orjuela – Gerente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {planEmergencias.programaCapacitacionSimulacros.map((act) => {
              const badge = getBadgeClassesEstadoFrikaz(act.estado);
              return (
                <div
                  key={act.id}
                  className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                          act.tipo === 'SIMULACRO'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-[#e7f4f1] text-[#0f5b53]'
                        }`}
                      >
                        {act.tipo === 'SIMULACRO' ? 'Simulacro práctico' : 'Capacitación'}
                      </span>
                      <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badge.light}`}>
                        {badge.label}
                      </span>
                    </div>

                    <h5 className="font-black text-sm text-[#0d3b36]">{act.titulo}</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {act.descripcionSencilla}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          Fecha programada
                        </label>
                        <input
                          type="text"
                          disabled={!esGerente}
                          value={act.fechaProgramada}
                          onChange={(e) =>
                            handleUpdateActividadCap(act, { fechaProgramada: e.target.value })
                          }
                          placeholder="AAAA-MM-DD"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          Estado actual
                        </label>
                        <select
                          value={normalizarEstadoEstandar(act.estado)}
                          onChange={(e) =>
                            handleUpdateActividadCap(act, {
                              estado: e.target.value as EstadoEstandarFrikaz,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold bg-white"
                        >
                          {ESTADOS_TRABAJADOR_FRIKAZ.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                          <option value="Devuelto para ajustes">
                            Devuelto para ajustes (Gerente)
                          </option>
                          <option value="Cumplido">Cumplido (Gerente)</option>
                          <option value="Aprobado">Aprobado (Gerente)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e8f2ef] flex flex-wrap gap-2">
                    {act.materialCapacitacion && (
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirCapacitacion(
                            act.materialCapacitacion!,
                            `Plan de Emergencias · ${act.titulo}`,
                            (nextMat) =>
                              handleUpdateActividadCap(act, {
                                materialCapacitacion: nextMat,
                              })
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Abrir Guía y Asistencia</span>
                      </button>
                    )}

                    {act.tipo === 'SIMULACRO' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onAbrirFormato('fmt-emg-registro-simulacro')}
                          className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] cursor-pointer"
                        >
                          Formato de Simulacro
                        </button>
                        <button
                          type="button"
                          onClick={() => onAbrirFormato('fmt-emg-mejora-post-simulacro')}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 cursor-pointer"
                        >
                          Plan de Mejora Post-Simulacro
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actividades de Emergencias conectadas al Plan Anual 2027 (lectura directa) */}
          {(() => {
            const actsEmergencias = actividadesPlan.filter(
              (a) =>
                a.esPlanEmergencias ||
                a.nombre.toLowerCase().includes('simulacro') ||
                a.nombre.toLowerCase().includes('emergencia') ||
                a.nombre.toLowerCase().includes('brigada')
            );
            if (actsEmergencias.length === 0) return null;
            return (
              <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8f2ef] pb-2">
                  <h5 className="font-black text-[#0d3b36] flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#0f6b61]" />
                    <span>Actividades y simulacros vinculados en el Plan Anual 2027 ({actsEmergencias.length})</span>
                  </h5>
                  <span className="text-[10px] text-slate-500">
                    Lectura directa sin duplicación presupuestal
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {actsEmergencias.map((act) => {
                    const bAct = getBadgeClassesEstadoFrikaz(act.estado);
                    return (
                      <div
                        key={act.id}
                        className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono font-black text-[#0f5b53]">{act.codigo}</span>
                            <span className={`px-1.5 py-0.5 rounded border font-bold ${bAct.light}`}>
                              {bAct.label}
                            </span>
                            <span className="font-mono text-slate-500">{act.fechaLimite}</span>
                          </div>
                          <p className="font-bold text-slate-900 truncate mt-0.5">{act.nombre}</p>
                          <p className="text-[10px] text-slate-600">
                            {act.responsableNombre} · {act.evidencias.length} evidencia(s)
                          </p>
                        </div>
                        {onAbrirActividadPlan && (
                          <button
                            type="button"
                            onClick={() => onAbrirActividadPlan(act, 'evidencias')}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0f5b53] text-white font-black text-[10px] hover:bg-[#0c4842] cursor-pointer shrink-0"
                          >
                            Ver actividad
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 18. Inspección periódica */}
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="md:col-span-2 space-y-1">
              <h5 className="font-black text-[#0d3b36] flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#0f6b61]" />
                <span>18. Programa de inspección periódica de equipos de emergencia</span>
              </h5>
              <p className="text-[11px] text-slate-600">
                <strong>Frecuencia:</strong> {planEmergencias.inspeccionEquiposPrograma.frecuenciaSugerida} ·{' '}
                <strong>Qué revisar:</strong> {planEmergencias.inspeccionEquiposPrograma.criteriosRevision}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                Próxima inspección programada
              </label>
              <input
                type="text"
                disabled={!esGerente}
                value={planEmergencias.inspeccionEquiposPrograma.proximaInspeccion}
                onChange={(e) =>
                  onSavePlanEmergencias({
                    ...planEmergencias,
                    inspeccionEquiposPrograma: {
                      ...planEmergencias.inspeccionEquiposPrograma,
                      proximaInspeccion: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 5: FORMATOS DE EMERGENCIA, EVIDENCIAS Y APROBACIÓN GERENCIA*/}
      {/* ==================================================================== */}
      {subVista === 'formatos_cierre' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Formatos de emergencia */}
          <div className="lg:col-span-7 rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
            <div className="border-b border-[#e8f2ef] pb-2">
              <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0f6b61]" />
                <span>Formatos oficiales del Plan de Emergencias (Editables y en Word)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Todos incluyen la Caja de Calidad de Frikaz S.A.S. (editable) y se descargan en Word (Times New Roman).
              </p>
            </div>

            <div className="space-y-2.5">
              {formatosEmergencia.map((fmt) => (
                <div
                  key={fmt.id}
                  className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-black text-[#0d3b36]">{fmt.titulo}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-1">
                      {fmt.instruccionesUso}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Código: {fmt.cajaCalidad.codigo}
                      {fmt.fechaUltimoGuardado ? ` · Guardado: ${fmt.fechaUltimoGuardado}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAbrirFormato(fmt.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] shrink-0 cursor-pointer"
                  >
                    Abrir / Llenar / Word
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 19 y 20: Evidencias y Aprobación de Andrea Orjuela – Gerente */}
          <div className="lg:col-span-5 space-y-4">
            {/* 19. Evidencias */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
              <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2 border-b border-[#e8f2ef] pb-2">
                <Paperclip className="h-4 w-4 text-[#f97316]" />
                <span>19. Registros y evidencias del Plan de Emergencias</span>
              </h4>

              <form
                onSubmit={handleAdjuntarEvidenciaPlan}
                className="space-y-2 rounded-xl bg-[#f8fcfa] border border-[#d6ebe5] p-3"
              >
                <input
                  type="text"
                  value={evNombre}
                  onChange={(e) => setEvNombre(e.target.value)}
                  placeholder="Nombre del soporte (ej. Acta simulacro / Foto extintores)"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  required
                />
                <input
                  type="text"
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  placeholder="Descripción breve..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{evDataUrl ? 'Archivo listo' : 'Subir archivo / foto'}</span>
                    <input type="file" onChange={handleFileEvidencia} className="hidden" />
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
                  >
                    Guardar evidencia
                  </button>
                </div>
              </form>

              {planEmergencias.evidenciasPlan.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-2">
                  Aún no hay soportes adjuntos al Plan de Emergencias.
                </p>
              ) : (
                <div className="space-y-2">
                  {planEmergencias.evidenciasPlan.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{ev.nombreArchivo}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {ev.fechaCarga} · {ev.descripcionSoporte}
                        </p>
                      </div>
                      {ev.archivoDataUrl && (
                        <a
                          href={ev.archivoDataUrl}
                          download={ev.nombreArchivo}
                          className="px-2 py-1 rounded bg-slate-100 font-bold text-[10px] shrink-0"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 20. Seguimiento y Aprobación de Gerencia */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
                <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#0f6b61]" />
                  <span>20. Revisión y Aprobación (Gerencia)</span>
                </h4>
                <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badgePlan.light}`}>
                  {badgePlan.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ESTADOS_TRABAJADOR_FRIKAZ.map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => handleCambiarEstadoPlan(est)}
                    className={`px-3 py-1.5 rounded-lg font-bold border text-[11px] cursor-pointer ${
                      normalizarEstadoEstandar(
                        planEmergencias.seguimientoActualizacion.estado
                      ) === est
                        ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-[#e8f2ef] space-y-2">
                <span className="font-black text-[#0d3b36] block">
                  Revisión de Andrea Orjuela – Gerente
                </span>
                <textarea
                  rows={2}
                  value={
                    obsGerenciaDraft ||
                    planEmergencias.seguimientoActualizacion.observacionesGerencia
                  }
                  onChange={(e) => setObsGerenciaDraft(e.target.value)}
                  placeholder="Observaciones o ajustes solicitados por Gerencia..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCambiarEstadoPlan('Aprobado')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 cursor-pointer"
                  >
                    Aprobar Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCambiarEstadoPlan('Cumplido')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-black hover:bg-teal-700 cursor-pointer"
                  >
                    Marcar Cumplido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCambiarEstadoPlan('Devuelto para ajustes')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-black hover:bg-rose-700 cursor-pointer"
                  >
                    Devolver para ajustes
                  </button>
                </div>

                {planEmergencias.seguimientoActualizacion.revisionGerente && (
                  <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-2.5 text-[11px] text-[#0d3b36]">
                    <p>
                      <strong>Resultado:</strong>{' '}
                      {planEmergencias.seguimientoActualizacion.revisionGerente.resultadoRevision}{' '}
                      ·{' '}
                      {planEmergencias.seguimientoActualizacion.revisionGerente.fechaRevision}{' '}
                      ·{' '}
                      {planEmergencias.seguimientoActualizacion.revisionGerente.revisadoPor}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      {planEmergencias.seguimientoActualizacion.revisionGerente.observaciones}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[10px] text-amber-950 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Llenar formatos o adjuntar soportes nunca aprueba el Plan de Emergencias automáticamente; requiere revisión de{' '}
                  <strong>{nombreGerente}</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 text-[11px] text-[#173f3a] flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#0f6b61] shrink-0" />
        <span>
          Este Plan de Emergencias está conectado con el riesgo de <strong>Situaciones de emergencia</strong> en Planes de Mejora por Riesgo y vive exclusivamente dentro de <strong>PLAN ANUAL</strong>.
        </span>
      </div>
    </div>
  );
};
