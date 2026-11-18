import {
  CargoSST,
  PoliticaSSTData,
  RegistroHistorialPolitica,
} from '../types/organigramaSst';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
} from 'docx';
import {
  crearCajaCalidadDocxTable,
  obtenerMetadatosDocumentoCalidad,
  cargarLogoFrikazBytes,
  DOCX_FONT,
  DOCX_FONT_SIZE_BODY as DOCX_FONT_SIZE_12,
  DOCX_LINE_SPACING_1_5,
  DOCX_MARGIN_1_INCH,
} from './calidadDocumentalService';

const STORAGE_KEY_POLITICA = 'frikaz_politica_sgsst_v1';
const STORAGE_KEY_CARGOS = 'frikaz_cargos_sgsst_v1';
const PLAIN_LANG_POLITICA_FLAG = 'frikaz_politica_plain_lang_v1';
const PLAIN_LANG_CARGOS_FLAG = 'frikaz_cargos_plain_lang_v1';

// ============================================================================
// DATOS CANÓNICOS DEL ORGANIGRAMA Y RESPONSABILIDADES SST (FRIKAZ S.A.S.)
// ============================================================================
export const CARGOS_SST_CANONICOS: CargoSST[] = [
  // NIVEL 1. ALTA DIRECCIÓN
  {
    id: 'cargo-gerente-general',
    nombre: 'Gerente General',
    nivelJerarquico: 'ALTA_DIRECCION',
    nivelNombre: 'Nivel 1. Dirección de la Empresa',
    areaProceso: 'Dirección General y Toma de Decisiones',
    icono: 'Crown',
    colorTheme: {
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-300',
      border: 'border-purple-500/40',
      accent: 'text-purple-400',
      gradient: 'from-purple-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Es la persona que dirige Frikaz S.A.S. Se encarga de respaldar la seguridad de todo el equipo y asegurar el dinero, los materiales y el tiempo necesarios para trabajar sin accidentes (Decreto 1072 de 2015, Art. 2.2.4.6.8).',
    responsabilidades: [
      'Dirigir el cuidado de la seguridad y salud en Frikaz S.A.S. y explicar cómo vamos cada año ante los trabajadores, el Ministerio del Trabajo y la ARL (aseguradora de riesgos laborales).',
      'Firmar, dar a conocer a todos y revisar cada año la Política de Seguridad y Salud en el Trabajo.',
      'Entregar a tiempo el dinero, herramientas y elementos de protección: guantes contra el calor (hasta 200 °C), caretas, botas antideslizantes, mantenimiento de freidoras y extintores Clase K.',
      'Apoyar la elección y el trabajo diario del Vigía de Seguridad (o del equipo COPASST), dándole tiempo dentro de la jornada para revisar la planta.',
      'Revisar una vez al año cómo va la seguridad en la fábrica junto con los trabajadores y aprobar mejoras reales para los 10 compañeros.',
      'Asegurar que el Aceite de Cocina Usado (ACU) se entregue únicamente a una empresa autorizada por la Secretaría de Ambiente, sin botarlo nunca al sifón.',
    ],
    compromisos: [
      'Participar puntualmente en las reuniones anuales donde revisamos cómo va la seguridad en la planta.',
      'Mantener siempre presupuesto listo para cambiar botas antideslizantes, guantes y delantales dañados sin demora.',
      'Escuchar de forma directa y rápida al Coordinador o Vigía de SST cuando avise de un peligro en la planta.',
      'Apoyar a cualquier compañero que pare una máquina o tarea si ve un peligro grave (por ejemplo, olor a gas o una freidora sin control de temperatura).',
    ],
    ordenNivel: 1,
  },

  // NIVEL 2. RESPONSABLE DEL SG-SST
  {
    id: 'cargo-coordinador-vigia-sst',
    nombre: 'Coordinador / Vigía de SST',
    nivelJerarquico: 'RESPONSABLE_SST',
    nivelNombre: 'Nivel 2. Encargado de Seguridad y Salud',
    areaProceso: 'Seguridad y Salud en el Trabajo (SST)',
    icono: 'ShieldCheck',
    colorTheme: {
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      border: 'border-emerald-500/40',
      accent: 'text-emerald-400',
      gradient: 'from-emerald-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Es quien organiza, acompaña y revisa que todas las medidas de cuidado funcionen cada día en Frikaz S.A.S., cumpliendo los 7 Estándares Básicos de la Resolución 0312 de 2019 y el Decreto 1072 de 2015.',
    responsabilidades: [
      'Organizar y hacer cumplir el Plan Anual de Seguridad y las charlas de capacitación con apoyo de la ARL.',
      'Mantener al día la lista de peligros de cada puesto (Matriz de Riesgos GTC 45) y las normas que debe cumplir la planta.',
      'Revisar con frecuencia las freidoras a gas, la campana extractora, las cuchillas y que los pisos estén secos y sin huecos.',
      'Investigar todos los accidentes y sustos (incidentes) dentro de los 15 días hábiles siguientes (Resolución 1401 de 2007) para entender qué pasó y que no se repita.',
      'Entregar, revisar y cambiar a tiempo los Elementos de Protección Personal (EPP) de cada compañero y enseñar cómo usarlos.',
      'Coordinar con la ARL prácticas de qué hacer si se prende el aceite (uso del extintor Clase K), primeros auxilios en quemaduras y pausas activas.',
      'Guardar en orden todos los recibos de entrega de Aceite de Cocina Usado (ACU) para presentarlos a la Secretaría de Ambiente.',
    ],
    compromisos: [
      'Tener al día el certificado del curso de 50 horas en Seguridad y Salud en el Trabajo del Ministerio del Trabajo.',
      'Hacer recorridos sorpresa por la planta para revisar que todos trabajemos seguros y con la protección puesta.',
      'Guardar total respeto y reserva con los exámenes médicos y la salud de cada compañero.',
      'Avisar de inmediato a la Gerencia si encuentra fallas graves en el gas, las freidoras o la electricidad.',
    ],
    ordenNivel: 2,
  },

  // NIVEL 3. NIVEL OPERATIVO (5 CARGOS)
  {
    id: 'cargo-operario-seleccion',
    nombre: 'Operario de Selección',
    nivelJerarquico: 'NIVEL_OPERATIVO',
    nivelNombre: 'Nivel 3. Equipo de Planta y Ruta',
    areaProceso: 'Planta – Recibo, Selección y Lavado de Papa y Plátano',
    icono: 'CheckCircle2',
    colorTheme: {
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300',
      border: 'border-blue-500/40',
      accent: 'text-blue-400',
      gradient: 'from-blue-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Se encarga de recibir, escoger y lavar la papa y el plátano antes de cortarlos, cuidando su espalda, sus manos y evitando caídas en pisos húmedos (Decreto 1072 de 2015, Art. 2.2.4.6.10).',
    responsabilidades: [
      'Escoger y lavar las canastillas cuidando su postura: doblar las rodillas y mantener la espalda recta al levantar peso.',
      'Usar todo el turno su delantal impermeable, botas antideslizantes, cofia (gorro) y guantes de nitrilo.',
      'No cargar más peso del permitido (máximo 25 kg en hombres y 12.5 kg en mujeres); si pesa más, usar la carretilla o pedir ayuda.',
      'Mantener libre la rejilla del desagüe en la zona de lavado para que no se formen charcos ni resbalones.',
      'Avisar de inmediato al encargado si hay fugas de agua, pisos lisos, rejas dañadas o canastillas rotas.',
      'Participar en las pausas activas de estiramiento y en las charlas de seguridad.',
    ],
    compromisos: [
      'Pedir ayuda a un compañero o usar la zorra (carretilla) cuando deba mover bultos o canastillas pesadas.',
      'Hacer los estiramientos cortos de espalda, brazos y manos para evitar dolores musculares.',
      'Avisar a tiempo si siente dolor de cintura, hombros o muñecas al hacer su trabajo.',
    ],
    ordenNivel: 3,
  },
  {
    id: 'cargo-operario-pelado',
    nombre: 'Operario de Pelado',
    nivelJerarquico: 'NIVEL_OPERATIVO',
    nivelNombre: 'Nivel 3. Equipo de Planta y Ruta',
    areaProceso: 'Planta – Pelado y Corte en Rebanadora',
    icono: 'Scissors',
    colorTheme: {
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300',
      border: 'border-cyan-500/40',
      accent: 'text-cyan-400',
      gradient: 'from-cyan-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Se encarga de pelar y cortar la papa y el plátano en las peladoras y rebanadoras. Su mayor cuidado es proteger sus dedos y manos de cortes con cuchillas o partes en movimiento.',
    responsabilidades: [
      'Revisar antes de prender la peladora o rebanadora que todas las tapas y protecciones de las cuchillas estén bien puestas.',
      'Usar siempre el guante anticorte de malla metálica en la mano que sostiene el producto cuando use cuchillos o peladores manuales.',
      'Para lavar o destrabar la rebanadora, SIEMPRE apagarla y desenchufarla de la corriente antes de acercar las manos.',
      'Echar las cáscaras de inmediato en los botes orgánicos para no pisarlas ni resbalarse.',
      'Avisar enseguida si un cuchillo perdió filo, tiene el mango flojo o si una protección de la máquina está dañada.',
      'Asistir a las charlas sobre cuidado de las manos y qué hacer ante una cortada.',
    ],
    compromisos: [
      'Nunca encender la rebanadora sin sus tapas protectoras ni meter los dedos cerca del disco que gira.',
      'Usar siempre el empujador plástico para meter la papa o el plátano en la rebanadora.',
      'Guardar los cuchillos en su estuche o porta-cuchillos apenas termine de usarlos; nunca dejarlos sueltos en la mesa.',
    ],
    ordenNivel: 3,
  },
  {
    id: 'cargo-operario-frito',
    nombre: 'Operario de Frito',
    nivelJerarquico: 'NIVEL_OPERATIVO',
    nivelNombre: 'Nivel 3. Equipo de Planta y Ruta',
    areaProceso: 'Planta – Freidoras Industriales a Gas (170 °C a 180 °C)',
    icono: 'Flame',
    colorTheme: {
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-300',
      border: 'border-orange-500/40',
      accent: 'text-orange-400',
      gradient: 'from-orange-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Maneja las freidoras a gas con aceite muy caliente (hasta 180 °C). Su trabajo exige cuidar la piel, los ojos y evitar incendios o fugas de gas.',
    responsabilidades: [
      'Mantener las freidoras en la temperatura correcta (máximo 180 °C) y con el nivel de aceite adecuado.',
      'Usar todo el tiempo su equipo contra el calor: guantes largos térmicos (hasta 200 °C), careta transparente para la cara, delantal grueso contra salpicaduras y botas antideslizantes.',
      'Escurrir y secar bien las tajadas de papa y plátano antes de meterlas al aceite para que no salte aceite hirviendo.',
      'Revisar antes de prender cada turno que los quemadores, llaves de gas y campana extractora funcionen bien y no huelan a gas.',
      'Saber exactamente dónde está el extintor plateado Clase K (especial para aceite) y la llave general para cerrar el gas en una emergencia.',
      'Sacar o filtrar el Aceite de Cocina Usado (ACU) SOLO cuando el aceite esté tibio o frío (por debajo de 40 °C), pasándolo con cuidado a las canecas azules marcadas.',
    ],
    compromisos: [
      'NUNCA echar agua al aceite caliente ni intentar apagar fuego de freidora con agua.',
      'Apagar los quemadores y avisar de inmediato si siente olor a gas o ve que el aceite empieza a echar humo anormal.',
      'Mantener el piso alrededor de las freidoras totalmente seco y sin grasa para evitar caídas sobre el calor.',
      'Tomar sus pausas de hidratación y descanso para bajar el calor del cuerpo.',
    ],
    ordenNivel: 3,
  },
  {
    id: 'cargo-operario-empaque',
    nombre: 'Operario de Empaque',
    nivelJerarquico: 'NIVEL_OPERATIVO',
    nivelNombre: 'Nivel 3. Equipo de Planta y Ruta',
    areaProceso: 'Planta – Pesaje, Sellado Térmico y Empaque',
    icono: 'Package',
    colorTheme: {
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      border: 'border-amber-500/40',
      accent: 'text-amber-400',
      gradient: 'from-amber-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Pesa, sella las bolsas con calor y acomoda las cajas de producto listo. Cuida sus dedos frente a las mordazas calientes de la selladora y protege sus muñecas y hombros.',
    responsabilidades: [
      'Usar con cuidado la selladora de banda térmica, manteniendo los dedos lejos de las resistencias calientes que sellan la bolsa.',
      'Cumplir siempre las reglas de higiene (BPM — Resolución 2674 de 2013): cofia (gorro), tapabocas, uniforme limpio y guantes cuando toque el producto.',
      'Cuidar la postura de sus brazos y muñecas al pesar y sellar, alternando tareas para no cansar siempre los mismos tendones.',
      'Arrumar las cajas llenas bien trabadas y sin pasar de 1.5 metros de altura para que no se caigan encima de nadie.',
      'Avisar enseguida si un cable de la selladora está pelado, si falla un enchufe o si la mesa estorba el paso.',
      'Hacer las pausas activas de estiramiento de manos, muñecas y cuello durante el turno.',
    ],
    compromisos: [
      'No tocar nunca las resistencias de la selladora si acaban de apagarla; esperar a que enfríen para limpiarla.',
      'Hacer pausas cortas para descansar las manos y muñecas cada 2 horas.',
      'Dejar siempre despejados los pasillos de salida y el espacio alrededor de la báscula.',
    ],
    ordenNivel: 3,
  },
  {
    id: 'cargo-conductor',
    nombre: 'Conductor',
    nivelJerarquico: 'NIVEL_OPERATIVO',
    nivelNombre: 'Nivel 3. Equipo de Planta y Ruta',
    areaProceso: 'Entregas en Vehículo y Distribución en Bogotá',
    icono: 'Truck',
    colorTheme: {
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      border: 'border-emerald-500/40',
      accent: 'text-emerald-400',
      gradient: 'from-emerald-950/70 via-slate-900 to-slate-950',
      cardBg: 'bg-slate-900/90',
    },
    descripcionPuesto:
      'Lleva los pedidos de snacks a los clientes en Bogotá y municipios cercanos. Su prioridad es manejar con calma, revisar el carro antes de salir y cuidar su espalda al descargar.',
    responsabilidades: [
      'Manejar siempre a la defensiva, respetando los límites de velocidad y las señales de tránsito (Ley 769 de 2002).',
      'Revisar cada mañana antes de arrancar la lista rápida del vehículo: frenos, luces, llantas, espejos, niveles y cinturón de seguridad.',
      'Llevar al día y dentro del vehículo el SOAT, la Técnico-Mecánica, su licencia de conducción y el kit de carretera completo.',
      'Cargar y bajar las cajas cuidando la espalda (sin giros bruscos, doblando rodillas) y con botas de seguridad puestas.',
      'Avisar enseguida a Frikaz S.A.S. y a la ARL si ocurre un choque, varada o accidente en la vía.',
      'Asistir a las charlas sobre manejo seguro, descanso y prevención de accidentes de tránsito.',
    ],
    compromisos: [
      'CERO alcohol ni drogas antes o durante la jornada de manejo.',
      'No usar el celular mientras el carro está en movimiento (si necesita llamar o mirar ruta, orillarse en lugar seguro).',
      'Usar siempre el cinturón de seguridad y pedirle a cualquier acompañante que también se lo abroche.',
      'Descansar unos minutos en rutas largas o con mucho trancón para manejar alerta y sin sueño.',
    ],
    ordenNivel: 3,
  },
];

// ============================================================================
// DATOS CANÓNICOS DE LA POLÍTICA DEL SG-SST (FRIKAZ S.A.S.)
// ============================================================================
export const POLITICA_SST_CANONICA: PoliticaSSTData = {
  id: 'politica-frikaz-sgsst-2026',
  empresa: 'Frikaz S.A.S.',
  nit: '901.234.567-8',
  direccion: 'Calle 65 Sur # 78-45, Bosa, Bogotá D.C., Colombia',
  actividadPrincipal:
    'Preparación y venta de snacks fritos (papas, plátanos y chicharrones) · Código CIIU 1089',
  titulo: 'POLÍTICA DE SEGURIDAD Y SALUD EN EL TRABAJO',
  declaracionIntroductoria:
    'En Frikaz S.A.S., donde preparamos y repartimos snacks fritos, lo más valioso son las personas que hacen posible cada jornada. Por eso, la Gerencia se compromete de corazón a:',
  compromisos: [
    {
      id: 1,
      titulo: 'Cuidar la vida y la salud de todos',
      descripcion:
        'Proteger la salud y evitar accidentes de todos nuestros compañeros (Gerente, operarios de selección, pelado, frito, empaque y conductores), así como de visitantes y contratistas. Ponemos especial cuidado en prevenir quemaduras en las freidoras, cortadas en cuchillas, dolores de espalda o manos por cargas y posturas, caídas en pisos húmedos y accidentes en la vía.',
    },
    {
      id: 2,
      titulo: 'Cumplir las leyes que nos protegen',
      descripcion:
        'Cumplir todas las leyes colombianas de Seguridad y Salud en el Trabajo (como el Decreto 1072 de 2015 y la Resolución 0312 de 2019) y el cuidado del medio ambiente, como entregar el aceite usado a un gestor autorizado.',
    },
    {
      id: 3,
      titulo: 'Escuchar y trabajar en equipo con los trabajadores',
      descripcion:
        'Dar espacio para que todos los compañeros y su Vigía o Comité de Seguridad (COPASST) opinen, avisen peligros y participen en las mejoras del lugar de trabajo.',
    },
    {
      id: 4,
      titulo: 'Mejorar cada día la planta y el trabajo',
      descripcion:
        'Revisar con frecuencia qué podemos hacer mejor en máquinas, orden, aseo y capacitación para que cada año trabajemos más seguros y tranquilos.',
    },
  ],
  comunicacionRevision:
    'Esta política se comparte con todos los trabajadores, está visible en la planta para quien quiera leerla y se revisa al menos una vez cada año.',
  nombreFirmante: 'Gerente General',
  cargoFirmante: 'Gerente General – Frikaz S.A.S.',
  estado: 'Pendiente de aprobación',
  fechaUltimaActualizacion: new Date().toISOString().split('T')[0],
  fechaAprobacion: undefined,
  versionActual: 'Versión 1.0 (2026)',
  historialCambios: [
    {
      id: 'hist-01',
      fecha: new Date().toISOString().split('T')[0],
      hora: '08:00 AM',
      version: 'Versión 1.0',
      autor: 'Encargado de SST / Frikaz S.A.S.',
      motivoCambio: 'Redacción clara de los compromisos de seguridad de Frikaz S.A.S.',
      estado: 'Pendiente de aprobación',
      detallesModificacion:
        'Se organizaron los 4 compromisos principales en lenguaje claro y sencillo conforme al Decreto 1072 de 2015.',
    },
  ],
};

// ============================================================================
// GESTIÓN DE PERSISTENCIA EN LOCALSTORAGE
// ============================================================================
export function getStoredPoliticaSST(): PoliticaSSTData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLITICA);
    if (!raw) {
      localStorage.setItem(PLAIN_LANG_POLITICA_FLAG, '1');
      return POLITICA_SST_CANONICA;
    }
    const parsed: PoliticaSSTData = JSON.parse(raw);
    const alreadyMigrated = localStorage.getItem(PLAIN_LANG_POLITICA_FLAG) === '1';
    if (!alreadyMigrated) {
      localStorage.setItem(PLAIN_LANG_POLITICA_FLAG, '1');
      const esBorradorInicial =
        parsed.estado === 'Pendiente de aprobación' &&
        (!parsed.historialCambios || parsed.historialCambios.length <= 1);
      if (esBorradorInicial) {
        const refreshed = {
          ...POLITICA_SST_CANONICA,
          fechaUltimaActualizacion: parsed.fechaUltimaActualizacion || POLITICA_SST_CANONICA.fechaUltimaActualizacion,
        };
        localStorage.setItem(STORAGE_KEY_POLITICA, JSON.stringify(refreshed));
        return refreshed;
      }
    }
    return parsed;
  } catch (e) {
    console.error('Error cargando política SST de localStorage:', e);
    return POLITICA_SST_CANONICA;
  }
}

export function saveStoredPoliticaSST(data: PoliticaSSTData): void {
  try {
    localStorage.setItem(STORAGE_KEY_POLITICA, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando política SST en localStorage:', e);
  }
}

export function resetStoredPoliticaSST(): PoliticaSSTData {
  try {
    localStorage.removeItem(STORAGE_KEY_POLITICA);
    localStorage.setItem(PLAIN_LANG_POLITICA_FLAG, '1');
    return POLITICA_SST_CANONICA;
  } catch (e) {
    console.error('Error reiniciando política SST:', e);
    return POLITICA_SST_CANONICA;
  }
}

export function getStoredCargosSST(): CargoSST[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARGOS);
    if (!raw) {
      localStorage.setItem(PLAIN_LANG_CARGOS_FLAG, '1');
      return CARGOS_SST_CANONICOS;
    }
    const parsed: CargoSST[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return CARGOS_SST_CANONICOS;
    }
    const alreadyMigrated = localStorage.getItem(PLAIN_LANG_CARGOS_FLAG) === '1';
    if (!alreadyMigrated) {
      localStorage.setItem(PLAIN_LANG_CARGOS_FLAG, '1');
      const canonIds = new Set(CARGOS_SST_CANONICOS.map((c) => c.id));
      const extras = parsed.filter((c) => !canonIds.has(c.id));
      const merged = [...CARGOS_SST_CANONICOS, ...extras];
      localStorage.setItem(STORAGE_KEY_CARGOS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch (e) {
    console.error('Error cargando cargos SST de localStorage:', e);
    return CARGOS_SST_CANONICOS;
  }
}

export function saveStoredCargosSST(data: CargoSST[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARGOS, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando cargos SST en localStorage:', e);
  }
}

// ============================================================================
// EXPORTADOR WORD (.DOCX) - ASIGNACIÓN INDIVIDUAL DE RESPONSABILIDADES SST
// ============================================================================
export function construirDocumentoResponsabilidadesDocx(
  cargo: CargoSST,
  infoTrabajador?: {
    nombreTrabajador?: string;
    numeroIdentificacion?: string;
    fechaAsignacion?: string;
  },
  logoBytes?: Uint8Array | null
): Document {
  const fechaHoy =
    infoTrabajador?.fechaAsignacion ||
    new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const fechaCorta = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const nombreTrabajador =
    infoTrabajador?.nombreTrabajador?.trim() ||
    '______________________________________________________';

  const numeroIdentificacion =
    infoTrabajador?.numeroIdentificacion?.trim() ||
    '____________________________________';

  const tableBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const tableBorderLight = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  };

  const meta = obtenerMetadatosDocumentoCalidad(cargo.id, fechaCorta);

  // CAJA DE CONTROL DE CALIDAD ADAPTADA PARA ASIGNACIÓN DE RESPONSABILIDADES
  const tablaCajaCalidad = crearCajaCalidadDocxTable({
    codigo: meta.codigo,
    fecha: fechaCorta,
    version: meta.version,
    nombreEmpresa: 'Frikaz S.A.S',
    tituloDocumento: `ASIGNACIÓN DE RESPONSABILIDADES EN SST – ${cargo.nombre.toUpperCase()}`,
    tipoDocumento: 'responsabilidades',
    logoBytes,
  });

  const doc = new Document({
    creator: 'FRIKAZ S.A.S. - Sistema de Gestión SG-SST',
    title: `Asignación de Responsabilidades SST - ${cargo.nombre}`,
    description: `Documento oficial de asignación de responsabilidades y compromisos en Seguridad y Salud en el Trabajo para el cargo de ${cargo.nombre}. Formato formal en Times New Roman 12 pt.`,
    styles: {
      default: {
        document: {
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              after: 180,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        heading1: {
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            bold: true,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              before: 240,
              after: 180,
            },
            alignment: AlignmentType.CENTER,
          },
        },
        heading2: {
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            bold: true,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              before: 220,
              after: 140,
            },
            alignment: AlignmentType.LEFT,
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              after: 180,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_1_INCH, // 1 pulgada (2.54 cm)
              bottom: DOCX_MARGIN_1_INCH,
              left: DOCX_MARGIN_1_INCH,
              right: DOCX_MARGIN_1_INCH,
            },
          },
        },
        children: [
          // 1. CAJA DE CONTROL DE CALIDAD OFICIAL DE FRIKAZ S.A.S. (3 COLUMNAS)
          tablaCajaCalidad,

          // 2. SUBTÍTULO CON MARCO NORMATIVO COLOMBIANO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 140, after: 180 },
            children: [
              new TextRun({
                text: 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
              new TextRun({
                text: '\nDecreto Único Reglamentario 1072 de 2015 (Artículos 2.2.4.6.8 y 2.2.4.6.10) · Resolución 0312 de 2019',
                italics: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '444444',
              }),
            ],
          }),

          // TABLA DE INFORMACIÓN DEL TRABAJADOR
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'CARGO ASIGNADO:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: cargo.nombre.toUpperCase(),
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'NIVEL JERÁRQUICO:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: cargo.nivelNombre,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'ÁREA O PROCESO:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: cargo.areaProceso,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'NOMBRE DEL TRABAJADOR:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: nombreTrabajador,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'NÚMERO DE IDENTIFICACIÓN:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: numeroIdentificacion,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: 'FECHA DE ASIGNACIÓN:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 68, type: WidthType.PERCENTAGE },
                    borders: tableBorderLight,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: fechaHoy,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // SEPARADOR
          new Paragraph({ spacing: { line: DOCX_LINE_SPACING_1_5, after: 200 } }),

          // 1. OBJETIVO DE LA ASIGNACIÓN DE RESPONSABILIDADES
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 180, after: 120 },
            children: [
              new TextRun({
                text: '1. OBJETIVO DE LA ASIGNACIÓN DE RESPONSABILIDADES',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 220 },
            children: [
              new TextRun({
                text: `Establecer, comunicar y formalizar las responsabilidades y compromisos específicos en materia de Seguridad y Salud en el Trabajo para el cargo de `,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
              new TextRun({
                text: cargo.nombre,
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
              new TextRun({
                text: ` en FRIKAZ S.A.S., garantizando la prevención de accidentes laborales, enfermedades laborales y la mejora continua de las condiciones laborales en los procesos de producción y comercialización de snacks.`,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),

          // 2. DESCRIPCIÓN DE LAS RESPONSABILIDADES ESPECÍFICAS DEL CARGO
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 180, after: 120 },
            children: [
              new TextRun({
                text: '2. RESPONSABILIDADES ESPECÍFICAS DEL CARGO EN MATERIA DE SST',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),
          ...cargo.responsabilidades.map(
            (resp) =>
              new Paragraph({
                bullet: { level: 0 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: DOCX_LINE_SPACING_1_5, after: 100 },
                children: [
                  new TextRun({
                    text: resp,
                    size: DOCX_FONT_SIZE_12,
                    font: DOCX_FONT,
                  }),
                ],
              })
          ),

          // 3. COMPROMISOS DEL TRABAJADOR FRENTE AL SG-SST
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 200, after: 120 },
            children: [
              new TextRun({
                text: '3. COMPROMISOS DEL TRABAJADOR FRENTE AL SG-SST',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),
          ...cargo.compromisos.map(
            (comp) =>
              new Paragraph({
                bullet: { level: 0 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: DOCX_LINE_SPACING_1_5, after: 100 },
                children: [
                  new TextRun({
                    text: comp,
                    size: DOCX_FONT_SIZE_12,
                    font: DOCX_FONT,
                  }),
                ],
              })
          ),

          // 4. DECLARACIÓN DE CONOCIMIENTO Y ACEPTACIÓN
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 200, after: 120 },
            children: [
              new TextRun({
                text: '4. CONFIRMACIÓN Y COMPROMISO DEL TRABAJADOR',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 260 },
            children: [
              new TextRun({
                text: 'Yo, como trabajador(a) de FRIKAZ S.A.S., confirmo que recibí, leí y entendí las responsabilidades y compromisos de seguridad y salud de mi cargo. Me comprometo a trabajar siguiendo las normas de cuidado, usar siempre mis elementos de protección personal, avisar a tiempo si veo algo peligroso o roto, y participar en las charlas de seguridad de la empresa.',
                size: DOCX_FONT_SIZE_12,
                italics: true,
                font: DOCX_FONT,
              }),
            ],
          }),

          // 5. ESPACIO PARA FIRMAS
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 180, after: 180 },
            children: [
              new TextRun({
                text: '5. CONSTANCIA DE FIRMAS',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 600, after: 80 },
                        children: [
                          new TextRun({
                            text: '____________________________________________',
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: 'Firma del trabajador:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: `Nombre completo: ${nombreTrabajador}`,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: `Documento de identidad: ${numeroIdentificacion}`,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: `Fecha: ${fechaHoy}`,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, before: 600, after: 80 },
                        children: [
                          new TextRun({
                            text: '____________________________________________',
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: 'Firma del responsable de SST / Empleador:',
                            bold: true,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: 'Nombre: Coordinador / Vigía de SST',
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: 'Empresa: FRIKAZ S.A.S.',
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
                        children: [
                          new TextRun({
                            text: `Fecha: ${fechaHoy}`,
                            size: DOCX_FONT_SIZE_12,
                            font: DOCX_FONT,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

export async function exportarResponsabilidadesWord(
  cargo: CargoSST,
  infoTrabajador?: {
    nombreTrabajador?: string;
    numeroIdentificacion?: string;
    fechaAsignacion?: string;
  }
): Promise<void> {
  const logoBytes = await cargarLogoFrikazBytes();
  const doc = construirDocumentoResponsabilidadesDocx(cargo, infoTrabajador, logoBytes);
  const blob = await Packer.toBlob(doc);
  const cleanCargoName = cargo.nombre
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `Asignacion_Responsabilidades_SST_${cleanCargoName}_Frikaz.docx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function generarResponsabilidadesWordBase64(
  cargo: CargoSST,
  infoTrabajador?: {
    nombreTrabajador?: string;
    numeroIdentificacion?: string;
    fechaAsignacion?: string;
  }
): Promise<{ base64: string; filename: string }> {
  const logoBytes = await cargarLogoFrikazBytes();
  const doc = construirDocumentoResponsabilidadesDocx(cargo, infoTrabajador, logoBytes);
  const base64 = await Packer.toBase64String(doc);
  const cleanCargoName = cargo.nombre
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `Asignacion_Responsabilidades_SST_${cleanCargoName}_Frikaz.docx`;
  return { base64, filename };
}

// ============================================================================
// EXPORTADOR WORD (.DOCX) - POLÍTICA DEL SG-SST (FRIKAZ S.A.S.)
// ============================================================================
export function construirDocumentoPoliticaDocx(
  politica: PoliticaSSTData,
  logoBytes?: Uint8Array | null
): Document {
  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fechaCorta = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const tablaCajaCalidad = crearCajaCalidadDocxTable({
    codigo: 'FRK-SST-POL-01',
    fecha: fechaCorta,
    version: politica.versionActual.replace(/[^\d]/g, '') || '02',
    nombreEmpresa: 'Frikaz S.A.S',
    tituloDocumento: 'POLÍTICA INTEGRAL DE SEGURIDAD Y SALUD EN EL TRABAJO',
    tipoDocumento: 'politica',
    logoBytes,
  });

  return new Document({
    creator: 'FRIKAZ S.A.S. - Sistema de Gestión SG-SST',
    title: 'Política de Seguridad y Salud en el Trabajo - Frikaz S.A.S.',
    description: 'Documento oficial de la Política de SST conforme al Decreto 1072 de 2015. Formato formal en Times New Roman 12 pt con Caja de Calidad.',
    styles: {
      default: {
        document: {
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              after: 180,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        heading1: {
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            bold: true,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              before: 240,
              after: 180,
            },
            alignment: AlignmentType.CENTER,
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: DOCX_FONT,
            size: DOCX_FONT_SIZE_12,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: DOCX_LINE_SPACING_1_5,
              after: 180,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_1_INCH,
              bottom: DOCX_MARGIN_1_INCH,
              left: DOCX_MARGIN_1_INCH,
              right: DOCX_MARGIN_1_INCH,
            },
          },
        },
        children: [
          // CAJA DE CONTROL DE CALIDAD OFICIAL DE FRIKAZ S.A.S. (3 COLUMNAS)
          tablaCajaCalidad,

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 140, after: 180 },
            children: [
              new TextRun({
                text: 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)',
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
              new TextRun({
                text: `\nNIT: ${politica.nit} · Planta Bosa Piamonte, Bogotá D.C. · Decreto 1072 de 2015 (Art. 2.2.4.6.5)`,
                italics: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '444444',
              }),
            ],
          }),

          // ESTADO Y VERSIÓN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 200 },
            children: [
              new TextRun({
                text: `Estado del Documento: ${politica.estado.toUpperCase()} · Versión Vigente: ${politica.versionActual}`,
                italics: true,
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
                color: '000000',
              }),
            ],
          }),

          // TEXTO INTRODUCTORIO
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 200 },
            children: [
              new TextRun({
                text: politica.declaracionIntroductoria,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),

          // COMPROMISOS ENUMERADOS
          ...politica.compromisos.flatMap((comp) => [
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: DOCX_LINE_SPACING_1_5, before: 100, after: 80 },
              children: [
                new TextRun({
                  text: `${comp.id}. `,
                  bold: true,
                  size: DOCX_FONT_SIZE_12,
                  font: DOCX_FONT,
                }),
                new TextRun({
                  text: comp.descripcion,
                  size: DOCX_FONT_SIZE_12,
                  font: DOCX_FONT,
                }),
              ],
            }),
          ]),

          // CIERRE DE COMUNICACIÓN Y REVISIÓN ANUAL
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 200, after: 360 },
            children: [
              new TextRun({
                text: politica.comunicacionRevision,
                size: DOCX_FONT_SIZE_12,
                italics: true,
                font: DOCX_FONT,
              }),
            ],
          }),

          // ESPACIO PARA FIRMA DEL GERENTE GENERAL
          new Paragraph({
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 400, after: 80 },
            children: [
              new TextRun({
                text: 'Firma: __________________________________________________',
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
            children: [
              new TextRun({
                text: `${politica.cargoFirmante}`,
                bold: true,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
            children: [
              new TextRun({
                text: `Empresa: ${politica.empresa} (NIT ${politica.nit})`,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 40 },
            children: [
              new TextRun({
                text: `Fecha de emisión y vigencia: ${fechaHoy}`,
                size: DOCX_FONT_SIZE_12,
                font: DOCX_FONT,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

export async function exportarPoliticaWord(politica: PoliticaSSTData): Promise<void> {
  const logoBytes = await cargarLogoFrikazBytes();
  const doc = construirDocumentoPoliticaDocx(politica, logoBytes);
  const blob = await Packer.toBlob(doc);
  const filename = `Politica_SST_Frikaz_SAS_${new Date().toISOString().split('T')[0]}.docx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function generarPoliticaWordBase64(
  politica: PoliticaSSTData
): Promise<{ base64: string; filename: string }> {
  const logoBytes = await cargarLogoFrikazBytes();
  const doc = construirDocumentoPoliticaDocx(politica, logoBytes);
  const base64 = await Packer.toBase64String(doc);
  const filename = `Politica_SST_Frikaz_SAS_${new Date().toISOString().split('T')[0]}.docx`;
  return { base64, filename };
}

