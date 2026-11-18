import {
  CaracterizacionEmpresaDinamica,
  ReglaNormativa,
  ResumenEvaluacionImpacto,
  PropuestaCambioNorma,
  RegistroHistorialCambio,
  ModalidadContrato,
  SectorEconomico,
} from '../types/dynamicConfig';
import { NormaPhvaItem } from '../types/phvaEvidence';

export const CONFIGURACION_FRIKAZ_INICIAL: CaracterizacionEmpresaDinamica = {
  modalidadesContrato: ['indefinido', 'fijo'],
  detallesContratos: {
    cantidadIndefinido: 6,
    cantidadFijo: 4,
    cantidadObraLabor: 0,
    cantidadAprendices: 0,
    cantidadServicios: 0,
    cantidadTemporalMision: 0,
    otrasModalidadesTexto: '',
  },
  numeroTrabajadores: 10,
  sectorEconomico: 'secundario',
  ciiuPrincipal: '1089 - Elaboración de otros productos alimenticios n.c.p. (Snacks fritos)',
  actividadEconomicaConcreta:
    'Producción y comercialización de productos fritos tipo snack (papas, plátanos y chicharrones)',
  descripcionCadenaValor:
    'Procesamiento artesanal e industrial de tubérculos y cárnicos: pelado, rebanado, fritura por inmersión continua a >160°C, centrifugado, sazonado y envasado en bolsas termoselladas.',
  claseRiesgoSST: 'Clase II (Bajo)',
  arlNombre: 'Positiva Compañía de Seguros / Sura',
  modalidadTrabajo: 'Presencial en planta',
  procesosProductivos: [
    'Recepción y selección de materias primas',
    'Lavado y pelado mecánico',
    'Rebanado con cuchillas rotativas',
    'Fritura por inmersión en aceite caliente (>160°C)',
    'Desaceitado y sazonado',
    'Pesaje y sellado continuo térmico',
    'Almacenamiento y despacho',
  ],
  maquinariaEquipos: [
    'Freidoras industriales dobles continuas con termostato (>160°C)',
    'Rebanadora rotativa con cuchillas mecánicas',
    'Peladora abrasiva mecánica con agua',
    'Marmita en acero inoxidable para escaldado',
    'Selladora continua de banda térmica con fechador',
    'Campana extractora de humos con trampa de grasas en ducto',
    'Trampa física de retención de grasas en red hidrosanitaria',
  ],
  sustanciasQuimicas: [
    'Aceite vegetal comestible para fritura a altas temperaturas',
    'Gas natural por tubería / GLP para quemadores industriales',
    'Detergente desengrasante alcalino de grado alimenticio',
    'Hipoclorito de sodio y desinfectantes para BPM de alimentos',
  ],
  aspectosAmbientales: [
    'Generación de Aceite de Cocina Usado (ACU): 180 a 250 L/mes',
    'Vertimientos no domésticos de aguas con grasa y sólidos suspendidos',
    'Emisiones de vahos y olores de fritura por ducto vertical',
    'Residuos orgánicos (cáscaras de papa y plátano)',
    'Residuos aprovechables (cajas de cartón y empaques BOPP)',
  ],
  residuosGenerados: [
    'Aceite de Cocina Usado (ACU)',
    'Residuos orgánicos de pelado',
    'Cartón y plástico de embalaje',
    'Residuos peligrosos (envases de desengrasantes, luminarias)',
  ],
  consumoAguaEnergia: {
    fuenteAgua: 'Red de Acueducto de Bogotá (EAAB)',
    consumoEstimadoM3Mes: 45,
    fuenteEnergia: 'Red eléctrica Codensa / Enel 220V trifásica',
    combustibleTermico: 'Gas Natural Vanti (Acometida industrial)',
  },
  permisosAutorizaciones: [
    'Concepto Sanitario Favorable Secretaría Distrital de Salud (Bosa)',
    'Inscripción de Generador de ACU ante la SDA Bogotá (Res. 316/2018)',
    'Certificado de Inspección Técnica de Bomberos Bogotá',
    'Registro Sanitario / Notificación Sanitaria INVIMA para alimentos',
  ],
  sedesInstalaciones: {
    areaM2: 240,
    pisosNiveles: 1,
    trampaGrasasOperativa: true,
    campanaExtractoraFiltros: true,
    direccionPlanta: 'Calle 69A Sur # 80J - 14, Piamonte, Bosa',
    localidad: 'Bosa (Localidad 7)',
    ciudad: 'Bogotá D.C.',
  },
};

const STORAGE_KEY_CONFIG = 'frikaz_caracterizacion_dinamica_v3';
const STORAGE_KEY_HISTORIAL = 'frikaz_historial_caracterizacion_v3';

export function getCaracterizacionActual(): CaracterizacionEmpresaDinamica {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(CONFIGURACION_FRIKAZ_INICIAL));
      return CONFIGURACION_FRIKAZ_INICIAL;
    }
    return { ...CONFIGURACION_FRIKAZ_INICIAL, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error al cargar caracterización dinámica', err);
    return CONFIGURACION_FRIKAZ_INICIAL;
  }
}

export function saveCaracterizacion(config: CaracterizacionEmpresaDinamica): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frikaz:config-updated'));
    }
  } catch (err) {
    console.error('Error al guardar caracterización dinámica', err);
  }
}

export function getHistorialCambios(): RegistroHistorialCambio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error al leer historial', err);
    return [];
  }
}

export function registrarEnHistorial(item: RegistroHistorialCambio): void {
  try {
    const actual = getHistorialCambios();
    const actualizado = [item, ...actual].slice(0, 50); // Mantiene últimos 50 registros
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(actualizado));
  } catch (err) {
    console.error('Error al registrar en historial', err);
  }
}

// ==========================================
// MOTOR DE REGLAS DE APLICABILIDAD COLOMBIANA
// ==========================================

export const REGLAS_NORMATIVAS_COLOMBIA: ReglaNormativa[] = [
  // 1. Estándares Mínimos SG-SST (Res. 0312 de 2019)
  {
    id: 'REG-0312-ESTANDARES',
    normaReferencia: 'Resolución 0312 de 2019',
    disposicionArticulo: 'Capítulos I, II y III (Artículos 3, 9 y 16)',
    area: 'SST',
    fasePhva: 'PLANEAR',
    condicionAplicacion: 'Cantidad de trabajadores y nivel de riesgo del trabajo',
    datosRequeridos: ['numeroTrabajadores', 'claseRiesgoSST'],
    umbralLegalTexto:
      'Hasta 10 trabajadores (Riesgo I, II o III): 7 reglas básicas | De 11 a 50 trabajadores (Riesgo I, II o III): 21 reglas | Más de 50 trabajadores o Riesgo IV y V: 60 reglas completas',
    explicacionSencilla:
      'Define cuántas reglas de seguridad y salud nos pide el Ministerio del Trabajo según cuántas personas trabajan en la planta y qué tan riesgoso es el trabajo.',
    fuenteOficial: 'Ministerio del Trabajo',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const n = cfg.numeroTrabajadores;
      const esRiesgoAlto =
        cfg.claseRiesgoSST.includes('Clase IV') || cfg.claseRiesgoSST.includes('Clase V');

      if (esRiesgoAlto || n > 50) {
        return {
          resultado: 'MODIFICADA_ALCANCE',
          explicacion: `Con ${n} trabajadores o con riesgo alto (Clase IV o V), la ley nos pide cumplir los 60 puntos completos de la Resolución 0312 de 2019. Esto significa un plan anual más completo, revisiones médicas detalladas y una revisión externa al año.`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 0312 de 2019 (Capítulo III): Cumplir los 60 puntos de seguridad y salud para empresas con más de 50 trabajadores o riesgo alto (IV y V).`,
            nuevaImportancia: `En Frikaz S.A.S. con ${n} personas y ${cfg.claseRiesgoSST}, debemos tener controles muy completos en freidoras, mediciones de ruido/calor y exámenes médicos para proteger a todos.`,
            nuevaAplicabilidad: `Contar con un profesional con licencia en SST y curso de 50 horas, revisar los 60 puntos cada año y guardar el plan de mejoras.`,
            nuevaEvidencia: `Lista de los 60 puntos revisada, firmada y enviada a la ARL y al Ministerio del Trabajo.`,
          },
        };
      }

      if (n >= 11 && n <= 50) {
        return {
          resultado: 'MODIFICADA_ALCANCE',
          explicacion: `Al pasar a ${n} trabajadores en ${cfg.claseRiesgoSST}, Frikaz S.A.S. sube de 7 a 21 reglas obligatorias de seguridad y salud (Resolución 0312 de 2019, Capítulo II).`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 0312 de 2019 (Capítulo II): 21 puntos de seguridad y salud para empresas de 11 a 50 trabajadores en riesgo bajo o medio (I, II o III).`,
            nuevaImportancia: `Con ${n} trabajadores ya no basta con lo mínimo: debemos hacer exámenes médicos periódicos, investigar incidentes con ayuda del COPASST y dar charlas programadas todo el año.`,
            nuevaAplicabilidad: `Revisar los 21 puntos, asegurarnos de que quien dirige el SST tenga licencia y curso de 50 horas, y guardar el reporte de fin de año en diciembre.`,
            nuevaEvidencia: `Evaluación firmada de los 21 puntos y plan de trabajo anual con sus soportes.`,
          },
        };
      }

      return {
        resultado: 'APLICABLE',
        explicacion: `Con ${n} trabajadores en ${cfg.claseRiesgoSST}, nos corresponden los 7 puntos básicos de la Resolución 0312 de 2019 (Capítulo I) pensados para empresas pequeñas.`,
        requiereRevisionHumana: false,
        cambiosPropuestos: {
          nuevaDescripcion: `Resolución 0312 de 2019 (Capítulo I): 7 reglas básicas de seguridad y salud para empresas de hasta 10 trabajadores (riesgo I, II o III).`,
          nuevaImportancia: `Para los ${n} compañeros de Frikaz S.A.S., nos permite cuidar la salud y evitar accidentes sin llenarnos de papeleo innecesario.`,
          nuevaAplicabilidad: `Tener al día los 7 puntos: persona encargada, pagos de salud y ARL, plan de trabajo anual, charlas de seguridad, exámenes médicos, revisión de peligros y medidas para prevenir accidentes.`,
          nuevaEvidencia: `Acta de revisión anual de los 7 puntos con sus comprobantes y envío a la ARL.`,
        },
      };
    },
  },

  // 2. Participación en SST: COPASST vs Vigía de SST
  {
    id: 'REG-PARTICIPACION-COPASST-VIGIA',
    normaReferencia: 'Resolución 2013 de 1986 / Decreto 1072 de 2015 Art. 2.2.4.6.2',
    disposicionArticulo: 'Resolución 2013/1986 Art. 1 y 2 | Dec 1072/2015 Art. 2.2.4.6.2 y 2.2.4.6.8',
    area: 'SST',
    fasePhva: 'HACER',
    condicionAplicacion: 'Cuántos trabajadores hay en la planta',
    datosRequeridos: ['numeroTrabajadores'],
    umbralLegalTexto:
      'Menos de 10 trabajadores: 1 Vigía de SST | 10 o más trabajadores: COPASST (grupo de representantes elegidos por los trabajadores y por la empresa)',
    explicacionSencilla:
      'Define si la empresa nombra a una sola persona encargada de vigilar la seguridad (Vigía) o si entre todos elegimos un equipo llamado COPASST.',
    fuenteOficial: 'Ministerio del Trabajo',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const n = cfg.numeroTrabajadores;
      if (n >= 10) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Como hay ${n} trabajadores (10 o más), la ley pide conformar el COPASST (Comité donde empresa y trabajadores participan por igual). Se elige 1 representante principal y 1 suplente por los trabajadores mediante votación, y 1 principal y 1 suplente por la gerencia (4 personas en total).`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 2013 de 1986 y Decreto 1072 de 2015: Elección y reuniones mensuales del equipo de seguridad COPASST.`,
            nuevaImportancia: `Con ${n} trabajadores en Frikaz S.A.S., el COPASST ayuda a revisar las freidoras, escuchar ideas de los compañeros e investigar cualquier susto o accidente.`,
            nuevaAplicabilidad: `Hacer votación entre los compañeros, nombrar los representantes de la empresa (por 2 años) y reunirse cada mes (con tiempo dentro de la jornada laboral para revisar la planta).`,
            nuevaEvidencia: `Acta de votación y conformación del COPASST y actas firmadas de las reuniones de cada mes.`,
          },
        };
      } else {
        return {
          resultado: 'MODIFICADA_ALCANCE',
          explicacion: `Al tener ${n} trabajadores (menos de 10), no es obligatorio hacer votaciones para COPASST; basta con que la gerencia nombre un Vigía de SST (un compañero capacitado que ayuda a vigilar la seguridad en la planta).`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Decreto 1072 de 2015 (Art. 2.2.4.6.2): Nombramiento y tareas del Vigía de SST para empresas con menos de 10 trabajadores.`,
            nuevaImportancia: `Para los ${n} compañeros de Frikaz S.A.S., el Vigía hace recorridos por la zona de freidoras y empaque para detectar peligros antes de que ocurra un accidente.`,
            nuevaAplicabilidad: `Entregar carta de nombramiento al Vigía, darle su curso de 50 horas y anotar sus recorridos de revisión cada mes.`,
            nuevaEvidencia: `Carta de nombramiento del Vigía de SST, certificado del curso y planillas de revisión.`,
          },
        };
      }
    },
  },

  // 3. Comité de Convivencia Laboral (Res. 652 de 2012 y Res. 1356 de 2012)
  {
    id: 'REG-CONVIVENCIA-LABORAL',
    normaReferencia: 'Resolución 652 de 2012 / Resolución 1356 de 2012',
    disposicionArticulo: 'Resolución 1356/2012 Art. 1 (modifica Art. 3 de Res. 652/2012)',
    area: 'SST',
    fasePhva: 'HACER',
    condicionAplicacion: 'Número de trabajadores',
    datosRequeridos: ['numeroTrabajadores'],
    umbralLegalTexto:
      'Hasta 10 trabajadores: 2 personas (1 por la empresa y 1 por los trabajadores) | De 11 a 50 trabajadores: 4 personas (2 por la empresa y 2 por los trabajadores)',
    explicacionSencilla:
      'Define cuántas personas integran el Comité de Convivencia, que sirve para cuidar el buen trato, escuchar problemas de convivencia y evitar el maltrato o acoso laboral.',
    fuenteOficial: 'Ministerio del Trabajo',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const n = cfg.numeroTrabajadores;
      if (n > 10) {
        return {
          resultado: 'MODIFICADA_ALCANCE',
          explicacion: `Con ${n} trabajadores, el Comité de Convivencia Laboral debe tener 4 integrantes principales (2 por los trabajadores con sus suplentes y 2 por la empresa con sus suplentes). Ya no alcanza con 2.`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 652 de 2012 y 1356 de 2012: Comité de Convivencia ampliado a 4 integrantes (empresas de 11 a 50 trabajadores).`,
            nuevaImportancia: `En Frikaz S.A.S. con ${n} personas, este equipo ayuda a mantener el respeto en los turnos y atender cualquier inconformidad a tiempo y de forma privada.`,
            nuevaAplicabilidad: `Hacer votación para elegir 2 compañeros representantes, nombrar 2 representantes de la empresa y reunirse al menos cada 3 meses.`,
            nuevaEvidencia: `Acta de votación de los 4 integrantes y actas confidenciales de reunión cada 3 meses.`,
          },
        };
      } else {
        return {
          resultado: 'APLICABLE',
          explicacion: `Con ${n} trabajadores (hasta 10), el Comité de Convivencia Laboral se forma con 2 personas (1 por la empresa y 1 elegido por los trabajadores, con sus suplentes).`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 652 de 2012 y 1356 de 2012: Comité de Convivencia sencillo (2 integrantes) para empresas de hasta 10 trabajadores.`,
            nuevaImportancia: `Asegura un canal respetuoso y privado para resolver desacuerdos o prevenir malos tratos dentro de la planta.`,
            nuevaAplicabilidad: `Mantener activos por 2 años a los 2 integrantes elegidos y hacer reuniones cada 3 meses guardando siempre la reserva de lo conversado.`,
            nuevaEvidencia: `Acta de elección de 2 integrantes y actas de seguimiento cada 3 meses.`,
          },
        };
      }
    },
  },

  // 4. Modalidad de Contrato: Aprendices SENA (Ley 789 de 2002)
  {
    id: 'REG-CONTRATO-APRENDIZAJE',
    normaReferencia: 'Ley 789 de 2002 / Decreto 1072 de 2015 Art. 2.2.6.3.1',
    disposicionArticulo: 'Ley 789/2002 Art. 30 y Decreto 1072/2015',
    area: 'SST',
    fasePhva: 'HACER',
    condicionAplicacion: 'Presencia de aprendices SENA o practicantes',
    datosRequeridos: ['modalidadesContrato'],
    umbralLegalTexto:
      'Aplica cuando la empresa recibe estudiantes en práctica o aprendizaje',
    explicacionSencilla:
      'Pide afiliar al aprendiz a la ARL (seguro de riesgos laborales) desde el primer día de práctica, darle la misma ropa de protección (EPP) y prohibir que menores de edad trabajen en freidoras o cuchillas.',
    fuenteOficial: 'Ministerio del Trabajo / SENA',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneAprendices = cfg.modalidadesContrato.includes('aprendizaje');
      if (tieneAprendices) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Tienes activo el contrato de aprendizaje. Frikaz S.A.S. debe afiliar al aprendiz a la ARL desde que empieza su práctica, entregarle sus elementos de protección y no permitir nunca que un menor de edad opere freidoras a más de 160°C ni rebanadoras.`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Ley 789 de 2002 y Decreto 1072 de 2015: Cuidado en seguridad, inducción y afiliación a ARL para aprendices SENA en práctica.`,
            nuevaImportancia: `Protege a los aprendices que están aprendiendo el oficio y evita accidentes graves o multas por ponerlos en máquinas calientes o de corte sin permiso.`,
            nuevaAplicabilidad: `Afiliar al aprendiz a la ARL en la planilla PILA, hacerle charla completa de inducción y entregarle uniforme blanco y protección contra el calor.`,
            nuevaEvidencia: `Contrato de aprendizaje firmado, certificado activo de ARL y firma de asistencia a la inducción.`,
          },
        };
      } else {
        return {
          resultado: 'NO_APLICABLE',
          explicacion: `En este momento no hay aprendices vinculados. Si llega alguno más adelante, esta regla se activará automáticamente.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Regla en espera: hoy Frikaz S.A.S. no tiene aprendices en práctica.`,
          },
        };
      }
    },
  },

  // 5. Modalidad: Prestación de Servicios (Decreto 723 de 2013 / Dec 1072 de 2015)
  {
    id: 'REG-PRESTACION-SERVICIOS',
    normaReferencia: 'Decreto 723 de 2013 / Decreto 1072 de 2015 Art. 2.2.4.2.2.1',
    disposicionArticulo: 'Decreto 723 de 2013 Art. 2, 4 y 6',
    area: 'SST',
    fasePhva: 'HACER',
    condicionAplicacion: 'Personas contratadas por prestación de servicios (técnicos, arreglos, etc.)',
    datosRequeridos: ['modalidadesContrato'],
    umbralLegalTexto: 'Aplica cuando entran personas externas o independientes por contrato de servicios',
    explicacionSencilla:
      'Antes de dejar entrar a alguien que trabaja por servicios (como un técnico de gas o mantenimiento), debemos revisar que tenga al día sus pagos de salud, pensión y ARL (planilla PILA) y explicarle los riesgos de la planta.',
    fuenteOficial: 'Ministerio del Trabajo',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneServicios = cfg.modalidadesContrato.includes('servicios');
      if (tieneServicios) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Al contratar personas por prestación de servicios, debemos pedir cada mes su planilla PILA paga (salud, pensión y ARL), darles una charla rápida sobre los peligros de las freidoras y pedirles permiso de trabajo si van a arreglar equipos calientes.`,
          requiereRevisionHumana: true,
          cambiosPropuestos: {
            nuevaDescripcion: `Decreto 723 de 2013 y Dec. 1072/2015: Revisión de seguridad social (PILA) y charla de peligros para contratistas independientes.`,
            nuevaImportancia: `Cuida a quienes vienen a hacer arreglos o trabajos puntuales y evita que la empresa responda sola si les ocurre un accidente adentro.`,
            nuevaAplicabilidad: `Pedir el comprobante PILA antes de entrar a la planta y antes de pagar facturas, explicar riesgos de la zona y exigir permiso para trabajos con calor o electricidad.`,
            nuevaEvidencia: `Copia de planillas PILA pagas al día, registro de charla de ingreso y permisos de trabajo firmados.`,
          },
        };
      } else {
        return {
          resultado: 'NO_APLICABLE',
          explicacion: `Actualmente no tienes personas fijas contratadas por prestación de servicios.`,
          requiereRevisionHumana: false,
        };
      }
    },
  },

  // 6. Sector Secundario / Alimentos: Buenas Prácticas de Manufactura (Res. 2674 de 2013)
  {
    id: 'REG-ALIMENTOS-BPM-2674',
    normaReferencia: 'Resolución 2674 de 2013',
    disposicionArticulo: 'Capítulos II, III y VIII (Manipulación, edificación y salud del personal)',
    area: 'INTEGRAL',
    fasePhva: 'HACER',
    condicionAplicacion: 'Fábrica o planta que prepara alimentos para el público',
    datosRequeridos: ['sectorEconomico', 'ciiuPrincipal'],
    umbralLegalTexto:
      'Obligatorio para toda planta que prepare, empaque y guarde alimentos en Colombia',
    explicacionSencilla:
      'Son las reglas de higiene (BPM o Buenas Prácticas de Manufactura): exámenes médicos anuales para manipular alimentos, uniforme blanco limpio sin bolsillos arriba, gorro/cofia, tapabocas y curso de higiene alimentaria.',
    fuenteOficial: 'Ministerio de Salud / INVIMA',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const esAlimentos =
        cfg.sectorEconomico === 'secundario' &&
        (cfg.ciiuPrincipal.includes('1089') ||
          cfg.actividadEconomicaConcreta.toLowerCase().includes('snack') ||
          cfg.actividadEconomicaConcreta.toLowerCase().includes('alimento'));

      if (esAlimentos) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Como Frikaz S.A.S. fabrica snacks fritos para comer (código CIIU 1089), aplica toda la Resolución 2674 de 2013. Todos los que tocan o empacan alimentos deben tener su certificado médico anual de manipulación y mínimo 10 horas de capacitación en higiene.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 2674 de 2013: Reglas de limpieza, higiene y Buenas Prácticas de Manufactura (BPM) al preparar snacks fritos.`,
            nuevaImportancia: `Sin este permiso del INVIMA y la Secretaría de Salud de Bosa la planta no puede abrir. Además asegura alimentos sanos para las familias que los compran.`,
            nuevaAplicabilidad: `Hacer exámenes médicos de alimentos a los ${cfg.numeroTrabajadores} trabajadores, usar ropa blanca limpia sin botones ni bolsillos en el pecho, cofia y tapabocas, y anotar la limpieza diaria.`,
            nuevaEvidencia: `Certificados médicos de aptitud para manipular alimentos, certificados del curso de higiene y planillas diarias de aseo.`,
          },
        };
      } else {
        return {
          resultado: 'REQUIERE_REVISION',
          explicacion: `La actividad económica elegida ya no parece de fabricación de alimentos. Por favor confirma si la empresa sigue preparando productos comestibles.`,
          requiereRevisionHumana: true,
          informacionPendiente:
            'Confirmar si se siguen preparando alimentos en la planta bajo la nueva actividad.',
        };
      }
    },
  },

  // 7. Aspecto Ambiental: Aceite de Cocina Usado - ACU (Res. 316 de 2018)
  {
    id: 'REG-AMBIENTAL-ACU-316',
    normaReferencia: 'Resolución 316 de 2018',
    disposicionArticulo: 'Artículos 6, 7 y 8 (Obligaciones de los generadores industriales y comerciales)',
    area: 'AMBIENTAL',
    fasePhva: 'VERIFICAR',
    condicionAplicacion: 'Uso y descarte de aceite de cocina en las freidoras',
    datosRequeridos: ['maquinariaEquipos', 'aspectosAmbientales'],
    umbralLegalTexto:
      'Empresas que fríen alimentos con aceites vegetales',
    explicacionSencilla:
      'Prohíbe botar el aceite usado por el sifón o a la basura común. Debe guardarse frío (por debajo de 40 °C) en canecas azules tapadas y entregarse solo a una empresa autorizada que entregue certificado.',
    fuenteOficial: 'Ministerio de Ambiente / Secretaría de Ambiente de Bogotá',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneFreidoras = cfg.maquinariaEquipos.some((m) =>
        m.toLowerCase().includes('freidora')
      );
      const generaACU = cfg.aspectosAmbientales.some((a) =>
        a.toLowerCase().includes('aceite de cocina usado') || a.toLowerCase().includes('acu')
      );

      if (tieneFreidoras || generaACU) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Al usar freidoras y sacar entre 180 y 250 litros al mes de Aceite de Cocina Usado (ACU), Frikaz S.A.S. debe registrarse ante la Secretaría de Ambiente de Bogotá bajo la Resolución 316 de 2018.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 316 de 2018: Manejo seguro y entrega autorizada del Aceite de Cocina Usado (ACU).`,
            nuevaImportancia: `Un litro de aceite en el sifón contamina miles de litros de agua del río Bogotá y puede traer multas muy altas. Guardarlo bien también evita resbalones en la planta.`,
            nuevaAplicabilidad: `Esperar a que el aceite enfríe (< 40 °C), pasarlo con cuidado a canecas azules marcadas sobre estiba, anotar los litros y entregarlo solo al gestor con permiso ambiental.`,
            nuevaEvidencia: `Recibos o certificados de entrega de ACU firmados por el gestor autorizado y registro anual en la página de la Secretaría de Ambiente.`,
          },
        };
      } else {
        return {
          resultado: 'REQUIERE_REVISION',
          explicacion: `No marcaste freidoras ni aceite usado en los equipos actuales. Confirma si en la planta ya no se fríen alimentos con aceite.`,
          requiereRevisionHumana: true,
          informacionPendiente:
            'Confirmar si se dejaron de usar freidoras con aceite vegetal.',
        };
      }
    },
  },

  // 8. Vertimientos No Domésticos y Trampa de Grasas (Res. 0631 de 2015)
  {
    id: 'REG-VERTIMIENTOS-0631',
    normaReferencia: 'Resolución 0631 de 2015',
    disposicionArticulo: 'Capítulo VI (Parámetros para actividades de elaboración de alimentos)',
    area: 'AMBIENTAL',
    fasePhva: 'HACER',
    condicionAplicacion: 'Salida de aguas de lavado de planta hacia el alcantarillado',
    datosRequeridos: ['sedesInstalaciones', 'aspectosAmbientales'],
    umbralLegalTexto:
      'Límites máximos de grasa, restos de comida y jabones que pueden ir al agua del alcantarillado',
    explicacionSencilla:
      'Pide tener una trampa de grasas limpia y funcionando para atrapar la grasa y cáscaras antes de que el agua del lavado salga a la calle.',
    fuenteOficial: 'Ministerio de Ambiente',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneTrampa = cfg.sedesInstalaciones.trampaGrasasOperativa;
      if (tieneTrampa) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Frikaz S.A.S. cuenta con trampa de grasas. La Resolución 0631 de 2015 nos pide limpiarla cada 15 días para que no salga grasa por las tuberías del alcantarillado de Bosa.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 0631 de 2015: Control del agua de lavado y limpieza de la trampa de grasas antes de salir al alcantarillado.`,
            nuevaImportancia: `Evita que se tapen los desagües de la planta o de la cuadra y evita sanciones del Acueducto o la Secretaría de Ambiente.`,
            nuevaAplicabilidad: `Sacar las natas de grasa cada 15 días usando guantes largos, echarlas en recipiente cerrado para el gestor autorizado (nunca al inodoro) y anotar la limpieza en la planilla.`,
            nuevaEvidencia: `Planilla firmada de limpieza quincenal de la trampa de grasas y comprobantes de entrega de esos residuos.`,
          },
        };
      } else {
        return {
          resultado: 'PENDIENTE_INFORMACION',
          explicacion: `ATENCIÓN: Indicaste que la trampa de grasas NO está funcionando. Sin ella, la grasa del lavado va directo al alcantarillado e incumple la Resolución 0631 de 2015.`,
          requiereRevisionHumana: true,
          informacionPendiente:
            'Arreglar o instalar la trampa de grasas en los desagües de la zona de lavado y fritura.',
        };
      }
    },
  },

  // 9. Emisiones Atmosféricas y Vahos de Fritura (Res. 909 de 2008)
  {
    id: 'REG-EMISIONES-909',
    normaReferencia: 'Resolución 909 de 2008 / Decreto 1076 de 2015',
    disposicionArticulo: 'Capítulo IV y V (Estándares para fuentes fijas de combustión y cocción)',
    area: 'AMBIENTAL',
    fasePhva: 'VERIFICAR',
    condicionAplicacion: 'Uso de campana extractora, chimenea y quemadores a gas',
    datosRequeridos: ['sedesInstalaciones', 'consumoAguaEnergia'],
    umbralLegalTexto:
      'Ducto vertical por encima del techo y filtros limpios para retener grasa y humo',
    explicacionSencilla:
      'Exige mantener la campana extractora con sus filtros limpios y el tubo de salida por encima del techo para que el humo y el olor a frito no molesten a los vecinos de Bosa Piamonte ni acumulen grasa inflamable.',
    fuenteOficial: 'Ministerio de Ambiente / Secretaría de Ambiente',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneCampana = cfg.sedesInstalaciones.campanaExtractoraFiltros;
      if (tieneCampana) {
        return {
          resultado: 'APLICABLE',
          explicacion: `La campana extractora con ducto alto ayuda a sacar el calor y reduce los olores hacia las casas vecinas de Bosa Piamonte. Hay que desengrasar los filtros cada 15 días.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `Resolución 909 de 2008: Limpieza de filtros de la campana y cuidado del ducto de salida de humos y olores.`,
            nuevaImportancia: `Cuida el aire dentro de la cocina para que los compañeros respiren mejor, evita incendios por grasa acumulada en el tubo y mantiene buena relación con los vecinos.`,
            nuevaAplicabilidad: `Desmontar y lavar los filtros metálicos cada 15 días y revisar el motor extractor y ducto cada 6 meses.`,
            nuevaEvidencia: `Planilla de lavado quincenal de filtros y factura o certificado de limpieza profunda del ducto cada 6 meses.`,
          },
        };
      } else {
        return {
          resultado: 'REQUIERE_REVISION',
          explicacion: `ATENCIÓN: La campana extractora aparece sin filtros o apagada. Sin filtros se acumula grasa peligrosa en el ducto y el humo queda dentro de la planta.`,
          requiereRevisionHumana: true,
          informacionPendiente:
            'Revisar que los filtros estén puestos y que el tubo salga por encima del techo.',
        };
      }
    },
  },

  // 10. Seguridad Contra Incendios y Extintores Clase K (NTC 2885 / NFPA 10 / Res. 2400 de 1979)
  {
    id: 'REG-EXTINTORES-CLASE-K',
    normaReferencia: 'NTC 2885 / NFPA 10 / Resolución 2400 de 1979',
    disposicionArticulo: 'NTC 2885 Numeral 5.5 (Fuegos en artefactos de cocina con aceites vegetales)',
    area: 'SST',
    fasePhva: 'HACER',
    condicionAplicacion: 'Freidoras industriales con aceite muy caliente (>160°C)',
    datosRequeridos: ['maquinariaEquipos'],
    umbralLegalTexto:
      'Obligatorio tener extintor especial Clase K (acetato de potasio) a menos de 9 metros de las freidoras',
    explicacionSencilla:
      'Si alguna vez se prende fuego en una freidora con aceite, NUNCA eches agua ni uses un extintor común porque el aceite salta en forma de bola de fuego. Para eso existe el extintor plateado Clase K.',
    fuenteOficial: 'Bomberos de Bogotá / ICONTEC',
    fechaVerificacion: '2026-03-15',
    evaluar: (cfg) => {
      const tieneFreidoras = cfg.maquinariaEquipos.some((m) =>
        m.toLowerCase().includes('freidora')
      );
      if (tieneFreidoras) {
        return {
          resultado: 'APLICABLE',
          explicacion: `Como trabajamos con freidoras a más de 160°C, es obligatorio tener un extintor Clase K a menos de 9 metros, revisar el termostato de corte y capacitar a todo el equipo para jamás arrojar agua al aceite caliente.`,
          requiereRevisionHumana: false,
          cambiosPropuestos: {
            nuevaDescripcion: `NTC 2885 y Resolución 2400 de 1979: Extintor Clase K y reglas para apagar incendios en freidoras con aceite.`,
            nuevaImportancia: `Salva vidas en la planta: el aceite vegetal arde a más de 300 °C y echarle agua provoca una explosión de fuego.`,
            nuevaAplicabilidad: `Tener el extintor Clase K de 6 litros siempre visible y despejado cerca de las freidoras, revisar su aguja cada mes y recargarlo cada año con empresa autorizada.`,
            nuevaEvidencia: `Hoja de vida del extintor Clase K, planilla mensual de revisión de aguja y etiqueta de recarga vigente.`,
          },
        };
      } else {
        return {
          resultado: 'MODIFICADA_ALCANCE',
          explicacion: `Si no hay freidoras con aceite caliente, bastaría con extintores normales ABC o Solkaflam para oficinas y bodega.`,
          requiereRevisionHumana: true,
        };
      }
    },
  },
];

// ==========================================
// FUNCIÓN PRINCIPAL DE EVALUACIÓN DE IMPACTO
// ==========================================

export function evaluarImpactoCambio(
  configAnterior: CaracterizacionEmpresaDinamica,
  configNueva: CaracterizacionEmpresaDinamica,
  normasActuales: NormaPhvaItem[],
  usuario: string = 'Auditor SG-SST Frikaz'
): ResumenEvaluacionImpacto {
  const timestamp = new Date().toISOString();

  // 1. Detectar variables modificadas
  const diferencias: string[] = [];
  if (configAnterior.numeroTrabajadores !== configNueva.numeroTrabajadores) {
    diferencias.push(
      `Cantidad de trabajadores: ${configAnterior.numeroTrabajadores} → ${configNueva.numeroTrabajadores}`
    );
  }
  if (
    JSON.stringify(configAnterior.modalidadesContrato) !==
    JSON.stringify(configNueva.modalidadesContrato)
  ) {
    diferencias.push(
      `Modalidades de contrato: [${configAnterior.modalidadesContrato.join(', ')}] → [${configNueva.modalidadesContrato.join(', ')}]`
    );
  }
  if (configAnterior.sectorEconomico !== configNueva.sectorEconomico) {
    diferencias.push(
      `Sector económico: ${configAnterior.sectorEconomico} → ${configNueva.sectorEconomico}`
    );
  }
  if (configAnterior.claseRiesgoSST !== configNueva.claseRiesgoSST) {
    diferencias.push(
      `Clase de riesgo ARL: ${configAnterior.claseRiesgoSST} → ${configNueva.claseRiesgoSST}`
    );
  }
  if (configAnterior.ciiuPrincipal !== configNueva.ciiuPrincipal) {
    diferencias.push(`Código CIIU: ${configAnterior.ciiuPrincipal} → ${configNueva.ciiuPrincipal}`);
  }
  if (
    configAnterior.maquinariaEquipos.length !== configNueva.maquinariaEquipos.length ||
    JSON.stringify(configAnterior.maquinariaEquipos) !==
      JSON.stringify(configNueva.maquinariaEquipos)
  ) {
    diferencias.push(
      `Maquinaria y equipos: ${configNueva.maquinariaEquipos.length} elementos configurados`
    );
  }
  if (
    configAnterior.sustanciasQuimicas.length !== configNueva.sustanciasQuimicas.length ||
    JSON.stringify(configAnterior.sustanciasQuimicas) !==
      JSON.stringify(configNueva.sustanciasQuimicas)
  ) {
    diferencias.push(
      `Sustancias químicas: ${configNueva.sustanciasQuimicas.length} productos registrados`
    );
  }

  const variableModificada = diferencias.length > 0 ? diferencias.join(' | ') : 'Sin cambios';

  // 2. Ejecutar motor de reglas sobre la configuración nueva
  const propuestasGeneradas: PropuestaCambioNorma[] = [];
  const normasNuevasAplicables: PropuestaCambioNorma[] = [];
  const normasParaRevisar: PropuestaCambioNorma[] = [];
  const normasSinCambios: PropuestaCambioNorma[] = [];
  const obligacionesModificadas: PropuestaCambioNorma[] = [];
  const evidenciasAjustar: PropuestaCambioNorma[] = [];
  const datosPendientes: PropuestaCambioNorma[] = [];

  REGLAS_NORMATIVAS_COLOMBIA.forEach((regla) => {
    const evaluacionAnterior = regla.evaluar(configAnterior);
    const evaluacionNueva = regla.evaluar(configNueva);

    // Buscar si existe en la matriz de 74 normas
    const normaEnMatriz = normasActuales.find(
      (n) =>
        n.normaOficial.toLowerCase().includes(regla.normaReferencia.toLowerCase().split(' ')[0]) ||
        n.descripcion.toLowerCase().includes(regla.normaReferencia.toLowerCase().split(' ')[0])
    );

    const normaId = normaEnMatriz ? normaEnMatriz.id : `prop-${regla.id}`;
    const articulos = normaEnMatriz ? normaEnMatriz.articulos : regla.disposicionArticulo;

    let categoriaAlerta: PropuestaCambioNorma['categoriaAlerta'] = 'SIN_CAMBIOS';
    let motivo = '';

    if (evaluacionNueva.resultado === 'PENDIENTE_INFORMACION') {
      categoriaAlerta = 'INFORMACION_PENDIENTE';
      motivo = `Falta un dato para confirmar: ${evaluacionNueva.informacionPendiente || 'Revisar datos de la planta'}`;
    } else if (evaluacionAnterior.resultado !== evaluacionNueva.resultado) {
      if (
        evaluacionAnterior.resultado === 'NO_APLICABLE' &&
        evaluacionNueva.resultado === 'APLICABLE'
      ) {
        categoriaAlerta = 'NORMA_NUEVA_APLICABLE';
        motivo = `Se activó una nueva regla que ahora nos aplica por los cambios hechos`;
      } else if (evaluacionNueva.resultado === 'MODIFICADA_ALCANCE') {
        categoriaAlerta = 'OBLIGACION_MODIFICADA';
        motivo = `Cambió lo que debemos hacer porque cambió el tamaño o las condiciones de la planta`;
      } else if (evaluacionNueva.requiereRevisionHumana) {
        categoriaAlerta = 'REVISION_APLICABILIDAD';
        motivo = `El encargado de SST debe revisar y confirmar este punto`;
      }
    } else if (evaluacionNueva.requiereRevisionHumana) {
      categoriaAlerta = 'REVISION_APLICABILIDAD';
      motivo = `Regla importante que conviene confirmar para asegurarnos de cumplirla`;
    } else {
      categoriaAlerta = 'SIN_CAMBIOS';
      motivo = `Esta regla sigue igual, sin cambios por ahora`;
    }

    const propuesta: PropuestaCambioNorma = {
      id: `prop-${regla.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      normaId,
      normaOficial: regla.normaReferencia,
      articulos,
      area: regla.area,
      fasePhva: regla.fasePhva,
      categoriaAlerta,
      motivoAlerta: motivo,
      justificacionLegal: `${regla.disposicionArticulo}. ${regla.umbralLegalTexto}. ${evaluacionNueva.explicacion}`,
      valorAnteriorTexto: evaluacionAnterior.explicacion,
      valorPropuestoTexto: evaluacionNueva.explicacion,
      estadoPropuesta: 'PENDIENTE',
    };

    propuestasGeneradas.push(propuesta);

    if (categoriaAlerta === 'NORMA_NUEVA_APLICABLE') {
      normasNuevasAplicables.push(propuesta);
    } else if (categoriaAlerta === 'REVISION_APLICABILIDAD') {
      normasParaRevisar.push(propuesta);
    } else if (categoriaAlerta === 'OBLIGACION_MODIFICADA') {
      obligacionesModificadas.push(propuesta);
      evidenciasAjustar.push(propuesta);
    } else if (categoriaAlerta === 'INFORMACION_PENDIENTE') {
      datosPendientes.push(propuesta);
    } else {
      normasSinCambios.push(propuesta);
    }
  });

  const totalAfectadas =
    normasNuevasAplicables.length +
    normasParaRevisar.length +
    obligacionesModificadas.length +
    datosPendientes.length;

  // 3. Generar Resumen Ejecutivo dinámico exigido por la especificación
  let resumenEjecutivo = '';
  if (configAnterior.numeroTrabajadores !== configNueva.numeroTrabajadores) {
    resumenEjecutivo = `Cambió el número de trabajadores de ${configAnterior.numeroTrabajadores} a ${configNueva.numeroTrabajadores}. Hay ${totalAfectadas} reglas para revisar, ${normasSinCambios.length} siguen igual y ${datosPendientes.length + normasParaRevisar.length} necesitan revisar datos antes de aplicar cambios.`;
  } else if (diferencias.length > 0) {
    resumenEjecutivo = `Se actualizaron los datos de la planta (${diferencias[0]}). Detectamos ${totalAfectadas} reglas que pueden cambiar y ${normasSinCambios.length} reglas que siguen sin novedad.`;
  } else {
    resumenEjecutivo = `Revisión lista: todas las ${normasSinCambios.length} reglas coinciden con la forma como trabaja hoy Frikaz S.A.S.`;
  }

  const resumen: ResumenEvaluacionImpacto = {
    id: `eval-${Date.now()}`,
    fechaHora: timestamp,
    usuarioResponsable: usuario,
    variableModificada,
    valorAnterior: configAnterior,
    valorNuevo: configNueva,
    totalNormasEvaluadas: REGLAS_NORMATIVAS_COLOMBIA.length,
    totalNormasAfectadas: totalAfectadas,
    normasNuevasAplicables,
    normasParaRevisar,
    normasSinCambios,
    obligacionesModificadas,
    evidenciasAjustar,
    datosPendientes,
    propuestas: propuestasGeneradas,
    resumenEjecutivo,
  };

  return resumen;
}

// ==========================================
// APLICACIÓN REAL DE PROPUESTAS A LAS 74 NORMAS
// ==========================================

export function aplicarPropuestasANormas(
  normasActuales: NormaPhvaItem[],
  propuestasAprobadas: PropuestaCambioNorma[],
  configNueva: CaracterizacionEmpresaDinamica,
  usuario: string = 'Auditor SG-SST Frikaz'
): {
  normasActualizadas: NormaPhvaItem[];
  conteoActualizadas: number;
} {
  let conteo = 0;
  const mapaPropuestas = new Map<string, PropuestaCambioNorma>();
  propuestasAprobadas.forEach((p) => {
    mapaPropuestas.set(p.normaOficial.toLowerCase().split(' ')[0], p);
  });

  const normasActualizadas = normasActuales.map((norma) => {
    const key = norma.normaOficial.toLowerCase().split(' ')[0];
    const propuesta = mapaPropuestas.get(key);

    if (!propuesta) return norma;

    // Buscar regla correspondiente para extraer datos propuestos
    const regla = REGLAS_NORMATIVAS_COLOMBIA.find((r) =>
      r.normaReferencia.toLowerCase().includes(key)
    );

    if (!regla) return norma;

    const resRegla = regla.evaluar(configNueva);
    const props = resRegla.cambiosPropuestos;

    conteo++;

    return {
      ...norma,
      descripcion: props?.nuevaDescripcion || norma.descripcion,
      importancia: props?.nuevaImportancia || norma.importancia,
      aplicabilidad: props?.nuevaAplicabilidad || norma.aplicabilidad,
      evidenciaCumplimiento: props?.nuevaEvidencia || norma.evidenciaCumplimiento,
      estado: props?.nuevoEstadoCumplimiento || norma.estado,
      responsable: props?.nuevoResponsable || norma.responsable,
      fechaVerificacion: new Date().toISOString().split('T')[0],
      observaciones: `Actualizado automáticamente por Caracterización Dinámica: ${propuesta.justificacionLegal.slice(0, 150)}...`,
    };
  });

  return {
    normasActualizadas,
    conteoActualizadas: conteo,
  };
}
