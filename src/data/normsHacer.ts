import { NormaPhvaItem } from '../types/phvaEvidence';

export const NORMS_HACER: NormaPhvaItem[] = [
  // MÓDULO 1: INGRESO
  {
    id: 'hacer-01',
    fase: 'HACER',
    subtema: 'INGRESO',
    tituloSituacion: '1.1 Afiliación a salud, pensión y riesgos antes de empezar',
    normaOficial: 'Decreto 1772 de 1994 y Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio de Trabajo y Seguridad Social',
    articulos: 'Decreto 1772/1994 y Decreto 1072/2015 (Libro 2, Parte 2, Título 4)',
    area: 'SST',
    descripcion:
      'Exige que todo trabajador quede afiliado a EPS (salud), AFP (pensión) y ARL (aseguradora que cubre accidentes de trabajo) antes de su primer día en planta.',
    importancia:
      'Si alguien sufre una caída, corte o quemadura trabajando, la ARL cubre de inmediato la atención médica, terapias e incapacidades, sin dejar desprotegido al trabajador ni a su familia.',
    aplicabilidad:
      'En Frikaz S.A.S. afiliamos a cada operario de freidoras, pelado o empaque en Riesgo III (por calor >170 °C y cuchillas) y al personal de oficina en Riesgo I antes de iniciar labores.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance:
      'Aplica en toda Colombia para los 10 trabajadores con contrato fijo o indefinido.',
    evidenciaCumplimiento:
      'Contrato firmado, comprobante de afiliación a la ARL con fecha anterior al ingreso y planilla mensual PILA pagada al día.',
    estado: 'Por hacer',
    responsable: 'Gerente',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Todo el equipo afiliado al día (Riesgo III en planta y Riesgo I en oficina).',
  },
  {
    id: 'hacer-02',
    fase: 'HACER',
    subtema: 'INGRESO',
    tituloSituacion: '1.2 Exámenes médicos de ingreso y lista de chequeos por cargo',
    normaOficial: 'Resolución 1843 del 2025',
    entidadEmisora: 'Ministerio del Trabajo / Ministerio de Salud',
    articulos: 'Evaluaciones Médicas de Ingreso y Profesiograma',
    area: 'SST',
    descripcion:
      'Pide hacer exámenes médicos al entrar, cada cierto tiempo y al retirarse, guiados por un Profesiograma (una tabla que indica qué exámenes necesita cada puesto según sus riesgos).',
    importancia:
      'Cuida la salud de cada persona verificando que pueda hacer su tarea sin lastimarse, y nos ayuda a adaptar funciones si el médico da alguna recomendación.',
    aplicabilidad:
      'Antes de trabajar en planta enviamos a la IPS (centro médico laboral) la lista de tareas del puesto para revisar espalda y articulaciones (por bultos de papa), exámenes para manipular alimentos (frotis de manos/garganta), piel y vista.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia para todo el equipo de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Tabla de exámenes por cargo (Profesiograma) firmada y certificados médicos de aptitud guardados bajo reserva médica.',
    estado: 'Por hacer',
    responsable: 'Gerente',
    fechaVerificacion: '2026-09-18',
    observaciones: 'Chequeos enfocados en manipulación de alimentos y cuidado de espalda y manos.',
  },
  {
    id: 'hacer-03',
    fase: 'HACER',
    subtema: 'INGRESO',
    tituloSituacion: '1.3 Inducción y entrenamiento seguro antes de operar máquinas',
    normaOficial: 'Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Artículo 2.2.4.6.11',
    area: 'SST',
    descripcion:
      'Ordena explicar y enseñar al trabajador nuevo los peligros de su puesto y cómo protegerse antes de empezar a trabajar solo.',
    importancia:
      'Evita accidentes en los primeros días por no saber dónde está el botón de pare de emergencia, cómo abrir una freidora sin quemarse o qué elementos usar.',
    aplicabilidad:
      'Enseñamos en planta cómo usar el botón de parada de emergencia en rebanadoras y selladoras, cómo trabajar seguro con aceite caliente a 180 °C, cómo caminar en pisos húmedos y por dónde evacuar.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia y en la planta de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Registro de inducción firmado por el trabajador, temas vistos y evaluación corta de comprensión.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de frito',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Inducción práctica en planta antes de operar cualquier equipo.',
  },
  {
    id: 'hacer-04',
    fase: 'HACER',
    subtema: 'INGRESO',
    tituloSituacion: '1.1 Capacitación en higiene de alimentos y cuidado ambiental',
    normaOficial: 'Resolución 2674 de 2013',
    entidadEmisora: 'Ministerio de Salud y Protección Social',
    articulos: 'Artículos 12 y 13 (Buenas Prácticas de Manufactura)',
    area: 'AMBIENTAL',
    descripcion:
      'Exige que quienes preparan o empacan alimentos reciban capacitación cada año en Buenas Prácticas de Manufactura —BPM— (reglas de higiene y limpieza para que la comida salga limpia y segura).',
    importancia:
      'Protege la salud de quienes comen nuestros snacks y enseña a no botar cáscaras ni restos de comida por los desagües.',
    aplicabilidad:
      'Todo el personal de planta usa cofia, tapabocas y uniforme limpio, se lava bien las manos, recoge las mermas orgánicas en la caneca verde y ahorra agua al lavar tubérculos.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia para manipuladores de alimentos.',
    evidenciaCumplimiento:
      'Certificado anual de manipulación de alimentos (mínimo 10 horas) y registro de charla de ahorro de agua y manejo de residuos.',
    estado: 'Por hacer',
    responsable: 'Operario de selección / Operario de pelado / Operario de frito / Operario de empaque',
    fechaVerificacion: '2026-09-15',
    observaciones: 'Todo el personal de producción tiene su curso de manipulación vigente.',
  },

  // MÓDULO 2: DOTACIÓN Y COMITÉS
  {
    id: 'hacer-05',
    fase: 'HACER',
    subtema: 'DOTACIÓN Y COMITÉS',
    tituloSituacion: '2.1 Vigía de Seguridad (SST) y Comité de Convivencia',
    normaOficial: 'Resolución 2013 de 1986',
    entidadEmisora: 'Ministerio de Trabajo y Seguridad Social',
    articulos: 'Artículo 1 / Comités Paritarios y Vigía en Pymes',
    area: 'SST',
    descripcion:
      'Explica cómo participan los trabajadores en su propia seguridad: cuando una empresa tiene 10 trabajadores o menos, nombra un Vigía SST (en vez de comité grande) y conforma un Comité de Convivencia para cuidar el buen trato.',
    importancia:
      'Te da un canal directo y de confianza para reportar máquinas en mal estado, pedir mejoras de seguridad o resolver conflictos con respeto.',
    aplicabilidad:
      'Como en Frikaz S.A.S. somos 10 trabajadores:\n• Vigía SST: 1 compañero encargado y su suplente por 2 años.\n• Comité de Convivencia: 2 personas (1 nombrada por la empresa y 1 elegida por voto de los trabajadores).',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia y dentro de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Carta de nombramiento del Vigía SST, acta de votación del Comité de Convivencia y actas de recorridos y reuniones.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de selección',
    fechaVerificacion: '2026-09-10',
    observaciones: 'Vigía SST y Comité de Convivencia activos para el periodo 2026-2028.',
  },
  {
    id: 'hacer-06',
    fase: 'HACER',
    subtema: 'DOTACIÓN Y COMITÉS',
    tituloSituacion: '2.2 Entrega de uniformes, botas y elementos de protección (EPP)',
    normaOficial: 'Código Sustantivo del Trabajo y Resolución 2400 de 1979',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'CST Artículos 230 al 235 y Resolución 2400 de 1979',
    area: 'SST',
    descripcion:
      'Ordena entregar gratis uniforme y calzado de trabajo 3 veces al año (a quienes ganan hasta 2 salarios mínimos) y dar sin costo todos los Elementos de Protección Personal —EPP— necesarios para cuidar la salud.',
    importancia:
      'Evita quemaduras por salpicaduras de aceite caliente, resbalones en pisos húmedos, cortaduras y daño en los oídos.',
    aplicabilidad:
      '• Dotación (abril, agosto y diciembre): uniforme antifluido claro sin bolsillos arriba de la cintura.\n• EPP gratuitos y obligatorios: delantal térmico/impermeable, botas antideslizantes con puntera, guantes contra calor junto a la freidora, tapaoídos, tapabocas y cofia.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia para todo el equipo operativo de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Planilla individual firmada con fecha cada vez que recibes tus EPP o tu dotación.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de empaque',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Planillas de entrega firmadas con fecha y firma de cada trabajador.',
  },
  {
    id: 'hacer-07',
    fase: 'HACER',
    subtema: 'DOTACIÓN Y COMITÉS',
    tituloSituacion: '2.1 Jabones y desengrasantes que no contaminan el agua',
    normaOficial: 'Decreto 1076 de 2015',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Libro 2, Parte 2, Título 2 - Sector Ambiente',
    area: 'AMBIENTAL',
    descripcion:
      'Prohíbe mandar por el desagüe líquidos de lavado con químicos dañinos que contaminan ríos y alcantarillas.',
    importancia:
      'Cuida el agua de la ciudad y evita irritaciones en la piel o vías respiratorias cuando se lavan pisos, freidoras o uniformes.',
    aplicabilidad:
      'Compramos detergentes y desengrasantes biodegradables (que se descomponen sin dañar el agua) y uniformes de tela fácil de lavar.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Fichas técnicas y hojas de seguridad de los productos de aseo donde dice que son biodegradables.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de pelado',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Todos los desengrasantes de planta cuentan con ficha biodegradable.',
  },

  // MÓDULO 3: RIESGOS
  {
    id: 'hacer-08',
    fase: 'HACER',
    subtema: 'RIESGOS',
    tituloSituacion: '3.1 Cuidado del estrés laboral y buen clima de trabajo (Psicosocial)',
    normaOficial: 'Resolución 2764 de 2019',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Batería de Instrumentos de Riesgo Psicosocial',
    area: 'SST',
    descripcion:
      'Pide aplicar un cuestionario confidencial guiado por un psicólogo especialista en SST para saber si el ritmo, los turnos o las relaciones de trabajo están causando estrés o agotamiento.',
    importancia:
      'Ayuda a prevenir el cansancio mental, el estrés por el calor y ritmo de producción, y mejora el respeto y apoyo entre compañeros.',
    aplicabilidad:
      'Aplicamos la encuesta a los 10 trabajadores con apoyo de psicólogo especialista y organizamos pausas activas, rotación de tareas en empaque y turnos claros.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia para toda la nómina.',
    evidenciaCumplimiento:
      'Informe confidencial del psicólogo con licencia en SST y registro de pausas activas y charlas de bienestar.',
    estado: 'Por hacer',
    responsable: 'Gerente',
    fechaVerificacion: '2026-08-15',
    observaciones: 'Encuesta aplicada con plan de pausas activas y turnos equilibrados.',
  },
  {
    id: 'hacer-09',
    fase: 'HACER',
    subtema: 'RIESGOS',
    tituloSituacion: '3.2 Trabajo seguro con calor a 180 °C, cuchillas y espacios cerrados',
    normaOficial: 'Resolución 0491 de 2020',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Resolución 0491 de 2020 (Espacios Confinados) y Normas de Seguridad Mecánica',
    area: 'SST',
    descripcion:
      'Define las reglas de seguridad para evitar accidentes graves en espacios cerrados (tanques o cámaras), trabajos con máquinas de corte o zonas de muy alta temperatura.',
    importancia:
      'Protege manos y brazos de atrapamientos con cuchillas o rodillos, previene quemaduras graves con aceite y evita accidentes al limpiar tanques.',
    aplicabilidad:
      '• Nunca metemos la mano en rebanadoras o selladoras encendidas: todas tienen guardas fijas y aplicamos protocolo LOTO (apagar, desconectar y poner candado/etiqueta antes de limpiar o reparar).\n• En tanques o recintos cerrados se mide aire y se firma permiso de trabajo.\n• Sobre freidoras usamos extractores de calor y delantal/guantes térmicos.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia y en las zonas operativas de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Lista de peligros al día, permisos escritos para tareas de alto riesgo, uso de candados de bloqueo (LOTO) y registro de mantenimiento de máquinas.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de pelado / Operario de frito',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Guardas protectoras instaladas y regla de apagar y bloquear antes de limpiar.',
  },
  {
    id: 'hacer-10',
    fase: 'HACER',
    subtema: 'RIESGOS',
    tituloSituacion: '3.1 Guardado seguro de líquidos de aseo y químicos',
    normaOficial: 'Ley 55 de 1993 y Decreto 1496 de 2018',
    entidadEmisora: 'Ministerio del Trabajo y Ministerio de Salud',
    articulos: 'Seguridad en Productos Químicos y SGA',
    area: 'AMBIENTAL',
    descripcion:
      'Ordena guardar, etiquetar y transportar con cuidado los productos químicos (como desengrasantes fuertes) para evitar derrames, mezclas peligrosas o intoxicaciones.',
    importancia:
      'Evita quemaduras en piel u ojos al limpiar y protege el suelo y alcantarillado frente a derrames.',
    aplicabilidad:
      'Guardamos los desengrasantes concentrados sobre bandejas antiderrames, nunca los pasamos a botellas de gaseosa, seguimos la tabla de qué productos no deben mezclarse y tenemos kit para limpiar derrames.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Tabla visible de compatibilidad química, hojas de seguridad en español (sistema SGA con dibujos de peligro) y kit antiderrames completo.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de selección',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Kit antiderrames listo junto al almacén de aseo.',
  },

  // MÓDULO 4: RESIDUOS Y EMERGENCIAS
  {
    id: 'hacer-11',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.1 Etiquetas claras en químicos y plan de emergencias (Extintor Clase K)',
    normaOficial: 'Decreto 1496 de 2018 y Decreto 1072 de 2015',
    entidadEmisora: 'Ministerio del Trabajo',
    articulos: 'Decreto 1496 de 2018 (SGA) y Decreto 1072 de 2015 (Art. 2.2.4.6.25)',
    area: 'SST',
    descripcion:
      'Exige que todo envase con producto químico tenga su etiqueta con dibujos claros de peligro (sistema SGA) y que la planta tenga un Plan de Emergencias con equipos y personal entrenado para actuar rápido.',
    importancia:
      'Si ocurre un fuego en el aceite de la freidora o alguien se salpica con desengrasante, todos saben qué hacer sin entrar en pánico y sin echarle agua al aceite caliente.',
    aplicabilidad:
      'Tenemos hojas de seguridad en el área de aseo, todo frasco reenvasado marcado con nombre y advertencia, extintores especiales Clase K (hechos para apagar incendios de aceite vegetal) junto a las freidoras y extintores ABC en bodega.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia y en toda la sede física de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Envases con etiqueta SGA, Plan de Emergencias escrito, extintores Clase K y ABC recargados al día, botiquín y acta del simulacro anual con fotos.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de frito',
    fechaVerificacion: '2026-10-02',
    observaciones: 'Extintores Clase K instalados junto a freidoras y simulacro realizado.',
  },
  {
    id: 'hacer-12',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.1 Entrega segura del aceite de cocina usado (ACU / AVU)',
    normaOficial: 'Resolución 316 de 2018',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Reglamentación del Aceite Vegetal Usado (AVU)',
    area: 'AMBIENTAL',
    descripcion:
      'Regula cómo recoger, guardar y entregar el Aceite Vegetal Usado (AVU / ACU) a una empresa autorizada que lo recicle (por ejemplo para hacer biodiésel), prohibiendo tirarlo por el sifón o la basura.',
    importancia:
      'Un solo litro de aceite tirado al desagüe puede contaminar 1.000 litros de agua y tapar las tuberías del barrio.',
    aplicabilidad:
      'En Frikaz S.A.S. dejamos enfriar el aceite usado por debajo de 40 °C antes de moverlo, lo pasamos con embudo a canecas cerradas y rotuladas, y lo entregamos cada mes al recolector autorizado.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia y en el área de freidoras de Frikaz S.A.S.',
    evidenciaCumplimiento:
      'Registro ante la autoridad ambiental, contrato con gestor autorizado y recibos firmados por cada entrega de aceite usado.',
    estado: 'Por hacer',
    responsable: 'Operario de frito / Gerente',
    fechaVerificacion: '2026-10-02',
    observaciones: 'Entregamos entre 180 y 250 litros mensuales con certificado oficial.',
  },
  {
    id: 'hacer-13',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.2 Separación de basuras por colores (Blanco, Verde y Negro)',
    normaOficial: 'Resolución 2184 de 2019',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible / MinVivienda',
    articulos: 'Código Unificado Nacional de Colores',
    area: 'AMBIENTAL',
    descripcion:
      'Fija los tres colores oficiales en todo el país para separar los residuos desde el momento en que los botamos: Blanco (reciclables), Verde (orgánicos) y Negro (no aprovechables).',
    importancia:
      'Permite reciclar cartón y plástico limpios, aprovechar las cáscaras de papa y plátano, y mantener limpia la planta.',
    aplicabilidad:
      'En cada punto ecológico de la planta separamos así:\n• Verde: cáscaras y restos de papa, plátano o yuca.\n• Blanco: cartón, plástico y empaques limpios y secos.\n• Negro: servilletas con grasa, guantes desechables sucios y barrido del piso.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Canecas marcadas con los tres colores, guía de manejo de residuos (PGIRS) y planillas de entrega.',
    estado: 'Por hacer',
    responsable: 'Operario de selección / Operario de pelado / Operario de empaque',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Puntos ecológicos señalizados en recepción, planta y empaque.',
  },
  {
    id: 'hacer-14',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.3 Manejo de residuos peligrosos (RESPEL)',
    normaOficial: 'Decreto 4741 de 2005',
    entidadEmisora: 'Ministerio de Ambiente, Vivienda y Desarrollo Territorial',
    articulos: 'Prevención y Manejo Integral de Residuos Peligrosos',
    area: 'AMBIENTAL',
    descripcion:
      'Ordena separar, guardar en lugar seguro y entregar a empresas con licencia los desechos inflamables, corrosivos o tóxicos (RESPEL).',
    importancia:
      'Evita incendios, intoxicaciones y contaminación del suelo o del agua.',
    aplicabilidad:
      'Guardamos aparte trapos con lubricante de máquinas, envases vacíos de desengrasantes fuertes y tubos fluorescentes dañados, sobre bandeja antiderrames.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Planilla mensual de cantidades entregadas, zona de acopio segura y certificados de disposición de empresa con licencia ambiental.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de frito',
    fechaVerificacion: '2026-09-25',
    observaciones: 'Bitácora mensual al día con certificados de gestor autorizado.',
  },
  {
    id: 'hacer-15',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.4 Aparatos eléctricos, pilas y electrónicos dañados (RAEE)',
    normaOficial: 'Ley 1672 de 2013',
    entidadEmisora: 'Congreso de la República',
    articulos: 'Gestión Integral de RAEE',
    area: 'AMBIENTAL',
    descripcion:
      'Indica que los aparatos eléctricos o electrónicos dañados (básculas, tarjetas electrónicas, computadores o pilas — llamados RAEE) no van a la basura común sino a puntos especiales de recolección.',
    importancia:
      'Evita que metales contaminantes de pilas o circuitos lleguen a los rellenos sanitarios y al agua.',
    aplicabilidad:
      'Cuando una báscula digital, batería, bombillo o repuesto electrónico se daña, lo llevamos a puntos autorizados de recolección posconsumo.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Comprobantes de entrega en puntos posconsumo o a gestores autorizados.',
    estado: 'Por hacer',
    responsable: 'Gerente / Operario de empaque',
    fechaVerificacion: '2026-09-20',
    observaciones: 'Entrega periódica de pilas y partes electrónicas en puntos posconsumo.',
  },
  {
    id: 'hacer-16',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.5 Cuidado con empaques, bolsas y cajas de cartón',
    normaOficial: 'Resolución 1407 de 2018',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Gestión Ambiental de Envases y Empaques (ANLA)',
    area: 'AMBIENTAL',
    descripcion:
      'Pide a las empresas que venden productos empacados reducir el plástico innecesario y apoyar el reciclaje de sus bolsas, envases y cajas.',
    importancia:
      'Disminuye la cantidad de plástico que termina en la basura y aprovecha mejor el cartón de empaque.',
    aplicabilidad:
      'Usamos bolsas de menor espesor donde es posible sin afectar la frescura del snack y reutilizamos o entregamos para reciclaje las cajas de cartón limpias.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance: 'Aplica en toda Colombia.',
    evidenciaCumplimiento:
      'Plan de manejo de envases y empaques (propio o en grupo ante la ANLA) y registros de material reciclado.',
    estado: 'Por hacer',
    responsable: 'Operario de empaque / Gerente',
    fechaVerificacion: '2026-09-15',
    observaciones: 'Uso optimizado de rollo de empaque y reciclaje de cartón limpio.',
  },
  {
    id: 'hacer-17',
    fase: 'HACER',
    subtema: 'RESIDUOS Y EMERGENCIAS',
    tituloSituacion: '4.6 Control de aguas de lavado (Trampa de Grasas) y extractores de humo',
    normaOficial: 'Resolución 0631 de 2015 y Resolución 909 de 2008',
    entidadEmisora: 'Ministerio de Ambiente y Desarrollo Sostenible',
    articulos: 'Resolución 0631 de 2015 (Vertimientos) y Resolución 909 de 2008 (Emisiones)',
    area: 'AMBIENTAL',
    descripcion:
      'Pone límites claros a la grasa y suciedad que puede ir en el agua de lavado (llamada agua residual no doméstica — ARnD) antes de llegar al alcantarillado, y regula el humo o vapor de las chimeneas.',
    importancia:
      'Evita taponamientos y malos olores en las tuberías del sector y previene multas o cierres de la planta.',
    aplicabilidad:
      '• Nunca tiramos aceite ni restos sólidos al sifón; la planta tiene una Trampa de Grasas que limpiamos cada semana.\n• Las freidoras tienen campanas con filtros retenedores de grasa y extractores que sacan el vapor y el calor.',
    vigente: true,
    textoVigencia: 'VIGENTE',
    jurisdiccionAlcance:
      'Aplica en Bogotá y toda Colombia bajo revisión de la Secretaría de Ambiente o la CAR.',
    evidenciaCumplimiento:
      'Pruebas periódicas de laboratorio acreditado sobre el agua de salida, planilla semanal de limpieza de la Trampa de Grasas y revisión técnica de campanas y extractores.',
    estado: 'Por hacer',
    responsable: 'Operario de pelado / Operario de frito',
    fechaVerificacion: '2026-10-01',
    observaciones: 'Trampa de grasas con limpieza semanal registrada en planilla.',
  },
];
