import ExcelJS from 'exceljs';
import {
  ActividadPlanAnual,
  AlertaPlanAnual,
  EmpresaSnapshotPlan,
  EvidenciaActividad,
  IndicadorCalculado,
  IndicadorGestionPlan,
  ObjetivoEspecificoPlan,
  PeriodicidadActividad,
  PlanAnualVigencia,
  RequisitoObligatorioIdentificado,
  ResponsablePlanOption,
  RiesgoSnapshotVinculado,
  SolicitudRevisionPlan,
} from '../types/planAnual';
import { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';
import { NormaPhvaItem } from '../types/phvaEvidence';
import { CaracterizacionEmpresaDinamica } from '../types/dynamicConfig';
import { getStoredCargosSST } from './organigramaService';
import { getStoredTrabajadores } from './misionFrikazService';
import { loadStoredRisks } from './riskMatrixStorage';
import { getCaracterizacionActual } from './dynamicRulesEngine';
import { getPhvaNorms } from './phvaService';
import { NOMBRE_GERENTE_OFICIAL, normalizarEstadoEstandar } from './gerenteControlService';

const STORAGE_KEY_PLANES = 'frikaz_plan_anual_vigencias_v1';
const STORAGE_KEY_PLANES_HISTORICO_BACKUP = 'frikaz_plan_anual_historico_backup_v1';
const PLAIN_LANG_FLAG_PLAN = 'frikaz_plan_anual_plain_lang_v1';
const GERENTE_GATE_FLAG_PLAN = 'frikaz_plan_gerente_gate_v1';
const REORG_2027_FLAG_PLAN = 'frikaz_plan_anual_2027_reorg_v1';
const ONLY_2027_FLAG_PLAN = 'frikaz_plan_anual_only_2027_v1';

// ============================================================================
// UTILIDADES DE PRESUPUESTO DIFERENCIADO
// ============================================================================

export function formatPresupuestoProgramadoLabel(act: ActividadPlanAnual): string {
  const est = act.presupuestoEstimado || 0;
  if (est > 0) {
    return `$${est.toLocaleString('es-CO')}`;
  }
  if (act.tipoRecurso === 'RECURSOS_EXISTENTES') {
    return 'Recursos existentes (por confirmar)';
  }
  return 'Pendiente de valoración';
}

export interface ResumenPresupuestoPlan {
  presupuestoGeneral: number;
  programado: number;
  aprobado: number;
  ejecutado: number;
  saldoDisponible: number;
  saldoDisponibleGeneral: number;
  saldoPorDistribuir: number;
  porcentajeEjecucion: number;
  superaPresupuestoGeneral: boolean;
  ejecucionSuperaGeneral: boolean;
  pendientesValoracionCount: number;
  recursosExistentesCount: number;
  conValorProgramadoCount: number;
}

export function calcularResumenPresupuestoPlan(
  actividades: ActividadPlanAnual[],
  presupuestoGeneralAprobado: number = 0
): ResumenPresupuestoPlan {
  let programado = 0;
  let aprobado = 0;
  let ejecutado = 0;
  let pendientesValoracionCount = 0;
  let recursosExistentesCount = 0;
  let conValorProgramadoCount = 0;

  // Deduplicación estricta por ID para evitar doble conteo entre actividades conectadas
  const idsContados = new Set<string>();
  actividades.forEach((a) => {
    if (idsContados.has(a.id)) return;
    idsContados.add(a.id);

    const est = a.presupuestoEstimado || 0;
    const apr = a.presupuestoAprobado || 0;
    const eje = a.gastoEjecutado || 0;
    programado += est;
    aprobado += apr;
    ejecutado += eje;

    if (est > 0) {
      conValorProgramadoCount += 1;
    } else if (a.tipoRecurso === 'RECURSOS_EXISTENTES') {
      recursosExistentesCount += 1;
    } else {
      pendientesValoracionCount += 1;
    }
  });

  const presupuestoGeneral = Math.max(0, presupuestoGeneralAprobado || 0);
  const saldoDisponibleGeneral = presupuestoGeneral - ejecutado;
  const saldoDisponible =
    presupuestoGeneral > 0
      ? Math.max(0, presupuestoGeneral - ejecutado)
      : Math.max(0, aprobado - ejecutado);
  const saldoPorDistribuir = presupuestoGeneral - aprobado;

  const baseCalculo =
    presupuestoGeneral > 0 ? presupuestoGeneral : aprobado > 0 ? aprobado : programado;
  const porcentajeEjecucion =
    baseCalculo > 0 ? Math.round((ejecutado / baseCalculo) * 1000) / 10 : 0;

  const superaPresupuestoGeneral = presupuestoGeneral > 0 && aprobado > presupuestoGeneral;
  const ejecucionSuperaGeneral = presupuestoGeneral > 0 && ejecutado > presupuestoGeneral;

  return {
    presupuestoGeneral,
    programado,
    aprobado,
    ejecutado,
    saldoDisponible,
    saldoDisponibleGeneral,
    saldoPorDistribuir,
    porcentajeEjecucion,
    superaPresupuestoGeneral,
    ejecucionSuperaGeneral,
    pendientesValoracionCount,
    recursosExistentesCount,
    conValorProgramadoCount,
  };
}

// ============================================================================
// UTILIDADES DE RESPONSABLES Y EMPRESA
// ============================================================================

export function getResponsablesDisponibles(): ResponsablePlanOption[] {
  const cargos = getStoredCargosSST();
  const trabajadores = getStoredTrabajadores();

  const lista: ResponsablePlanOption[] = [];

  cargos.forEach((c) => {
    const trab = trabajadores.find(
      (t) =>
        t.cargoId === c.id ||
        t.cargoNombre.toLowerCase().includes(c.nombre.toLowerCase().split(' ')[0])
    );
    lista.push({
      id: c.id,
      nombre:
        c.id === 'cargo-gerente-general'
          ? 'Gerente General (Representante Legal)'
          : c.id === 'cargo-coordinador-vigia-sst'
          ? 'Coordinador / Vigía de SST'
          : c.nombre,
      cargo: c.nombre,
      correo: trab?.correo || 'frikaz.fritosnacks@gmail.com',
      area: c.areaProceso,
      esAprobador:
        c.nivelJerarquico === 'ALTA_DIRECCION' || c.nivelJerarquico === 'RESPONSABLE_SST',
    });
  });

  // Asegurar opción de Líder Ambiental
  if (!lista.some((l) => l.id === 'rol-lider-ambiental')) {
    lista.push({
      id: 'rol-lider-ambiental',
      nombre: 'Líder de Gestión Ambiental',
      cargo: 'Encargado Ambiental / Jefe de Planta',
      correo: 'frikaz.fritosnacks@gmail.com',
      area: 'Cuidado del ambiente, aceite usado (ACU) y trampa de grasas',
      esAprobador: true,
    });
  }

  return lista;
}

export function determinarGrupoEstandares0312(config: CaracterizacionEmpresaDinamica): {
  grupo: EmpresaSnapshotPlan['grupoEstandares0312'];
  cantidadEstandares: 7 | 21 | 60;
  organoParticipacion: string;
  miembrosConvivencia: string;
} {
  const n = config.numeroTrabajadores;
  const esRiesgoAlto =
    config.claseRiesgoSST.includes('Clase IV') || config.claseRiesgoSST.includes('Clase V');

  let grupo: EmpresaSnapshotPlan['grupoEstandares0312'] = '7 Estándares (Capítulo I)';
  let cantidadEstandares: 7 | 21 | 60 = 7;

  if (esRiesgoAlto || n > 50) {
    grupo = '60 Estándares (Capítulo III)';
    cantidadEstandares = 60;
  } else if (n >= 11 && n <= 50) {
    grupo = '21 Estándares (Capítulo II)';
    cantidadEstandares = 21;
  }

  const organoParticipacion =
    n >= 10
      ? 'COPASST (Comité de seguridad entre empresa y trabajadores - Res. 2013/1986, 10 o más personas)'
      : 'Vigía de SST (trabajador elegido para cuidar la seguridad - Res. 2013/1986, menos de 10 personas)';

  const miembrosConvivencia =
    n > 10
      ? '4 integrantes (2 de la empresa y 2 de los trabajadores - Res. 1356/2012)'
      : '2 integrantes (1 de la empresa y 1 de los trabajadores - Res. 1356/2012)';

  return { grupo, cantidadEstandares, organoParticipacion, miembrosConvivencia };
}

export function construirEmpresaSnapshot(
  config: CaracterizacionEmpresaDinamica
): EmpresaSnapshotPlan {
  const { grupo } = determinarGrupoEstandares0312(config);
  return {
    numeroTrabajadores: config.numeroTrabajadores,
    claseRiesgoSST: config.claseRiesgoSST,
    grupoEstandares0312: grupo,
    actividadEconomica: config.actividadEconomicaConcreta,
    ciiu: config.ciiuPrincipal,
  };
}

export function extraerMedidasRiesgo(r: RiesgoGTC45Item): string {
  const partes: string[] = [];
  const esValido = (v?: string) =>
    v &&
    v.trim().length > 0 &&
    !v.toLowerCase().includes('sin información registrada') &&
    !v.toLowerCase().includes('no es viable técnicamente');

  if (esValido(r.medidaEliminacion)) partes.push(`Quitar el peligro: ${r.medidaEliminacion}`);
  if (esValido(r.medidaSustitucion)) partes.push(`Cambiar por algo más seguro: ${r.medidaSustitucion}`);
  if (esValido(r.medidaControlesIngenieria))
    partes.push(`Ajuste en máquina o lugar: ${r.medidaControlesIngenieria}`);
  if (esValido(r.medidaControlesAdministrativos))
    partes.push(`Reglas, horarios y capacitación: ${r.medidaControlesAdministrativos}`);
  if (esValido(r.medidaEquiposEPP)) partes.push(`EPP (elementos de protección): ${r.medidaEquiposEPP}`);

  return partes.length > 0 ? partes.join(' | ') : 'Definir qué medidas de protección se van a aplicar';
}

export function crearRiesgoSnapshot(r: RiesgoGTC45Item): RiesgoSnapshotVinculado {
  return {
    nivelRiesgo: r.nivelRiesgo,
    interpretacionNR: r.interpretacionNR,
    peligroDescripcion: r.peligroDescripcion,
    medidasResumen: extraerMedidasRiesgo(r),
    cargo: r.cargo || r.cargosExpuestos || 'Personal Operativo',
    proceso: r.proceso,
  };
}

// ============================================================================
// MOTOR DE IDENTIFICACIÓN AUTOMÁTICA DE REQUISITOS OBLIGATORIOS (RES. 0312 / NORMAS)
// ============================================================================

export function identificarRequisitosObligatorios(
  config: CaracterizacionEmpresaDinamica,
  normas: NormaPhvaItem[],
  planActual?: PlanAnualVigencia
): RequisitoObligatorioIdentificado[] {
  const vigencia = planActual?.vigencia || new Date().getFullYear();
  const { grupo, cantidadEstandares, organoParticipacion, miembrosConvivencia } =
    determinarGrupoEstandares0312(config);

  const yaProgramada = (reqId: string, normaKeywords: string[]) => {
    if (!planActual) return { existe: false, actId: undefined };
    const found = planActual.actividades.find(
      (a) =>
        a.requisitoObligatorioId === reqId ||
        (a.normaOficial &&
          normaKeywords.some((k) => a.normaOficial!.toLowerCase().includes(k.toLowerCase())))
    );
    return { existe: Boolean(found), actId: found?.id };
  };

  const buscarNorma = (keywords: string[]): NormaPhvaItem | undefined =>
    normas.find((n) =>
      keywords.some(
        (k) =>
          n.normaOficial.toLowerCase().includes(k.toLowerCase()) ||
          n.tituloSituacion.toLowerCase().includes(k.toLowerCase())
      )
    );

  const requisitos: RequisitoObligatorioIdentificado[] = [];

  // 1. Resolución 0312 de 2019 — Revisión anual de Estándares Mínimos
  {
    const norm = buscarNorma(['0312']);
    const reqId = `REQ-0312-${cantidadEstandares}`;
    const link = yaProgramada(reqId, ['0312']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id,
      normaOficial: 'Resolución 0312 de 2019',
      articulos:
        cantidadEstandares === 7
          ? 'Art. 3 (Capítulo I - 7 Estándares)'
          : cantidadEstandares === 21
          ? 'Art. 9 (Capítulo II - 21 Estándares)'
          : 'Art. 16 (Capítulo III - 60 Estándares)',
      area: 'SST',
      requisitoObligatorio: `Revisar cada año si la empresa cumple los ${cantidadEstandares} puntos básicos de seguridad y salud (Estándares Mínimos del SG-SST) y enviar el resultado a la ARL (aseguradora de riesgos) y al Ministerio del Trabajo.`,
      actividadPropuesta: `Revisar y calificar los ${cantidadEstandares} Estándares Mínimos (${grupo}) y hacer el plan de mejoras para lo que falte.`,
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Resolución 0312 de 2019 Art. 27 y 28 (se hace una vez al año, en diciembre).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: `Lista de los ${cantidadEstandares} puntos calificada y firmada, más el comprobante de envío a la ARL.`,
      periodoCumplimiento: `Diciembre ${vigencia}`,
      mesesSugeridos: [12],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: `Frikaz tiene ${config.numeroTrabajadores} trabajadores en ${config.claseRiesgoSST}, por eso le corresponde cumplir ${grupo}.`,
      grupo0312Relacionado: grupo,
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 2. Decreto 1072/2015 Art. 2.2.4.6.15 — Actualización Matriz GTC 45
  {
    const norm = buscarNorma(['2.2.4.6.15', 'diagnóstico y clasificación de riesgo - sst']);
    const reqId = 'REQ-1072-MATRIZ-RIESGOS';
    const link = yaProgramada(reqId, ['2.2.4.6.15']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'plan-01',
      normaOficial: 'Decreto 1072 de 2015',
      articulos: 'Art. 2.2.4.6.15',
      area: 'SST',
      requisitoObligatorio: 'Revisar cada año (o cuando haya un accidente o cambio de máquina) la lista de peligros y riesgos de cada puesto de trabajo (Matriz GTC 45).',
      actividadPropuesta: 'Revisar con el equipo la Matriz de Peligros GTC 45 para actualizar qué puede causar daño en cada área y cómo prevenirlo.',
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Decreto 1072 de 2015 Art. 2.2.4.6.15 Parágrafo 1 (mínimo 1 vez al año).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Matriz de peligros actualizada, lista de asistencia de trabajadores que participaron y acta de entrega.',
      periodoCumplimiento: `Febrero ${vigencia}`,
      mesesSugeridos: [2],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: 'Obligatorio para toda empresa en Colombia (cubre fritura, pelado, empaque y entregas).',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 3. Decreto 1072/2015 Art. 2.2.4.6.5-7 — Revisión Anual de Política y Objetivos SST
  {
    const norm = buscarNorma(['2.2.4.6.5', 'política y objetivos']);
    const reqId = 'REQ-1072-POLITICA';
    const link = yaProgramada(reqId, ['2.2.4.6.5', 'política']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'plan-03',
      normaOficial: 'Decreto 1072 de 2015',
      articulos: 'Art. 2.2.4.6.5 al 2.2.4.6.7',
      area: 'INTEGRAL',
      requisitoObligatorio: 'Revisar, firmar con fecha actualizada y explicar a todo el personal la Política de Seguridad, Salud en el Trabajo (SST) y Cuidado Ambiental.',
      actividadPropuesta: 'Revisar cada año con Gerencia la Política de Seguridad y Ambiente, firmarla y compartirla en palabras claras con todo el equipo.',
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Decreto 1072 de 2015 Art. 2.2.4.6.7 (se revisa mínimo 1 vez al año).',
      responsableSugerido: NOMBRE_GERENTE_OFICIAL,
      aprobadorSugerido: 'Coordinador / Vigía de SST',
      evidenciaNecesaria: 'Documento de la Política firmado y fechado, más firmas o registro de que todos los trabajadores la leyeron.',
      periodoCumplimiento: `Enero ${vigencia}`,
      mesesSugeridos: [1],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: `Aplica a los ${config.numeroTrabajadores} trabajadores de la planta (${config.actividadEconomicaConcreta.slice(0, 45)}...).`,
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 4. Participación SST: COPASST (>=10 trab) o Vigía SST (<10 trab) - Res. 2013/1986
  {
    const norm = buscarNorma(['2013', 'vigía', 'copasst']);
    const esCopasst = config.numeroTrabajadores >= 10;
    const reqId = esCopasst ? 'REQ-2013-COPASST' : 'REQ-2013-VIGIA';
    const link = yaProgramada(reqId, ['2013', 'copasst', 'vigía']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'hacer-05',
      normaOficial: 'Resolución 2013 de 1986 / Decreto 1072 de 2015',
      articulos: 'Res. 2013/1986 Art. 1 y 7 | Dec. 1072/2015 Art. 2.2.4.6.2',
      area: 'SST',
      requisitoObligatorio: esCopasst
        ? 'Reuniones de cada mes del COPASST (comité de seguridad entre empresa y trabajadores) y recorridos de revisión en la planta.'
        : 'Revisiones de cada mes del Vigía de SST (compañero encargado de seguridad) para detectar condiciones inseguras.',
      actividadPropuesta: esCopasst
        ? 'Reunión mensual del COPASST y recorrido de revisión por las zonas de freidoras, corte, empaque y bodega.'
        : 'Recorrido mensual de revisión del Vigía de SST en la planta y reporte de cosas por mejorar.',
      frecuenciaRespaldada: 'MENSUAL',
      sustentoFrecuencia: 'Resolución 2013 de 1986 Art. 7 (debe reunirse o hacer seguimiento mínimo una vez al mes).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: esCopasst
        ? 'Acta de reunión mensual del COPASST firmada y lista de revisión de la planta.'
        : 'Informe mensual firmado por el Vigía de SST con lo revisado en la planta.',
      periodoCumplimiento: `Cada mes (Ene-Dic ${vigencia})`,
      mesesSugeridos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: `Por tener ${config.numeroTrabajadores} trabajadores aplica: ${organoParticipacion}.`,
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 5. Comité de Convivencia Laboral - Res. 652/2012 y 1356/2012
  {
    const norm = buscarNorma(['652', '1356', 'convivencia']);
    const reqId = 'REQ-652-CONVIVENCIA';
    const link = yaProgramada(reqId, ['652', 'convivencia']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id,
      normaOficial: 'Resolución 652 de 2012 / Resolución 1356 de 2012',
      articulos: 'Res. 1356/2012 Art. 3 (modifica Art. 9 Res. 652/2012)',
      area: 'SST',
      requisitoObligatorio: `Reuniones cada 3 meses del Comité de Convivencia Laboral para cuidar el buen trato y prevenir el acoso en el trabajo (${miembrosConvivencia}).`,
      actividadPropuesta: `Hacer la reunión cada 3 meses del Comité de Convivencia Laboral (${miembrosConvivencia}) para escuchar inquietudes y promover el respeto.`,
      frecuenciaRespaldada: 'TRIMESTRAL',
      sustentoFrecuencia: 'Resolución 1356 de 2012 Art. 3 (reunión obligatoria cada 3 meses).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Acta privada de la reunión cada 3 meses firmada por los integrantes del Comité.',
      periodoCumplimiento: `Cada 3 meses (Q1-Q4 ${vigencia})`,
      mesesSugeridos: [3, 6, 9, 12],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: `Obligatorio para Frikaz S.A.S. (${config.numeroTrabajadores} trabajadores -> ${miembrosConvivencia}).`,
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 6. Resolución 2674 de 2013 y Res. 1843 de 2025 — Exámenes médicos y Manipulación de Alimentos
  {
    const esAlimentos =
      config.sectorEconomico === 'secundario' &&
      (config.ciiuPrincipal.includes('1089') ||
        config.actividadEconomicaConcreta.toLowerCase().includes('snack') ||
        config.actividadEconomicaConcreta.toLowerCase().includes('alimento'));

    const norm = buscarNorma(['2674', '1843', 'exámenes médicos']);
    const reqId = 'REQ-2674-1843-MEDICOS';
    const link = yaProgramada(reqId, ['2674', '1843', 'médic', 'manipulación']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'hacer-02',
      normaOficial: 'Resolución 2674 de 2013 / Resolución 1843 de 2025',
      articulos: 'Res. 2674/2013 Art. 11 y 12 | Res. 1843/2025 (Evaluaciones médicas)',
      area: 'INTEGRAL',
      requisitoObligatorio: 'Exámenes médicos del trabajo cada año y curso actualizado de higiene y manipulación de alimentos (10 horas).',
      actividadPropuesta: 'Jornada anual de exámenes médicos periódicos, pruebas de laboratorio (frotis/KOH) y renovación del carné de manipulación de alimentos (BPM) de 10 horas.',
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Resolución 2674 de 2013 Art. 11 (chequeo médico mínimo 1 vez al año) y Res. 1843/2025.',
      responsableSugerido: NOMBRE_GERENTE_OFICIAL,
      aprobadorSugerido: 'Coordinador / Vigía de SST',
      evidenciaNecesaria: 'Certificados médicos de aptitud para el trabajo y carnés al día de manipulación de alimentos.',
      periodoCumplimiento: `Marzo ${vigencia}`,
      mesesSugeridos: [3],
      aplicaEmpresaActual: esAlimentos,
      motivoAplicabilidad: esAlimentos
        ? `Frikaz elabora alimentos (CIIU 1089) con ${config.numeroTrabajadores} trabajadores que tocan y empacan snacks.`
        : 'No aplica como planta de alimentos según la configuración actual.',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 7. Resolución 316 de 2018 — Gestión de Aceite de Cocina Usado (ACU)
  {
    const generaAcu =
      config.maquinariaEquipos.some((m) => m.toLowerCase().includes('freidora')) ||
      config.aspectosAmbientales.some(
        (a) => a.toLowerCase().includes('acu') || a.toLowerCase().includes('aceite')
      );
    const norm = buscarNorma(['316', 'acu', 'aceite de cocina']);
    const reqId = 'REQ-316-ACU-MENSUAL';
    const link = yaProgramada(reqId, ['316', 'acu', 'aceite']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id,
      normaOficial: 'Resolución 316 de 2018 (MADS / SDA Bogotá)',
      articulos: 'Artículos 6, 7 y 8 (Generadores comerciales e industriales)',
      area: 'AMBIENTAL',
      requisitoObligatorio: 'Guardar de forma segura el Aceite de Cocina Usado (ACU), pesarlo y entregarlo cada mes a una empresa recolectora autorizada por la Secretaría de Ambiente (SDA), nunca al desagüe.',
      actividadPropuesta: 'Envasar el aceite frío (< 40 °C), pesarlo y entregarlo (180 a 250 litros/mes) al gestor autorizado SDA con recibo firmado.',
      frecuenciaRespaldada: 'MENSUAL',
      sustentoFrecuencia: 'Resolución 316 de 2018 Art. 6 y registro SDA Bogotá (almacenamiento seguro y entrega periódica).',
      responsableSugerido: 'Líder de Gestión Ambiental',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Recibos o certificados mensuales entregados por el recolector autorizado con los litros o kilos entregados.',
      periodoCumplimiento: `Cada mes (Ene-Dic ${vigencia})`,
      mesesSugeridos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      aplicaEmpresaActual: generaAcu,
      motivoAplicabilidad: generaAcu
        ? 'Las freidoras de la planta generan entre 180 y 250 litros de aceite usado cada mes.'
        : 'No se han registrado freidoras ni aceite usado en la configuración actual.',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 8. Resolución 0631 de 2015 — Mantenimiento Trampa de Grasas y Vertimientos
  {
    const tieneTrampa = config.sedesInstalaciones.trampaGrasasOperativa;
    const norm = buscarNorma(['0631', 'vertimientos', 'trampa']);
    const reqId = 'REQ-0631-TRAMPA-GRASAS';
    const link = yaProgramada(reqId, ['0631', 'trampa', 'vertimientos']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id,
      normaOficial: 'Resolución 0631 de 2015',
      articulos: 'Capítulo VI (Parámetros Grasas y Aceites - Elaboración de alimentos)',
      area: 'AMBIENTAL',
      requisitoObligatorio: 'Limpiar cada mes la trampa de grasas para que no pasen aceites ni restos al alcantarillado del Acueducto (EAAB).',
      actividadPropuesta: 'Limpieza mensual de la trampa de grasas, retiro de natas a bolsa sellada y anotación en la planilla de control ambiental.',
      frecuenciaRespaldada: 'MENSUAL',
      sustentoFrecuencia: 'Resolución 0631 de 2015 y programa mensual para evitar taponamientos y contaminación del agua.',
      responsableSugerido: 'Líder de Gestión Ambiental',
      aprobadorSugerido: 'Coordinador / Vigía de SST',
      evidenciaNecesaria: 'Planilla de limpieza de trampa de grasas firmada y comprobante de entrega de las grasas retiradas.',
      periodoCumplimiento: `Cada mes (Ene-Dic ${vigencia})`,
      mesesSugeridos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      aplicaEmpresaActual: tieneTrampa,
      motivoAplicabilidad: tieneTrampa
        ? 'La planta de Bosa cuenta con trampa de grasas conectada antes de salir al alcantarillado.'
        : 'La trampa de grasas figura sin operar (necesita arreglo urgente).',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 9. NTC 2885 / NFPA 10 / Decreto 1072 Art. 2.2.4.6.25 — Plan de Emergencias y Extintores Clase K
  {
    const tieneFreidoras = config.maquinariaEquipos.some((m) =>
      m.toLowerCase().includes('freidora')
    );
    const norm = buscarNorma(['2885', '2.2.4.6.25', 'emergencia']);
    const reqId = 'REQ-NTC2885-EMERGENCIAS';
    const link = yaProgramada(reqId, ['2885', 'clase k', 'emergencia', 'simulacro']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id,
      normaOficial: 'NTC 2885 / NFPA 10 / Decreto 1072 de 2015',
      articulos: 'NTC 2885 Num. 5.5 | Dec. 1072/2015 Art. 2.2.4.6.25',
      area: 'SST',
      requisitoObligatorio: 'Recargar cada año el extintor Clase K (especial para aceite de freidora) y hacer mínimo un simulacro anual de evacuación con todo el personal.',
      actividadPropuesta: 'Recarga anual certificada de extintores Clase K y práctica de simulacro de incendio por aceite o fuga de gas con todo el equipo.',
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Decreto 1072 de 2015 Art. 2.2.4.6.25 Num. 10 (mínimo 1 simulacro al año) y NTC 2885 (revisión y recarga anual).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Etiqueta y certificado de recarga del extintor Clase K al día, guion, fotos y lista de asistencia del simulacro.',
      periodoCumplimiento: `Octubre ${vigencia}`,
      mesesSugeridos: [10],
      aplicaEmpresaActual: tieneFreidoras || true,
      motivoAplicabilidad: tieneFreidoras
        ? 'Las freidoras a más de 160 °C exigen tener extintor Clase K a menos de 9 metros y practicar emergencias cada año.'
        : 'Simulacro de emergencias obligatorio una vez al año según el Decreto 1072/2015.',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 10. Decreto 1072/2015 Art. 2.2.4.6.29-31 — Auditoría Interna y Revisión por Alta Dirección
  {
    const norm = buscarNorma(['2.2.4.6.29', '2.2.4.6.30', '2.2.4.6.31', 'auditoría']);
    const reqId = 'REQ-1072-AUDITORIA-DIRECCION';
    const link = yaProgramada(reqId, ['2.2.4.6.29', '2.2.4.6.30', '2.2.4.6.31', 'auditoría']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'veri-09',
      normaOficial: 'Decreto 1072 de 2015',
      articulos: 'Art. 2.2.4.6.29, 2.2.4.6.30 y 2.2.4.6.31',
      area: 'INTEGRAL',
      requisitoObligatorio: 'Revisar una vez al año si todo el sistema de seguridad (SG-SST) está funcionando bien (auditoría interna) y presentar los resultados a la Gerencia.',
      actividadPropuesta: 'Hacer la revisión anual de cumplimiento (auditoría interna) y entregar el informe de resultados a la Gerencia para corregir lo necesario.',
      frecuenciaRespaldada: 'ANUAL',
      sustentoFrecuencia: 'Decreto 1072 de 2015 Art. 2.2.4.6.29 y 2.2.4.6.31 (obligatorio mínimo 1 vez al año).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Informe de la revisión anual (auditoría) y acta firmada por la Gerencia con los compromisos de mejora.',
      periodoCumplimiento: `Noviembre ${vigencia}`,
      mesesSugeridos: [11],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: 'Exigencia anual obligatoria para evaluar lo logrado y planear el siguiente año en Frikaz S.A.S.',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 11. Resolución 909/2008 y Res. 0627/2006 / Ley 2450/2025 — Mantenimiento Campana Extractora y Control Acústico
  {
    const tieneCampana = config.sedesInstalaciones.campanaExtractoraFiltros;
    const norm = buscarNorma(['909', '0627', '2450']);
    const reqId = 'REQ-909-EXTRACCION-RUIDO';
    const link = yaProgramada(reqId, ['909', '0627', '2450', 'campana']);
    requisitos.push({
      id: reqId,
      normaId: norm?.id || 'plan-10',
      normaOficial: 'Resolución 909 de 2008 / Resolución 0627 de 2006 / Ley 2450 de 2025',
      articulos: 'Cap. IV-V Res. 909/2008 | Estándares de Ruido Ambiental',
      area: 'AMBIENTAL',
      requisitoObligatorio: 'Limpiar y revisar cada 6 meses la campana extractora, los ductos de humo y los motores para evitar malos olores, incendios por grasa y exceso de ruido.',
      actividadPropuesta: 'Lavado profundo de ductos y filtros de la campana extractora y revisión mecánica de motores y cortadoras para bajar el ruido.',
      frecuenciaRespaldada: 'SEMESTRAL',
      sustentoFrecuencia: 'Control preventivo cada 6 meses para evitar incendios en ductos y cuidar a los vecinos de Bosa.',
      responsableSugerido: 'Líder de Gestión Ambiental',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Certificado o comprobante de lavado de ductos y filtros, más registro del mantenimiento de extractores.',
      periodoCumplimiento: `Mayo y Noviembre ${vigencia}`,
      mesesSugeridos: [5, 11],
      aplicaEmpresaActual: tieneCampana,
      motivoAplicabilidad: tieneCampana
        ? 'La planta de Bosa tiene campana extractora vertical rodeada de viviendas.'
        : 'Campana extractora sin confirmar en la ficha de instalaciones.',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 12. Condicional: Contratistas por Prestación de Servicios (Decreto 723 de 2013)
  if (config.modalidadesContrato.includes('servicios')) {
    const reqId = 'REQ-723-CONTRATISTAS';
    const link = yaProgramada(reqId, ['723', 'contratista', 'pila']);
    requisitos.push({
      id: reqId,
      normaOficial: 'Decreto 723 de 2013 / Decreto 1072 de 2015',
      articulos: 'Decreto 723/2013 Art. 2, 4 y 6',
      area: 'SST',
      requisitoObligatorio: 'Revisar cada mes que contratistas externos paguen su seguridad social y ARL (planilla PILA) y darles charla de seguridad antes de entrar a planta.',
      actividadPropuesta: 'Revisar planilla PILA al día de contratistas por prestación de servicios y explicarles las normas de seguridad antes de trabajar.',
      frecuenciaRespaldada: 'MENSUAL',
      sustentoFrecuencia: 'Decreto 723 de 2013 (revisión cada mes antes de pagar o dejar ingresar a planta).',
      responsableSugerido: 'Coordinador / Vigía de SST',
      aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
      evidenciaNecesaria: 'Copias mensuales de planilla PILA paga y registro firmado de la charla de inducción en seguridad.',
      periodoCumplimiento: `Cada mes ${vigencia}`,
      mesesSugeridos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: 'La empresa tiene activa la opción de contratar personal por «Prestación de servicios».',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 13. Condicional: Aprendices SENA (Ley 789 de 2002)
  if (config.modalidadesContrato.includes('aprendizaje')) {
    const reqId = 'REQ-789-APRENDICES';
    const link = yaProgramada(reqId, ['789', 'aprendiz']);
    requisitos.push({
      id: reqId,
      normaOficial: 'Ley 789 de 2002 / Decreto 1072 de 2015',
      articulos: 'Ley 789/2002 Art. 30 | Dec. 1072/2015 Art. 2.2.6.3.1',
      area: 'SST',
      requisitoObligatorio: 'Afiliar a riesgos laborales (ARL) a los aprendices SENA en práctica, entregarles sus elementos de protección (EPP) y explicarles sus labores seguras.',
      actividadPropuesta: 'Confirmar afiliación a ARL del aprendiz, entregarle su EPP completo y prohibirle operar freidoras o cortadoras si es menor de edad.',
      frecuenciaRespaldada: 'SEMESTRAL',
      sustentoFrecuencia: 'Ley 789 de 2002 (cada vez que ingresa un nuevo grupo o cada 6 meses).',
      responsableSugerido: NOMBRE_GERENTE_OFICIAL,
      aprobadorSugerido: 'Coordinador / Vigía de SST',
      evidenciaNecesaria: 'Contrato de aprendizaje, certificado de afiliación a la ARL y planilla firmada de entrega de EPP e inducción.',
      periodoCumplimiento: `Cada 6 meses ${vigencia}`,
      mesesSugeridos: [2, 8],
      aplicaEmpresaActual: true,
      motivoAplicabilidad: 'La empresa tiene activa la opción de «Contrato de aprendizaje (SENA)».',
      yaProgramadaEnPlan: link.existe,
      actividadVinculadaId: link.actId,
    });
  }

  // 14. Detectar normas en la matriz PHVA marcadas como NO_CUMPLE o PARCIAL que aún no tengan actividad asociada
  normas
    .filter((n) => n.vigente && (n.estado === 'NO_CUMPLE' || n.estado === 'PARCIAL'))
    .slice(0, 6)
    .forEach((n) => {
      const reqId = `REQ-NORMA-${n.id}`;
      const yaExiste =
        requisitos.some((r) => r.normaId === n.id) ||
        Boolean(planActual?.actividades.some((a) => a.normaId === n.id));
      if (!yaExiste) {
        requisitos.push({
          id: reqId,
          normaId: n.id,
          normaOficial: n.normaOficial,
          articulos: n.articulos,
          area: n.area,
          requisitoObligatorio: `${n.tituloSituacion} (Estado hoy: ${n.estado === 'NO_CUMPLE' ? 'Aún no se cumple' : 'Cumple a medias'})`,
          actividadPropuesta: `Tarea para ponerse al día con la norma: ${n.aplicabilidad.slice(0, 140)}`,
          frecuenciaRespaldada: 'UNICA',
          sustentoFrecuencia: 'Pendiente encontrado en la lista de normas — requiere ponerse al día este año.',
          responsableSugerido: n.responsable || 'Coordinador / Vigía de SST',
          aprobadorSugerido: NOMBRE_GERENTE_OFICIAL,
          evidenciaNecesaria: n.evidenciaCumplimiento.slice(0, 180),
          periodoCumplimiento: `Año ${vigencia}`,
          mesesSugeridos: [new Date().getMonth() + 1],
          aplicaEmpresaActual: true,
          motivoAplicabilidad: `La norma ${n.normaOficial} aparece como "${n.estado === 'NO_CUMPLE' ? 'No cumple' : 'Cumple parcialmente'}" en la lista de normas.`,
          yaProgramadaEnPlan: false,
        });
      }
    });

  return requisitos;
}

// ============================================================================
// MOTOR DE CÁLCULO AUTOMÁTICO DE INDICADORES (KPI)
// ============================================================================

export function calcularIndicadoresPlan(
  plan: PlanAnualVigencia,
  riesgos: RiesgoGTC45Item[]
): IndicadorCalculado[] {
  return plan.indicadores.map((ind) => {
    let resultadoActual = ind.resultadoManual ?? 0;
    let totalBase = 0;
    let totalLogrado = 0;
    let detalleCalculo = 'Dato ingresado manualmente por el encargado.';

    const actividadesFiltradas = plan.actividades.filter((a) => {
      const matchArea = !ind.filtroArea || ind.filtroArea === 'TODAS' || a.area === ind.filtroArea;
      const matchOrigen =
        !ind.filtroOrigen || ind.filtroOrigen === 'TODOS' || a.origen === ind.filtroOrigen;
      return matchArea && matchOrigen;
    });

    if (ind.tipoCalculo === 'AUTOMATICO_ACTIVIDADES') {
      totalBase = actividadesFiltradas.length;
      totalLogrado = actividadesFiltradas.filter(
        (a) => a.estado === 'CUMPLIDA' || a.estado === 'APROBADA'
      ).length;
      resultadoActual = totalBase > 0 ? Math.round((totalLogrado / totalBase) * 1000) / 10 : 0;
      detalleCalculo = `${totalLogrado} de ${totalBase} tareas en estado Cumplido o Aprobado por Gerencia.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_EVIDENCIAS') {
      totalBase = actividadesFiltradas.length;
      totalLogrado = actividadesFiltradas.filter(
        (a) =>
          a.evidencias.length > 0 &&
          a.evidencias.some(
            (e) => e.estadoRevision === 'APROBADA' || e.estadoRevision === 'CUMPLIDA'
          )
      ).length;
      resultadoActual = totalBase > 0 ? Math.round((totalLogrado / totalBase) * 1000) / 10 : 0;
      detalleCalculo = `${totalLogrado} de ${totalBase} tareas ya tienen su foto, acta o certificado aprobado por Gerencia.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_PRESUPUESTO') {
      const resumenPres = calcularResumenPresupuestoPlan(
        actividadesFiltradas,
        plan.presupuestoGeneralAprobado || 0
      );
      const presGeneral = resumenPres.presupuestoGeneral;
      const presProgramado = resumenPres.programado;
      const presAprobado = resumenPres.aprobado;
      const gastoReal = resumenPres.ejecutado;
      const baseCalculo =
        presGeneral > 0 ? presGeneral : presAprobado > 0 ? presAprobado : presProgramado;
      totalBase = baseCalculo;
      totalLogrado = gastoReal;
      resultadoActual =
        baseCalculo > 0 ? Math.round((gastoReal / baseCalculo) * 1000) / 10 : 0;
      detalleCalculo = `General ${plan.vigencia}: $${presGeneral.toLocaleString('es-CO')} | Asignado en actividades: $${presAprobado.toLocaleString('es-CO')} | Ejecutado: $${gastoReal.toLocaleString('es-CO')} | Programado: ${
        presProgramado > 0 ? `$${presProgramado.toLocaleString('es-CO')}` : 'Pendiente de valoración'
      }.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_RIESGOS_CRITICOS') {
      const riesgosCriticos = riesgos.filter(
        (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
      );
      totalBase = riesgosCriticos.length;
      const riesgosConActividadCumplida = riesgosCriticos.filter((r) =>
        plan.actividades.some(
          (a) =>
            a.riesgoId === r.id && (a.estado === 'CUMPLIDA' || a.estado === 'APROBADA')
        )
      ).length;
      const riesgosProgramados = riesgosCriticos.filter((r) =>
        plan.actividades.some((a) => a.riesgoId === r.id)
      ).length;
      totalLogrado = riesgosConActividadCumplida;
      resultadoActual =
        totalBase > 0 ? Math.round((riesgosProgramados / totalBase) * 1000) / 10 : 100;
      detalleCalculo = `${riesgosProgramados} de ${totalBase} riesgos altos (Nivel I y II) ya tienen tarea asignada (${riesgosConActividadCumplida} con cumplimiento aprobado por Gerencia).`;
    }

    let cumple = false;
    if (ind.metaOperador === '>=') cumple = resultadoActual >= ind.metaValor;
    else if (ind.metaOperador === '<=') cumple = resultadoActual <= ind.metaValor;
    else cumple = resultadoActual === ind.metaValor;

    const esInicioPresupuestoCero =
      ind.tipoCalculo === 'AUTOMATICO_PRESUPUESTO' && totalBase === 0 && totalLogrado === 0;

    const estadoCalculado: IndicadorCalculado['estadoCalculado'] = cumple
      ? 'CUMPLE_META'
      : esInicioPresupuestoCero
      ? 'EN_SEGUIMIENTO'
      : ind.metaOperador === '>=' && resultadoActual >= ind.metaValor * 0.6
      ? 'EN_SEGUIMIENTO'
      : ind.metaOperador === '<=' && resultadoActual <= ind.metaValor * 1.25
      ? 'EN_SEGUIMIENTO'
      : 'EN_RIESGO';

    return {
      ...ind,
      resultadoActual,
      estadoCalculado,
      detalleCalculo,
      totalBase,
      totalLogrado,
    };
  });
}

// ============================================================================
// MOTOR DE ALERTAS Y RECORDATORIOS AUTOMÁTICOS (SIN ALERTAS INJUSTIFICADAS)
// ============================================================================

export function generarAlertasPlan(
  plan: PlanAnualVigencia,
  fechaReferencia: Date = new Date()
): AlertaPlanAnual[] {
  const alertas: AlertaPlanAnual[] = [];
  const hoyIso = fechaReferencia.toISOString().split('T')[0];
  const hoyMs = new Date(`${hoyIso}T00:00:00`).getTime();
  const mesActual = fechaReferencia.getMonth() + 1;
  const anioActual = fechaReferencia.getFullYear();

  plan.actividades.forEach((act) => {
    // 1. Evidencias pendientes de revisión por aprobador (prioritario incluso si está en proceso)
    const evidenciasPendientes = act.evidencias.filter(
      (e) => e.estadoRevision === 'PENDIENTE_REVISION'
    );
    if (evidenciasPendientes.length > 0 || act.estado === 'REQUIERE_REVISION') {
      alertas.push({
        id: `alerta-rev-${act.id}`,
        tipo: 'EVIDENCIA_PENDIENTE_REVISION',
        severidad: 'ALTA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes: Math.ceil(
          (new Date(`${act.fechaLimite}T00:00:00`).getTime() - hoyMs) / 86400000
        ),
        motivo: `Hay ${evidenciasPendientes.length || 1} prueba(s) o documento(s) subidos esperando que ${act.aprobadorNombre} los revise y apruebe.`,
        accionRecomendada: 'Revisar la foto, acta o documento y aprobar el cierre, o pedir que se corrija.',
      });
    }

    if (act.estado === 'CUMPLIDA' || act.estado === 'APROBADA') return;

    // Las actividades históricas de un año anterior formalmente reprogramadas al siguiente año no deben disparar alertas rojas de vencimiento
    if (act.reprogramadaParaAnio && act.reprogramadaParaAnio > plan.vigencia) {
      return;
    }

    const limiteMs = new Date(`${act.fechaLimite}T00:00:00`).getTime();
    const diasRestantes = Math.ceil((limiteMs - hoyMs) / 86400000);

    // 2. Actividad vencida
    if (diasRestantes < 0) {
      alertas.push({
        id: `alerta-venc-${act.id}`,
        tipo: 'VENCIDA',
        severidad: 'CRITICA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes,
        motivo: `Esta tarea se venció hace ${Math.abs(diasRestantes)} día(s) (la fecha límite era ${act.fechaLimite}).`,
        accionRecomendada:
          act.evidencias.length === 0
            ? `Realizarla cuanto antes y subir la prueba pedida: ${act.evidenciaRequerida}`
            : 'Pedir a quien aprueba que revise la prueba y cierre la tarea.',
      });
      return;
    }

    // 3. Próxima a vencer (0 a 15 días)
    if (diasRestantes <= 15) {
      alertas.push({
        id: `alerta-prox-${act.id}`,
        tipo: 'PROXIMA_A_VENCER',
        severidad: 'ALTA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes,
        motivo:
          diasRestantes === 0
            ? 'Vence HOY. Hay que terminarla y subir el soporte hoy mismo.'
            : `Faltan ${diasRestantes} día(s) para cumplirla (fecha límite: ${act.fechaLimite}).`,
        accionRecomendada:
          act.evidencias.length === 0
            ? `Recordar a ${act.responsableNombre} subir: ${act.evidenciaRequerida}`
            : 'Revisar el documento subido para poder cerrarla a tiempo.',
      });
    } else if (diasRestantes <= 35) {
      // 4. Recordatorio preventivo (16 a 35 días)
      alertas.push({
        id: `alerta-prev-${act.id}`,
        tipo: 'RECORDATORIO_PREVENTIVO',
        severidad: 'MEDIA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes,
        motivo: `Aviso a tiempo: esta tarea vence en ${diasRestantes} días (${act.fechaLimite}).`,
        accionRecomendada: 'Confirmar con el encargado que tenga materiales, tiempo y dinero listos.',
      });
    }

    // 5. No realizada dentro del periodo programado (mes programado ya pasó en la misma vigencia)
    if (
      plan.vigencia === anioActual &&
      act.programacionMensual.length > 0 &&
      Math.max(...act.programacionMensual) < mesActual
    ) {
      alertas.push({
        id: `alerta-per-${act.id}`,
        tipo: 'NO_REALIZADA_EN_PERIODO',
        severidad: 'ALTA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes,
        motivo: `Ya pasó el mes en que tocaba hacerla (mes ${Math.max(...act.programacionMensual)}) y todavía no se cierra.`,
        accionRecomendada: 'Definir una nueva fecha o subir la prueba que falta para cerrarla.',
      });
    }

    // 6. En proceso sin soporte documental cercano a límite
    if (act.estado === 'EN_PROCESO' && act.evidencias.length === 0 && diasRestantes <= 25) {
      alertas.push({
        id: `alerta-sin-ev-${act.id}`,
        tipo: 'SIN_EVIDENCIA_SOPORTE',
        severidad: 'MEDIA',
        actividadId: act.id,
        actividadCodigo: act.codigo,
        actividadNombre: act.nombre,
        responsableNombre: act.responsableNombre,
        responsableCorreo: act.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
        aprobadorNombre: act.aprobadorNombre,
        fechaLimite: act.fechaLimite,
        diasRestantes,
        motivo: `Ya se está haciendo, pero falta subir la prueba digital. Se necesita: ${act.evidenciaRequerida}.`,
        accionRecomendada: 'Tomar foto, escanear el acta o subir el certificado antes de la fecha límite.',
      });
    }
  });

  const ordenSeveridad: Record<AlertaPlanAnual['severidad'], number> = {
    CRITICA: 0,
    ALTA: 1,
    MEDIA: 2,
  };
  return alertas.sort((a, b) => ordenSeveridad[a.severidad] - ordenSeveridad[b.severidad]);
}

// ============================================================================
// MOTOR DE DETECCIÓN DE CAMBIOS (RIESGOS, NORMAS, CARACTERIZACIÓN)
// ============================================================================

export function detectarImpactosEnPlan(
  plan: PlanAnualVigencia,
  riesgos: RiesgoGTC45Item[],
  config: CaracterizacionEmpresaDinamica,
  normas: NormaPhvaItem[]
): SolicitudRevisionPlan[] {
  const nuevasSolicitudes: SolicitudRevisionPlan[] = [];
  const existentesIds = new Set(plan.solicitudesRevision.map((s) => s.entidadId + '|' + s.accionSugerida));
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Detectar cambios en Matriz de Riesgos (Nivel I y II sin actividad, o riesgos vinculados modificados)
  const riesgosCriticos = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  );

  riesgosCriticos.forEach((r) => {
    const actVinculada = plan.actividades.find((a) => a.riesgoId === r.id);
    if (!actVinculada) {
      const key = `${r.id}|AGREGAR_ACTIVIDAD`;
      if (!existentesIds.has(key)) {
        const medidas = extraerMedidasRiesgo(r);
        nuevasSolicitudes.push({
          id: `sol-rsk-add-${r.id}-${Date.now()}`,
          fechaDeteccion: hoy,
          tipoFuente: 'MATRIZ_RIESGOS',
          titulo: `Nuevo riesgo alto (Nivel ${r.interpretacionNR}) sin tarea en el Plan Anual (${r.codigo || r.id})`,
          descripcion: `Peligro: ${r.peligroDescripcion}. Puesto: ${r.cargo || r.cargosExpuestos || 'Operario'}. Área: ${r.proceso}.`,
          impactoPlan: `Conviene programar una acción de protección: ${medidas}`,
          entidadId: r.id,
          accionSugerida: 'AGREGAR_ACTIVIDAD',
          datosPropuestos: {
            nombre: `Protección ante riesgo Nivel ${r.interpretacionNR}: ${r.peligroDescripcion.slice(0, 80)}`,
            descripcion: `Aplicar medidas de prevención y cuidado para "${r.peligroDescripcion}" cuando se realiza: ${r.actividades}.`,
            criterioAceptacion: `Revisar en el puesto que se estén aplicando estas medidas (${medidas.slice(0, 120)}) y que el riesgo baje.`,
            area: 'SST',
            origen: 'RIESGO_GTC45',
            riesgoId: r.id,
            riesgoCodigo: r.codigo || r.id,
            riesgoNivelNR: r.interpretacionNR,
            riesgoCargo: r.cargo || r.cargosExpuestos || 'Operario',
            riesgoProceso: r.proceso,
            riesgoMedidasControl: medidas,
            riesgoSnapshot: crearRiesgoSnapshot(r),
            evidenciaRequerida: 'Acta o planilla de entrega de la medida, revisión en el puesto y fotos.',
          },
          estado: 'PENDIENTE',
        });
      }
    } else if (actVinculada.riesgoSnapshot) {
      const snap = actVinculada.riesgoSnapshot;
      const medidasActuales = extraerMedidasRiesgo(r);
      const cambioDetectado =
        snap.nivelRiesgo !== r.nivelRiesgo ||
        snap.interpretacionNR !== r.interpretacionNR ||
        snap.peligroDescripcion !== r.peligroDescripcion ||
        snap.medidasResumen !== medidasActuales;

      if (cambioDetectado) {
        const key = `${r.id}|REVISAR_ACTIVIDAD`;
        if (!existentesIds.has(key)) {
          nuevasSolicitudes.push({
            id: `sol-rsk-upd-${r.id}-${Date.now()}`,
            fechaDeteccion: hoy,
            tipoFuente: 'MATRIZ_RIESGOS',
            titulo: `Cambio en un riesgo conectado a este plan: ${r.codigo || r.id} (${actVinculada.codigo})`,
            descripcion: `El riesgo cambió de Nivel ${snap.interpretacionNR} (${snap.nivelRiesgo}) a Nivel ${r.interpretacionNR} (${r.nivelRiesgo}) o cambiaron sus medidas de cuidado.`,
            impactoPlan: `Conviene revisar la tarea "${actVinculada.nombre}" para poner al día sus medidas sin borrar lo ya guardado.`,
            entidadId: r.id,
            accionSugerida: 'REVISAR_ACTIVIDAD',
            actividadAfectadaId: actVinculada.id,
            datosPropuestos: {
              riesgoNivelNR: r.interpretacionNR,
              riesgoMedidasControl: medidasActuales,
              riesgoCargo: r.cargo || r.cargosExpuestos,
              riesgoProceso: r.proceso,
              riesgoSnapshot: crearRiesgoSnapshot(r),
            },
            estado: 'PENDIENTE',
          });
        }
      }
    }
  });

  // 2. Detectar cambios en Caracterización (Trabajadores / Clase de riesgo / Res. 0312)
  const snapshotActual = construirEmpresaSnapshot(config);
  if (
    plan.empresaSnapshot.numeroTrabajadores !== snapshotActual.numeroTrabajadores ||
    plan.empresaSnapshot.claseRiesgoSST !== snapshotActual.claseRiesgoSST ||
    plan.empresaSnapshot.grupoEstandares0312 !== snapshotActual.grupoEstandares0312
  ) {
    const key = `${snapshotActual.grupoEstandares0312}-${snapshotActual.numeroTrabajadores}|ACTUALIZAR_ALCANCE_0312`;
    if (!existentesIds.has(key)) {
      nuevasSolicitudes.push({
        id: `sol-emp-0312-${Date.now()}`,
        fechaDeteccion: hoy,
        tipoFuente: 'CARACTERIZACION_EMPRESA',
        titulo: `Cambió la información de la empresa: ${plan.empresaSnapshot.numeroTrabajadores} → ${snapshotActual.numeroTrabajadores} trabajadores (${snapshotActual.grupoEstandares0312})`,
        descripcion: `Los datos de la empresa cambiaron desde que se aprobó el plan (${plan.empresaSnapshot.grupoEstandares0312}, ${plan.empresaSnapshot.claseRiesgoSST}) a ${snapshotActual.grupoEstandares0312} y ${snapshotActual.claseRiesgoSST}.`,
        impactoPlan: `Conviene revisar el Plan ${plan.vigencia} por si ahora aplican más puntos de la Resolución 0312/2019 o cambia el comité de seguridad (COPASST / Vigía).`,
        entidadId: `${snapshotActual.grupoEstandares0312}-${snapshotActual.numeroTrabajadores}`,
        accionSugerida: 'ACTUALIZAR_ALCANCE_0312',
        estado: 'PENDIENTE',
      });
    }
  }

  // 3. Detectar requisitos obligatorios nuevos no programados
  const reqs = identificarRequisitosObligatorios(config, normas, plan);
  reqs
    .filter((req) => req.aplicaEmpresaActual && !req.yaProgramadaEnPlan)
    .forEach((req) => {
      const key = `${req.id}|AGREGAR_ACTIVIDAD`;
      if (!existentesIds.has(key)) {
        nuevasSolicitudes.push({
          id: `sol-norm-${req.id}-${Date.now()}`,
          fechaDeteccion: hoy,
          tipoFuente: 'MATRIZ_NORMATIVA',
          titulo: `Obligación legal pendiente de incluir en el calendario: ${req.normaOficial}`,
          descripcion: req.requisitoObligatorio,
          impactoPlan: `Por qué aplica: ${req.motivoAplicabilidad} Cada cuánto debe hacerse: ${req.frecuenciaRespaldada}.`,
          entidadId: req.id,
          accionSugerida: 'AGREGAR_ACTIVIDAD',
          datosPropuestos: {
            nombre: req.actividadPropuesta,
            descripcion: `${req.requisitoObligatorio}. Norma: ${req.normaOficial} (${req.articulos}).`,
            criterioAceptacion: `Cumplir con ${req.normaOficial} guardando esta prueba: ${req.evidenciaNecesaria}`,
            area: req.area,
            origen: 'NORMA_OBLIGATORIA',
            normaId: req.normaId,
            normaOficial: req.normaOficial,
            normaArticulos: req.articulos,
            requisitoObligatorioId: req.id,
            esRecurrente: req.frecuenciaRespaldada !== 'UNICA',
            periodicidad: req.frecuenciaRespaldada,
            programacionMensual: req.mesesSugeridos,
            evidenciaRequerida: req.evidenciaNecesaria,
          },
          estado: 'PENDIENTE',
        });
      }
    });

  return nuevasSolicitudes;
}

// ============================================================================
// CIERRE CON EVIDENCIA Y RECURRENCIA AUTOMÁTICA
// ============================================================================

export function crearSiguienteOcurrencia(
  actividadCerrada: ActividadPlanAnual,
  anioVigencia: number
): ActividadPlanAnual | null {
  if (!actividadCerrada.esRecurrente || actividadCerrada.periodicidad === 'UNICA' || actividadCerrada.periodicidad === 'ANUAL') {
    return null;
  }

  const saltoMeses: Record<PeriodicidadActividad, number> = {
    UNICA: 0,
    MENSUAL: 1,
    BIMESTRAL: 2,
    TRIMESTRAL: 3,
    SEMESTRAL: 6,
    ANUAL: 12,
  };

  const salto = saltoMeses[actividadCerrada.periodicidad];
  if (!salto) return null;

  const baseFecha = new Date(`${actividadCerrada.fechaLimite}T00:00:00`);
  const siguienteMesIdx = baseFecha.getMonth() + salto;
  const siguienteFecha = new Date(baseFecha.getFullYear(), siguienteMesIdx, Math.min(baseFecha.getDate(), 28));

  // No crear ocurrencia fuera de la vigencia actual
  if (siguienteFecha.getFullYear() > anioVigencia) {
    return null;
  }

  const nextLimite = siguienteFecha.toISOString().split('T')[0];
  const nextInicioDate = new Date(siguienteFecha.getFullYear(), siguienteFecha.getMonth(), 1);
  const nextInicio = nextInicioDate.toISOString().split('T')[0];
  const nextMes = siguienteFecha.getMonth() + 1;
  const serieId = actividadCerrada.serieRecurrenteId || actividadCerrada.id;
  const nextNum = (actividadCerrada.numeroOcurrencia || 1) + 1;

  return {
    ...actividadCerrada,
    id: `act-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo: `${actividadCerrada.codigo.split('-R')[0]}-R${nextNum}`,
    fechaInicio: nextInicio,
    fechaLimite: nextLimite,
    programacionMensual: Array.from(new Set([...actividadCerrada.programacionMensual, nextMes])).sort(
      (a, b) => a - b
    ),
    serieRecurrenteId: serieId,
    numeroOcurrencia: nextNum,
    presupuestoEstimado: actividadCerrada.presupuestoEstimado || 0,
    presupuestoAprobado: 0,
    gastoEjecutado: 0,
    tipoRecurso: actividadCerrada.tipoRecurso || 'PENDIENTE_VALORACION',
    estado: 'PENDIENTE',
    evidencias: [],
    resultadoActividad: undefined,
    fechaCierre: undefined,
    cerradoPor: undefined,
    revisionGerente: undefined,
    observaciones: `Siguiente fecha (#${nextNum}) creada automáticamente al cerrar la del periodo anterior (${actividadCerrada.fechaLimite}).`,
    historialRevisiones: [
      {
        id: `hrev-${Date.now()}`,
        fecha: new Date().toISOString(),
        usuario: 'Calendario Automático',
        rol: 'Sistema',
        accion: 'RECURRENCIA_GENERADA',
        detalle: `Se programó la siguiente fecha al aprobar la tarea anterior (${actividadCerrada.codigo}) con frecuencia ${actividadCerrada.periodicidad}.`,
      },
    ],
  };
}

// ============================================================================
// GENERACIÓN DE DATOS INICIALES REALISTAS Y CONECTADOS (VIGENCIAS 2025 Y 2026)
// ============================================================================

function generarObjetivosYIndicadoresIniciales(anio: number): {
  objetivos: ObjetivoEspecificoPlan[];
  indicadores: IndicadorGestionPlan[];
} {
  const objetivos: ObjetivoEspecificoPlan[] = [
    {
      id: `obj-${anio}-01`,
      codigo: 'OBJ-01',
      area: 'SST',
      titulo: 'Atender el 100% de los peligros más graves (Nivel I y II): calor, ruido, químicos y esfuerzo físico',
      descripcion:
        'Instalar barreras en las máquinas, organizar pausas y entregar los elementos de protección (EPP) para reducir los riesgos altos encontrados en la planta de Frikaz S.A.S.',
      responsable: 'Coordinador / Vigía de SST',
      metas: [
        {
          id: `meta-${anio}-01a`,
          descripcion: 'Riesgos altos (Nivel I y II) con actividad de protección programada',
          valorMeta: 100,
          unidad: '%',
          plazo: `Diciembre ${anio}`,
        },
      ],
      indicadoresIds: [`ind-${anio}-01`, `ind-${anio}-04`],
    },
    {
      id: `obj-${anio}-02`,
      codigo: 'OBJ-02',
      area: 'INTEGRAL',
      titulo: 'Cumplir a tiempo con las tareas del Plan Anual y los Estándares Mínimos (Res. 0312/2019)',
      descripcion:
        'Hacer las actividades de seguridad y ambiente en las fechas acordadas y guardar siempre su prueba (foto, acta o certificado aprobado).',
      responsable: NOMBRE_GERENTE_OFICIAL,
      metas: [
        {
          id: `meta-${anio}-02a`,
          descripcion: 'Tareas del Plan Anual completadas a tiempo durante el año',
          valorMeta: 90,
          unidad: '%',
          plazo: `Diciembre ${anio}`,
        },
        {
          id: `meta-${anio}-02b`,
          descripcion: 'Tareas terminadas que ya tienen su foto, acta o certificado aprobado',
          valorMeta: 100,
          unidad: '%',
          plazo: `Diciembre ${anio}`,
        },
      ],
      indicadoresIds: [`ind-${anio}-02`, `ind-${anio}-03`],
    },
    {
      id: `obj-${anio}-03`,
      codigo: 'OBJ-03',
      area: 'AMBIENTAL',
      titulo: 'Cuidar el agua y el aire evitando botar aceite usado (ACU), grasas y humo sin control',
      descripcion:
        'Entregar todo el Aceite de Cocina Usado (ACU) al recolector autorizado, limpiar la trampa de grasas cada mes y lavar la campana extractora.',
      responsable: 'Líder de Gestión Ambiental',
      metas: [
        {
          id: `meta-${anio}-03a`,
          descripcion: 'Cumplimiento de las tareas ambientales obligatorias (Res. 316, 0631 y 909)',
          valorMeta: 95,
          unidad: '%',
          plazo: `Diciembre ${anio}`,
        },
      ],
      indicadoresIds: [`ind-${anio}-05`],
    },
  ];

  const indicadores: IndicadorGestionPlan[] = [
    {
      id: `ind-${anio}-01`,
      codigo: 'IND-01',
      nombre: 'Avance de cumplimiento del Plan Anual (Seguridad y Ambiente)',
      tipo: 'PROCESO',
      objetivoEspecificoId: `obj-${anio}-02`,
      metaId: `meta-${anio}-02a`,
      formula: '(Tareas terminadas / Total de tareas del plan) × 100',
      metaValor: 90,
      metaOperador: '>=',
      metaTexto: 'Cumplir mínimo el 90% de las tareas',
      reglaConteo:
        'Cuenta solo las tareas marcadas como CUMPLIDAS con prueba aprobada y las divide por el total de tareas del año.',
      unidadMedida: '%',
      fuenteInformacion: 'Calendario y pruebas del Plan Anual Frikaz S.A.S.',
      responsable: 'Coordinador / Vigía de SST',
      periodicidad: 'TRIMESTRAL',
      tipoCalculo: 'AUTOMATICO_ACTIVIDADES',
      filtroArea: 'TODAS',
      filtroOrigen: 'TODOS',
      historicoMediciones: [],
    },
    {
      id: `ind-${anio}-02`,
      codigo: 'IND-02',
      nombre: 'Riesgos más altos (Nivel I y II) que ya tienen acción de control',
      tipo: 'ESTRUCTURA',
      objetivoEspecificoId: `obj-${anio}-01`,
      metaId: `meta-${anio}-01a`,
      formula: '(Riesgos Nivel I y II con tarea programada / Total riesgos Nivel I y II) × 100',
      metaValor: 100,
      metaOperador: '>=',
      metaTexto: 'Cubrir el 100% de los riesgos Nivel I y II',
      reglaConteo:
        'Revisa en vivo la Matriz de Peligros GTC 45 y verifica que todos los riesgos altos tengan una tarea asignada en el Plan Anual.',
      unidadMedida: '%',
      fuenteInformacion: 'Matriz de Peligros GTC 45 + Plan Anual',
      responsable: 'Coordinador / Vigía de SST',
      periodicidad: 'TRIMESTRAL',
      tipoCalculo: 'AUTOMATICO_RIESGOS_CRITICOS',
      historicoMediciones: [],
    },
    {
      id: `ind-${anio}-03`,
      codigo: 'IND-03',
      nombre: 'Uso del dinero asignado (Presupuesto SST y Ambiental)',
      tipo: 'ESTRUCTURA',
      objetivoEspecificoId: `obj-${anio}-02`,
      formula: '(Dinero gastado / Presupuesto separado total) × 100',
      metaValor: 85,
      metaOperador: '>=',
      metaTexto: 'Usar al menos el 85% del presupuesto planeado',
      reglaConteo:
        'Suma todo lo que se ha gastado en las tareas y lo compara con el dinero total aprobado para el año.',
      unidadMedida: '%',
      fuenteInformacion: 'Cuentas del Plan Anual',
      responsable: NOMBRE_GERENTE_OFICIAL,
      periodicidad: 'TRIMESTRAL',
      tipoCalculo: 'AUTOMATICO_PRESUPUESTO',
      filtroArea: 'TODAS',
      historicoMediciones: [],
    },
    {
      id: `ind-${anio}-04`,
      codigo: 'IND-04',
      nombre: 'Tareas que tienen foto, acta o certificado aprobado',
      tipo: 'RESULTADO',
      objetivoEspecificoId: `obj-${anio}-01`,
      metaId: `meta-${anio}-02b`,
      formula: '(Tareas con prueba aprobada / Total tareas del Plan) × 100',
      metaValor: 85,
      metaOperador: '>=',
      metaTexto: 'Mínimo el 85% con soporte aprobado',
      reglaConteo:
        'Revisa cuántas tareas del Plan Anual ya tienen al menos un documento o foto aprobada por quien revisa.',
      unidadMedida: '%',
      fuenteInformacion: 'Archivo de Soportes del Plan Anual',
      responsable: 'Coordinador / Vigía de SST',
      periodicidad: 'MENSUAL',
      tipoCalculo: 'AUTOMATICO_EVIDENCIAS',
      filtroArea: 'TODAS',
      historicoMediciones: [],
    },
    {
      id: `ind-${anio}-05`,
      codigo: 'IND-05',
      nombre: 'Cumplimiento ambiental (Aceite usado, trampa de grasas y campana)',
      tipo: 'AMBIENTAL',
      objetivoEspecificoId: `obj-${anio}-03`,
      metaId: `meta-${anio}-03a`,
      formula: '(Tareas ambientales cumplidas / Total tareas ambientales) × 100',
      metaValor: 95,
      metaOperador: '>=',
      metaTexto: 'Cumplir mínimo el 95% de las tareas ambientales',
      reglaConteo:
        'Toma solo las tareas de cuidado ambiental y calcula cuántas están cerradas y aprobadas.',
      unidadMedida: '%',
      fuenteInformacion: 'Calendario Ambiental del Plan Anual',
      responsable: 'Líder de Gestión Ambiental',
      periodicidad: 'MENSUAL',
      tipoCalculo: 'AUTOMATICO_ACTIVIDADES',
      filtroArea: 'AMBIENTAL',
      historicoMediciones: [],
    },
  ];

  return { objetivos, indicadores };
}

function buildPlan2025Seed(
  config: CaracterizacionEmpresaDinamica,
  riesgos: RiesgoGTC45Item[]
): PlanAnualVigencia {
  const { objetivos, indicadores } = generarObjetivosYIndicadoresIniciales(2025);
  const r01 = riesgos.find((r) => r.id === 'RSK-PROD-01') || riesgos[0];
  const r03 = riesgos.find((r) => r.id === 'RSK-PROD-03') || riesgos[2] || riesgos[0];

  const makeSeedActivity2025 = (
    idx: number,
    partial: Partial<ActividadPlanAnual> & { nombre: string; fechaInicio: string; fechaLimite: string }
  ): ActividadPlanAnual => ({
    id: `act-2025-${idx}`,
    codigo: `PA-2025-0${idx}`,
    descripcion: partial.descripcion || partial.nombre,
    criterioAceptacion: partial.criterioAceptacion || 'Soporte firmado y revisado por Gerencia.',
    area: partial.area || 'SST',
    origen: partial.origen || 'NORMA_OBLIGATORIA',
    esRecurrente: partial.esRecurrente ?? false,
    periodicidad: partial.periodicidad || 'ANUAL',
    programacionMensual: partial.programacionMensual || [3],
    responsableId: partial.responsableId || 'cargo-coordinador-vigia-sst',
    responsableNombre: partial.responsableNombre || 'Coordinador / Vigía de SST',
    responsableCargo: partial.responsableCargo || 'Coordinador / Vigía de SST',
    responsableCorreo: 'frikaz.fritosnacks@gmail.com',
    aprobadorId: 'cargo-gerente-general',
    aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
    aprobadorCargo: 'Gerente',
    presupuestoEstimado: partial.presupuestoEstimado ?? 600000,
    gastoEjecutado: partial.gastoEjecutado ?? 0,
    estado: idx <= 2 ? 'REQUIERE_REVISION' : 'PENDIENTE',
    evidenciaRequerida: partial.evidenciaRequerida || 'Acta y soporte fotográfico',
    evidencias:
      idx <= 2
        ? [
            {
              id: `ev-2025-${idx}`,
              nombreArchivo: `Soporte_PA_2025_0${idx}.pdf`,
              tipoSoporte: 'PDF',
              descripcionSoporte: `Documento cargado para revisión de Gerencia (${partial.nombre}).`,
              fechaCarga: partial.fechaLimite,
              cargadoPor: partial.responsableNombre || 'Coordinador / Vigía de SST',
              estadoRevision: 'PENDIENTE_REVISION',
            },
          ]
        : [],
    resultadoActividad:
      idx <= 2
        ? 'Soporte cargado; pendiente revisión y aprobación por el Gerente General.'
        : undefined,
    observaciones:
      idx <= 2
        ? 'Pendiente de revisión y aprobación por el Gerente.'
        : 'Por hacer o completar evidencias de vigencia 2025.',
    historialRevisiones: [
      {
        id: `hr-2025-${idx}`,
        fecha: partial.fechaInicio,
        usuario: partial.responsableNombre || 'Coordinador / Vigía de SST',
        rol: 'Responsable',
        accion: idx <= 2 ? 'EVIDENCIA_ADJUNTADA' : 'CREADA',
        detalle:
          idx <= 2
            ? 'Soporte subido y enviado a revisión de Gerencia.'
            : 'Actividad base registrada en estado Por hacer.',
      },
    ],
    ...partial,
  });

  const actividades: ActividadPlanAnual[] = [
    makeSeedActivity2025(1, {
      nombre: 'Política de Seguridad y Ambiente y revisión de peligros GTC 45 (2025)',
      fechaInicio: '2025-01-15',
      fechaLimite: '2025-02-20',
      area: 'INTEGRAL',
      programacionMensual: [1, 2],
      normaOficial: 'Decreto 1072 de 2015',
      objetivoEspecificoId: 'obj-2025-02',
      presupuestoEstimado: 450000,
      gastoEjecutado: 0,
    }),
    makeSeedActivity2025(2, {
      nombre: 'Entrega de guantes/caretas térmicas 200°C y pantallas protectoras en freidoras (2025)',
      fechaInicio: '2025-03-01',
      fechaLimite: '2025-04-15',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      riesgoId: r01?.id,
      riesgoCodigo: r01?.codigo,
      riesgoNivelNR: r01?.interpretacionNR,
      riesgoCargo: r01?.cargo,
      riesgoProceso: r01?.proceso,
      riesgoMedidasControl: r01 ? extraerMedidasRiesgo(r01) : undefined,
      riesgoSnapshot: r01 ? crearRiesgoSnapshot(r01) : undefined,
      programacionMensual: [3, 4],
      objetivoEspecificoId: 'obj-2025-01',
      presupuestoEstimado: 1850000,
      gastoEjecutado: 0,
    }),
    makeSeedActivity2025(3, {
      nombre: 'Medición de ruido (sonometría) y entrega de tapa oídos (2025)',
      fechaInicio: '2025-05-05',
      fechaLimite: '2025-06-20',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      riesgoId: r03?.id,
      riesgoCodigo: r03?.codigo,
      riesgoNivelNR: r03?.interpretacionNR,
      riesgoCargo: r03?.cargo,
      riesgoProceso: r03?.proceso,
      riesgoMedidasControl: r03 ? extraerMedidasRiesgo(r03) : undefined,
      riesgoSnapshot: r03 ? crearRiesgoSnapshot(r03) : undefined,
      programacionMensual: [5, 6],
      objetivoEspecificoId: 'obj-2025-01',
      presupuestoEstimado: 1200000,
      gastoEjecutado: 0,
    }),
    makeSeedActivity2025(4, {
      nombre: 'Entrega de aceite usado (ACU) y limpieza de trampa de grasas (Resumen 2025)',
      fechaInicio: '2025-01-10',
      fechaLimite: '2025-12-10',
      area: 'AMBIENTAL',
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      normaOficial: 'Resolución 316 de 2018 / Resolución 0631 de 2015',
      objetivoEspecificoId: 'obj-2025-03',
      presupuestoEstimado: 1600000,
      gastoEjecutado: 0,
    }),
    makeSeedActivity2025(5, {
      nombre: 'Revisión anual de los 7 Estándares Mínimos (Res. 0312/2019) y auditoría (2025)',
      fechaInicio: '2025-11-10',
      fechaLimite: '2025-12-18',
      area: 'SST',
      programacionMensual: [11, 12],
      normaOficial: 'Resolución 0312 de 2019',
      objetivoEspecificoId: 'obj-2025-02',
      presupuestoEstimado: 750000,
      gastoEjecutado: 0,
    }),
  ];

  return {
    id: 'plan-vigencia-2025',
    vigencia: 2025,
    titulo: 'Plan Anual de Seguridad, Salud y Ambiente 2025 (Año anterior)',
    objetivoGeneral:
      'Cuidar la salud y evitar accidentes en la elaboración de snacks de Frikaz S.A.S., cumpliendo las normas de seguridad y cuidado ambiental durante el 2025.',
    fechaElaboracion: '2025-01-10',
    responsableId: 'cargo-coordinador-vigia-sst',
    responsableNombre: 'Coordinador / Vigía de SST',
    aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
    estadoAprobacion: 'EN_REVISION',
    empresaSnapshot: construirEmpresaSnapshot(config),
    objetivosEspecificos: objetivos,
    indicadores,
    actividades,
    solicitudesRevision: [],
    notificacionesEnviadas: [],
    historialCambios: [
      {
        id: 'h-2025-01',
        fechaHora: '2025-01-15T09:00:00',
        usuario: 'Coordinador / Vigía de SST',
        accion: 'Borrador listo para Gerencia',
        detalle: 'Registro base 2025 preparado; pendiente de revisión y aprobación por el Gerente.',
      },
    ],
  };
}

function buildPlan2026Seed(
  config: CaracterizacionEmpresaDinamica,
  riesgos: RiesgoGTC45Item[]
): PlanAnualVigencia {
  const { objetivos, indicadores } = generarObjetivosYIndicadoresIniciales(2026);
  const { grupo, cantidadEstandares } = determinarGrupoEstandares0312(config);

  const riesgosCriticos = riesgos.filter(
    (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
  );
  const rCalor = riesgosCriticos.find((r) => r.id === 'RSK-PROD-01') || riesgosCriticos[0];
  const rQuimico = riesgosCriticos.find((r) => r.id === 'RSK-PROD-02') || riesgosCriticos[1];
  const rRuido = riesgosCriticos.find((r) => r.id === 'RSK-PROD-03') || riesgosCriticos[2];
  const rBiomec = riesgosCriticos.find((r) => r.id === 'RSK-PROD-04') || riesgosCriticos[3];

  const notaReprog2026 =
    'Registro histórico 2026: sin ejecución confirmada a noviembre de 2026; reprogramada al Plan Anual 2027 para ejecución realista desde enero.';

  const actividades: ActividadPlanAnual[] = [
    {
      id: 'act-2026-01',
      codigo: 'PA-2026-01',
      nombre: 'Revisión anual de la Política de Seguridad y Ambiente y lista de peligros (Matriz GTC 45)',
      descripcion:
        'Revisar, firmar y explicar a todo el equipo la Política de Seguridad y actualizar con los trabajadores la lista de peligros de cada puesto (Matriz GTC 45).',
      criterioAceptacion:
        'Política firmada por Gerencia, explicada al 100% del equipo y lista de peligros actualizada.',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      normaId: 'plan-03',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.5 al 2.2.4.6.7 y 2.2.4.6.15',
      requisitoObligatorioId: 'REQ-1072-POLITICA',
      objetivoEspecificoId: 'obj-2026-02',
      esRecurrente: false,
      periodicidad: 'ANUAL',
      fechaInicio: '2026-01-12',
      fechaLimite: '2026-02-15',
      programacionMensual: [1, 2],
      reprogramadaParaAnio: 2027,
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: 'Tiempo del equipo SST y Gerencia (pendiente por confirmar).',
      tipoRecurso: 'PENDIENTE_VALORACION',
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Política SST firmada, planillas de charla al personal y Matriz GTC 45 actualizada.',
      evidencias: [],
      observaciones: notaReprog2026,
      historialRevisiones: [
        {
          id: 'hr-2026-01',
          fecha: '2026-11-23T09:00:00',
          usuario: 'Reorganización 2027',
          rol: 'Sistema',
          accion: 'ACTUALIZADA',
          detalle: 'Marcada como pendiente / reprogramada al Plan Anual 2027 (sin ejecución confirmada en 2026).',
        },
      ],
    },
    ...(rCalor
      ? [
          {
            id: 'act-2026-02',
            codigo: 'PA-2026-02',
            nombre: `Protección contra quemaduras en freidoras: pantallas, caretas y guantes para 250°C (${rCalor.codigo})`,
            descripcion: `Cuidar al trabajador frente al peligro "${rCalor.peligroDescripcion}".`,
            criterioAceptacion:
              'Pantallas puestas en freidoras #1 y #2, alarma funcionando y planilla firmada de entrega de guantes y caretas.',
            area: 'SST' as const,
            origen: 'RIESGO_GTC45' as const,
            riesgoId: rCalor.id,
            riesgoCodigo: rCalor.codigo || rCalor.id,
            riesgoNivelNR: rCalor.interpretacionNR,
            riesgoCargo: rCalor.cargo || rCalor.cargosExpuestos,
            riesgoProceso: rCalor.proceso,
            riesgoMedidasControl: extraerMedidasRiesgo(rCalor),
            riesgoSnapshot: crearRiesgoSnapshot(rCalor),
            objetivoEspecificoId: 'obj-2026-01',
            esRecurrente: false,
            periodicidad: 'ANUAL' as const,
            fechaInicio: '2026-03-01',
            fechaLimite: '2026-04-30',
            programacionMensual: [3, 4],
            reprogramadaParaAnio: 2027,
            responsableId: 'cargo-operario-frito',
            responsableNombre: 'Operario de Frito',
            responsableCargo: 'Operario de Frito',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-gerente-general',
            aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
            aprobadorCargo: 'Gerente',
            recursosNecesarios: 'Guantes térmicos, caretas y validación de pantallas protectoras.',
            tipoRecurso: 'PENDIENTE_VALORACION' as const,
            presupuestoEstimado: 0,
            presupuestoAprobado: 0,
            gastoEjecutado: 0,
            estado: 'PENDIENTE' as const,
            evidenciaRequerida:
              'Fotos de las pantallas protectoras y planilla firmada de entrega de guantes 250°C y careta ANSI Z87.1.',
            evidencias: [],
            observaciones: notaReprog2026,
            historialRevisiones: [
              {
                id: 'hr-2026-02',
                fecha: '2026-11-23T09:00:00',
                usuario: 'Reorganización 2027',
                rol: 'Sistema',
                accion: 'ACTUALIZADA' as const,
                detalle: 'Reprogramada a mayo–junio de 2027 sin ejecución previa confirmada.',
              },
            ],
          },
        ]
      : []),
    ...(rQuimico
      ? [
          {
            id: 'act-2026-03',
            codigo: 'PA-2026-03',
            nombre: `Etiquetas claras en químicos (SGA), hojas de seguridad y punto lavaojos (${rQuimico.codigo})`,
            descripcion: `Atender riesgo Nivel ${rQuimico.interpretacionNR}: ${rQuimico.peligroDescripcion}.`,
            criterioAceptacion:
              'Todos los envases con su etiqueta clara, carpeta con hojas de seguridad a la mano y lavaojos funcionando.',
            area: 'SST' as const,
            origen: 'RIESGO_GTC45' as const,
            riesgoId: rQuimico.id,
            riesgoCodigo: rQuimico.codigo || rQuimico.id,
            riesgoNivelNR: rQuimico.interpretacionNR,
            riesgoCargo: rQuimico.cargo || rQuimico.cargosExpuestos,
            riesgoProceso: rQuimico.proceso,
            riesgoMedidasControl: extraerMedidasRiesgo(rQuimico),
            riesgoSnapshot: crearRiesgoSnapshot(rQuimico),
            objetivoEspecificoId: 'obj-2026-01',
            esRecurrente: false,
            periodicidad: 'ANUAL' as const,
            fechaInicio: '2026-06-01',
            fechaLimite: '2026-07-31',
            programacionMensual: [6, 7],
            reprogramadaParaAnio: 2027,
            responsableId: 'cargo-operario-seleccion',
            responsableNombre: 'Operario de Selección',
            responsableCargo: 'Operario de Selección',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-gerente-general',
            aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
            aprobadorCargo: 'Gerente',
            recursosNecesarios: 'Etiquetas SGA, carpeta de hojas de seguridad y guantes de nitrilo.',
            tipoRecurso: 'PENDIENTE_VALORACION' as const,
            presupuestoEstimado: 0,
            presupuestoAprobado: 0,
            gastoEjecutado: 0,
            estado: 'PENDIENTE' as const,
            evidenciaRequerida:
              'Fotos de los envases etiquetados, carpeta de hojas de seguridad y planilla de charla.',
            evidencias: [],
            observaciones: notaReprog2026,
            historialRevisiones: [
              {
                id: 'hr-2026-03',
                fecha: '2026-11-23T09:00:00',
                usuario: 'Reorganización 2027',
                rol: 'Sistema',
                accion: 'ACTUALIZADA' as const,
                detalle: 'Reprogramada a marzo de 2027 sin ejecución previa confirmada.',
              },
            ],
          },
        ]
      : []),
    ...(rRuido
      ? [
          {
            id: 'act-2026-04',
            codigo: 'PA-2026-04',
            nombre: `Medición anual de ruido (sonometría) y revisión de extractora (${rRuido.codigo})`,
            descripcion: `Medir el nivel de ruido en la planta y verificar protectores auditivos.`,
            criterioAceptacion:
              'Informe de medición de ruido entregado por especialista y gomas antivibración revisadas en máquinas.',
            area: 'SST' as const,
            origen: 'RIESGO_GTC45' as const,
            riesgoId: rRuido.id,
            riesgoCodigo: rRuido.codigo || rRuido.id,
            riesgoNivelNR: rRuido.interpretacionNR,
            riesgoCargo: rRuido.cargo || rRuido.cargosExpuestos,
            riesgoProceso: rRuido.proceso,
            riesgoMedidasControl: extraerMedidasRiesgo(rRuido),
            riesgoSnapshot: crearRiesgoSnapshot(rRuido),
            objetivoEspecificoId: 'obj-2026-01',
            esRecurrente: false,
            periodicidad: 'ANUAL' as const,
            fechaInicio: '2026-09-01',
            fechaLimite: '2026-10-30',
            programacionMensual: [9, 10],
            reprogramadaParaAnio: 2027,
            responsableId: 'cargo-operario-pelado',
            responsableNombre: 'Operario de Pelado',
            responsableCargo: 'Operario de Pelado',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-gerente-general',
            aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
            aprobadorCargo: 'Gerente',
            recursosNecesarios: 'Gestión con ARL y protectores auditivos.',
            tipoRecurso: 'PENDIENTE_VALORACION' as const,
            presupuestoEstimado: 0,
            presupuestoAprobado: 0,
            gastoEjecutado: 0,
            estado: 'PENDIENTE' as const,
            evidenciaRequerida:
              'Informe de medición de ruido y planilla firmada de entrega de tapa oídos.',
            evidencias: [],
            observaciones: notaReprog2026,
            historialRevisiones: [],
          },
        ]
      : []),
    ...(rBiomec
      ? [
          {
            id: 'act-2026-05',
            codigo: 'PA-2026-05',
            nombre: `Poner tapetes blandos (antifatiga) y hacer pausas activas en selección y empaque (${rBiomec.codigo})`,
            descripcion: `Mejorar la comodidad en mesa de selección y sellado para evitar dolores musculares en el puesto de ${rBiomec.cargo}.`,
            criterioAceptacion:
              'Tapetes puestos donde se trabaja de pie y planilla de pausas activas hechas durante el turno.',
            area: 'SST' as const,
            origen: 'RIESGO_GTC45' as const,
            riesgoId: rBiomec.id,
            riesgoCodigo: rBiomec.codigo || rBiomec.id,
            riesgoNivelNR: rBiomec.interpretacionNR,
            riesgoCargo: rBiomec.cargo || rBiomec.cargosExpuestos,
            riesgoProceso: rBiomec.proceso,
            riesgoMedidasControl: extraerMedidasRiesgo(rBiomec),
            riesgoSnapshot: crearRiesgoSnapshot(rBiomec),
            objetivoEspecificoId: 'obj-2026-01',
            esRecurrente: false,
            periodicidad: 'ANUAL' as const,
            fechaInicio: '2026-08-01',
            fechaLimite: '2026-09-30',
            programacionMensual: [8, 9],
            reprogramadaParaAnio: 2027,
            responsableId: 'cargo-operario-empaque',
            responsableNombre: 'Operario de Empaque',
            responsableCargo: 'Operario de Empaque',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-gerente-general',
            aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
            aprobadorCargo: 'Gerente',
            recursosNecesarios: 'Tapetes antifatiga y tiempo de pausas activas.',
            tipoRecurso: 'PENDIENTE_VALORACION' as const,
            presupuestoEstimado: 0,
            presupuestoAprobado: 0,
            gastoEjecutado: 0,
            estado: 'PENDIENTE' as const,
            evidenciaRequerida: 'Factura o foto de los tapetes instalados y lista de pausas activas.',
            evidencias: [],
            observaciones: notaReprog2026,
            historialRevisiones: [],
          },
        ]
      : []),
    {
      id: 'act-2026-06',
      codigo: 'PA-2026-06',
      nombre: 'Reunión del Comité de Convivencia Laboral (4to trimestre)',
      descripcion:
        'Reunión del Comité de Convivencia (Res. 652/2012 y 1356/2012) para cuidar el respeto, buen trato y bienestar emocional en la planta.',
      criterioAceptacion: 'Acta firmada por quienes integran el comité guardada de forma confidencial.',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 652 de 2012 / Resolución 1356 de 2012',
      normaArticulos: 'Art. 9 Res. 652/2012 (mod. Art. 3 Res. 1356/2012)',
      requisitoObligatorioId: 'REQ-652-CONVIVENCIA',
      objetivoEspecificoId: 'obj-2026-02',
      esRecurrente: false,
      periodicidad: 'TRIMESTRAL',
      fechaInicio: '2026-11-01',
      fechaLimite: '2026-12-15',
      programacionMensual: [3, 6, 9, 12],
      reprogramadaParaAnio: 2027,
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: 'Reunión interna de seguimiento.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Acta firmada de la reunión del Comité de Convivencia.',
      evidencias: [],
      observaciones: notaReprog2026,
      historialRevisiones: [],
    },
    {
      id: 'act-2026-07',
      codigo: 'PA-2026-07',
      nombre: 'Entrega de Aceite de Cocina Usado (ACU) a recolector autorizado',
      descripcion:
        'Dejar enfriar el aceite (< 40 °C), envasarlo bien tapado y entregarlo al gestor autorizado por la Secretaría de Ambiente (Res. 316/2018).',
      criterioAceptacion: 'Recibo firmado con los litros o kilos entregados y certificado del gestor SDA.',
      area: 'AMBIENTAL',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 316 de 2018 (MADS / SDA Bogotá)',
      normaArticulos: 'Artículos 6, 7 y 8',
      requisitoObligatorioId: 'REQ-316-ACU-MENSUAL',
      objetivoEspecificoId: 'obj-2026-03',
      esRecurrente: false,
      periodicidad: 'MENSUAL',
      fechaInicio: '2026-10-01',
      fechaLimite: '2026-12-20',
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      reprogramadaParaAnio: 2027,
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: 'Canecas selladas y recibos del gestor autorizado.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Certificado mensual de recolección de aceite entregado por el gestor autorizado.',
      evidencias: [],
      observaciones: notaReprog2026,
      historialRevisiones: [],
    },
    {
      id: 'act-2026-08',
      codigo: 'PA-2026-08',
      nombre: 'Limpieza de la trampa de grasas para cuidar el alcantarillado (Res. 0631/2015)',
      descripcion:
        'Sacar las natas de grasa, lavar bien la trampa y anotar la limpieza en la planilla para cumplir las normas de agua limpia hacia la red del Acueducto (EAAB).',
      criterioAceptacion: 'Planilla de limpieza firmada y comprobante de entrega de grasas sólidas.',
      area: 'AMBIENTAL',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 0631 de 2015',
      normaArticulos: 'Capítulo VI (Parámetros Grasas y Aceites)',
      requisitoObligatorioId: 'REQ-0631-TRAMPA-GRASAS',
      objetivoEspecificoId: 'obj-2026-03',
      esRecurrente: false,
      periodicidad: 'MENSUAL',
      fechaInicio: '2026-11-01',
      fechaLimite: '2026-12-20',
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      reprogramadaParaAnio: 2027,
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: 'Implementos de limpieza y bolsas selladas.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Planilla de limpieza de trampa de grasas firmada y foto.',
      evidencias: [],
      observaciones: notaReprog2026,
      historialRevisiones: [],
    },
    {
      id: 'act-2026-09',
      codigo: 'PA-2026-09',
      nombre: `Calificación anual de los ${cantidadEstandares} Estándares Mínimos de Seguridad (Res. 0312/2019)`,
      descripcion: `Revisar uno por uno los ${cantidadEstandares} puntos que exige la ley (${grupo}) y enviar el resultado a la ARL y al Ministerio del Trabajo.`,
      criterioAceptacion: `Tabla de ${cantidadEstandares} puntos calificada, firmada por Gerencia y radicada en la ARL.`,
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 0312 de 2019',
      normaArticulos: 'Art. 3 y Art. 27-28',
      requisitoObligatorioId: `REQ-0312-${cantidadEstandares}`,
      objetivoEspecificoId: 'obj-2026-02',
      esRecurrente: false,
      periodicidad: 'ANUAL',
      fechaInicio: '2026-12-01',
      fechaLimite: '2026-12-22',
      programacionMensual: [12],
      reprogramadaParaAnio: 2027,
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: 'Revisión interna del cierre anual y radicación en ARL.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: `Calificación de ${cantidadEstandares} estándares firmada y comprobante de envío a la ARL.`,
      evidencias: [],
      observaciones: `${notaReprog2026} Cierre base para ${config.numeroTrabajadores} trabajadores.`,
      historialRevisiones: [],
    },
  ];

  return {
    id: 'plan-vigencia-2026',
    vigencia: 2026,
    titulo: 'Plan Anual de Seguridad, Salud y Ambiente 2026 (Histórico / Reprogramado a 2027)',
    objetivoGeneral:
      'Registro histórico del periodo 2026 de Frikaz S.A.S. Las actividades sin ejecución confirmada a noviembre de 2026 se mantienen como pendientes / reprogramadas al Plan Anual 2027 con $0 de presupuesto ejecutado.',
    fechaElaboracion: '2026-01-12',
    responsableId: 'cargo-coordinador-vigia-sst',
    responsableNombre: 'Coordinador / Vigía de SST',
    aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
    estadoAprobacion: 'EN_REVISION',
    empresaSnapshot: construirEmpresaSnapshot(config),
    objetivosEspecificos: objetivos,
    indicadores,
    actividades,
    solicitudesRevision: [],
    notificacionesEnviadas: [],
    historialCambios: [
      {
        id: 'h-2026-01',
        fechaHora: '2026-01-16T10:00:00',
        usuario: 'Coordinador / Vigía de SST',
        accion: 'Registro inicial 2026',
        detalle: `Plan Anual 2026 (${config.numeroTrabajadores} trabajadores, ${grupo}) registrado.`,
      },
      {
        id: 'h-2026-reorg-2027',
        fechaHora: '2026-11-23T09:00:00',
        usuario: 'Coordinador / Vigía de SST',
        accion: 'Reorganización y trazabilidad hacia 2027',
        detalle:
          'A noviembre de 2026 no hay ejecución confirmada; las actividades no ejecutadas se conservan en el histórico 2026 como pendientes / reprogramadas al Plan Anual 2027 con $0 ejecutado.',
      },
    ],
  };
}

// ============================================================================
// PLAN ANUAL 2027 — PROGRAMACIÓN REALISTA ENERO A DICIEMBRE DE 2027 (34 TAREAS)
// ============================================================================

export function buildPlan2027Seed(
  config: CaracterizacionEmpresaDinamica,
  riesgos: RiesgoGTC45Item[]
): PlanAnualVigencia {
  const { objetivos, indicadores } = generarObjetivosYIndicadoresIniciales(2027);
  const { grupo, cantidadEstandares } = determinarGrupoEstandares0312(config);

  const findRisk = (id: string, fallbackIdx = 0) =>
    riesgos.find((r) => r.id === id) || riesgos[fallbackIdx];

  const rCalor = findRisk('RSK-PROD-01', 0);
  const rQuimico = findRisk('RSK-PROD-02', 1);
  const rRuido = findRisk('RSK-PROD-03', 2);
  const rBiomec = findRisk('RSK-PROD-04', 3);
  const rMaq = findRisk('RSK-CIRC-02', 4) || findRisk('RSK-PROD-05', 0);
  const rElect = findRisk('RSK-INST-01', 0);
  const rGas = findRisk('RSK-INST-02', 0);
  const rOrden = findRisk('RSK-ALM-ASEO-02', 0);
  const rEmerg = findRisk('RSK-EMERG-02', 0);

  interface Spec2027 {
    num: number;
    mes: number;
    nombre: string;
    descripcion: string;
    criterioAceptacion: string;
    fechaInicio: string;
    fechaLimite: string;
    area?: 'SST' | 'AMBIENTAL' | 'INTEGRAL';
    origen?: 'RIESGO_GTC45' | 'NORMA_OBLIGATORIA' | 'MANUAL';
    objetivoId: string;
    responsableId?: string;
    responsableNombre?: string;
    responsableCargo?: string;
    recursosNecesarios: string;
    tipoRecurso: 'PENDIENTE_VALORACION' | 'RECURSOS_EXISTENTES';
    confirmacionRecursos: string;
    evidenciaRequerida: string;
    observaciones: string;
    riesgo?: RiesgoGTC45Item;
    normaOficial?: string;
    normaArticulos?: string;
    requisitoObligatorioId?: string;
    planMejoraRiesgoId?: string;
    esPlanEmergencias?: boolean;
    capacitacionNombre?: string;
    formatoId?: string;
    formatoNombre?: string;
    reprogramacionOrigen?: {
      anioOrigen: number;
      codigoOriginal: string;
      fechaInicioOriginal: string;
      fechaLimiteOriginal: string;
      motivo: string;
    };
  }

  const specs: Spec2027[] = [
    // ENERO (1–3)
    {
      num: 1,
      mes: 1,
      nombre: 'Revisión y actualización de la matriz de riesgos',
      descripcion:
        'Revisar con el equipo cada puesto de trabajo (selección, pelado, fritura, empaque, bodega y ruta) para confirmar qué peligros siguen presentes y actualizar la Matriz de Riesgos GTC 45.',
      criterioAceptacion:
        'Matriz GTC 45 revisada y actualizada para los 10 trabajadores, con registro de participación y visto bueno de Andrea Orjuela – Gerente.',
      fechaInicio: '2027-01-11',
      fechaLimite: '2027-01-22',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Tiempo del responsable SST, equipo de planta y plataforma digital actual.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes; disponibilidad horaria por confirmar en enero 2027.',
      evidenciaRequerida: 'Matriz GTC 45 actualizada y lista de asistencia de revisión con trabajadores.',
      observaciones:
        'Reprogramada desde la vigencia 2026 (sin ejecución confirmada a noviembre de 2026). Punto de partida del año 2027.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.15',
      requisitoObligatorioId: 'REQ-1072-MATRIZ-RIESGOS',
      formatoId: 'fmt-reporte-incidentes-condiciones',
      formatoNombre: 'Reporte de condiciones inseguras e incidentes',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-01',
        fechaInicioOriginal: '2026-01-12',
        fechaLimiteOriginal: '2026-02-15',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reprogramada al inicio de 2027.',
      },
    },
    {
      num: 2,
      mes: 1,
      nombre: 'Identificación de necesidades',
      descripcion:
        'Hacer un recorrido sencillo con Gerencia y planta para anotar qué elementos de protección, señalización, arreglos de máquinas o compras se necesitan realmente en 2027 y pedir cotizaciones.',
      criterioAceptacion:
        'Lista clara de necesidades prioritarias de la planta valorada y entregada a Andrea Orjuela – Gerente.',
      fechaInicio: '2027-01-18',
      fechaLimite: '2027-01-27',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Tiempo de revisión en planta y cotizaciones de proveedores locales.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Con este levantamiento se valorará el presupuesto 2027 para aprobación de Gerencia.',
      evidenciaRequerida: 'Listado firmado de necesidades priorizadas y cotizaciones de respaldo.',
      observaciones: 'Permite definir presupuestos reales antes de iniciar compras en planta.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.8 y 2.2.4.6.17',
      requisitoObligatorioId: 'REQ-1072-POLITICA',
    },
    {
      num: 3,
      mes: 1,
      nombre: 'Organización de documentos y formatos',
      descripcion:
        'Organizar en carpeta física y digital los formatos en Word y registros que usarán los trabajadores en 2027 (inspecciones, entrega de EPP, capacitaciones, químicos y emergencias).',
      criterioAceptacion:
        'Carpeta ordenada de formatos vigentes en planta y copia digital lista para usar durante el año.',
      fechaInicio: '2027-01-22',
      fechaLimite: '2027-01-30',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Carpetas, impresiones básicas de formatos y archivo digital actual.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Costo de papelería e impresión pendiente de valoración en enero 2027.',
      evidenciaRequerida: 'Foto o listado de formatos impresos y carpeta de soportes organizada.',
      observaciones: 'Conecta directamente con los formatos editables de Planes de Mejora y Emergencias.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.12 (Documentación)',
      formatoId: 'fmt-registro-capacitacion-riesgos',
      formatoNombre: 'Formatos de inspección y capacitación SST',
    },

    // FEBRERO (4–7)
    {
      num: 4,
      mes: 2,
      nombre: 'Inspección de maquinaria',
      descripcion:
        'Revisar una por una la peladora, rebanadora, freidoras y selladora para comprobar que sus tapas protectoras estén fijas, tornillos completos y botones de parada funcionando.',
      criterioAceptacion:
        'Formato de inspección de maquinaria diligenciado por completo y reporte de ajustes necesarios.',
      fechaInicio: '2027-02-01',
      fechaLimite: '2027-02-12',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-pelado',
      responsableNombre: 'Operario de Pelado',
      responsableCargo: 'Operario de Pelado',
      recursosNecesarios: 'Tiempo de inspección visual y tornillería o ajuste mecánico si se detecta falla.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Inspección con tiempo interno; posibles repuestos pendientes de valoración.',
      evidenciaRequerida: 'Formato de inspección de maquinaria y atrapamiento diligenciado con fotos.',
      observaciones: 'Enlazada al Plan de Mejora contra atrapamientos.',
      riesgo: rMaq,
      planMejoraRiesgoId: 'plan-mejora-atrapamiento',
      formatoId: 'fmt-inspeccion-maquinaria-atrapamiento',
      formatoNombre: 'Lista de chequeo de seguridad en máquinas',
    },
    {
      num: 5,
      mes: 2,
      nombre: 'Revisión de riesgos eléctricos',
      descripcion:
        'Revisar visualmente cables, clavijas, tomas y frente de tableros eléctricos en zonas húmedas (sin abrir cajas de tacos) y programar electricista certificado si falta alguna tapa o arreglo.',
      criterioAceptacion:
        'Lista de chequeo eléctrica diligenciada, tableros despejados y solicitud de arreglo técnico si aplica.',
      fechaInicio: '2027-02-08',
      fechaLimite: '2027-02-18',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Señalización de tablero eléctrico y servicio de electricista certificado si hay hallazgos.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Valor del electricista pendiente de cotización si la inspección encuentra fallas.',
      evidenciaRequerida: 'Formato de revisión eléctrica diligenciado y fotos de tableros libres.',
      observaciones: 'Ningún trabajador sin formación eléctrica debe abrir tableros ni empalmar cables.',
      riesgo: rElect,
      planMejoraRiesgoId: 'plan-mejora-riesgo_electrico',
      formatoId: 'fmt-inspeccion-electrica',
      formatoNombre: 'Lista de chequeo visual eléctrica',
    },
    {
      num: 6,
      mes: 2,
      nombre: 'Inspección de conexiones de gas',
      descripcion:
        'Revisar visualmente válvulas, mangueras y llave principal de corte de gas en freidoras, despejar accesos y verificar mantenimiento con técnico autorizado en gas si se requiere.',
      criterioAceptacion:
        'Formato de chequeo de gas diligenciado, llave general señalizada y confirmación técnica vigente.',
      fechaInicio: '2027-02-12',
      fechaLimite: '2027-02-22',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-frito',
      responsableNombre: 'Operario de Frito',
      responsableCargo: 'Operario de Frito',
      recursosNecesarios: 'Señalización de llave de corte rápido y revisión de técnico de gas si se requiere.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Costo de revisión técnica de gas pendiente de valoración según proveedor.',
      evidenciaRequerida: 'Formato de inspección de gas firmado y foto de la llave principal libre y señalizada.',
      observaciones: 'Enlazada al Plan de Mejora de fuga de gas.',
      riesgo: rGas,
      planMejoraRiesgoId: 'plan-mejora-fuga_gas',
      formatoId: 'fmt-inspeccion-gas',
      formatoNombre: 'Lista de chequeo de conexiones de gas',
    },
    {
      num: 7,
      mes: 2,
      nombre: 'Identificación de condiciones inseguras',
      descripcion:
        'Recorrido participativo por toda la planta y bodega para que los trabajadores reporten pisos lisos, cables sueltos, obstáculos o fallas antes de que causen un accidente.',
      criterioAceptacion:
        'Registro de condiciones inseguras diligenciado con responsables y fechas de solución.',
      fechaInicio: '2027-02-18',
      fechaLimite: '2027-02-27',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Tiempo del Vigía/COPASST y formato de reporte de condiciones inseguras.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes del equipo en planta (por confirmar horario).',
      evidenciaRequerida: 'Formato de reporte de incidentes y condiciones inseguras firmado con fotos.',
      observaciones: 'Cumple con la participación mensual de trabajadores y Vigía/COPASST.',
      normaOficial: 'Resolución 2013 de 1986 / Decreto 1072 de 2015',
      normaArticulos: 'Art. 7 Res. 2013/1986',
      requisitoObligatorioId: 'REQ-2013-COPASST',
      formatoId: 'fmt-reporte-incidentes-condiciones',
      formatoNombre: 'Formato de reporte de condiciones inseguras',
    },

    // MARZO (8–10)
    {
      num: 8,
      mes: 3,
      nombre: 'Organización y aseo',
      descripcion:
        'Jornada de orden y limpieza en áreas de selección, pelado, fritura, empaque y trampa de grasas, asegurando pasillos libres y uso del aviso de piso húmedo.',
      criterioAceptacion:
        'Lista de chequeo de orden y aseo al día, pasillos despejados y limpieza ambiental registrada.',
      fechaInicio: '2027-03-01',
      fechaLimite: '2027-03-12',
      area: 'INTEGRAL',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-03',
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      recursosNecesarios: 'Implementos de aseo, aviso de piso húmedo y entrega segura de ACU/grasas.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Insumos de aseo y señalización de piso húmedo pendientes de confirmar.',
      evidenciaRequerida: 'Lista de chequeo de orden y aseo firmada y fotos de zonas despejadas.',
      observaciones: 'Conecta con el Plan de Mejora de orden y aseo y cuidado ambiental de planta.',
      riesgo: rOrden,
      normaOficial: 'Resolución 0631 de 2015 / Resolución 316 de 2018',
      requisitoObligatorioId: 'REQ-0631-TRAMPA-GRASAS',
      planMejoraRiesgoId: 'plan-mejora-orden_aseo',
      capacitacionNombre: 'Orden, limpieza inmediata y prevención de caídas en planta',
      formatoId: 'fmt-inspeccion-orden-aseo',
      formatoNombre: 'Lista de chequeo de orden y aseo',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-08',
        fechaInicioOriginal: '2026-11-01',
        fechaLimiteOriginal: '2026-12-20',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reorganizada en marzo 2027.',
      },
    },
    {
      num: 9,
      mes: 3,
      nombre: 'Identificación de productos químicos',
      descripcion:
        'Hacer la lista real de todos los desengrasantes, jabones y desinfectantes usados en planta, pedir sus Fichas de Seguridad (FDS) al proveedor y etiquetar bien cada envase.',
      criterioAceptacion:
        'Inventario real de químicos lleno, 100% de envases con etiqueta clara (cero botellas de bebidas) y FDS en carpeta.',
      fechaInicio: '2027-03-08',
      fechaLimite: '2027-03-20',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-seleccion',
      responsableNombre: 'Operario de Selección',
      responsableCargo: 'Operario de Selección',
      recursosNecesarios: 'Impresión de etiquetas resistentes al agua, carpeta para FDS y guantes largos de nitrilo.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Costo de etiquetas e implementos pendiente de valoración con Gerencia.',
      evidenciaRequerida: 'Inventario real de químicos diligenciado, carpeta FDS y fotos de envases etiquetados.',
      observaciones: 'Reprogramada de 2026 a marzo 2027. Enlazada al Plan de Mejora de productos químicos.',
      riesgo: rQuimico,
      planMejoraRiesgoId: 'plan-mejora-productos_quimicos',
      capacitacionNombre: 'Uso seguro y etiquetado de productos de limpieza y desinfección',
      formatoId: 'fmt-inventario-quimicos',
      formatoNombre: 'Inventario real y rotulado de productos químicos',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-03',
        fechaInicioOriginal: '2026-06-01',
        fechaLimiteOriginal: '2026-07-31',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reprogramada a marzo 2027.',
      },
    },
    {
      num: 10,
      mes: 3,
      nombre: 'Revisión de almacenamiento',
      descripcion:
        'Verificar estanterías, altura segura de cajas y canastillas (máximo 1.50 m), almacenamiento separado de químicos vs. alimentos y ubicación segura del aceite usado (ACU).',
      criterioAceptacion:
        'Bodega y zona de almacenamiento ordenadas sin riesgo de caída de objetos ni mezcla de químicos con insumos.',
      fechaInicio: '2027-03-18',
      fechaLimite: '2027-03-30',
      area: 'INTEGRAL',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-03',
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      recursosNecesarios: 'Tiempo de revisión del equipo y rótulos de separación bodega/químicos/ACU.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Pendiente confirmar si se requieren estibas o señalización adicional.',
      evidenciaRequerida: 'Fotos del almacenamiento organizado y lista de verificación firmada.',
      observaciones: 'Asegura almacenamiento separado de alimentos, químicos de limpieza y aceite usado.',
      normaOficial: 'Resolución 316 de 2018 / Resolución 2674 de 2013',
      requisitoObligatorioId: 'REQ-316-ACU-MENSUAL',
      formatoId: 'fmt-inspeccion-orden-aseo',
      formatoNombre: 'Verificación de orden y almacenamiento seguro',
    },

    // ABRIL (11–12)
    {
      num: 11,
      mes: 4,
      nombre: 'Capacitación sobre riesgo biomecánico',
      descripcion:
        'Charla práctica de 20 minutos para todo el personal sobre cómo evitar dolores en espalda, hombros y muñecas durante el pelado, selección, empaque y cargue en ruta.',
      criterioAceptacion:
        '10 trabajadores asistentes con lista de asistencia y evaluación corta de comprensión.',
      fechaInicio: '2027-04-05',
      fechaLimite: '2027-04-16',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Guía de capacitación del sistema y 20 minutos de jornada (o apoyo gratuito ARL).',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa material propio de la herramienta; horario por confirmar con producción.',
      evidenciaRequerida: 'Lista de asistencia firmada y evaluación corta resuelta por el equipo.',
      observaciones: 'Enlazada al Plan de Mejora de riesgo biomecánico.',
      riesgo: rBiomec,
      planMejoraRiesgoId: 'plan-mejora-biomecanico',
      capacitacionNombre: 'Cuidado de la espalda, muñecas y pausas activas en planta y reparto',
      formatoId: 'fmt-registro-capacitacion-riesgos',
      formatoNombre: 'Registro de capacitación y evaluación sencilla',
    },
    {
      num: 12,
      mes: 4,
      nombre: 'Orientación sobre posturas y manipulación de cargas',
      descripcion:
        'Práctica en puesto de trabajo: levantar cajas doblando rodillas, respetar pesos máximos (25 kg hombres / 12.5 kg mujeres), usar carretilla y revisar pausas activas y tapetes.',
      criterioAceptacion:
        'Lista de chequeo ergonómica aplicada en planta y rutina diaria de pausas activas acordada.',
      fechaInicio: '2027-04-19',
      fechaLimite: '2027-04-29',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-empaque',
      responsableNombre: 'Operario de Empaque',
      responsableCargo: 'Operario de Empaque',
      recursosNecesarios: 'Carretilla existente y valoración de tapetes antifatiga si Gerencia los aprueba.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Práctica con equipo actual; compra de tapetes pendiente de valoración y aprobación.',
      evidenciaRequerida: 'Formato de revisión ergonómica y pausas activas diligenciado con fotos.',
      observaciones: 'Reprogramada desde 2026 para ejecución realista en abril 2027.',
      riesgo: rBiomec,
      planMejoraRiesgoId: 'plan-mejora-biomecanico',
      formatoId: 'fmt-ergonomia-pausas',
      formatoNombre: 'Chequeo de posturas, cargas y pausas activas',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-05',
        fechaInicioOriginal: '2026-08-01',
        fechaLimiteOriginal: '2026-09-30',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reprogramada a abril 2027.',
      },
    },

    // MAYO (13–15)
    {
      num: 13,
      mes: 5,
      nombre: 'Capacitación sobre calor',
      descripcion:
        'Explicación sencilla a operarios de fritura y apoyo sobre riesgos de aceite a 180 °C, hidratación cada hora, escurrido previo de producto y uso obligatorio de careta, delantal y guantes térmicos.',
      criterioAceptacion:
        'Personal de fritura y planta capacitado con lista de asistencia y chequeo de zona de freidoras.',
      fechaInicio: '2027-05-03',
      fechaLimite: '2027-05-12',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-frito',
      responsableNombre: 'Operario de Frito',
      responsableCargo: 'Operario de Frito',
      recursosNecesarios: 'Guía de capacitación de calor, punto de agua potable y chequeo de extractores.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Charla interna con recursos existentes; reposición de EPP térmico se revisa en junio.',
      evidenciaRequerida: 'Lista de asistencia firmada y lista de chequeo de calor en freidoras.',
      observaciones: 'Reprogramada desde 2026 y conectada con el Plan de Mejora de calor extremo.',
      riesgo: rCalor,
      planMejoraRiesgoId: 'plan-mejora-calor_extremo',
      capacitacionNombre: 'Trabajo seguro frente al calor y prevención de quemaduras en freidoras',
      formatoId: 'fmt-inspeccion-calor-freidoras',
      formatoNombre: 'Inspección de calor y freidoras',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-02',
        fechaInicioOriginal: '2026-03-01',
        fechaLimiteOriginal: '2026-04-30',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reprogramada a mayo 2027.',
      },
    },
    {
      num: 14,
      mes: 5,
      nombre: 'Capacitación sobre ruido',
      descripcion:
        'Charla práctica sobre cuidado del oído en zona de peladora, rebanadora y extractora: cómo limpiar y ponerse bien los tapaoídos y gestionar apoyo de la ARL para confirmar decibeles.',
      criterioAceptacion:
        'Asistencia firmada, lista de chequeo auditiva y solicitud o resultado de sonometría con ARL.',
      fechaInicio: '2027-05-12',
      fechaLimite: '2027-05-21',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-pelado',
      responsableNombre: 'Operario de Pelado',
      responsableCargo: 'Operario de Pelado',
      recursosNecesarios: 'Material de capacitación, tapaoídos limpios y gestión sin costo ante ARL.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Pendiente confirmar cobertura de sonometría con ARL o costo de proveedor.',
      evidenciaRequerida: 'Registro de asistencia, chequeo auditivo y soporte de gestión con ARL.',
      observaciones: 'Reprogramada desde 2026. Enlazada al Plan de Mejora de ruido constante.',
      riesgo: rRuido,
      normaOficial: 'Resolución 909 de 2008 / Resolución 0627 de 2006 / Ley 2450 de 2025',
      requisitoObligatorioId: 'REQ-909-EXTRACCION-RUIDO',
      planMejoraRiesgoId: 'plan-mejora-ruido_constante',
      capacitacionNombre: 'Cuidado del oído y uso correcto de tapaoídos en zona de máquinas',
      formatoId: 'fmt-inspeccion-ruido-auditiva',
      formatoNombre: 'Chequeo de ruido y protección auditiva',
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-04',
        fechaInicioOriginal: '2026-09-01',
        fechaLimiteOriginal: '2026-10-30',
        motivo: 'Sin ejecución confirmada a noviembre de 2026; reprogramada a mayo 2027.',
      },
    },
    {
      num: 15,
      mes: 5,
      nombre: 'Prevención de atrapamientos',
      descripcion:
        'Capacitación práctica sobre la regla de oro en máquinas: apagar, desconectar y esperar que paren por completo antes de limpiar o destrabar, uso de empujador y prohibición de anillos/ropa suelta.',
      criterioAceptacion:
        'Todo el equipo capacitado con demostración en máquina desconectada y resguardos verificados.',
      fechaInicio: '2027-05-20',
      fechaLimite: '2027-05-29',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-operario-pelado',
      responsableNombre: 'Operario de Pelado',
      responsableCargo: 'Operario de Pelado',
      recursosNecesarios: 'Guía práctica en planta y tarjetas de aviso "No encender - En limpieza".',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes en planta; tarjetas de aviso por confirmar.',
      evidenciaRequerida: 'Lista de asistencia firmada y chequeo de resguardos de máquinas.',
      observaciones: 'Complementa la inspección de febrero reforzando hábitos seguros diarios.',
      riesgo: rMaq,
      planMejoraRiesgoId: 'plan-mejora-atrapamiento',
      capacitacionNombre: 'Reglas de oro para trabajar y limpiar máquinas sin atrapamientos ni cortes',
      formatoId: 'fmt-inspeccion-maquinaria-atrapamiento',
      formatoNombre: 'Chequeo de atrapamientos y resguardos',
    },

    // JUNIO (16–17)
    {
      num: 16,
      mes: 6,
      nombre: 'Revisión de elementos de protección personal',
      descripcion:
        'Revisar puesto por puesto qué elementos de protección personal (guantes térmicos, caretas, tapaoídos, guantes de nitrilo, gafas, calzado antideslizante) están desgastados o faltan por reponer.',
      criterioAceptacion:
        'Inventario completo de estado de EPP de los 10 trabajadores con solicitud clara de reposición.',
      fechaInicio: '2027-06-02',
      fechaLimite: '2027-06-14',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Revisión física de EPP actuales y cotización de reposiciones faltantes.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Valor de compra de reposiciones pendiente de valoración y aprobación de Gerencia.',
      evidenciaRequerida: 'Listado de revisión de estado de EPP y requerimiento presentado a Gerencia.',
      observaciones: 'Permite comprar únicamente lo que hace falta según desgaste real.',
      riesgo: rCalor,
      normaOficial: 'Resolución 0312 de 2019 / Decreto 1072 Art. 2.2.4.6.24',
      formatoId: 'fmt-entrega-epp',
      formatoNombre: 'Control y entrega de EPP',
    },
    {
      num: 17,
      mes: 6,
      nombre: 'Registro de entrega y seguimiento',
      descripcion:
        'Entregar los elementos de protección aprobados a cada trabajador, explicar cómo cuidarlos y dejar firmada la planilla individual de entrega y seguimiento de uso en planta.',
      criterioAceptacion:
        'Planilla de entrega de EPP firmada por cada trabajador que recibió dotación y verificación de uso.',
      fechaInicio: '2027-06-15',
      fechaLimite: '2027-06-28',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Formato de entrega de EPP y reposiciones aprobadas por Andrea Orjuela – Gerente.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Sujeto a compra aprobada según la revisión de inicios de junio.',
      evidenciaRequerida: 'Planilla de entrega de EPP firmada con fecha y verificación de uso.',
      observaciones: 'Soporte directo del Estándar 7 de la Resolución 0312 de 2019.',
      normaOficial: 'Decreto 1072 de 2015 / Resolución 0312 de 2019',
      formatoId: 'fmt-entrega-epp',
      formatoNombre: 'Registro de entrega y seguimiento de EPP',
    },

    // JULIO (18–20)
    {
      num: 18,
      mes: 7,
      nombre: 'Elaboración y revisión del Plan de Emergencias',
      descripcion:
        'Completar y verificar en sitio los datos pendientes del Plan de Emergencias de Frikaz S.A.S. (dirección verificada, teléfonos, inventario real de equipos, salidas y punto de encuentro) y someterlo a revisión de Gerencia.',
      criterioAceptacion:
        'Plan de Emergencias completado con datos verificados en planta y revisado por Andrea Orjuela – Gerente.',
      fechaInicio: '2027-07-02',
      fechaLimite: '2027-07-14',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Tiempo de verificación en planta y módulo Plan de Emergencias de la herramienta.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa la plantilla ya creada en PLAN ANUAL; actualización en planta por confirmar.',
      evidenciaRequerida: 'Documento de Plan de Emergencias actualizado en Word/PDF con datos reales.',
      observaciones: 'Conectado directamente con la sección PLAN DE EMERGENCIAS.',
      riesgo: rEmerg,
      normaOficial: 'Decreto 1072 de 2015 / NTC 2885',
      normaArticulos: 'Art. 2.2.4.6.25',
      requisitoObligatorioId: 'REQ-NTC2885-EMERGENCIAS',
      planMejoraRiesgoId: 'plan-mejora-situaciones_emergencia',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-amenazas-vulnerabilidad',
      formatoNombre: 'Identificación de amenazas y vulnerabilidad',
    },
    {
      num: 19,
      mes: 7,
      nombre: 'Organización de responsabilidades',
      descripcion:
        'Asignar con nombre propio y suplente los 5 roles sencillos de emergencia entre los 10 trabajadores (coordinar, activar alarma, guiar salida, pasar lista afuera y llamar al 123/ARL).',
      criterioAceptacion:
        'Tabla de roles de emergencia diligenciada con titular y suplente aceptados por el equipo.',
      fechaInicio: '2027-07-12',
      fechaLimite: '2027-07-21',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Reunión corta con los 10 trabajadores y cartelera de roles en planta.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes; impresión de cartelera pendiente por confirmar.',
      evidenciaRequerida: 'Cuadro de roles con nombres y suplentes firmado y publicado en planta.',
      observaciones: 'Pensado para un equipo real de 10 personas sin brigadas irrealizables.',
      esPlanEmergencias: true,
      normaOficial: 'Decreto 1072 de 2015 Art. 2.2.4.6.25',
    },
    {
      num: 20,
      mes: 7,
      nombre: 'Socialización inicial',
      descripcion:
        'Explicar en palabras sencillas a todo el personal qué hacer y qué NO hacer ante una emergencia en planta, mostrar la alarma, las salidas y caminar juntos hasta el punto de encuentro.',
      criterioAceptacion:
        'Los 10 trabajadores informados con lista de asistencia firmada y recorrido hecho.',
      fechaInicio: '2027-07-22',
      fechaLimite: '2027-07-30',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: '30 minutos de jornada con el equipo y guía de socialización.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes de la empresa.',
      evidenciaRequerida: 'Formato de asistencia a socialización del Plan de Emergencias firmado.',
      observaciones: 'Base previa obligatoria antes de las capacitaciones específicas de agosto.',
      esPlanEmergencias: true,
      capacitacionNombre: 'Socialización del Plan de Emergencias y roles de los 10 trabajadores',
      formatoId: 'fmt-emg-asistencia-capacitacion',
      formatoNombre: 'Asistencia a capacitación de emergencias',
    },

    // AGOSTO (21–23)
    {
      num: 21,
      mes: 8,
      nombre: 'Capacitación sobre incendios',
      descripcion:
        'Capacitación práctica sobre prevención de incendios en freidoras y empaque: por qué jamás echar agua al aceite en llamas, uso de extintor Clase K solo si es conato inicial y cuándo evacuar.',
      criterioAceptacion:
        'Equipo capacitado con asistencia firmada, evaluación corta y ubicación clara de cada extintor.',
      fechaInicio: '2027-08-02',
      fechaLimite: '2027-08-12',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Guía del Plan de Emergencias y apoyo ARL / Bomberos si está disponible.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Capacitación interna sin costo; práctica con recarga o apoyo externo por confirmar.',
      evidenciaRequerida: 'Lista de asistencia y evaluación corta de comprensión firmadas.',
      observaciones: 'Enlazada al programa de emergencias.',
      riesgo: rEmerg,
      normaOficial: 'NTC 2885 / Decreto 1072 de 2015',
      esPlanEmergencias: true,
      capacitacionNombre: 'Actuación segura ante incendios en freidoras y uso básico de extintores',
      formatoId: 'fmt-emg-asistencia-capacitacion',
      formatoNombre: 'Registro de capacitación ante incendios',
    },
    {
      num: 22,
      mes: 8,
      nombre: 'Capacitación sobre fugas de gas',
      descripcion:
        'Qué hacer si huele a gas (ventilar, cerrar llave general si es seguro, evacuar) y qué NO hacer jamás (no prender luces, celulares, extractores ni buscar fugas con fuego).',
      criterioAceptacion:
        'Todo el equipo conoce la ubicación de la llave de gas y los pasos seguros sin chispas.',
      fechaInicio: '2027-08-12',
      fechaLimite: '2027-08-21',
      area: 'SST',
      origen: 'RIESGO_GTC45',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Guía práctica de 20 minutos en planta.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes (tiempo interno en planta).',
      evidenciaRequerida: 'Registro de asistencia y preguntas de verificación diligenciadas.',
      observaciones: 'Conecta con el Plan de Mejora de fuga de gas y el Plan de Emergencias.',
      riesgo: rGas,
      planMejoraRiesgoId: 'plan-mejora-fuga_gas',
      esPlanEmergencias: true,
      capacitacionNombre: 'Actuación ante fugas de gas y emergencias eléctricas',
      formatoId: 'fmt-emg-asistencia-capacitacion',
      formatoNombre: 'Asistencia a capacitación sobre fugas de gas',
    },
    {
      num: 23,
      mes: 8,
      nombre: 'Orientación sobre evacuación y actuación ante emergencias',
      descripcion:
        'Repaso práctico de salida ordenada (sin correr ni devolverse), primeros auxilios básicos en quemaduras/cortes y no confrontación ante robos o sismos.',
      criterioAceptacion:
        'Personal orientado en ruta de salida, conteo en punto de encuentro y números de ayuda externa.',
      fechaInicio: '2027-08-21',
      fechaLimite: '2027-08-31',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: '20 minutos de práctica guiada y cartelera de teléfonos de emergencia.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes; cartelera pendiente de actualización si cambia algún teléfono.',
      evidenciaRequerida: 'Lista de asistencia firmada y registro fotográfico del recorrido.',
      observaciones: 'Prepara directamente al equipo antes de la inspección de septiembre y simulacro de octubre.',
      esPlanEmergencias: true,
      capacitacionNombre: 'Evacuación ordenada en planta y punto de encuentro',
      formatoId: 'fmt-emg-asistencia-capacitacion',
      formatoNombre: 'Asistencia a orientación de evacuación',
    },

    // SEPTIEMBRE (24–26)
    {
      num: 24,
      mes: 9,
      nombre: 'Inspección de equipos de emergencia',
      descripcion:
        'Revisar físicamente en planta extintores (Clase K y ABC, presión y fecha de recarga), botiquín de primeros auxilios, camilla, pito/alarma y kit básico de derrames.',
      criterioAceptacion:
        'Formato de inspección de equipos de emergencia diligenciado con estado real y recargas programadas.',
      fechaInicio: '2027-09-01',
      fechaLimite: '2027-09-10',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Inspección en planta; recarga de extintores o reposición de botiquín si se detecta faltante.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Costo de recarga de extintores o insumos de botiquín pendiente de valoración.',
      evidenciaRequerida: 'Formato de inspección de equipos de emergencia firmado y fotos de etiquetas.',
      observaciones: 'Indispensable antes de confirmar condiciones para el simulacro de octubre.',
      normaOficial: 'NTC 2885 / NFPA 10 / Decreto 1072 de 2015',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-inspeccion-recursos',
      formatoNombre: 'Inspección de equipos de emergencia',
    },
    {
      num: 25,
      mes: 9,
      nombre: 'Revisión de rutas de evacuación',
      descripcion:
        'Comprobar que los pasillos de salida estén libres de cajas y bultos, puertas abran fácil sin candados durante el turno, flechas visibles y punto de encuentro seguro.',
      criterioAceptacion:
        'Formato de rutas y salidas diligenciado y corrección de cualquier obstáculo encontrado.',
      fechaInicio: '2027-09-10',
      fechaLimite: '2027-09-20',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Verificación en planta y señalización de salida si falta algún aviso.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Posibles letreros de salida o punto de encuentro pendientes de confirmar.',
      evidenciaRequerida: 'Formato de verificación de rutas y salidas firmado con fotos.',
      observaciones: 'Asegura rutas seguras antes de programar el simulacro.',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-rutas-evacuacion',
      formatoNombre: 'Verificación de rutas, salidas y punto de encuentro',
    },
    {
      num: 26,
      mes: 9,
      nombre: 'Verificación de recursos disponibles',
      descripcion:
        'Confirmar con Andrea Orjuela – Gerente que la planta ya cuenta con los recursos mínimos reales (equipos completos, salidas despejadas, teléfonos verificados y roles asignados) para poder hacer el simulacro.',
      criterioAceptacion:
        'Acta o visto bueno de verificación de condiciones y recursos antes del simulacro de octubre.',
      fechaInicio: '2027-09-20',
      fechaLimite: '2027-09-29',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Revisión conjunta entre Gerencia y Coordinador / Vigía SST.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Verificación administrativa previa con recursos existentes.',
      evidenciaRequerida: 'Acta corta de confirmación de condiciones o registro de pendientes por resolver.',
      observaciones: 'Define si están dadas las condiciones necesarias para realizar el simulacro en octubre.',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-inspeccion-recursos',
      formatoNombre: 'Lista de verificación de recursos disponibles',
    },

    // OCTUBRE (27–28)
    {
      num: 27,
      mes: 10,
      nombre: 'Preparación y realización del simulacro, siempre que existan las condiciones necesarias',
      descripcion:
        'Preparar el guion sencillo (aviso, apagado seguro, salida al punto de encuentro y conteo de los 10 trabajadores) y realizar el simulacro en planta solo si ya existen las condiciones seguras verificadas en septiembre.',
      criterioAceptacion:
        'Simulacro realizado de manera segura con participación del equipo, o reprogramación justificada si falta alguna condición crítica.',
      fechaInicio: '2027-10-04',
      fechaLimite: '2027-10-18',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Alarma o pito operativo, rutas despejadas, guion sencillo y 30 minutos de jornada.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Condicionado a verificación previa de septiembre; sin gasto adicional confirmado.',
      evidenciaRequerida: 'Registro del simulacro, lista de participantes y fotos o evidencia autorizada.',
      observaciones:
        'Solo se ejecuta cuando existan las condiciones necesarias de seguridad, rutas y equipos verificados.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.25 Num. 10',
      requisitoObligatorioId: 'REQ-NTC2885-EMERGENCIAS',
      planMejoraRiesgoId: 'plan-mejora-situaciones_emergencia',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-registro-simulacro',
      formatoNombre: 'Registro y evaluación de simulacro',
    },
    {
      num: 28,
      mes: 10,
      nombre: 'Registro y evaluación de resultados',
      descripcion:
        'Anotar cuánto tardó la evacuación, qué funcionó bien (alarma, salida, conteo de los 10 trabajadores) y qué fallas deben corregirse en el plan post-simulacro.',
      criterioAceptacion:
        'Formato de evaluación del simulacro y mejoras post-simulacro diligenciados y enviados a Gerencia.',
      fechaInicio: '2027-10-19',
      fechaLimite: '2027-10-29',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Formatos de evaluación y mejora post-simulacro y tiempo de análisis del equipo.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes y formatos editables de la herramienta.',
      evidenciaRequerida: 'Evaluación del simulacro y acta de oportunidades de mejora firmadas.',
      observaciones: 'Insumo directo para los hallazgos y acciones de mejora de noviembre.',
      esPlanEmergencias: true,
      formatoId: 'fmt-emg-mejora-post-simulacro',
      formatoNombre: 'Plan de mejora post-simulacro',
    },

    // NOVIEMBRE (29–31)
    {
      num: 29,
      mes: 11,
      nombre: 'Revisión de resultados',
      descripcion:
        'Revisar con Andrea Orjuela – Gerente el avance real de las actividades ejecutadas en 2027, los registros de aceite usado (ACU), trampa de grasas, capacitaciones y presupuesto realmente aprobado/usado.',
      criterioAceptacion:
        'Acta de revisión anual de resultados firmada por Gerencia y Vigía/COPASST.',
      fechaInicio: '2027-11-02',
      fechaLimite: '2027-11-12',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Reunión de revisión por Gerencia con soportes acumulados de enero a octubre.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes de dirección y SST.',
      evidenciaRequerida: 'Informe de revisión de resultados y acta firmada por Gerencia.',
      observaciones: 'Cumple la revisión por la Alta Dirección (Decreto 1072 Art. 2.2.4.6.31).',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.29 al 2.2.4.6.31',
      requisitoObligatorioId: 'REQ-1072-AUDITORIA-DIRECCION',
    },
    {
      num: 30,
      mes: 11,
      nombre: 'Evaluación de hallazgos',
      descripcion:
        'Analizar los problemas, accidentes, casi-accidentes, condiciones inseguras o actividades atrasadas detectadas durante el año (incluyendo resultados de auditoría interna y simulacro).',
      criterioAceptacion:
        'Listado claro de hallazgos priorizados según riesgo y urgencia para la planta.',
      fechaInicio: '2027-11-12',
      fechaLimite: '2027-11-22',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Tiempo de análisis de registros del año 2027.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes del área SST.',
      evidenciaRequerida: 'Informe sencillo de hallazgos y brechas detectadas en 2027.',
      observaciones: 'Se conecta con las fases VERIFICAR y ACTUAR del SG-SST.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.29 y 2.2.4.6.33',
    },
    {
      num: 31,
      mes: 11,
      nombre: 'Organización de acciones correctivas y de mejora',
      descripcion:
        'Convertir los hallazgos evaluados en acciones correctivas, preventivas y de mejora concretas con responsable, fecha y prueba esperada.',
      criterioAceptacion:
        'Acciones correctivas y de mejora registradas en la herramienta y revisadas por Gerencia.',
      fechaInicio: '2027-11-22',
      fechaLimite: '2027-11-30',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-01',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Revisión con responsables de área y aprobación de Andrea Orjuela – Gerente.',
      tipoRecurso: 'PENDIENTE_VALORACION',
      confirmacionRecursos: 'Los costos de nuevas acciones correctivas se valorarán según cada hallazgo.',
      evidenciaRequerida: 'Plan de acciones correctivas y de mejora registrado con responsables y fechas.',
      observaciones: 'Conecta directamente con el apartado ACTUAR y Planes de Mejora por Riesgo.',
      normaOficial: 'Decreto 1072 de 2015',
      normaArticulos: 'Art. 2.2.4.6.33 (Acciones preventivas y correctivas)',
    },

    // DICIEMBRE (32–34)
    {
      num: 32,
      mes: 12,
      nombre: 'Evaluación del Plan Anual',
      descripcion:
        `Evaluar el cumplimiento real de las 34 actividades del Plan Anual 2027 y calificar los ${cantidadEstandares} Estándares Mínimos de la Resolución 0312 de 2019 (${grupo}).`,
      criterioAceptacion:
        `Evaluación del Plan Anual y tabla de ${cantidadEstandares} Estándares Mínimos firmadas por Andrea Orjuela – Gerente.`,
      fechaInicio: '2027-12-01',
      fechaLimite: '2027-12-14',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-gerente-general',
      responsableNombre: 'Andrea Orjuela – Gerente',
      responsableCargo: 'Gerente',
      recursosNecesarios: 'Soportes acumulados 2027 y revisión conjunta entre SST y Gerencia.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes; envío a ARL sin costo adicional.',
      evidenciaRequerida: `Informe de evaluación del Plan Anual 2027 y autoevaluación Res. 0312 firmada.`,
      observaciones: 'Reprogramada desde cierre 2026 para evaluar la vigencia completa de 2027.',
      normaOficial: 'Resolución 0312 de 2019',
      normaArticulos: 'Art. 3, 27 y 28',
      requisitoObligatorioId: `REQ-0312-${cantidadEstandares}`,
      reprogramacionOrigen: {
        anioOrigen: 2026,
        codigoOriginal: 'PA-2026-09',
        fechaInicioOriginal: '2026-12-01',
        fechaLimiteOriginal: '2026-12-22',
        motivo: 'Cierre de vigencia trasladado para evaluar el Plan Anual 2027 completo.',
      },
    },
    {
      num: 33,
      mes: 12,
      nombre: 'Actualización de indicadores',
      descripcion:
        'Cerrar y validar los seis indicadores mínimos de SST (Resolución 0312 Art. 30: accidentalidad, severidad, mortalidad, prevalencia, incidencia y ausentismo) junto con los indicadores del Plan Anual.',
      criterioAceptacion:
        'Consolidado anual 2027 de los 6 indicadores mínimos diligenciado y validado por Gerencia.',
      fechaInicio: '2027-12-10',
      fechaLimite: '2027-12-20',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Registros mensuales de nómina, incapacidades y reportes ARL de 2027.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa registros internos y módulo Indicadores de la herramienta.',
      evidenciaRequerida: 'Consolidado anual 2027 de indicadores validado y exportado.',
      observaciones: 'Asegura medición real únicamente con datos confirmados del año.',
      normaOficial: 'Resolución 0312 de 2019',
      normaArticulos: 'Artículo 30',
    },
    {
      num: 34,
      mes: 12,
      nombre: 'Preparación de la programación del año 2028',
      descripcion:
        'Definir las metas, fechas, responsables y presupuesto preliminar del Plan Anual 2028 teniendo en cuenta las lecciones aprendidas y actividades pendientes de 2027.',
      criterioAceptacion:
        'Borrador organizado del Plan Anual 2028 presentado a Andrea Orjuela – Gerente.',
      fechaInicio: '2027-12-18',
      fechaLimite: '2027-12-29',
      area: 'INTEGRAL',
      origen: 'NORMA_OBLIGATORIA',
      objetivoId: 'obj-2027-02',
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      recursosNecesarios: 'Evaluación de cierre 2027 y reunión de planeación con Gerencia.',
      tipoRecurso: 'RECURSOS_EXISTENTES',
      confirmacionRecursos: 'Usa recursos existentes de cierre anual.',
      evidenciaRequerida: 'Borrador del cronograma 2028 con objetivos y necesidades presentadas.',
      observaciones: 'Deja lista la continuidad ordenada para enero de 2028.',
      normaOficial: 'Decreto 1072 de 2015 / Resolución 0312 de 2019',
      normaArticulos: 'Art. 2.2.4.6.17',
    },
  ];

  const actividades: ActividadPlanAnual[] = specs.map((s) => {
    const code = `PA-2027-${String(s.num).padStart(2, '0')}`;
    const historialCambiosFechas = s.reprogramacionOrigen
      ? [
          {
            id: `hcf-2027-${s.num}`,
            fechaRegistro: '2026-11-23',
            usuario: 'Coordinador / Vigía de SST',
            fechaInicioAnterior: s.reprogramacionOrigen.fechaInicioOriginal,
            fechaLimiteAnterior: s.reprogramacionOrigen.fechaLimiteOriginal,
            fechaInicioNueva: s.fechaInicio,
            fechaLimiteNueva: s.fechaLimite,
            mesesNuevos: [s.mes],
            motivo: s.reprogramacionOrigen.motivo,
          },
        ]
      : [];

    return {
      id: `act-2027-${String(s.num).padStart(2, '0')}`,
      codigo: code,
      nombre: s.nombre,
      descripcion: s.descripcion,
      criterioAceptacion: s.criterioAceptacion,
      area: s.area || 'SST',
      origen: s.origen || (s.riesgo ? 'RIESGO_GTC45' : 'NORMA_OBLIGATORIA'),
      riesgoId: s.riesgo?.id,
      riesgoCodigo: s.riesgo?.codigo || s.riesgo?.id,
      riesgoNivelNR: s.riesgo?.interpretacionNR,
      riesgoCargo: s.riesgo?.cargo || s.riesgo?.cargosExpuestos,
      riesgoProceso: s.riesgo?.proceso,
      riesgoMedidasControl: s.riesgo ? extraerMedidasRiesgo(s.riesgo) : undefined,
      riesgoSnapshot: s.riesgo ? crearRiesgoSnapshot(s.riesgo) : undefined,
      planMejoraRiesgoId: s.planMejoraRiesgoId,
      esPlanEmergencias: s.esPlanEmergencias,
      capacitacionNombre: s.capacitacionNombre,
      formatoId: s.formatoId,
      formatoNombre: s.formatoNombre,
      normaOficial: s.normaOficial,
      normaArticulos: s.normaArticulos,
      requisitoObligatorioId: s.requisitoObligatorioId,
      objetivoEspecificoId: s.objetivoId,
      esRecurrente: false,
      periodicidad: 'UNICA',
      fechaInicio: s.fechaInicio,
      fechaLimite: s.fechaLimite,
      programacionMensual: [s.mes],
      reprogramacionOrigen: s.reprogramacionOrigen
        ? {
            ...s.reprogramacionOrigen,
            fechaRegistro: '2026-11-23',
          }
        : undefined,
      historialCambiosFechas,
      responsableId: s.responsableId || 'cargo-coordinador-vigia-sst',
      responsableNombre: s.responsableNombre || 'Coordinador / Vigía de SST',
      responsableCargo: s.responsableCargo || 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: 'Gerente',
      recursosNecesarios: s.recursosNecesarios,
      tipoRecurso: s.tipoRecurso,
      confirmacionRecursos: s.confirmacionRecursos,
      presupuestoEstimado: 0,
      presupuestoAprobado: 0,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: s.evidenciaRequerida,
      evidencias: [],
      observaciones: s.observaciones,
      historialRevisiones: [
        {
          id: `hr-2027-${s.num}`,
          fecha: '2026-11-23T09:00:00',
          usuario: 'Coordinador / Vigía de SST',
          rol: 'Planificador',
          accion: 'CREADA',
          detalle: s.reprogramacionOrigen
            ? `Programada en el Plan Anual 2027 (reprogramada desde ${s.reprogramacionOrigen.codigoOriginal} de 2026). Presupuesto ejecutado inicial: $0.`
            : `Programada en el Plan Anual 2027 (enero–diciembre) en estado Por hacer. Presupuesto ejecutado inicial: $0.`,
        },
      ],
    };
  });

  return {
    id: 'plan-vigencia-2027',
    vigencia: 2027,
    titulo: 'Plan Anual de Seguridad, Salud y Ambiente 2027 (Enero – Diciembre)',
    objetivoGeneral:
      'Ejecutar de manera realista y progresiva entre enero y diciembre de 2027 las 34 actividades de prevención, control de riesgos, capacitación, preparación ante emergencias y cierre SG-SST para los trabajadores de Frikaz S.A.S., con presupuesto ejecutado inicial en $0 y seguimiento verificado por Gerencia.',
    fechaElaboracion: '2026-11-23',
    responsableId: 'cargo-coordinador-vigia-sst',
    responsableNombre: 'Coordinador / Vigía de SST',
    aprobadorNombre: NOMBRE_GERENTE_OFICIAL,
    estadoAprobacion: 'BORRADOR',
    presupuestoGeneralAprobado: 0,
    empresaSnapshot: construirEmpresaSnapshot(config),
    objetivosEspecificos: objetivos,
    indicadores,
    actividades,
    solicitudesRevision: [],
    notificacionesEnviadas: [],
    historialCambios: [
      {
        id: 'h-2027-01',
        fechaHora: '2026-11-23T09:00:00',
        usuario: 'Coordinador / Vigía de SST',
        accion: 'Reorganización Plan Anual 2027',
        detalle: `Se creó la programación realista de enero a diciembre de 2027 con 34 actividades distribuidas por mes, presupuesto ejecutado inicial de $0 y trazabilidad de actividades reprogramadas desde 2026 (${config.numeroTrabajadores} trabajadores, ${grupo}).`,
      },
    ],
  };
}

// ============================================================================
// PERSISTENCIA 2027 ÚNICA + COPIA DE SEGURIDAD HISTÓRICA (< 2027)
// ============================================================================

function deduplicarActividadesPlan(actividades: ActividadPlanAnual[]): ActividadPlanAnual[] {
  const vistosIds = new Set<string>();
  const vistosCodigos = new Set<string>();
  const resultado: ActividadPlanAnual[] = [];
  actividades.forEach((act) => {
    const idKey = act.id;
    const codKey = (act.codigo || '').trim().toUpperCase();
    if (vistosIds.has(idKey)) return;
    if (codKey && vistosCodigos.has(codKey)) return;
    vistosIds.add(idKey);
    if (codKey) vistosCodigos.add(codKey);
    resultado.push(act);
  });
  return resultado;
}

export function getBackupHistoricoPlanAnual(): Record<number, PlanAnualVigencia> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANES_HISTORICO_BACKUP);
    if (raw) {
      return JSON.parse(raw) as Record<number, PlanAnualVigencia>;
    }
  } catch (err) {
    console.error('Error leyendo copia de seguridad histórica del Plan Anual:', err);
  }
  return {};
}

function guardarBackupHistoricoPlanes(historicos: Record<number, PlanAnualVigencia>): void {
  try {
    const existente = getBackupHistoricoPlanAnual();
    const combinado: Record<number, PlanAnualVigencia> = { ...existente };
    Object.entries(historicos).forEach(([anioKey, plan]) => {
      const anio = Number(anioKey);
      if (anio !== 2027 && plan) {
        combinado[anio] = plan;
      }
    });
    if (Object.keys(combinado).length > 0) {
      localStorage.setItem(STORAGE_KEY_PLANES_HISTORICO_BACKUP, JSON.stringify(combinado));
    }
  } catch (err) {
    console.error('Error guardando copia de seguridad histórica del Plan Anual:', err);
  }
}

function normalizarPlan2027Unico(plan2027: PlanAnualVigencia): PlanAnualVigencia {
  return {
    ...plan2027,
    vigencia: 2027,
    presupuestoGeneralAprobado: plan2027.presupuestoGeneralAprobado ?? 0,
    aprobadorNombre:
      plan2027.aprobadorNombre === 'Gerente General (Representante Legal)' ||
      plan2027.aprobadorNombre === 'Gerente General'
        ? NOMBRE_GERENTE_OFICIAL
        : plan2027.aprobadorNombre || NOMBRE_GERENTE_OFICIAL,
    actividades: deduplicarActividadesPlan(plan2027.actividades || []).map((a) => ({
      ...a,
      aprobadorNombre:
        a.aprobadorNombre === 'Gerente General (Representante Legal)' ||
        a.aprobadorNombre === 'Gerente General'
          ? NOMBRE_GERENTE_OFICIAL
          : a.aprobadorNombre || NOMBRE_GERENTE_OFICIAL,
      aprobadorCargo: a.aprobadorCargo === 'Gerente General' ? 'Gerente' : a.aprobadorCargo,
    })),
  };
}

export function loadAllVigencias(): Record<number, PlanAnualVigencia> {
  const config = getCaracterizacionActual();
  const riesgos = loadStoredRisks();
  const normas = getPhvaNorms();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANES);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<number, PlanAnualVigencia>;
      if (parsed && Object.keys(parsed).length > 0) {
        const historicosDetectados: Record<number, PlanAnualVigencia> = {};
        Object.entries(parsed).forEach(([anioKey, planVal]) => {
          const anio = Number(anioKey);
          if (anio !== 2027 && planVal) {
            historicosDetectados[anio] = planVal;
          }
        });

        // Asegurar copia de seguridad de años anteriores antes de dejar únicamente 2027 activo
        if (Object.keys(historicosDetectados).length > 0) {
          guardarBackupHistoricoPlanes(historicosDetectados);
        } else if (Object.keys(getBackupHistoricoPlanAnual()).length === 0) {
          guardarBackupHistoricoPlanes({
            2025: buildPlan2025Seed(config, riesgos),
            2026: buildPlan2026Seed(config, riesgos),
          });
        }

        let plan2027 = parsed[2027];
        let dirty = Object.keys(parsed).some((k) => Number(k) !== 2027);

        if (!plan2027) {
          plan2027 = buildPlan2027Seed(config, riesgos);
          plan2027.solicitudesRevision = detectarImpactosEnPlan(plan2027, riesgos, config, normas);
          dirty = true;
        }

        if (!localStorage.getItem(GERENTE_GATE_FLAG_PLAN)) {
          const planHasRealGerenteReview = Boolean(plan2027.revisionGerente);
          const normPlanEst = normalizarEstadoEstandar(plan2027.estadoAprobacion);
          const resetEstadoPlan =
            !planHasRealGerenteReview &&
            (normPlanEst === 'Aprobado' || normPlanEst === 'Cumplido')
              ? 'EN_REVISION'
              : plan2027.estadoAprobacion;
          plan2027 = {
            ...plan2027,
            estadoAprobacion: resetEstadoPlan,
            fechaAprobacion: planHasRealGerenteReview ? plan2027.fechaAprobacion : undefined,
          };
          localStorage.setItem(GERENTE_GATE_FLAG_PLAN, '1');
          dirty = true;
        }

        if (!localStorage.getItem(ONLY_2027_FLAG_PLAN)) {
          const yaTieneNota = (plan2027.historialCambios || []).some((h) =>
            h.accion.includes('Vigencia única 2027')
          );
          if (!yaTieneNota) {
            plan2027 = {
              ...plan2027,
              historialCambios: [
                {
                  id: `h-only2027-${Date.now()}`,
                  fechaHora: new Date().toISOString(),
                  usuario: 'Sistema SG-SST Frikaz',
                  accion: 'Vigencia única 2027 y copia de seguridad histórica',
                  detalle:
                    'Se guardó copia de seguridad de registros históricos anteriores (2025-2026) y quedó únicamente el Plan Anual 2027 (enero–diciembre) como vigencia activa.',
                },
                ...(plan2027.historialCambios || []),
              ],
            };
          }
          localStorage.setItem(PLAIN_LANG_FLAG_PLAN, '1');
          localStorage.setItem(REORG_2027_FLAG_PLAN, '1');
          localStorage.setItem(ONLY_2027_FLAG_PLAN, '1');
          dirty = true;
        }

        const normalizado = normalizarPlan2027Unico(plan2027);
        const solo2027: Record<number, PlanAnualVigencia> = { 2027: normalizado };
        if (dirty) {
          saveAllVigencias(solo2027);
        }
        return solo2027;
      }
    }
  } catch (err) {
    console.error('Error reading plan anual vigencias:', err);
  }

  // Respaldo inicial de años anteriores para auditoría y únicamente 2027 como vigencia activa
  guardarBackupHistoricoPlanes({
    2025: buildPlan2025Seed(config, riesgos),
    2026: buildPlan2026Seed(config, riesgos),
  });

  const seed2027 = normalizarPlan2027Unico(buildPlan2027Seed(config, riesgos));
  seed2027.solicitudesRevision = detectarImpactosEnPlan(seed2027, riesgos, config, normas);

  const solo2027: Record<number, PlanAnualVigencia> = { 2027: seed2027 };
  saveAllVigencias(solo2027);
  localStorage.setItem(PLAIN_LANG_FLAG_PLAN, '1');
  localStorage.setItem(GERENTE_GATE_FLAG_PLAN, '1');
  localStorage.setItem(REORG_2027_FLAG_PLAN, '1');
  localStorage.setItem(ONLY_2027_FLAG_PLAN, '1');
  return solo2027;
}

export function saveAllVigencias(planes: Record<number, PlanAnualVigencia>): void {
  try {
    const historicos: Record<number, PlanAnualVigencia> = {};
    Object.entries(planes).forEach(([k, v]) => {
      const anio = Number(k);
      if (anio !== 2027 && v) historicos[anio] = v;
    });
    if (Object.keys(historicos).length > 0) {
      guardarBackupHistoricoPlanes(historicos);
    }
    const solo2027: Record<number, PlanAnualVigencia> = planes[2027]
      ? { 2027: normalizarPlan2027Unico(planes[2027]) }
      : {};
    localStorage.setItem(STORAGE_KEY_PLANES, JSON.stringify(solo2027));
  } catch (err) {
    console.error('Error saving plan anual vigencias:', err);
  }
}

export function saveVigencia(plan: PlanAnualVigencia): Record<number, PlanAnualVigencia> {
  if (plan.vigencia !== 2027) {
    guardarBackupHistoricoPlanes({ [plan.vigencia]: plan });
    return loadAllVigencias();
  }
  const normalizado = normalizarPlan2027Unico(plan);
  const updated: Record<number, PlanAnualVigencia> = { 2027: normalizado };
  saveAllVigencias(updated);
  return updated;
}

export function crearNuevaVigencia(
  nuevoAnio: number,
  _copiarObjetivosDeAnio?: number
): Record<number, PlanAnualVigencia> {
  // En la herramienta actual la vigencia activa es exclusivamente 2027 (no se duplican planes)
  const all = loadAllVigencias();
  if (nuevoAnio === 2027 || all[2027]) return all;
  return all;
}

// ============================================================================
// EXPORTADOR OFICIAL EXCEL (.XLSX) DEL PLAN ANUAL
// ============================================================================

export async function exportarPlanAnualExcel(
  plan: PlanAnualVigencia,
  indicadoresCalculados: IndicadorCalculado[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Frikaz S.A.S. - Plan Anual SG-SST y Ambiental';
  wb.created = new Date();

  const resumenPres = calcularResumenPresupuestoPlan(
    plan.actividades,
    plan.presupuestoGeneralAprobado || 0
  );

  // HOJA 1: RESUMEN Y OBJETIVOS
  const ws1 = wb.addWorksheet(`Plan Anual ${plan.vigencia}`);
  ws1.mergeCells('A1:H1');
  const t1 = ws1.getCell('A1');
  t1.value = `FRIKAZ S.A.S. — ${plan.titulo.toUpperCase()}`;
  t1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 28;

  ws1.getCell('A3').value = 'Año:';
  ws1.getCell('B3').value = plan.vigencia;
  ws1.getCell('C3').value = 'Estado:';
  ws1.getCell('D3').value = normalizarEstadoEstandar(plan.estadoAprobacion);
  ws1.getCell('E3').value = 'Estándares Res. 0312:';
  ws1.getCell('F3').value = plan.empresaSnapshot.grupoEstandares0312;
  ws1.getCell('A4').value = 'Objetivo General:';
  ws1.mergeCells('B4:H4');
  ws1.getCell('B4').value = plan.objetivoGeneral;
  ws1.getCell('A5').value = 'Encargado:';
  ws1.getCell('B5').value = plan.responsableNombre;
  ws1.getCell('C5').value = 'Quien Aprueba:';
  ws1.getCell('D5').value = plan.aprobadorNombre;
  ws1.getCell('E5').value = 'Trabajadores:';
  ws1.getCell('F5').value = plan.empresaSnapshot.numeroTrabajadores;

  ws1.getCell('A7').value = `Presupuesto General ${plan.vigencia}:`;
  ws1.getCell('B7').value = resumenPres.presupuestoGeneral;
  ws1.getCell('C7').value = 'Distribuido en actividades:';
  ws1.getCell('D7').value = resumenPres.aprobado;
  ws1.getCell('E7').value = 'Presupuesto Programado (Estimado):';
  ws1.getCell('F7').value =
    resumenPres.programado > 0 ? resumenPres.programado : 'Pendiente de valoración';
  ws1.getCell('G7').value = 'Presupuesto Ejecutado:';
  ws1.getCell('H7').value = resumenPres.ejecutado;
  ws1.getCell('A8').value = 'Saldo Disponible:';
  ws1.getCell('B8').value = resumenPres.saldoDisponible;
  ws1.getCell('C8').value = '% Ejecución Presupuestal:';
  ws1.getCell('D8').value = `${resumenPres.porcentajeEjecucion}%`;

  // Cronograma en Hoja 2
  const ws2 = wb.addWorksheet('Calendario y Presupuesto');
  const headers = [
    'Código',
    'Tarea o Actividad',
    'Área',
    'De dónde sale',
    'Peligro o Norma relacionada',
    'Cada cuánto',
    'Fecha Inicio',
    'Fecha Límite',
    'Encargado',
    'Quien Aprueba',
    'Recursos Necesarios',
    'Presupuesto Programado',
    'Presupuesto Aprobado',
    'Presupuesto Ejecutado',
    'Saldo Disponible',
    'Estado',
    'Pruebas (Evidencias) Subidas',
    'Revisión Gerencia / Cambios de Fechas',
  ];
  const hRow = ws2.getRow(1);
  headers.forEach((h, idx) => {
    const cell = hRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  hRow.height = 26;

  plan.actividades.forEach((a, i) => {
    const row = ws2.getRow(2 + i);
    const aprobado = a.presupuestoAprobado || 0;
    const ejecutado = a.gastoEjecutado || 0;
    const disp = Math.max(0, aprobado - ejecutado);
    const progValor =
      (a.presupuestoEstimado || 0) > 0
        ? a.presupuestoEstimado
        : formatPresupuestoProgramadoLabel(a);

    const revTexto = a.revisionGerente
      ? `${a.revisionGerente.resultadoRevision} (${a.revisionGerente.fechaRevision})`
      : 'Pendiente revisión de Gerencia';
    const cambiosTexto =
      a.historialCambiosFechas && a.historialCambiosFechas.length > 0
        ? ` | Cambios de fecha: ${a.historialCambiosFechas.length}`
        : '';

    row.values = [
      a.codigo,
      a.nombre,
      a.area,
      a.origen === 'RIESGO_GTC45' ? 'Peligro (GTC 45)' : a.origen === 'NORMA_OBLIGATORIA' ? 'Norma Legal' : 'Manual',
      a.riesgoCodigo ? `${a.riesgoCodigo} (Nivel ${a.riesgoNivelNR})` : a.normaOficial || 'Manual',
      a.periodicidad,
      a.fechaInicio,
      a.fechaLimite,
      a.responsableNombre,
      a.aprobadorNombre,
      a.recursosNecesarios || a.confirmacionRecursos || 'Por definir',
      progValor,
      aprobado,
      ejecutado,
      disp,
      normalizarEstadoEstandar(a.estado),
      a.evidencias.map((e) => `${e.nombreArchivo} (${normalizarEstadoEstandar(e.estadoRevision)})`).join(' | ') || 'Sin archivos',
      `${revTexto}${cambiosTexto}`,
    ];
    if (typeof progValor === 'number') {
      row.getCell(12).numFmt = '$#,##0';
    }
    [13, 14, 15].forEach((col) => {
      row.getCell(col).numFmt = '$#,##0';
    });
  });
  ws2.columns.forEach((c) => {
    c.width = 20;
  });
  ws2.getColumn(2).width = 38;
  ws2.getColumn(11).width = 30;

  // Hoja 3: Indicadores KPI
  const ws3 = wb.addWorksheet('Indicadores (KPI)');
  ws3.getRow(1).values = [
    'Código',
    'Indicador',
    'Tipo',
    'Cómo se calcula',
    'Meta',
    'Resultado Actual',
    'Unidad',
    'Estado',
    'Cada cuánto se mide',
    'Encargado',
    'Explicación del dato',
  ];
  ws3.getRow(1).font = { bold: true };
  indicadoresCalculados.forEach((ind, idx) => {
    ws3.getRow(2 + idx).values = [
      ind.codigo,
      ind.nombre,
      ind.tipo,
      ind.formula,
      ind.metaTexto,
      ind.resultadoActual,
      ind.unidadMedida,
      ind.estadoCalculado,
      ind.periodicidad,
      ind.responsable,
      ind.detalleCalculo,
    ];
  });
  ws3.columns.forEach((c) => {
    c.width = 22;
  });
  ws3.getColumn(2).width = 38;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Plan_Anual_SST_Ambiental_${plan.vigencia}_Frikaz.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
