import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NormaPhvaItem } from '../../types/phvaEvidence';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
  CambioFechaActividad,
  DiagnosticoSaludEmpresa,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  PlanAnualSgsstData,
  PlanAnualVigencia,
  RecomendacionIntervencion,
  RegistroPeriodoIndicador,
  RequisitoObligatorioIdentificado,
  SolicitudRevisionPlan,
  TrabajadorFichaSST,
} from '../../types/planAnual';
import {
  calcularIndicadoresPlan,
  calcularResumenPresupuestoPlan,
  construirEmpresaSnapshot,
  crearRiesgoSnapshot,
  crearSiguienteOcurrencia,
  detectarImpactosEnPlan,
  extraerMedidasRiesgo,
  generarAlertasPlan,
  getResponsablesDisponibles,
  identificarRequisitosObligatorios,
  loadAllVigencias,
  saveAllVigencias,
  saveVigencia,
} from '../../services/planAnualService';
import {
  agregarRegistroAuditoria,
  construirEstandaresBaseAnio,
  loadSgsstData,
  saveSgsstData,
} from '../../services/planAnualSgsstService';
import { loadStoredRisks, saveStoredRisks } from '../../services/riskMatrixStorage';
import { getStoredCargosSST } from '../../services/organigramaService';
import { getCaracterizacionActual } from '../../services/dynamicRulesEngine';
import { PlanAnualActividadModal } from './PlanAnualActividadModal';
import {
  PlanAnualPanelPrincipal,
  SeccionPlanAnual,
  NavegacionPlanAnualOpciones,
} from './PlanAnualPanelPrincipal';
import { PlanAnualHacerTab } from './PlanAnualHacerTab';
import { PlanAnualVerificarTab, SubTabVerificar } from './PlanAnualVerificarTab';
import { PlanAnualActuarTab } from './PlanAnualActuarTab';
import { PlanAnualObjetivosKpiTab } from './PlanAnualObjetivosKpiTab';
import { PlanAnualCronogramaTab } from './PlanAnualCronogramaTab';
import { PlanAnualResponsablesTab } from './PlanAnualResponsablesTab';
import { PlanAnualPresupuestoTab } from './PlanAnualPresupuestoTab';
import { PlanAnualReportesTab } from './PlanAnualReportesTab';
import { PlanAnualRiesgosNormasTab } from './PlanAnualRiesgosNormasTab';
import { PlanAnualAlertasEvidenciasTab } from './PlanAnualAlertasEvidenciasTab';
import { PlanAnualPlanesMejoraRiesgoTab } from './PlanAnualPlanesMejoraRiesgoTab';
import {
  PlanAnualEmergenciasTab,
  type SubVistaEmergencias,
} from './PlanAnualEmergenciasTab';
import {
  FormatoDocumentoModal,
  MaterialCapacitacionModal,
} from './PlanAnualCajaCalidadEditor';
import {
  loadPlanesMejoraEmergenciasStore,
  savePlanesMejoraEmergenciasStore,
} from '../../services/planMejoraEmergenciasService';
import type {
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
  PlanEmergenciasFrikaz,
  PlanMejoraPorRiesgo,
  PlanesMejoraYEmergenciasStore,
} from '../../types/planAnualMejoraEmergencias';
import type { AssistantNavigationTarget } from '../../types/assistantNavigation';
import {
  ClipboardCheck,
  TrendingUp,
  Wrench,
  CalendarRange,
  CheckCircle2,
  GitPullRequest,
  Building2,
  ArrowRight,
  Lock,
  Unlock,
  ShieldCheck,
  X,
  History,
  Mail,
  LayoutDashboard,
  Target,
  FileCheck2,
  DollarSign,
  BarChart3,
  GanttChart,
  UserCheck,
  Users,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import {
  crearRegistroRevisionGerente,
  esEstadoExclusivoGerente,
  esGerenteAutorizado,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
} from '../../services/gerenteControlService';

interface PlanAnualViewProps {
  normas: NormaPhvaItem[];
  navigationRequest?: AssistantNavigationTarget | null;
}

export const PlanAnualView: React.FC<PlanAnualViewProps> = ({
  normas,
  navigationRequest,
}) => {
  const [vigencias, setVigencias] = useState<Record<number, PlanAnualVigencia>>(() =>
    loadAllVigencias()
  );
  const anioActivo = 2027;

  const [riesgos, setRiesgos] = useState<RiesgoGTC45Item[]>(() => loadStoredRisks());
  const [config, setConfig] = useState(() => getCaracterizacionActual());
  const [cargos] = useState(() => getStoredCargosSST());
  const [sgsstData, setSgsstData] = useState<PlanAnualSgsstData>(() =>
    loadSgsstData(getCaracterizacionActual(), loadStoredRisks())
  );
  const [mejoraEmergenciasStore, setMejoraEmergenciasStore] =
    useState<PlanesMejoraYEmergenciasStore>(() =>
      loadPlanesMejoraEmergenciasStore(loadStoredRisks())
    );
  const [formatoModalId, setFormatoModalId] = useState<string | null>(null);
  const [capacitacionModalState, setCapacitacionModalState] = useState<{
    material: MaterialCapacitacionPlan;
    contexto: string;
    onSave: (nextMat: MaterialCapacitacionPlan) => void;
  } | null>(null);

  // Secciones del apartado independiente PLAN ANUAL (Resumen + secciones operativas)
  const [seccionActiva, setSeccionActiva] = useState<SeccionPlanAnual>('resumen');
  const [subActividades, setSubActividades] = useState<'cronograma' | 'avances' | 'responsables'>('cronograma');
  const [subPresupuesto, setSubPresupuesto] = useState<'recursos' | 'reportes'>('recursos');
  const [subConexiones, setSubConexiones] = useState<'riesgosNormas' | 'personal' | 'puestos' | 'mejoras'>('riesgosNormas');
  const [verificarSubTabReset, setVerificarSubTabReset] = useState<SubTabVerificar>('tablero');
  const [verificarKey, setVerificarKey] = useState(0);
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();

  // Estados de navegación directa desde el Asistente Virtual
  const [navNonce, setNavNonce] = useState<number | undefined>(undefined);
  const [navCronogramaSearch, setNavCronogramaSearch] = useState<string | undefined>(undefined);
  const [navCronogramaEstado, setNavCronogramaEstado] = useState<string | undefined>(undefined);
  const [navPresupuestoSearch, setNavPresupuestoSearch] = useState<string | undefined>(undefined);
  const [navPlanMejoraSearch, setNavPlanMejoraSearch] = useState<string | undefined>(undefined);
  const [navPlanMejoraId, setNavPlanMejoraId] = useState<string | undefined>(undefined);
  const [navEmergenciasSubVista, setNavEmergenciasSubVista] = useState<
    SubVistaEmergencias | undefined
  >(undefined);
  const [navEmergenciasEscenarioId, setNavEmergenciasEscenarioId] = useState<string | undefined>(
    undefined
  );

  // Control de confidencialidad médica individual
  const [accesoMedicoAutorizado, setAccesoMedicoAutorizado] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyRol, setPrivacyRol] = useState('Médico Ocupacional / IPS Autorizada');
  const [privacyPin, setPrivacyPin] = useState('');
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  // Modal unificado de actividad / evidencias / historial
  const [modalOpen, setModalOpen] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadPlanAnual | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'datos' | 'evidencias' | 'historial'>(
    'datos'
  );

  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Preset al enviar un hallazgo de HACER o VERIFICAR directo a ACTUAR
  const [presetAccionActuar, setPresetAccionActuar] = useState<{
    origen: AccionMejoraPlan['origen'];
    tipo: AccionMejoraPlan['tipo'];
    situacionEncontrada: string;
    queSeNecesitaCorregir: string;
    actividadARealizar: string;
    riesgoId?: string;
    actividadPlanId?: string;
    estandarNumero?: number;
    recomendacionId?: string;
  } | null>(null);

  const responsables = useMemo(() => getResponsablesDisponibles(), []);

  const planActivo = useMemo(() => {
    return vigencias[anioActivo] || Object.values(vigencias)[0];
  }, [vigencias, anioActivo]);

  const markSaved = useCallback((ok: boolean) => {
    setSaveFeedback(ok ? 'saved' : 'error');
  }, []);

  const persistSgsst = useCallback(
    (
      updater: (prev: PlanAnualSgsstData) => PlanAnualSgsstData,
      audit?: {
        modulo: 'HACER' | 'VERIFICAR' | 'ACTUAR' | 'PLANEAR' | 'SEGURIDAD_MEDICA';
        accion: string;
        detalle: string;
      }
    ) => {
      setSaveFeedback('saving');
      setSgsstData((prev) => {
        let next = updater(prev);
        if (audit) {
          next = agregarRegistroAuditoria(
            next,
            audit.modulo,
            audit.accion,
            audit.detalle,
            planActivo?.responsableNombre || 'Responsable SG-SST'
          );
        }
        const ok = saveSgsstData(next);
        markSaved(ok);
        return next;
      });
    },
    [markSaved, planActivo?.responsableNombre]
  );

  // Sincronización automática en vivo cuando cambian Riesgos, Normas o Caracterización de la Empresa
  const sincronizarFuentesEnVivo = useCallback(
    (forceToast: boolean = false) => {
      const freshRisks = loadStoredRisks();
      const freshConfig = getCaracterizacionActual();
      setRiesgos(freshRisks);
      setConfig(freshConfig);

      setVigencias((prev) => {
        const current = prev[anioActivo];
        if (!current || current.estadoAprobacion === 'CERRADO') return prev;
        const nuevasSolicitudes = detectarImpactosEnPlan(current, freshRisks, freshConfig, normas);
        if (nuevasSolicitudes.length === 0) {
          if (forceToast) {
            setStatusBanner(
              `Todo está al día (${freshRisks.length} peligros revisados, ${normas.length} normas y ${freshConfig.numeroTrabajadores} trabajadores). No hay cambios pendientes.`
            );
          }
          return prev;
        }
        const actualizado: PlanAnualVigencia = {
          ...current,
          solicitudesRevision: [...nuevasSolicitudes, ...current.solicitudesRevision],
          historialCambios: [
            {
              id: `h-sync-${Date.now()}`,
              fechaHora: new Date().toISOString(),
              usuario: 'Revisión Automática',
              accion: 'Cambios detectados para revisar',
              detalle: `Se detectaron ${nuevasSolicitudes.length} cambio(s) en Peligros, Normas o Datos de la empresa para revisión manual.`,
            },
            ...current.historialCambios,
          ],
        };
        const updatedAll = { ...prev, [current.vigencia]: actualizado };
        saveAllVigencias(updatedAll);
        setStatusBanner(
          `Hay ${nuevasSolicitudes.length} novedad(es) en Peligros o Normas para revisar en PLANEAR sin alterar tareas ya aprobadas.`
        );
        return updatedAll;
      });
    },
    [anioActivo, normas]
  );

  useEffect(() => {
    const handleSync = () => sincronizarFuentesEnVivo(false);
    window.addEventListener('frikaz:risks-updated', handleSync);
    window.addEventListener('frikaz:config-updated', handleSync);
    window.addEventListener('frikaz:norms-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('frikaz:risks-updated', handleSync);
      window.removeEventListener('frikaz:config-updated', handleSync);
      window.removeEventListener('frikaz:norms-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [sincronizarFuentesEnVivo]);

  const requisitosObligatorios = useMemo(
    () => identificarRequisitosObligatorios(config, normas, planActivo),
    [config, normas, planActivo]
  );

  const indicadoresCalculados = useMemo(
    () => calcularIndicadoresPlan(planActivo, riesgos),
    [planActivo, riesgos]
  );

  const alertas = useMemo(() => generarAlertasPlan(planActivo), [planActivo]);

  const estandaresAnioActivo = useMemo(() => {
    return (
      sgsstData.estandaresMinimos[anioActivo] ||
      construirEstandaresBaseAnio(anioActivo, config)
    );
  }, [sgsstData.estandaresMinimos, anioActivo, config]);

  const diagnosticoSaludAnioActivo: DiagnosticoSaludEmpresa = useMemo(() => {
    return (
      sgsstData.diagnosticosSalud[anioActivo] || {
        anio: anioActivo,
        bateriaPsicosocial: {
          fechaAplicacion: '',
          estado: 'PENDIENTE',
          nivelRiesgoIntralaboral: 'Pendiente',
          nivelRiesgoExtralaboral: 'Pendiente',
          nivelEstres: 'Pendiente',
          observacionesGenerales: '',
        },
        analisisFactibilidad: {
          actividadEconomicaCIIU: config.ciiuPrincipal,
          gruposPoblacionalesAnalizados: 'Todos los cargos activos de Frikaz S.A.S.',
          conclusionesFactibilidad: '',
          fechaActualizacion: new Date().toISOString().split('T')[0],
        },
      }
    );
  }, [sgsstData.diagnosticosSalud, anioActivo, config.ciiuPrincipal]);

  // Guardar cambios del Plan Anual (actividades, objetivos, etc.) con control de Gerencia
  const handleUpdatePlan = useCallback(
    (updated: PlanAnualVigencia, logAction?: string) => {
      if (!esGerenteAutorizado()) {
        solicitarAccesoGerente();
        setStatusBanner(
          'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede editar o aprobar el Plan Anual.'
        );
        return;
      }
      const estadoCambio = updated.estadoAprobacion !== planActivo?.estadoAprobacion;

      const planConRevision: PlanAnualVigencia =
        estadoCambio && esEstadoExclusivoGerente(updated.estadoAprobacion)
          ? {
              ...updated,
              aprobadorNombre: nombreGerente,
              revisionGerente:
                updated.revisionGerente ||
                crearRegistroRevisionGerente(
                  normalizarEstadoEstandar(updated.estadoAprobacion) as
                    | 'Aprobado'
                    | 'Cumplido'
                    | 'Devuelto para ajustes',
                  logAction
                ),
            }
          : updated;

      setSaveFeedback('saving');
      const withLog: PlanAnualVigencia = logAction
        ? {
            ...planConRevision,
            historialCambios: [
              {
                id: `h-${Date.now()}`,
                fechaHora: new Date().toISOString(),
                usuario:
                  estadoCambio && esEstadoExclusivoGerente(updated.estadoAprobacion)
                    ? nombreGerente
                    : planConRevision.responsableNombre,
                accion: logAction,
                detalle: `Actualización registrada en vigencia ${planConRevision.vigencia}.`,
              },
              ...planConRevision.historialCambios,
            ],
          }
        : planConRevision;
      const all = saveVigencia(withLog);
      setVigencias(all);
      setSaveFeedback('saved');
    },
    [planActivo?.estadoAprobacion, nombreGerente, solicitarAccesoGerente]
  );

  const abrirActividadEnModal = useCallback(
    (act: ActividadPlanAnual, tab: 'datos' | 'evidencias' | 'historial' = 'datos') => {
      setActividadEditando(act);
      setModalInitialTab(tab);
      setModalOpen(true);
    },
    []
  );

  // =========================================================================
  // HANDLERS PRIVACIDAD MÉDICA INDIVIDUAL
  // =========================================================================
  const handleTogglePrivacidadMedica = () => {
    if (accesoMedicoAutorizado) {
      setAccesoMedicoAutorizado(false);
      persistSgsst((prev) => prev, {
        modulo: 'SEGURIDAD_MEDICA',
        accion: 'Bloqueo de historia médica individual',
        detalle: 'Se cerraron los registros médicos individuales para mantener confidencialidad.',
      });
    } else {
      setPrivacyPin('');
      setPrivacyError(null);
      setShowPrivacyModal(true);
    }
  };

  const handleConfirmarAccesoMedico = (e: React.FormEvent) => {
    e.preventDefault();
    const codigoValido = privacyPin.trim().toUpperCase();
    if (codigoValido !== '' && codigoValido !== 'FRIKAZ-SST' && codigoValido !== 'SST2026') {
      setPrivacyError('Clave incorrecta. Use FRIKAZ-SST o déjelo vacío si ingresa con rol autorizado.');
      return;
    }
    setAccesoMedicoAutorizado(true);
    setShowPrivacyModal(false);
    persistSgsst((prev) => prev, {
      modulo: 'SEGURIDAD_MEDICA',
      accion: 'Acceso médico autorizado activado',
      detalle: `Consulta habilitada para: ${privacyRol}.`,
    });
  };

  // =========================================================================
  // HANDLERS FASE HACER (TRABAJADORES, SALUD, MATRIZ GTC 45)
  // =========================================================================
  const handleSaveTrabajador = (trab: TrabajadorFichaSST) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    persistSgsst(
      (prev) => {
        const existe = prev.trabajadores.some((t) => t.id === trab.id);
        return {
          ...prev,
          trabajadores: existe
            ? prev.trabajadores.map((t) => (t.id === trab.id ? trab : t))
            : [...prev.trabajadores, trab],
        };
      },
      {
        modulo: 'HACER',
        accion: 'Ficha de trabajador guardada',
        detalle: `${trab.nombreCompleto} (${trab.cargoNombre}) actualizado correctamente.`,
      }
    );
    setStatusBanner(`Ficha de ${trab.nombreCompleto} guardada y conectada con su cargo y estándares.`);
  };

  const handleSaveDiagnosticoSalud = (diag: DiagnosticoSaludEmpresa) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    persistSgsst(
      (prev) => ({
        ...prev,
        diagnosticosSalud: {
          ...prev.diagnosticosSalud,
          [diag.anio]: diag,
        },
      }),
      {
        modulo: 'HACER',
        accion: `Diagnóstico de salud ${diag.anio} actualizado`,
        detalle: `Batería psicosocial (${diag.bateriaPsicosocial.estado}) y análisis de factibilidad guardados.`,
      }
    );
  };

  const handleUpdateRiesgoControles = (riesgoActualizado: RiesgoGTC45Item) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    setSaveFeedback('saving');
    const actualizados = riesgos.map((r) =>
      r.id === riesgoActualizado.id ? riesgoActualizado : r
    );
    saveStoredRisks(actualizados);
    setRiesgos(actualizados);
    persistSgsst((prev) => prev, {
      modulo: 'HACER',
      accion: `Controles actualizados en Matriz GTC 45 (${riesgoActualizado.codigo || riesgoActualizado.id})`,
      detalle: 'Se guardaron las medidas sin alterar automáticamente tareas ya aprobadas del Plan Anual.',
    });
    setStatusBanner(
      `Medidas de ${riesgoActualizado.codigo || riesgoActualizado.id} guardadas en la Matriz GTC 45 oficial.`
    );
  };

  const handleEnviarRecomendacionDesdeTrabajador = (trab: TrabajadorFichaSST) => {
    setPresetAccionActuar({
      origen: 'CONDICIONES_SALUD',
      tipo: 'PREVENTIVA',
      situacionEncontrada: `Seguimiento prioritario de salud ocupacional para el puesto ${trab.cargoNombre} (${trab.areaProceso}).`,
      queSeNecesitaCorregir:
        trab.necesidadIntervencion ||
        trab.recomendacionesSaludOcupacional ||
        'Aplicar recomendaciones médicas de puesto de trabajo.',
      actividadARealizar:
        trab.recomendacionesSaludOcupacional ||
        `Implementar controles y seguimiento en el puesto ${trab.cargoNombre}.`,
      estandarNumero: 5,
    });
    setSubConexiones('mejoras');
    setSeccionActiva('conexiones');
  };

  // =========================================================================
  // HANDLERS FASE VERIFICAR (INDICADORES RES 0312, CAPTURA, 7 ESTÁNDARES)
  // =========================================================================
  const handleSaveRegistroPeriodo = (reg: RegistroPeriodoIndicador) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede registrar o validar datos oficiales de indicadores.'
      );
      return;
    }

    const regFinal: RegistroPeriodoIndicador = reg.validado
      ? { ...reg, validadoPor: reg.validadoPor || nombreGerente }
      : { ...reg, validadoPor: undefined };

    persistSgsst(
      (prev) => {
        const existe = prev.registrosPeriodosIndicadores.some((p) => p.id === regFinal.id);
        return {
          ...prev,
          registrosPeriodosIndicadores: existe
            ? prev.registrosPeriodosIndicadores.map((p) => (p.id === regFinal.id ? regFinal : p))
            : [...prev.registrosPeriodosIndicadores, regFinal],
        };
      },
      {
        modulo: 'VERIFICAR',
        accion: `Registro de indicadores guardado: ${regFinal.periodoLabel}`,
        detalle: regFinal.validado
          ? `Datos validados por ${regFinal.validadoPor || nombreGerente}.`
          : 'Datos guardados (Pendiente de revisión por Gerencia).',
      }
    );
  };

  const handleSyncTrabajadoresPeriodos = (anio: number) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const activos = sgsstData.trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO').length;
    const totalTrab = activos > 0 ? activos : config.numeroTrabajadores;
    persistSgsst(
      (prev) => ({
        ...prev,
        registrosPeriodosIndicadores: prev.registrosPeriodosIndicadores.map((p) =>
          p.anio === anio ? { ...p, numeroTrabajadores: totalTrab } : p
        ),
      }),
      {
        modulo: 'VERIFICAR',
        accion: `Sincronización de trabajadores (${anio})`,
        detalle: `Actualizados ${totalTrab} trabajadores activos desde HACER en los periodos de ${anio}.`,
      }
    );
    setStatusBanner(`Se actualizó el número de trabajadores (${totalTrab}) en los periodos de ${anio}.`);
  };

  const handleAddIndicadorCustom = (nuevo: HojaVidaIndicadorSST) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    persistSgsst(
      (prev) => ({
        ...prev,
        hojasVidaIndicadores: [...prev.hojasVidaIndicadores, nuevo],
      }),
      {
        modulo: 'VERIFICAR',
        accion: `Nuevo indicador propio creado: ${nuevo.codigo}`,
        detalle: nuevo.nombre,
      }
    );
  };

  const handleUpdateEstandar = (estandar: EvaluacionEstandarMinimo) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede revisar o actualizar un Estándar Mínimo.'
      );
      return;
    }
    const estadoNorm = normalizarEstadoEstandar(estandar.estadoRevision);

    const estandarFinal: EvaluacionEstandarMinimo = esEstadoExclusivoGerente(estadoNorm)
      ? {
          ...estandar,
          revisadoPor: nombreGerente,
          fechaRevision: estandar.fechaRevision || new Date().toISOString().split('T')[0],
          resultadoRevision: estadoNorm as 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes',
        }
      : {
          ...estandar,
          resultadoRevision: undefined,
        };

    persistSgsst(
      (prev) => {
        const baseAnio =
          prev.estandaresMinimos[anioActivo] || construirEstandaresBaseAnio(anioActivo, config);
        return {
          ...prev,
          estandaresMinimos: {
            ...prev.estandaresMinimos,
            [anioActivo]: baseAnio.map((e) =>
              e.numero === estandarFinal.numero ? estandarFinal : e
            ),
          },
        };
      },
      {
        modulo: 'VERIFICAR',
        accion: `Revisión Estándar #${estandarFinal.numero} (${anioActivo})`,
        detalle: `Estado: ${estadoNorm}. ${estandarFinal.observacionesRevision}`,
      }
    );
  };

  // =========================================================================
  // HANDLERS FASE ACTUAR (RECOMENDACIONES Y ACCIONES DE MEJORA)
  // =========================================================================
  const handleAddRecomendacion = (rec: RecomendacionIntervencion) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    persistSgsst(
      (prev) => ({
        ...prev,
        recomendaciones: [rec, ...prev.recomendaciones],
      }),
      {
        modulo: 'ACTUAR',
        accion: 'Nueva recomendación registrada',
        detalle: rec.esConfidencialMedica
          ? 'Recomendación médica confidencial registrada.'
          : rec.titulo,
      }
    );
  };

  const handleSaveAccion = (accion: AccionMejoraPlan) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede crear, editar o aprobar una acción de mejora.'
      );
      return;
    }
    const previa = sgsstData.accionesMejora.find((a) => a.id === accion.id);
    const estadoNuevoNorm = normalizarEstadoEstandar(accion.estado);
    const cambioEstadoGerente =
      esEstadoExclusivoGerente(estadoNuevoNorm) && previa?.estado !== accion.estado;

    const accionFinal: AccionMejoraPlan = cambioEstadoGerente
      ? {
          ...accion,
          revisionGerente: crearRegistroRevisionGerente(
            estadoNuevoNorm as 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes',
            accion.resultadoSeguimiento
          ),
        }
      : accion;

    persistSgsst(
      (prev) => {
        const existe = prev.accionesMejora.some((a) => a.id === accionFinal.id);
        const accionesNext = existe
          ? prev.accionesMejora.map((a) => (a.id === accionFinal.id ? accionFinal : a))
          : [accionFinal, ...prev.accionesMejora];
        const recsNext = accionFinal.recomendacionId
          ? prev.recomendaciones.map((r) =>
              r.id === accionFinal.recomendacionId
                ? {
                    ...r,
                    estado: 'CONVERTIDA_EN_ACCION' as const,
                    accionMejoraId: accionFinal.id,
                  }
                : r
            )
          : prev.recomendaciones;
        return {
          ...prev,
          accionesMejora: accionesNext,
          recomendaciones: recsNext,
        };
      },
      {
        modulo: 'ACTUAR',
        accion: `Acción de mejora ${accionFinal.codigo} (${estadoNuevoNorm})`,
        detalle: accionFinal.actividadARealizar,
      }
    );
    setStatusBanner(`Acción de mejora ${accionFinal.codigo} guardada (${estadoNuevoNorm}).`);
  };

  // =========================================================================
  // HANDLERS FASE PLANEAR (ACTIVIDADES, RIESGOS I/II, NORMAS, CAMBIOS, VIGENCIA)
  // =========================================================================
  const handleAbrirNuevaActividad = () => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const num = planActivo.actividades.length + 1;
    const defResp = responsables[0] || {
      id: 'cargo-coordinador-vigia-sst',
      nombre: 'Coordinador / Vigía de SST',
      cargo: 'Coordinador / Vigía de SST',
      correo: 'frikaz.fritosnacks@gmail.com',
      area: 'SST',
    };
    const defAprob =
      responsables.find((r) => r.id === 'cargo-gerente-general') || responsables[1] || defResp;

    const mesActual = new Date().getMonth() + 1;
    const mm = String(mesActual).padStart(2, '0');
    setActividadEditando({
      id: `act-${planActivo.vigencia}-${Date.now()}`,
      codigo: `PA-${planActivo.vigencia}-${String(num).padStart(2, '0')}`,
      nombre: '',
      descripcion: '',
      criterioAceptacion: 'Foto, acta o documento firmado y aprobado por el revisor.',
      area: 'SST',
      origen: 'MANUAL',
      objetivoEspecificoId: planActivo.objetivosEspecificos[0]?.id,
      esRecurrente: false,
      periodicidad: 'UNICA',
      fechaInicio: `${planActivo.vigencia}-${mm}-01`,
      fechaLimite: `${planActivo.vigencia}-${mm}-28`,
      programacionMensual: [mesActual],
      responsableId: defResp.id,
      responsableNombre: defResp.nombre,
      responsableCargo: defResp.cargo,
      responsableCorreo: defResp.correo,
      aprobadorId: defAprob.id,
      aprobadorNombre: defAprob.nombre,
      aprobadorCargo: defAprob.cargo,
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      tipoRecurso: 'PENDIENTE_VALORACION',
      recursosNecesarios: '',
      confirmacionRecursos: 'Pendiente de confirmar con Gerencia',
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Acta firmada, foto o certificado de que se realizó.',
      evidencias: [],
      observaciones: '',
      historialRevisiones: [],
    });
    setModalInitialTab('datos');
    setModalOpen(true);
  };

  const handleProgramarRiesgo = (r: RiesgoGTC45Item) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const medidas = extraerMedidasRiesgo(r);
    const num = planActivo.actividades.length + 1;
    const defResp =
      responsables.find((resp) =>
        resp.cargo.toLowerCase().includes((r.cargo || '').toLowerCase().split(' ')[0])
      ) || responsables[0];
    const defAprob =
      responsables.find((resp) => resp.id === 'cargo-coordinador-vigia-sst') || responsables[0];
    const mesActual = new Date().getMonth() + 1;
    const mm = String(mesActual).padStart(2, '0');

    setActividadEditando({
      id: `act-${planActivo.vigencia}-rsk-${Date.now()}`,
      codigo: `PA-${planActivo.vigencia}-${String(num).padStart(2, '0')}`,
      nombre: `Cuidado ante riesgo Nivel ${r.interpretacionNR} (${r.codigo || r.id}): ${r.peligroDescripcion.slice(0, 75)}`,
      descripcion: `Aplicar medidas de prevención y cuidado para "${r.peligroDescripcion}" en el área ${r.proceso} (${r.actividades}).`,
      criterioAceptacion: `Revisar en el puesto de trabajo que se cumplan estas medidas: ${medidas.slice(0, 140)}`,
      area: 'SST',
      origen: 'RIESGO_GTC45',
      riesgoId: r.id,
      riesgoCodigo: r.codigo || r.id,
      riesgoNivelNR: r.interpretacionNR,
      riesgoCargo: r.cargo || r.cargosExpuestos || 'Personal Operativo',
      riesgoProceso: r.proceso,
      riesgoMedidasControl: medidas,
      riesgoSnapshot: crearRiesgoSnapshot(r),
      estandarMinimoNumero: 7,
      objetivoEspecificoId: planActivo.objetivosEspecificos[0]?.id,
      esRecurrente: false,
      periodicidad: 'ANUAL',
      fechaInicio: `${planActivo.vigencia}-${mm}-01`,
      fechaLimite: `${planActivo.vigencia}-${mm}-28`,
      programacionMensual: [mesActual],
      responsableId: defResp.id,
      responsableNombre: defResp.nombre,
      responsableCargo: defResp.cargo,
      responsableCorreo: defResp.correo,
      aprobadorId: defAprob.id,
      aprobadorNombre: defAprob.nombre,
      aprobadorCargo: defAprob.cargo,
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      tipoRecurso: 'PENDIENTE_VALORACION',
      recursosNecesarios: 'Por valorar según controles de la matriz GTC 45',
      confirmacionRecursos: 'Pendiente de valoración y aprobación de Gerencia',
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Acta de entrega de la medida, fotos del puesto y firma de revisión.',
      evidencias: [],
      observaciones: `Creada automáticamente desde la Matriz de Peligros GTC 45 (${r.codigo || r.id}).`,
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: 'Matriz de Peligros GTC 45',
          rol: 'Sistema',
          accion: 'CREADA',
          detalle: `Tarea preparada para riesgo Nivel ${r.interpretacionNR} (${r.cargo || r.proceso}).`,
        },
      ],
    });
    setModalInitialTab('datos');
    setModalOpen(true);
  };

  const handleProgramarTodosRiesgosCriticos = (pendientes: RiesgoGTC45Item[]) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const defAprob =
      responsables.find((resp) => resp.id === 'cargo-coordinador-vigia-sst') || responsables[0];
    const mesActual = new Date().getMonth() + 1;
    const mm = String(mesActual).padStart(2, '0');
    let seq = planActivo.actividades.length + 1;

    const nuevas: ActividadPlanAnual[] = pendientes.map((r) => {
      const medidas = extraerMedidasRiesgo(r);
      const defResp =
        responsables.find((resp) =>
          resp.cargo.toLowerCase().includes((r.cargo || '').toLowerCase().split(' ')[0])
        ) || responsables[0];
      const code = `PA-${planActivo.vigencia}-${String(seq++).padStart(2, '0')}`;
      return {
        id: `act-${planActivo.vigencia}-rsk-${r.id}-${Date.now()}`,
        codigo: code,
        nombre: `Cuidado ante riesgo Nivel ${r.interpretacionNR} (${r.codigo || r.id}): ${r.peligroDescripcion.slice(0, 75)}`,
        descripcion: `Aplicar medidas de cuidado frente a "${r.peligroDescripcion}" (${r.proceso} - ${r.actividades}).`,
        criterioAceptacion: `Revisar que se estén cumpliendo estas medidas: ${medidas.slice(0, 140)}`,
        area: 'SST',
        origen: 'RIESGO_GTC45',
        riesgoId: r.id,
        riesgoCodigo: r.codigo || r.id,
        riesgoNivelNR: r.interpretacionNR,
        riesgoCargo: r.cargo || r.cargosExpuestos || 'Personal Operativo',
        riesgoProceso: r.proceso,
        riesgoMedidasControl: medidas,
        riesgoSnapshot: crearRiesgoSnapshot(r),
        estandarMinimoNumero: 7,
        objetivoEspecificoId: planActivo.objetivosEspecificos[0]?.id,
        esRecurrente: false,
        periodicidad: 'ANUAL',
        fechaInicio: `${planActivo.vigencia}-${mm}-01`,
        fechaLimite: `${planActivo.vigencia}-${mm}-28`,
        programacionMensual: [mesActual],
        responsableId: defResp.id,
        responsableNombre: defResp.nombre,
        responsableCargo: defResp.cargo,
        responsableCorreo: defResp.correo,
        aprobadorId: defAprob.id,
        aprobadorNombre: defAprob.nombre,
        aprobadorCargo: defAprob.cargo,
        presupuestoEstimado: 0,
        presupuestoAprobado: 0,
        gastoEjecutado: 0,
        tipoRecurso: 'PENDIENTE_VALORACION',
        recursosNecesarios: 'Por valorar según controles prioritarios',
        confirmacionRecursos: 'Pendiente de valoración y aprobación de Gerencia',
        estado: 'PENDIENTE',
        evidenciaRequerida: 'Fotos de las protecciones puestas, planilla de entrega de EPP o charla.',
        evidencias: [],
        observaciones: `Agregada desde los riesgos altos (Nivel I y II) de la Matriz GTC 45.`,
        historialRevisiones: [
          {
            id: `hrev-${Date.now()}-${seq}`,
            fecha: new Date().toISOString(),
            usuario: 'Matriz de Peligros GTC 45',
            rol: 'Sistema',
            accion: 'CREADA',
            detalle: `Agregada automáticamente desde un riesgo Nivel ${r.interpretacionNR}.`,
          },
        ],
      };
    });

    handleUpdatePlan(
      { ...planActivo, actividades: [...planActivo.actividades, ...nuevas] },
      `Agregadas ${nuevas.length} tareas para riesgos Nivel I y II`
    );
    setStatusBanner(`Se agregaron ${nuevas.length} tarea(s) al calendario desde los riesgos Nivel I y II.`);
  };

  const construirActividadDesdeRequisito = (
    req: RequisitoObligatorioIdentificado,
    numeroSecuencia: number
  ): ActividadPlanAnual => {
    const resp =
      responsables.find((r) => r.nombre === req.responsableSugerido) || responsables[0];
    const aprob =
      responsables.find((r) => r.nombre === req.aprobadorSugerido) || responsables[0];
    const primerMes = req.mesesSugeridos[0] || 11;
    const mm = String(primerMes).padStart(2, '0');

    return {
      id: `act-${planActivo.vigencia}-norm-${Date.now()}-${numeroSecuencia}`,
      codigo: `PA-${planActivo.vigencia}-${String(numeroSecuencia).padStart(2, '0')}`,
      nombre: req.actividadPropuesta,
      descripcion: `${req.requisitoObligatorio}. Sustento legal: ${req.normaOficial} (${req.articulos}).`,
      criterioAceptacion: `Cumplimiento completo respaldado con: ${req.evidenciaNecesaria}`,
      area: req.area,
      origen: 'NORMA_OBLIGATORIA',
      normaId: req.normaId,
      normaOficial: req.normaOficial,
      normaArticulos: req.articulos,
      requisitoObligatorioId: req.id,
      estandarMinimoNumero: req.requisitoObligatorio.toLowerCase().includes('capacit')
        ? 3
        : req.requisitoObligatorio.toLowerCase().includes('médic')
        ? 5
        : 4,
      objetivoEspecificoId:
        req.area === 'AMBIENTAL'
          ? planActivo.objetivosEspecificos[2]?.id || planActivo.objetivosEspecificos[1]?.id
          : planActivo.objetivosEspecificos[1]?.id || planActivo.objetivosEspecificos[0]?.id,
      esRecurrente: req.frecuenciaRespaldada !== 'UNICA' && req.frecuenciaRespaldada !== 'ANUAL',
      periodicidad: req.frecuenciaRespaldada,
      fechaInicio: `${planActivo.vigencia}-${mm}-01`,
      fechaLimite: `${planActivo.vigencia}-${mm}-28`,
      programacionMensual: req.mesesSugeridos,
      responsableId: resp.id,
      responsableNombre: resp.nombre,
      responsableCargo: resp.cargo,
      responsableCorreo: resp.correo,
      aprobadorId: aprob.id,
      aprobadorNombre: aprob.nombre,
      aprobadorCargo: aprob.cargo,
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      tipoRecurso: 'PENDIENTE_VALORACION',
      recursosNecesarios: 'Por valorar según requisito normativo',
      confirmacionRecursos: 'Pendiente de valoración y aprobación de Gerencia',
      estado: 'PENDIENTE',
      evidenciaRequerida: req.evidenciaNecesaria,
      evidencias: [],
      observaciones: `Obligación generada automáticamente (${req.sustentoFrecuencia}).`,
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}-${numeroSecuencia}`,
          fecha: new Date().toISOString(),
          usuario: 'Motor Normativo Res. 0312',
          rol: 'Sistema',
          accion: 'CREADA',
          detalle: `Incorporada automáticamente desde ${req.normaOficial}.`,
        },
      ],
    };
  };

  const handleIncorporarRequisito = (req: RequisitoObligatorioIdentificado) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const nueva = construirActividadDesdeRequisito(req, planActivo.actividades.length + 1);
    handleUpdatePlan(
      { ...planActivo, actividades: [...planActivo.actividades, nueva] },
      `Obligación normativa incorporada: ${req.normaOficial}`
    );
    setStatusBanner(`Obligación "${req.normaOficial}" incorporada al cronograma como ${nueva.codigo}.`);
  };

  const handleIncorporarTodosRequisitos = (reqsPendientes: RequisitoObligatorioIdentificado[]) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    let seq = planActivo.actividades.length + 1;
    const nuevas = reqsPendientes.map((r) => construirActividadDesdeRequisito(r, seq++));
    handleUpdatePlan(
      { ...planActivo, actividades: [...planActivo.actividades, ...nuevas] },
      `${nuevas.length} obligaciones normativas incorporadas al Plan Anual`
    );
    setStatusBanner(`Se incorporaron ${nuevas.length} obligaciones legales aplicables a Frikaz S.A.S.`);
  };

  const handleResolverSolicitud = (
    sol: SolicitudRevisionPlan,
    decision: 'APROBADA' | 'RECHAZADA'
  ) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede aprobar o descartar propuestas de cambios en el Plan Anual.'
      );
      return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    let actividadesActualizadas = [...planActivo.actividades];
    let snapshotActualizado = planActivo.empresaSnapshot;

    if (decision === 'APROBADA') {
      if (sol.accionSugerida === 'ACTUALIZAR_ALCANCE_0312') {
        snapshotActualizado = construirEmpresaSnapshot(config);
      } else if (
        sol.accionSugerida === 'REVISAR_ACTIVIDAD' &&
        sol.actividadAfectadaId &&
        sol.datosPropuestos
      ) {
        actividadesActualizadas = actividadesActualizadas.map((a) =>
          a.id === sol.actividadAfectadaId
            ? {
                ...a,
                ...sol.datosPropuestos,
                historialRevisiones: [
                  {
                    id: `hrev-${Date.now()}`,
                    fecha: new Date().toISOString(),
                    usuario: planActivo.responsableNombre,
                    rol: 'Revisor',
                    accion: 'ACTUALIZADA',
                    detalle: `Alineada tras aprobación de cambio detectado (${sol.titulo}).`,
                  },
                  ...a.historialRevisiones,
                ],
              }
            : a
        );
      } else if (sol.accionSugerida === 'AGREGAR_ACTIVIDAD' && sol.datosPropuestos) {
        const defResp = responsables[0];
        const defAprob =
          responsables.find((r) => r.id === 'cargo-gerente-general') || responsables[0];
        const mesActual = new Date().getMonth() + 1;
        const mm = String(mesActual).padStart(2, '0');
        const nuevaAct: ActividadPlanAnual = {
          id: `act-${planActivo.vigencia}-sol-${Date.now()}`,
          codigo: `PA-${planActivo.vigencia}-${String(actividadesActualizadas.length + 1).padStart(2, '0')}`,
          nombre: sol.datosPropuestos.nombre || sol.titulo,
          descripcion: sol.datosPropuestos.descripcion || sol.descripcion,
          criterioAceptacion:
            sol.datosPropuestos.criterioAceptacion || 'Cumplimiento y evidencia aprobada.',
          area: sol.datosPropuestos.area || 'SST',
          origen: sol.datosPropuestos.origen || 'MANUAL',
          riesgoId: sol.datosPropuestos.riesgoId,
          riesgoCodigo: sol.datosPropuestos.riesgoCodigo,
          riesgoNivelNR: sol.datosPropuestos.riesgoNivelNR,
          riesgoCargo: sol.datosPropuestos.riesgoCargo,
          riesgoProceso: sol.datosPropuestos.riesgoProceso,
          riesgoMedidasControl: sol.datosPropuestos.riesgoMedidasControl,
          riesgoSnapshot: sol.datosPropuestos.riesgoSnapshot,
          normaId: sol.datosPropuestos.normaId,
          normaOficial: sol.datosPropuestos.normaOficial,
          normaArticulos: sol.datosPropuestos.normaArticulos,
          requisitoObligatorioId: sol.datosPropuestos.requisitoObligatorioId,
          objetivoEspecificoId: planActivo.objetivosEspecificos[0]?.id,
          esRecurrente: sol.datosPropuestos.esRecurrente ?? false,
          periodicidad: sol.datosPropuestos.periodicidad || 'ANUAL',
          fechaInicio: `${planActivo.vigencia}-${mm}-01`,
          fechaLimite: `${planActivo.vigencia}-${mm}-28`,
          programacionMensual: sol.datosPropuestos.programacionMensual || [mesActual],
          responsableId: defResp.id,
          responsableNombre: defResp.nombre,
          responsableCargo: defResp.cargo,
          responsableCorreo: defResp.correo,
          aprobadorId: defAprob.id,
          aprobadorNombre: defAprob.nombre,
          aprobadorCargo: defAprob.cargo,
          presupuestoEstimado: 0,
          presupuestoAprobado: 0,
          gastoEjecutado: 0,
          tipoRecurso: 'PENDIENTE_VALORACION',
          recursosNecesarios: 'Por valorar tras revisión de novedad',
          confirmacionRecursos: 'Pendiente de valoración y aprobación de Gerencia',
          estado: 'PENDIENTE',
          evidenciaRequerida:
            sol.datosPropuestos.evidenciaRequerida || 'Soporte digital de cumplimiento.',
          evidencias: [],
          observaciones: `Incorporada tras revisión de cambio (${sol.fechaDeteccion}).`,
          historialRevisiones: [
            {
              id: `hrev-${Date.now()}`,
              fecha: new Date().toISOString(),
              usuario: planActivo.responsableNombre,
              rol: 'Aprobador de Cambios',
              accion: 'CREADA',
              detalle: `Aprobada desde bandeja de cambios: ${sol.titulo}`,
            },
          ],
        };
        actividadesActualizadas.push(nuevaAct);
      }
    }

    const solicitudesActualizadas = planActivo.solicitudesRevision.map((s) =>
      s.id === sol.id
        ? {
            ...s,
            estado: decision,
            fechaDecision: hoy,
            decididoPor: planActivo.responsableNombre,
          }
        : s
    );

    handleUpdatePlan(
      {
        ...planActivo,
        empresaSnapshot: snapshotActualizado,
        actividades: actividadesActualizadas,
        solicitudesRevision: solicitudesActualizadas,
      },
      `Cambio ${decision === 'APROBADA' ? 'aprobado' : 'descartado'}: ${sol.titulo}`
    );
  };

  const handleSaveActividad = (act: ActividadPlanAnual, motivoCambioFecha?: string) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede crear, editar o aprobar tareas del Plan Anual.'
      );
      return;
    }
    const prevAct = planActivo.actividades.find((a) => a.id === act.id);
    const existe = Boolean(prevAct);

    let actFinal = { ...act };
    let fechaCambiada = false;

    if (prevAct) {
      const cambioInicio = prevAct.fechaInicio !== act.fechaInicio;
      const cambioLimite = prevAct.fechaLimite !== act.fechaLimite;
      const cambioMeses =
        JSON.stringify([...(prevAct.programacionMensual || [])].sort((a, b) => a - b)) !==
        JSON.stringify([...(act.programacionMensual || [])].sort((a, b) => a - b));

      if (cambioInicio || cambioLimite || cambioMeses) {
        fechaCambiada = true;
        const nuevoCambio: CambioFechaActividad = {
          id: `cf-${Date.now()}`,
          fechaRegistro: new Date().toISOString(),
          usuario: nombreGerente,
          fechaInicioAnterior: prevAct.fechaInicio,
          fechaLimiteAnterior: prevAct.fechaLimite,
          fechaInicioNueva: act.fechaInicio,
          fechaLimiteNueva: act.fechaLimite,
          mesesAnteriores: prevAct.programacionMensual,
          mesesNuevos: act.programacionMensual,
          motivo:
            motivoCambioFecha?.trim() ||
            'Ajuste de programación en el cronograma del Plan Anual',
        };
        actFinal = {
          ...actFinal,
          historialCambiosFechas: [nuevoCambio, ...(prevAct.historialCambiosFechas || [])],
          historialRevisiones: [
            {
              id: `hrev-cf-${Date.now()}`,
              fecha: new Date().toISOString(),
              usuario: nombreGerente,
              rol: 'Gerente',
              accion: 'ACTUALIZADA',
              detalle: `Cambio de fechas (${prevAct.fechaInicio}→${prevAct.fechaLimite} a ${act.fechaInicio}→${act.fechaLimite}). Motivo: ${nuevoCambio.motivo}`,
            },
            ...actFinal.historialRevisiones,
          ],
        };
      }
    }

    const updatedActs = existe
      ? planActivo.actividades.map((a) => (a.id === actFinal.id ? actFinal : a))
      : [...planActivo.actividades, actFinal];
    handleUpdatePlan(
      { ...planActivo, actividades: updatedActs },
      existe
        ? fechaCambiada
          ? `Fechas reprogramadas en ${actFinal.codigo}: ${prevAct?.fechaLimite} → ${actFinal.fechaLimite}`
          : `Actividad editada: ${actFinal.codigo}`
        : `Nueva actividad creada: ${actFinal.codigo}`
    );
  };

  const handleAprobarYCerrarActividad = (
    act: ActividadPlanAnual,
    resultadoActividad: string,
    comentarioRevisor: string
  ) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede aprobar los soportes y marcar la actividad como Cumplido.'
      );
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const evidenciasAprobadas = act.evidencias.map((e) =>
      e.estadoRevision === 'PENDIENTE_REVISION' || e.estadoRevision === 'DEVUELTA'
        ? {
            ...e,
            estadoRevision: 'APROBADA' as const,
            revisadoPor: nombreGerente,
            fechaRevision: hoy,
            comentarioRevisor,
            resultadoRevision: 'Aprobado' as const,
          }
        : e
    );

    const actividadCerrada: ActividadPlanAnual = {
      ...act,
      estado: 'CUMPLIDA',
      resultadoActividad,
      fechaCierre: hoy,
      cerradoPor: nombreGerente,
      evidencias: evidenciasAprobadas,
      revisionGerente: crearRegistroRevisionGerente('Cumplido', comentarioRevisor),
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: nombreGerente,
          rol: 'Gerente',
          accion: 'APROBADA_CERRADA',
          detalle: `Aprobado y cerrado como Cumplido por Gerencia. Observaciones: ${comentarioRevisor}`,
        },
        ...act.historialRevisiones,
      ],
    };

    const nuevasActs = planActivo.actividades.map((a) =>
      a.id === act.id ? actividadCerrada : a
    );

    const siguiente = crearSiguienteOcurrencia(actividadCerrada, planActivo.vigencia);
    let msgRec = '';
    if (siguiente) {
      const yaExisteOcurrencia = nuevasActs.some(
        (a) =>
          a.serieRecurrenteId &&
          a.serieRecurrenteId === siguiente.serieRecurrenteId &&
          a.fechaLimite === siguiente.fechaLimite
      );
      if (!yaExisteOcurrencia) {
        nuevasActs.push(siguiente);
        msgRec = ` Además se programó automáticamente la próxima fecha (${siguiente.codigo} para el ${siguiente.fechaLimite}).`;
      }
    }

    handleUpdatePlan(
      { ...planActivo, actividades: nuevasActs },
      `Aprobada y marcada como Cumplido por Gerencia: ${act.codigo}${siguiente ? ' + próxima fecha programada' : ''}`
    );
    setStatusBanner(`Tarea ${act.codigo} aprobada por Gerencia y cerrada como Cumplido.${msgRec}`);
  };

  const handleDevolverEvidencia = (
    act: ActividadPlanAnual,
    evidenciaId: string,
    comentarioRevisor: string
  ) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      setStatusBanner(
        'Solo Andrea Orjuela – Gerente (ingresando con su correo) puede devolver soportes para ajustes con observaciones.'
      );
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const evsActualizadas = act.evidencias.map((e) =>
      e.id === evidenciaId
        ? {
            ...e,
            estadoRevision: 'DEVUELTA' as const,
            revisadoPor: nombreGerente,
            fechaRevision: hoy,
            comentarioRevisor,
            resultadoRevision: 'Devuelto para ajustes' as const,
          }
        : e
    );

    const actividadDevuelta: ActividadPlanAnual = {
      ...act,
      estado: 'DEVUELTA',
      evidencias: evsActualizadas,
      observaciones: `Devuelto para ajustes por ${nombreGerente}: ${comentarioRevisor}`,
      revisionGerente: crearRegistroRevisionGerente('Devuelto para ajustes', comentarioRevisor),
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: nombreGerente,
          rol: 'Gerente',
          accion: 'DEVUELTA',
          detalle: `Devuelto para ajustes por Gerencia: "${comentarioRevisor}". No se borra el historial ni los soportes previos.`,
        },
        ...act.historialRevisiones,
      ],
    };

    handleUpdatePlan(
      {
        ...planActivo,
        actividades: planActivo.actividades.map((a) => (a.id === act.id ? actividadDevuelta : a)),
      },
      `Soporte devuelto para ajustes por Gerencia en ${act.codigo}`
    );
    setStatusBanner(
      `Se devolvió el soporte de ${act.codigo} para ajustes con indicaciones claras para ${act.responsableNombre}.`
    );
  };

  const handleEliminarActividad = (actividadId: string) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const target = planActivo.actividades.find((a) => a.id === actividadId);
    if (!target) return;
    handleUpdatePlan(
      {
        ...planActivo,
        actividades: planActivo.actividades.filter((a) => a.id !== actividadId),
      },
      `Tarea quitada del calendario: ${target.codigo}`
    );
  };

  const handleUpdatePresupuestoGeneral = (monto: number) => {
    if (!esGerenteAutorizado()) {
      solicitarAccesoGerente();
      return;
    }
    const cleanMonto = Math.max(0, Math.round(monto));
    const hoy = new Date().toISOString().split('T')[0];
    handleUpdatePlan(
      {
        ...planActivo,
        presupuestoGeneralAprobado: cleanMonto,
        presupuestoGeneralActualizadoPor: nombreGerente,
        fechaPresupuestoGeneral: hoy,
      },
      `Presupuesto General 2027 actualizado a $${cleanMonto.toLocaleString('es-CO')}`
    );
    persistSgsst((prev) => prev, {
      modulo: 'PLANEAR',
      accion: 'Presupuesto General 2027 actualizado',
      detalle: `Monto general aprobado definido en $${cleanMonto.toLocaleString('es-CO')} por ${nombreGerente}.`,
    });
    setStatusBanner(
      `Presupuesto General 2027 guardado en $${cleanMonto.toLocaleString('es-CO')} y recalculado en el Plan Anual.`
    );
  };

  // Navegación automática desde el Asistente Virtual dentro de PLAN ANUAL 2027
  useEffect(() => {
    if (!navigationRequest || navigationRequest.tab !== 'plan_anual') return;

    if (navigationRequest.planSeccion) {
      setSeccionActiva(navigationRequest.planSeccion);
    }
    if (navigationRequest.subActividades) {
      setSubActividades(navigationRequest.subActividades);
    }
    if (navigationRequest.subIndicadores) {
      setVerificarSubTabReset(navigationRequest.subIndicadores);
      setVerificarKey((k) => k + 1);
    }
    if (navigationRequest.subPresupuesto) {
      setSubPresupuesto(navigationRequest.subPresupuesto);
    }
    if (navigationRequest.subConexiones) {
      setSubConexiones(navigationRequest.subConexiones);
    }

    const nonceVal = navigationRequest.nonce || Date.now();
    setNavNonce(nonceVal);

    if (navigationRequest.planSeccion === 'actividades') {
      setNavCronogramaSearch(navigationRequest.searchQuery || '');
      setNavCronogramaEstado(navigationRequest.cronogramaEstadoFiltro || 'TODOS');
    } else if (navigationRequest.planSeccion === 'presupuesto') {
      setNavPresupuestoSearch(navigationRequest.searchQuery || '');
    } else if (navigationRequest.planSeccion === 'planes_riesgo') {
      setNavPlanMejoraSearch(navigationRequest.searchQuery || '');
      setNavPlanMejoraId(navigationRequest.planMejoraId || undefined);
    } else if (navigationRequest.planSeccion === 'plan_emergencias') {
      setNavEmergenciasSubVista(navigationRequest.subEmergencias);
      setNavEmergenciasEscenarioId(navigationRequest.escenarioEmergenciaId);
    }

    if (navigationRequest.formatoId && mejoraEmergenciasStore.formatos[navigationRequest.formatoId]) {
      setFormatoModalId(navigationRequest.formatoId);
    } else if (navigationRequest.actividadId) {
      const actFound = planActivo.actividades.find((a) => a.id === navigationRequest.actividadId);
      if (actFound) {
        abrirActividadEnModal(actFound, navigationRequest.actividadModalTab || 'datos');
      }
    }
  }, [
    navigationRequest,
    planActivo.actividades,
    mejoraEmergenciasStore.formatos,
    abrirActividadEnModal,
  ]);

  const solicitudesPendientesCount = planActivo.solicitudesRevision.filter(
    (s) => s.estado === 'PENDIENTE'
  ).length;
  const totalActividades = planActivo.actividades.length;
  const cumplidasCount = planActivo.actividades.filter((a) => {
    const est = normalizarEstadoEstandar(a.estado);
    return est === 'Cumplido' || est === 'Aprobado';
  }).length;
  const pctGeneral =
    totalActividades > 0 ? Math.round((cumplidasCount / totalActividades) * 1000) / 10 : 0;
  const trabajadoresActivosCount = sgsstData.trabajadores.filter(
    (t) => t.estadoLaboral === 'ACTIVO'
  ).length;
  const accionesAbiertasCount = sgsstData.accionesMejora.filter((a) => {
    const est = normalizarEstadoEstandar(a.estado);
    return est !== 'Cumplido' && est !== 'Aprobado';
  }).length;

  const estadoPlanBadge = getBadgeClassesEstadoFrikaz(planActivo.estadoAprobacion);
  const riesgosCriticosCount = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  ).length;

  const evidenciasCount = planActivo.actividades.reduce(
    (sum, a) => sum + a.evidencias.length,
    0
  );
  const resumenPresupuesto = useMemo(
    () =>
      calcularResumenPresupuestoPlan(
        planActivo.actividades,
        planActivo.presupuestoGeneralAprobado || 0
      ),
    [planActivo.actividades, planActivo.presupuestoGeneralAprobado]
  );
  const pctPresupuesto = resumenPresupuesto.porcentajeEjecucion;

  // Navegación principal del apartado independiente PLAN ANUAL
  const pestanasPrincipales: Array<{
    id: SeccionPlanAnual;
    label: string;
    badge?: string | number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'resumen',
      label: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      id: 'objetivos',
      label: 'Objetivos',
      badge: planActivo.objetivosEspecificos.length,
      icon: Target,
    },
    {
      id: 'actividades',
      label: 'Actividades',
      badge: totalActividades,
      icon: CalendarRange,
    },
    {
      id: 'evidencias',
      label: 'Evidencias',
      badge: evidenciasCount,
      icon: FileCheck2,
    },
    {
      id: 'indicadores',
      label: 'Indicadores',
      badge: sgsstData.hojasVidaIndicadores.length,
      icon: TrendingUp,
    },
    {
      id: 'presupuesto',
      label: 'Presupuesto',
      badge:
        resumenPresupuesto.ejecutado === 0
          ? '$0 ejec.'
          : `${pctPresupuesto}%`,
      icon: DollarSign,
    },
    {
      id: 'conexiones',
      label: 'Riesgos y personal',
      badge: accionesAbiertasCount > 0 ? `${accionesAbiertasCount} mej.` : trabajadoresActivosCount,
      icon: ShieldCheck,
    },
    {
      id: 'planes_riesgo',
      label: 'Planes mejora riesgo',
      badge: mejoraEmergenciasStore.planesPorRiesgo.length,
      icon: ShieldAlert,
    },
    {
      id: 'plan_emergencias',
      label: 'Plan emergencias',
      badge: mejoraEmergenciasStore.planEmergencias.escenarios.length,
      icon: Flame,
    },
  ];

  const handleSavePlanesMejoraRiesgo = (
    nextPlanes: PlanMejoraPorRiesgo[],
    auditDetail?: string
  ) => {
    setSaveFeedback('saving');
    setMejoraEmergenciasStore((prev) => {
      const next: PlanesMejoraYEmergenciasStore = {
        ...prev,
        planesPorRiesgo: nextPlanes,
      };
      const ok = savePlanesMejoraEmergenciasStore(next);
      markSaved(ok);
      return next;
    });
    if (auditDetail) {
      persistSgsst((prev) => prev, {
        modulo: 'PLANEAR',
        accion: 'Planes de mejora por riesgo',
        detalle: auditDetail,
      });
    }
  };

  const handleSavePlanEmergencias = (
    nextEmergencias: PlanEmergenciasFrikaz,
    auditDetail?: string
  ) => {
    setSaveFeedback('saving');
    setMejoraEmergenciasStore((prev) => {
      const next: PlanesMejoraYEmergenciasStore = {
        ...prev,
        planEmergencias: nextEmergencias,
      };
      const ok = savePlanesMejoraEmergenciasStore(next);
      markSaved(ok);
      return next;
    });
    if (auditDetail) {
      persistSgsst((prev) => prev, {
        modulo: 'PLANEAR',
        accion: 'Plan de emergencias',
        detalle: auditDetail,
      });
    }
  };

  const handleSaveFormatoEditable = (nextFormato: FormatoEditableDocumento) => {
    setSaveFeedback('saving');
    setMejoraEmergenciasStore((prev) => {
      const next: PlanesMejoraYEmergenciasStore = {
        ...prev,
        formatos: {
          ...prev.formatos,
          [nextFormato.id]: nextFormato,
        },
      };
      const ok = savePlanesMejoraEmergenciasStore(next);
      markSaved(ok);
      return next;
    });
  };

  const navegarDesdePanel = (
    seccion: SeccionPlanAnual,
    opciones?: NavegacionPlanAnualOpciones
  ) => {
    if (opciones?.subActividades) {
      setSubActividades(opciones.subActividades);
    }
    if (opciones?.subIndicadores) {
      setVerificarSubTabReset(opciones.subIndicadores);
      setVerificarKey((k) => k + 1);
    }
    if (opciones?.subPresupuesto) {
      setSubPresupuesto(opciones.subPresupuesto);
    }
    if (opciones?.subConexiones) {
      setSubConexiones(opciones.subConexiones);
    }
    setSeccionActiva(seccion);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* ZONA SUPERIOR EXCLUSIVA DEL APARTADO PLAN ANUAL (VERDE PETRÓLEO SUAVE + IDENTIDAD FRIKAZ) */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white/95 shadow-xs overflow-hidden">
        <div className="bg-linear-to-r from-[#eaf5f2] via-[#f4faf8] to-white px-4 sm:px-6 pt-5 pb-4 border-b border-[#d6ebe5]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-black text-[#0f6b61] uppercase tracking-wider text-[10px]">
                  Plan Anual de Trabajo · Año {planActivo.vigencia}
                </span>
                <span className="text-[#9dc2ba]">·</span>
                <span
                  className={`px-2 py-0.5 rounded-md border font-bold text-[10px] inline-flex items-center gap-1 ${estadoPlanBadge.light}`}
                  title={estadoPlanBadge.descripcionCorta}
                >
                  {(estadoPlanBadge.label === 'Aprobado' || estadoPlanBadge.label === 'Cumplido') && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {estadoPlanBadge.label}
                </span>
                <span className="text-[#9dc2ba]">·</span>
                <span className="font-mono tabular-nums font-bold text-[#0d3b36]">
                  {pctGeneral}% aprobado ({cumplidasCount}/{totalActividades})
                </span>
                {saveFeedback !== 'saved' && (
                  <>
                    <span className="text-[#9dc2ba]">·</span>
                    <span
                      className={`font-bold ${
                        saveFeedback === 'saving' ? 'text-amber-700' : 'text-rose-700'
                      }`}
                    >
                      {saveFeedback === 'saving' ? 'Guardando...' : 'Error al guardar'}
                    </span>
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#0d3b36] tracking-tight">
                PLAN ANUAL — SG-SST y Gestión Ambiental
              </h2>
              <p className="text-[11px] text-[#355b56] flex flex-wrap items-center gap-1.5">
                <span>
                  Seguimiento independiente de metas, actividades, responsables, evidencias, indicadores y recursos de{' '}
                  <strong className="text-[#0d3b36] inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-[#f97316]" />
                    Frikaz S.A.S.
                  </strong>
                </span>
                <span>·</span>
                <span className="tabular-nums">
                  {trabajadoresActivosCount || config.numeroTrabajadores} trabajadores
                </span>
                <span>·</span>
                <span>{config.claseRiesgoSST}</span>
              </p>
            </div>

            {/* Controles derechos: Vigencia única 2027, Gerencia, Privacidad Médica y Bitácora */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-[#0f5b53] text-white px-3.5 py-2 rounded-xl shadow-xs">
                <span className="font-mono tabular-nums font-black text-xs">2027</span>
                <span className="text-[10px] font-semibold text-teal-100">
                  Enero – Diciembre 2027
                </span>
              </div>

              <button
                type="button"
                onClick={solicitarAccesoGerente}
                className={`px-3 py-2 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer border whitespace-nowrap ${
                  esGerente
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-white text-[#0d3b36] border-[#b9dad3] hover:bg-[#f4faf8]'
                }`}
              >
                {esGerente ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> : <Mail className="h-3.5 w-3.5 text-[#f97316]" />}
                <span>{esGerente ? nombreGerente : 'Ingresar como Gerente'}</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePrivacidadMedica}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border cursor-pointer whitespace-nowrap ${
                  accesoMedicoAutorizado
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
                title="Proteger o habilitar la consulta individual de diagnósticos y exámenes médicos"
              >
                {accesoMedicoAutorizado ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span>{accesoMedicoAutorizado ? 'Salud Desbloqueada' : 'Privacidad Médica'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-[#c3dfd8] hover:bg-[#f4faf8] text-[#0d3b36] font-bold cursor-pointer"
                title="Ver historial de cambios recientes"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:px-6 space-y-3 bg-white">
          <div className="rounded-xl border border-[#cce3dd] bg-[#f4faf8] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[#0d3b36]">
            <p className="text-[11px]">
              <strong>Vigencia única activa 2027 (Enero – Diciembre 2027):</strong> Todas las actividades, presupuestos, metas e indicadores están organizados para 2027 con presupuesto ejecutado inicial de <strong>$0</strong> (copia histórica anterior resguardada).
            </p>
            <span className="text-[10px] font-mono tabular-nums font-bold text-[#0f6b61]">
              General: ${resumenPresupuesto.presupuestoGeneral.toLocaleString('es-CO')} · Ejecutado: ${resumenPresupuesto.ejecutado.toLocaleString('es-CO')} · Saldo: ${resumenPresupuesto.saldoDisponible.toLocaleString('es-CO')}
            </span>
          </div>

          {/* Banner de novedades detectadas en Matriz / Normas */}
          {solicitudesPendientesCount > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-amber-950">
                <GitPullRequest className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">
                    Hay {solicitudesPendientesCount} novedad(es) en Riesgos, Normas o Trabajadores
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Ningún plan aprobado cambia sin confirmación. Revíselas en «Riesgos y personal → Riesgos y normas».
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navegarDesdePanel('conexiones', { subConexiones: 'riesgosNormas' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 shrink-0 cursor-pointer"
              >
                <span>Revisar novedades</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {statusBanner && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 flex items-center justify-between gap-2 text-emerald-900 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{statusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-[10px] underline text-emerald-700 cursor-pointer"
              >
                Ocultar
              </button>
            </div>
          )}

          {/* BARRA DE SECCIONES DEL PLAN ANUAL (INCLUYE PLANES DE MEJORA POR RIESGO Y PLAN DE EMERGENCIAS) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {pestanasPrincipales.map((tab) => {
              const Icon = tab.icon;
              const active = seccionActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSeccionActiva(tab.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                    active
                      ? 'bg-[#0f5b53] text-white border-[#0f5b53] shadow-xs'
                      : 'bg-[#f4faf8] text-[#173f3a] border-[#cfe5df] hover:bg-[#e5f3ef] hover:border-[#8fc0b5]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? 'text-[#fed7aa]' : 'text-[#0f6b61]'
                      }`}
                    />
                    <span className="font-black text-[11px] tracking-tight truncate">
                      {tab.label}
                    </span>
                  </span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-[10px] font-black shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-[#0d3b36] border border-[#cfe5df]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: RESUMEN VISUAL DEL PLAN ANUAL */}
      {seccionActiva === 'resumen' && (
        <PlanAnualPanelPrincipal
          plan={planActivo}
          alertas={alertas}
          accionesMejora={sgsstData.accionesMejora}
          estandares={estandaresAnioActivo}
          hojasVidaIndicadores={sgsstData.hojasVidaIndicadores}
          trabajadoresActivosCount={trabajadoresActivosCount}
          riesgosCriticosCount={riesgosCriticosCount}
          solicitudesPendientesCount={solicitudesPendientesCount}
          planesMejoraCount={mejoraEmergenciasStore.planesPorRiesgo.length}
          emergenciasEscenariosCount={mejoraEmergenciasStore.planEmergencias.escenarios.length}
          onIrASeccion={navegarDesdePanel}
          onAbrirActividad={abrirActividadEnModal}
        />
      )}

      {/* SECCIÓN 2: OBJETIVOS Y METAS */}
      {seccionActiva === 'objetivos' && (
        <PlanAnualObjetivosKpiTab
          plan={planActivo}
          indicadoresCalculados={indicadoresCalculados}
          hojasVidaIndicadores={sgsstData.hojasVidaIndicadores}
          riesgos={riesgos}
          estandares={estandaresAnioActivo}
          responsables={responsables}
          mode="objetivos"
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* SECCIÓN 3: ACTIVIDADES, AVANCES, RESPONSABLES Y FECHAS */}
      {seccionActiva === 'actividades' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#0d3b36]">
                Actividades Programadas, Avances y Responsables ({planActivo.vigencia})
              </h3>
              <p className="text-[11px] text-slate-500">
                Consulte el cronograma completo, registre avances y evidencias por actividad o revise fechas límite por persona.
              </p>
            </div>
            <div className="inline-flex flex-wrap rounded-xl bg-[#eef6f4] border border-[#cce3dd] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSubActividades('cronograma')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subActividades === 'cronograma'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <GanttChart className="h-3.5 w-3.5" />
                <span>Cronograma ({totalActividades})</span>
              </button>
              <button
                type="button"
                onClick={() => setSubActividades('avances')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subActividades === 'avances'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>Registro de avances</span>
              </button>
              <button
                type="button"
                onClick={() => setSubActividades('responsables')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subActividades === 'responsables'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Responsables y fechas</span>
              </button>
            </div>
          </div>

          {subActividades === 'cronograma' && (
            <PlanAnualCronogramaTab
              plan={planActivo}
              responsables={responsables}
              onNuevaActividad={handleAbrirNuevaActividad}
              onAbrirActividad={abrirActividadEnModal}
              onEliminarActividad={handleEliminarActividad}
              externalSearch={navCronogramaSearch}
              externalEstadoFiltro={navCronogramaEstado}
              navNonce={navNonce}
            />
          )}

          {subActividades === 'avances' && (
            <PlanAnualHacerTab
              key={`hacer-ejec-${anioActivo}`}
              plan={planActivo}
              trabajadores={sgsstData.trabajadores}
              diagnosticoSalud={diagnosticoSaludAnioActivo}
              riesgos={riesgos}
              cargos={cargos}
              accionesMejora={sgsstData.accionesMejora}
              accesoMedicoAutorizado={accesoMedicoAutorizado}
              subTabInicial="ejecucion"
              hideHeaderAndTabs={true}
              onSolicitarDesbloqueoMedico={handleTogglePrivacidadMedica}
              onSaveTrabajador={handleSaveTrabajador}
              onSaveDiagnosticoSalud={handleSaveDiagnosticoSalud}
              onUpdateRiesgoControles={handleUpdateRiesgoControles}
              onAbrirActividad={abrirActividadEnModal}
              onEnviarRecomendacionAActuar={handleEnviarRecomendacionDesdeTrabajador}
            />
          )}

          {subActividades === 'responsables' && (
            <PlanAnualResponsablesTab
              plan={planActivo}
              responsables={responsables}
              onAbrirActividad={abrirActividadEnModal}
            />
          )}
        </div>
      )}

      {/* SECCIÓN 4: EVIDENCIAS Y REVISIÓN DE GERENCIA (SIN DUPLICACIÓN) */}
      {seccionActiva === 'evidencias' && (
        <PlanAnualAlertasEvidenciasTab
          plan={planActivo}
          alertas={alertas}
          responsables={responsables}
          mode="ambos"
          onAbrirActividad={abrirActividadEnModal}
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* SECCIÓN 5: INDICADORES RELACIONADOS Y ESTÁNDARES */}
      {seccionActiva === 'indicadores' && (
        <PlanAnualVerificarTab
          key={`verificar-${anioActivo}-${verificarKey}`}
          plan={planActivo}
          todosLosPlanes={vigencias}
          anioActivo={anioActivo}
          trabajadores={sgsstData.trabajadores}
          riesgos={riesgos}
          config={config}
          hojasVidaIndicadores={sgsstData.hojasVidaIndicadores}
          registrosPeriodosIndicadores={sgsstData.registrosPeriodosIndicadores}
          estandares={estandaresAnioActivo}
          accionesMejora={sgsstData.accionesMejora}
          alertas={alertas}
          responsables={responsables}
          subTabInicial={verificarSubTabReset}
          hideSeguimientoTab={true}
          onUpdatePlan={handleUpdatePlan}
          onSaveRegistroPeriodo={handleSaveRegistroPeriodo}
          onSyncTrabajadoresPeriodos={handleSyncTrabajadoresPeriodos}
          onAddIndicadorCustom={handleAddIndicadorCustom}
          onUpdateEstandar={handleUpdateEstandar}
          onAbrirActividad={abrirActividadEnModal}
          onCrearAccionDesdeVerificar={(preset) => {
            setPresetAccionActuar(preset);
            setSubConexiones('mejoras');
            setSeccionActiva('conexiones');
          }}
        />
      )}

      {/* SECCIÓN 6: PRESUPUESTO, RECURSOS Y REPORTES */}
      {seccionActiva === 'presupuesto' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#0d3b36]">
                Presupuesto, Recursos e Informes ({planActivo.vigencia})
              </h3>
              <p className="text-[11px] text-slate-500">
                Consulte el dinero planeado y ejecutado por actividad y área, o genere reportes en Excel y PDF.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-[#eef6f4] border border-[#cce3dd] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSubPresupuesto('recursos')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subPresupuesto === 'recursos'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Presupuesto y recursos</span>
              </button>
              <button
                type="button"
                onClick={() => setSubPresupuesto('reportes')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subPresupuesto === 'reportes'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Reportes y comparativos</span>
              </button>
            </div>
          </div>

          {subPresupuesto === 'recursos' && (
            <PlanAnualPresupuestoTab
              plan={planActivo}
              onAbrirActividad={abrirActividadEnModal}
              onUpdatePresupuestoGeneral={handleUpdatePresupuestoGeneral}
              externalSearch={navPresupuestoSearch}
              navNonce={navNonce}
            />
          )}

          {subPresupuesto === 'reportes' && (
            <PlanAnualReportesTab
              plan={planActivo}
              indicadoresCalculados={indicadoresCalculados}
              todasLasVigencias={vigencias}
              responsables={responsables}
              hojasVidaIndicadores={sgsstData.hojasVidaIndicadores}
              registrosPeriodosIndicadores={sgsstData.registrosPeriodosIndicadores}
              trabajadores={sgsstData.trabajadores}
              config={config}
              riesgos={riesgos}
              estandares={estandaresAnioActivo}
              accionesMejora={sgsstData.accionesMejora}
              onSeleccionarVigencia={() => {}}
            />
          )}
        </div>
      )}

      {/* SECCIÓN 7: CONEXIONES (RIESGOS Y NORMAS, TRABAJADORES Y SALUD, ACCIONES DE MEJORA) */}
      {seccionActiva === 'conexiones' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#0d3b36]">
                Riesgos, Trabajadores y Acciones de Mejora
              </h3>
              <p className="text-[11px] text-slate-500">
                Conexión directa entre el Plan Anual, la Matriz de Riesgos GTC 45, las normas vigentes, los trabajadores y las acciones de mejora.
              </p>
            </div>
            <div className="inline-flex flex-wrap rounded-xl bg-[#eef6f4] border border-[#cce3dd] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSubConexiones('riesgosNormas')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subConexiones === 'riesgosNormas'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Riesgos y normas</span>
              </button>
              <button
                type="button"
                onClick={() => setSubConexiones('personal')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subConexiones === 'personal'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Trabajadores y salud ({trabajadoresActivosCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSubConexiones('puestos')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subConexiones === 'puestos'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Riesgos por puesto</span>
              </button>
              <button
                type="button"
                onClick={() => setSubConexiones('mejoras')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  subConexiones === 'mejoras'
                    ? 'bg-[#0f5b53] text-white'
                    : 'text-[#1c4b45] hover:bg-white/80'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Acciones de mejora ({accionesAbiertasCount})</span>
              </button>
            </div>
          </div>

          {subConexiones === 'riesgosNormas' && (
            <PlanAnualRiesgosNormasTab
              plan={planActivo}
              riesgos={riesgos}
              config={config}
              requisitos={requisitosObligatorios}
              mode="ambos"
              onProgramarRiesgo={handleProgramarRiesgo}
              onProgramarTodosRiesgosCriticos={handleProgramarTodosRiesgosCriticos}
              onIncorporarRequisito={handleIncorporarRequisito}
              onIncorporarTodosRequisitos={handleIncorporarTodosRequisitos}
              onAbrirActividad={abrirActividadEnModal}
              onResolverSolicitud={handleResolverSolicitud}
              onReescanearFuentes={() => sincronizarFuentesEnVivo(true)}
            />
          )}

          {subConexiones === 'personal' && (
            <PlanAnualHacerTab
              key={`hacer-trab-${anioActivo}`}
              plan={planActivo}
              trabajadores={sgsstData.trabajadores}
              diagnosticoSalud={diagnosticoSaludAnioActivo}
              riesgos={riesgos}
              cargos={cargos}
              accionesMejora={sgsstData.accionesMejora}
              accesoMedicoAutorizado={accesoMedicoAutorizado}
              subTabInicial="trabajadores"
              hideHeaderAndTabs={true}
              onSolicitarDesbloqueoMedico={handleTogglePrivacidadMedica}
              onSaveTrabajador={handleSaveTrabajador}
              onSaveDiagnosticoSalud={handleSaveDiagnosticoSalud}
              onUpdateRiesgoControles={handleUpdateRiesgoControles}
              onAbrirActividad={abrirActividadEnModal}
              onEnviarRecomendacionAActuar={handleEnviarRecomendacionDesdeTrabajador}
            />
          )}

          {subConexiones === 'puestos' && (
            <PlanAnualHacerTab
              key={`hacer-mat-${anioActivo}`}
              plan={planActivo}
              trabajadores={sgsstData.trabajadores}
              diagnosticoSalud={diagnosticoSaludAnioActivo}
              riesgos={riesgos}
              cargos={cargos}
              accionesMejora={sgsstData.accionesMejora}
              accesoMedicoAutorizado={accesoMedicoAutorizado}
              subTabInicial="matriz"
              hideHeaderAndTabs={true}
              onSolicitarDesbloqueoMedico={handleTogglePrivacidadMedica}
              onSaveTrabajador={handleSaveTrabajador}
              onSaveDiagnosticoSalud={handleSaveDiagnosticoSalud}
              onUpdateRiesgoControles={handleUpdateRiesgoControles}
              onAbrirActividad={abrirActividadEnModal}
              onEnviarRecomendacionAActuar={handleEnviarRecomendacionDesdeTrabajador}
            />
          )}

          {subConexiones === 'mejoras' && (
            <PlanAnualActuarTab
              plan={planActivo}
              riesgos={riesgos}
              recomendaciones={sgsstData.recomendaciones}
              accionesMejora={sgsstData.accionesMejora}
              responsables={responsables}
              accesoMedicoAutorizado={accesoMedicoAutorizado}
              onSolicitarDesbloqueoMedico={handleTogglePrivacidadMedica}
              presetAccion={presetAccionActuar}
              onClearPresetAccion={() => setPresetAccionActuar(null)}
              onAddRecomendacion={handleAddRecomendacion}
              onSaveAccion={handleSaveAccion}
            />
          )}
        </div>
      )}

      {/* SECCIÓN 8: PLANES DE MEJORA POR RIESGO (DENTRO DE PLAN ANUAL) */}
      {seccionActiva === 'planes_riesgo' && (
        <PlanAnualPlanesMejoraRiesgoTab
          planes={mejoraEmergenciasStore.planesPorRiesgo}
          riesgos={riesgos}
          formatos={mejoraEmergenciasStore.formatos}
          responsables={responsables}
          actividadesPlan={planActivo.actividades}
          onAbrirActividadPlan={abrirActividadEnModal}
          externalSearch={navPlanMejoraSearch}
          externalSelectPlanId={navPlanMejoraId}
          navNonce={navNonce}
          onSavePlanes={handleSavePlanesMejoraRiesgo}
          onAbrirFormato={(fid) => setFormatoModalId(fid)}
          onAbrirCapacitacion={(material, contexto, onSave) =>
            setCapacitacionModalState({ material, contexto, onSave })
          }
          onIrAPlanEmergencias={() => setSeccionActiva('plan_emergencias')}
        />
      )}

      {/* SECCIÓN 9: PLAN DE EMERGENCIAS (DENTRO DE PLAN ANUAL) */}
      {seccionActiva === 'plan_emergencias' && (
        <PlanAnualEmergenciasTab
          planEmergencias={mejoraEmergenciasStore.planEmergencias}
          formatos={mejoraEmergenciasStore.formatos}
          actividadesPlan={planActivo.actividades}
          onAbrirActividadPlan={abrirActividadEnModal}
          externalSubVista={navEmergenciasSubVista}
          externalEscenarioId={navEmergenciasEscenarioId}
          navNonce={navNonce}
          onSavePlanEmergencias={handleSavePlanEmergencias}
          onAbrirFormato={(fid) => setFormatoModalId(fid)}
          onAbrirCapacitacion={(material, contexto, onSave) =>
            setCapacitacionModalState({ material, contexto, onSave })
          }
        />
      )}

      {/* Modal de Formato Editable con Caja de Calidad y Word */}
      <FormatoDocumentoModal
        formato={
          formatoModalId ? mejoraEmergenciasStore.formatos[formatoModalId] || null : null
        }
        onClose={() => setFormatoModalId(null)}
        onSaveFormato={handleSaveFormatoEditable}
      />

      {/* Modal de Guía Completa de Capacitación, Evaluación y Asistencia */}
      <MaterialCapacitacionModal
        material={capacitacionModalState?.material || null}
        tituloContexto={capacitacionModalState?.contexto}
        onClose={() => setCapacitacionModalState(null)}
        onSaveMaterial={(nextMat) => {
          capacitacionModalState?.onSave(nextMat);
          setCapacitacionModalState((prev) =>
            prev ? { ...prev, material: nextMat } : null
          );
        }}
      />

      {/* Modal unificado de Actividad / Evidencia / Historial */}
      <PlanAnualActividadModal
        isOpen={modalOpen}
        actividad={actividadEditando}
        vigencia={planActivo.vigencia}
        responsables={responsables}
        objetivos={planActivo.objetivosEspecificos}
        initialTab={modalInitialTab}
        presupuestoGeneralAprobado={planActivo.presupuestoGeneralAprobado || 0}
        planActividades={planActivo.actividades}
        onClose={() => {
          setModalOpen(false);
          setActividadEditando(null);
        }}
        onSave={handleSaveActividad}
        onAprobarYCerrar={handleAprobarYCerrarActividad}
        onDevolverEvidencia={handleDevolverEvidencia}
      />

      {/* Modal de Confirmación Autorizada para Información Médica Confidencial */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmarAccesoMedico}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Acceso Protegido a Salud Ocupacional
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Resolución 2346 de 2007 y custodia de historias médicas individuales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-slate-700 leading-relaxed">
              Los diagnósticos, morbilidad sentida, hábitos y resultados individuales de laboratorio o audiometría solo pueden ser consultados por personal autorizado. Toda consulta queda registrada en la bitácora.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Persona o rol que consulta</label>
              <select
                value={privacyRol}
                onChange={(e) => setPrivacyRol(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
              >
                <option value="Médico Ocupacional / IPS Autorizada">
                  Médico Ocupacional / IPS Autorizada
                </option>
                <option value="Coordinador / Vigía de SST (con reserva)">
                  Coordinador / Vigía de SST (bajo reserva médica)
                </option>
                <option value="Auditoría / Autoridad Competente">
                  Auditoría / Autoridad Competente
                </option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Código de autorización SST (opcional si ya inició sesión autorizada: FRIKAZ-SST)
              </label>
              <input
                type="password"
                value={privacyPin}
                onChange={(e) => setPrivacyPin(e.target.value)}
                placeholder="FRIKAZ-SST"
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            {privacyError && (
              <p className="text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 font-bold">
                {privacyError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0f172a] text-[#fed7aa] font-black cursor-pointer"
              >
                Confirmar Acceso Autorizado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Bitácora / Historial de Cambios */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-[#f97316]" />
                <span>Historial de Cambios Recientes en PLAN ANUAL</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {sgsstData.auditoriaCambios.map((aud) => (
                <div
                  key={aud.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[#0f172a]">
                      [{aud.modulo}] {aud.accion}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(aud.fechaHora).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {aud.detalle} · <em className="text-slate-500">{aud.usuario}</em>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
