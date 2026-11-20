import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NormaPhvaItem } from '../../types/phvaEvidence';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
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
  construirEmpresaSnapshot,
  crearNuevaVigencia,
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
  MESES_NOMBRES,
  agregarRegistroAuditoria,
  construirEstandaresBaseAnio,
  loadSgsstData,
  saveSgsstData,
} from '../../services/planAnualSgsstService';
import { loadStoredRisks, saveStoredRisks } from '../../services/riskMatrixStorage';
import { getStoredCargosSST } from '../../services/organigramaService';
import { getCaracterizacionActual } from '../../services/dynamicRulesEngine';
import { PlanAnualActividadModal } from './PlanAnualActividadModal';
import { PlanAnualHacerTab } from './PlanAnualHacerTab';
import { PlanAnualVerificarTab } from './PlanAnualVerificarTab';
import { PlanAnualActuarTab } from './PlanAnualActuarTab';
import { PlanAnualPlanearTab, SubTabPlanear } from './PlanAnualPlanearTab';
import {
  ClipboardCheck,
  TrendingUp,
  Wrench,
  CalendarRange,
  Plus,
  CheckCircle2,
  GitPullRequest,
  Building2,
  ArrowRight,
  Lock,
  Unlock,
  ShieldCheck,
  X,
  History,
} from 'lucide-react';

interface PlanAnualViewProps {
  normas: NormaPhvaItem[];
}

type FasePhvaPlanAnual = 'hacer' | 'verificar' | 'actuar' | 'planear';

export const PlanAnualView: React.FC<PlanAnualViewProps> = ({ normas }) => {
  const [vigencias, setVigencias] = useState<Record<number, PlanAnualVigencia>>(() =>
    loadAllVigencias()
  );
  const [anioActivo, setAnioActivo] = useState<number>(() => {
    const keys = Object.keys(loadAllVigencias())
      .map(Number)
      .sort((a, b) => b - a);
    return keys.includes(2026) ? 2026 : keys[0] || 2026;
  });

  const [riesgos, setRiesgos] = useState<RiesgoGTC45Item[]>(() => loadStoredRisks());
  const [config, setConfig] = useState(() => getCaracterizacionActual());
  const [cargos] = useState(() => getStoredCargosSST());
  const [sgsstData, setSgsstData] = useState<PlanAnualSgsstData>(() =>
    loadSgsstData(getCaracterizacionActual(), loadStoredRisks())
  );

  // Exactamente las 4 pestañas internas solicitadas en orden: HACER, VERIFICAR, ACTUAR, PLANEAR
  const [faseActiva, setFaseActiva] = useState<FasePhvaPlanAnual>('hacer');
  const [planearSubTabReset, setPlanearSubTabReset] = useState<SubTabPlanear>('riesgos');
  const [planearKey, setPlanearKey] = useState(0);

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

  // Nueva vigencia independiente
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [nuevoAnioInput, setNuevoAnioInput] = useState<number>(2027);
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

  // Guardar cambios del Plan Anual (actividades, objetivos, etc.)
  const handleUpdatePlan = useCallback(
    (updated: PlanAnualVigencia, logAction?: string) => {
      setSaveFeedback('saving');
      const withLog: PlanAnualVigencia = logAction
        ? {
            ...updated,
            historialCambios: [
              {
                id: `h-${Date.now()}`,
                fechaHora: new Date().toISOString(),
                usuario: updated.responsableNombre,
                accion: logAction,
                detalle: `Actualización registrada en vigencia ${updated.vigencia}.`,
              },
              ...updated.historialCambios,
            ],
          }
        : updated;
      const all = saveVigencia(withLog);
      setVigencias(all);
      setSaveFeedback('saved');
    },
    []
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
    setFaseActiva('actuar');
  };

  // =========================================================================
  // HANDLERS FASE VERIFICAR (INDICADORES RES 0312, CAPTURA, 7 ESTÁNDARES)
  // =========================================================================
  const handleSaveRegistroPeriodo = (reg: RegistroPeriodoIndicador) => {
    persistSgsst(
      (prev) => {
        const existe = prev.registrosPeriodosIndicadores.some((p) => p.id === reg.id);
        return {
          ...prev,
          registrosPeriodosIndicadores: existe
            ? prev.registrosPeriodosIndicadores.map((p) => (p.id === reg.id ? reg : p))
            : [...prev.registrosPeriodosIndicadores, reg],
        };
      },
      {
        modulo: 'VERIFICAR',
        accion: `Registro de indicadores guardado: ${reg.periodoLabel}`,
        detalle: reg.validado
          ? 'Datos guardados y validados para cálculo automático.'
          : 'Datos guardados (pendiente de validación).',
      }
    );
  };

  const handleSyncTrabajadoresPeriodos = (anio: number) => {
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
    persistSgsst(
      (prev) => {
        const baseAnio =
          prev.estandaresMinimos[anioActivo] || construirEstandaresBaseAnio(anioActivo, config);
        return {
          ...prev,
          estandaresMinimos: {
            ...prev.estandaresMinimos,
            [anioActivo]: baseAnio.map((e) =>
              e.numero === estandar.numero ? estandar : e
            ),
          },
        };
      },
      {
        modulo: 'VERIFICAR',
        accion: `Revisión Estándar #${estandar.numero} (${anioActivo})`,
        detalle: `Estado actualizado a ${estandar.estadoRevision}. ${estandar.observacionesRevision}`,
      }
    );
  };

  // =========================================================================
  // HANDLERS FASE ACTUAR (RECOMENDACIONES Y ACCIONES DE MEJORA)
  // =========================================================================
  const handleAddRecomendacion = (rec: RecomendacionIntervencion) => {
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
    persistSgsst(
      (prev) => {
        const existe = prev.accionesMejora.some((a) => a.id === accion.id);
        const accionesNext = existe
          ? prev.accionesMejora.map((a) => (a.id === accion.id ? accion : a))
          : [accion, ...prev.accionesMejora];
        const recsNext = accion.recomendacionId
          ? prev.recomendaciones.map((r) =>
              r.id === accion.recomendacionId
                ? {
                    ...r,
                    estado: 'CONVERTIDA_EN_ACCION' as const,
                    accionMejoraId: accion.id,
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
        accion: `Acción de mejora ${accion.codigo} (${accion.estado})`,
        detalle: accion.actividadARealizar,
      }
    );
    setStatusBanner(`Acción de mejora ${accion.codigo} guardada (${accion.estado}).`);
  };

  // =========================================================================
  // HANDLERS FASE PLANEAR (ACTIVIDADES, RIESGOS I/II, NORMAS, CAMBIOS, VIGENCIA)
  // =========================================================================
  const handleAbrirNuevaActividad = () => {
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
      gastoEjecutado: 0,
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
      presupuestoEstimado: 800000,
      gastoEjecutado: 0,
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
        presupuestoEstimado: 750000,
        gastoEjecutado: 0,
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
      presupuestoEstimado: 450000,
      gastoEjecutado: 0,
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
    const nueva = construirActividadDesdeRequisito(req, planActivo.actividades.length + 1);
    handleUpdatePlan(
      { ...planActivo, actividades: [...planActivo.actividades, nueva] },
      `Obligación normativa incorporada: ${req.normaOficial}`
    );
    setStatusBanner(`Obligación "${req.normaOficial}" incorporada al cronograma como ${nueva.codigo}.`);
  };

  const handleIncorporarTodosRequisitos = (reqsPendientes: RequisitoObligatorioIdentificado[]) => {
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
          presupuestoEstimado: 500000,
          gastoEjecutado: 0,
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

  const handleSaveActividad = (act: ActividadPlanAnual) => {
    const existe = planActivo.actividades.some((a) => a.id === act.id);
    const updatedActs = existe
      ? planActivo.actividades.map((a) => (a.id === act.id ? act : a))
      : [...planActivo.actividades, act];
    handleUpdatePlan(
      { ...planActivo, actividades: updatedActs },
      existe ? `Actividad editada: ${act.codigo}` : `Nueva actividad creada: ${act.codigo}`
    );
  };

  const handleAprobarYCerrarActividad = (
    act: ActividadPlanAnual,
    resultadoActividad: string,
    comentarioRevisor: string
  ) => {
    const hoy = new Date().toISOString().split('T')[0];
    const evidenciasAprobadas = act.evidencias.map((e) =>
      e.estadoRevision === 'PENDIENTE_REVISION'
        ? {
            ...e,
            estadoRevision: 'APROBADA' as const,
            revisadoPor: act.aprobadorNombre,
            fechaRevision: hoy,
            comentarioRevisor,
          }
        : e
    );

    const actividadCerrada: ActividadPlanAnual = {
      ...act,
      estado: 'CUMPLIDA',
      resultadoActividad,
      fechaCierre: hoy,
      cerradoPor: act.aprobadorNombre,
      evidencias: evidenciasAprobadas,
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: act.aprobadorNombre,
          rol: 'Aprobador',
          accion: 'APROBADA_CERRADA',
          detalle: `Actividad cerrada como CUMPLIDA. Comentario: ${comentarioRevisor}`,
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
      `Aprobada y cerrada ${act.codigo}${siguiente ? ' + próxima fecha programada' : ''}`
    );
    setStatusBanner(`Tarea ${act.codigo} aprobada y cerrada con su soporte.${msgRec}`);
  };

  const handleDevolverEvidencia = (
    act: ActividadPlanAnual,
    evidenciaId: string,
    comentarioRevisor: string
  ) => {
    const hoy = new Date().toISOString().split('T')[0];
    const evsActualizadas = act.evidencias.map((e) =>
      e.id === evidenciaId
        ? {
            ...e,
            estadoRevision: 'DEVUELTA' as const,
            revisadoPor: act.aprobadorNombre,
            fechaRevision: hoy,
            comentarioRevisor,
          }
        : e
    );

    const actividadDevuelta: ActividadPlanAnual = {
      ...act,
      estado: 'EN_PROCESO',
      evidencias: evsActualizadas,
      observaciones: `Devuelta para corregir por ${act.aprobadorNombre}: ${comentarioRevisor}`,
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: act.aprobadorNombre,
          rol: 'Aprobador',
          accion: 'DEVUELTA',
          detalle: `Se pidió corregir o completar el soporte: "${comentarioRevisor}". No se borró lo que ya estaba subido.`,
        },
        ...act.historialRevisiones,
      ],
    };

    handleUpdatePlan(
      {
        ...planActivo,
        actividades: planActivo.actividades.map((a) => (a.id === act.id ? actividadDevuelta : a)),
      },
      `Soporte devuelto para corregir en ${act.codigo}`
    );
    setStatusBanner(
      `Se devolvió el soporte de ${act.codigo} con indicaciones claras para ${act.responsableNombre}.`
    );
  };

  const handleEliminarActividad = (actividadId: string) => {
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

  const handleCrearNuevaVigencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAnioInput || nuevoAnioInput < 2020 || nuevoAnioInput > 2050) return;
    if (vigencias[nuevoAnioInput]) {
      setAnioActivo(nuevoAnioInput);
      setShowNewYearForm(false);
      return;
    }
    const all = crearNuevaVigencia(nuevoAnioInput, anioActivo);
    setVigencias(all);

    // Crear también periodos vacíos reales + estándares para el nuevo año en sgsstData
    persistSgsst(
      (prev) => {
        const yaTienePeriodos = prev.registrosPeriodosIndicadores.some(
          (r) => r.anio === nuevoAnioInput
        );
        const activosCount = prev.trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO').length;
        const nuevosPeriodos: RegistroPeriodoIndicador[] = yaTienePeriodos
          ? []
          : [
              ...Array.from({ length: 12 }, (_, idx) => ({
                id: `per-${nuevoAnioInput}-${String(idx + 1).padStart(2, '0')}`,
                anio: nuevoAnioInput,
                mes: idx + 1,
                periodoLabel: `${MESES_NOMBRES[idx]} ${nuevoAnioInput}`,
                numeroTrabajadores: activosCount || config.numeroTrabajadores,
                accidentesTrabajo: null,
                accidentesMortales: null,
                diasIncapacidadAT: null,
                diasCargadosAT: null,
                casosNuevosEL: null,
                casosAntiguosEL: null,
                diasAusenciaIncapacidadMedica: null,
                diasTrabajoProgramados: null,
                validado: false,
                fechaActualizacion: new Date().toISOString().split('T')[0],
              })),
              {
                id: `per-${nuevoAnioInput}-00`,
                anio: nuevoAnioInput,
                mes: 0,
                periodoLabel: `Consolidado Anual ${nuevoAnioInput}`,
                numeroTrabajadores: activosCount || config.numeroTrabajadores,
                accidentesTrabajo: null,
                accidentesMortales: null,
                diasIncapacidadAT: null,
                diasCargadosAT: null,
                casosNuevosEL: null,
                casosAntiguosEL: null,
                diasAusenciaIncapacidadMedica: null,
                diasTrabajoProgramados: null,
                validado: false,
                fechaActualizacion: new Date().toISOString().split('T')[0],
              },
            ];

        return {
          ...prev,
          registrosPeriodosIndicadores: [
            ...prev.registrosPeriodosIndicadores,
            ...nuevosPeriodos,
          ],
          estandaresMinimos: {
            ...prev.estandaresMinimos,
            [nuevoAnioInput]:
              prev.estandaresMinimos[nuevoAnioInput] ||
              construirEstandaresBaseAnio(nuevoAnioInput, config),
          },
        };
      },
      {
        modulo: 'PLANEAR',
        accion: `Año ${nuevoAnioInput} creado`,
        detalle: `Vigencia independiente ${nuevoAnioInput} creada conservando historial anterior.`,
      }
    );

    setAnioActivo(nuevoAnioInput);
    setShowNewYearForm(false);
    setStatusBanner(
      `Se creó el plan del año ${nuevoAnioInput}. Los años anteriores (${Object.keys(vigencias).join(', ')}) siguen guardados sin cambios.`
    );
  };

  const solicitudesPendientesCount = planActivo.solicitudesRevision.filter(
    (s) => s.estado === 'PENDIENTE'
  ).length;
  const totalActividades = planActivo.actividades.length;
  const cumplidasCount = planActivo.actividades.filter((a) => a.estado === 'CUMPLIDA').length;
  const pctGeneral =
    totalActividades > 0 ? Math.round((cumplidasCount / totalActividades) * 1000) / 10 : 0;
  const trabajadoresActivosCount = sgsstData.trabajadores.filter(
    (t) => t.estadoLaboral === 'ACTIVO'
  ).length;
  const accionesAbiertasCount = sgsstData.accionesMejora.filter(
    (a) => a.estado !== 'CUMPLIDA'
  ).length;

  const pestanasPrincipales: Array<{
    id: FasePhvaPlanAnual;
    numero: number;
    label: string;
    subtitulo: string;
    badge: string | number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'hacer',
      numero: 1,
      label: '1. HACER',
      subtitulo: 'Trabajadores, Salud, Riesgos y Ejecución',
      badge: `${trabajadoresActivosCount} trab.`,
      icon: ClipboardCheck,
    },
    {
      id: 'verificar',
      numero: 2,
      label: '2. VERIFICAR',
      subtitulo: '6 Indicadores Res. 0312, Riesgos y 7 Estándares',
      badge: `${sgsstData.hojasVidaIndicadores.length} ind.`,
      icon: TrendingUp,
    },
    {
      id: 'actuar',
      numero: 3,
      label: '3. ACTUAR',
      subtitulo: 'Recomendaciones y Acciones de Mejora',
      badge: `${accionesAbiertasCount} ab.`,
      icon: Wrench,
    },
    {
      id: 'planear',
      numero: 4,
      label: '4. PLANEAR',
      subtitulo: 'Riesgos I/II, Normas, Objetivos, Cronograma y Reportes',
      badge: `${totalActividades} tar.`,
      icon: CalendarRange,
    },
  ];

  return (
    <div className="space-y-5 text-xs">
      {/* CABECERA PRINCIPAL PLAN ANUAL (SIN CAMBIAR EL NOMBRE DEL APARTADO) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#0f172a] text-[#fed7aa] font-black text-[10px] uppercase tracking-wider">
                PLAN ANUAL · SG-SST INTEGRADO
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-black text-[10px] inline-flex items-center gap-1 ${
                  planActivo.estadoAprobacion === 'APROBADO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : planActivo.estadoAprobacion === 'CERRADO'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {planActivo.estadoAprobacion === 'APROBADO' && <Lock className="h-3 w-3" />}
                Estado: {planActivo.estadoAprobacion}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 font-black text-[10px] font-mono">
                {pctGeneral}% Cumplido ({cumplidasCount}/{totalActividades} tareas)
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  saveFeedback === 'saving'
                    ? 'bg-amber-100 text-amber-900'
                    : saveFeedback === 'error'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {saveFeedback === 'saving'
                  ? 'Guardando cambios...'
                  : saveFeedback === 'error'
                  ? 'Error al guardar en el navegador'
                  : 'Cambios guardados'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-[#0f172a] tracking-tight">
              PLAN ANUAL — {planActivo.titulo}
            </h2>
            <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-[#f97316]" />
                Frikaz S.A.S. ({trabajadoresActivosCount || config.numeroTrabajadores} trabajadores ·{' '}
                {config.claseRiesgoSST})
              </span>
              <span>·</span>
              <span>{planActivo.empresaSnapshot.grupoEstandares0312}</span>
              <span>·</span>
              <span>Encargado: {planActivo.responsableNombre}</span>
            </p>
          </div>

          {/* Controles derechos: Año, Privacidad Médica y Bitácora */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {Object.keys(vigencias)
                .map(Number)
                .sort((a, b) => a - b)
                .map((anio) => (
                  <button
                    key={anio}
                    type="button"
                    onClick={() => setAnioActivo(anio)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-black text-xs cursor-pointer transition-colors ${
                      anioActivo === anio
                        ? 'bg-[#0f172a] text-[#fed7aa] shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {anio}
                  </button>
                ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const maxYear = Math.max(...Object.keys(vigencias).map(Number), 2026);
                setNuevoAnioInput(maxYear + 1);
                setShowNewYearForm(!showNewYearForm);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Año</span>
            </button>

            <button
              type="button"
              onClick={handleTogglePrivacidadMedica}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border cursor-pointer ${
                accesoMedicoAutorizado
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
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
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              title="Ver historial de cambios recientes"
            >
              <History className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Formulario inline para crear nueva vigencia */}
        {showNewYearForm && (
          <form
            onSubmit={handleCrearNuevaVigencia}
            className="rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="text-[11px] text-orange-950">
              <strong>Crear plan de un año nuevo:</strong> Los años anteriores (
              {Object.keys(vigencias).join(', ')}) siguen guardados completos para poder consultarlos y compararlos.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2020}
                max={2050}
                value={nuevoAnioInput}
                onChange={(e) => setNuevoAnioInput(Number(e.target.value))}
                className="w-24 rounded-lg border border-orange-300 px-2.5 py-1.5 text-xs font-mono font-bold bg-white"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#0f172a] text-white font-black hover:bg-slate-800 cursor-pointer"
              >
                Crear Año {nuevoAnioInput}
              </button>
            </div>
          </form>
        )}

        {/* Banner de novedades detectadas en Matriz / Normas */}
        {solicitudesPendientesCount > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-950">
              <GitPullRequest className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black">
                  Hay {solicitudesPendientesCount} novedad(es) en Peligros, Normas o Trabajadores
                </p>
                <p className="text-[11px] text-amber-800">
                  Ningún plan ya aprobado cambia solo sin su permiso. Revíselas en «4. PLANEAR → B. Normas» para decidir si las incorpora.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlanearSubTabReset('normativa');
                setPlanearKey((k) => k + 1);
                setFaseActiva('planear');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 shrink-0 cursor-pointer"
            >
              <span>Revisar Novedades</span>
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

        {/* LAS CUATRO PESTAÑAS INTERNAS EN EL ORDEN EXACTO: 1. HACER, 2. VERIFICAR, 3. ACTUAR, 4. PLANEAR */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {pestanasPrincipales.map((tab) => {
              const Icon = tab.icon;
              const active = faseActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFaseActiva(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    active
                      ? 'bg-[#0f172a] text-white border-[#0f172a] ring-2 ring-[#f97316]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-orange-50/70 hover:border-orange-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-[#fed7aa]' : 'text-[#f97316]'
                        }`}
                      />
                      <span className="font-black text-xs sm:text-sm tracking-tight">
                        {tab.label}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] mt-0.5 truncate ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {tab.subtitulo}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-black shrink-0 ${
                      active
                        ? 'bg-[#f97316] text-white'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENIDO DE LA PESTAÑA ACTIVA (SOLO MONTA LA FASE EN USO PARA MÁXIMA FLUIDEZ) */}
      {faseActiva === 'hacer' && (
        <PlanAnualHacerTab
          plan={planActivo}
          trabajadores={sgsstData.trabajadores}
          diagnosticoSalud={diagnosticoSaludAnioActivo}
          riesgos={riesgos}
          cargos={cargos}
          accionesMejora={sgsstData.accionesMejora}
          accesoMedicoAutorizado={accesoMedicoAutorizado}
          onSolicitarDesbloqueoMedico={handleTogglePrivacidadMedica}
          onSaveTrabajador={handleSaveTrabajador}
          onSaveDiagnosticoSalud={handleSaveDiagnosticoSalud}
          onUpdateRiesgoControles={handleUpdateRiesgoControles}
          onAbrirActividad={abrirActividadEnModal}
          onEnviarRecomendacionAActuar={handleEnviarRecomendacionDesdeTrabajador}
        />
      )}

      {faseActiva === 'verificar' && (
        <PlanAnualVerificarTab
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
          onSaveRegistroPeriodo={handleSaveRegistroPeriodo}
          onSyncTrabajadoresPeriodos={handleSyncTrabajadoresPeriodos}
          onAddIndicadorCustom={handleAddIndicadorCustom}
          onUpdateEstandar={handleUpdateEstandar}
          onAbrirActividad={abrirActividadEnModal}
          onCrearAccionDesdeVerificar={(preset) => {
            setPresetAccionActuar(preset);
            setFaseActiva('actuar');
          }}
        />
      )}

      {faseActiva === 'actuar' && (
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

      {faseActiva === 'planear' && (
        <PlanAnualPlanearTab
          key={`planear-${anioActivo}-${planearKey}`}
          plan={planActivo}
          todasLasVigencias={vigencias}
          riesgos={riesgos}
          config={config}
          requisitosObligatorios={requisitosObligatorios}
          indicadoresCalculados={indicadoresCalculados}
          hojasVidaIndicadores={sgsstData.hojasVidaIndicadores}
          registrosPeriodosIndicadores={sgsstData.registrosPeriodosIndicadores}
          trabajadores={sgsstData.trabajadores}
          estandares={estandaresAnioActivo}
          accionesMejora={sgsstData.accionesMejora}
          alertas={alertas}
          responsables={responsables}
          subTabInicial={planearSubTabReset}
          onUpdatePlan={handleUpdatePlan}
          onSeleccionarVigencia={(anio) => setAnioActivo(anio)}
          onNuevaActividad={handleAbrirNuevaActividad}
          onAbrirActividad={abrirActividadEnModal}
          onEliminarActividad={handleEliminarActividad}
          onProgramarRiesgo={handleProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={handleProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={handleIncorporarRequisito}
          onIncorporarTodosRequisitos={handleIncorporarTodosRequisitos}
          onResolverSolicitud={handleResolverSolicitud}
          onReescanearFuentes={() => sincronizarFuentesEnVivo(true)}
          onIrAActuar={() => setFaseActiva('actuar')}
        />
      )}

      {/* Modal unificado de Actividad / Evidencia / Historial */}
      <PlanAnualActividadModal
        isOpen={modalOpen}
        actividad={actividadEditando}
        vigencia={planActivo.vigencia}
        responsables={responsables}
        objetivos={planActivo.objetivosEspecificos}
        initialTab={modalInitialTab}
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
