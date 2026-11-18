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

const STORAGE_KEY_PLANES = 'frikaz_plan_anual_vigencias_v1';
const PLAIN_LANG_FLAG_PLAN = 'frikaz_plan_anual_plain_lang_v1';

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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      responsableSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      responsableSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      responsableSugerido: 'Gerente General (Representante Legal)',
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
          aprobadorSugerido: 'Gerente General (Representante Legal)',
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
      totalLogrado = actividadesFiltradas.filter((a) => a.estado === 'CUMPLIDA').length;
      resultadoActual = totalBase > 0 ? Math.round((totalLogrado / totalBase) * 1000) / 10 : 0;
      detalleCalculo = `${totalLogrado} de ${totalBase} tareas terminadas y aprobadas con su soporte.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_EVIDENCIAS') {
      totalBase = actividadesFiltradas.length;
      totalLogrado = actividadesFiltradas.filter(
        (a) =>
          a.evidencias.length > 0 &&
          a.evidencias.some((e) => e.estadoRevision === 'APROBADA')
      ).length;
      resultadoActual = totalBase > 0 ? Math.round((totalLogrado / totalBase) * 1000) / 10 : 0;
      detalleCalculo = `${totalLogrado} de ${totalBase} tareas ya tienen su foto, acta o certificado aprobado.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_PRESUPUESTO') {
      const presAsignado = actividadesFiltradas.reduce(
        (acc, a) => acc + (a.presupuestoEstimado || 0),
        0
      );
      const gastoReal = actividadesFiltradas.reduce((acc, a) => acc + (a.gastoEjecutado || 0), 0);
      totalBase = presAsignado;
      totalLogrado = gastoReal;
      resultadoActual =
        presAsignado > 0 ? Math.round((gastoReal / presAsignado) * 1000) / 10 : 0;
      detalleCalculo = `Se han usado $${gastoReal.toLocaleString('es-CO')} de $${presAsignado.toLocaleString('es-CO')} separados.`;
    } else if (ind.tipoCalculo === 'AUTOMATICO_RIESGOS_CRITICOS') {
      const riesgosCriticos = riesgos.filter(
        (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
      );
      totalBase = riesgosCriticos.length;
      const riesgosConActividadCumplida = riesgosCriticos.filter((r) =>
        plan.actividades.some((a) => a.riesgoId === r.id && a.estado === 'CUMPLIDA')
      ).length;
      const riesgosProgramados = riesgosCriticos.filter((r) =>
        plan.actividades.some((a) => a.riesgoId === r.id)
      ).length;
      totalLogrado = riesgosConActividadCumplida;
      resultadoActual =
        totalBase > 0 ? Math.round((riesgosProgramados / totalBase) * 1000) / 10 : 100;
      detalleCalculo = `${riesgosProgramados} de ${totalBase} riesgos altos (Nivel I y II) ya tienen tarea asignada (${riesgosConActividadCumplida} terminadas).`;
    }

    let cumple = false;
    if (ind.metaOperador === '>=') cumple = resultadoActual >= ind.metaValor;
    else if (ind.metaOperador === '<=') cumple = resultadoActual <= ind.metaValor;
    else cumple = resultadoActual === ind.metaValor;

    const estadoCalculado: IndicadorCalculado['estadoCalculado'] = cumple
      ? 'CUMPLE_META'
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

    if (act.estado === 'CUMPLIDA') return;

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
    gastoEjecutado: 0,
    estado: 'PENDIENTE',
    evidencias: [],
    resultadoActividad: undefined,
    fechaCierre: undefined,
    cerradoPor: undefined,
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
      responsable: 'Gerente General (Representante Legal)',
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
      historicoMediciones:
        anio === 2025
          ? [
              { id: 'm25-1', periodo: '2025-Q1', fecha: '2025-03-31', valor: 88 },
              { id: 'm25-2', periodo: '2025-Q2', fecha: '2025-06-30', valor: 92 },
              { id: 'm25-3', periodo: '2025-Q3', fecha: '2025-09-30', valor: 94 },
              { id: 'm25-4', periodo: '2025-Q4', fecha: '2025-12-20', valor: 100 },
            ]
          : [
              { id: 'm26-1', periodo: '2026-Q1', fecha: '2026-03-31', valor: 80 },
              { id: 'm26-2', periodo: '2026-Q2', fecha: '2026-06-30', valor: 83.3 },
              { id: 'm26-3', periodo: '2026-Q3', fecha: '2026-09-30', valor: 85.7 },
            ],
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
      historicoMediciones:
        anio === 2025
          ? [{ id: 'm25r-1', periodo: '2025-Anual', fecha: '2025-12-15', valor: 100 }]
          : [{ id: 'm26r-1', periodo: '2026-Q3', fecha: '2026-09-30', valor: 75 }],
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
      responsable: 'Gerente General (Representante Legal)',
      periodicidad: 'TRIMESTRAL',
      tipoCalculo: 'AUTOMATICO_PRESUPUESTO',
      filtroArea: 'TODAS',
      historicoMediciones:
        anio === 2025
          ? [{ id: 'm25p-1', periodo: '2025-Anual', fecha: '2025-12-20', valor: 96.4 }]
          : [{ id: 'm26p-1', periodo: '2026-Q3', fecha: '2026-09-30', valor: 64.2 }],
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
      historicoMediciones:
        anio === 2025
          ? [{ id: 'm25e-1', periodo: '2025-Anual', fecha: '2025-12-20', valor: 100 }]
          : [{ id: 'm26e-1', periodo: '2026-Q3', fecha: '2026-09-30', valor: 60 }],
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
      historicoMediciones:
        anio === 2025
          ? [{ id: 'm25a-1', periodo: '2025-Anual', fecha: '2025-12-20', valor: 100 }]
          : [{ id: 'm26a-1', periodo: '2026-Q3', fecha: '2026-09-30', valor: 66.7 }],
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

  const makeClosedActivity = (
    idx: number,
    partial: Partial<ActividadPlanAnual> & { nombre: string; fechaInicio: string; fechaLimite: string }
  ): ActividadPlanAnual => ({
    id: `act-2025-${idx}`,
    codigo: `PA-2025-0${idx}`,
    descripcion: partial.descripcion || partial.nombre,
    criterioAceptacion: partial.criterioAceptacion || 'Soporte firmado y aprobado por Gerencia.',
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
    aprobadorNombre: 'Gerente General (Representante Legal)',
    aprobadorCargo: 'Gerente General',
    presupuestoEstimado: partial.presupuestoEstimado ?? 600000,
    gastoEjecutado: partial.gastoEjecutado ?? 580000,
    estado: 'CUMPLIDA',
    evidenciaRequerida: partial.evidenciaRequerida || 'Acta y soporte fotográfico',
    evidencias: [
      {
        id: `ev-2025-${idx}`,
        nombreArchivo: `Soporte_PA_2025_0${idx}.pdf`,
        tipoSoporte: 'PDF',
        descripcionSoporte: `Evidencia verificada de ejecución en vigencia 2025 (${partial.nombre}).`,
        fechaCarga: partial.fechaLimite,
        cargadoPor: partial.responsableNombre || 'Coordinador / Vigía de SST',
        estadoRevision: 'APROBADA',
        revisadoPor: 'Gerente General (Representante Legal)',
        fechaRevision: partial.fechaLimite,
        comentarioRevisor: 'Aprobado conforme al cierre de vigencia 2025.',
      },
    ],
    resultadoActividad: 'Actividad ejecutada al 100% dentro de la vigencia 2025.',
    fechaCierre: partial.fechaLimite,
    cerradoPor: 'Gerente General (Representante Legal)',
    observaciones: 'Cerrada y guardada en el historial de 2025.',
    historialRevisiones: [
      {
        id: `hr-2025-${idx}`,
        fecha: partial.fechaLimite,
        usuario: 'Gerente General (Representante Legal)',
        rol: 'Aprobador',
        accion: 'APROBADA_CERRADA',
        detalle: 'Cierre definitivo de actividad de la vigencia 2025.',
      },
    ],
    ...partial,
  });

  const actividades: ActividadPlanAnual[] = [
    makeClosedActivity(1, {
      nombre: 'Política de Seguridad y Ambiente y revisión de peligros GTC 45 (2025)',
      fechaInicio: '2025-01-15',
      fechaLimite: '2025-02-20',
      area: 'INTEGRAL',
      programacionMensual: [1, 2],
      normaOficial: 'Decreto 1072 de 2015',
      objetivoEspecificoId: 'obj-2025-02',
      presupuestoEstimado: 450000,
      gastoEjecutado: 420000,
    }),
    makeClosedActivity(2, {
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
      gastoEjecutado: 1790000,
    }),
    makeClosedActivity(3, {
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
      gastoEjecutado: 1150000,
    }),
    makeClosedActivity(4, {
      nombre: 'Entrega de aceite usado (ACU) y limpieza de trampa de grasas (Resumen 2025)',
      fechaInicio: '2025-01-10',
      fechaLimite: '2025-12-10',
      area: 'AMBIENTAL',
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      normaOficial: 'Resolución 316 de 2018 / Resolución 0631 de 2015',
      objetivoEspecificoId: 'obj-2025-03',
      presupuestoEstimado: 1600000,
      gastoEjecutado: 1540000,
    }),
    makeClosedActivity(5, {
      nombre: 'Revisión anual de los 7 Estándares Mínimos (Res. 0312/2019) y auditoría (2025)',
      fechaInicio: '2025-11-10',
      fechaLimite: '2025-12-18',
      area: 'SST',
      programacionMensual: [11, 12],
      normaOficial: 'Resolución 0312 de 2019',
      objetivoEspecificoId: 'obj-2025-02',
      presupuestoEstimado: 750000,
      gastoEjecutado: 740000,
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
    aprobadorNombre: 'Gerente General (Representante Legal)',
    estadoAprobacion: 'CERRADO',
    fechaAprobacion: '2025-01-15',
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
        usuario: 'Gerente General (Representante Legal)',
        accion: 'Plan Aprobado',
        detalle: 'Aprobación oficial del Plan Anual 2025.',
      },
      {
        id: 'h-2025-02',
        fechaHora: '2025-12-22T17:00:00',
        usuario: 'Gerente General (Representante Legal)',
        accion: 'Cierre de Vigencia',
        detalle: 'Año 2025 cerrado al 100% con todas sus pruebas guardadas.',
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

  const hoy = new Date();
  const addDaysIso = (days: number) => {
    const d = new Date(hoy.getTime() + days * 86400000);
    return d.toISOString().split('T')[0];
  };
  const mesHoy = hoy.getMonth() + 1;

  const actividades: ActividadPlanAnual[] = [
    // 1. Cumplida: Política y Matriz GTC 45
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
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: 'Gerente General (Representante Legal)',
      aprobadorCargo: 'Gerente General',
      presupuestoEstimado: 500000,
      gastoEjecutado: 480000,
      estado: 'CUMPLIDA',
      evidenciaRequerida: 'Política SST firmada, planillas de charla al personal y Matriz GTC 45 actualizada.',
      evidencias: [
        {
          id: 'ev-2026-01',
          nombreArchivo: 'Politica_SST_Firmada_y_Matriz_GTC45_2026.pdf',
          tipoSoporte: 'PDF',
          descripcionSoporte: 'Documento firmado por Gerencia y firmas de socialización con el equipo de Bosa.',
          fechaCarga: '2026-02-10',
          cargadoPor: 'Coordinador / Vigía de SST',
          estadoRevision: 'APROBADA',
          revisadoPor: 'Gerente General (Representante Legal)',
          fechaRevision: '2026-02-12',
          comentarioRevisor: 'Aprobado conforme al Decreto 1072 de 2015.',
        },
      ],
      resultadoActividad: 'Política explicada a los 10 trabajadores y lista de peligros actualizada.',
      fechaCierre: '2026-02-12',
      cerradoPor: 'Gerente General (Representante Legal)',
      observaciones: 'Completada dentro del plazo acordado.',
      historialRevisiones: [
        {
          id: 'hr-2026-01',
          fecha: '2026-02-12T10:30:00',
          usuario: 'Gerente General (Representante Legal)',
          rol: 'Aprobador',
          accion: 'APROBADA_CERRADA',
          detalle: 'Evidencia revisada y cierre aprobado.',
        },
      ],
    },

    // 2. Cumplida: Riesgo Nivel I Calor Freidoras
    ...(rCalor
      ? [
          {
            id: 'act-2026-02',
            codigo: 'PA-2026-02',
            nombre: `Protección contra quemaduras en freidoras: pantallas, caretas y guantes para 250°C (${rCalor.codigo})`,
            descripcion: `Cuidar al trabajador frente al peligro "${rCalor.peligroDescripcion}". Poner pantallas transparentes contra salpicaduras, alarma de temperatura (máximo 180 °C) y entregar guantes y careta certificados al ${rCalor.cargo}.`,
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
            responsableId: 'cargo-operario-frito',
            responsableNombre: 'Operario de Frito',
            responsableCargo: 'Operario de Frito',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-coordinador-vigia-sst',
            aprobadorNombre: 'Coordinador / Vigía de SST',
            aprobadorCargo: 'Coordinador / Vigía de SST',
            presupuestoEstimado: 2100000,
            gastoEjecutado: 1980000,
            estado: 'CUMPLIDA' as const,
            evidenciaRequerida:
              'Fotos de las pantallas protectoras y planilla firmada de entrega de guantes 250°C y careta ANSI Z87.1.',
            evidencias: [
              {
                id: 'ev-2026-02',
                nombreArchivo: 'Entrega_EPP_Termico_y_Barreras_Freidoras.pdf',
                tipoSoporte: 'CERTIFICADO' as const,
                descripcionSoporte: 'Facturas, fichas de los guantes térmicos y fotos de las pantallas instaladas.',
                fechaCarga: '2026-04-24',
                cargadoPor: 'Operario de Frito',
                estadoRevision: 'APROBADA' as const,
                revisadoPor: 'Coordinador / Vigía de SST',
                fechaRevision: '2026-04-26',
                comentarioRevisor: 'Controles verificados en recorrido de planta.',
              },
            ],
            resultadoActividad: 'Pantallas instaladas y todo el personal de fritura recibió su protección térmica.',
            fechaCierre: '2026-04-26',
            cerradoPor: 'Coordinador / Vigía de SST',
            observaciones: 'Protección aplicada sobre riesgo alto de freído.',
            historialRevisiones: [
              {
                id: 'hr-2026-02',
                fecha: '2026-04-26T14:00:00',
                usuario: 'Coordinador / Vigía de SST',
                rol: 'Aprobador',
                accion: 'APROBADA_CERRADA' as const,
                detalle: 'Soporte validado en planta.',
              },
            ],
          },
        ]
      : []),

    // 3. Requiere Revisión (Evidencia cargada pendiente de aprobación): Riesgo Nivel II Químico SGA
    ...(rQuimico
      ? [
          {
            id: 'act-2026-03',
            codigo: 'PA-2026-03',
            nombre: `Etiquetas claras en químicos (SGA), hojas de seguridad y punto lavaojos (${rQuimico.codigo})`,
            descripcion: `Atender riesgo Nivel ${rQuimico.interpretacionNR}: ${rQuimico.peligroDescripcion}. Poner etiquetas claras (SGA - Res. 773/2021) en todos los frascos de desengrasante e hipoclorito y dejar listo el lavaojos en la zona de aseo y producción.`,
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
            fechaLimite: addDaysIso(10),
            programacionMensual: [6, 7, mesHoy],
            responsableId: 'cargo-operario-seleccion',
            responsableNombre: 'Operario de Selección',
            responsableCargo: 'Operario de Selección',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-coordinador-vigia-sst',
            aprobadorNombre: 'Coordinador / Vigía de SST',
            aprobadorCargo: 'Coordinador / Vigía de SST',
            presupuestoEstimado: 950000,
            gastoEjecutado: 890000,
            estado: 'REQUIERE_REVISION' as const,
            evidenciaRequerida:
              'Fotos de los envases etiquetados, carpeta de hojas de seguridad y planilla de charla.',
            evidencias: [
              {
                id: 'ev-2026-03',
                nombreArchivo: 'Evidencia_Rotulado_SGA_y_Lavaojos.pdf',
                tipoSoporte: 'IMAGEN' as const,
                descripcionSoporte:
                  'Fotos de etiquetas en los envases de desengrasante e hipoclorito y prueba del lavaojos.',
                fechaCarga: addDaysIso(-1),
                cargadoPor: 'Operario de Selección',
                estadoRevision: 'PENDIENTE_REVISION' as const,
              },
            ],
            resultadoActividad:
              'Se etiquetaron todos los envases de limpieza y se instaló el punto lavaojos.',
            observaciones: 'Falta que el Coordinador / Vigía SST revise las fotos y apruebe el cierre.',
            historialRevisiones: [
              {
                id: 'hr-2026-03',
                fecha: new Date().toISOString(),
                usuario: 'Operario de Selección',
                rol: 'Responsable',
                accion: 'EVIDENCIA_ADJUNTADA' as const,
                detalle: 'Subió fotos de las etiquetas y el lavaojos para revisión.',
              },
            ],
          },
        ]
      : []),

    // 4. Próxima a vencer (sin evidencia aún): Riesgo Nivel I Ruido
    ...(rRuido
      ? [
          {
            id: 'act-2026-04',
            codigo: 'PA-2026-04',
            nombre: `Medición anual de ruido (sonometría) y revisión de extractora (${rRuido.codigo})`,
            descripcion: `Medir el nivel de ruido en la planta (límite legal Res. 1792/1990: 85 dBA) cerca de peladora, rebanadora y campana, y entregar protectores de oído (tapa oídos NRR >=25 dB).`,
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
            fechaLimite: addDaysIso(7),
            programacionMensual: [9, 10, mesHoy],
            responsableId: 'cargo-operario-pelado',
            responsableNombre: 'Operario de Pelado',
            responsableCargo: 'Operario de Pelado',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-coordinador-vigia-sst',
            aprobadorNombre: 'Coordinador / Vigía de SST',
            aprobadorCargo: 'Coordinador / Vigía de SST',
            presupuestoEstimado: 1400000,
            gastoEjecutado: 600000,
            estado: 'EN_PROCESO' as const,
            evidenciaRequerida:
              'Informe de medición de ruido y planilla firmada de entrega de tapa oídos.',
            evidencias: [],
            observaciones: 'Visita coordinada con la ARL; falta subir el informe final.',
            historialRevisiones: [
              {
                id: 'hr-2026-04',
                fecha: '2026-09-01T08:00:00',
                usuario: 'Coordinador / Vigía de SST',
                rol: 'Planificador',
                accion: 'CREADA' as const,
                detalle: 'Creada automáticamente desde riesgo Nivel I GTC45-PR-03.',
              },
            ],
          },
        ]
      : []),

    // 5. Vencida: Riesgo Nivel II Biomecánico / Pausas activas y tapetes antifatiga
    ...(rBiomec
      ? [
          {
            id: 'act-2026-05',
            codigo: 'PA-2026-05',
            nombre: `Poner tapetes blandos (antifatiga) y hacer pausas activas en selección y empaque (${rBiomec.codigo})`,
            descripcion: `Mejorar la comodidad en mesa de selección y sellado para evitar dolores de espalda, manos y muñecas en el puesto de ${rBiomec.cargo}.`,
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
            fechaLimite: addDaysIso(-9),
            programacionMensual: [8, 9],
            responsableId: 'cargo-operario-empaque',
            responsableNombre: 'Operario de Empaque',
            responsableCargo: 'Operario de Empaque',
            responsableCorreo: 'frikaz.fritosnacks@gmail.com',
            aprobadorId: 'cargo-coordinador-vigia-sst',
            aprobadorNombre: 'Coordinador / Vigía de SST',
            aprobadorCargo: 'Coordinador / Vigía de SST',
            presupuestoEstimado: 780000,
            gastoEjecutado: 0,
            estado: 'VENCIDA' as const,
            evidenciaRequerida: 'Factura o foto de los tapetes instalados y lista de pausas activas.',
            evidencias: [],
            observaciones: 'Se pasó la fecha límite; dar prioridad para completarla y subir las fotos.',
            historialRevisiones: [
              {
                id: 'hr-2026-05',
                fecha: '2026-08-01T09:00:00',
                usuario: 'Coordinador / Vigía de SST',
                rol: 'Planificador',
                accion: 'CREADA' as const,
                detalle: 'Programada desde la Matriz de Peligros GTC 45.',
              },
            ],
          },
        ]
      : []),

    // 6. Recurrente Trimestral: Comité de Convivencia Laboral (Q4 pendiente)
    {
      id: 'act-2026-06',
      codigo: 'PA-2026-06',
      nombre: 'Reunión del Comité de Convivencia Laboral (4to trimestre)',
      descripcion:
        'Reunión cada 3 meses del Comité de Convivencia (Res. 652/2012 y 1356/2012) para cuidar el respeto, buen trato y bienestar emocional en la planta.',
      criterioAceptacion: 'Acta firmada por quienes integran el comité guardada de forma confidencial.',
      area: 'SST',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 652 de 2012 / Resolución 1356 de 2012',
      normaArticulos: 'Art. 9 Res. 652/2012 (mod. Art. 3 Res. 1356/2012)',
      requisitoObligatorioId: 'REQ-652-CONVIVENCIA',
      objetivoEspecificoId: 'obj-2026-02',
      esRecurrente: true,
      periodicidad: 'TRIMESTRAL',
      fechaInicio: '2026-11-01',
      fechaLimite: addDaysIso(22),
      programacionMensual: [3, 6, 9, 12],
      serieRecurrenteId: 'serie-convivencia-2026',
      numeroOcurrencia: 4,
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: 'Gerente General (Representante Legal)',
      aprobadorCargo: 'Gerente General',
      presupuestoEstimado: 200000,
      gastoEjecutado: 150000,
      estado: 'PENDIENTE',
      evidenciaRequerida: 'Acta firmada de la reunión del Comité de Convivencia.',
      evidencias: [],
      observaciones: 'Reunión #4 del año (ya se hicieron las de marzo, junio y septiembre).',
      historialRevisiones: [
        {
          id: 'hr-2026-06',
          fecha: '2026-10-01T08:00:00',
          usuario: 'Calendario Automático',
          rol: 'Sistema',
          accion: 'RECURRENCIA_GENERADA',
          detalle: 'Programada para fin de año según Res. 1356/2012.',
        },
      ],
    },

    // 7. Cumplida Ambiental: Entrega ACU Res. 316/2018 (Periodo anterior) + siguiente mes
    {
      id: 'act-2026-07',
      codigo: 'PA-2026-07',
      nombre: 'Entrega de Aceite de Cocina Usado (ACU) a recolector autorizado',
      descripcion:
        'Dejar enfriar el aceite (< 40 °C), envasarlo bien tapado, pesarlo y entregar de 180 a 250 litros/mes al gestor autorizado por la Secretaría de Ambiente (Res. 316/2018).',
      criterioAceptacion: 'Recibo firmado con los litros o kilos entregados y certificado del gestor SDA.',
      area: 'AMBIENTAL',
      origen: 'NORMA_OBLIGATORIA',
      normaOficial: 'Resolución 316 de 2018 (MADS / SDA Bogotá)',
      normaArticulos: 'Artículos 6, 7 y 8',
      requisitoObligatorioId: 'REQ-316-ACU-MENSUAL',
      objetivoEspecificoId: 'obj-2026-03',
      esRecurrente: true,
      periodicidad: 'MENSUAL',
      fechaInicio: '2026-10-01',
      fechaLimite: '2026-10-30',
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      serieRecurrenteId: 'serie-acu-2026',
      numeroOcurrencia: 10,
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: 'Gerente General (Representante Legal)',
      aprobadorCargo: 'Gerente General',
      presupuestoEstimado: 1200000,
      gastoEjecutado: 1050000,
      estado: 'CUMPLIDA',
      evidenciaRequerida: 'Certificado mensual de recolección de aceite entregado por el gestor autorizado.',
      evidencias: [
        {
          id: 'ev-2026-07',
          nombreArchivo: 'Manifiesto_ACU_Octubre_2026_SDA.pdf',
          tipoSoporte: 'CERTIFICADO',
          descripcionSoporte: 'Recibo oficial por 220 litros de aceite usado entregados al gestor autorizado.',
          fechaCarga: '2026-10-28',
          cargadoPor: 'Líder de Gestión Ambiental',
          estadoRevision: 'APROBADA',
          revisadoPor: 'Gerente General (Representante Legal)',
          fechaRevision: '2026-10-29',
          comentarioRevisor: 'Entrega de aceite verificada y al día.',
        },
      ],
      resultadoActividad: '220 litros de aceite entregados correctamente sin botar nada al desagüe.',
      fechaCierre: '2026-10-29',
      cerradoPor: 'Gerente General (Representante Legal)',
      observaciones: 'Entregas cumplidas todos los meses entre enero y octubre.',
      historialRevisiones: [
        {
          id: 'hr-2026-07',
          fecha: '2026-10-29T11:00:00',
          usuario: 'Gerente General (Representante Legal)',
          rol: 'Aprobador',
          accion: 'APROBADA_CERRADA',
          detalle: 'Recibo de aceite aprobado.',
        },
      ],
    },

    // 8. Pendiente Ambiental: Trampa de Grasas (Noviembre)
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
      esRecurrente: true,
      periodicidad: 'MENSUAL',
      fechaInicio: '2026-11-01',
      fechaLimite: addDaysIso(12),
      programacionMensual: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      serieRecurrenteId: 'serie-trampa-2026',
      numeroOcurrencia: 11,
      responsableId: 'rol-lider-ambiental',
      responsableNombre: 'Líder de Gestión Ambiental',
      responsableCargo: 'Encargado Ambiental / Jefe de Planta',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-coordinador-vigia-sst',
      aprobadorNombre: 'Coordinador / Vigía de SST',
      aprobadorCargo: 'Coordinador / Vigía de SST',
      presupuestoEstimado: 900000,
      gastoEjecutado: 750000,
      estado: 'EN_PROCESO',
      evidenciaRequerida: 'Planilla de limpieza de trampa de grasas firmada y foto.',
      evidencias: [],
      observaciones: 'Limpieza de noviembre en marcha.',
      historialRevisiones: [],
    },

    // 9. Programada Diciembre: Autoevaluación Res. 0312 de 2019
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
      responsableId: 'cargo-coordinador-vigia-sst',
      responsableNombre: 'Coordinador / Vigía de SST',
      responsableCargo: 'Coordinador / Vigía de SST',
      responsableCorreo: 'frikaz.fritosnacks@gmail.com',
      aprobadorId: 'cargo-gerente-general',
      aprobadorNombre: 'Gerente General (Representante Legal)',
      aprobadorCargo: 'Gerente General',
      presupuestoEstimado: 650000,
      gastoEjecutado: 0,
      estado: 'PENDIENTE',
      evidenciaRequerida: `Calificación de ${cantidadEstandares} estándares firmada y comprobante de envío a la ARL.`,
      evidencias: [],
      observaciones: `Cierre obligatorio del año para ${config.numeroTrabajadores} trabajadores.`,
      historialRevisiones: [],
    },
  ];

  return {
    id: 'plan-vigencia-2026',
    vigencia: 2026,
    titulo: 'Plan Anual de Seguridad, Salud y Ambiente 2026',
    objetivoGeneral:
      'Evitar quemaduras, cortes, pérdida de oído y dolores musculares en el equipo de Frikaz S.A.S., cumpliendo los Estándares Mínimos de la Resolución 0312 de 2019, el Decreto 1072 de 2015 y el cuidado ambiental en la planta de Bosa.',
    fechaElaboracion: '2026-01-12',
    responsableId: 'cargo-coordinador-vigia-sst',
    responsableNombre: 'Coordinador / Vigía de SST',
    aprobadorNombre: 'Gerente General (Representante Legal)',
    estadoAprobacion: 'APROBADO',
    fechaAprobacion: '2026-01-16',
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
        usuario: 'Gerente General (Representante Legal)',
        accion: 'Plan Aprobado',
        detalle: `Plan Anual 2026 aprobado inicialmente (${config.numeroTrabajadores} trabajadores, ${grupo}).`,
      },
    ],
  };
}

// ============================================================================
// PERSISTENCIA MULTIANUAL INDEPENDIENTE
// ============================================================================

export function loadAllVigencias(): Record<number, PlanAnualVigencia> {
  const config = getCaracterizacionActual();
  const riesgos = loadStoredRisks();
  const normas = getPhvaNorms();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANES);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<number, PlanAnualVigencia>;
      if (parsed && Object.keys(parsed).length > 0) {
        if (!localStorage.getItem(PLAIN_LANG_FLAG_PLAN)) {
          const freshSeed2025 = buildPlan2025Seed(config, riesgos);
          const freshSeed2026 = buildPlan2026Seed(config, riesgos);
          const migrated: Record<number, PlanAnualVigencia> = { ...parsed };

          const mergeSeedPlan = (
            existing: PlanAnualVigencia | undefined,
            fresh: PlanAnualVigencia
          ): PlanAnualVigencia | undefined => {
            if (!existing) return undefined;
            const freshActsById = new Map(fresh.actividades.map((a) => [a.id, a]));
            const freshObjsById = new Map(fresh.objetivosEspecificos.map((o) => [o.id, o]));
            const freshIndsById = new Map(fresh.indicadores.map((i) => [i.id, i]));

            return {
              ...existing,
              titulo: fresh.titulo,
              objetivoGeneral: fresh.objetivoGeneral,
              objetivosEspecificos: existing.objetivosEspecificos.map((o) => {
                const f = freshObjsById.get(o.id);
                return f
                  ? { ...o, titulo: f.titulo, descripcion: f.descripcion, metas: f.metas }
                  : o;
              }),
              indicadores: existing.indicadores.map((ind) => {
                const f = freshIndsById.get(ind.id);
                return f
                  ? {
                      ...ind,
                      nombre: f.nombre,
                      formula: f.formula,
                      metaTexto: f.metaTexto,
                      reglaConteo: f.reglaConteo,
                      fuenteInformacion: f.fuenteInformacion,
                    }
                  : ind;
              }),
              actividades: existing.actividades.map((act) => {
                const f = freshActsById.get(act.id);
                return f
                  ? {
                      ...act,
                      nombre: f.nombre,
                      descripcion: f.descripcion,
                      criterioAceptacion: f.criterioAceptacion,
                      evidenciaRequerida: f.evidenciaRequerida,
                    }
                  : act;
              }),
            };
          };

          const m2025 = mergeSeedPlan(parsed[2025], freshSeed2025);
          const m2026 = mergeSeedPlan(parsed[2026], freshSeed2026);
          if (m2025) migrated[2025] = m2025;
          if (m2026) migrated[2026] = m2026;

          saveAllVigencias(migrated);
          localStorage.setItem(PLAIN_LANG_FLAG_PLAN, '1');
          return migrated;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading plan anual vigencias:', err);
  }

  const seed: Record<number, PlanAnualVigencia> = {
    2025: buildPlan2025Seed(config, riesgos),
    2026: buildPlan2026Seed(config, riesgos),
  };

  // Detectar de entrada si hay riesgos Nivel I/II o normas sin actividad en 2026
  seed[2026].solicitudesRevision = detectarImpactosEnPlan(seed[2026], riesgos, config, normas);

  saveAllVigencias(seed);
  localStorage.setItem(PLAIN_LANG_FLAG_PLAN, '1');
  return seed;
}

export function saveAllVigencias(planes: Record<number, PlanAnualVigencia>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLANES, JSON.stringify(planes));
  } catch (err) {
    console.error('Error saving plan anual vigencias:', err);
  }
}

export function saveVigencia(plan: PlanAnualVigencia): Record<number, PlanAnualVigencia> {
  const all = loadAllVigencias();
  const updated = { ...all, [plan.vigencia]: plan };
  saveAllVigencias(updated);
  return updated;
}

export function crearNuevaVigencia(
  nuevoAnio: number,
  copiarObjetivosDeAnio?: number
): Record<number, PlanAnualVigencia> {
  const all = loadAllVigencias();
  if (all[nuevoAnio]) return all; // Nunca sobrescribe una vigencia existente

  const config = getCaracterizacionActual();
  const riesgos = loadStoredRisks();
  const normas = getPhvaNorms();
  const { objetivos, indicadores } = generarObjetivosYIndicadoresIniciales(nuevoAnio);

  const origen = copiarObjetivosDeAnio ? all[copiarObjetivosDeAnio] : undefined;

  const nuevoPlan: PlanAnualVigencia = {
    id: `plan-vigencia-${nuevoAnio}`,
    vigencia: nuevoAnio,
    titulo: `Plan Anual de Seguridad, Salud y Ambiente ${nuevoAnio}`,
    objetivoGeneral:
      origen?.objetivoGeneral ||
      `Cuidar la salud y evitar accidentes de los trabajadores de Frikaz S.A.S. en el año ${nuevoAnio}, controlando los peligros más fuertes en la planta y cumpliendo las normas de seguridad y ambiente.`,
    fechaElaboracion: new Date().toISOString().split('T')[0],
    responsableId: 'cargo-coordinador-vigia-sst',
    responsableNombre: 'Coordinador / Vigía de SST',
    aprobadorNombre: 'Gerente General (Representante Legal)',
    estadoAprobacion: 'BORRADOR',
    empresaSnapshot: construirEmpresaSnapshot(config),
    objetivosEspecificos: objetivos,
    indicadores,
    actividades: [],
    solicitudesRevision: [],
    notificacionesEnviadas: [],
    historialCambios: [
      {
        id: `h-crea-${Date.now()}`,
        fechaHora: new Date().toISOString(),
        usuario: 'Coordinador / Vigía de SST',
        accion: 'Año Nuevo Creado',
        detalle: `Plan del año ${nuevoAnio} creado aparte sin borrar ni cambiar la información de años anteriores.`,
      },
    ],
  };

  nuevoPlan.solicitudesRevision = detectarImpactosEnPlan(nuevoPlan, riesgos, config, normas);

  return saveVigencia(nuevoPlan);
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
  ws1.getCell('D3').value = plan.estadoAprobacion;
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
    'Presupuesto',
    'Gastado',
    'Disponible',
    'Estado',
    'Pruebas (Evidencias) Subidas',
    'Fecha de Cierre',
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
    const disp = (a.presupuestoEstimado || 0) - (a.gastoEjecutado || 0);
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
      a.presupuestoEstimado,
      a.gastoEjecutado,
      disp,
      a.estado,
      a.evidencias.map((e) => `${e.nombreArchivo} (${e.estadoRevision})`).join(' | ') || 'Sin archivos',
      a.fechaCierre || '-',
    ];
    [11, 12, 13].forEach((col) => {
      row.getCell(col).numFmt = '$#,##0';
    });
  });
  ws2.columns.forEach((c) => {
    c.width = 20;
  });
  ws2.getColumn(2).width = 38;

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
