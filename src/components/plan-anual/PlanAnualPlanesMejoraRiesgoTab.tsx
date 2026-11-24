import React, { useMemo, useState, useEffect } from 'react';
import type { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import type {
  ActividadPlanAnual,
  EvidenciaActividad,
  ResponsablePlanOption,
} from '../../types/planAnual';
import type {
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
  PlanMejoraPorRiesgo,
} from '../../types/planAnualMejoraEmergencias';
import {
  crearPlanesParaRiesgosFaltantes,
  detectarCambiosMatrizEnPlan,
  exportarPlanMejoraIndividualWordDocx,
  obtenerRiesgosMatrizSinPlan,
} from '../../services/planMejoraEmergenciasService';
import {
  ESTADOS_ESTANDAR_FRIKAZ,
  ESTADOS_TRABAJADOR_FRIKAZ,
  crearRegistroRevisionGerente,
  esEstadoExclusivoGerente,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
  type EstadoEstandarFrikaz,
} from '../../services/gerenteControlService';
import { crearRiesgoSnapshot, extraerMedidasRiesgo } from '../../services/planAnualService';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Flame,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
} from 'lucide-react';

interface PlanAnualPlanesMejoraRiesgoTabProps {
  planes: PlanMejoraPorRiesgo[];
  riesgos: RiesgoGTC45Item[];
  formatos: Record<string, FormatoEditableDocumento>;
  responsables: ResponsablePlanOption[];
  actividadesPlan?: ActividadPlanAnual[];
  onAbrirActividadPlan?: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  externalSearch?: string;
  externalSelectPlanId?: string;
  navNonce?: number;
  onSavePlanes: (next: PlanMejoraPorRiesgo[], auditDetail?: string) => void;
  onAbrirFormato: (formatoId: string) => void;
  onAbrirCapacitacion: (
    material: MaterialCapacitacionPlan,
    contexto: string,
    onSave: (nextMat: MaterialCapacitacionPlan) => void
  ) => void;
  onIrAPlanEmergencias: () => void;
}

export const PlanAnualPlanesMejoraRiesgoTab: React.FC<PlanAnualPlanesMejoraRiesgoTabProps> = ({
  planes,
  riesgos,
  formatos,
  responsables,
  actividadesPlan = [],
  onAbrirActividadPlan,
  externalSearch,
  externalSelectPlanId,
  navNonce,
  onSavePlanes,
  onAbrirFormato,
  onAbrirCapacitacion,
  onIrAPlanEmergencias,
}) => {
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();

  const [selectedId, setSelectedId] = useState<string | null>(externalSelectPlanId || null);
  const [filtroValidacion, setFiltroValidacion] = useState<'TODOS' | 'CONFIRMADO' | 'PENDIENTE_VALIDACION'>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'I' | 'II' | 'III_IV'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoEstandarFrikaz>('TODOS');
  const [busqueda, setBusqueda] = useState(externalSearch || '');

  useEffect(() => {
    if (navNonce === undefined) return;
    if (externalSelectPlanId !== undefined) {
      setSelectedId(externalSelectPlanId || null);
    }
    if (externalSearch !== undefined) {
      setBusqueda(externalSearch);
    }
  }, [navNonce, externalSelectPlanId, externalSearch]);

  // Form estados en vista detalle
  const [nuevoSoporteNombre, setNuevoSoporteNombre] = useState('');
  const [nuevoSoporteDesc, setNuevoSoporteDesc] = useState('');
  const [nuevoSoporteDataUrl, setNuevoSoporteDataUrl] = useState<string | undefined>(undefined);
  const [comentarioGerenciaDraft, setComentarioGerenciaDraft] = useState('');
  const [exportandoId, setExportandoId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const riesgosSinPlan = useMemo(
    () => obtenerRiesgosMatrizSinPlan(planes, riesgos),
    [planes, riesgos]
  );

  const cambiosPorPlan = useMemo(() => {
    const map: Record<string, ReturnType<typeof detectarCambiosMatrizEnPlan>> = {};
    planes.forEach((p) => {
      map[p.id] = detectarCambiosMatrizEnPlan(p, riesgos);
    });
    return map;
  }, [planes, riesgos]);

  const totalCambiosMatriz = useMemo(
    () => Object.values(cambiosPorPlan).filter((c) => c.cambiado).length,
    [cambiosPorPlan]
  );

  const metricas = useMemo(() => {
    const total = planes.length;
    const confirmados = planes.filter((p) => p.estadoValidacionReal === 'CONFIRMADO').length;
    const pendientesVal = total - confirmados;
    const aprobados = planes.filter((p) => {
      const est = normalizarEstadoEstandar(p.estado);
      return est === 'Aprobado' || est === 'Cumplido';
    }).length;
    const enRevision = planes.filter(
      (p) => normalizarEstadoEstandar(p.estado) === 'Pendiente de revisión'
    ).length;
    return { total, confirmados, pendientesVal, aprobados, enRevision };
  }, [planes]);

  const planesFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return [...planes]
      .sort((a, b) => a.orden - b.orden)
      .filter((p) => {
        if (filtroValidacion !== 'TODOS' && p.estadoValidacionReal !== filtroValidacion) {
          return false;
        }
        if (filtroNivel === 'I' && p.nivelRiesgoMatriz !== 'I') return false;
        if (filtroNivel === 'II' && p.nivelRiesgoMatriz !== 'II') return false;
        if (
          filtroNivel === 'III_IV' &&
          p.nivelRiesgoMatriz !== 'III' &&
          p.nivelRiesgoMatriz !== 'IV'
        ) {
          return false;
        }
        if (
          filtroEstado !== 'TODOS' &&
          normalizarEstadoEstandar(p.estado) !== filtroEstado
        ) {
          return false;
        }
        if (term) {
          const blob = `${p.nombreRiesgo} ${p.riesgoCodigo} ${p.cargoMatriz} ${p.procesoMatriz} ${p.actividadMejoraPropuesta}`.toLowerCase();
          if (!blob.includes(term)) return false;
        }
        return true;
      });
  }, [planes, filtroValidacion, filtroNivel, filtroEstado, busqueda]);

  const planSeleccionado = useMemo(
    () => planes.find((p) => p.id === selectedId) || null,
    [planes, selectedId]
  );

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const updatePlan = (updated: PlanMejoraPorRiesgo, auditMsg?: string) => {
    const next = planes.map((p) => (p.id === updated.id ? updated : p));
    onSavePlanes(next, auditMsg);
  };

  const handleSincronizarFaltantes = () => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (riesgosSinPlan.length === 0) return;
    const next = crearPlanesParaRiesgosFaltantes(planes, riesgosSinPlan);
    onSavePlanes(
      next,
      `Se agregaron ${riesgosSinPlan.length} planes individuales desde la Matriz GTC 45.`
    );
    showToast(`Se agregaron ${riesgosSinPlan.length} plan(es) nuevos desde la Matriz de Riesgos.`);
  };

  const handleActualizarSnapshotDesdeMatriz = (plan: PlanMejoraPorRiesgo) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const info = cambiosPorPlan[plan.id];
    if (!info?.riesgoActual) return;
    const r = info.riesgoActual;
    const hoy = new Date().toISOString().split('T')[0];
    const nextPlan: PlanMejoraPorRiesgo = {
      ...plan,
      riesgoCodigo: r.codigo || r.id,
      nivelRiesgoMatriz: r.interpretacionNR,
      puntajeMatriz: r.nivelRiesgo,
      procesoMatriz: r.proceso,
      cargoMatriz: r.cargo || r.cargosExpuestos || plan.cargoMatriz,
      actividadMatriz: r.actividades,
      riesgoSnapshot: crearRiesgoSnapshot(r),
      medidaPrevencionControl:
        plan.estado === 'Aprobado' || plan.estado === 'Cumplido'
          ? plan.medidaPrevencionControl
          : extraerMedidasRiesgo(r) || plan.medidaPrevencionControl,
      historialCambios: [
        {
          id: `hp-sync-${Date.now()}`,
          fecha: hoy,
          usuario: nombreGerente,
          accion: 'Sincronizado con Matriz GTC 45',
          detalle: info.cambios.join(' '),
        },
        ...plan.historialCambios,
      ],
    };
    updatePlan(nextPlan, `Plan ${plan.nombreRiesgo} sincronizado con Matriz GTC 45.`);
    showToast('Información de la Matriz GTC 45 actualizada en este plan.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!nuevoSoporteNombre) setNuevoSoporteNombre(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNuevoSoporteDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdjuntarEvidencia = (plan: PlanMejoraPorRiesgo, e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoSoporteNombre.trim()) return;
    const hoy = new Date().toISOString().split('T')[0];

    const nuevaEv: EvidenciaActividad = {
      id: `ev-pmr-${Date.now()}`,
      nombreArchivo: nuevoSoporteNombre.trim(),
      tipoSoporte: 'ACTA',
      descripcionSoporte:
        nuevoSoporteDesc.trim() || 'Soporte cargado para revisión de Gerencia.',
      archivoDataUrl: nuevoSoporteDataUrl,
      fechaCarga: hoy,
      cargadoPor: 'Equipo Frikaz S.A.S.',
      estadoRevision: 'PENDIENTE_REVISION',
    };

    // IMPORTANTE: Adjuntar evidencia NUNCA marca como Cumplido ni Aprobado.
    const estadoActual = normalizarEstadoEstandar(plan.estado);
    const siguienteEstado: EstadoEstandarFrikaz =
      estadoActual === 'Por hacer' ||
      estadoActual === 'En proceso' ||
      estadoActual === 'Devuelto para ajustes'
        ? 'Pendiente de revisión'
        : estadoActual;

    const updated: PlanMejoraPorRiesgo = {
      ...plan,
      estado: siguienteEstado,
      evidenciasAdjuntas: [nuevaEv, ...plan.evidenciasAdjuntas],
      historialCambios: [
        {
          id: `hp-ev-${Date.now()}`,
          fecha: hoy,
          usuario: 'Equipo Frikaz S.A.S.',
          accion: 'Evidencia adjuntada',
          detalle: `Soporte "${nuevaEv.nombreArchivo}" cargado. Queda en estado "${siguienteEstado}" esperando revisión de Gerencia.`,
        },
        ...plan.historialCambios,
      ],
    };
    updatePlan(updated, `Evidencia agregada al plan: ${plan.nombreRiesgo}`);
    setNuevoSoporteNombre('');
    setNuevoSoporteDesc('');
    setNuevoSoporteDataUrl(undefined);
    showToast(
      'Evidencia guardada. El plan NO se marca como Cumplido hasta que Andrea Orjuela – Gerente lo revise.'
    );
  };

  const handleCambiarEstado = (
    plan: PlanMejoraPorRiesgo,
    nuevoEstado: EstadoEstandarFrikaz,
    obsGerencia?: string
  ) => {
    if (esEstadoExclusivoGerente(nuevoEstado) && !esGerente) {
      solicitarAccesoGerente();
      showToast(
        `Solo Andrea Orjuela – Gerente (con su correo) puede marcar el plan como "${nuevoEstado}".`
      );
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const esGer = esEstadoExclusivoGerente(nuevoEstado);
    const obsFinal =
      obsGerencia !== undefined ? obsGerencia : plan.observacionesGerencia;

    const updated: PlanMejoraPorRiesgo = {
      ...plan,
      estado: nuevoEstado,
      observacionesGerencia: obsFinal,
      revisionGerente: esGer
        ? crearRegistroRevisionGerente(
            nuevoEstado as 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes',
            obsFinal
          )
        : plan.revisionGerente,
      evidenciasAdjuntas:
        nuevoEstado === 'Aprobado' || nuevoEstado === 'Cumplido'
          ? plan.evidenciasAdjuntas.map((ev) => ({
              ...ev,
              estadoRevision: nuevoEstado === 'Aprobado' ? 'APROBADA' : 'CUMPLIDA',
              revisadoPor: nombreGerente,
              fechaRevision: hoy,
            }))
          : plan.evidenciasAdjuntas,
      historialCambios: [
        {
          id: `hp-est-${Date.now()}`,
          fecha: hoy,
          usuario: esGer ? nombreGerente : 'Equipo Frikaz S.A.S.',
          accion: `Estado cambiado a ${nuevoEstado}`,
          detalle: obsFinal || `Estado actualizado a ${nuevoEstado}.`,
        },
        ...plan.historialCambios,
      ],
    };
    updatePlan(updated, `Estado de "${plan.nombreRiesgo}": ${nuevoEstado}`);
    showToast(`Estado actualizado a "${nuevoEstado}".`);
  };

  const handleExportarWordPlan = async (plan: PlanMejoraPorRiesgo) => {
    setExportandoId(plan.id);
    try {
      const asociados = plan.formatosIds
        .map((fid) => formatos[fid])
        .filter((f): f is FormatoEditableDocumento => Boolean(f));
      await exportarPlanMejoraIndividualWordDocx(plan, asociados);
    } finally {
      setExportandoId(null);
    }
  };

  // ==========================================================================
  // VISTA DETALLE DE UN PLAN DE MEJORA POR RIESGO
  // ==========================================================================
  if (planSeleccionado) {
    const badgeEst = getBadgeClassesEstadoFrikaz(planSeleccionado.estado);
    const cambioMtx = cambiosPorPlan[planSeleccionado.id];
    const formatosAsociados = planSeleccionado.formatosIds
      .map((fid) => formatos[fid])
      .filter((f): f is FormatoEditableDocumento => Boolean(f));

    return (
      <div className="space-y-4 text-xs">
        {/* Barra superior de navegación */}
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setComentarioGerenciaDraft('');
              }}
              className="px-3 py-2 rounded-xl bg-[#eef6f4] hover:bg-[#dceee9] text-[#0d3b36] font-black inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Todos los planes</span>
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-black text-[#0f6b61]">
                  Plan #{planSeleccionado.orden} · {planSeleccionado.riesgoCodigo}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${
                    planSeleccionado.nivelRiesgoMatriz === 'I'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  Nivel {planSeleccionado.nivelRiesgoMatriz} (Matriz GTC 45)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${
                    planSeleccionado.estadoValidacionReal === 'CONFIRMADO'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {planSeleccionado.estadoValidacionReal === 'CONFIRMADO'
                    ? 'Confirmado en planta'
                    : 'Pendiente de validación'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${badgeEst.light}`}
                >
                  {badgeEst.label}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#0d3b36] mt-0.5">
                {planSeleccionado.nombreRiesgo}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {planSeleccionado.vinculadoAPlanEmergencias && (
              <button
                type="button"
                onClick={onIrAPlanEmergencias}
                className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5" />
                <span>Abrir Plan de Emergencias</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExportarWordPlan(planSeleccionado)}
              disabled={exportandoId === planSeleccionado.id}
              className="px-3.5 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              <span>
                {exportandoId === planSeleccionado.id
                  ? 'Generando Word...'
                  : 'Descargar Plan (.docx)'}
              </span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-2.5 text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Alerta de cambios en Matriz GTC 45 */}
        {cambioMtx?.cambiado && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black">
                  Se detectó un cambio en la Matriz de Riesgos GTC 45 para este riesgo
                </p>
                <ul className="list-disc pl-4 text-[11px] text-amber-900 mt-1 space-y-0.5">
                  {cambioMtx.cambios.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
            {!cambioMtx.eliminadoDeMatriz && (
              <button
                type="button"
                onClick={() => handleActualizarSnapshotDesdeMatriz(planSeleccionado)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sincronizar datos de matriz</span>
              </button>
            )}
          </div>
        )}

        {/* Validación real en planta */}
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            planSeleccionado.estadoValidacionReal === 'CONFIRMADO'
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/70'
          }`}
        >
          <div className="space-y-1">
            <span className="font-black text-[#0d3b36] block">
              Validación con la realidad de Frikaz S.A.S. (10 trabajadores)
            </span>
            <p className="text-slate-700 leading-relaxed">
              {planSeleccionado.motivoValidacionReal}
            </p>
            <p className="text-[11px] text-slate-600">
              <strong>Cargo / Proceso en matriz:</strong> {planSeleccionado.cargoMatriz} ·{' '}
              {planSeleccionado.procesoMatriz} ({planSeleccionado.actividadMatriz})
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!esGerente) {
                solicitarAccesoGerente();
                return;
              }
              const nextVal =
                planSeleccionado.estadoValidacionReal === 'CONFIRMADO'
                  ? 'PENDIENTE_VALIDACION'
                  : 'CONFIRMADO';
              updatePlan(
                {
                  ...planSeleccionado,
                  estadoValidacionReal: nextVal,
                  motivoValidacionReal:
                    nextVal === 'CONFIRMADO'
                      ? `Validado directamente en planta por ${nombreGerente} el ${new Date().toISOString().split('T')[0]}.`
                      : planSeleccionado.motivoValidacionReal,
                },
                `Validación real cambiada a ${nextVal}`
              );
            }}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#0f6b61] text-[#0d3b36] font-bold shrink-0 cursor-pointer"
          >
            {planSeleccionado.estadoValidacionReal === 'CONFIRMADO'
              ? 'Marcar como pendiente de validación'
              : 'Confirmar validación en planta (Gerente)'}
          </button>
        </div>

        {/* Contenido principal en 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Columna izquierda: Plan detallado y Capacitación */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-4 shadow-xs">
              <h4 className="text-sm font-black text-[#0d3b36] border-b border-[#e8f2ef] pb-2">
                Detalle del Plan de Mejora (Lenguaje claro)
              </h4>

              <div className="space-y-1">
                <label className="font-black text-[#26524c] block">
                  1. Situación que se busca mejorar
                </label>
                <textarea
                  rows={2}
                  disabled={!esGerente}
                  value={planSeleccionado.situacionQueSeBuscaMejorar}
                  onChange={(e) =>
                    updatePlan({
                      ...planSeleccionado,
                      situacionQueSeBuscaMejorar: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50/50 disabled:opacity-80"
                />
              </div>

              <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3.5 space-y-1">
                <span className="font-black text-[#0f5b53] block">
                  2. Explicación sencilla para los trabajadores
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {planSeleccionado.explicacionSencilla}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#26524c] block">
                  3. Actividad de mejora propuesta
                </label>
                <textarea
                  rows={2}
                  disabled={!esGerente}
                  value={planSeleccionado.actividadMejoraPropuesta}
                  onChange={(e) =>
                    updatePlan({
                      ...planSeleccionado,
                      actividadMejoraPropuesta: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50/50 disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#26524c] block">
                  4. Medida de prevención y control (práctica y realista)
                </label>
                <textarea
                  rows={2}
                  disabled={!esGerente}
                  value={planSeleccionado.medidaPrevencionControl}
                  onChange={(e) =>
                    updatePlan({
                      ...planSeleccionado,
                      medidaPrevencionControl: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50/50 disabled:opacity-80"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-black text-[#26524c] block mb-1">Responsable</label>
                  <select
                    disabled={!esGerente}
                    value={planSeleccionado.responsable}
                    onChange={(e) =>
                      updatePlan({ ...planSeleccionado, responsable: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2 bg-white font-bold disabled:opacity-80"
                  >
                    <option value={planSeleccionado.responsable}>
                      {planSeleccionado.responsable}
                    </option>
                    {responsables.map((r) => (
                      <option key={r.id} value={r.nombre}>
                        {r.nombre} ({r.cargo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-black text-[#26524c] block mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    disabled={!esGerente}
                    value={planSeleccionado.fechaInicio}
                    onChange={(e) =>
                      updatePlan({ ...planSeleccionado, fechaInicio: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2 font-mono disabled:opacity-80"
                  />
                </div>
                <div>
                  <label className="font-black text-[#26524c] block mb-1">Fecha fin</label>
                  <input
                    type="date"
                    disabled={!esGerente}
                    value={planSeleccionado.fechaFin}
                    onChange={(e) =>
                      updatePlan({ ...planSeleccionado, fechaFin: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2 font-mono disabled:opacity-80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-[#26524c] block mb-1">
                    Recursos necesarios (10 trabajadores)
                  </label>
                  <textarea
                    rows={2}
                    disabled={!esGerente}
                    value={planSeleccionado.recursosNecesarios}
                    onChange={(e) =>
                      updatePlan({
                        ...planSeleccionado,
                        recursosNecesarios: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2 text-slate-700 disabled:opacity-80"
                  />
                </div>
                <div>
                  <label className="font-black text-[#26524c] block mb-1">
                    Resultado esperado
                  </label>
                  <textarea
                    rows={2}
                    disabled={!esGerente}
                    value={planSeleccionado.resultadoEsperado}
                    onChange={(e) =>
                      updatePlan({
                        ...planSeleccionado,
                        resultadoEsperado: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2 text-slate-700 disabled:opacity-80"
                  />
                </div>
              </div>
            </div>

            {/* Correlación directa con actividades del Plan Anual 2027 (sin duplicar presupuesto) */}
            {(() => {
              const actsVinculadas = actividadesPlan.filter(
                (a) =>
                  a.planMejoraRiesgoId === planSeleccionado.id ||
                  a.riesgoId === planSeleccionado.riesgoId ||
                  (a.riesgoCodigo && a.riesgoCodigo === planSeleccionado.riesgoCodigo)
              );
              if (actsVinculadas.length === 0) return null;
              return (
                <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-2.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8f2ef] pb-2">
                    <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#0f6b61]" />
                      <span>Actividades vinculadas en el Plan Anual 2027 ({actsVinculadas.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Lectura directa sin duplicar montos
                    </span>
                  </div>
                  <div className="space-y-2">
                    {actsVinculadas.map((act) => {
                      const bAct = getBadgeClassesEstadoFrikaz(act.estado);
                      return (
                        <div
                          key={act.id}
                          className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-mono font-black text-[#0f5b53]">
                                {act.codigo}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded border font-bold ${bAct.light}`}>
                                {bAct.label}
                              </span>
                              <span className="font-mono text-slate-500">
                                {act.fechaInicio} → {act.fechaLimite}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 mt-0.5">{act.nombre}</p>
                            <p className="text-[10px] text-slate-600">
                              Responsable: {act.responsableNombre} · Presupuesto asignado: $
                              {(act.presupuestoAprobado || 0).toLocaleString('es-CO')} · Ejecutado: $
                              {(act.gastoEjecutado || 0).toLocaleString('es-CO')}
                            </p>
                          </div>
                          {onAbrirActividadPlan && (
                            <button
                              type="button"
                              onClick={() => onAbrirActividadPlan(act, 'datos')}
                              className="px-3 py-1.5 rounded-lg bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] text-[10px] cursor-pointer shrink-0"
                            >
                              Ver en Plan 2027
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Bloque de Capacitación Completa */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#0f6b61]" />
                  <span>Capacitación necesaria para este riesgo</span>
                </h4>
                <span className="text-[11px] font-bold text-[#0f6b61]">
                  {planSeleccionado.capacitacion.duracionSugerida}
                </span>
              </div>

              {planSeleccionado.capacitacion.requiereCapacitacion ? (
                <div className="space-y-2.5">
                  <p className="font-black text-slate-900">
                    {planSeleccionado.capacitacion.nombre}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Objetivo:</strong> {planSeleccionado.capacitacion.objetivo}
                  </p>
                  <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
                    <span className="font-bold text-[#0d3b36] block mb-1">
                      Incluye guía lista para dictar:
                    </span>
                    <p className="text-[11px] text-slate-700">
                      Temas principales, explicación paso a paso en palabras sencillas, actividad corta, preguntas de evaluación y registro editable de asistencia (descargable en Word con Caja de Calidad).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAbrirCapacitacion(
                        planSeleccionado.capacitacion,
                        `Plan #${planSeleccionado.orden}: ${planSeleccionado.nombreRiesgo}`,
                        (nextMat) => {
                          updatePlan(
                            { ...planSeleccionado, capacitacion: nextMat },
                            `Asistencia / guía de capacitación guardada en "${planSeleccionado.nombreRiesgo}".`
                          );
                        }
                      )
                    }
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Abrir Guía de Capacitación, Evaluación y Asistencia</span>
                  </button>
                </div>
              ) : (
                <p className="text-slate-600">
                  No requiere capacitación adicional específica.
                </p>
              )}
            </div>
          </div>

          {/* Columna derecha: Formatos editables, Evidencias y Revisión de Gerencia */}
          <div className="lg:col-span-5 space-y-4">
            {/* Formatos y Documentos de Apoyo */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3 shadow-xs">
              <div className="border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0f6b61]" />
                  <span>Formatos y documentos de apoyo</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Todos incluyen la Caja de Calidad de Frikaz S.A.S. (editable) y descarga en Word (Times New Roman).
                </p>
              </div>

              <div className="space-y-2">
                {formatosAsociados.map((fmt) => (
                  <div
                    key={fmt.id}
                    className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#0d3b36] leading-snug">{fmt.titulo}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Código: {fmt.cajaCalidad.codigo}
                        {fmt.fechaUltimoGuardado
                          ? ` · Último guardado: ${fmt.fechaUltimoGuardado}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAbrirFormato(fmt.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] shrink-0 cursor-pointer"
                    >
                      Abrir / Llenar / Word
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidencias requeridas y adjuntas */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3 shadow-xs">
              <div className="border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-[#f97316]" />
                  <span>Evidencias requeridas y soportes</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-1">
                  <strong>Qué se necesita entregar:</strong> {planSeleccionado.evidenciaRequerida}
                </p>
              </div>

              <form onSubmit={(e) => handleAdjuntarEvidencia(planSeleccionado, e)} className="space-y-2 bg-[#f8fcfa] p-3 rounded-xl border border-[#d6ebe5]">
                <span className="font-black text-[#0d3b36] block">
                  Adjuntar soporte real (foto, acta o formato llenado)
                </span>
                <input
                  type="text"
                  value={nuevoSoporteNombre}
                  onChange={(e) => setNuevoSoporteNombre(e.target.value)}
                  placeholder="Nombre del archivo o soporte (ej. Lista chequeo abril)"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                  required
                />
                <input
                  type="text"
                  value={nuevoSoporteDesc}
                  onChange={(e) => setNuevoSoporteDesc(e.target.value)}
                  placeholder="Breve explicación de lo realizado..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{nuevoSoporteDataUrl ? 'Archivo adjunto listo' : 'Subir archivo / foto'}</span>
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
                  >
                    Guardar evidencia
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Nota: Subir una evidencia envía el plan a <strong>Pendiente de revisión</strong>, nunca lo marca como Cumplido automáticamente.
                </p>
              </form>

              {planSeleccionado.evidenciasAdjuntas.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-2">
                  Todavía no hay evidencias adjuntas en este plan.
                </p>
              ) : (
                <div className="space-y-2">
                  {planSeleccionado.evidenciasAdjuntas.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-2 bg-white"
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
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold text-[10px] shrink-0"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estado y Revisión de Andrea Orjuela – Gerente */}
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#0f6b61]" />
                  <span>Estado y Seguimiento de Gerencia</span>
                </h4>
                <span className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${badgeEst.light}`}>
                  {badgeEst.label}
                </span>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">
                  Avance del equipo (sin aprobación final):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ESTADOS_TRABAJADOR_FRIKAZ.map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => handleCambiarEstado(planSeleccionado, est)}
                      className={`px-3 py-1.5 rounded-lg font-bold border text-[11px] cursor-pointer ${
                        normalizarEstadoEstandar(planSeleccionado.estado) === est
                          ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#e8f2ef] space-y-2">
                <span className="font-black text-[#0d3b36] block">
                  Decisión de Andrea Orjuela – Gerente
                </span>
                <textarea
                  rows={2}
                  value={
                    comentarioGerenciaDraft ||
                    planSeleccionado.observacionesGerencia
                  }
                  onChange={(e) => setComentarioGerenciaDraft(e.target.value)}
                  placeholder="Observaciones o indicaciones de seguimiento de Gerencia..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const obs =
                        comentarioGerenciaDraft || planSeleccionado.observacionesGerencia;
                      handleCambiarEstado(planSeleccionado, 'Aprobado', obs);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 cursor-pointer"
                  >
                    Aprobar plan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const obs =
                        comentarioGerenciaDraft || planSeleccionado.observacionesGerencia;
                      handleCambiarEstado(planSeleccionado, 'Cumplido', obs);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-black hover:bg-teal-700 cursor-pointer"
                  >
                    Marcar Cumplido
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const obs =
                        comentarioGerenciaDraft || planSeleccionado.observacionesGerencia;
                      handleCambiarEstado(planSeleccionado, 'Devuelto para ajustes', obs);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-black hover:bg-rose-700 cursor-pointer"
                  >
                    Devolver para ajustes
                  </button>
                  {esGerente && (
                    <button
                      type="button"
                      onClick={() => {
                        updatePlan(
                          {
                            ...planSeleccionado,
                            observacionesGerencia:
                              comentarioGerenciaDraft ||
                              planSeleccionado.observacionesGerencia,
                          },
                          'Observación de Gerencia guardada'
                        );
                        showToast('Observación de Gerencia guardada.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Save className="h-3 w-3" />
                      <span>Guardar nota</span>
                    </button>
                  )}
                </div>

                {planSeleccionado.revisionGerente && (
                  <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-2.5 text-[11px] text-[#0d3b36]">
                    <p>
                      <strong>Última revisión:</strong>{' '}
                      {planSeleccionado.revisionGerente.resultadoRevision} ·{' '}
                      {planSeleccionado.revisionGerente.fechaRevision} ·{' '}
                      {planSeleccionado.revisionGerente.revisadoPor}
                    </p>
                    {planSeleccionado.revisionGerente.observaciones && (
                      <p className="text-slate-600 mt-0.5">
                        {planSeleccionado.revisionGerente.observaciones}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VISTA PRINCIPAL: LISTADO DE PLANES DE MEJORA POR RIESGO (UNO POR CADA RIESGO)
  // ==========================================================================
  return (
    <div className="space-y-4 text-xs">
      {/* Encabezado y resumen */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0d3b36] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#f97316]" />
              <span>PLANES DE MEJORA POR RIESGO — Frikaz S.A.S.</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Cada peligro tiene su propio plan individual conectado con la Matriz GTC 45, con explicación sencilla, medidas reales para 10 trabajadores, capacitación completa y formatos descargables en Word.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {riesgosSinPlan.length > 0 && (
              <button
                type="button"
                onClick={handleSincronizarFaltantes}
                className="px-3.5 py-2 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  Generar planes para {riesgosSinPlan.length} riesgo(s) extra de la matriz
                </span>
              </button>
            )}
          </div>
        </div>

        {/* KPI rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
            <span className="text-[11px] font-bold text-[#3f6660] block">Planes individuales</span>
            <span className="text-xl font-black font-mono text-[#0d3b36]">{metricas.total}</span>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
            <span className="text-[11px] font-bold text-emerald-800 block">
              Confirmados en planta
            </span>
            <span className="text-xl font-black font-mono text-emerald-900">
              {metricas.confirmados}
            </span>
          </div>
          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3">
            <span className="text-[11px] font-bold text-amber-900 block">
              Pendientes de validación
            </span>
            <span className="text-xl font-black font-mono text-amber-950">
              {metricas.pendientesVal}
            </span>
          </div>
          <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
            <span className="text-[11px] font-bold text-[#3f6660] block">
              Aprobados / Cumplidos
            </span>
            <span className="text-xl font-black font-mono text-[#0f6b61]">
              {metricas.aprobados}{' '}
              <span className="text-[11px] font-normal text-slate-500">
                ({metricas.enRevision} por revisar)
              </span>
            </span>
          </div>
        </div>

        {totalCambiosMatriz > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-center gap-2.5 text-amber-950 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Hay {totalCambiosMatriz} plan(es) con cambios detectados en la Matriz de Riesgos GTC 45. Ábralos para revisar y sincronizar si aplica.
            </span>
          </div>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar riesgo, cargo o medida..."
              className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 bg-white"
            />
          </div>

          <select
            value={filtroValidacion}
            onChange={(e) => setFiltroValidacion(e.target.value as typeof filtroValidacion)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-bold text-slate-700"
          >
            <option value="TODOS">Validación real: Todos</option>
            <option value="CONFIRMADO">Confirmados en planta</option>
            <option value="PENDIENTE_VALIDACION">Pendientes de validación</option>
          </select>

          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value as typeof filtroNivel)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-bold text-slate-700"
          >
            <option value="TODOS">Nivel GTC 45: Todos</option>
            <option value="I">Nivel I (Crítico)</option>
            <option value="II">Nivel II (Alto)</option>
            <option value="III_IV">Nivel III / IV</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-bold text-slate-700"
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

      {/* Lista de tarjetas individuales (sin mezclar riesgos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {planesFiltrados.map((plan) => {
          const badgeEst = getBadgeClassesEstadoFrikaz(plan.estado);
          const cambio = cambiosPorPlan[plan.id];
          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#0f6b61] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#0f5b53] text-white font-mono font-black text-[10px]">
                      #{plan.orden} · {plan.riesgoCodigo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${
                        plan.nivelRiesgoMatriz === 'I'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      Nivel {plan.nivelRiesgoMatriz}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${
                        plan.estadoValidacionReal === 'CONFIRMADO'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {plan.estadoValidacionReal === 'CONFIRMADO'
                        ? 'Confirmado'
                        : 'Pendiente de validación'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${badgeEst.light}`}
                  >
                    {badgeEst.label}
                  </span>
                </div>

                <h4 className="text-sm font-black text-[#0d3b36] leading-snug">
                  {plan.nombreRiesgo}
                </h4>

                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                  {plan.actividadMejoraPropuesta}
                </p>

                <div className="rounded-xl bg-[#f4faf8] border border-[#d6ebe5] p-2.5 text-[11px] space-y-0.5 text-[#173f3a]">
                  <p className="truncate">
                    <strong>Cargo / Área:</strong> {plan.cargoMatriz}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {plan.fechaInicio} → {plan.fechaFin}
                    </span>
                    <span>·</span>
                    <span>
                      {plan.formatosIds.length} formato(s) ·{' '}
                      {plan.evidenciasAdjuntas.length} soporte(s)
                    </span>
                  </p>
                </div>

                {cambio?.cambiado && (
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Hubo cambios recientes en este riesgo en la Matriz GTC 45.</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-[#e8f2ef] flex flex-wrap items-center justify-between gap-2">
                {plan.vinculadoAPlanEmergencias ? (
                  <button
                    type="button"
                    onClick={onIrAPlanEmergencias}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-black hover:bg-rose-100 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Ir a Plan de Emergencias</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[180px]">
                    Resp: {plan.responsable}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedId(plan.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <span>Abrir plan completo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {planesFiltrados.length === 0 && (
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-8 text-center text-slate-500">
          No hay planes que coincidan con los filtros seleccionados.
        </div>
      )}

      {/* Aviso de seguridad de permisos */}
      <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 text-[11px] text-[#173f3a] flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#0f6b61] shrink-0" />
        <span>
          Los trabajadores pueden abrir guías de capacitación, llenar formatos y subir soportes. Únicamente <strong>Andrea Orjuela – Gerente</strong> puede aprobar o marcar como Cumplido un plan de mejora.
        </span>
      </div>
    </div>
  );
};
