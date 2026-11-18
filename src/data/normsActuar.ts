import { NormaPhvaItem } from '../types/phvaEvidence';

export const NORMS_ACTUAR: NormaPhvaItem[] = [
  // MÓDULO 1: ACCIDENTES Y ENFERMEDADES
  {
    id: 'actu-01',
    fase: 'ACTUAR',
    subtema: 'ACCIDENTES Y ENFERMEDADES',
    tituloSituacion: '1. Qué hacer y cómo reportar un accidente de trabajo (FURAT / FUREL)',
    normaOficial: 'Resolución 0156 de 2005 (modificada por Resolución 2851 de 2015)',
    entidadEmisora: 'Ministerio de la Protección Social',
    articulos: 'Artículo 3 (Modificado por Res. 2851 de 2015)',
    area: 'SST',
    descripcion:
      'Exige a la empresa reportar todo accidente de trabajo o enfermedad laboral usando los formatos oficiales (FURAT para accidentes y FUREL para enfermedades) dentro de los 2 días hábiles siguientes a la EPS y a la ARL, entregando una copia al trabajador.',
    importancia:
      'Asegura atención médica inmediata sin costos para el trabajador, protege sus incapacidades y derechos, y evita sanciones por reportes tardíos.',
    aplicabilidad:
      'Si alguien sufre una quemadura en la freidora, un resbalón, un corte en rebanadora o una lesión al cargar bultos, primero se prestan los primeros auxilios y se traslada a urgencias de la ARL; luego Gestión Humana y el líder SST envían el reporte FURAT en máximo 2 días hábiles y entregan copia al trabajador.',
    vigente: true,
    textoVigencia: 'Vigente (Artículo 3 modificado por Resolución 2851 de 2015)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las áreas de Frikaz S.A.S. (planta, bodega, entregas y oficina).',
    evidenciaCumplimiento:
      'Formato FURAT radicado dentro de los 2 días hábiles, constancia de entrega de copia al trabajador y seguimiento médico del caso.',
    estado: 'CUMPLE',
    responsable: 'Gestión Humana / Responsable SG-SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Ruta de atención de urgencias y reporte en línea con la ARL lista y divulgada.',
  },
  {
    id: 'actu-02',
    fase: 'ACTUAR',
    subtema: 'ACCIDENTES Y ENFERMEDADES',
    tituloSituacion: '2. Investigar por qué pasó un incidente o accidente para que no se repita',
    normaOficial: 'Resolución 1401 de 2007',
    entidadEmisora: 'Ministerio de la Protección Social',
    articulos: 'Artículo 6 / Metodología de Investigación',
    area: 'SST',
    descripcion:
      'Ordena investigar cada incidente (casi accidente) o accidente de trabajo dentro de los 15 días siguientes usando un método claro (como preguntar "¿por qué?" 5 veces hasta hallar la raíz) para arreglar el problema de fondo, nunca para culpar al trabajador.',
    importancia:
      'Permite descubrir qué falló en la máquina, el piso, el entrenamiento o el elemento de protección, y corregirlo para cuidar a todo el equipo.',
    aplicabilidad:
      'Si ocurre un resbalón, corte o quemadura, el jefe de planta, el Vigía SST y el encargado de SST se reúnen, escuchan al trabajador, buscan la causa real (ej. piso con grasa o guarda floja) y aplican la mejora de inmediato.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las empresas y trabajadores.',
    evidenciaCumplimiento:
      'Informe de investigación con causas encontradas, acta firmada con el Vigía SST y plan de mejoras cumplido.',
    estado: 'CUMPLE',
    responsable: 'Equipo Investigador / Vigía de SST',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Formato sencillo de investigación con análisis de causas listo para usar.',
  },
  {
    id: 'actu-03',
    fase: 'ACTUAR',
    subtema: 'ACCIDENTES Y ENFERMEDADES',
    tituloSituacion: '3. Inclusión laboral y trato igualitario para personas con discapacidad',
    normaOficial: 'Ley 361 de 1997',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Artículo 4',
    area: 'SST',
    descripcion:
      'Protege los derechos de las personas con discapacidad, promoviendo su atención médica, rehabilitación e integración al trabajo en espacios accesibles y sin discriminación.',
    importancia:
      'Garantiza igualdad de oportunidades, respeto y adaptaciones reales en el puesto de trabajo cuando una persona lo necesite.',
    aplicabilidad:
      'Si en Frikaz S.A.S. trabaja o ingresa una persona con discapacidad (en oficina, empaque o control documental), adaptamos el puesto, accesos y herramientas a sus necesidades.',
    vigente: true,
    textoVigencia: 'Vigente en Colombia con reformas posteriores',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para proteger la inclusión y el trato digno.',
    evidenciaCumplimiento:
      'Registro de adaptaciones en puestos de trabajo cuando apliquen, revisión de accesibilidad y charlas de respeto e inclusión.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Gestión Humana',
    fechaVerificacion: '2026-09-15',
    observaciones: 'Revisión de accesibilidad en sede y compromiso de trato igualitario.',
  },
  {
    id: 'actu-04',
    fase: 'ACTUAR',
    subtema: 'ACCIDENTES Y ENFERMEDADES',
    tituloSituacion: '4. Regreso al trabajo y adaptación de tareas después de una incapacidad',
    normaOficial: 'Ley 776 de 2002',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Artículo 4: Reincorporación al Trabajo',
    area: 'SST',
    descripcion:
      'Protege al trabajador que vuelve de una incapacidad: la empresa debe recibirlo de regreso en su puesto habitual o ubicarlo en otra tarea que sí pueda hacer según sus recomendaciones médicas, sin bajarle su categoría.',
    importancia:
      'Cuida la recuperación y el empleo del trabajador para que no vuelva a lastimarse ni pierda su trabajo por haber estado incapacitado.',
    aplicabilidad:
      'Si un operario vuelve de incapacidad con restricción médica (por ejemplo no levantar peso o evitar calor temporalmente), Frikaz S.A.S. le asigna tareas livianas de empaque liviano, etiquetado o revisión mientras se recupera.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia cuando un trabajador termina una incapacidad médica.',
    evidenciaCumplimiento:
      'Acta de reintegro laboral con las tareas adaptadas y concepto de recomendaciones médicas de la EPS, ARL o médico laboral.',
    estado: 'CUMPLE',
    responsable: 'Gestión Humana / Médico Ocupacional',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Procedimiento claro para retorno seguro y adaptación de funciones.',
  },

  // MÓDULO 2: SANCIONES
  {
    id: 'actu-05',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '1. Cumplir siempre con la afiliación y pagos a la ARL',
    normaOficial: 'Ley 1562 de 2012',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Artículo 13: Afiliados al Sistema General de Riesgos Laborales',
    area: 'SST',
    descripcion:
      'Deja claro quiénes deben estar afiliados obligatoriamente a la ARL y advierte que no afiliar a tiempo o no pagar las cotizaciones genera multas fuertes del Ministerio del Trabajo.',
    importancia:
      'Mantiene protegido a todo el personal desde el primer minuto en planta y evita sanciones graves para la empresa.',
    aplicabilidad:
      'Verificamos cada mes que todos los operarios de freidoras, empaque, bodega, reparto, oficina y aprendices tengan su ARL activa y pagada en la planilla PILA.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todos los trabajadores y aprendices de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Planillas PILA pagadas cada mes, comprobantes de afiliación previos al ingreso y certificados de cobertura activa.',
    estado: 'CUMPLE',
    responsable: 'Gestión Humana / Contador',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Afiliaciones y pagos de seguridad social al día.',
  },
  {
    id: 'actu-06',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '2. Evitar multas y cierres por descuidos ambientales',
    normaOficial: 'Ley 1333 de 2009',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Régimen Sancionatorio Ambiental en Colombia',
    area: 'AMBIENTAL',
    descripcion:
      'Faculta a las autoridades ambientales (en Bogotá la Secretaría Distrital de Ambiente — SDA) a suspender máquinas, poner multas muy altas o cerrar temporalmente una planta si tira grasas al desagüe, bota aceite usado o contamina el aire.',
    importancia:
      'Protege el funcionamiento continuo de nuestra planta y nuestros empleos manteniendo todo en orden frente al cuidado del agua y el aire.',
    aplicabilidad:
      'Mantenemos limpia la trampa de grasas, guardamos los recibos de entrega de aceite usado (AVU), separamos las basuras en los 3 colores y limpiamos filtros de chimeneas.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en Bogotá y toda Colombia en toda la sede de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Planillas semanales de trampa de grasas, certificados de aceite usado (AVU), recibos de residuos peligrosos (RESPEL) y revisiones ambientales.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Líder Ambiental',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Planta al día sin quejas ni llamados de atención de la autoridad ambiental.',
  },
  {
    id: 'actu-07',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '3. Prevención estricta de accidentes graves o mortales',
    normaOficial: 'Código Penal Colombiano (Ley 599 de 2000)',
    entidadEmisora: 'Congreso de la República',
    articulos: 'Artículo 109 (Modificado por Art. 14 de Ley 890 de 2004)',
    area: 'SST',
    descripcion:
      'Advierte que cuando ocurre una muerte por descuido grave, imprudencia o falta de medidas de seguridad básicas (culpa), existen responsabilidades penales ante la justicia.',
    importancia:
      'Nos recuerda por qué nunca debemos saltarnos las reglas de seguridad ni trabajar en máquinas sin protecciones: cada regla salva vidas.',
    aplicabilidad:
      'Exigimos guardas fijas en cortadoras, botones de pare de emergencia en freidoras, revisión eléctrica (RETIE), candado al limpiar máquinas (LOTO) y uso obligatorio de EPP térmico.',
    vigente: true,
    textoVigencia: 'Vigente (Modificado por Ley 890 de 2004)',
    jurisdiccionAlcance:
      'Aplica en todo el territorio de Colombia.',
    evidenciaCumplimiento:
      'Capacitaciones firmadas, inspecciones de máquinas y tableros eléctricos, entrega de EPP, permisos de trabajo seguro y guías claras de operación.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Responsable SG-SST',
    fechaVerificacion: '2026-09-30',
    observaciones: 'Reglas claras de bloqueo y operación segura en fritura y corte.',
  },
  {
    id: 'actu-08',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '4. Prevención de lesiones graves en el trabajo',
    normaOficial: 'Código Penal Colombiano (Ley 599 de 2000)',
    entidadEmisora: 'Congreso de la República',
    articulos: 'Artículo 111 y siguientes',
    area: 'SST',
    descripcion:
      'Señala que causar un daño físico o lesión en la salud de otra persona por descuido o falta de prevención también trae responsabilidades legales.',
    importancia:
      'Refuerza el compromiso diario de proteger la integridad de cada compañero evitando heridas evitables.',
    aplicabilidad:
      'Prevenimos quemaduras por salpicaduras de aceite, cortes con cuchillas de rebanadoras, caídas por pisos con grasa y dolores de espalda cargando bultos pesados sin ayuda o carretilla.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Plan de prevención del SG-SST, charlas de manejo seguro de máquinas, tapetes antideslizantes, delantales térmicos y carretillas para bultos.',
    estado: 'CUMPLE',
    responsable: 'Líder SST / Supervisor de Producción',
    fechaVerificacion: '2026-09-30',
    observaciones: 'Tapetes antideslizantes, carretillas y delantales térmicos en uso en planta.',
  },
  {
    id: 'actu-09',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '5. Cuidado honesto y ordenado de bienes y recursos de la empresa',
    normaOficial: 'Código Penal Colombiano (Ley 599 de 2000)',
    entidadEmisora: 'Congreso de la República',
    articulos: 'Artículo 259',
    area: 'SST',
    descripcion:
      'Prohíbe el mal uso o desperdicio injustificado de bienes confiados para administración, sirviendo en Frikaz S.A.S. como recordatorio del cuidado ordenado de materias primas, equipos y presupuestos de seguridad.',
    importancia:
      'Asegura que el dinero aprobado para guantes, botas, mantenimiento y capacitaciones se use de forma transparente para proteger al equipo.',
    aplicabilidad:
      'Llevamos inventario ordenado de papa, aceite, empaques, EPP y facturas de gastos del presupuesto de Seguridad y Salud.',
    vigente: true,
    textoVigencia: 'Vigente (Modificado por Ley 890 de 2004)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para el control administrativo y de recursos.',
    evidenciaCumplimiento:
      'Inventarios de bodega, planillas de entrega de EPP y facturas de compras de seguridad y mantenimiento.',
    estado: 'CUMPLE',
    responsable: 'Administración / Contabilidad',
    fechaVerificacion: '2026-09-30',
    observaciones: 'Presupuesto de SST respaldado con facturas y entregas firmadas.',
  },
  {
    id: 'actu-10',
    fase: 'ACTUAR',
    subtema: 'SANCIONES',
    tituloSituacion: '6. Cuidado ambiental grave: cero contaminación de agua o suelo',
    normaOficial: 'Ley 2111 de 2021',
    entidadEmisora: 'Congreso de la República de Colombia',
    articulos: 'Sustituye Título XI del Código Penal (Arts. 328 a 339)',
    area: 'AMBIENTAL',
    descripcion:
      'Establece delitos ambientales graves contra quien contamine ríos, alcantarillas o suelos con desechos peligrosos o aceites contaminantes sin control.',
    importancia:
      'Nos recuerda por qué está totalmente prohibido botar aceite usado o químicos fuertes por los desagües.',
    aplicabilidad:
      'Guardamos todo el aceite usado (AVU) en canecas selladas y los químicos peligrosos (RESPEL) aparte, entregándolos siempre a empresas autorizadas con recibo.',
    vigente: true,
    textoVigencia: 'Vigente (Ley 2111 de 2021)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las personas y empresas.',
    evidenciaCumplimiento:
      'Recibos de entrega de aceite usado y residuos peligrosos a gestores con licencia ambiental, y planillas de limpieza de la trampa de grasas.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Coordinador Ambiental',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Todo el aceite usado se entrega con recibo para hacer biodiésel.',
  },

  // MÓDULO 3: GESTIÓN DE NO CONFORMIDADES
  {
    id: 'actu-11',
    fase: 'ACTUAR',
    subtema: 'GESTIÓN DE NO CONFORMIDADES',
    tituloSituacion: '1. Cómo arreglamos las fallas encontradas (Acciones Preventivas y Correctivas)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.33',
    area: 'SST',
    descripcion:
      'Ordena que cuando un recorrido, auditoría o trabajador reporta una falla ("no conformidad"), debemos buscar por qué ocurrió, ponerle solución, asignar encargado y fecha, y comprobar después que sí quedó resuelta.',
    importancia:
      'Convierte cualquier problema encontrado en una mejora real y permanente para la seguridad del equipo.',
    aplicabilidad:
      'Por ejemplo, si notamos que el piso junto a la freidora se pone resbaloso con aceite, revisamos por qué gotea, ponemos tapete antideslizante y recogemos el derrame, asignando responsable y verificando días después que siga seco.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todos los puestos de trabajo del SG-SST.',
    evidenciaCumplimiento:
      'Registro sencillo de fallas y mejoras con su causa, acción tomada, responsable, fecha y comprobación de que funcionó.',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST / Vigía de SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Todas las mejoras encontradas en auditoría tienen seguimiento y cierre.',
  },
  {
    id: 'actu-12',
    fase: 'ACTUAR',
    subtema: 'GESTIÓN DE NO CONFORMIDADES',
    tituloSituacion: '2. Mejorar cada día nuestro cuidado en el trabajo (Mejora Continua)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.34',
    area: 'SST',
    descripcion:
      'Pide a la empresa escuchar ideas de los trabajadores, revisar metas, inspecciones y cambios en leyes para ir mejorando continuamente las condiciones de trabajo.',
    importancia:
      'Hace que la planta sea cada año un lugar más cómodo, limpio y seguro gracias al aporte de todos.',
    aplicabilidad:
      'Tomamos las sugerencias de operarios y conductores para ajustar herramientas, mejorar guardas de máquinas y actualizar capacitaciones prácticas.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia como cierre del ciclo de mejora del SG-SST.',
    evidenciaCumplimiento:
      'Actas de sugerencias de trabajadores atendidas, mejoras realizadas en planta y revisión anual de gerencia.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Líder SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Mejoras continuas implementadas con aportes del equipo de planta.',
  },
  {
    id: 'actu-13',
    fase: 'ACTUAR',
    subtema: 'GESTIÓN DE NO CONFORMIDADES',
    tituloSituacion: '3. Corregir a tiempo cualquier falla ambiental',
    normaOficial: 'ISO 14001:2015',
    entidadEmisora: 'Organización Internacional de Normalización (ISO)',
    articulos: 'Cláusula 10.2: No Conformidad y Acción Correctiva',
    area: 'AMBIENTAL',
    descripcion:
      'Guía sobre cómo reaccionar rápido ante una falla ambiental (por ejemplo basura mal separada o demora en limpiar la trampa de grasas), corregirla, buscar la causa y comprobar que no vuelva a pasar.',
    importancia:
      'Mantiene ordenada la planta, evita desperdicios de agua y previene problemas con la autoridad ambiental.',
    aplicabilidad:
      'Si vemos residuos mezclados en las canecas de colores o retraso en el mantenimiento de campanas, reforzamos la señalización, charlamos con el equipo y verificamos en los siguientes días.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Guía internacional aplicada al cuidado ambiental en Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Registro de fallas ambientales y mejoras realizadas, con verificación posterior.',
    estado: 'CUMPLE',
    responsable: 'Gestión Ambiental / Operaciones',
    fechaVerificacion: '2026-09-28',
    observaciones: 'Correcciones ambientales cerradas y verificadas en planta.',
  },

  // MÓDULO 4: REQUERIMIENTOS Y CIERRE
  {
    id: 'actu-14',
    fase: 'ACTUAR',
    subtema: 'REQUERIMIENTOS DE LA AUTORIDAD',
    tituloSituacion: '1. Tener todo listo ante visitas del Ministerio del Trabajo',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.16: Evaluación Inicial del SG-SST',
    area: 'SST',
    descripcion:
      'Pide hacer una revisión general inicial del estado de seguridad de la empresa (leyes, peligros, emergencias, capacitaciones y salud) para priorizar lo más urgente y tener los soportes listos ante cualquier visita de inspección.',
    importancia:
      'Permite atender con tranquilidad y orden cualquier revisión del Ministerio del Trabajo o de la ARL.',
    aplicabilidad:
      'Mantenemos en orden y en un mismo sistema las afiliaciones, exámenes médicos, planillas de EPP, inspecciones y plan anual de las áreas de fritura, empaque, bodega y reparto.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las áreas de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Evaluación inicial documentada, lista de normas con soportes, plan de emergencias y carpeta ordenada para inspecciones.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Responsable SG-SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Carpeta de soportes completa y lista para inspecciones.',
  },
  {
    id: 'actu-15',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '2. Cerrar el año cuidando el agua, el aire y el suelo',
    normaOficial: 'Decreto 1076 de 2015',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Artículo 1.1.1.1.1 (Funciones del MADS y SINA)',
    area: 'AMBIENTAL',
    descripcion:
      'Explica que el Ministerio de Ambiente dirige el cuidado de los recursos naturales en Colombia (Sistema Nacional Ambiental — SINA) y guía a las empresas para trabajar sin contaminar.',
    importancia:
      'Nos ayuda a cerrar cada año comprobando que cuidamos el agua, separamos residuos y cumplimos las metas ambientales de Bogotá.',
    aplicabilidad:
      'Al cerrar el año verificamos cero vertimientos de aceite al sifón, separación de basuras por color, ahorro de agua y energía, y capacitaciones realizadas al equipo.',
    vigente: true,
    textoVigencia: 'Vigente (Decreto 1076 de 2015)',
    jurisdiccionAlcance:
      'Aplica en toda Colombia como marco general de cuidado ambiental.',
    evidenciaCumplimiento:
      'Resumen anual de consumos de agua y energía, entregas certificadas de residuos y aceite usado, y lista ambiental actualizada.',
    estado: 'CUMPLE',
    responsable: 'Coordinador Ambiental',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Prácticas ambientales alineadas con las normas de Bogotá y del país.',
  },
  {
    id: 'actu-16',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '3. Actualizar cada año la lista de impactos ambientales',
    normaOficial: 'ISO 14001 de 2015',
    entidadEmisora: 'Organización Internacional de Normalización (ISO)',
    articulos: 'Identificación y Evaluación Continua de Aspectos Ambientales',
    area: 'AMBIENTAL',
    descripcion:
      'Pide revisar y actualizar cada año (o cuando cambien máquinas o recetas) qué impactos ambientales genera la empresa para ajustar los cuidados necesarios.',
    importancia:
      'Si traemos una freidora nueva o cambiamos un empaque, revisamos antes cuánta agua, gas o residuos va a generar.',
    aplicabilidad:
      'Al cierre del año revisamos cómo funcionó la trampa de grasas, cuánto aceite usado (AVU) salió y cómo bajar mermas orgánicas para fijar metas del nuevo año.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Guía internacional aplicada en la planta de Frikaz S.A.S. en Bosa, Bogotá.',
    evidenciaCumplimiento:
      'Lista de aspectos ambientales actualizada y firmada, balance anual ambiental y metas para el año siguiente.',
    estado: 'CUMPLE',
    responsable: 'Gestión Ambiental / Dirección',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Lista ambiental actualizada al cierre del ciclo.',
  },
  {
    id: 'actu-17',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '4. Actualizar cada año la lista de peligros del trabajo (GTC 45)',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.15',
    area: 'SST',
    descripcion:
      'Manda actualizar la lista de peligros y riesgos (Matriz GTC 45) mínimo una vez al año, y de inmediato si cambia una máquina, un puesto o si ocurre un accidente grave.',
    importancia:
      'Mantiene los cuidados adaptados a la realidad actual de nuestra planta y escucha lo que los operarios reportan en su puesto.',
    aplicabilidad:
      'Revisamos cada año los riesgos de calor y quemaduras, cuchillas, ruido, cargas de bultos, líquidos de limpieza, pisos y estrés en todas las áreas.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para todas las áreas de la sede Bosa.',
    evidenciaCumplimiento:
      'Matriz de peligros GTC 45 actualizada y firmada cada año, y registros de socialización con el equipo.',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST / Vigía de SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Lista de peligros revisada al día y explicada al equipo.',
  },
  {
    id: 'actu-18',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '5. Aprender de los incidentes para mejorar los procesos',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.32 (Investigación de Accidentes y Enfermedades)',
    area: 'SST',
    descripcion:
      'Indica que lo que descubrimos al investigar un incidente o accidente debe compartirse con los trabajadores y la gerencia, y usarse para mejorar los procedimientos y las protecciones.',
    importancia:
      'Transforma cada susto o casi accidente en una lección compartida que protege a todo el grupo.',
    aplicabilidad:
      'Si ocurre un incidente con aceite, pisos húmedos o rebanadoras, actualizamos la guía de trabajo seguro, mejoramos la guarda o señalización y hacemos una charla práctica de 10 minutos con todos.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para investigar y mejorar continuamente el SG-SST.',
    evidenciaCumplimiento:
      'Informes de investigación, actas de charlas de lecciones aprendidas y guías de operación actualizadas.',
    estado: 'CUMPLE',
    responsable: 'Responsable SG-SST / Supervisor de Planta',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Charlas de lecciones aprendidas compartidas con todo el personal.',
  },
  {
    id: 'actu-19',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '6. Cumplir los 7 Estándares Mínimos para empresas de hasta 10 trabajadores',
    normaOficial: 'Resolución 0312 de 2019',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 3: Estándares Mínimos para Empresas con 10 o Menos Trabajadores',
    area: 'SST',
    descripcion:
      'Fija las 7 reglas mínimas obligatorias para empresas como Frikaz S.A.S. (hasta 10 trabajadores en riesgo I, II o III): 1) Encargado del SG-SST, 2) Afiliación al día, 3) Capacitación anual, 4) Plan Anual de Trabajo, 5) Exámenes médicos, 6) Identificación de peligros y 7) Medidas de prevención y control.',
    importancia:
      'Resume de manera clara los 7 pilares esenciales que protegen a nuestros 10 trabajadores y mantienen en regla a la empresa.',
    aplicabilidad:
      'Frikaz S.A.S. (10 trabajadores, riesgo II/III en freidoras) verifica y cumple uno a uno estos 7 estándares mínimos durante todo el año.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Aplica en toda Colombia a empresas de 10 o menos trabajadores en riesgos I, II o III.',
    evidenciaCumplimiento:
      'Designación de encargado con curso 50h, planillas PILA, capacitaciones, Plan Anual firmado, exámenes médicos, matriz de peligros y autoevaluación anual ante el Ministerio y la ARL.',
    estado: 'CUMPLE',
    responsable: 'Gerente General / Responsable SG-SST',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Los 7 estándares mínimos cumplidos y reportados al día.',
  },
  {
    id: 'actu-20',
    fase: 'ACTUAR',
    subtema: 'CIERRE DE CICLO',
    tituloSituacion: '7. Buenas prácticas técnicas en seguridad, ambiente y reciclaje',
    normaOficial: 'ISO 45001 / ISO 14001 / GTC 24',
    entidadEmisora: 'ICONTEC / ISO',
    articulos: 'Sistemas de Gestión de SST, Ambiental y Guía Técnica de Residuos',
    area: 'INTEGRAL',
    descripcion:
      'Guías técnicas reconocidas que complementan la ley colombiana:\n• ISO 45001: buenas prácticas para evitar accidentes laborales.\n• ISO 14001: buenas prácticas para cuidar el ambiente.\n• GTC 24: guía técnica para separar bien los residuos en la fuente.',
    importancia:
      'Elevan la calidad, el orden y el cuidado en toda nuestra planta de snacks fritos.',
    aplicabilidad:
      'Aplicamos estas buenas prácticas en la seguridad de freidoras, ahorro de agua y energía, y canecas bien marcadas en toda la sede de Bosa.',
    vigente: true,
    textoVigencia: 'Vigente',
    jurisdiccionAlcance:
      'Guías nacionales e internacionales adoptadas en Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Manual sencillo de cuidado integrado, puntos ecológicos señalizados y registros de separación de residuos.',
    estado: 'CUMPLE',
    responsable: 'Gerencia General / Líder SIG',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Buenas prácticas aplicadas en la rutina diaria de planta.',
  },
];
