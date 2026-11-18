import { NormaPhvaItem } from '../types/phvaEvidence';

export const NORMS_PLANEAR: NormaPhvaItem[] = [
  // MÓDULO 1: DIAGNÓSTICO
  {
    id: 'plan-01',
    fase: 'PLANEAR',
    subtema: 'DIAGNÓSTICO',
    tituloSituacion: '1. Revisar los peligros y riesgos en cada trabajo (SST)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo de Colombia',
    articulos: 'Artículo 2.2.4.6.15',
    area: 'SST',
    descripcion:
      'Pide a la empresa buscar, anotar y calificar qué peligros existen en todas las áreas, máquinas y tareas, con participación de los trabajadores, para saber cuáles son más urgentes de cuidar.',
    importancia:
      'Nos ayuda a evitar accidentes y enfermedades en el trabajo antes de que ocurran, dando prioridad a los peligros más serios para proteger a todo el equipo.',
    aplicabilidad:
      'Aplica en preparación, corte, fritura, empaque, bodega, aseo y entregas. En Frikaz S.A.S. revisamos riesgos como quemaduras con aceite caliente a 180 °C, atrapamientos en máquinas, resbalones, contacto con jabones o químicos de aseo y esfuerzos al cargar bultos.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia y cubre todas las áreas, tareas diarias o esporádicas y a todos los trabajadores de Frikaz S.A.S., sin importar su tipo de contrato.',
    evidenciaCumplimiento:
      'Lista de peligros y riesgos al día (matriz GTC 45, guía técnica para calificar riesgos), recorridos de seguridad, constancias de participación de los trabajadores, entrega de elementos de protección (EPP), capacitaciones y actas compartidas con el Vigía SST (compañero encargado de apoyar la seguridad).',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST / Vigía de SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Lista de peligros (GTC 45) revisada y al día en toda la planta.',
  },
  {
    id: 'plan-02',
    fase: 'PLANEAR',
    subtema: 'DIAGNÓSTICO',
    tituloSituacion: '1. Revisar cómo cuidamos el medio ambiente',
    normaOficial: 'Norma Técnica Colombiana ISO 14001:2026',
    entidadEmisora: 'Organización Internacional de Normalización (ISO) / ICONTEC',
    articulos: 'Edición ISO 14001:2026 (Publicada en abril de 2026)',
    area: 'AMBIENTAL',
    descripcion:
      'Es una guía internacional que enseña cómo revisar de forma ordenada qué cosas de nuestro trabajo afectan el agua, el aire, la energía o generan basura, para prevenir daños al medio ambiente. La versión 2026 actualiza la anterior de 2015.',
    importancia:
      'Nos ayuda a no contaminar, gastar menos agua y luz, manejar bien los residuos y evitar problemas ambientales en el barrio y la planta.',
    aplicabilidad:
      'La aplicamos al revisar cuánta agua y energía usamos al pelar, lavar y freír snacks, cuántas cáscaras y bolsas sobran, cómo guardamos el aceite usado de las freidoras y cómo evitamos malos olores o grasas en el desagüe.',
    vigente: true,
    textoVigencia: 'Vigente (Nueva edición ISO 14001:2026)',
    jurisdiccionAlcance:
      'Es una guía internacional de adopción voluntaria para mejorar el cuidado ambiental en producción, bodega, empaque, aseo y repartos, complementando las leyes obligatorias de Colombia.',
    evidenciaCumplimiento:
      'Lista de aspectos e impactos ambientales, recibos de consumo de agua y energía, comprobantes de entrega de basura y aceite usado, recorridos de revisión ambiental y plan de mejoras.',
    estado: 'CUMPLE',
    responsable: 'Líder de Gestión Ambiental / Gerencia',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Cuidado ambiental organizado siguiendo la guía ISO 14001:2026.',
  },
  {
    id: 'plan-03',
    fase: 'PLANEAR',
    subtema: 'DIAGNÓSTICO',
    tituloSituacion: '2. Compromiso y metas de Seguridad y Salud (Política SST)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo de Colombia',
    articulos: 'Artículos 2.2.4.6.5 al 2.2.4.6.9',
    area: 'SST',
    descripcion:
      'Manda que la gerencia firme y dé a conocer una promesa escrita (Política de SST), fije metas claras, asigne encargados y dé el dinero y tiempo necesarios para cuidar la seguridad y salud. También explica el apoyo que debe dar la ARL (aseguradora de riesgos laborales).',
    importancia:
      'Deja claro el compromiso real de Frikaz S.A.S. para evitar accidentes, escuchar a los trabajadores, cumplir la ley y mejorar cada año.',
    aplicabilidad:
      'La política firmada por el gerente se revisa cada año y se explica a los 10 trabajadores. Con base en ella definimos presupuesto, cronograma del año y controles para quemaduras, cuchillas, caídas y cargas.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las sedes, trabajadores y contratistas, y define las asesorías que debe brindar la ARL.',
    evidenciaCumplimiento:
      'Política de Seguridad y Salud firmada y con fecha, constancias de que todos los trabajadores la conocen, metas del año, presupuesto asignado, plan anual de trabajo, actas del Vigía SST y constancias de asesoría de la ARL.',
    estado: 'CUMPLE',
    responsable: 'Representante Legal / Gerente General',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Política firmada y explicada a los 10 trabajadores de Frikaz S.A.S.',
  },
  {
    id: 'plan-04',
    fase: 'PLANEAR',
    subtema: 'DIAGNÓSTICO',
    tituloSituacion: '2. Compromiso y metas de Cuidado Ambiental',
    normaOficial: 'Ley 99 de 1993',
    entidadEmisora: 'Congreso de la República / SINA',
    articulos: 'Sistema Nacional Ambiental (SINA)',
    area: 'AMBIENTAL',
    descripcion:
      'Organiza las entidades y reglas generales para proteger la naturaleza en Colombia (Sistema Nacional Ambiental — SINA) y sirve de base para que las empresas definan sus compromisos de cuidado ambiental.',
    importancia:
      'Guía nuestro trabajo diario para ahorrar agua y electricidad, separar bien la basura y cuidar el entorno alrededor de la planta.',
    aplicabilidad:
      'En Frikaz S.A.S. la aplicamos mediante nuestra Política Ambiental: ahorrar agua en el lavado de papa, apagar equipos cuando no se usan, separar los residuos por color y entregar el aceite usado sin botarlo al sifón.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en todo el país y orienta las normas ambientales que deben cumplir las empresas según sus tareas.',
    evidenciaCumplimiento:
      'Política ambiental firmada y visible en cartelera, metas ambientales del año, registros de consumo de agua y luz, y recibos de entrega de aceite usado y residuos a empresas autorizadas.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Gestión Ambiental',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Política ambiental publicada en las carteleras de la planta en Bosa.',
  },

  // MÓDULO 2: PELIGROS Y ASPECTOS AMBIENTALES
  {
    id: 'plan-05',
    fase: 'PLANEAR',
    subtema: 'PELIGROS Y ASPECTOS AMBIENTALES',
    tituloSituacion: '1. Buscar peligros antes de empezar a trabajar (SST)',
    normaOficial: 'Decreto 1443 de 2014',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 15 (Compilado en Art. 2.2.4.6.15 del Decreto 1072 de 2015)',
    area: 'SST',
    descripcion:
      'Regla que ordena identificar los peligros y medir los riesgos en todas las máquinas, áreas y puestos de trabajo para poner protecciones a tiempo. Hoy hace parte del Decreto 1072 de 2015.',
    importancia:
      'Permite descubrir a tiempo pisos resbalosos, cables sueltos o máquinas sin guarda para arreglarlos antes de que alguien salga lastimado.',
    aplicabilidad:
      'Revisamos uno a uno los riesgos al pelar, rebanar, freír en aceite caliente, empacar, cargar en bodega, limpiar con químicos y repartir pedidos.',
    vigente: true,
    textoVigencia: 'Vigente (Compilado en Decreto 1072 de 2015)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las tareas diarias o especiales de Frikaz S.A.S. y todo su personal.',
    evidenciaCumplimiento:
      'Lista de peligros actualizada mínimo una vez al año, formatos de recorridos de seguridad, charlas y capacitaciones, investigación de casi accidentes y actas del Vigía SST.',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST',
    fechaVerificacion: '2026-10-02',
    observaciones: 'Revisión GTC 45 aplicada en zona de freidoras y corte.',
  },
  {
    id: 'plan-06',
    fase: 'PLANEAR',
    subtema: 'PELIGROS Y ASPECTOS AMBIENTALES',
    tituloSituacion: '1. Identificar impactos en el medio ambiente',
    normaOficial: 'ISO 14001:2026',
    entidadEmisora: 'Organización Internacional de Normalización (ISO)',
    articulos: 'Requisitos del SGA / Aspectos e Impactos Ambientales',
    area: 'AMBIENTAL',
    descripcion:
      'Guía internacional para montar un Sistema de Gestión Ambiental (SGA), es decir, un orden claro para saber qué residuos, consumos de agua o humos genera la empresa y cómo reducirlos. La edición 2026 refuerza el cuidado del clima y los recursos.',
    importancia:
      'Nos ayuda a contaminar menos, gastar solo el agua y gas necesarios, y mantener en regla la planta.',
    aplicabilidad:
      'Anotamos qué impactos salen de freír, empacar, lavar, guardar en bodega y repartir: uso de agua, electricidad y gas, cáscaras orgánicas, bolsas plásticas, aceite usado y vapores.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Guía internacional voluntaria aplicada en producción, bodega, empaque, aseo, oficinas y repartos de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Lista de aspectos ambientales, metas con responsables y fechas, recibos de agua y energía, recibos de aceite usado y residuos, e informes de revisión.',
    estado: 'CUMPLE',
    responsable: 'Líder Ambiental / Gerencia',
    fechaVerificacion: '2026-10-02',
    observaciones: 'Aspectos ambientales revisados en toda la planta Bosa.',
  },
  {
    id: 'plan-07',
    fase: 'PLANEAR',
    subtema: 'PELIGROS Y ASPECTOS AMBIENTALES',
    tituloSituacion: '2. Uso responsable del agua, energía y recursos',
    normaOficial: 'Ley 99 de 1993',
    entidadEmisora: 'Congreso de la República / SINA',
    articulos: 'Conservación y Aprovechamiento Sostenible de Recursos Naturales',
    area: 'AMBIENTAL',
    descripcion:
      'Promueve cuidar el agua, el aire, el suelo y los recursos naturales para usarlos sin desperdiciarlos ni contaminarlos.',
    importancia:
      'Evita el desperdicio en el lavado y cocción de alimentos, protege los ríos y alcantarillas y reduce costos en la planta.',
    aplicabilidad:
      'Cerramos llaves mientras pelamos o limpiamos, cuidamos la temperatura de las freidoras para no gastar gas de más, aprovechamos materias primas y separamos bien las cáscaras y el aceite usado.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para las actividades de producción, aseo, bodega y manejo de residuos.',
    evidenciaCumplimiento:
      'Control mensual de recibos de agua, luz y gas, registros para evitar desperdicios, entregas de aceite usado y revisiones ambientales en planta.',
    estado: 'CUMPLE',
    responsable: 'Gestión Ambiental / Jefe de Planta',
    fechaVerificacion: '2026-09-28',
    observaciones: 'Seguimiento mensual de agua, luz y gas en cocción.',
  },

  // MÓDULO 3: ASIGNACIÓN
  {
    id: 'plan-08',
    fase: 'PLANEAR',
    subtema: 'ASIGNACIÓN',
    tituloSituacion: '1. Persona encargada de Seguridad y Salud (SG-SST)',
    normaOficial: 'Decreto 1443 de 2014',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Compilado en Decreto 1072 de 2015',
    area: 'SST',
    descripcion:
      'Ordena que la empresa nombre a una persona capacitada para coordinar el SG-SST (el plan completo de seguridad y salud en el trabajo), verificar que las reglas se cumplan y cuidar que no haya accidentes.',
    importancia:
      'Garantiza que siempre haya un encargado claro a quien acudir si notas un peligro, necesitas un elemento de protección o tienes dudas sobre seguridad.',
    aplicabilidad:
      'Frikaz S.A.S. designa por escrito al encargado de seguridad y salud (con su curso obligatorio de 50 horas y licencia cuando la ley lo pida) para coordinar capacitaciones, inspecciones y plan anual.',
    vigente: true,
    textoVigencia: 'Vigente (Compilado en Decreto 1072 de 2015)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las empresas y cubre todas las áreas de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Carta de nombramiento firmada, certificado del curso virtual de 50 horas (o actualización de 20 horas), plan anual de trabajo, lista de peligros y actas de capacitaciones.',
    estado: 'CUMPLE',
    responsable: 'Gerente General / Responsable Asignado',
    fechaVerificacion: '2026-09-10',
    observaciones: 'Encargado del SG-SST nombrado y con curso de 50 horas vigente.',
  },

  // MÓDULO 4: MATRIZ LEGAL Y PLAN ANUAL DE TRABAJO
  {
    id: 'plan-09',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '1. Manejo seguro de residuos peligrosos (RESPEL)',
    normaOficial: 'Decreto 4741 de 2005',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Compilado en Decreto 1076 de 2015 (Título 6, Capítulo 1)',
    area: 'AMBIENTAL',
    descripcion:
      'Regla sobre cómo guardar y entregar de forma segura los residuos peligrosos —RESPEL— (por ejemplo envases con químicos fuertes, trapos con aceite lubricante de máquinas o bombillos dañados) para que no contaminen el suelo ni el agua. Hoy está en el Decreto 1076 de 2015.',
    importancia:
      'Protege la salud de quien limpia o manipula desechos y evita que químicos peligrosos lleguen a la basura común o al desagüe.',
    aplicabilidad:
      'Separamos envases de desengrasantes fuertes, estopas con grasa mecánica y tubos fluorescentes en un punto marcado con bandeja antiderrames, y los entregamos solo a una empresa autorizada.',
    vigente: true,
    textoVigencia: 'Vigente (Compilado en Decreto 1076 de 2015)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia a quienes produzcan o manejen residuos con riesgo químico, inflamable o tóxico.',
    evidenciaCumplimiento:
      'Lista de residuos peligrosos, etiquetas claras en envases, lugar de acopio con bandeja antiderrames, recibos de entrega de empresa autorizada y constancias de capacitación.',
    estado: 'CUMPLE',
    responsable: 'Coordinador Ambiental / Operaciones',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Punto de acopio con bandeja antiderrames y entrega a gestor con licencia.',
  },
  {
    id: 'plan-10',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '2. Control del ruido hacia el vecindario y entorno',
    normaOficial: 'Resolución 0627 de 2006',
    entidadEmisora: 'Ministerio de Ambiente, Vivienda y Desarrollo Territorial',
    articulos: 'Normas Nacionales de Emisión de Ruido y Ruido Ambiental',
    area: 'AMBIENTAL',
    descripcion:
      'Fija los límites máximos de ruido permitidos en Colombia para no molestar a los vecinos ni afectar la tranquilidad del barrio según el horario (día o noche).',
    importancia:
      'Cuida los oídos de quienes trabajan cerca de máquinas ruidosas y mantiene una buena convivencia con los vecinos de Bosa.',
    aplicabilidad:
      'Revisamos el sonido de extractores, peladoras, rebanadoras y empacadoras, les hacemos mantenimiento a tiempo y ajustamos piezas sueltas para que no hagan ruido excesivo.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia bajo vigilancia de la Secretaría de Ambiente en Bogotá.',
    evidenciaCumplimiento:
      'Lista de máquinas que generan ruido, registro de mantenimiento preventivo, mediciones cuando apliquen y registro de atención a inquietudes.',
    estado: 'CUMPLE',
    responsable: 'Mantenimiento / Gestión Ambiental',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Mantenimiento y ajuste de cortadoras y extractores en planta.',
  },
  {
    id: 'plan-11',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '2. Ley contra el Ruido y cuidado auditivo',
    normaOficial: 'Ley 2450 de 2025',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Ley contra el Ruido / Calidad Acústica en Colombia',
    area: 'AMBIENTAL',
    descripcion:
      'Ley reciente que refuerza las reglas en todo el país para medir, controlar y reducir el ruido y las vibraciones que dañan la salud o molestan a la comunidad.',
    importancia:
      'Protege la audición y descanso tanto de los trabajadores como de las familias que viven cerca de nuestra planta.',
    aplicabilidad:
      'Identificamos las máquinas más ruidosas, entregamos protectores de oídos donde el ruido supera 85 dBA (nivel fuerte) y mantenemos lubricados y ajustados los motores y extractores.',
    vigente: true,
    textoVigencia: 'Vigente (Ley 2450 de 2025)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia con control de autoridades ambientales y de policía.',
    evidenciaCumplimiento:
      'Registro de mantenimiento de equipos, mediciones de sonido, entrega de protectores auditivos y actas de mejoras realizadas.',
    estado: 'CUMPLE',
    responsable: 'Gestión Ambiental / Seguridad Física',
    fechaVerificacion: '2026-10-05',
    observaciones: 'Revisión de ruido en turnos de fritura y empaque.',
  },
  {
    id: 'plan-12',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '3. Lista de leyes obligatorias (Matriz Legal SST)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Definición y Actualización de Matriz Legal SG-SST',
    area: 'SST',
    descripcion:
      'Ordena reunir en una sola lista (Matriz Legal) todas las leyes y reglas de seguridad y salud que aplican al trabajo de la empresa, y mantenerla al día cada vez que salga una norma nueva.',
    importancia:
      'Nos permite saber con claridad qué reglas debemos cumplir para cuidar al equipo y evitar multas o descuidos.',
    aplicabilidad:
      'Reunimos aquí las normas sobre aceite caliente, máquinas de corte, cargas, afiliaciones, emergencias y ambiente, con un encargado y soporte para cada una.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para empleadores públicos y privados cubiertos por el SG-SST.',
    evidenciaCumplimiento:
      'Lista de normas actualizada en la herramienta con encargado, estado de cumplimiento y soportes guardados.',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Lista legal organizada y revisada.',
  },
  {
    id: 'plan-13',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '4. Plan de actividades del año en Seguridad y Salud',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículos 2.2.4.6.8, num. 7; 2.2.4.6.12, num. 5; y 2.2.4.6.31',
    area: 'SST',
    descripcion:
      'Exige tener un calendario anual (Plan Anual de Trabajo) con fechas, metas, presupuesto y responsables para todas las capacitaciones, inspecciones y arreglos de seguridad, firmado por el gerente y el encargado de SST.',
    importancia:
      'Ayuda a que la seguridad no se quede solo en palabras: cada actividad tiene fecha, responsable y dinero asignado.',
    aplicabilidad:
      'Programamos mes a mes capacitaciones en manejo seguro de freidoras y cuchillas, revisión de extintores, exámenes médicos, pausas activas y mantenimiento de máquinas.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las empresas sujetas al SG-SST.',
    evidenciaCumplimiento:
      'Plan Anual de Trabajo firmado, listas de asistencia a charlas, informes de recorridos de seguridad, facturas de mantenimiento y revisión anual con gerencia.',
    estado: 'CUMPLE',
    responsable: 'Gerente General / Responsable SG-SST',
    fechaVerificacion: '2026-09-30',
    observaciones: 'Plan anual 2026 firmado y en marcha.',
  },
  {
    id: 'plan-14',
    fase: 'PLANEAR',
    subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
    tituloSituacion: '4. Plan de actividades del año para Cuidado Ambiental',
    normaOficial: 'Decreto 1076 de 2015',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Reglamentación del Sector Ambiental',
    area: 'AMBIENTAL',
    descripcion:
      'Reúne las normas ambientales de Colombia sobre ahorro de agua, manejo de residuos, aceites usados y desagües para que la empresa organice sus actividades de cuidado durante el año.',
    importancia:
      'Permite programar a tiempo la limpieza de la trampa de grasas, la entrega de aceite usado y las charlas de reciclaje.',
    aplicabilidad:
      'Organizamos en nuestro cronograma anual el seguimiento mensual de agua y energía, la limpieza semanal de la trampa de grasas y la entrega certificada de aceite usado (ACU).',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia a las empresas según las actividades ambientales que realicen.',
    evidenciaCumplimiento:
      'Cronograma anual ambiental, registros mensuales de consumo de agua y luz, planillas de trampa de grasas y recibos de gestor autorizado de aceite usado.',
    estado: 'CUMPLE',
    responsable: 'Líder Ambiental / Gerencia',
    fechaVerificacion: '2026-09-30',
    observaciones: 'Actividades ambientales programadas dentro del Plan Anual.',
  },
];
