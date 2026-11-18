import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NormaPhvaItem } from '../../types/phvaEvidence';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import {
  ActividadPlanAnual,
  PlanAnualVigencia,
  RequisitoObligatorioIdentificado,
  SolicitudRevisionPlan,
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
import { loadStoredRisks } from '../../services/riskMatrixStorage';
import { getCaracterizacionActual } from '../../services/dynamicRulesEngine';
import { PlanAnualActividadModal } from './PlanAnualActividadModal';
import { PlanAnualObjetivosKpiTab } from './PlanAnualObjetivosKpiTab';
import { PlanAnualRiesgosNormasTab } from './PlanAnualRiesgosNormasTab';
import { PlanAnualCronogramaTab } from './PlanAnualCronogramaTab';
import { PlanAnualPresupuestoTab } from './PlanAnualPresupuestoTab';
import { PlanAnualResponsablesTab } from './PlanAnualResponsablesTab';
import { PlanAnualAlertasEvidenciasTab } from './PlanAnualAlertasEvidenciasTab';
import { PlanAnualReportesTab } from './PlanAnualReportesTab';
import {
  LayoutDashboard,
  ShieldAlert,
  Scale,
  Target,
  TrendingUp,
  GanttChart,
  DollarSign,
  UserCheck,
  FileCheck2,
  Bell,
  BarChart3,
  Plus,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  Building2,
  ArrowRight,
  Lock,
  Search,
} from 'lucide-react';

interface PlanAnualViewProps {
  normas: NormaPhvaItem[];
}

type PlanTabId =
  | 'resumen'
  | 'riesgos'
  | 'normativa'
  | 'objetivos'
  | 'indicadores'
  | 'cronograma'
  | 'presupuesto'
  | 'responsables'
  | 'evidencias'
  | 'alertas'
  | 'reportes';

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
  const [subTab, setSubTab] = useState<PlanTabId>('resumen');
  const [busquedaRapidaResumen, setBusquedaRapidaResumen] = useState('');

  // Modal unificado de creación / edición / evidencias / historial de actividad
  const [modalOpen, setModalOpen] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadPlanAnual | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'datos' | 'evidencias' | 'historial'>(
    'datos'
  );

  // Creación de nueva vigencia independiente
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [nuevoAnioInput, setNuevoAnioInput] = useState<number>(2027);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const responsables = useMemo(() => getResponsablesDisponibles(), []);

  const planActivo = useMemo(() => {
    return vigencias[anioActivo] || Object.values(vigencias)[0];
  }, [vigencias, anioActivo]);

  const abrirActividadEnModal = useCallback(
    (act: ActividadPlanAnual, tab: 'datos' | 'evidencias' | 'historial' = 'datos') => {
      setActividadEditando(act);
      setModalInitialTab(tab);
      setModalOpen(true);
    },
    []
  );

  // Sincronización automática en vivo cuando cambian Riesgos, Normas o Configuración Dinámica
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
              `Todo está al día (${freshRisks.length} peligros revisados, ${normas.length} normas y ${freshConfig.numeroTrabajadores} trabajadores). No hay cambios nuevos pendientes.`
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
              accion: 'Cambios encontrados para revisar',
              detalle: `Se encontraron ${nuevasSolicitudes.length} cambio(s) en Peligros, Normas o Datos de la empresa para que usted decida si se agregan.`,
            },
            ...current.historialCambios,
          ],
        };
        const updatedAll = { ...prev, [current.vigencia]: actualizado };
        saveAllVigencias(updatedAll);
        setStatusBanner(
          `Hay ${nuevasSolicitudes.length} cambio(s) nuevo(s) en Peligros o Normas para que usted los revise antes de cambiar el Plan ${current.vigencia}.`
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

  const handleUpdatePlan = useCallback(
    (updated: PlanAnualVigencia, logAction?: string) => {
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
    },
    []
  );

  // Abrir modal para nueva actividad vacía
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

  // Programar 1 riesgo GTC 45 abriendo el modal prellenado
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

  // Incorporar masivamente riesgos Nivel I y II pendientes
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
    setStatusBanner(`Se agregaron ${nuevas.length} tarea(s) al calendario desde los riesgos más altos (Nivel I y II).`);
  };

  // Incorporar 1 o varios requisitos obligatorios normativos
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

  // Resolver solicitudes de cambio (Bandeja de Control)
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

  // Guardar actividad desde modal (crea o actualiza)
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

  // Aprobar evidencia y cerrar actividad (más generación automática de recurrencia)
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

  // Devolver evidencia sin borrar historial ni adjuntos
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
    setAnioActivo(nuevoAnioInput);
    setShowNewYearForm(false);
    setStatusBanner(
      `Se creó el plan del año ${nuevoAnioInput}. Los años anteriores (${Object.keys(vigencias).join(', ')}) siguen guardados sin cambios.`
    );
  };

  const solicitudesPendientesCount = planActivo.solicitudesRevision.filter(
    (s) => s.estado === 'PENDIENTE'
  ).length;
  const riesgosCriticosCount = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  ).length;
  const riesgosCriticosSinActividad = riesgos.filter(
    (r) =>
      (r.interpretacionNR === 'I' || r.interpretacionNR === 'II') &&
      !planActivo.actividades.some((a) => a.riesgoId === r.id)
  ).length;
  const reqsAplicablesCount = requisitosObligatorios.filter((r) => r.aplicaEmpresaActual).length;
  const reqsPendientesCount = requisitosObligatorios.filter(
    (r) => r.aplicaEmpresaActual && !r.yaProgramadaEnPlan
  ).length;

  const totalActividades = planActivo.actividades.length;
  const cumplidasCount = planActivo.actividades.filter((a) => a.estado === 'CUMPLIDA').length;
  const vencidasCount = planActivo.actividades.filter((a) => a.estado === 'VENCIDA').length;
  const pendientesCount = totalActividades - cumplidasCount;
  const pctGeneral =
    totalActividades > 0 ? Math.round((cumplidasCount / totalActividades) * 1000) / 10 : 0;

  const presupAsignado = planActivo.actividades.reduce(
    (s, a) => s + (a.presupuestoEstimado || 0),
    0
  );
  const presupEjecutado = planActivo.actividades.reduce(
    (s, a) => s + (a.gastoEjecutado || 0),
    0
  );
  const presupDisponible = presupAsignado - presupEjecutado;
  const evidenciasTotales = planActivo.actividades.reduce((s, a) => s + a.evidencias.length, 0);
  const evidenciasPorAprobar = planActivo.actividades.reduce(
    (s, a) => s + a.evidencias.filter((e) => e.estadoRevision === 'PENDIENTE_REVISION').length,
    0
  );

  const resultadosBusquedaResumen = useMemo(() => {
    const q = busquedaRapidaResumen.trim().toLowerCase();
    if (!q) return [];
    return planActivo.actividades.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q) ||
        a.responsableNombre.toLowerCase().includes(q)
    );
  }, [planActivo.actividades, busquedaRapidaResumen]);

  const menuSecciones: Array<{
    id: PlanTabId;
    numero: number;
    label: string;
    badge?: string | number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'resumen', numero: 1, label: 'Resumen del plan', icon: LayoutDashboard },
    {
      id: 'riesgos',
      numero: 2,
      label: 'Riesgos relacionados',
      badge: `${riesgosCriticosCount - riesgosCriticosSinActividad}/${riesgosCriticosCount}`,
      icon: ShieldAlert,
    },
    {
      id: 'normativa',
      numero: 3,
      label: 'Requisitos normativos',
      badge: reqsPendientesCount > 0 ? `${reqsPendientesCount} pend.` : reqsAplicablesCount,
      icon: Scale,
    },
    {
      id: 'objetivos',
      numero: 4,
      label: 'Objetivos y metas',
      badge: planActivo.objetivosEspecificos.length,
      icon: Target,
    },
    {
      id: 'indicadores',
      numero: 5,
      label: 'Indicadores',
      badge: indicadoresCalculados.length,
      icon: TrendingUp,
    },
    {
      id: 'cronograma',
      numero: 6,
      label: 'Cronograma de actividades',
      badge: totalActividades,
      icon: GanttChart,
    },
    {
      id: 'presupuesto',
      numero: 7,
      label: 'Presupuesto',
      icon: DollarSign,
    },
    {
      id: 'responsables',
      numero: 8,
      label: 'Responsables y seguimiento',
      icon: UserCheck,
    },
    {
      id: 'evidencias',
      numero: 9,
      label: 'Evidencias y aprobaciones',
      badge: evidenciasPorAprobar > 0 ? `${evidenciasPorAprobar} rev.` : evidenciasTotales,
      icon: FileCheck2,
    },
    {
      id: 'alertas',
      numero: 10,
      label: 'Alertas y recordatorios',
      badge: alertas.length,
      icon: Bell,
    },
    {
      id: 'reportes',
      numero: 11,
      label: 'Reportes',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-5 text-xs">
      {/* CABECERA PLAN ANUAL DENTRO DEL CICLO PHVA + SELECTOR DE VIGENCIAS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#0f172a] text-[#fed7aa] font-black text-[10px] uppercase tracking-wider">
                PLAN ANUAL · EN CICLO PHVA (ETAPA PLANEAR)
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
                {pctGeneral}% Cumplido ({cumplidasCount} de {totalActividades} tareas)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#0f172a] tracking-tight">
              {planActivo.titulo}
            </h2>
            <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-[#f97316]" />
                Frikaz S.A.S. ({config.numeroTrabajadores} trabajadores · {config.claseRiesgoSST})
              </span>
              <span>·</span>
              <span>{planActivo.empresaSnapshot.grupoEstandares0312}</span>
              <span>·</span>
              <span>Encargado: {planActivo.responsableNombre}</span>
            </p>
          </div>

          {/* Selector de Vigencias Multianuales */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500">Año:</span>
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
              title="Crear el plan de un año nuevo sin borrar los años anteriores"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Año</span>
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

        {/* Banner de notificación si se detectaron cambios en riesgos/normas/empresa */}
        {solicitudesPendientesCount > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-950">
              <GitPullRequest className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black">
                  Hay {solicitudesPendientesCount} novedad(es) nueva(s) en Peligros, Normas o Número de Trabajadores
                </p>
                <p className="text-[11px] text-amber-800">
                  El plan aprobado no cambia solo sin su permiso. Revíselas en «Requisitos normativos» para decidir si las agrega.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('normativa')}
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

        {/* NAVEGACIÓN DE LAS 11 SUBSECCIONES DEL PLAN ANUAL */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {menuSecciones.map((tab) => {
              const Icon = tab.icon;
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={`px-2.5 py-2 rounded-xl font-bold inline-flex items-center justify-between gap-1.5 text-left transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs ring-1 ring-[#f97316]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50/60 hover:border-orange-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? 'text-[#fed7aa]' : 'text-[#f97316]'
                      }`}
                    />
                    <span className="truncate text-[11px]">
                      {tab.numero}. {tab.label}
                    </span>
                  </span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black shrink-0 ${
                        active
                          ? 'bg-[#f97316] text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
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

      {/* ===================================================================== */}
      {/* 1. RESUMEN DEL PLAN                                                   */}
      {/* ===================================================================== */}
      {subTab === 'resumen' && (
        <div className="space-y-5">
          {/* Buscador rápido de actividades en el resumen */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#0f172a]">
                  Buscar Tareas del Plan Anual {planActivo.vigencia}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Escriba cualquier palabra del nombre o descripción para abrir su ficha completa, fotos de prueba, responsables y presupuesto.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-80">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaRapidaResumen}
                    onChange={(e) => setBusquedaRapidaResumen(e.target.value)}
                    placeholder="Buscar tarea por nombre o palabra..."
                    className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAbrirNuevaActividad}
                  className="px-3 py-1.5 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] shrink-0 cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva</span>
                </button>
              </div>
            </div>

            {busquedaRapidaResumen.trim() && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {resultadosBusquedaResumen.length === 0 ? (
                  <p className="text-slate-500 italic">
                    No hay tareas que coincidan con «{busquedaRapidaResumen}».
                  </p>
                ) : (
                  resultadosBusquedaResumen.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => abrirActividadEnModal(act, 'datos')}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-orange-50/50 hover:border-[#f97316] cursor-pointer transition-all"
                    >
                      <div>
                        <span className="font-mono font-black text-[10px] bg-[#0f172a] text-[#fed7aa] px-1.5 py-0.5 rounded mr-2">
                          {act.codigo}
                        </span>
                        <span className="font-bold text-slate-900">{act.nombre}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Encargado: {act.responsableNombre} · Fecha límite: {act.fechaLimite}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-[10px]">
                        {act.estado.replace('_', ' ')} → Abrir
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Indicadores visuales claros (Cumplimiento, Pendientes, Presupuesto, Riesgos) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Avance General {planActivo.vigencia}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-[#0f172a]">{pctGeneral}%</span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {cumplidasCount} hechas
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${pctGeneral}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {pendientesCount} por hacer · {vencidasCount} vencida(s)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSubTab('riesgos')}
              className="text-left rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs hover:border-rose-400 transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                2. Peligros Altos (Nivel I y II)
              </span>
              <span className="text-2xl font-black font-mono text-rose-950 block mt-1">
                {riesgosCriticosCount - riesgosCriticosSinActividad}/{riesgosCriticosCount}
              </span>
              <span className="text-[11px] text-rose-800">
                {riesgosCriticosSinActividad > 0
                  ? `${riesgosCriticosSinActividad} sin tarea asignada aún`
                  : 'Todos tienen tarea asignada'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('presupuesto')}
              className="text-left rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs hover:border-emerald-400 transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                7. Dinero Disponible
              </span>
              <span className="text-xl font-black font-mono text-emerald-950 block mt-1">
                ${presupDisponible.toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-emerald-800">
                Usado: ${presupEjecutado.toLocaleString('es-CO')} de $
                {presupAsignado.toLocaleString('es-CO')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('alertas')}
              className="text-left rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs hover:border-amber-400 transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                10. Avisos y Pruebas
              </span>
              <span className="text-2xl font-black font-mono text-amber-950 block mt-1">
                {alertas.length}
              </span>
              <span className="text-[11px] text-amber-800">
                {evidenciasPorAprobar} prueba(s) por revisar
              </span>
            </button>
          </div>

          {/* Objetivo General y Resumen de Objetivos Específicos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
                <Target className="h-4 w-4 text-[#f97316]" />
                <span>Propósito Principal y Metas del Año {planActivo.vigencia}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSubTab('objetivos')}
                className="text-[11px] font-bold text-[#f97316] hover:underline cursor-pointer"
              >
                Editar propósitos y metas →
              </button>
            </div>
            <p className="text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
              {planActivo.objetivoGeneral}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {planActivo.objetivosEspecificos.map((obj) => (
                <div
                  key={obj.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-black text-[10px]">
                      {obj.codigo}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{obj.area}</span>
                  </div>
                  <p className="font-bold text-slate-900">{obj.titulo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas prioritarias con acceso directo a la actividad */}
          {alertas.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Tareas Urgentes o Pendientes de Cerrar ({planActivo.vigencia})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setSubTab('alertas')}
                  className="text-[11px] font-bold text-[#f97316] hover:underline cursor-pointer"
                >
                  Ver todos los avisos →
                </button>
              </div>
              <div className="space-y-2">
                {alertas.slice(0, 4).map((al) => {
                  const act = planActivo.actividades.find((a) => a.id === al.actividadId);
                  return (
                    <div
                      key={al.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div>
                        <span className="font-mono font-black text-[10px] text-rose-700 mr-2">
                          [{al.severidad}] {al.actividadCodigo}
                        </span>
                        <span className="font-bold text-slate-900">{al.actividadNombre}</span>
                        <p className="text-[11px] text-slate-600">
                          {al.motivo} · Encargado: <strong>{al.responsableNombre}</strong>
                        </p>
                      </div>
                      {act && (
                        <button
                          type="button"
                          onClick={() => abrirActividadEnModal(act, 'evidencias')}
                          className="px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold text-[11px] hover:bg-slate-800 cursor-pointer"
                        >
                          Abrir Tarea / Subir Prueba
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. RIESGOS RELACIONADOS */}
      {subTab === 'riesgos' && (
        <PlanAnualRiesgosNormasTab
          plan={planActivo}
          riesgos={riesgos}
          config={config}
          requisitos={requisitosObligatorios}
          mode="riesgos"
          onProgramarRiesgo={handleProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={handleProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={handleIncorporarRequisito}
          onIncorporarTodosRequisitos={handleIncorporarTodosRequisitos}
          onAbrirActividad={abrirActividadEnModal}
          onResolverSolicitud={handleResolverSolicitud}
          onReescanearFuentes={() => sincronizarFuentesEnVivo(true)}
        />
      )}

      {/* 3. REQUISITOS NORMATIVOS */}
      {subTab === 'normativa' && (
        <PlanAnualRiesgosNormasTab
          plan={planActivo}
          riesgos={riesgos}
          config={config}
          requisitos={requisitosObligatorios}
          mode="normativa"
          onProgramarRiesgo={handleProgramarRiesgo}
          onProgramarTodosRiesgosCriticos={handleProgramarTodosRiesgosCriticos}
          onIncorporarRequisito={handleIncorporarRequisito}
          onIncorporarTodosRequisitos={handleIncorporarTodosRequisitos}
          onAbrirActividad={abrirActividadEnModal}
          onResolverSolicitud={handleResolverSolicitud}
          onReescanearFuentes={() => sincronizarFuentesEnVivo(true)}
        />
      )}

      {/* 4. OBJETIVOS Y METAS */}
      {subTab === 'objetivos' && (
        <PlanAnualObjetivosKpiTab
          plan={planActivo}
          indicadoresCalculados={indicadoresCalculados}
          responsables={responsables}
          mode="objetivos"
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* 5. INDICADORES (KPI) */}
      {subTab === 'indicadores' && (
        <PlanAnualObjetivosKpiTab
          plan={planActivo}
          indicadoresCalculados={indicadoresCalculados}
          responsables={responsables}
          mode="indicadores"
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* 6. CRONOGRAMA DE ACTIVIDADES */}
      {subTab === 'cronograma' && (
        <PlanAnualCronogramaTab
          plan={planActivo}
          responsables={responsables}
          onNuevaActividad={handleAbrirNuevaActividad}
          onAbrirActividad={abrirActividadEnModal}
          onEliminarActividad={handleEliminarActividad}
        />
      )}

      {/* 7. PRESUPUESTO */}
      {subTab === 'presupuesto' && (
        <PlanAnualPresupuestoTab
          plan={planActivo}
          onAbrirActividad={abrirActividadEnModal}
        />
      )}

      {/* 8. RESPONSABLES Y SEGUIMIENTO */}
      {subTab === 'responsables' && (
        <PlanAnualResponsablesTab
          plan={planActivo}
          responsables={responsables}
          onAbrirActividad={abrirActividadEnModal}
        />
      )}

      {/* 9. EVIDENCIAS Y APROBACIONES */}
      {subTab === 'evidencias' && (
        <PlanAnualAlertasEvidenciasTab
          plan={planActivo}
          alertas={alertas}
          responsables={responsables}
          mode="evidencias"
          onAbrirActividad={abrirActividadEnModal}
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* 10. ALERTAS Y RECORDATORIOS */}
      {subTab === 'alertas' && (
        <PlanAnualAlertasEvidenciasTab
          plan={planActivo}
          alertas={alertas}
          responsables={responsables}
          mode="alertas"
          onAbrirActividad={abrirActividadEnModal}
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* 11. REPORTES */}
      {subTab === 'reportes' && (
        <PlanAnualReportesTab
          plan={planActivo}
          indicadoresCalculados={indicadoresCalculados}
          todasLasVigencias={vigencias}
          responsables={responsables}
          onSeleccionarVigencia={(anio) => {
            setAnioActivo(anio);
            setSubTab('resumen');
          }}
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
    </div>
  );
};
