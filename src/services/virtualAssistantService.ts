import type { AssistantNavigationTarget } from '../types/assistantNavigation';
import { loadStoredRisks } from './riskMatrixStorage';
import {
  calcularResumenPresupuestoPlan,
  extraerMedidasRiesgo,
  loadAllVigencias,
} from './planAnualService';
import { loadPlanesMejoraEmergenciasStore } from './planMejoraEmergenciasService';
import {
  calcularResultadoDirectoIndicador,
  calcularResultadoIndicadorPeriodo,
  loadSgsstData,
} from './planAnualSgsstService';
import { getPhvaNorms } from './phvaService';
import { getCaracterizacionActual } from './dynamicRulesEngine';
import {
  getStoredCargosSST,
  getStoredPoliticaSST,
  getStoredVigiaSST,
} from './organigramaService';
import { loadCopasstStore } from './copasstService';
import { loadRiesgoPsicosocialStore } from './riesgoPsicosocialService';
import { loadPlanMejoraRepositorio } from './planMejoraRepoService';
import {
  getStoredDocumentosFirmados,
  getStoredEnviosPendientes,
} from './documentosFirmadosService';
import { getStoredPartesInteresadas } from './partesInteresadasService';
import {
  esGerenteAutorizado,
  normalizarEstadoEstandar,
  NOMBRE_GERENTE_OFICIAL,
} from './gerenteControlService';
import {
  CARGOS_OFICIALES_LISTA,
  CARGOS_OFICIALES_NOMBRES,
  coincideConCargoOficial,
  obtenerIdCargoOficial,
  type CargoOficialNombre,
} from '../data/cargosOficiales';

export interface AssistantMatchCard {
  id: string;
  categoria: string;
  titulo: string;
  detalle: string;
  estadoLabel?: string;
  target: AssistantNavigationTarget;
}

export interface AssistantConfirmationRequest {
  titulo: string;
  detalle: string;
  confirmLabel: string;
  target: AssistantNavigationTarget;
}

export interface AssistantContext {
  esGerente?: boolean;
  workerNombre?: string;
  workerCargo?: string;
  accesoMedicoAutorizado?: boolean;
}

export interface AssistantQueryResult {
  reply: string;
  notaPermiso?: string;
  items: AssistantMatchCard[];
  autoNavigateTarget?: AssistantNavigationTarget;
  confirmationRequest?: AssistantConfirmationRequest;
}

function normalizeText(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'por',
  'para',
  'con',
  'sin',
  'y',
  'o',
  'que',
  'donde',
  'estan',
  'esta',
  'son',
  'hay',
  'ver',
  'quiero',
  'muestrame',
  'mostrar',
  'busca',
  'buscar',
  'encuentra',
  'encontrar',
  'abre',
  'abrir',
  'llevame',
  'llevar',
  'entrar',
  'ingresar',
  'consultar',
  'consulta',
  'ir',
  'dame',
  'cual',
  'cuales',
  'como',
  'sobre',
  'mi',
  'me',
  'se',
  'su',
  'sus',
  'frikacito',
  'porfa',
  'favor',
  'tengo',
  'tenemos',
  'debo',
  'debemos',
  'puedo',
  'puede',
  'plan',
  'anual',
  '2027',
  'este',
  'esta',
]);

function extractKeywords(normalized: string): string[] {
  return normalized
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function scoreMatch(blobRaw: string, normalizedFull: string, keywords: string[]): number {
  const blob = normalizeText(blobRaw);
  if (!blob) return 0;
  let score = 0;
  if (normalizedFull.length >= 4 && blob.includes(normalizedFull)) {
    score += 10;
  }
  keywords.forEach((kw) => {
    if (blob.includes(kw)) {
      score += 4;
    } else if (kw.length >= 5) {
      const stem = kw.replace(/(os|as|es|o|a|s)$/, '');
      if (stem.length >= 4 && blob.includes(stem)) {
        score += 3;
      }
    }
  });
  return score;
}

export function consultarAsistenteVirtual(
  rawQuery: string,
  context: AssistantContext = {}
): AssistantQueryResult {
  const query = rawQuery.trim();
  const norm = normalizeText(query);
  const gerenteActivo =
    context.esGerente !== undefined ? context.esGerente : esGerenteAutorizado();
  const usuarioEtiqueta = context.workerNombre
    ? `${context.workerNombre}${context.workerCargo ? ` (${context.workerCargo})` : ''}`
    : gerenteActivo
    ? NOMBRE_GERENTE_OFICIAL
    : 'Usuario en modo consulta';

  if (!norm) {
    return {
      reply:
        '¡Hola! Soy Frikacito, tu asistente virtual de Frikaz S.A.S. ¿Qué necesitas consultar o dónde quieres ir? Estoy aquí para ayudarte.',
      items: [],
    };
  }

  const riesgos = loadStoredRisks();
  const vigencias = loadAllVigencias();
  const plan2027 = vigencias[2027] || Object.values(vigencias)[0];
  const config = getCaracterizacionActual();
  const sgsstData = loadSgsstData(config, riesgos);
  const mejoraStore = loadPlanesMejoraEmergenciasStore(riesgos);
  const normas = getPhvaNorms();
  const politicaSST = getStoredPoliticaSST();
  const cargosSST = getStoredCargosSST();
  const docsFirmados = getStoredDocumentosFirmados();
  const enviosPendientes = getStoredEnviosPendientes();
  const partesInteresadas = getStoredPartesInteresadas();

  const esIntencionNavegar =
    /\b(llevame|abre|abrir|quiero entrar|entrar a|ir a|muestrame|mostrar|quiero ver|ver el|ver la|ver los|donde estan|donde esta|busca|buscar|encuentra|consultar|consulta|revisar)\b/.test(
      norm
    );

  // ========================================================================
  // 0. SALUDO O PREGUNTA POR APARTADOS DE LA HERRAMIENTA
  // ========================================================================
  if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|frikacito|ayuda)$/.test(norm)) {
    return {
      reply: `¡Hola! Qué gusto acompañarte, ${usuarioEtiqueta}. Puedo llevarte directo a cualquier apartado de Frikaz S.A.S., buscar riesgos, documentos, formatos, actividades o resolver tus dudas sobre el SG-SST. ¿Por dónde empezamos?`,
      items: [
        {
          id: 'dir-plan',
          categoria: 'Apartado principal',
          titulo: 'PLAN ANUAL 2027',
          detalle: `${plan2027?.actividades.length || 0} actividades programadas, presupuesto general, cronograma, indicadores, planes de mejora y emergencias.`,
          target: { tab: 'plan_anual', planSeccion: 'resumen', etiquetaDestino: 'PLAN ANUAL 2027' },
        },
        {
          id: 'dir-riesgos',
          categoria: 'Apartado principal',
          titulo: 'Matriz de Riesgos (GTC 45)',
          detalle: `${riesgos.length} peligros identificados en Frikaz S.A.S. con evaluación y controles.`,
          target: { tab: 'matriz_riesgos', etiquetaDestino: 'Matriz de Riesgos GTC 45' },
        },
        {
          id: 'dir-normas',
          categoria: 'Apartado principal',
          titulo: 'Gestión Normativa y Ciclo PHVA',
          detalle: `${normas.length} reglas legales vigentes organizadas en Planear, Hacer, Verificar y Actuar.`,
          target: { tab: 'matriz_tabla', etiquetaDestino: 'Gestión Normativa' },
        },
      ],
    };
  }

  if (
    /\b(que apartados|que modulos|que tiene la herramienta|menu|ir a un apartado|donde puedo ir|apartados disponibles)\b/.test(
      norm
    )
  ) {
    return {
      reply:
        'Con mucho gusto. En la herramienta SG-SST de Frikaz S.A.S. tienes acceso directo a todos estos módulos:',
      items: [
        {
          id: 'map-plan',
          categoria: 'Módulo independiente',
          titulo: 'PLAN ANUAL 2027',
          detalle: 'Resumen, Objetivos, Cronograma, Evidencias, Indicadores Res. 0312, Presupuesto 2027, Mejoras por riesgo, Emergencias, Batería psicosocial y COPASST.',
          target: { tab: 'plan_anual', planSeccion: 'resumen', etiquetaDestino: 'PLAN ANUAL 2027' },
        },
        {
          id: 'map-riesgos',
          categoria: 'Seguridad laboral',
          titulo: 'Matriz de Peligros y Riesgos (GTC 45)',
          detalle: 'Consulta peligros por cargo, nivel de riesgo y medidas de prevención en planta.',
          target: { tab: 'matriz_riesgos', etiquetaDestino: 'Matriz de Riesgos' },
        },
        {
          id: 'map-phva',
          categoria: 'Ciclo de gestión',
          titulo: 'Ciclo PHVA y Gestión Normativa',
          detalle: 'Etapas Planear, Hacer, Verificar y Actuar, lista de normas y Tabla Excel exportable.',
          target: { tab: 'phva_slides', etiquetaDestino: 'Ciclo PHVA' },
        },
        {
          id: 'map-empresa',
          categoria: 'Mi Empresa',
          titulo: 'Políticas, Organigrama, Partes Interesadas y Documentos Firmados',
          detalle: 'Política SST, funciones por cargo, documentos pendientes de aprobación y caracterización.',
          target: {
            tab: 'ficha_empresa',
            empresaSubcategoria: 'politicas',
            etiquetaDestino: 'Mi Empresa · Políticas y Documentos',
          },
        },
        {
          id: 'map-acciones',
          categoria: 'Mejora continua',
          titulo: 'Acciones Correctivas y de Mejora',
          detalle: `${sgsstData.accionesMejora.length} acciones registradas para corregir hallazgos o prevenir riesgos.`,
          target: {
            tab: 'plan_anual',
            planSeccion: 'conexiones',
            subConexiones: 'mejoras',
            etiquetaDestino: 'Acciones Correctivas y de Mejora',
          },
        },
      ],
    };
  }

  // ========================================================================
  // 1. PROTECCIÓN DE PRIVACIDAD MÉDICA INDIVIDUAL Y DATOS SENSIBLES
  // ========================================================================
  if (
    /\b(historia clinica|examen medico|examenes medicos|diagnostico|diagnosticos|enfermedad de|salud de |restriccion medica|restricciones medicas|incapacidad de|cedula|cedulas|datos medicos|dato medico|privacidad medica)\b/.test(
      norm
    )
  ) {
    return {
      reply:
        'Por respeto a tus compañeros y cumplimiento de la Resolución 2346 de 2007, no puedo revelar historias clínicas, diagnósticos médicos individuales ni cédulas por este chat. Los datos médicos individuales están protegidos bajo reserva y solo pueden consultarse mediante el desbloqueo médico autorizado dentro de PLAN ANUAL → Conexiones → Personal.',
      notaPermiso:
        'Privacidad médica activa: solo puedo compartir conteos generales de personal o llevarte al módulo donde el médico ocupacional autorizado desbloquea la información.',
      items: [
        {
          id: 'priv-personal',
          categoria: 'Acceso protegido · Salud Ocupacional',
          titulo: `Módulo de Trabajadores y Salud (${sgsstData.trabajadores.length} fichas registradas)`,
          detalle:
            'Contiene fichas por cargo con bloqueo de historia médica individual para usuarios no autorizados.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'conexiones',
            subConexiones: 'personal',
            etiquetaDestino: 'Trabajadores y Salud (Acceso protegido)',
          },
        },
      ],
    };
  }

  // ========================================================================
  // 2. CONTROL DE ACCESO Y CONFIRMACIÓN ANTES DE CAMBIOS IMPORTANTES / DESTRUCTIVOS
  // ========================================================================
  const pideAccionSensible =
    /\b(elimina|eliminar|borra|borrar|quita|quitar|aprueba|aprobar|valida|validar|cambia el presupuesto|cambiar presupuesto|modifica el presupuesto|modificar presupuesto|modifica la|modificar la|edita la|editar la|cambia el estado|cambiar estado|marcar como cumplido|marcar cumplido|restaurar|reiniciar)\b/.test(
      norm
    );

  if (pideAccionSensible) {
    // Caso A: Usuario SIN permisos de Gerencia
    if (!gerenteActivo) {
      return {
        reply: `En este momento estás trabajando con el perfil «${usuarioEtiqueta}» (modo consulta/trabajador). No puedo autorizar aprobaciones, cambios de presupuesto, ediciones oficiales ni eliminaciones de información porque esas acciones son exclusivas de ${NOMBRE_GERENTE_OFICIAL}.`,
        notaPermiso: `Por seguridad, el asistente respeta los permisos de la herramienta: solo ${NOMBRE_GERENTE_OFICIAL} (ingresando con su correo autorizado) puede realizar aprobaciones o cambios oficiales.`,
        items: [
          {
            id: 'perm-login-gerente',
            categoria: 'Control de acceso · Gerencia',
            titulo: `Ingresar como ${NOMBRE_GERENTE_OFICIAL}`,
            detalle:
              'Abre la ventana oficial para autenticarse con el correo autorizado de Gerencia y habilitar aprobaciones y ediciones.',
            estadoLabel: 'Solo Gerencia',
            target: {
              tab: 'plan_anual',
              specialAction: 'open_gerente_login',
              etiquetaDestino: 'Acceso de Gerencia',
            },
          },
        ],
      };
    }

    // Caso B: Gerente autenticado — localizar qué quiere modificar/aprobar/eliminar y pedir confirmación
    let targetConfirm: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'actividades',
      etiquetaDestino: 'Plan Anual 2027',
    };
    let tituloConfirm = 'Confirmar acceso para cambio importante en Plan Anual 2027';
    let detalleConfirm =
      'Como medida de seguridad, confirma antes de abrir el registro para modificar o eliminar información. Nunca haré un cambio automático ni destructivo sin tu confirmación en pantalla.';

    if (/\b(presupuesto|saldo|monto)\b/.test(norm)) {
      const resPres = calcularResumenPresupuestoPlan(
        plan2027?.actividades || [],
        plan2027?.presupuestoGeneralAprobado || 0
      );
      tituloConfirm = 'Confirmar modificación de Presupuesto 2027';
      detalleConfirm = `El Presupuesto General actual es $${resPres.presupuestoGeneral.toLocaleString(
        'es-CO'
      )}. Si confirmas, te llevaré al formulario oficial para que ajustes y guardes el valor real.`;
      targetConfirm = {
        tab: 'plan_anual',
        planSeccion: 'presupuesto',
        subPresupuesto: 'recursos',
        etiquetaDestino: 'Presupuesto General 2027',
      };
    } else if (/\b(documento|documentos|politica|politicas)\b/.test(norm)) {
      const pendDocs = docsFirmados.filter(
        (d) => normalizarEstadoEstandar(d.estado) === 'Pendiente de revisión'
      ).length;
      tituloConfirm = 'Confirmar revisión/aprobación de documentos';
      detalleConfirm = `Hay ${pendDocs} documento(s) firmado(s) pendiente(s) de revisión y la Política SST está en estado «${normalizarEstadoEstandar(
        politicaSST.estado
      )}». Confirma para abrir la bandeja oficial donde tú decides aprobar o devolver.`;
      targetConfirm = {
        tab: 'ficha_empresa',
        empresaSubcategoria: norm.includes('politica') ? 'politicas' : 'documentos_firmados',
        etiquetaDestino: norm.includes('politica')
          ? 'Política SST'
          : 'Documentos Firmados por Aprobar',
      };
    } else if (/\b(norma|regla|ley)\b/.test(norm)) {
      tituloConfirm = 'Confirmar edición o eliminación de norma';
      detalleConfirm =
        'Te llevaré a Gestión Normativa (Normas y Reglas). Cualquier eliminación o cambio oficial requerirá tu confirmación directa dentro de esa vista.';
      targetConfirm = { tab: 'matriz_tabla', etiquetaDestino: 'Gestión Normativa' };
    } else if (/\b(riesgo|peligro)\b/.test(norm)) {
      tituloConfirm = 'Confirmar cambio en Matriz de Riesgos GTC 45';
      detalleConfirm =
        'Te llevaré a la Matriz de Riesgos para que ubiques el peligro exacto y confirmes en su modal antes de guardar o eliminar.';
      targetConfirm = { tab: 'matriz_riesgos', etiquetaDestino: 'Matriz de Riesgos GTC 45' };
    }

    return {
      reply: `Entendido, ${NOMBRE_GERENTE_OFICIAL}. Antes de aprobar, modificar presupuestos o eliminar información, necesito tu confirmación. Al confirmar, abriré la pantalla oficial correspondiente para que ejecutes y guardes el cambio directamente.`,
      items: [],
      confirmationRequest: {
        titulo: tituloConfirm,
        detalle: detalleConfirm,
        confirmLabel: 'Sí, confirmar y abrir sección',
        target: targetConfirm,
      },
    };
  }

  // ========================================================================
  // 3. PREGUNTAS EDUCATIVAS, CONCEPTUALES Y GUÍAS PASO A PASO (REQ #5 Y #6)
  // ========================================================================
  // 3A. ¿Qué es el SG-SST?
  if (/\b(que es el sg sst|que es sgsst|que significa sgsst|que es sg sst)\b/.test(norm)) {
    return {
      reply: `El SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo) es la forma organizada en que Frikaz S.A.S. cuida la vida, la salud y el bienestar de todos los trabajadores y previene accidentes y enfermedades laborales, siguiendo el Decreto 1072 de 2015 y la Resolución 0312 de 2019 (7 Estándares Mínimos). Funciona en un ciclo continuo: Planear, Hacer, Verificar y Actuar. Hoy tenemos ${riesgos.length} riesgos evaluados y ${plan2027?.actividades.length || 0} actividades programadas en el Plan Anual 2027.`,
      items: [
        {
          id: 'edu-phva',
          categoria: 'Cómo funciona',
          titulo: 'Ver el Ciclo PHVA de Frikaz S.A.S.',
          detalle: 'Explora las 4 etapas (Planear, Hacer, Verificar, Actuar) con nuestras normas.',
          target: { tab: 'phva_slides', etiquetaDestino: 'Ciclo PHVA' },
        },
        {
          id: 'edu-plan',
          categoria: 'Programación 2027',
          titulo: 'Ir al Plan Anual 2027',
          detalle: 'Consulta los objetivos, actividades, responsables, presupuesto e indicadores.',
          target: { tab: 'plan_anual', planSeccion: 'resumen', etiquetaDestino: 'PLAN ANUAL 2027' },
        },
      ],
    };
  }

  // 3B. ¿Para qué sirve o explica la matriz de riesgos?
  if (
    /\b(para que sirve|explica|explicame|que es|como funciona).*(matriz de riesgos|matriz de peligros|gtc 45|gtc45)\b/.test(
      norm
    )
  ) {
    const criticosI = riesgos.filter((r) => r.interpretacionNR === 'I').length;
    const altosII = riesgos.filter((r) => r.interpretacionNR === 'II').length;
    const mediosIII = riesgos.filter((r) => r.interpretacionNR === 'III').length;
    return {
      reply: `La Matriz de Peligros y Riesgos (metodología GTC 45) sirve para identificar qué puede lastimarnos o enfermarnos en cada área y cargo de Frikaz S.A.S. (freidoras, pelado, selección, empaque y entregas), calificar qué tan grave y probable es cada peligro y definir las medidas concretas de protección. En los registros reales de nuestra planta hoy hay ${riesgos.length} peligros evaluados (${criticosI} en Nivel I crítico, ${altosII} en Nivel II alto y ${mediosIII} en Nivel III medio).`,
      items: [
        {
          id: 'edu-mriesgos',
          categoria: 'Ir a consultar',
          titulo: 'Abrir Matriz de Riesgos GTC 45',
          detalle: 'Revisa los peligros por puesto de trabajo, consecuencias y medidas de prevención.',
          target: { tab: 'matriz_riesgos', riskViewMode: 'ficha', etiquetaDestino: 'Matriz de Riesgos GTC 45' },
        },
        {
          id: 'edu-mriesgos-cargos',
          categoria: 'Vista por cargo',
          titulo: 'Ver riesgos organizados por cargo',
          detalle:
            'Consulta qué peligros aplican a los 6 cargos oficiales: Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque y Conductor.',
          target: { tab: 'matriz_riesgos', riskViewMode: 'por_cargos', etiquetaDestino: 'Riesgos por Cargo' },
        },
      ],
      autoNavigateTarget: esIntencionNavegar
        ? { tab: 'matriz_riesgos', riskViewMode: 'ficha', etiquetaDestino: 'Matriz de Riesgos GTC 45' }
        : undefined,
    };
  }

  // 3C. ¿Qué debemos hacer ante una fuga de gas?
  if (/\bfuga de gas\b/.test(norm) && /\b(que hacer|que debemos hacer|como actuar|procedimiento|en caso de|ante una)\b/.test(norm)) {
    const escGas = mejoraStore.planEmergencias.escenarios.find((e) =>
      normalizeText(e.nombre).includes('gas')
    );
    if (escGas) {
      const pasosEmpresa = escGas.queHacer.slice(0, 4).join(' | ');
      const noHacer = escGas.queNoHacer.slice(0, 2).join(' | ');
      return {
        reply: `Según el escenario registrado en nuestro Plan de Emergencias de Frikaz S.A.S. («${escGas.nombre}» — estado en planta: ${
          escGas.estadoValidacion === 'CONFIRMADO' ? 'Confirmado' : 'Por validar en planta'
        }):\n• Pasos internos registrados: ${pasosEmpresa}.\n• Qué NO hacer: ${noHacer}.\n• Cuándo evacuar: ${escGas.cuandoEvacuar}\n• Recomendación general preventiva: nunca encender fósforos ni accionar interruptores eléctricos si hay olor a gas y ventilar desde zona segura.`,
        items: [
          {
            id: 'emg-gas-card',
            categoria: 'Plan de Emergencias · Procedimiento Frikaz',
            titulo: escGas.nombre,
            detalle: `${escGas.sustentoEnFrikaz} · Avisar a: ${escGas.aQuienAvisar}`,
            estadoLabel:
              escGas.estadoValidacion === 'CONFIRMADO' ? 'Confirmado' : 'Por validar en planta',
            target: {
              tab: 'plan_anual',
              planSeccion: 'plan_emergencias',
              subEmergencias: 'amenazas',
              escenarioEmergenciaId: escGas.id,
              etiquetaDestino: escGas.nombre,
            },
          },
        ],
        autoNavigateTarget: esIntencionNavegar
          ? {
              tab: 'plan_anual',
              planSeccion: 'plan_emergencias',
              subEmergencias: 'amenazas',
              escenarioEmergenciaId: escGas.id,
              etiquetaDestino: escGas.nombre,
            }
          : undefined,
      };
    }
  }

  // 3D. ¿Cómo se registra o adjunta una evidencia? / ¿Qué evidencia adjuntar a una capacitación?
  if (
    (/\b(como|donde|pasos para|que)\b/.test(norm) && /\b(evidencia|evidencias|soporte|soportes)\b/.test(norm)) ||
    /\b(que evidencia debemos adjuntar|evidencia.*capacitacion)\b/.test(norm)
  ) {
    const capGuidance = norm.includes('capacitacion')
      ? 'Para una capacitación en Frikaz S.A.S., la evidencia esperada es la lista de asistencia firmada (con fecha, tema y nombre de quienes asistieron), fotos de la jornada y, cuando aplique, evaluación o certificado del instructor.'
      : 'En Frikaz S.A.S., las evidencias válidas son actas firmadas, planillas de asistencia, fotografías de la planta, facturas o certificados cargados como respaldo real.';

    return {
      reply: `${capGuidance}\n\n¿Cómo registrarla paso a paso?\n1. Entra a PLAN ANUAL → Actividades (o Evidencias).\n2. Abre la actividad correspondiente y ve a la pestaña «Evidencias».\n3. Adjunta el archivo o soporte con su fecha y descripción y guárdalo.\n4. La actividad pasará a «Pendiente de revisión» hasta que ${NOMBRE_GERENTE_OFICIAL} verifique el soporte y la apruebe.`,
      items: [
        {
          id: 'step-evidencias',
          categoria: 'Paso a paso · Plan Anual 2027',
          titulo: 'Ir al buzón de Evidencias del Plan Anual',
          detalle: 'Revisa qué actividades ya tienen pruebas adjuntas o cuáles están esperando soporte.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'evidencias',
            etiquetaDestino: 'Evidencias del Plan Anual 2027',
          },
        },
        {
          id: 'step-actividades-ev',
          categoria: 'Actividades 2027',
          titulo: 'Abrir Cronograma para adjuntar evidencia en una actividad',
          detalle: 'Selecciona la tarea y entra a su pestaña «Evidencias».',
          target: {
            tab: 'plan_anual',
            planSeccion: 'actividades',
            subActividades: 'cronograma',
            etiquetaDestino: 'Actividades 2027',
          },
        },
      ],
      autoNavigateTarget: /\b(ir|abre|llevame)\b/.test(norm)
        ? { tab: 'plan_anual', planSeccion: 'evidencias', etiquetaDestino: 'Evidencias 2027' }
        : undefined,
    };
  }

  // 3E. ¿Cómo registro una capacitación?
  if (/\b(como|donde|pasos).*(registro|registrar|programo|programar|creo).*(capacitacion|charla)\b/.test(norm)) {
    return {
      reply: `Puedes registrar o gestionar capacitaciones en dos lugares conectados dentro de PLAN ANUAL 2027:\n1. En «Plan de Emergencias → Capacitaciones y simulacros» para charlas de brigada, extintor Clase K, evacuación o fuga de gas.\n2. En «Planes de mejora por riesgo» o «Actividades → Cronograma» (con permiso de ${NOMBRE_GERENTE_OFICIAL} para nuevas actividades) donde además tienes el material educativo y el Formato de Lista de Asistencia listo para imprimir o descargar en Word.`,
      notaPermiso: !gerenteActivo
        ? `Tu sesión actual puede consultar el cronograma y las guías, pero crear o aprobar actividades oficiales requiere el ingreso de ${NOMBRE_GERENTE_OFICIAL}.`
        : undefined,
      items: [
        {
          id: 'guide-cap-emg',
          categoria: 'Plan de Emergencias',
          titulo: 'Capacitaciones y Simulacros',
          detalle: `${mejoraStore.planEmergencias.programaCapacitacionSimulacros.length} actividades de formación y simulacro programadas.`,
          target: {
            tab: 'plan_anual',
            planSeccion: 'plan_emergencias',
            subEmergencias: 'capacitaciones',
            etiquetaDestino: 'Capacitaciones y Simulacros',
          },
        },
        {
          id: 'guide-cap-asist',
          categoria: 'Formato Editable',
          titulo: 'Formato de Lista de Asistencia y Capacitación',
          detalle: 'Descargable en Word o diligenciable en pantalla para adjuntar como evidencia.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'plan_emergencias',
            subEmergencias: 'capacitaciones',
            formatoId: 'fmt-emg-asistencia-general',
            etiquetaDestino: 'Formato de Asistencia',
          },
        },
      ],
    };
  }

  // 3F. ¿Qué significa una actividad pendiente de revisión?
  if (/\b(que significa|que es).*(pendiente de revision)\b/.test(norm)) {
    const enRev = (plan2027?.actividades || []).filter(
      (a) => normalizarEstadoEstandar(a.estado) === 'Pendiente de revisión'
    ).length;
    return {
      reply: `«Pendiente de revisión» significa que el responsable ya realizó la tarea o subió una evidencia/soporte, pero todavía falta que ${NOMBRE_GERENTE_OFICIAL} la revise y decida si queda «Aprobado», «Cumplido» o «Devuelto para ajustes». Ningún trabajador puede autoaprobar su propia tarea. Actualmente hay ${enRev} actividad(es) en este estado en el Plan Anual 2027.`,
      items: [
        {
          id: 'sig-rev-act',
          categoria: 'Estado oficial',
          titulo: `Ver actividades «Pendiente de revisión» (${enRev})`,
          detalle: 'Filtra el cronograma 2027 directamente por este estado.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'actividades',
            subActividades: 'cronograma',
            cronogramaEstadoFiltro: 'Pendiente de revisión',
            etiquetaDestino: 'Actividades Pendientes de Revisión',
          },
        },
      ],
    };
  }

  // 3G. ¿Qué debo registrar en este formato? / ¿Cómo se realiza una inspección?
  if (/\b(que debo registrar|como llenar|como diligenciar).*(formato|lista de chequeo)\b/.test(norm)) {
    return {
      reply:
        'Para diligenciar cualquier formato de Frikaz S.A.S. correctamente debes registrar:\n1. Datos del encabezado: fecha exacta, área de la planta revisada, turno y nombre completo de quien diligencia.\n2. Cada ítem de verificación marcando Sí / No / No aplica y anotando observaciones claras si encuentras fallas (ej. temperatura alta, piso húmedo, EPP dañado).\n3. La Caja de Calidad (código, versión y elaboró/revisó). Recuerda que llenar o descargar el formato en Word NO marca la actividad como cumplida hasta que se adjunte firmado y lo apruebe Gerencia.',
      items: [
        {
          id: 'fmt-guide-riesgo',
          categoria: 'Formatos por riesgo',
          titulo: 'Ver formatos de chequeo en Planes de Mejora por Riesgo',
          detalle: 'Abre cualquiera de las listas de chequeo editables con su Caja de Calidad.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'planes_riesgo',
            etiquetaDestino: 'Planes de Mejora y Formatos',
          },
        },
      ],
    };
  }

  if (/\b(como se realiza|como hacer|pasos).*(inspeccion|inspecciones)\b/.test(norm)) {
    const formatosInsp = Object.values(mejoraStore.formatos).filter((f) =>
      normalizeText(`${f.titulo} ${f.id}`).includes('inspeccion')
    );
    return {
      reply: `En Frikaz S.A.S. una inspección de seguridad se realiza siguiendo estos pasos:\n1. Abre el formato o lista de chequeo correspondiente al área o equipo (freidoras, ruido, máquinas, extintores o botiquín).\n2. Recorre el puesto de trabajo observando condiciones de orden, limpieza, guardas de seguridad, señalización y uso real de EPP.\n3. Registra cada hallazgo con fotos u observaciones reales (sin inventar datos).\n4. Si detectas una falla, repórtala de inmediato en Acciones de Mejora y adjunta la lista firmada como evidencia para revisión de ${NOMBRE_GERENTE_OFICIAL}.`,
      items: formatosInsp.slice(0, 4).map((f) => ({
        id: `insp-${f.id}`,
        categoria: 'Formato de Inspección',
        titulo: f.titulo,
        detalle: `Código: ${f.cajaCalidad.codigo} · Editable y descargable en Word.`,
        target: {
          tab: 'plan_anual',
          planSeccion: f.categoria === 'PLAN_EMERGENCIAS' ? 'plan_emergencias' : 'planes_riesgo',
          formatoId: f.id,
          etiquetaDestino: f.titulo,
        },
      })),
    };
  }

  // 3H. ¿Qué medidas tenemos para prevenir atrapamientos? (o consulta específica de medidas para un peligro)
  if (/\b(que medidas|medidas para prevenir|como prevenir|controles para)\b/.test(norm)) {
    const kwsMed = extractKeywords(norm).filter(
      (k) => !['medidas', 'prevenir', 'prevencion', 'controles', 'control'].includes(k)
    );
    const searchStr = kwsMed.join(' ') || norm;
    // Expandimos raíces para plurals comunes como atrapamientos -> atrapamiento
    const expandedKws = kwsMed.map((k) => (k.endsWith('s') && k.length > 4 ? k.slice(0, -1) : k));

    const riesgosMatch = riesgos.filter(
      (r) =>
        scoreMatch(
          `${r.peligroDescripcion} ${r.peligroClasificacion} ${r.efectosPosibles} ${r.actividades} ${r.medidaControlesIngenieria} ${r.medidaControlesAdministrativos} ${r.medidaEquiposEPP} ${r.controlesFuente} ${r.controlesMedio} ${r.controlesIndividuo}`,
          searchStr,
          expandedKws
        ) > 0
    );

    const planesMatch = mejoraStore.planesPorRiesgo.filter(
      (p) =>
        scoreMatch(
          `${p.nombreRiesgo} ${p.situacionQueSeBuscaMejorar} ${p.medidaPrevencionControl} ${p.actividadMejoraPropuesta}`,
          searchStr,
          expandedKws
        ) > 0
    );

    if (riesgosMatch.length > 0 || planesMatch.length > 0) {
      const rTop = riesgosMatch[0];
      const pTop = planesMatch[0];
      const resumenMedidas = rTop
        ? extraerMedidasRiesgo(rTop)
        : pTop
        ? pTop.medidaPrevencionControl
        : '';

      const items: AssistantMatchCard[] = [];
      riesgosMatch.slice(0, 3).forEach((r) => {
        items.push({
          id: `med-rsk-${r.id}`,
          categoria: `Matriz GTC 45 · Nivel ${r.interpretacionNR}`,
          titulo: `${r.codigo || r.id}: ${r.peligroDescripcion}`,
          detalle: `Medidas registradas: ${extraerMedidasRiesgo(r)}`,
          estadoLabel: `Nivel ${r.interpretacionNR}`,
          target: {
            tab: 'matriz_riesgos',
            riskId: r.id,
            searchQuery: expandedKws[0] || '',
            etiquetaDestino: `Riesgo ${r.codigo || r.id}`,
          },
        });
      });
      planesMatch.slice(0, 2).forEach((p) => {
        items.push({
          id: `med-pm-${p.id}`,
          categoria: `Plan de Mejora #${p.orden}`,
          titulo: p.nombreRiesgo,
          detalle: `Control: ${p.medidaPrevencionControl}`,
          estadoLabel: normalizarEstadoEstandar(p.estado),
          target: {
            tab: 'plan_anual',
            planSeccion: 'planes_riesgo',
            planMejoraId: p.id,
            etiquetaDestino: p.nombreRiesgo,
          },
        });
      });

      return {
        reply: `En la Matriz de Riesgos y Planes de Mejora de Frikaz S.A.S. encontré ${
          riesgosMatch.length + planesMatch.length
        } registro(s) con controles reales: ${resumenMedidas}`,
        items,
      };
    }
  }

  // 3H-bis. COPASST (dentro de PLAN ANUAL 2027)
  if (
    /\b(copasst|comite paritario|votacion|eleccion|elecciones|representante de los trabajadores|representantes del empleador|simulacion copasst|actas copasst|reunion copasst)\b/.test(
      norm
    )
  ) {
    const copStore = loadCopasstStore();
    const votosCount = copStore.procesoEleccion.votos.length;
    const candidatosCount = copStore.procesoEleccion.candidatos.length;
    const miembrosActivos = copStore.miembros.filter((m) => m.estado === 'Activo').length;
    const subCop = norm.includes('votac') || norm.includes('elecc') || norm.includes('candidato')
      ? 'votacion'
      : norm.includes('miembro') || norm.includes('integrante')
      ? 'miembros'
      : norm.includes('funcion') || norm.includes('responsabilidad')
      ? 'funciones'
      : norm.includes('correo') || norm.includes('notific')
      ? 'notificaciones'
      : norm.includes('simulac') || norm.includes('organigrama')
      ? 'simulacion'
      : norm.includes('acta') || norm.includes('repositorio') || norm.includes('archivo')
      ? 'repositorio'
      : 'conformacion';

    const targetCop: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'copasst',
      subCopasst: subCop,
      etiquetaDestino: 'PLAN ANUAL → COPASST',
    };

    return {
      reply: `El apartado «COPASST – Comité Paritario de Seguridad y Salud en el Trabajo» está integrado dentro de PLAN ANUAL 2027 → COPASST. Estado actual: convocatoria ${
        copStore.procesoEleccion.fechaConvocatoria || 'Pendiente de registro'
      }, ${candidatosCount} candidato(s) postulado(s), ${votosCount} voto(s) registrado(s), ${miembrosActivos} miembro(s) activo(s) y ${
        copStore.repositorioDocumentos.length
      } documento(s) en repositorio.`,
      items: [
        {
          id: 'copasst-main',
          categoria: 'PLAN ANUAL 2027 · COPASST',
          titulo: 'Abrir COPASST – Comité Paritario SST',
          detalle:
            'Gestiona conformación, votación secreta, miembros oficiales, 10 funciones, envío real de correos, simulación sobre organigrama y repositorio.',
          target: targetCop,
        },
        {
          id: 'copasst-sim',
          categoria: 'Simulación Visual',
          titulo: 'Simulación del COPASST en el organigrama',
          detalle: 'Visualiza cómo quedaría integrado el comité con los 6 cargos oficiales.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'copasst',
            subCopasst: 'simulacion',
            etiquetaDestino: 'Simulación COPASST',
          },
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetCop : undefined,
    };
  }

  // 3H-ter. VIGÍA SST (en 1. Equipo y responsabilidades en SST)
  if (/\b(vigia|vigia sst|vigia de seguridad)\b/.test(norm)) {
    const vigia = getStoredVigiaSST();
    const targetVigia: AssistantNavigationTarget = {
      tab: 'ficha_empresa',
      empresaSubcategoria: 'organigrama',
      etiquetaDestino: 'Vigía SST · Organigrama',
    };
    return {
      reply: `El Vigía de Seguridad y Salud en el Trabajo (SST) hace parte de «1. Equipo y responsabilidades en SST» como una función asignada dentro de los 6 cargos oficiales (sin crear un 7.º cargo). Estado actual: ${vigia.estado}${
        vigia.nombrePersona ? ` · Persona designada: ${vigia.nombrePersona}` : ' · Persona pendiente de confirmación'
      }${vigia.cargoBase ? ` (cargo oficial base: ${vigia.cargoBase})` : ''}.`,
      items: [
        {
          id: 'vigia-org',
          categoria: 'Mi Empresa · 1. Equipo y responsabilidades en SST',
          titulo: `Vigía SST (${vigia.estado})`,
          detalle: `${vigia.responsabilidades.length} responsabilidades definidas · Envío por correo y descarga en Word (.DOCX).`,
          estadoLabel: vigia.estado,
          target: targetVigia,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetVigia : undefined,
    };
  }

  // 3H-quater. BATERÍA DE RIESGO PSICOSOCIAL (dentro de PLAN ANUAL 2027)
  if (
    /\b(psicosocial|bateria psicosocial|forma a|forma b|riesgo psicosocial|estres laboral|cuestionario psicosocial)\b/.test(
      norm
    )
  ) {
    const psiStore = loadRiesgoPsicosocialStore(sgsstData.trabajadores);
    const evaluados = psiStore.registros.filter((r) => r.estadoEvaluacion !== 'Pendiente').length;
    const autorizado = Boolean(context.accesoMedicoAutorizado) || gerenteActivo;
    const subPsi: 'registro' | 'aplicacion' | 'repositorio' | 'consolidado' | 'excel' =
      norm.includes('cuestionario') || norm.includes('forma') || norm.includes('aplicacion')
        ? 'aplicacion'
        : norm.includes('resultado') || norm.includes('informe') || norm.includes('estres') || norm.includes('consolidado')
        ? 'consolidado'
        : norm.includes('excel')
        ? 'excel'
        : norm.includes('repositorio') || norm.includes('archivo')
        ? 'repositorio'
        : 'registro';
    const targetPsi: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'riesgo_psicosocial',
      subPsicosocial: subPsi,
      etiquetaDestino: 'Batería de Riesgo Psicosocial',
    };
    return {
      reply: `La Batería de Riesgo Psicosocial (Resolución 2764 de 2022) está dentro de PLAN ANUAL 2027 → Batería psicosocial. Hay ${psiStore.registros.length} trabajador(es) vinculado(s) (${evaluados} con registro evaluado). ${
        autorizado
          ? 'Tienes acceso autorizado para consultar resultados.'
          : 'Por confidencialidad clínica, los resultados individuales permanecen bloqueados y solo los ve el médico ocupacional autorizado o Gerencia.'
      }`,
      notaPermiso: !autorizado
        ? 'Confidencialidad médica activa: puedes consultar indicadores grupales y cuestionarios, pero los resultados individuales están protegidos.'
        : undefined,
      items: [
        {
          id: 'psi-main',
          categoria: 'PLAN ANUAL 2027 · Riesgo Psicosocial',
          titulo: 'Batería de Riesgo Psicosocial (Forma A, Forma B y Estrés)',
          detalle: `${psiStore.registros.length} trabajadores vinculados · Auditoría de accesos y planes de intervención.`,
          target: targetPsi,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetPsi : undefined,
    };
  }

  // 3H-quinquies. CERTIFICADOS, REPOSITORIO Y TRAZABILIDAD DE PLANES DE MEJORA
  if (/\b(certificado|certificados|repositorio documental|trazabilidad)\b/.test(norm)) {
    const repo = loadPlanMejoraRepositorio();
    const subPM = norm.includes('certificado') ? 'certificados' : 'repositorio';
    const targetRepo: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'planes_riesgo',
      subPlanesMejora: subPM,
      etiquetaDestino:
        subPM === 'certificados'
          ? 'Certificados de Participación'
          : 'Repositorio Documental de Planes de Mejora',
    };
    return {
      reply: `En PLAN ANUAL 2027 → Planes mejora riesgo encuentras el módulo de Certificados de Participación (${repo.certificados.length} emitidos, únicamente a quienes tengan asistencia confirmada) y el Repositorio Documental (${repo.documentos.length} soportes) junto con la descarga de trazabilidad en Excel.`,
      items: [
        {
          id: 'pm-cert-repo',
          categoria: 'Planes de Mejora por Riesgo',
          titulo:
            subPM === 'certificados'
              ? `Certificados en PDF (${repo.certificados.length})`
              : `Repositorio Documental (${repo.documentos.length})`,
          detalle:
            'Validación estricta de asistencia, vista previa e impresión de certificados y descarga en Excel.',
          target: targetRepo,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetRepo : undefined,
    };
  }

  // 3I. ¿Cuáles son los cargos oficiales de Frikaz S.A.S.?
  if (
    /\b(cuales son los cargos|cuantos cargos|lista de cargos|los cargos de frikaz|los 6 cargos|seis cargos|cargos oficiales|que cargos hay|puestos de trabajo)\b/.test(
      norm
    )
  ) {
    const trabajadoresActivos = sgsstData.trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO');
    const resumenCargos = CARGOS_OFICIALES_LISTA.map((def, idx) => {
      const countTrab = trabajadoresActivos.filter(
        (t) => obtenerIdCargoOficial(t.cargoId || t.cargoNombre) === def.id
      ).length;
      const countRiesgos = riesgos.filter((r) =>
        coincideConCargoOficial(def.nombre, r.cargo, r.cargosExpuestos)
      ).length;
      return `${idx + 1}. ${def.nombre} (${countTrab} trabajador(es) · ${countRiesgos} peligro(s) GTC 45)`;
    }).join('\n');

    const targetOrg: AssistantNavigationTarget = {
      tab: 'ficha_empresa',
      empresaSubcategoria: 'organigrama',
      etiquetaDestino: '1. Equipo y responsabilidades en SST',
    };

    return {
      reply: `En toda la herramienta SG-SST de Frikaz S.A.S., la fuente oficial («1. Equipo y responsabilidades en SST») define únicamente seis (6) cargos oficiales:\n${resumenCargos}`,
      items: [
        {
          id: 'cargos-org',
          categoria: 'Fuente principal · Mi Empresa',
          titulo: '1. Equipo y responsabilidades en SST (6 cargos oficiales)',
          detalle: `Cargos oficiales vigentes: ${CARGOS_OFICIALES_NOMBRES.join(', ')}.`,
          target: targetOrg,
        },
        {
          id: 'cargos-mr',
          categoria: 'Matriz GTC 45 por Cargo',
          titulo: 'Ver peligros y controles por cada uno de los 6 cargos',
          detalle: `${riesgos.length} registros GTC 45 vinculados estrictamente a los 6 cargos oficiales.`,
          target: {
            tab: 'matriz_riesgos',
            riskViewMode: 'por_cargos',
            etiquetaDestino: 'Matriz GTC 45 por Cargo',
          },
        },
        {
          id: 'cargos-personal',
          categoria: 'Plan Anual 2027 · Personal',
          titulo: `Ver trabajadores asignados (${trabajadoresActivos.length} activos)`,
          detalle: 'Cada trabajador está vinculado a uno de los 6 cargos oficiales.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'conexiones',
            subConexiones: 'personal',
            etiquetaDestino: 'Trabajadores por Cargo',
          },
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetOrg : undefined,
    };
  }

  // 3J. Consulta específica sobre uno de los 6 cargos oficiales
  const esConsultaNoCargo =
    /\b(modo gerente|ingresar como|iniciar sesion|cerrar sesion|presupuesto|aprob|politica|documento|firmado)\b/.test(
      norm
    );
  const cargoDetectado: CargoOficialNombre | null = esConsultaNoCargo
    ? null
    : /\boperari[oa]s? de seleccion\b|\bcargo de seleccion\b|\bseleccion\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|trabajador|trabajadores|hace|aplica)\b/.test(
        norm
      )
    ? 'Operario de selección'
    : /\boperari[oa]s? de pelado\b|\bcargo de pelado\b|\bpelado\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|trabajador|trabajadores|hace|aplica)\b/.test(
        norm
      )
    ? 'Operario de pelado'
    : /\boperari[oa]s? de frito\b|\bcargo de frito\b|\bfrito\b|\bfritura\b|\bfreidora\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|trabajador|trabajadores|hace|aplica)\b/.test(
        norm
      )
    ? 'Operario de frito'
    : /\boperari[oa]s? de empaque\b|\bcargo de empaque\b|\bempaque\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|trabajador|trabajadores|hace|aplica)\b/.test(
        norm
      )
    ? 'Operario de empaque'
    : /\bconductor(es)?\b|\breparto\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|trabajador|trabajadores|hace|aplica)\b/.test(
        norm
      )
    ? 'Conductor'
    : /\bgerente\b/.test(norm) &&
      /\b(cargo|riesgo|riesgos|peligro|peligros|funcion|funciones|responsabilidad|responsabilidades|actividad|actividades|que hace)\b/.test(
        norm
      )
    ? 'Gerente'
    : null;

  if (cargoDetectado) {
    const cargoId = obtenerIdCargoOficial(cargoDetectado);
    const cargoInfo = cargosSST.find(
      (c) => c.id === cargoId || normalizeText(c.nombre) === normalizeText(cargoDetectado)
    );
    const trabajadoresCargo = sgsstData.trabajadores.filter(
      (t) => t.estadoLaboral === 'ACTIVO' && obtenerIdCargoOficial(t.cargoId || t.cargoNombre) === cargoId
    );
    const riesgosCargo = riesgos.filter((r) =>
      coincideConCargoOficial(cargoDetectado, r.cargo, r.cargosExpuestos)
    );
    const planesCargo = mejoraStore.planesPorRiesgo.filter((p) =>
      coincideConCargoOficial(cargoDetectado, p.responsable, p.cargoMatriz)
    );
    const actividadesCargo = (plan2027?.actividades || []).filter(
      (a) => obtenerIdCargoOficial(a.responsableId || a.responsableCargo) === cargoId
    );

    const criticosCargo = riesgosCargo.filter(
      (r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II'
    ).length;
    const funcionesResumen =
      cargoInfo?.responsabilidades?.slice(0, 2).join(' · ') ||
      cargoInfo?.areaProceso ||
      cargoDetectado;

    const itemsCargo: AssistantMatchCard[] = [
      {
        id: `cargo-org-${cargoId}`,
        categoria: '1. Equipo y responsabilidades en SST',
        titulo: `${cargoDetectado} (${trabajadoresCargo.length} trabajador(es) activo(s))`,
        detalle: `Área: ${cargoInfo?.areaProceso || 'Frikaz S.A.S.'} · Responsabilidades SST: ${funcionesResumen}`,
        target: {
          tab: 'ficha_empresa',
          empresaSubcategoria: 'organigrama',
          cargoPeligrosId: cargoId,
          etiquetaDestino: `Peligros en Organigrama · ${cargoDetectado}`,
        },
      },
      {
        id: `cargo-rsk-${cargoId}`,
        categoria: `Matriz GTC 45 · ${riesgosCargo.length} peligro(s)`,
        titulo: `Riesgos asociados a ${cargoDetectado} (${criticosCargo} Nivel I/II)`,
        detalle:
          riesgosCargo.length > 0
            ? riesgosCargo
                .slice(0, 2)
                .map((r) => `${r.peligroDescripcion} (Nivel ${r.interpretacionNR})`)
                .join(' | ')
            : 'Sin peligros críticos registrados para este cargo.',
        target: {
          tab: 'matriz_riesgos',
          riskViewMode: 'por_cargos',
          searchQuery: cargoDetectado,
          etiquetaDestino: `Riesgos de ${cargoDetectado}`,
        },
      },
      {
        id: `cargo-pm-${cargoId}`,
        categoria: `Planes de Mejora · ${planesCargo.length}`,
        titulo: `Planes de mejora vinculados a ${cargoDetectado}`,
        detalle:
          planesCargo.length > 0
            ? planesCargo
                .slice(0, 2)
                .map((p) => p.nombreRiesgo)
                .join(' | ')
            : 'Consulta los planes preventivos en el Plan Anual 2027.',
        target: {
          tab: 'plan_anual',
          planSeccion: 'planes_riesgo',
          etiquetaDestino: `Planes de Mejora · ${cargoDetectado}`,
        },
      },
    ];

    if (actividadesCargo.length > 0) {
      itemsCargo.push({
        id: `cargo-act-${cargoId}`,
        categoria: `Plan Anual 2027 · ${actividadesCargo.length} actividad(es)`,
        titulo: `Actividades 2027 asignadas a ${cargoDetectado}`,
        detalle: actividadesCargo
          .slice(0, 2)
          .map((a) => `${a.nombre} (${normalizarEstadoEstandar(a.estado)})`)
          .join(' | '),
        target: {
          tab: 'plan_anual',
          planSeccion: 'actividades',
          subActividades: 'responsables',
          etiquetaDestino: `Responsabilidades 2027 · ${cargoDetectado}`,
        },
      });
    }

    return {
      reply: `El cargo oficial «${cargoDetectado}» (área: ${
        cargoInfo?.areaProceso || 'Frikaz S.A.S.'
      }) cuenta actualmente con ${trabajadoresCargo.length} trabajador(es) activo(s), ${
        riesgosCargo.length
      } peligro(s) evaluados en la Matriz GTC 45 (${criticosCargo} de prioridad I/II), ${
        planesCargo.length
      } plan(es) de mejora por riesgo y ${
        actividadesCargo.length
      } actividad(es) asignadas en el Plan Anual 2027.`,
      items: itemsCargo,
    };
  }

  // ========================================================================
  // 4. DOCUMENTOS PENDIENTES DE APROBACIÓN / DOCUMENTOS FIRMADOS / POLÍTICAS
  // ========================================================================
  if (
    /\b(documentos pendientes|pendientes de aprobacion|documentos firmados|documentos por aprobar|bandeja de documentos|envios pendientes|politica sst|politicas y documentos|politicas|politica)\b/.test(
      norm
    )
  ) {
    const esPoliticaDirecta =
      /\b(politica sst|politicas y documentos|politicas|politica)\b/.test(norm) &&
      !norm.includes('aprobacion') &&
      !norm.includes('firmado');

    if (esPoliticaDirecta) {
      const estadoPol = normalizarEstadoEstandar(politicaSST.estado);
      const itemPol: AssistantMatchCard = {
        id: 'nav-politica-sst',
        categoria: 'Políticas y Documentos · Mi Empresa',
        titulo: `${politicaSST.titulo} (Versión ${politicaSST.versionActual})`,
        detalle: `Firmante: ${politicaSST.nombreFirmante} · ${politicaSST.compromisos.length} compromisos registrados · Última actualización: ${politicaSST.fechaUltimaActualizacion}.`,
        estadoLabel: estadoPol,
        target: {
          tab: 'ficha_empresa',
          empresaSubcategoria: 'politicas',
          etiquetaDestino: 'Política de Seguridad y Salud en el Trabajo',
        },
      };

      const itemDocs: AssistantMatchCard = {
        id: 'nav-docs-firmados-rel',
        categoria: 'Documentos Firmados · Mi Empresa',
        titulo: `Documentos firmados recibidos (${docsFirmados.length})`,
        detalle: `Incluye las políticas y responsabilidades enviadas y devueltas por el equipo.`,
        target: {
          tab: 'ficha_empresa',
          empresaSubcategoria: 'documentos_firmados',
          etiquetaDestino: 'Documentos Firmados Recibidos',
        },
      };

      return {
        reply: `La Política del SG-SST de Frikaz S.A.S. es «${politicaSST.titulo}» (Versión ${politicaSST.versionActual}, estado actual: ${estadoPol}). La encuentras en Mi Empresa → Políticas y Documentos.`,
        items: [itemPol, itemDocs],
        autoNavigateTarget: esIntencionNavegar ? itemPol.target : undefined,
      };
    }

    const docsPendientes = docsFirmados.filter((d) => {
      const est = normalizarEstadoEstandar(d.estado);
      return est === 'Pendiente de revisión' || est === 'En proceso' || est === 'Devuelto para ajustes';
    });

    const items: AssistantMatchCard[] = docsPendientes.slice(0, 5).map((d) => ({
      id: `docf-${d.id}`,
      categoria: `Documento ${d.envioId} · ${d.cargo}`,
      titulo: d.nombreArchivoRecibido,
      detalle: `${d.nombreTrabajador} · Recibido: ${d.fechaRecepcion} · ${d.observacionesRevision}`,
      estadoLabel: normalizarEstadoEstandar(d.estado),
      target: {
        tab: 'ficha_empresa',
        empresaSubcategoria: 'documentos_firmados',
        etiquetaDestino: 'Documentos Pendientes de Aprobación',
      },
    }));

    if (normalizarEstadoEstandar(politicaSST.estado) !== 'Aprobado') {
      items.push({
        id: 'pol-pend',
        categoria: 'Política SST',
        titulo: `${politicaSST.titulo} (${politicaSST.versionActual})`,
        detalle: `Estado actual de aprobación gerencial: ${normalizarEstadoEstandar(politicaSST.estado)}.`,
        estadoLabel: normalizarEstadoEstandar(politicaSST.estado),
        target: {
          tab: 'ficha_empresa',
          empresaSubcategoria: 'politicas',
          etiquetaDestino: 'Política SST',
        },
      });
    }

    const navDocs: AssistantNavigationTarget = {
      tab: 'ficha_empresa',
      empresaSubcategoria: 'documentos_firmados',
      etiquetaDestino: 'Documentos Firmados y Pendientes de Aprobación',
    };

    return {
      reply: `En la bandeja de Documentos Firmados hay ${docsPendientes.length} documento(s) pendiente(s) de revisión/aprobación por Gerencia y ${enviosPendientes.length} envío(s) esperando devolución del trabajador. Además, la Política SST está en estado «${normalizarEstadoEstandar(
        politicaSST.estado
      )}».`,
      notaPermiso: !gerenteActivo
        ? `Puedes consultar los envíos y estados, pero solo ${NOMBRE_GERENTE_OFICIAL} puede aprobar o devolver documentos.`
        : undefined,
      items:
        items.length > 0
          ? items
          : [
              {
                id: 'doc-todos-ok',
                categoria: 'Documentos Firmados',
                titulo: 'Ir a Documentos Firmados Recibidos',
                detalle: `Actualmente hay ${docsFirmados.length} documentos registrados y ninguno pendiente de aprobación.`,
                target: navDocs,
              },
            ],
      autoNavigateTarget: esIntencionNavegar ? navDocs : undefined,
    };
  }

  // ========================================================================
  // 5. PRESUPUESTO 2027 / SALDO / EJECUCIÓN
  // ========================================================================
  if (
    /\b(presupuesto|saldo|ejecutado|ejecucion presupuestal|dinero|plata|financiero|gasto)\b/.test(
      norm
    )
  ) {
    const resPres = calcularResumenPresupuestoPlan(
      plan2027?.actividades || [],
      plan2027?.presupuestoGeneralAprobado || 0
    );
    const items: AssistantMatchCard[] = [
      {
        id: 'nav-presupuesto-2027',
        categoria: 'Presupuesto 2027',
        titulo: 'PRESUPUESTO GENERAL 2027 y distribución por actividad',
        detalle: `General: $${resPres.presupuestoGeneral.toLocaleString(
          'es-CO'
        )} · Distribuido: $${resPres.aprobado.toLocaleString(
          'es-CO'
        )} · Ejecutado: $${resPres.ejecutado.toLocaleString(
          'es-CO'
        )} (${resPres.porcentajeEjecucion}%) · Saldo disponible: $${resPres.saldoDisponible.toLocaleString(
          'es-CO'
        )}.`,
        estadoLabel: resPres.superaPresupuestoGeneral ? 'Revisar tope' : 'Activo 2027',
        target: {
          tab: 'plan_anual',
          planSeccion: 'presupuesto',
          subPresupuesto: 'recursos',
          etiquetaDestino: 'Presupuesto General 2027',
        },
      },
      {
        id: 'nav-reportes-2027',
        categoria: 'Reportes 2027',
        titulo: 'Reportes e informes de presupuesto y cumplimiento 2027',
        detalle: `Resumen consolidado por área, responsable y trimestre para exportar a Excel o PDF.`,
        target: {
          tab: 'plan_anual',
          planSeccion: 'presupuesto',
          subPresupuesto: 'reportes',
          etiquetaDestino: 'Reportes 2027',
        },
      },
    ];

    const alertaTope = resPres.superaPresupuestoGeneral
      ? ' Atención: lo distribuido en actividades supera el Presupuesto General 2027.'
      : '';

    return {
      reply: `Presupuesto 2027 de Frikaz S.A.S.: Presupuesto general aprobado $${resPres.presupuestoGeneral.toLocaleString(
        'es-CO'
      )}, distribuido en actividades $${resPres.aprobado.toLocaleString(
        'es-CO'
      )}, programado estimado $${resPres.programado.toLocaleString(
        'es-CO'
      )}, ejecutado $${resPres.ejecutado.toLocaleString(
        'es-CO'
      )} (${resPres.porcentajeEjecucion}%) y saldo disponible $${resPres.saldoDisponible.toLocaleString(
        'es-CO'
      )}.${alertaTope}`,
      notaPermiso: !gerenteActivo
        ? `Solo ${NOMBRE_GERENTE_OFICIAL} puede modificar el Presupuesto General 2027 o aprobar montos por actividad.`
        : undefined,
      items,
      autoNavigateTarget: esIntencionNavegar ? items[0].target : undefined,
    };
  }

  // ========================================================================
  // 6. SIMULACROS Y EVIDENCIAS DE SIMULACROS
  // ========================================================================
  if (/\b(simulacro|simulacros)\b/.test(norm)) {
    const simulacros = mejoraStore.planEmergencias.programaCapacitacionSimulacros.filter(
      (a) => a.tipo === 'SIMULACRO' || normalizeText(a.titulo).includes('simulacro')
    );
    const actsSimulacroPlan = (plan2027?.actividades || []).filter((a) =>
      normalizeText(`${a.nombre} ${a.descripcion}`).includes('simulacro')
    );
    const totalEvidencias =
      actsSimulacroPlan.reduce((sum, a) => sum + a.evidencias.length, 0) +
      simulacros.reduce((sum, s) => sum + s.evidencias.length, 0) +
      mejoraStore.planEmergencias.evidenciasPlan.length;

    const items: AssistantMatchCard[] = [];
    simulacros.forEach((sim) => {
      const reg = sim.registroSimulacro;
      const detalleReg = reg?.fechaEjecucionReal
        ? `Ejecutado el ${reg.fechaEjecucionReal} (${reg.participantesReales ?? '—'}/${reg.participantesEsperados ?? '—'} part.)`
        : `Programado: ${sim.fechaProgramada || 'Por definir'} (Pendiente de ejecución)`;
      items.push({
        id: `sim-${sim.id}`,
        categoria: 'Simulacro · Plan de Emergencias',
        titulo: sim.titulo,
        detalle: `${detalleReg} · Responsable: ${sim.responsable} · Soportes adjuntos: ${sim.evidencias.length}.`,
        estadoLabel: normalizarEstadoEstandar(sim.estado),
        target: {
          tab: 'plan_anual',
          planSeccion: 'plan_emergencias',
          subEmergencias: 'capacitaciones',
          etiquetaDestino: 'Simulacros y Capacitaciones',
        },
      });
    });

    actsSimulacroPlan.forEach((act) => {
      items.push({
        id: `act-sim-${act.id}`,
        categoria: 'Actividad Plan Anual 2027',
        titulo: `${act.codigo} · ${act.nombre}`,
        detalle: `Fecha límite: ${act.fechaLimite} · Evidencias cargadas: ${act.evidencias.length} · Responsable: ${act.responsableNombre}.`,
        estadoLabel: normalizarEstadoEstandar(act.estado),
        target: {
          tab: 'plan_anual',
          planSeccion: 'actividades',
          actividadId: act.id,
          actividadModalTab: 'evidencias',
          etiquetaDestino: `Evidencias de ${act.codigo}`,
        },
      });
    });

    if (mejoraStore.formatos['fmt-emg-registro-simulacro']) {
      items.push({
        id: 'fmt-sim-acta',
        categoria: 'Formato Editable',
        titulo: mejoraStore.formatos['fmt-emg-registro-simulacro'].titulo,
        detalle: `Código ${mejoraStore.formatos['fmt-emg-registro-simulacro'].cajaCalidad.codigo} · Descargable en Word con Caja de Calidad.`,
        target: {
          tab: 'plan_anual',
          planSeccion: 'plan_emergencias',
          subEmergencias: 'capacitaciones',
          formatoId: 'fmt-emg-registro-simulacro',
          etiquetaDestino: 'Formato de Registro de Simulacro',
        },
      });
    }

    const navPreferido: AssistantNavigationTarget =
      norm.includes('evidencia') && actsSimulacroPlan.length > 0
        ? {
            tab: 'plan_anual',
            planSeccion: 'plan_emergencias',
            subEmergencias: 'formatos_cierre',
            etiquetaDestino: 'Evidencias del Plan de Emergencias',
          }
        : {
            tab: 'plan_anual',
            planSeccion: 'plan_emergencias',
            subEmergencias: 'capacitaciones',
            etiquetaDestino: 'Simulacros en Plan de Emergencias',
          };

    return {
      reply: `Encontré ${simulacros.length} simulacro(s) en el Plan de Emergencias y ${actsSimulacroPlan.length} actividad(es) vinculadas en el Plan Anual 2027 (evidencias registradas actualmente: ${totalEvidencias}). Ningún simulacro queda cumplido hasta contar con evidencia aprobada por ${NOMBRE_GERENTE_OFICIAL}.`,
      items,
      autoNavigateTarget: esIntencionNavegar ? navPreferido : undefined,
    };
  }

  // ========================================================================
  // 7. PLAN DE EMERGENCIAS GENERAL
  // ========================================================================
  if (
    /\b(emergencia|emergencias|evacuacion|brigada|extintor|botiquin|punto de encuentro|incendio|fuga de gas)\b/.test(
      norm
    )
  ) {
    const emg = mejoraStore.planEmergencias;
    const escMatch = emg.escenarios.find(
      (e) => scoreMatch(`${e.nombre} ${e.sustentoEnFrikaz}`, norm, extractKeywords(norm)) > 0
    );

    const subVista =
      norm.includes('recurso') || norm.includes('extintor') || norm.includes('brigada')
        ? 'recursos_org'
        : norm.includes('formato') || norm.includes('evidencia')
        ? 'formatos_cierre'
        : norm.includes('documento') || norm.includes('procedimiento')
        ? 'documento'
        : 'amenazas';

    const items: AssistantMatchCard[] = [
      {
        id: 'nav-emg-principal',
        categoria: 'Plan de Emergencias',
        titulo: 'Plan de Prevención, Preparación y Respuesta ante Emergencias',
        detalle: `${emg.escenarios.length} escenarios evaluados · ${emg.recursosDisponibles.length} recursos registrados · ${emg.organizacionEmergencias.length} roles en brigada/emergencias.`,
        estadoLabel: normalizarEstadoEstandar(emg.seguimientoActualizacion.estado),
        target: {
          tab: 'plan_anual',
          planSeccion: 'plan_emergencias',
          subEmergencias: subVista,
          escenarioEmergenciaId: escMatch?.id,
          etiquetaDestino: 'Plan de Emergencias',
        },
      },
    ];

    if (escMatch) {
      items.push({
        id: `esc-${escMatch.id}`,
        categoria: 'Escenario de Emergencia',
        titulo: escMatch.nombre,
        detalle: escMatch.sustentoEnFrikaz,
        estadoLabel:
          escMatch.estadoValidacion === 'CONFIRMADO' ? 'Confirmado' : 'Por validar en planta',
        target: {
          tab: 'plan_anual',
          planSeccion: 'plan_emergencias',
          subEmergencias: 'amenazas',
          escenarioEmergenciaId: escMatch.id,
          etiquetaDestino: escMatch.nombre,
        },
      });
    }

    return {
      reply: `El Plan de Emergencias está dentro de PLAN ANUAL 2027 → Plan emergencias. Tiene ${emg.escenarios.length} escenarios definidos, ${emg.recursosDisponibles.length} recursos y ${emg.programaCapacitacionSimulacros.length} capacitaciones y simulacros en estado «${normalizarEstadoEstandar(
        emg.seguimientoActualizacion.estado
      )}».`,
      items,
      autoNavigateTarget: esIntencionNavegar ? items[0].target : undefined,
    };
  }

  // ========================================================================
  // 8. FORMATOS Y CAPACITACIONES
  // ========================================================================
  if (
    /\b(formato|formatos|capacitacion|capacitaciones|asistencia|acta|checklist|lista de chequeo|word)\b/.test(
      norm
    )
  ) {
    const keywords = extractKeywords(norm).filter(
      (k) => !['formato', 'formatos', 'capacitacion', 'capacitaciones'].includes(k)
    );
    const allFormatos = Object.values(mejoraStore.formatos);
    const matchedFormatos =
      keywords.length > 0
        ? allFormatos
            .map((f) => ({
              f,
              score: scoreMatch(
                `${f.titulo} ${f.cajaCalidad.codigo} ${f.riesgoClave || ''} ${f.instruccionesUso}`,
                norm,
                keywords
              ),
            }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.f)
        : norm.includes('capacitacion')
        ? [...allFormatos].sort((a, b) => {
            const aCap = normalizeText(`${a.id} ${a.titulo}`).match(/asistencia|capacitacion/) ? 1 : 0;
            const bCap = normalizeText(`${b.id} ${b.titulo}`).match(/asistencia|capacitacion/) ? 1 : 0;
            return bCap - aCap;
          })
        : allFormatos;

    const items: AssistantMatchCard[] = matchedFormatos.slice(0, 5).map((f) => ({
      id: `fmt-${f.id}`,
      categoria:
        f.categoria === 'PLAN_EMERGENCIAS'
          ? 'Formato · Emergencias'
          : 'Formato · Capacitación / Inspección',
      titulo: f.titulo,
      detalle: `Código ${f.cajaCalidad.codigo} · Editable en pantalla y descargable en Word con Caja de Calidad.`,
      target: {
        tab: 'plan_anual',
        planSeccion: f.categoria === 'PLAN_EMERGENCIAS' ? 'plan_emergencias' : 'planes_riesgo',
        subEmergencias: f.categoria === 'PLAN_EMERGENCIAS' ? 'formatos_cierre' : undefined,
        formatoId: f.id,
        etiquetaDestino: f.titulo,
      },
    }));

    if (norm.includes('capacitacion')) {
      mejoraStore.planEmergencias.programaCapacitacionSimulacros
        .filter((c) => c.tipo === 'CAPACITACION')
        .slice(0, 3)
        .forEach((c) => {
          items.push({
            id: `cap-emg-${c.id}`,
            categoria: 'Capacitación Programada',
            titulo: c.titulo,
            detalle: `Fecha: ${c.fechaProgramada || 'Por definir'} · Responsable: ${c.responsable}.`,
            estadoLabel: normalizarEstadoEstandar(c.estado),
            target: {
              tab: 'plan_anual',
              planSeccion: 'plan_emergencias',
              subEmergencias: 'capacitaciones',
              etiquetaDestino: 'Capacitaciones y Simulacros',
            },
          });
        });

      const capPlans = mejoraStore.planesPorRiesgo.filter((p) => p.capacitacion.requiereCapacitacion);
      capPlans.slice(0, 2).forEach((p) => {
        items.push({
          id: `cap-rsk-${p.id}`,
          categoria: 'Capacitación por Riesgo',
          titulo: p.capacitacion.nombre,
          detalle: `Plan #${p.orden}: ${p.nombreRiesgo} · Duración: ${p.capacitacion.duracionSugerida}.`,
          target: {
            tab: 'plan_anual',
            planSeccion: 'planes_riesgo',
            planMejoraId: p.id,
            etiquetaDestino: p.nombreRiesgo,
          },
        });
      });
    }

    if (items.length === 0) {
      return {
        reply: `No encontré un formato específico que coincida con "${query}". Actualmente existen ${allFormatos.length} formatos editables repartidos entre Planes de mejora por riesgo y Plan de emergencias.`,
        items: [],
      };
    }

    const navTarget: AssistantNavigationTarget =
      matchedFormatos.length === 1
        ? items[0].target
        : norm.includes('capacitacion') && !norm.includes('formato')
        ? {
            tab: 'plan_anual',
            planSeccion: 'plan_emergencias',
            subEmergencias: 'capacitaciones',
            etiquetaDestino: 'Capacitaciones 2027',
          }
        : {
            tab: 'plan_anual',
            planSeccion: norm.includes('emergencia') ? 'plan_emergencias' : 'planes_riesgo',
            subEmergencias: norm.includes('emergencia') ? 'formatos_cierre' : undefined,
            formatoId:
              (norm.includes('asistencia') || norm.includes('capacitacion')) &&
              mejoraStore.formatos['fmt-emg-asistencia-general']
                ? 'fmt-emg-asistencia-general'
                : matchedFormatos[0]?.id,
            etiquetaDestino: 'Formatos y Capacitaciones',
          };

    return {
      reply: `Encontré ${matchedFormatos.length} formato(s) editable(s) con Caja de Calidad y ${
        mejoraStore.planEmergencias.programaCapacitacionSimulacros.filter((c) => c.tipo === 'CAPACITACION')
          .length
      } capacitación(es) programada(s) en Frikaz S.A.S. Puedes abrir cualquiera directamente desde las tarjetas.`,
      items: items.slice(0, 6),
      autoNavigateTarget: esIntencionNavegar ? navTarget : undefined,
    };
  }

  // ========================================================================
  // 9. INDICADORES RES. 0312 / ESTÁNDARES MÍNIMOS
  // ========================================================================
  if (
    /\b(indicador|indicadores|0312|accidentalidad|ausentismo|severidad|mortal|estandar|estandares)\b/.test(
      norm
    )
  ) {
    const regs2027 = sgsstData.registrosPeriodosIndicadores.filter((r) => r.anio === 2027);
    const estandares2027 = sgsstData.estandaresMinimos[2027] || [];
    const subInd: 'tablero' | 'captura' | 'estandares' = norm.includes('estandar')
      ? 'estandares'
      : norm.includes('captura') || norm.includes('registrar')
      ? 'captura'
      : 'tablero';

    const items: AssistantMatchCard[] = sgsstData.hojasVidaIndicadores.slice(0, 6).map((hv) => {
      const directo = calcularResultadoDirectoIndicador(hv);
      const regRef =
        hv.periodicidad === 'ANUAL'
          ? regs2027.find((r) => r.mes === 0)
          : [...regs2027].filter((r) => r.mes >= 1).reverse().find((r) => r.validado) ||
            regs2027[regs2027.length - 1];
      const res = regRef
        ? calcularResultadoIndicadorPeriodo(hv, regRef, sgsstData.trabajadores, config)
        : null;
      const valorFinal = directo.tieneDatosSuficientes ? directo.valorCalculado : res?.valor ?? null;
      const fechaMostrar = directo.tieneDatosSuficientes
        ? hv.fechaMedicionManual || 'Medición directa'
        : res?.periodoLabel || '2027';
      return {
        id: `ind-${hv.id}`,
        categoria: `Indicador ${hv.codigo} · ${hv.periodicidad}`,
        titulo: hv.nombre,
        detalle:
          valorFinal !== null
            ? `Resultado (${fechaMostrar}): ${valorFinal} ${hv.unidadMedida}`
            : `Fórmula: ${hv.formula} · Pendiente de diligenciamiento.`,
        estadoLabel:
          valorFinal !== null
            ? `${valorFinal} ${hv.unidadMedida}`
            : 'Pendiente de diligenciamiento',
        target: {
          tab: 'plan_anual',
          planSeccion: 'indicadores',
          subIndicadores: subInd,
          etiquetaDestino: 'Indicadores Res. 0312 (2027)',
        },
      };
    });

    return {
      reply: `Tenemos configurados los ${sgsstData.hojasVidaIndicadores.length} indicadores mínimos de SST (Resolución 0312 de 2019, Art. 30) y los ${estandares2027.length} estándares mínimos para el periodo 2027 en PLAN ANUAL 2027 → Indicadores.`,
      items,
      autoNavigateTarget: esIntencionNavegar
        ? {
            tab: 'plan_anual',
            planSeccion: 'indicadores',
            subIndicadores: subInd,
            etiquetaDestino:
              subInd === 'estandares' ? 'Estándares Mínimos 2027' : 'Indicadores 2027',
          }
        : undefined,
    };
  }

  // ========================================================================
  // 10. ACCIONES CORRECTIVAS Y DE MEJORA / EVIDENCIAS / OBJETIVOS / RESPONSABLES
  // ========================================================================
  if (/\b(accion correctiva|acciones correctivas|accion de mejora|acciones de mejora|hallazgo|hallazgos)\b/.test(norm)) {
    const items: AssistantMatchCard[] = sgsstData.accionesMejora.slice(0, 5).map((acc) => ({
      id: `acc-${acc.id}`,
      categoria: `Acción ${acc.tipo} · ${acc.codigo}`,
      titulo: acc.actividadARealizar,
      detalle: `${acc.situacionEncontrada} · Responsable: ${acc.responsable} · Límite: ${acc.fechaLimite}`,
      estadoLabel: normalizarEstadoEstandar(acc.estado),
      target: {
        tab: 'plan_anual',
        planSeccion: 'conexiones',
        subConexiones: 'mejoras',
        etiquetaDestino: 'Acciones Correctivas y de Mejora',
      },
    }));

    return {
      reply: `Hay ${sgsstData.accionesMejora.length} acción(es) correctiva(s)/de mejora registrada(s) en PLAN ANUAL 2027 → Conexiones → Acciones de mejora.`,
      items:
        items.length > 0
          ? items
          : [
              {
                id: 'acc-empty',
                categoria: 'Acciones Correctivas y de Mejora',
                titulo: 'Abrir módulo de Acciones Correctivas y de Mejora',
                detalle: 'Aún no hay acciones registradas o abiertas; puedes consultar el panel directamente.',
                target: {
                  tab: 'plan_anual',
                  planSeccion: 'conexiones',
                  subConexiones: 'mejoras',
                  etiquetaDestino: 'Acciones de Mejora',
                },
              },
            ],
      autoNavigateTarget: esIntencionNavegar
        ? {
            tab: 'plan_anual',
            planSeccion: 'conexiones',
            subConexiones: 'mejoras',
            etiquetaDestino: 'Acciones Correctivas y de Mejora',
          }
        : undefined,
    };
  }

  if (/\b(evidencia|evidencias|alertas)\b/.test(norm) && !norm.includes('matriz')) {
    const totalEv = (plan2027?.actividades || []).reduce((sum, a) => sum + a.evidencias.length, 0);
    const targetEv: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'evidencias',
      etiquetaDestino: 'Evidencias del Plan Anual 2027',
    };
    return {
      reply: `En el Plan Anual 2027 hay actualmente ${totalEv} evidencia(s) adjunta(s) en actividades. Puedes consultarlas, subir soportes nuevos o revisar las alertas pendientes en PLAN ANUAL 2027 → Evidencias.`,
      items: [
        {
          id: 'ev-panel',
          categoria: 'Evidencias y Alertas',
          titulo: 'Bandeja de Evidencias y Seguimiento 2027',
          detalle: 'Visualiza actividades sin soporte, pruebas pendientes de revisión y avisos.',
          target: targetEv,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetEv : undefined,
    };
  }

  if (/\b(objetivo|objetivos|meta|metas)\b/.test(norm)) {
    const objs = plan2027?.objetivosEspecificos || [];
    const targetObj: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'objetivos',
      etiquetaDestino: 'Objetivos del Plan Anual 2027',
    };
    return {
      reply: `El Plan Anual 2027 tiene definido su Objetivo General y ${objs.length} objetivo(s) específico(s) en PLAN ANUAL 2027 → Objetivos.`,
      items: objs.slice(0, 4).map((o) => ({
        id: `obj-${o.id}`,
        categoria: `Objetivo 2027 · ${o.area}`,
        titulo: o.titulo,
        detalle: `Meta: ${
          o.metas[0]
            ? `${o.metas[0].descripcion} (${o.metas[0].valorMeta}${o.metas[0].unidad})`
            : o.descripcion
        } · Responsable: ${o.responsable}`,
        target: targetObj,
      })),
      autoNavigateTarget: esIntencionNavegar ? targetObj : undefined,
    };
  }

  // ========================================================================
  // 11. PLANES DE MEJORA POR RIESGO
  // ========================================================================
  const keywords = extractKeywords(norm);
  if (/\b(plan de mejora|planes de mejora|mejora de|mejora por riesgo)\b/.test(norm)) {
    const scoredPlanes = mejoraStore.planesPorRiesgo
      .map((p) => ({
        p,
        score: scoreMatch(
          `${p.nombreRiesgo} ${p.claveReferencia} ${p.riesgoCodigo} ${p.situacionQueSeBuscaMejorar} ${p.actividadMejoraPropuesta} ${p.cargoMatriz}`,
          norm,
          keywords.filter((k) => k !== 'mejora' && k !== 'riesgo' && k !== 'planes')
        ),
      }))
      .filter((x) => x.score > 0 || norm.includes('planes de mejora') || norm.includes('plan de mejora'))
      .sort((a, b) => b.score - a.score);

    if (scoredPlanes.length > 0) {
      const top = scoredPlanes[0].p;
      const items: AssistantMatchCard[] = scoredPlanes.slice(0, 5).map(({ p }) => ({
        id: `pmr-${p.id}`,
        categoria: `Plan de Mejora #${p.orden} · Nivel ${p.nivelRiesgoMatriz}`,
        titulo: p.nombreRiesgo,
        detalle: `${p.actividadMejoraPropuesta} · Responsable: ${p.responsable} · ${p.fechaInicio} → ${p.fechaFin}.`,
        estadoLabel: normalizarEstadoEstandar(p.estado),
        target: {
          tab: 'plan_anual',
          planSeccion: 'planes_riesgo',
          planMejoraId: p.id,
          searchQuery: keywords.filter((k) => k !== 'mejora' && k !== 'riesgo').join(' '),
          etiquetaDestino: p.nombreRiesgo,
        },
      }));

      return {
        reply: `Encontré ${scoredPlanes.length} plan(es) de mejora por riesgo en el Plan Anual 2027. El principal es «${top.nombreRiesgo}» (Nivel ${top.nivelRiesgoMatriz}, estado: ${normalizarEstadoEstandar(
          top.estado
        )}, responsable: ${top.responsable}).`,
        items,
        autoNavigateTarget: esIntencionNavegar ? items[0].target : undefined,
      };
    }
  }

  // ========================================================================
  // 12. NAVEGACIÓN DIRECTA A GESTIÓN NORMATIVA, INFORMES EXCEL, CICLO PHVA,
  //     ORGANIGRAMA, PARTES INTERESADAS, MI EMPRESA Y PLAN ANUAL 2027 GENERAL
  // ========================================================================
  if (/\b(gestion normativa|normativa|normas y reglas|matriz legal|reglas legales|leyes)\b/.test(norm)) {
    const targetNormas: AssistantNavigationTarget = {
      tab: 'matriz_tabla',
      etiquetaDestino: 'Gestión Normativa (Normas y Reglas)',
    };
    return {
      reply: `En Gestión Normativa (Normas y Reglas) tienes ${normas.length} obligaciones legales aplicables a Frikaz S.A.S. (SST y Ambiental). Te llevo directamente allí.`,
      items: normas.slice(0, 4).map((n) => ({
        id: `nrm-list-${n.id}`,
        categoria: `Norma ${n.fase} · ${n.area}`,
        titulo: `${n.normaOficial} (${n.articulos})`,
        detalle: n.tituloSituacion,
        estadoLabel: normalizarEstadoEstandar(n.estado),
        target: {
          tab: 'matriz_tabla',
          normaId: n.id,
          searchQuery: n.normaOficial,
          etiquetaDestino: n.normaOficial,
        },
      })),
      autoNavigateTarget: esIntencionNavegar ? targetNormas : undefined,
    };
  }

  if (/\b(informe|informes|reporte|reportes|excel|tabla de normas)\b/.test(norm)) {
    const esReportePlan = norm.includes('plan') || norm.includes('presupuesto') || norm.includes('2027');
    const targetInf: AssistantNavigationTarget = esReportePlan
      ? {
          tab: 'plan_anual',
          planSeccion: 'presupuesto',
          subPresupuesto: 'reportes',
          etiquetaDestino: 'Informes del Plan Anual 2027',
        }
      : {
          tab: 'matriz_excel',
          excelSheet: 'inicio',
          etiquetaDestino: 'Tabla de Normas e Informe Excel',
        };
    return {
      reply:
        'Tenemos informes consolidados en dos apartados: los Reportes del Plan Anual 2027 (cumplimiento y presupuesto) y la Tabla de Normas exportable a Excel.',
      items: [
        {
          id: 'inf-plan-2027',
          categoria: 'Informes Plan Anual 2027',
          titulo: 'Reportes de Cumplimiento y Presupuesto 2027',
          detalle: 'Avances por área, responsables, trimestres y exportación oficial.',
          target: {
            tab: 'plan_anual',
            planSeccion: 'presupuesto',
            subPresupuesto: 'reportes',
            etiquetaDestino: 'Reportes Plan Anual 2027',
          },
        },
        {
          id: 'inf-excel',
          categoria: 'Informes Normativos',
          titulo: 'Tabla de Normas e Informe Excel PHVA',
          detalle: 'Resumen por fases, SST, Ambiental y descarga en Excel.',
          target: {
            tab: 'matriz_excel',
            excelSheet: 'inicio',
            etiquetaDestino: 'Tabla de Normas (Excel)',
          },
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetInf : undefined,
    };
  }

  if (/\b(organigrama|responsabilidades|roles sst)\b/.test(norm)) {
    const targetOrg: AssistantNavigationTarget = {
      tab: 'ficha_empresa',
      empresaSubcategoria: 'organigrama',
      etiquetaDestino: 'Organigrama y Roles SST',
    };
    return {
      reply: `El Organigrama SST de Frikaz S.A.S. reúne ${cargosSST.length} cargos oficiales con sus responsabilidades y compromisos legales.`,
      items: cargosSST.slice(0, 5).map((c) => ({
        id: `org-${c.id}`,
        categoria: c.nivelNombre,
        titulo: c.nombre,
        detalle: c.areaProceso,
        target: targetOrg,
      })),
      autoNavigateTarget: esIntencionNavegar ? targetOrg : undefined,
    };
  }

  if (/\b(partes interesadas|proveedores|clientes|arl)\b/.test(norm)) {
    const targetPI: AssistantNavigationTarget = {
      tab: 'ficha_empresa',
      empresaSubcategoria: 'partes_interesadas',
      etiquetaDestino: 'Partes Interesadas',
    };
    return {
      reply: `En Mi Empresa → Partes Interesadas hay ${partesInteresadas.length} partes interesadas internas y externas registradas con sus necesidades y controles.`,
      items: partesInteresadas.slice(0, 4).map((pi) => ({
        id: `pi-${pi.id}`,
        categoria: pi.clasificacion === 'interna' ? 'Parte Interna' : 'Parte Externa',
        titulo: pi.nombre,
        detalle: pi.necesidadesExpectativas,
        target: targetPI,
      })),
      autoNavigateTarget: esIntencionNavegar ? targetPI : undefined,
    };
  }

  if (/\b(matriz de riesgos|matriz de peligros|riesgos del trabajo|gtc 45|gtc45)\b/.test(norm) && keywords.filter((k) => !['matriz', 'riesgos', 'riesgo', 'peligros', 'trabajo', 'gtc'].includes(k)).length === 0) {
    const targetMR: AssistantNavigationTarget = {
      tab: 'matriz_riesgos',
      riskViewMode: norm.includes('cargo') ? 'por_cargos' : norm.includes('tabla') ? 'tabla' : 'ficha',
      etiquetaDestino: 'Matriz de Riesgos GTC 45',
    };
    return {
      reply: `Abriendo la Matriz de Identificación de Peligros y Evaluación de Riesgos GTC 45 de Frikaz S.A.S. (${riesgos.length} peligros evaluados).`,
      items: [
        {
          id: 'mr-main',
          categoria: 'Matriz GTC 45',
          titulo: `Matriz de Peligros y Riesgos (${riesgos.length} registros)`,
          detalle: `Peligros de Producción, Pelado, Selección, Fritura, Empaque y Logística.`,
          target: targetMR,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetMR : undefined,
    };
  }

  if (/\b(mision frikaz|pasaporte|control sst)\b/.test(norm)) {
    if (norm.includes('control sst') && !gerenteActivo) {
      return {
        reply: `El panel «Control SST» es de uso exclusivo de ${NOMBRE_GERENTE_OFICIAL}. Con tu perfil actual (${usuarioEtiqueta}) no puedes abrir esa consola administrativa.`,
        notaPermiso: `Solicita a ${NOMBRE_GERENTE_OFICIAL} iniciar sesión con su correo autorizado.`,
        items: [],
      };
    }
    const action = norm.includes('control sst')
      ? 'open_admin_sst'
      : norm.includes('pasaporte')
      ? 'open_passport'
      : 'open_mission';
    const targetSpec: AssistantNavigationTarget = {
      tab: 'matriz_riesgos',
      specialAction: action,
      etiquetaDestino:
        action === 'open_admin_sst'
          ? 'Control SST (Gerencia)'
          : action === 'open_passport'
          ? 'Mi Pasaporte Digital'
          : 'Misión Frikaz',
    };
    return {
      reply: `Listo, te abro ${targetSpec.etiquetaDestino}.`,
      items: [
        {
          id: `spec-${action}`,
          categoria: 'Acceso directo',
          titulo: targetSpec.etiquetaDestino || 'Módulo Frikaz',
          detalle: 'Módulo interactivo de formación y cumplimiento SST de Frikaz S.A.S.',
          target: targetSpec,
        },
      ],
      autoNavigateTarget: esIntencionNavegar ? targetSpec : undefined,
    };
  }

  // ========================================================================
  // 13. ACTIVIDADES DEL PLAN ANUAL 2027 (POR ESTADO O PALABRA CLAVE)
  // ========================================================================
  const buscaActividadesEstado =
    /\b(actividad|actividades|tarea|tareas|cronograma|pendiente|pendientes|por hacer|en proceso|revision|aprobada|aprobadas|cumplida|cumplidas|devuelta)\b/.test(
      norm
    );
  if (buscaActividadesEstado && plan2027) {
    let estadoFiltro: string | undefined;
    if (norm.includes('revision') || norm.includes('revisar')) {
      estadoFiltro = 'Pendiente de revisión';
    } else if (/\b(pendiente|pendientes|por hacer)\b/.test(norm)) {
      estadoFiltro = 'Por hacer';
    } else if (norm.includes('en proceso')) {
      estadoFiltro = 'En proceso';
    } else if (norm.includes('devuelta') || norm.includes('ajuste')) {
      estadoFiltro = 'Devuelto para ajustes';
    } else if (norm.includes('aprobada') || norm.includes('aprobadas')) {
      estadoFiltro = 'Aprobado';
    } else if (norm.includes('cumplida') || norm.includes('cumplidas')) {
      estadoFiltro = 'Cumplido';
    }

    const extraKws = keywords.filter(
      (k) =>
        ![
          'actividad',
          'actividades',
          'tarea',
          'tareas',
          'pendiente',
          'pendientes',
          'hacer',
          'proceso',
          'revision',
          'revisar',
          'aprobada',
          'aprobadas',
          'cumplida',
          'cumplidas',
          'cronograma',
        ].includes(k)
    );

    const matchedActs = plan2027.actividades.filter((a) => {
      const est = normalizarEstadoEstandar(a.estado);
      const matchEst = !estadoFiltro || est === estadoFiltro;
      const matchKw =
        extraKws.length === 0 ||
        scoreMatch(
          `${a.codigo} ${a.nombre} ${a.descripcion} ${a.responsableNombre}`,
          norm,
          extraKws
        ) > 0;
      return matchEst && matchKw;
    });

    const items: AssistantMatchCard[] = matchedActs.slice(0, 6).map((a) => ({
      id: `act-${a.id}`,
      categoria: `Plan Anual 2027 · ${a.codigo}`,
      titulo: a.nombre,
      detalle: `Fecha límite: ${a.fechaLimite} · Responsable: ${a.responsableNombre} · Presupuesto asignado: $${(
        a.presupuestoAprobado || 0
      ).toLocaleString('es-CO')}.`,
      estadoLabel: normalizarEstadoEstandar(a.estado),
      target: {
        tab: 'plan_anual',
        planSeccion: 'actividades',
        subActividades: 'cronograma',
        actividadId: a.id,
        actividadModalTab: 'datos',
        etiquetaDestino: a.codigo,
      },
    }));

    const navCrono: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'actividades',
      subActividades: 'cronograma',
      cronogramaEstadoFiltro: estadoFiltro || 'TODOS',
      searchQuery: extraKws.join(' '),
      etiquetaDestino: estadoFiltro ? `Actividades: ${estadoFiltro}` : 'Cronograma 2027',
    };

    if (matchedActs.length === 0) {
      return {
        reply: estadoFiltro
          ? `En el Plan Anual 2027 no hay actividades actualmente en estado «${estadoFiltro}» con esos criterios.`
          : `No encontré actividades del Plan Anual 2027 que coincidan con "${query}".`,
        items: [],
        autoNavigateTarget: esIntencionNavegar ? navCrono : undefined,
      };
    }

    return {
      reply: `En el Plan Anual 2027 encontré ${matchedActs.length} actividad(es)${
        estadoFiltro ? ` en estado «${estadoFiltro}»` : ''
      }. Te muestro las principales y puedes abrir el cronograma filtrado o ir directo a cualquiera.`,
      items,
      autoNavigateTarget: esIntencionNavegar ? navCrono : undefined,
    };
  }

  // Navegación directa al Plan Anual 2027 general
  if (/\b(plan anual|plan de trabajo|cronograma 2027)\b/.test(norm) && keywords.length <= 2) {
    const resPres = calcularResumenPresupuestoPlan(
      plan2027?.actividades || [],
      plan2027?.presupuestoGeneralAprobado || 0
    );
    const totalActs = plan2027?.actividades.length || 0;
    const pendientes = (plan2027?.actividades || []).filter(
      (a) => normalizarEstadoEstandar(a.estado) === 'Por hacer'
    ).length;
    const targetPlan: AssistantNavigationTarget = {
      tab: 'plan_anual',
      planSeccion: 'resumen',
      etiquetaDestino: 'PLAN ANUAL 2027',
    };
    return {
      reply: `Listo, ya te llevo al PLAN ANUAL 2027 (Enero – Diciembre 2027). Hoy tiene ${totalActs} actividades programadas (${pendientes} por hacer), Presupuesto General de $${resPres.presupuestoGeneral.toLocaleString(
        'es-CO'
      )} y Saldo Disponible de $${resPres.saldoDisponible.toLocaleString('es-CO')}.`,
      items: [
        {
          id: 'pa-2027-home',
          categoria: 'Módulo Independiente · 2027',
          titulo: 'Panel Principal del Plan Anual 2027',
          detalle: `Objetivos, Actividades, Evidencias, Indicadores Res. 0312, Presupuesto 2027, Mejoras y Emergencias.`,
          estadoLabel: 'Vigencia 2027',
          target: targetPlan,
        },
      ],
      autoNavigateTarget: targetPlan,
    };
  }

  // ========================================================================
  // 14. BÚSQUEDA TRANSVERSAL REAL EN TODOS LOS MÓDULOS DE FRIKAZ S.A.S.
  // ========================================================================
  const scoredItems: Array<{ score: number; card: AssistantMatchCard }> = [];
  const specificKws = keywords.filter(
    (k) => !['riesgo', 'riesgos', 'peligro', 'peligros'].includes(k)
  );
  const searchKws = specificKws.length > 0 ? specificKws : keywords;

  // 14A. Riesgos GTC 45
  riesgos.forEach((r) => {
    const s = scoreMatch(
      `${r.codigo || ''} ${r.peligroDescripcion} ${r.peligroClasificacion} ${r.proceso} ${r.zonaLugar} ${r.cargo || ''} ${r.cargosExpuestos || ''} ${r.efectosPosibles} ${r.actividades} ${r.tareas} ${r.medidaControlesAdministrativos} ${r.requisitoLegalEspecifico || ''}`,
      norm,
      searchKws
    );
    if (s > 0) {
      scoredItems.push({
        score: s + (r.interpretacionNR === 'I' ? 3 : 1) + (norm.includes('riesgo') ? 2 : 0),
        card: {
          id: `rsk-${r.id}`,
          categoria: `Matriz de Riesgos GTC 45 · Nivel ${r.interpretacionNR}`,
          titulo: `${r.codigo || r.id}: ${r.peligroDescripcion}`,
          detalle: `Proceso: ${r.proceso} · Zona: ${r.zonaLugar} · Cargo: ${
            r.cargo || r.cargosExpuestos || 'General'
          } · Consecuencias: ${r.efectosPosibles}`,
          estadoLabel: `Nivel ${r.interpretacionNR}`,
          target: {
            tab: 'matriz_riesgos',
            riskId: r.id,
            searchQuery: searchKws.join(' ') || query,
            etiquetaDestino: `Matriz de Riesgos (${r.codigo || r.id})`,
          },
        },
      });
    }
  });

  // 14B. Planes de mejora por riesgo
  mejoraStore.planesPorRiesgo.forEach((p) => {
    const s = scoreMatch(
      `${p.nombreRiesgo} ${p.claveReferencia} ${p.situacionQueSeBuscaMejorar} ${p.actividadMejoraPropuesta} ${p.medidaPrevencionControl}`,
      norm,
      searchKws
    );
    if (s > 0) {
      scoredItems.push({
        score: s,
        card: {
          id: `pmr-gen-${p.id}`,
          categoria: `Plan de Mejora #${p.orden}`,
          titulo: p.nombreRiesgo,
          detalle: `${p.actividadMejoraPropuesta} · Responsable: ${p.responsable}`,
          estadoLabel: normalizarEstadoEstandar(p.estado),
          target: {
            tab: 'plan_anual',
            planSeccion: 'planes_riesgo',
            planMejoraId: p.id,
            searchQuery: searchKws[0] || '',
            etiquetaDestino: p.nombreRiesgo,
          },
        },
      });
    }
  });

  // 14C. Actividades Plan Anual 2027
  (plan2027?.actividades || []).forEach((a) => {
    const s = scoreMatch(
      `${a.codigo} ${a.nombre} ${a.descripcion} ${a.responsableNombre} ${a.recursosNecesarios || ''}`,
      norm,
      searchKws
    );
    if (s > 0) {
      scoredItems.push({
        score: s,
        card: {
          id: `act-gen-${a.id}`,
          categoria: `Actividad Plan 2027 · ${a.codigo}`,
          titulo: a.nombre,
          detalle: `Fecha límite: ${a.fechaLimite} · Responsable: ${a.responsableNombre}`,
          estadoLabel: normalizarEstadoEstandar(a.estado),
          target: {
            tab: 'plan_anual',
            planSeccion: 'actividades',
            actividadId: a.id,
            actividadModalTab: 'datos',
            etiquetaDestino: a.codigo,
          },
        },
      });
    }
  });

  // 14D. Formatos editables
  Object.values(mejoraStore.formatos).forEach((f) => {
    const s = scoreMatch(
      `${f.titulo} ${f.cajaCalidad.codigo} ${f.riesgoClave || ''} ${f.instruccionesUso}`,
      norm,
      keywords
    );
    if (s > 0) {
      scoredItems.push({
        score: s,
        card: {
          id: `fmt-gen-${f.id}`,
          categoria: 'Formato Editable',
          titulo: f.titulo,
          detalle: `Código ${f.cajaCalidad.codigo}`,
          target: {
            tab: 'plan_anual',
            planSeccion: f.categoria === 'PLAN_EMERGENCIAS' ? 'plan_emergencias' : 'planes_riesgo',
            formatoId: f.id,
            etiquetaDestino: f.titulo,
          },
        },
      });
    }
  });

  // 14E. Normas PHVA
  normas.forEach((n) => {
    const s = scoreMatch(
      `${n.tituloSituacion} ${n.normaOficial} ${n.articulos} ${n.fase} ${n.aplicabilidad || ''} ${n.descripcion || ''}`,
      norm,
      keywords
    );
    if (s > 0) {
      scoredItems.push({
        score: s,
        card: {
          id: `norma-${n.id}`,
          categoria: `Gestión Normativa · ${n.fase}`,
          titulo: `${n.normaOficial} (${n.articulos})`,
          detalle: n.tituloSituacion,
          estadoLabel: normalizarEstadoEstandar(n.estado),
          target: {
            tab: 'matriz_tabla',
            searchQuery: n.normaOficial,
            normaId: n.id,
            etiquetaDestino: 'Normas y Reglas',
          },
        },
      });
    }
  });

  // 14F. Documentos firmados y Política SST
  docsFirmados.forEach((d) => {
    const s = scoreMatch(
      `${d.nombreArchivoRecibido} ${d.cargo} ${d.envioId} ${d.tipoDocumento} ${d.asuntoCorreo}`,
      norm,
      keywords
    );
    if (s > 0) {
      scoredItems.push({
        score: s,
        card: {
          id: `docf-gen-${d.id}`,
          categoria: `Documento Firmado · ${d.envioId}`,
          titulo: d.nombreArchivoRecibido,
          detalle: `${d.cargo} · Recibido: ${d.fechaRecepcion}`,
          estadoLabel: normalizarEstadoEstandar(d.estado),
          target: {
            tab: 'ficha_empresa',
            empresaSubcategoria: 'documentos_firmados',
            etiquetaDestino: 'Documentos Firmados',
          },
        },
      });
    }
  });

  // 14G. Trabajadores (sin revelar datos médicos privados) y Empresa
  if (/\b(trabajador|trabajadores|personal|empleados|empresa|caracterizacion|mi empresa)\b/.test(norm)) {
    if (/\b(empresa|caracterizacion|nit|ciiu|mi empresa)\b/.test(norm)) {
      scoredItems.push({
        score: 12,
        card: {
          id: 'emp-ficha',
          categoria: 'Mi Empresa',
          titulo: 'Frikaz S.A.S. · Caracterización SST',
          detalle: `${config.numeroTrabajadores} trabajadores · ${config.claseRiesgoSST} · ${
            plan2027?.empresaSnapshot.grupoEstandares0312 || config.actividadEconomicaConcreta
          }`,
          target: {
            tab: 'ficha_empresa',
            empresaSubcategoria: 'caracterizacion',
            etiquetaDestino: 'Mi Empresa · Caracterización',
          },
        },
      });
    } else {
      const activosCount = sgsstData.trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO').length;
      scoredItems.push({
        score: 10,
        card: {
          id: 'trab-list',
          categoria: 'Plan Anual 2027 · Personal',
          titulo: `Trabajadores y Puestos de Trabajo (${activosCount} activos de ${sgsstData.trabajadores.length} fichas)`,
          detalle: `Consulta distribución por cargos y riesgos del puesto. La historia médica individual permanece bloqueada por confidencialidad.`,
          target: {
            tab: 'plan_anual',
            planSeccion: 'conexiones',
            subConexiones: 'personal',
            etiquetaDestino: 'Trabajadores y Puestos',
          },
        },
      });
    }
  }

  // 14H. Ciclo PHVA por etapa específica
  if (/\b(phva|ciclo phva|planear|hacer|verificar|actuar)\b/.test(norm)) {
    const faseDetected = norm.includes('planear')
      ? 'PLANEAR'
      : norm.includes('hacer')
      ? 'HACER'
      : norm.includes('verificar')
      ? 'VERIFICAR'
      : norm.includes('actuar')
      ? 'ACTUAR'
      : 'PLANEAR';
    scoredItems.push({
      score: 9,
      card: {
        id: `phva-${faseDetected}`,
        categoria: 'Ciclo PHVA',
        titulo: `Ciclo PHVA · Etapa ${faseDetected}`,
        detalle: `Contiene las ${normas.length} reglas normativas de Frikaz S.A.S. organizadas en Planear, Hacer, Verificar y Actuar.`,
        target: {
          tab: 'phva_slides',
          phvaFase: faseDetected,
          etiquetaDestino: `Ciclo PHVA (${faseDetected})`,
        },
      },
    });
  }

  scoredItems.sort((a, b) => b.score - a.score);
  const topCards = scoredItems.slice(0, 6).map((x) => x.card);

  if (topCards.length === 0) {
    return {
      reply: `No encontré información registrada en Frikaz S.A.S. que coincida con "${query}". No quiero inventarte datos: puedes probar buscando por ejemplo «riesgo eléctrico», «presupuesto 2027», «plan de emergencias», «actividades pendientes», «formato de capacitación», «indicadores» o «gestión normativa».`,
      items: [],
    };
  }

  return {
    reply: `Encontré ${scoredItems.length} coincidencia(s) real(es) en la herramienta. El resultado principal es «${topCards[0].titulo}» (${topCards[0].categoria}).`,
    notaPermiso: !gerenteActivo
      ? `Modo consulta activo (${usuarioEtiqueta}). Para editar o aprobar información oficial debe ingresar ${NOMBRE_GERENTE_OFICIAL}.`
      : undefined,
    items: topCards,
    autoNavigateTarget: esIntencionNavegar ? topCards[0].target : undefined,
  };
}
