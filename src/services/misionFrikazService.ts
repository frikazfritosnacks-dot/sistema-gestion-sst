// ============================================================================
// SERVICIO DE GESTIÓN: «MISIÓN FRIKAZ – PROTEGE NUESTRA EMPRESA»
// Frikaz S.A.S. — Sede Bosa, Bogotá D.C.
// ============================================================================

import {
  TrabajadorFrikaz,
  PoliticaMisionFrikaz,
  PasaporteDigital,
  IntentoEvaluacion,
  ProgresoPoliticaTrabajador,
  InsigniaDigital,
  MetricasAdminMisionFrikaz,
} from '../types/misionFrikaz';
import { getStoredPoliticaSST } from './organigramaService';

const STORAGE_KEY_TRABAJADORES = 'frikaz_mision_trabajadores_v2';
const STORAGE_KEY_PROGRESOS = 'frikaz_mision_progresos_v2';
const STORAGE_KEY_INTENTOS = 'frikaz_mision_intentos_v2';
const STORAGE_KEY_POLITICAS_CONFIG = 'frikaz_mision_politicas_config_v2';
const STORAGE_KEY_SESION_ACTIVA = 'frikaz_mision_sesion_activa_v2';

// ----------------------------------------------------------------------------
// PLANTILLA DE TRABAJADORES CANÓNICOS DE FRIKAZ S.A.S.
// Exclusivamente los 6 cargos canónicos autorizados con avatares ilustrados digitales
// ----------------------------------------------------------------------------
export const TRABAJADORES_CANONICOS: TrabajadorFrikaz[] = [
  {
    id: 'FRK-DIR-GERENCIA',
    nombre: 'Gerente',
    cedula: '1.014.223.889',
    cargoId: 'cargo-gerente-general',
    cargoNombre: 'Gerente',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Dirección General y Gestión Estratégica',
    avatarUrl: '/assets/images/avatar_gerente.webp',
    esAdmin: true,
  },
  {
    id: 'FRK-OPR-FRITO',
    nombre: 'Operario de Frito',
    cedula: '1.020.485.912',
    cargoId: 'cargo-operario-frito',
    cargoNombre: 'Operario de Frito',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Planta de Producción – Área de Cocción y Freidoras Industriales a Gas',
    avatarUrl: '/assets/images/avatar_operario_frito.webp',
    esAdmin: false,
  },
  {
    id: 'FRK-OPR-PELADO',
    nombre: 'Operario de Pelado',
    cedula: '80.124.553',
    cargoId: 'cargo-operario-pelado',
    cargoNombre: 'Operario de Pelado',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Planta de Producción – Área de Pelado, Descascarado y Corte Mecanizado',
    avatarUrl: '/assets/images/avatar_operario_pelado.webp',
    esAdmin: false,
  },
  {
    id: 'FRK-OPR-SELECCION',
    nombre: 'Operario de Selección',
    cedula: '51.992.304',
    cargoId: 'cargo-operario-seleccion',
    cargoNombre: 'Operario de Selección',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Planta de Producción – Área de Recepción, Selección y Lavado de Materia Prima',
    avatarUrl: '/assets/images/avatar_operario_seleccion.webp',
    esAdmin: false,
  },
  {
    id: 'FRK-OPR-EMPAQUE',
    nombre: 'Operario de Empaque',
    cedula: '52.981.442',
    cargoId: 'cargo-operario-empaque',
    cargoNombre: 'Operario de Empaque',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Planta de Producción – Área de Empaque, Sellado Térmico y Embalaje',
    avatarUrl: '/assets/images/avatar_operario_empaque.webp',
    esAdmin: false,
  },
  {
    id: 'FRK-CND-LOGISTICA',
    nombre: 'Conductor',
    cedula: '79.882.114',
    cargoId: 'cargo-conductor',
    cargoNombre: 'Conductor',
    correo: 'frikaz.fritosnacks@gmail.com',
    area: 'Logística, Transporte y Distribución Comercial',
    avatarUrl: '/assets/images/avatar_conductor.webp',
    esAdmin: false,
  },
];


// ----------------------------------------------------------------------------
// BANCO CANÓNICO DE POLÍTICAS, ESCENARIOS REALES Y PREGUNTAS
// ----------------------------------------------------------------------------
export const POLITICAS_MISION_BASE: PoliticaMisionFrikaz[] = [
  {
    id: 'FRK-SST-POL-01',
    codigoCalidad: 'FRK-SST-POL-01',
    titulo: 'CUIDAMOS TU VIDA Y TU SALUD EN EL TRABAJO (POLÍTICA DE SST)',
    subtitulo: 'Nuestro compromiso para prevenir quemaduras, caídas y accidentes todos los días',
    version: '02',
    fechaEmision: '2026-01-15',
    esObligatoria: true,
    icono: 'ShieldCheck',
    colorAcento: '#F59E0B',
    insigniaNombre: 'Protector de la Vida en Frikaz',
    insigniaDescripcion: 'Conoces cómo cuidarte en planta y los 4 compromisos de seguridad de Frikaz S.A.S.',
    insigniaIcono: 'Award',
    resumenEjecutivo:
      'En Frikaz S.A.S., donde hacemos papas, plátanos y chicharrones, lo más importante eres tú y cada compañero de trabajo. La empresa se compromete a cuidar tu salud y evitar accidentes: revisando peligros como el aceite a 180°C, cuidando tu espalda al cargar, entregándote tus elementos de protección (EPP: guantes térmicos, careta, delantal y botas antideslizantes) y escuchando tus sugerencias para mejorar cada día.',

    // Atributos del recorrido práctico
    imagenZona: '/assets/images/zone_frying_line.webp',
    sectorPlantaNombre: 'Zona 1: Área de Freído y Cuidado con el Calor',
    dificultad: 'Paso 1: Inicio',
    puntosXp: 350,
    dialogoGuiaBienvenida:
      '¡Hola! Bienvenido a la zona de freidoras. Aquí el aceite llega a 180°C (muy caliente). Prestar atención a cada detalle cuida tu vida y la de tus compañeros. ¡Mira la escena y busca qué está fallando!',
    hotspots: [
      {
        id: 'hs-temp',
        x: 42,
        y: 38,
        titulo: 'Medidor de calor a 195°C',
        descripcion: '¡Ojo! El aceite está 15°C más caliente de lo normal (el máximo seguro es 180°C).',
        esPeligro: true,
        consejoGuia: 'Cierra de una vez la llave del gas para bajar el calor y avisa al encargado.',
      },
      {
        id: 'hs-water',
        x: 28,
        y: 68,
        titulo: 'Papa mojada goteando agua',
        descripcion: 'Si el agua toca el aceite muy caliente, el vapor salta con fuerza y puede salpicar y quemar.',
        esPeligro: true,
        consejoGuia: 'Escurre y seca bien la papa antes de meterla a la freidora.',
      },
      {
        id: 'hs-extintor',
        x: 82,
        y: 55,
        titulo: 'Extintor Clase K (para aceite de cocina)',
        descripcion: 'Es el extintor especial que apaga fuego en aceites y grasas sin hacer que salten.',
        esPeligro: false,
        consejoGuia: '¡Muy bien! Este extintor saca una espuma especial que enfría el aceite y corta el fuego sin salpicar.',
      },
    ],
    desafioTerminal: {
      codigoProtocolo: 'FRK-SAFE-180',
      instruccion: '¿Qué haces primero si ves que la freidora se calentó demasiado (pasó de 180°C)?',
      pregunta: 'Elige el primer paso seguro:',
      opciones: [
        { id: 't-1', etiqueta: 'Cerrar la llave principal de gas y detener el ingreso de papa', esCorrecta: true },
        { id: 't-2', etiqueta: 'Echar hielo dentro del aceite para enfriarlo rápido', esCorrecta: false },
        { id: 't-3', etiqueta: 'Seguir fritando más rápido para terminar el turno pronto', esCorrecta: false },
      ],
    },
    compromisosClave: [
      {
        numero: 1,
        titulo: 'Cuidar la salud y evitar accidentes de todos',
        descripcion:
          'Prevenir quemaduras por calor extremo (180°C), dolores por malas posturas y resbalones en el piso.',
        aplicacionEnPlanta:
          'Usa siempre tu careta para la cara, delantal grueso, guantes para el calor (hasta 200°C) y botas que no resbalen.',
      },
      {
        numero: 2,
        titulo: 'Cumplir las leyes de seguridad y cuidado ambiental',
        descripcion:
          'Cumplir las normas de seguridad en el trabajo (Decreto 1072 de 2015 y Resolución 0312 de 2019) y cuidar el ambiente (reglas de la Secretaría de Ambiente).',
        aplicacionEnPlanta:
          'Si pasa un golpe, caída o casi accidente, avisa antes de 24 horas y entrega el aceite usado solo a la empresa autorizada.',
      },
      {
        numero: 3,
        titulo: 'Escuchar tu voz y parar si hay peligro',
        descripcion:
          'Contar con el Vigía de SST (un compañero elegido para apoyar la seguridad), reportar daños sin miedo y parar el trabajo si hay un peligro grave.',
        aplicacionEnPlanta:
          'Si hueles gas o ves que la máquina se pasa de calor, puedes apagarla y avisar de inmediato sin ningún problema.',
      },
      {
        numero: 4,
        titulo: 'Mejorar cada año nuestras condiciones de trabajo',
        descripcion:
          'Revisar cómo nos fue en seguridad durante el año, revisar cada puesto y arreglar o cambiar lo que haga falta.',
        aplicacionEnPlanta:
          'Revisar los quemadores antes de encender y cambiar a tiempo las botas cuando la suela ya esté lisa.',
      },
    ],
    responsabilidadesPorNivel: [
      {
        nivel: 'Gerencia (Dirección)',
        responsabilidad: 'Dar el dinero y los materiales necesarios para trabajar seguros, revisar los resultados y firmar este compromiso cada año.',
      },
      {
        nivel: 'Vigía / Encargado de Seguridad (SST)',
        responsabilidad: 'Revisar los riesgos del trabajo, analizar si ocurre un accidente (en máximo 15 días) y verificar que todos tengan sus elementos de protección.',
      },
      {
        nivel: 'Operarios y Conductores (Todos)',
        responsabilidad: 'Contar cómo te sientes de salud, usar siempre tus guantes, careta y botas, y avisar si ves algo peligroso.',
      },
    ],
    escenario: {
      titulo: 'Alerta de calor en la freidora a gas (180°C)',
      ubicacionPlanta: 'Planta Bosa – Zona de Freidoras a Gas',
      peligroAsociado: 'Calor muy alto (aceite a 180°C) y piso resbaloso por grasa',
      descripcionCaso:
        'Es viernes a las 11:30 de la mañana y hay bastante pedido de papas. El reloj de temperatura de la freidora #1 marca 195°C (15 grados por encima del límite seguro que es 180°C). El operario escucha un ruido raro en la campana del humo y ve caer unas gotitas de agua fría cerca de la paila caliente. Además, el piso tiene un poco de grasa regada y hay una canastilla con 25 kilos de papa recién lavada que todavía está goteando agua. Hay afán porque el camión sale en 40 minutos.',
      elementosInvolucrados: [
        'Freidora muy caliente a 195°C (el máximo seguro es 180°C)',
        'Canastilla con papa mojada goteando agua cerca del aceite',
        'Piso resbaloso con grasa frente a la máquina',
        'Extintor Clase K ubicado a 4 metros',
        'Afán por despachar el pedido a tiempo',
      ],
      desafioObservacion:
        'Mira bien lo que está pasando. ¿Qué es lo primero y más seguro que debes hacer para cuidar tu vida y la de tus compañeros?',
      pistas: [
        'Consejo 1: Nunca dejes caer agua en aceite a 180°C; el vapor sale disparado y puede causar quemaduras graves.',
        'Consejo 2: En Frikaz S.A.S., tienes todo el derecho de parar una máquina si ves un peligro cercano.',
        'Consejo 3: La temperatura máxima segura para freír en Frikaz es 180°C.',
      ],
    },
    preguntas: [
      {
        id: 'p1-1',
        numero: 1,
        enunciado:
          'Si la freidora marca 195°C (más de lo permitido) y la papa está goteando agua cerca del aceite, ¿qué debes hacer primero?',
        contextoCaso: 'El aceite está demasiado caliente y hay riesgo de salpicaduras fuertes si cae agua.',
        pesoPuntos: 20,
        fundamentoNormativo: 'Decreto 1072 de 2015 (Art. 2.2.4.6.8) y compromisos de seguridad de Frikaz.',
        opciones: [
          {
            id: 'opt-1-1',
            texto: 'Echar de una vez la papa mojada para que el agua enfríe el aceite rápido.',
            esCorrecta: false,
            retroalimentacion: 'Cuidado, esa opción es peligrosa: si echas agua o papa muy mojada en aceite hirviendo, el agua se vuelve vapor de golpe y hace que el aceite salte por todas partes, causando quemaduras graves.',
          },
          {
            id: 'opt-1-2',
            texto: 'Cerrar la llave del gas, apagar el quemador, no meter la papa mojada y avisar de una vez al Vigía de SST o encargado.',
            esCorrecta: true,
            retroalimentacion: '¡Muy bien! En Frikaz tu vida vale más que cualquier afán de entrega. Cortar el gas y detener la tarea cuando hay peligro es la decisión correcta.',
          },
          {
            id: 'opt-1-3',
            texto: 'Seguir trabajando rápido y no decir nada para que el camión no se retrase.',
            esCorrecta: false,
            retroalimentacion: 'Recuerda: ningún pedido urgente vale más que tu salud. Guardar silencio ante un peligro nos pone en riesgo a todos en la planta.',
          },
          {
            id: 'opt-1-4',
            texto: 'Tirar un baldado de agua fría por fuera de la paila para enfriar el metal.',
            esCorrecta: false,
            retroalimentacion: 'Ten precaución: el agua puede entrar a la cuba de aceite o dañar el metal caliente por el cambio brusco de temperatura, provocando un derrame.',
          },
        ],
      },
      {
        id: 'p1-2',
        numero: 2,
        enunciado:
          '¿Qué elementos de protección (EPP) debes usar siempre cuando trabajas frente a la freidora a 180°C?',
        contextoCaso: 'Trabajo directo junto al aceite vegetal muy caliente.',
        pesoPuntos: 20,
        fundamentoNormativo: 'Resolución 2400 de 1979 y Decreto 1072 de 2015.',
        opciones: [
          {
            id: 'opt-2-1',
            texto: 'Careta que cubra toda la cara, guantes gruesos para calor (200°C), delantal térmico impermeable y botas con suela que no resbale.',
            esCorrecta: true,
            retroalimentacion: '¡Exacto! Este equipo cuida tu cara, pecho y manos de salpicaduras a 180°C, y las botas evitan caídas si el piso tiene algo de grasa.',
          },
          {
            id: 'opt-2-2',
            texto: 'Solo tapabocas normal, guantes delgados de látex y tenis cómodos.',
            esCorrecta: false,
            retroalimentacion: 'Ojo: el guante delgado de látex se derrite si le cae aceite caliente y los tenis no agarran bien en pisos con grasa.',
          },
          {
            id: 'opt-2-3',
            texto: 'Gafas oscuras y botas plásticas normales de lluvia.',
            esCorrecta: false,
            retroalimentacion: 'Esos elementos no protegen toda tu cara contra salpicaduras ni resisten el calor de la freidora.',
          },
          {
            id: 'opt-2-4',
            texto: 'Solo guantes de tela de algodón para no ensuciarse las manos.',
            esCorrecta: false,
            retroalimentacion: 'Ten cuidado: la tela absorbe el aceite caliente y deja la quemadura pegada a la piel.',
          },
        ],
      },
      {
        id: 'p1-3',
        numero: 3,
        enunciado:
          'Si llega a prenderse fuego en el aceite caliente de la freidora, ¿con qué extintor debes apagarlo?',
        contextoCaso: 'Fuego sobre aceite de cocina caliente.',
        pesoPuntos: 20,
        fundamentoNormativo: 'Norma de extintores NFPA 10 y Resolución 2400 de 1979.',
        opciones: [
          {
            id: 'opt-3-1',
            texto: 'Con la manguera de agua del lavapapas a toda presión.',
            esCorrecta: false,
            retroalimentacion: 'Mucho cuidado: nunca uses agua en aceite encendido. El agua se hunde, hierve al instante y levanta una bola grande de fuego.',
          },
          {
            id: 'opt-3-2',
            texto: 'Con el Extintor Clase K (especial para cocina; saca una espuma que enfría el aceite y tapa el fuego).',
            esCorrecta: true,
            retroalimentacion: '¡Correcto! El extintor Clase K (plateado, especial para cocinas) crea una capa de espuma que ahoga el fuego y enfría el aceite sin hacerlo saltar.',
          },
          {
            id: 'opt-3-3',
            texto: 'Abanicando o soplando la llama con una bandeja de aluminio.',
            esCorrecta: false,
            retroalimentacion: 'Al echarle aire solo haces que la llama crezca más rápido y puedes quemarte.',
          },
          {
            id: 'opt-3-4',
            texto: 'Con un extintor común de agua a presión.',
            esCorrecta: false,
            retroalimentacion: 'No sirve para aceites calientes: el agua esparce el aceite prendido por toda la cocina.',
          },
        ],
      },
      {
        id: 'p1-4',
        numero: 4,
        enunciado:
          'Si ves un piso resbaloso sin aviso o sientes olor a gas en la planta, ¿qué puedes y debes hacer?',
        contextoCaso: 'Cualquier riesgo que veas en tu turno o al pasar por otra área.',
        pesoPuntos: 20,
        fundamentoNormativo: 'Decreto 1072 de 2015 (Art. 2.2.4.6.10) y Política de Seguridad de Frikaz.',
        opciones: [
          {
            id: 'opt-4-1',
            texto: 'Pasar de largo si esa no es mi máquina ni mi turno.',
            esCorrecta: false,
            retroalimentacion: 'Cuidarnos es tarea de todos. Un accidente le puede pasar a cualquier compañero que pase por ahí.',
          },
          {
            id: 'opt-4-2',
            texto: 'Avisar de inmediato al Vigía de SST o al Gerente, y parar la tarea si el peligro es grave, sabiendo que nadie te regañará por cuidar la vida.',
            esCorrecta: true,
            retroalimentacion: '¡Así es! En Frikaz siempre puedes reportar peligros y detener un trabajo riesgoso para evitar que alguien salga herido.',
          },
          {
            id: 'opt-4-3',
            texto: 'Esperar hasta fin de año para contarlo en la reunión general.',
            esCorrecta: false,
            retroalimentacion: 'Si esperamos meses, alguien puede caerse o quemarse hoy mismo. Los peligros se avisan en el momento.',
          },
          {
            id: 'opt-4-4',
            texto: 'Subir un video a redes sociales antes de avisarle al encargado.',
            esCorrecta: false,
            retroalimentacion: 'Lo más rápido para proteger a tus compañeros es avisarle primero al Vigía de SST o al jefe directo para arreglarlo ya.',
          },
        ],
      },
      {
        id: 'p1-5',
        numero: 5,
        enunciado:
          '¿Cada cuánto tiempo debe revisar y firmar la Gerencia este compromiso de seguridad (Política de SST)?',
        contextoCaso: 'Mantener las reglas de seguridad al día según los cambios de la planta.',
        pesoPuntos: 20,
        fundamentoNormativo: 'Decreto 1072 de 2015, Art. 2.2.4.6.7.',
        opciones: [
          {
            id: 'opt-5-1',
            texto: 'Cada 10 años, solo cuando cambie el dueño de la empresa.',
            esCorrecta: false,
            retroalimentacion: 'Es mucho tiempo; las máquinas, procesos y leyes cambian antes, por eso la ley pide revisarla con más frecuencia.',
          },
          {
            id: 'opt-5-2',
            texto: 'Por lo menos una vez al año, firmada y con la fecha actualizada por la Gerencia.',
            esCorrecta: true,
            retroalimentacion: '¡Muy bien! La ley pide revisar la política mínimo una vez al año para confirmar que sigue protegiendo bien a todos en la empresa.',
          },
          {
            id: 'opt-5-3',
            texto: 'Únicamente si llega a pasar un accidente grave en la fábrica.',
            esCorrecta: false,
            retroalimentacion: 'La idea del SG-SST es prevenir antes de que pase un accidente, no esperar a que ocurra algo malo.',
          },
          {
            id: 'opt-5-4',
            texto: 'Nunca más; con escribirla una sola vez ya queda para siempre.',
            esCorrecta: false,
            retroalimentacion: 'No revisarla cada año es una falta ante la ley (Resolución 0312 de 2019) y hace que las reglas queden desactualizadas.',
          },
        ],
      },
    ],
  },
  {
    id: 'FRK-SST-POL-02',
    codigoCalidad: 'FRK-SST-POL-02',
    titulo: 'CERO ALCOHOL, DROGAS Y CIGARRILLO EN EL TRABAJO',
    subtitulo: 'Cuidamos nuestra mente y reflejos al 100% en las freidoras y en la vía',
    version: '01',
    fechaEmision: '2026-01-20',
    esObligatoria: true,
    icono: 'ShieldAlert',
    colorAcento: '#EF4444',
    insigniaNombre: 'Ejemplo de Cuidado y Lucidez',
    insigniaDescripcion: 'Sabes por qué trabajamos 100% sobrios y libres de humo en planta y en el furgón.',
    insigniaIcono: 'CheckCircle2',
    resumenEjecutivo:
      'En Frikaz S.A.S. no se permite entrar, tener ni trabajar bajo los efectos del alcohol, drogas o sustancias que alteren los sentidos, ni fumar dentro de la planta de Bosa o en los camiones de reparto. Trabajar junto a aceite a 180°C, cuchillas o manejando un furgón en la calle exige estar descansado, despejado y con todos los reflejos al 100%.',

    // Atributos del recorrido práctico
    imagenZona: '/assets/images/zone_logistics_patio.webp',
    sectorPlantaNombre: 'Zona 2: Patio de Cargue, Furgones y Cero Adicciones',
    dificultad: 'Paso 2: En Planta y Ruta',
    puntosXp: 400,
    dialogoGuiaBienvenida:
      '¡Bienvenido al patio de entregas! Manejar el furgón o trabajar en la planta requiere tener la cabeza despejada y reflejos al 100%. Aquí cumplimos cero alcohol, cero drogas y cero humo. ¡Revisa bien el lugar!',
    hotspots: [
      {
        id: 'hs-conductor',
        x: 18,
        y: 75,
        titulo: 'Conductor con olor a alcohol',
        descripcion: 'Parece que tomó licor antes de salir a manejar el furgón con 400 kg de producto.',
        esPeligro: true,
        consejoGuia: 'No debe subir al vehículo. Hay que apartarlo de las zonas de riesgo y hacer la prueba preventiva con alcoholímetro.',
      },
      {
        id: 'hs-cigarrillo',
        x: 62,
        y: 62,
        titulo: 'Colilla de cigarrillo cerca de las cajas de cartón',
        descripcion: 'Riesgo muy alto de incendio junto a las cajas y bolsas de empaque.',
        esPeligro: true,
        consejoGuia: 'Frikaz S.A.S. es un lugar 100% libre de humo. Está prohibido fumar o usar vapeadores en toda la empresa.',
      },
      {
        id: 'hs-sendero',
        x: 52,
        y: 86,
        titulo: 'Sendero peatonal pintado en amarillo',
        descripcion: 'Camino seguro marcado en el piso para que las personas caminen sin cruzarse con los carros.',
        esPeligro: false,
        consejoGuia: '¡Muy bien! Camina siempre por las líneas amarillas para evitar accidentes con el furgón.',
      },
    ],
    desafioTerminal: {
      codigoProtocolo: 'FRK-ZERO-TOL',
      instruccion: 'Antes de encender el furgón o las máquinas, confirma la regla de Frikaz:',
      pregunta: '¿Cuánto alcohol está permitido en el cuerpo para empezar a trabajar?',
      opciones: [
        { id: 't2-1', etiqueta: '0.00 mg/L (Cero alcohol, tolerancia cero total)', esCorrecta: true },
        { id: 't2-2', etiqueta: 'Un poco, si la persona durmió más de 4 horas', esCorrecta: false },
        { id: 't2-3', etiqueta: 'Cualquier cantidad si toma dos tazas de café negro', esCorrecta: false },
      ],
    },
    compromisosClave: [
      {
        numero: 1,
        titulo: 'Cero alcohol y drogas en la jornada',
        descripcion:
          'No se puede llegar al trabajo ni trabajar habiendo tomado alcohol o consumido sustancias que alteren los sentidos.',
        aplicacionEnPlanta:
          'Pruebas de alcoholímetro de forma preventiva antes de prender freidoras o salir a ruta.',
      },
      {
        numero: 2,
        titulo: 'Prohibido fumar o usar vapeadores en toda la sede',
        descripcion:
          'Toda la fábrica, baños, vestieres y patios son libres de humo, para cuidar los alimentos y evitar incendios.',
        aplicacionEnPlanta:
          'Cero fósforos, encendedores o chispas cerca de la tubería de gas, aceites y cajas de cartón.',
      },
      {
        numero: 3,
        titulo: 'Apoyo a la salud y hábitos sanos',
        descripcion:
          'Charlas y acompañamiento con la aseguradora de riesgos (ARL) para cuidar el bienestar físico y mental, con respeto y reserva.',
        aplicacionEnPlanta:
          'Actividades cada mes sobre cómo manejar el estrés, dormir bien y cuidar la salud.',
      },
    ],
    responsabilidadesPorNivel: [
      {
        nivel: 'Gerencia y Vigía SST',
        responsabilidad: 'Organizar los controles preventivos con la ARL y mantener espacios seguros para todos.',
      },
      {
        nivel: 'Operarios y Conductores',
        responsabilidad: 'Llegar despejado al turno, avisar si tomas una medicina que dé sueño y decir no al consumo en el trabajo.',
      },
    ],
    escenario: {
      titulo: 'Inicio de turno: cuidado en la vía y en la planta',
      ubicacionPlanta: 'Planta Bosa – Patio de Cargue y Despacho',
      peligroAsociado: 'Riesgo de accidente de tránsito o quemadura por reflejos lentos y riesgo de incendio',
      descripcionCaso:
        'Lunes 6:00 AM. Al comenzar el día, se nota olor a licor y habla un poco enredada en un compañero que va a manejar el furgón hacia Soacha. Él dice que durmió 5 horas, que solo se tomó dos cervezas anoche y que se siente bien para manejar porque se sabe el camino de memoria. Al mismo tiempo, alguien dejó una colilla de cigarrillo apagada en un rincón del vestier, cerca de las cajas de cartón de empaque.',
      elementosInvolucrados: [
        'Compañero con posible alcoholemia antes de manejar',
        'Furgón con 400 kilos de producto listo para salir a la calle',
        'Colilla de cigarrillo junto a cajas de cartón inflamables',
        'Alcoholímetro listo para revisar de forma preventiva',
      ],
      desafioObservacion:
        'Según las reglas de Frikaz S.A.S. y la ley en Colombia, ¿cómo se debe actuar en esta situación con respeto y seguridad?',
      pistas: [
        'Consejo 1: La ley laboral (Código Sustantivo del Trabajo, Art. 60) prohíbe ir a trabajar en estado de embriaguez o bajo drogas.',
        'Consejo 2: En Colombia, la ley de tránsito (Ley 1696) multa desde el primer grado de alcohol (tolerancia cero).',
        'Consejo 3: En Frikaz está prohibido fumar en toda la empresa para evitar incendios y no contaminar los alimentos.',
      ],
    },
    preguntas: [
      {
        id: 'p2-1',
        numero: 1,
        enunciado:
          '¿Qué dice la regla de Frikaz S.A.S. si alguien llega con algo de alcohol de la noche anterior?',
        contextoCaso: 'Un compañero dice que tomó poco anoche y que se siente capaz de manejar o freír.',
        pesoPuntos: 25,
        fundamentoNormativo: 'Código Sustantivo del Trabajo Art. 60 y Ley 1566 de 2012.',
        opciones: [
          {
            id: 'opt-2-1-1',
            texto: 'Puede trabajar si se toma dos tazas de café bien cargado.',
            esCorrecta: false,
            retroalimentacion: 'Recuerda: el café quita un poco la sensación de cansancio, pero no saca el alcohol de la sangre ni devuelve los reflejos rápidos.',
          },
          {
            id: 'opt-2-1-2',
            texto: 'Tolerancia cero: no se puede trabajar en planta ni conducir con ningún grado de alcohol o drogas.',
            esCorrecta: true,
            retroalimentacion: '¡Correcto! Cero alcohol protege la vida del trabajador, la de sus compañeros y la de las personas en la calle.',
          },
          {
            id: 'opt-2-1-3',
            texto: 'Solo aplica al Gerente; los demás sí pueden trabajar si usan guantes.',
            esCorrecta: false,
            retroalimentacion: 'Esta regla nos cuida a todos por igual en la empresa, sin importar el cargo.',
          },
          {
            id: 'opt-2-1-4',
            texto: 'Se permite manejar si promete ir despacio por el carril derecho.',
            esCorrecta: false,
            retroalimentacion: 'La ley colombiana (Ley 1696 de 2013) y nuestras normas internas prohíben totalmente conducir con cualquier rastro de alcohol.',
          },
        ],
      },
      {
        id: 'p2-2',
        numero: 2,
        enunciado:
          'Si el médico de tu EPS te formuló una medicina que da sueño o quita concentración (por ejemplo para la alergia o el dolor), ¿qué debes hacer?',
        contextoCaso: 'Tomar medicamentos formulados que producen sueño durante el turno.',
        pesoPuntos: 25,
        fundamentoNormativo: 'Decreto 1072 de 2015 Art. 2.2.4.6.10.',
        opciones: [
          {
            id: 'opt-2-2-1',
            texto: 'No decirle a nadie para que no piensen mal en el trabajo.',
            esCorrecta: false,
            retroalimentacion: 'Ocultar que una pasta te da sueño mientras manejas carro o aceite caliente te pone en un peligro muy grande.',
          },
          {
            id: 'opt-2-2-2',
            texto: 'Avisar antes al encargado de SST y mostrar la fórmula médica para que te den otra tarea más segura mientras pasa el tratamiento.',
            esCorrecta: true,
            retroalimentacion: '¡Muy bien! Contar sobre tu salud permite que la empresa te ubique en una tarea sin riesgo de accidente mientras te recuperas.',
          },
          {
            id: 'opt-2-2-3',
            texto: 'Tomar doble pastilla para que se pase el efecto más rápido.',
            esCorrecta: false,
            retroalimentacion: 'Nunca tomes más medicina de la que mandó el médico; eso aumenta el sueño y daña tu salud.',
          },
          {
            id: 'opt-2-2-4',
            texto: 'Dejar de tomar el remedio y trabajar enfermo sin avisar.',
            esCorrecta: false,
            retroalimentacion: 'Tu salud es primero: no suspendas tu tratamiento, solo avisa para apoyarte con una labor segura.',
          },
        ],
      },
      {
        id: 'p2-3',
        numero: 3,
        enunciado:
          '¿Por qué no se puede fumar ni usar cigarrillo electrónico en ninguna parte de Frikaz (ni en baños, vestieres o patios)?',
        contextoCaso: 'Planta con gas natural, aceites y cajas de cartón.',
        pesoPuntos: 25,
        fundamentoNormativo: 'Ley 1335 de 2009 (Espacios libres de humo) y Res. 2400 de 1979.',
        opciones: [
          {
            id: 'opt-2-3-1',
            texto: 'Porque el humo ensucia los alimentos que fabricamos y una chispa o colilla puede iniciar un incendio cerca del gas y el cartón.',
            esCorrecta: true,
            retroalimentacion: '¡Exacto! Así protegemos la comida que comen las familias, cuidamos nuestros pulmones y evitamos incendios en planta.',
          },
          {
            id: 'opt-2-3-2',
            texto: 'Solo está prohibido si el cigarrillo no tiene filtro.',
            esCorrecta: false,
            retroalimentacion: 'Está prohibido todo tipo de cigarrillo, tabaco o vapeador dentro de la empresa.',
          },
          {
            id: 'opt-2-3-3',
            texto: 'Porque a los jefes no les gusta el olor del humo.',
            esCorrecta: false,
            retroalimentacion: 'No es un gusto personal: es una ley nacional de salud pública y una medida vital para evitar incendios.',
          },
          {
            id: 'opt-2-3-4',
            texto: 'Sí se puede fumar si uno se hace debajo de la campana extractora prendida.',
            esCorrecta: false,
            retroalimentacion: 'Mucho ojo: la campana acumula grasa y vapores; una sola chispa puede prender fuego dentro de todo el tubo extractor.',
          },
        ],
      },
      {
        id: 'p2-4',
        numero: 4,
        enunciado:
          'Si parece que un compañero llegó bajo efectos del alcohol, ¿cómo debe actuar la empresa?',
        contextoCaso: 'Al entrar al turno en la mañana.',
        pesoPuntos: 25,
        fundamentoNormativo: 'Sentencia C-636 de 2016 y Código Sustantivo del Trabajo.',
        opciones: [
          {
            id: 'opt-2-4-1',
            texto: 'Sacarlo a empujones a la calle sin hablar ni anotar nada.',
            esCorrecta: false,
            retroalimentacion: 'Todo trabajador merece respeto y un proceso claro y justo para cuidarlo.',
          },
          {
            id: 'opt-2-4-2',
            texto: 'Alejarlo de una vez de máquinas y vehículos, hacer la prueba con alcoholímetro frente a un testigo (Vigía o compañero) y dejar un acta clara.',
            esCorrecta: true,
            retroalimentacion: '¡Correcto! Primero se evita cualquier accidente en las máquinas o en la vía, se trata con respeto al compañero y se deja constancia transparente.',
          },
          {
            id: 'opt-2-4-3',
            texto: 'Ponerlo a trotar 5 vueltas por la bodega para que se le pase.',
            esCorrecta: false,
            retroalimentacion: 'Eso no quita el alcohol de la sangre y puede hacer que se caiga o se lesione.',
          },
          {
            id: 'opt-2-4-4',
            texto: 'Dejarlo empezar a freír y esperar a ver si comete un error.',
            esCorrecta: false,
            retroalimentacion: 'Nunca debemos esperar a que ocurra una quemadura o un choque cuando podemos evitarlo a tiempo.',
          },
        ],
      },
    ],
  },
  {
    id: 'FRK-SST-PR-01',
    codigoCalidad: 'FRK-SST-PR-01',
    titulo: 'CÓMO USAR Y VACIAR CON SEGURIDAD LAS FREIDORAS Y EL ACEITE',
    subtitulo: 'Pasos sencillos para freír a 180°C y sacar el aceite usado sin quemarnos',
    version: '01',
    fechaEmision: '2026-02-01',
    esObligatoria: true,
    icono: 'Flame',
    colorAcento: '#EA580C',
    insigniaNombre: 'Experto en Manejo Seguro de Freidoras',
    insigniaDescripcion: 'Dominas el control del calor, el escurrido de la papa y el vaciado seguro del aceite usado.',
    insigniaIcono: 'Award',
    resumenEjecutivo:
      'En Frikaz S.A.S. freímos papa y plátano en aceite vegetal hasta a 180°C con quemadores de gas. Aquí aprendes los pasos claros de todos los días: revisar la máquina antes de prenderla, escurrir bien la papa para que no tenga agua, apagar el fuego de forma segura si hay emergencia y esperar a que el aceite usado (ACU) se enfríe para sacarlo y entregarlo al gestor ambiental.',

    // Atributos del recorrido práctico
    imagenZona: '/assets/images/zone_eco_waste.webp',
    sectorPlantaNombre: 'Zona 3: Freidoras y Entrega Segura de Aceite Usado (ACU)',
    dificultad: 'Paso 3: Operación Segura',
    puntosXp: 450,
    dialogoGuiaBienvenida:
      '¡Llegaste a la zona de vaciado y cuidado ambiental! Sacar el aceite cuando aún está caliente es una de las causas más graves de quemaduras. ¡Revisa los recipientes y la temperatura antes de abrir cualquier llave!',
    hotspots: [
      {
        id: 'hs-balde',
        x: 45,
        y: 65,
        titulo: 'Balde plástico normal de casa',
        descripcion: 'Este plástico se ablanda y se rompe si le cae líquido a más de 80°C, regando todo.',
        esPeligro: true,
        consejoGuia: 'Nunca eches aceite ni líquidos calientes en baldes plásticos comunes.',
      },
      {
        id: 'hs-tambores',
        x: 18,
        y: 72,
        titulo: 'Canecas metálicas cerradas y marcadas (SDA)',
        descripcion: 'Recipientes seguros y tapados para guardar el aceite usado y entregarlo a la empresa ambiental autorizada.',
        esPeligro: false,
        consejoGuia: '¡Bien! Así cumplimos con la Secretaría de Ambiente (SDA) y cuidamos el agua de Bogotá.',
      },
      {
        id: 'hs-temp-drenaje',
        x: 75,
        y: 75,
        titulo: 'Aceite todavía a 140°C',
        descripcion: 'Sigue demasiado caliente. Si cae en la piel produce quemaduras muy profundas.',
        esPeligro: true,
        consejoGuia: 'Espera siempre a que el aceite baje a menos de 40°C (que ya esté tibio o frío) antes de abrir la llave.',
      },
    ],
    desafioTerminal: {
      codigoProtocolo: 'FRK-ACU-DISP',
      instruccion: 'Confirma el momento seguro para vaciar el aceite de la freidora:',
      pregunta: '¿A qué temperatura máxima debe estar el aceite para empezar a sacarlo?',
      opciones: [
        { id: 't3-1', etiqueta: 'Menos de 40°C (ya frío o tibio al tocar por fuera con guante)', esCorrecta: true },
        { id: 't3-2', etiqueta: 'A 120°C para que salga más rápido por la llave', esCorrecta: false },
        { id: 't3-3', etiqueta: 'Apenas se apague el quemador de gas', esCorrecta: false },
      ],
    },
    compromisosClave: [
      {
        numero: 1,
        titulo: 'Revisar la freidora antes de prenderla',
        descripcion:
          'Chequear los relojes de temperatura, perillas de gas, llaves de cierre y la campana antes de encender la llama.',
        aplicacionEnPlanta:
          'Llenar todos los días la hoja de revisión rápida de freidoras (FRK-SST-FOR-01).',
      },
      {
        numero: 2,
        titulo: 'Secar y escurrir bien la papa antes de freír',
        descripcion:
          'Asegurar que las rodajas de papa y plátano no lleven gotas de agua al caer al aceite caliente.',
        aplicacionEnPlanta:
          'Pasar por la centrifugadora o dejar escurrir en canastilla mínimo 7 minutos antes de freír.',
      },
      {
        numero: 3,
        titulo: 'Vaciar el aceite solo cuando esté frío (menos de 40°C)',
        descripcion:
          'Nunca sacar el aceite caliente al terminar el turno; dejarlo enfriar hasta el siguiente turno o descanso programado.',
        aplicacionEnPlanta:
          'Pasarlo con calma a las canecas metálicas marcadas para entregarlo al gestor autorizado por la Secretaría de Ambiente.',
      },
    ],
    responsabilidadesPorNivel: [
      {
        nivel: 'Operario de Frito',
        responsabilidad: 'Usar siempre tu kit térmico (para 200°C), vigilar que no pase de 180°C y nunca dejar la freidora encendida sola.',
      },
      {
        nivel: 'Mantenimiento y SST',
        responsabilidad: 'Revisar y calibrar los relojes de temperatura cada 3 meses y hacer mantenimiento a quemadores y chimeneas.',
      },
    ],
    escenario: {
      titulo: 'Vaciado del aceite usado al terminar el turno',
      ubicacionPlanta: 'Planta Bosa – Freidora #2 y Zona de Recolección',
      peligroAsociado: 'Quemadura grave por tocar o salpicarse con aceite muy caliente',
      descripcionCaso:
        'Son las 4:45 PM del viernes y la salida es a las 5:00 PM. El aceite de la freidora #2 ya está oscuro y hay que cambiarlo. Para irse rápido a casa, un operario piensa abrir la llave de abajo para sacar el aceite directamente en un balde plástico normal de la casa, aunque apagó la máquina hace apenas un momento y el aceite sigue a 140°C.',
      elementosInvolucrados: [
        'Aceite usado dentro de la freidora todavía a 140°C',
        'Llave de vaciado de la parte inferior',
        'Balde plástico normal que no resiste calor alto',
        'Afán por terminar rápido e irse a casa',
      ],
      desafioObservacion:
        '¿Por qué es tan riesgoso hacer esto y qué nos indica el paso a paso seguro de Frikaz S.A.S.?',
      pistas: [
        'Consejo 1: Los baldes de plástico común se derriten desde los 80°C y se rompen, regando todo el aceite caliente en piernas y pies.',
        'Consejo 2: La regla segura en Frikaz es vaciar el aceite únicamente cuando esté por debajo de 40°C (ya frío).',
      ],
    },
    preguntas: [
      {
        id: 'p3-1',
        numero: 1,
        enunciado:
          '¿A qué temperatura máxima debe estar el aceite usado (ACU) para poder sacarlo de la freidora?',
        contextoCaso: 'Pasar el aceite viejo de la freidora a las canecas de almacenamiento.',
        pesoPuntos: 34,
        fundamentoNormativo: 'Procedimiento seguro de freído FRK-SST-PR-01.',
        opciones: [
          {
            id: 'opt-3-1-1',
            texto: 'A 180°C apenas se apaga el fuego para que salga ligerito.',
            esCorrecta: false,
            retroalimentacion: 'Mucho cuidado: sacar aceite a 180°C suelta vapores fuertes y, si se riega, traspasa la ropa y causa quemaduras muy graves.',
          },
          {
            id: 'opt-3-1-2',
            texto: 'Por debajo de 40°C, después de dejar la freidora apagada y en reposo hasta que se enfríe.',
            esCorrecta: true,
            retroalimentacion: '¡Muy bien! Esperar a que baje de 40°C quita por completo el riesgo de quemaduras y evita que los envases se dañen.',
          },
          {
            id: 'opt-3-1-3',
            texto: 'A 100°C siempre y cuando uno tenga puesto el tapabocas.',
            esCorrecta: false,
            retroalimentacion: 'A 100°C el agua hierve y el aceite quema igual de fuerte; hay que esperar a que baje de 40°C.',
          },
        ],
      },
      {
        id: 'p3-2',
        numero: 2,
        enunciado:
          '¿Por qué nunca debes usar un balde plástico común de casa para recibir líquidos calientes en la planta?',
        contextoCaso: 'Uso de recipientes que no son resistentes al calor.',
        pesoPuntos: 33,
        fundamentoNormativo: 'Resolución 2400 de 1979 y ficha de seguridad de envases.',
        opciones: [
          {
            id: 'opt-3-2-1',
            texto: 'Porque ese plástico se derrite y se rompe si pasa de 80°C, derramando el líquido caliente sobre tus piernas y pies.',
            esCorrecta: true,
            retroalimentacion: '¡Exacto! El plástico normal se ablanda de golpe con el calor, se le cae el fondo y riega todo encima de quien lo sostiene.',
          },
          {
            id: 'opt-3-2-2',
            texto: 'Solo porque el color del balde no combina con el uniforme.',
            esCorrecta: false,
            retroalimentacion: 'No es por estética: es porque el calor derrite ese material y puede causarte un accidente serio.',
          },
          {
            id: 'opt-3-2-3',
            texto: 'Porque suena muy duro al arrastrarlo por la baldosa.',
            esCorrecta: false,
            retroalimentacion: 'El peligro real es que el balde se derrite y suelta el aceite encima de tus pies.',
          },
        ],
      },
      {
        id: 'p3-3',
        numero: 3,
        enunciado:
          '¿Qué debemos hacer con el Aceite de Cocina Usado (ACU) que ya se sacó de las freidoras de Frikaz S.A.S.?',
        contextoCaso: 'Cuidado del agua y cumplimiento con la Secretaría de Ambiente (SDA).',
        pesoPuntos: 33,
        fundamentoNormativo: 'Resolución 316 de 2018 y Procedimiento ambiental FRK-SST-PR-02.',
        opciones: [
          {
            id: 'opt-3-3-1',
            texto: 'Botarlo por la rejilla del piso echándole agua caliente para que no tape el tubo.',
            esCorrecta: false,
            retroalimentacion: '¡Nunca hagas eso! Está prohibido por ley: un solo litro de aceite contamina miles de litros de agua, tapa las tuberías y genera multas muy altas para la empresa.',
          },
          {
            id: 'opt-3-3-2',
            texto: 'Guardarlo en las canecas cerradas y marcadas, y entregarlo solo a la empresa ambiental autorizada con su recibo de entrega.',
            esCorrecta: true,
            retroalimentacion: '¡Excelente! En Frikaz reciclamos el aceite usado de forma responsable y guardamos cada comprobante de entrega.',
          },
          {
            id: 'opt-3-3-3',
            texto: 'Regalarlo en botellas a los vecinos para echarle a las matas.',
            esCorrecta: false,
            retroalimentacion: 'El aceite quemado daña la tierra y las plantas, y la ley prohíbe entregarlo sin autorización.',
          },
        ],
      },
    ],
  },
];

const MIGRATION_KEY_POLITICAS_PLAIN = 'frikaz_mision_politicas_plain_lang_v1';

export function getStoredPoliticasMision(): PoliticaMisionFrikaz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLITICAS_CONFIG);
    const migrated = localStorage.getItem(MIGRATION_KEY_POLITICAS_PLAIN);
    if (!raw || !migrated) {
      let base = POLITICAS_MISION_BASE;
      if (raw) {
        try {
          const prev = JSON.parse(raw);
          if (Array.isArray(prev)) {
            const obligatoriaMap = new Map(
              prev.map((p: Partial<PoliticaMisionFrikaz>) => [p.id, p.esObligatoria])
            );
            base = POLITICAS_MISION_BASE.map((p) =>
              typeof obligatoriaMap.get(p.id) === 'boolean'
                ? { ...p, esObligatoria: obligatoriaMap.get(p.id)! }
                : p
            );
          }
        } catch {
          // ignore malformed previous config
        }
      }
      localStorage.setItem(STORAGE_KEY_POLITICAS_CONFIG, JSON.stringify(base));
      localStorage.setItem(MIGRATION_KEY_POLITICAS_PLAIN, '1');
      return base;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === POLITICAS_MISION_BASE.length) {
      return parsed;
    }
    return POLITICAS_MISION_BASE;
  } catch (err) {
    console.error('Error cargando políticas de Misión Frikaz:', err);
    return POLITICAS_MISION_BASE;
  }
}

export function saveStoredPoliticasMision(politicas: PoliticaMisionFrikaz[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_POLITICAS_CONFIG, JSON.stringify(politicas));
  } catch (err) {
    console.error('Error guardando políticas de Misión Frikaz:', err);
  }
}

export function getStoredTrabajadores(): TrabajadorFrikaz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRABAJADORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TRABAJADORES, JSON.stringify(TRABAJADORES_CANONICOS));
      return TRABAJADORES_CANONICOS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== TRABAJADORES_CANONICOS.length) {
      localStorage.setItem(STORAGE_KEY_TRABAJADORES, JSON.stringify(TRABAJADORES_CANONICOS));
      return TRABAJADORES_CANONICOS;
    }
    // Asegurar que solo contenga los 6 cargos autorizados con sus avatares ilustrados oficiales
    const canonicosMap = new Map(TRABAJADORES_CANONICOS.map((t) => [t.id, t]));
    const tieneInvalidos = parsed.some((t) => !canonicosMap.has(t.id) || (t.avatarUrl && t.avatarUrl.includes('unsplash')));
    if (tieneInvalidos) {
      localStorage.setItem(STORAGE_KEY_TRABAJADORES, JSON.stringify(TRABAJADORES_CANONICOS));
      return TRABAJADORES_CANONICOS;
    }
    return parsed.map((t: TrabajadorFrikaz) => {
      const canon = canonicosMap.get(t.id);
      return {
        ...t,
        avatarUrl: canon ? canon.avatarUrl : t.avatarUrl,
        cargoNombre: canon ? canon.cargoNombre : t.cargoNombre,
      };
    });
  } catch (err) {
    console.error('Error cargando trabajadores:', err);
    return TRABAJADORES_CANONICOS;
  }
}

export function getStoredSesionActiva(): TrabajadorFrikaz {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESION_ACTIVA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        // Cotejar con la lista canónica para evitar nombres ficticios persistidos de sesiones anteriores
        const coincide = TRABAJADORES_CANONICOS.find((t) => t.id === parsed.id || t.cargoId === parsed.cargoId);
        if (coincide) return coincide;
      }
    }
  } catch (err) {
    console.error('Error leyendo sesión activa:', err);
  }
  // Por defecto el primer operario de planta (Operario de Frito) para activación obligatoria de la Misión
  return TRABAJADORES_CANONICOS[0];
}

export function setStoredSesionActiva(trabajador: TrabajadorFrikaz): void {
  try {
    localStorage.setItem(STORAGE_KEY_SESION_ACTIVA, JSON.stringify(trabajador));
  } catch (err) {
    console.error('Error guardando sesión activa:', err);
  }
}

export async function validarAccesoBackend(
  trabajadorId: string,
  cargoId?: string
): Promise<{
  accesoAutorizado: boolean;
  totalObligatorias: number;
  totalSuperadas: number;
  misionesPendientes: string[];
  mensaje: string;
}> {
  try {
    const res = await fetch('/api/mision-frikaz/validar-acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trabajadorId, cargoId }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        accesoAutorizado: Boolean(data.accesoAutorizado),
        totalObligatorias: data.totalObligatorias || 3,
        totalSuperadas: data.totalSuperadas || 0,
        misionesPendientes: data.misionesPendientes || [],
        mensaje: data.mensaje || '',
      };
    }
  } catch (err) {
    console.warn('[Misión Frikaz] Error conectando con el validador de backend:', err);
  }

  // Fallback seguro del lado cliente
  const pasaporte = getPasaporteDigital(trabajadorId);
  return {
    accesoAutorizado: pasaporte.esEmbajadorFrikaz,
    totalObligatorias: pasaporte.totalObligatorias,
    totalSuperadas: pasaporte.totalSuperadas,
    misionesPendientes: pasaporte.esEmbajadorFrikaz ? [] : ['FRK-SST-POL-01'],
    mensaje: pasaporte.esEmbajadorFrikaz
      ? 'Ya completaste tus recorridos de seguridad. Puedes entrar a toda la herramienta.'
      : 'Antes de entrar, completa los recorridos cortos de seguridad que te faltan.',
  };
}

export function getStoredProgresos(): Record<string, Record<string, ProgresoPoliticaTrabajador>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESOS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo progresos:', err);
  }
  return {};
}

export function saveStoredProgresos(
  progresos: Record<string, Record<string, ProgresoPoliticaTrabajador>>
): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESOS, JSON.stringify(progresos));
  } catch (err) {
    console.error('Error guardando progresos:', err);
  }
}

export function getStoredIntentos(): IntentoEvaluacion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INTENTOS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo intentos:', err);
  }
  return [];
}

export function saveStoredIntentos(intentos: IntentoEvaluacion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_INTENTOS, JSON.stringify(intentos));
  } catch (err) {
    console.error('Error guardando intentos:', err);
  }
}

// ----------------------------------------------------------------------------
// OBTENCIÓN Y CÁLCULO DEL PASAPORTE DIGITAL
// ----------------------------------------------------------------------------

export function getPasaporteDigital(trabajadorId: string): PasaporteDigital {
  const trabajadores = getStoredTrabajadores();
  const trabajador = trabajadores.find((t) => t.id === trabajadorId) || TRABAJADORES_CANONICOS[0];
  const politicas = getStoredPoliticasMision();
  const todosLosProgresos = getStoredProgresos();
  const trabajadorProgresos = todosLosProgresos[trabajadorId] || {};

  const obligatorias = politicas.filter((p) => p.esObligatoria);
  let totalSuperadas = 0;

  const progresosCompletos: Record<string, ProgresoPoliticaTrabajador> = {};
  const insignias: InsigniaDigital[] = [];

  for (const pol of politicas) {
    const prog = trabajadorProgresos[pol.id] || {
      politicaId: pol.id,
      estado: 'PENDIENTE',
      puntajeMaximo: 0,
      intentosTotales: 0,
    };
    progresosCompletos[pol.id] = prog;

    if (prog.estado === 'SUPERADA') {
      if (pol.esObligatoria) totalSuperadas++;
    }

    insignias.push({
      id: `insignia-${pol.id}`,
      politicaId: pol.id,
      nombre: pol.insigniaNombre,
      descripcion: pol.insigniaDescripcion,
      icono: pol.insigniaIcono,
      colorGradiente: pol.colorAcento,
      fechaObtencion: prog.fechaSuperacion,
      obtenida: prog.estado === 'SUPERADA',
    });
  }

  const porcentajeAvance =
    obligatorias.length > 0
      ? Math.round((totalSuperadas / obligatorias.length) * 100)
      : 100;

  const esEmbajadorFrikaz = totalSuperadas >= obligatorias.length && obligatorias.length > 0;

  return {
    trabajador,
    progresos: progresosCompletos,
    insignias,
    porcentajeAvance,
    totalObligatorias: obligatorias.length,
    totalSuperadas,
    esEmbajadorFrikaz,
    fechaAcreditacionEmbajador: esEmbajadorFrikaz ? new Date().toISOString() : undefined,
  };
}

// ----------------------------------------------------------------------------
// EVALUACIÓN DE RESPUESTAS (FRONTEND + LLAMADA AL BACKEND)
// ----------------------------------------------------------------------------

export interface EvaluacionPayload {
  trabajadorId: string;
  politicaId: string;
  respuestas: {
    preguntaId: string;
    opcionSeleccionadaId: string;
  }[];
  duracionSegundos: number;
}

export interface ResultadoEvaluacion {
  intento: IntentoEvaluacion;
  aprobado: boolean;
  puntaje: number;
  pasaporteActualizado: PasaporteDigital;
  retroalimentaciones: {
    preguntaId: string;
    esCorrecta: boolean;
    textoRetroalimentacion: string;
  }[];
  mensajeServidor?: string;
}

export async function procesarEvaluacionMision(
  payload: EvaluacionPayload
): Promise<ResultadoEvaluacion> {
  const politicas = getStoredPoliticasMision();
  const politica = politicas.find((p) => p.id === payload.politicaId);
  const trabajadores = getStoredTrabajadores();
  const trabajador = trabajadores.find((t) => t.id === payload.trabajadorId) || TRABAJADORES_CANONICOS[0];

  if (!politica) {
    throw new Error(`Política no encontrada: ${payload.politicaId}`);
  }

  // 1. Calificar localmente para respuesta inmediata y resiliente
  let puntosTotales = 0;
  let puntosPosibles = 0;
  const respuestasDetalle: any[] = [];
  const retroalimentaciones: any[] = [];

  for (const pregunta of politica.preguntas) {
    puntosPosibles += pregunta.pesoPuntos;
    const respUsuario = payload.respuestas.find((r) => r.preguntaId === pregunta.id);
    const opcionSeleccionada = pregunta.opciones.find(
      (o) => o.id === (respUsuario ? respUsuario.opcionSeleccionadaId : '')
    );

    const esCorrecta = Boolean(opcionSeleccionada && opcionSeleccionada.esCorrecta);
    const puntosObtenidos = esCorrecta ? pregunta.pesoPuntos : 0;
    puntosTotales += puntosObtenidos;

    respuestasDetalle.push({
      preguntaId: pregunta.id,
      opcionSeleccionadaId: respUsuario?.opcionSeleccionadaId || '',
      esCorrecta,
      puntosObtenidos,
    });

    retroalimentaciones.push({
      preguntaId: pregunta.id,
      esCorrecta,
      textoRetroalimentacion:
        opcionSeleccionada?.retroalimentacion ||
        'Por favor elige una de las opciones de esta pregunta.',
    });
  }

  const puntaje = puntosPosibles > 0 ? Math.round((puntosTotales / puntosPosibles) * 100) : 0;
  const aprobado = puntaje >= 80;

  // 2. Registrar el intento
  const todosLosIntentos = getStoredIntentos();
  const intentosPrevios = todosLosIntentos.filter(
    (i) => i.trabajadorId === trabajador.id && i.politicaId === politica.id
  );
  const numeroIntento = intentosPrevios.length + 1;

  const nuevoIntento: IntentoEvaluacion = {
    id: `intento-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    trabajadorId: trabajador.id,
    trabajadorNombre: trabajador.nombre,
    trabajadorCargo: trabajador.cargoNombre,
    trabajadorCedula: trabajador.cedula,
    politicaId: politica.id,
    politicaCodigo: politica.codigoCalidad,
    politicaTitulo: politica.titulo,
    fechaInicio: new Date(Date.now() - payload.duracionSegundos * 1000).toISOString(),
    fechaFin: new Date().toISOString(),
    duracionSegundos: payload.duracionSegundos,
    puntaje,
    aprobado,
    numeroIntento,
    respuestas: respuestasDetalle,
  };

  todosLosIntentos.unshift(nuevoIntento);
  saveStoredIntentos(todosLosIntentos);

  // 3. Actualizar progreso del trabajador
  const todosLosProgresos = getStoredProgresos();
  if (!todosLosProgresos[trabajador.id]) {
    todosLosProgresos[trabajador.id] = {};
  }

  const progresoActual = todosLosProgresos[trabajador.id][politica.id] || {
    politicaId: politica.id,
    estado: 'PENDIENTE',
    puntajeMaximo: 0,
    intentosTotales: 0,
  };

  const nuevoPuntajeMax = Math.max(progresoActual.puntajeMaximo, puntaje);
  const nuevoEstado = aprobado
    ? 'SUPERADA'
    : progresoActual.estado === 'SUPERADA'
    ? 'SUPERADA'
    : 'NO_SUPERADA';

  todosLosProgresos[trabajador.id][politica.id] = {
    politicaId: politica.id,
    estado: nuevoEstado,
    puntajeMaximo: nuevoPuntajeMax,
    intentosTotales: progresoActual.intentosTotales + 1,
    fechaUltimoIntento: nuevoIntento.fechaFin,
    fechaSuperacion: aprobado ? nuevoIntento.fechaFin : progresoActual.fechaSuperacion,
  };

  saveStoredProgresos(todosLosProgresos);

  // 4. Intentar enviar al backend Express para trazabilidad en servidor y Google Sheets
  let mensajeServidor: string | undefined;
  try {
    const res = await fetch('/api/mision-frikaz/evaluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoIntento),
    });
    if (res.ok) {
      const data = await res.json();
      mensajeServidor = data.message;
      nuevoIntento.sincronizadoGoogleSheets = data.sincronizadoGoogleSheets;
    }
  } catch {
    // Si el backend no responde, la experiencia frontend y la persistencia local siguen funcionando al 100%
  }

  const pasaporteActualizado = getPasaporteDigital(trabajador.id);

  return {
    intento: nuevoIntento,
    aprobado,
    puntaje,
    pasaporteActualizado,
    retroalimentaciones,
    mensajeServidor,
  };
}

// ----------------------------------------------------------------------------
// VERIFICAR SI EL TRABAJADOR TIENE POLÍTICAS PENDIENTES (GATEKEEPER)
// ----------------------------------------------------------------------------
export function tienePoliticasPendientes(trabajadorId: string): boolean {
  const pasaporte = getPasaporteDigital(trabajadorId);
  // Todo colaborador con misiones obligatorias pendientes debe ingresar obligatoriamente al juego
  return !pasaporte.esEmbajadorFrikaz;
}

// ----------------------------------------------------------------------------
// OBTENER MÉTRICAS ADMINISTRATIVAS
// ----------------------------------------------------------------------------
export function getMetricasAdminMision(): MetricasAdminMisionFrikaz {
  const trabajadores = getStoredTrabajadores();
  const politicas = getStoredPoliticasMision();
  const intentos = getStoredIntentos();

  let totalCompletados100 = 0;
  let totalEnProceso = 0;

  for (const t of trabajadores) {
    const pasaporte = getPasaporteDigital(t.id);
    if (pasaporte.esEmbajadorFrikaz) {
      totalCompletados100++;
    } else {
      totalEnProceso++;
    }
  }

  const intentosAprobados = intentos.filter((i) => i.aprobado).length;
  const tasaAprobacionGlobal =
    intentos.length > 0 ? Math.round((intentosAprobados / intentos.length) * 100) : 0;

  // Promedios por política
  const promedioIntentosPorPolitica: Record<string, number> = {};
  for (const pol of politicas) {
    const intentosPol = intentos.filter((i) => i.politicaId === pol.id);
    if (intentosPol.length > 0) {
      const sumaPuntajes = intentosPol.reduce((acc, curr) => acc + curr.puntaje, 0);
      promedioIntentosPorPolitica[pol.id] = Math.round(sumaPuntajes / intentosPol.length);
    } else {
      promedioIntentosPorPolitica[pol.id] = 0;
    }
  }

  // Identificar preguntas más falladas
  const conteoFallosPorPregunta: Record<string, { fallos: number; total: number; enunciado: string; politicaId: string }> = {};

  for (const pol of politicas) {
    for (const preg of pol.preguntas) {
      conteoFallosPorPregunta[preg.id] = {
        fallos: 0,
        total: 0,
        enunciado: preg.enunciado,
        politicaId: pol.id,
      };
    }
  }

  for (const intento of intentos) {
    for (const r of intento.respuestas) {
      if (conteoFallosPorPregunta[r.preguntaId]) {
        conteoFallosPorPregunta[r.preguntaId].total++;
        if (!r.esCorrecta) {
          conteoFallosPorPregunta[r.preguntaId].fallos++;
        }
      }
    }
  }

  const preguntasMasFalladas = Object.entries(conteoFallosPorPregunta)
    .filter(([_, data]) => data.total > 0)
    .map(([preguntaId, data]) => ({
      politicaId: data.politicaId,
      preguntaId,
      enunciado: data.enunciado,
      tasaFallo: Math.round((data.fallos / data.total) * 100),
    }))
    .sort((a, b) => b.tasaFallo - a.tasaFallo)
    .slice(0, 5);

  return {
    totalTrabajadores: trabajadores.length,
    totalCompletados100,
    totalEnProceso,
    tasaAprobacionGlobal,
    promedioIntentosPorPolitica,
    preguntasMasFalladas,
    ultimosIntentos: intentos.slice(0, 20),
  };
}
