import type { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';
import type {
  ActividadPrimerosAuxiliosBrigada,
  CajaCalidadEditable,
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
  PlanEmergenciasFrikaz,
  PlanMejoraPorRiesgo,
  RegistroAsistenciaItem,
} from '../types/planAnualMejoraEmergencias';
import { crearRiesgoSnapshot, extraerMedidasRiesgo } from './planAnualService';
import { resolverCargoPrincipalYExpuestos } from '../data/cargosOficiales';

// ============================================================================
// UTILIDADES DE CAJA DE CALIDAD Y LISTAS BASE (SIN INVENTAR CÓDIGOS NI APROBACIONES)
// ============================================================================

export function crearCajaCalidadEditable(nombreDocumento: string): CajaCalidadEditable {
  return {
    empresa: 'Frikaz S.A.S.',
    nombreDocumento,
    codigo: 'Pendiente por asignar',
    version: 'Pendiente por definir',
    fechaElaboracionActualizacion: 'Pendiente por definir',
    elaboro: 'Pendiente por definir',
    reviso: 'Pendiente por definir',
    aprobo: 'Pendiente por aprobación de Gerencia',
  };
}

function crearFilasAsistenciaVacias(cantidad: number = 10): RegistroAsistenciaItem[] {
  return Array.from({ length: cantidad }, (_, idx) => ({
    id: `asis-${idx + 1}`,
    nombreTrabajador: '',
    cargo: '',
    fecha: '',
    asistio: false,
    firmaOConfirmacion: '',
  }));
}

function crearFilasTablaVacias(columnas: number, filas: number = 10): string[][] {
  return Array.from({ length: filas }, () => Array.from({ length: columnas }, () => ''));
}

// ============================================================================
// 1. FORMATOS EDITABLES Y DESCARGABLES EN WORD (.DOCX)
//    - No inventan códigos ni aprobaciones.
//    - Llenarlos o descargarlos NO marca el plan como Cumplido ni Aprobado.
// ============================================================================

export function crearFormatosSeed(): Record<string, FormatoEditableDocumento> {
  const formatos: FormatoEditableDocumento[] = [
    // --- FORMATOS PARA PLANES DE MEJORA POR RIESGO ---
    {
      id: 'fmt-inspeccion-calor-freidoras',
      titulo: 'Lista de chequeo de zona de fritura y protección contra el calor',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'calor_extremo',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE ZONA DE FRITURA Y PROTECCIÓN CONTRA EL CALOR'
      ),
      instruccionesUso:
        'Revisar este formato antes de encender las freidoras y una vez por semana. Anote si todo está en buen estado o qué falta por corregir. Llenar este formato NO aprueba automáticamente el plan; guárdelo y entréguelo para revisión de Gerencia.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de revisión', valor: '' },
        { id: 'responsable', etiqueta: 'Persona que revisa', valor: '' },
        { id: 'area', etiqueta: 'Área revisada', valor: 'Área de fritura / cocción' },
        { id: 'turno', etiqueta: 'Turno', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'c1',
          criterio: '¿La temperatura y el termostato de las freidoras funcionan sin fallas?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'c2',
          criterio: '¿La campana extractora está prendida y saca el vapor y calor hacia afuera?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'c3',
          criterio: '¿Los operarios tienen guantes largos para calor, delantal resistente y careta en buen estado?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'c4',
          criterio: '¿Hay agua fresca y potable cerca para que el equipo tome pausas de hidratación?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'c5',
          criterio: '¿El piso alrededor de la freidora está limpio y seco (sin gotas de aceite)?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inspeccion-ruido-auditiva',
      titulo: 'Lista de chequeo de máquinas ruidosas y uso de protectores de oídos',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'ruido_constante',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE MÁQUINAS RUIDOSAS Y PROTECCIÓN AUDITIVA'
      ),
      instruccionesUso:
        'Usar para verificar si las máquinas están haciendo más ruido de lo normal y confirmar que quienes trabajan cerca usan bien sus protectores de oído.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de inspección', valor: '' },
        { id: 'responsable', etiqueta: 'Quien realiza la revisión', valor: '' },
        { id: 'zona', etiqueta: 'Zona / Máquinas revisadas', valor: 'Peladora, rebanadora y extractor' },
      ],
      itemsVerificacion: [
        {
          id: 'r1',
          criterio: '¿La peladora, rebanadora y extractor suenan parejo sin golpes ni vibración fuerte?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'r2',
          criterio: '¿Los tornillos y bases de caucho de los motores están firmes?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'r3',
          criterio: '¿Todos los trabajadores de la zona tienen tapaoídos limpios y en buen estado?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'r4',
          criterio: '¿Está pendiente o vigente la medición técnica de ruido (sonometría) en planta?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inspeccion-maquinaria-atrapamiento',
      titulo: 'Lista de chequeo de tapas protectoras y seguridad en máquinas',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'atrapamiento',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE RESGUARDOS Y SEGURIDAD EN MÁQUINAS (PREVENCIÓN DE ATRAPAMIENTO)'
      ),
      instruccionesUso:
        'Verificar antes de iniciar producción. NUNCA encienda o limpie una máquina sin sus tapas puestas o mientras esté conectada.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable de inspección', valor: '' },
        { id: 'equipo', etiqueta: 'Máquina revisada', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'm1',
          criterio: '¿Todas las cadenas, correas, poleas y cuchillas tienen su tapa o malla puesta?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'm2',
          criterio: '¿El botón rojo de parada rápida funciona y está libre de obstáculos?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'm3',
          criterio: '¿Los trabajadores están usando uniforme ajustado, cofia y sin anillos, relojes o pulseras?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'm4',
          criterio: '¿Se desconecta la máquina y se avisa con tarjeta antes de limpiarla o revisarla?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inspeccion-electrica',
      titulo: 'Lista de chequeo visual de tableros, cables y tomas eléctricas',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'riesgo_electrico',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO VISUAL DE TABLEROS, CABLES Y TOMAS ELÉCTRICAS'
      ),
      instruccionesUso:
        'Inspección únicamente visual sin abrir tableros ni tocar cables. Si ve cables pelados, olor a quemado o humedad cerca a tomas, NO los toque y avise de inmediato a Gerencia para llamar a un electricista autorizado.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de recorrido', valor: '' },
        { id: 'responsable', etiqueta: 'Quien revisa (inspección visual)', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'e1',
          criterio: '¿Las cajas de tableros eléctricos están cerradas, con tapa interna y sin cables sueltos?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'e2',
          criterio: '¿El espacio frente al tablero eléctrico está libre de cajas o canastillas (mínimo 1 metro)?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'e3',
          criterio: '¿Los enchufes y extensiones están secos, sin agua ni aceite y sin cables pelados?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'e4',
          criterio: '¿Los tacos (interruptores) tienen letrero claro que indique qué máquina apagan?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inspeccion-gas',
      titulo: 'Lista de chequeo diario de tuberías, llaves y quemadores de gas',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'fuga_gas',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE INSTALACIONES, LLAVES Y QUEMADORES DE GAS'
      ),
      instruccionesUso:
        'Revisar al abrir y cerrar la planta. Nunca use fósforos o encendedores para buscar fugas. Si huele a gas, cierre la llave principal solo si es seguro, abra puertas, no prenda ni apague interruptores eléctricos y salga.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable de apertura/cierre', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'g1',
          criterio: '¿Al entrar a la planta NO se siente olor a gas?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'g2',
          criterio: '¿La llave principal de corte rápido de gas está señalizada y sin nada que estorbe?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'g3',
          criterio: '¿La llama de los quemadores es azul y pareja (no amarilla ni con hollín)?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'g4',
          criterio: '¿Las mangueras, uniones y válvulas se ven firmes, sin golpes ni óxido?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'g5',
          criterio: '¿Al terminar el turno quedaron cerradas las llaves de las freidoras y la llave general?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inspeccion-orden-aseo',
      titulo: 'Lista de chequeo de orden, aseo, pisos secos y pasillos libres',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'orden_aseo',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE ORDEN, ASEO, PISOS SEGUROS Y PASILLOS DESPEJADOS'
      ),
      instruccionesUso:
        'Revisar en todas las áreas (selección, pelado, fritura, empaque y bodega) para evitar caídas, tropiezos y acumulación de grasa.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha', valor: '' },
        { id: 'responsable', etiqueta: 'Persona que revisa', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'o1',
          criterio: '¿Los pasillos y puertas están libres de canastillas, cajas o cables atravesados?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'o2',
          criterio: '¿Cuando el piso está mojado o lavándose, se coloca el aviso amarillo de piso húmedo?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'o3',
          criterio: '¿Los arrumes de cajas no superan 1.50 metros ni se ven inclinados?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'o4',
          criterio: '¿Las grasas o restos de aceite derramados en el piso se limpian de inmediato?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'o5',
          criterio: '¿Las botas de los trabajadores conservan buen labrado antideslizante en la suela?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-inventario-quimicos',
      titulo: 'Inventario de productos químicos, etiquetas SGA y fichas de seguridad (FDS)',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'productos_quimicos',
      cajaCalidad: crearCajaCalidadEditable(
        'INVENTARIO DE PRODUCTOS QUÍMICOS, ETIQUETAS Y FICHAS DE SEGURIDAD'
      ),
      instruccionesUso:
        'Registre aquí únicamente los productos químicos que realmente existen hoy en Frikaz S.A.S. (no invente ni copie productos que no usa). Verifique que cada envase tenga etiqueta clara y su hoja de seguridad a la mano.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de verificación en planta', valor: '' },
        { id: 'responsable', etiqueta: 'Quien realiza el inventario', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'q1',
          criterio: '¿Todos los frascos y canecas (incluidos reenvasados) tienen etiqueta con el nombre y dibujo de peligro?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'q2',
          criterio: '¿Está prohibido reenvasar químicos en botellas de gaseosa, agua o alimentos?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'q3',
          criterio: '¿Las Fichas de Datos de Seguridad (FDS) reales de los productos están en carpeta visible?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'q4',
          criterio: '¿Quien prepara las mezclas usa guantes gruesos de nitrilo y gafas cerradas sin mezclar cloro con otros productos?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Listado real de productos químicos verificados en Frikaz S.A.S.',
        columnas: [
          'Nombre real del producto',
          'Uso en la planta',
          '¿Tiene etiqueta?',
          '¿Tiene FDS?',
          'Guantes / gafas requeridos',
        ],
        filas: crearFilasTablaVacias(5, 8),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-ergonomia-pausas',
      titulo: 'Lista de chequeo de posturas, levantamiento de cargas y pausas activas',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'biomecanico',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE POSTURAS, CARGAS SEGURAS Y PAUSAS ACTIVAS'
      ),
      instruccionesUso:
        'Aplique esta lista en selección, pelado, empaque, bodega y carga de vehículo para revisar si se están cuidando la espalda, hombros y muñecas.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de verificación', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'b1',
          criterio: '¿Los trabajadores doblan las rodillas y mantienen la espalda recta al levantar cajas o bultos?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'b2',
          criterio: '¿Se usa carretilla o ayuda entre dos personas cuando la carga es pesada (>25 kg hombres / >12.5 kg mujeres)?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'b3',
          criterio: '¿Se realizan pausas activas y estiramientos cortos en la mañana y en la tarde?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'b4',
          criterio: '¿Hay tapetes cómodos o rotación de tareas en selección y sellado de bolsas?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-entrega-epp',
      titulo: 'Formato de entrega, revisión y reposición de EPP (Elementos de Protección Personal)',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'calor_extremo',
      cajaCalidad: crearCajaCalidadEditable(
        'REGISTRO DE ENTREGA Y REVISIÓN DE ELEMENTOS DE PROTECCIÓN PERSONAL (EPP)'
      ),
      instruccionesUso:
        'Anote cada elemento entregado al trabajador (guantes térmicos, tapaoídos, gafas, botas, delantal, careta). El trabajador firma cuando lo recibe en buen estado.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de entrega / revisión', valor: '' },
        { id: 'responsable', etiqueta: 'Quien entrega', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'ep1',
          criterio: '¿Se explicó al trabajador cómo usar, limpiar y guardar su elemento de protección?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ep2',
          criterio: '¿Los elementos entregados corresponden al peligro real del puesto de trabajo?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Control individual de entregas (máximo 10 trabajadores)',
        columnas: ['Fecha', 'Nombre del trabajador', 'Cargo', 'Elemento entregado', 'Estado / Firma'],
        filas: crearFilasTablaVacias(5, 10),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-registro-capacitacion-riesgos',
      titulo: 'Registro de capacitación y lista de asistencia de trabajadores',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'general',
      cajaCalidad: crearCajaCalidadEditable(
        'REGISTRO DE CAPACITACIÓN Y LISTA DE ASISTENCIA DE TRABAJADORES'
      ),
      instruccionesUso:
        'Use este formato cada vez que dicte una charla o capacitación del Plan de Mejora. Todos los asistentes deben anotar su nombre, cargo y firma. Adjuntar este formato completado como evidencia para revisión de Gerencia.',
      camposEncabezado: [
        { id: 'tema', etiqueta: 'Nombre de la capacitación', valor: '' },
        { id: 'fecha', etiqueta: 'Fecha', valor: '' },
        { id: 'duracion', etiqueta: 'Duración', valor: '' },
        { id: 'facilitador', etiqueta: 'Persona que dicta la charla', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'cap1',
          criterio: '¿Se explicó el tema con ejemplos reales de Frikaz S.A.S. y lenguaje sencillo?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'cap2',
          criterio: '¿Se realizó la actividad corta o preguntas para confirmar que el equipo entendió?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Listado de asistencia (Frikaz S.A.S.)',
        columnas: ['N.°', 'Nombre completo del trabajador', 'Cargo / Área', 'Firma o confirmación'],
        filas: Array.from({ length: 10 }, (_, idx) => [String(idx + 1), '', '', '']),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-reporte-incidentes-condiciones',
      titulo: 'Formato de reporte de incidentes, accidentes o condiciones inseguras',
      categoria: 'PLAN_MEJORA_RIESGO',
      riesgoClave: 'robos',
      cajaCalidad: crearCajaCalidadEditable(
        'FORMATO DE REPORTE DE INCIDENTES, CASI ACCIDENTES O CONDICIONES INSEGURAS'
      ),
      instruccionesUso:
        'Cualquier trabajador puede usar este formato para avisar una falla en máquina, piso resbaloso, olor a gas, robo/inseguridad o casi-accidente antes de que ocurra una lesión.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha y hora del hecho', valor: '' },
        { id: 'reporta', etiqueta: 'Persona que reporta', valor: '' },
        { id: 'area', etiqueta: 'Área o ruta donde ocurrió', valor: '' },
        { id: 'tipo', etiqueta: 'Tipo (Condición insegura / Incidente / Robo)', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'inc1',
          criterio: '¿Se informó de inmediato al jefe o a Gerencia?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'inc2',
          criterio: '¿Se dejó acordonado o protegido el lugar si había peligro para los demás?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'inc3',
          criterio: '¿Se definió qué se va a corregir para que no vuelva a pasar?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },

    // --- FORMATOS PARA PLAN DE EMERGENCIAS ---
    {
      id: 'fmt-emg-amenazas-vulnerabilidad',
      titulo: 'Formato de verificación en planta de amenazas y vulnerabilidad',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'FORMATO DE VERIFICACIÓN DE AMENAZAS Y VULNERABILIDAD EN PLANTA'
      ),
      instruccionesUso:
        'Recorra la planta para confirmar qué peligros de emergencia aplican hoy y qué tan preparada está la empresa para responder. No marque como confirmado lo que no haya visto físicamente.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de inspección', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable(s) del recorrido', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'ea1',
          criterio: 'Incendio en freidoras o zona de empaque (presencia de aceite, gas y cartón)',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ea2',
          criterio: 'Fuga de gas en tubería o quemadores',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ea3',
          criterio: 'Derrame de productos químicos de limpieza (confirmar qué productos reales hay)',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ea4',
          criterio: 'Riesgo de robo o inseguridad en entrada/salida o ruta de entrega (confirmar casos o exposición)',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Registro de amenazas observadas y nivel asignado en inspección real',
        columnas: ['Amenaza', '¿Confirmada en planta?', 'Lugar exacto', 'Qué falta por mejorar'],
        filas: crearFilasTablaVacias(4, 8),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-emg-inspeccion-recursos',
      titulo: 'Formato de inspección de recursos y equipos de emergencia',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'FORMATO DE INSPECCIÓN DE RECURSOS Y EQUIPOS DE EMERGENCIA'
      ),
      instruccionesUso:
        'Anote la cantidad real, fecha de vencimiento y estado de los extintores, botiquín, camilla y alarma que realmente existen en la planta.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de inspección', valor: '' },
        { id: 'responsable', etiqueta: 'Persona que inspecciona', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'er1',
          criterio: '¿Los extintores (incluyendo extintor para grasas/aceites si aplica) están cargados, con aguja en verde y sin nada delante?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'er2',
          criterio: '¿El botiquín de primeros auxilios está completo, limpio y sin elementos vencidos?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'er3',
          criterio: '¿Se escucha bien en toda la planta el pito o alarma de emergencia?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'er4',
          criterio: '¿Los teléfonos de emergencia están publicados en un lugar visible para todos?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Inventario real verificado de equipos de emergencia',
        columnas: ['Equipo / Recurso', 'Cantidad real', 'Ubicación exacta', 'Vencimiento / Estado'],
        filas: crearFilasTablaVacias(4, 8),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-emg-rutas-evacuacion',
      titulo: 'Lista de chequeo de rutas, salidas de evacuación y punto de encuentro',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'LISTA DE CHEQUEO DE RUTAS, SALIDAS DE EVACUACIÓN Y PUNTO DE ENCUENTRO'
      ),
      instruccionesUso:
        'Compruebe que todas las salidas se abran sin candados durante el turno y que el punto de encuentro definido en el exterior sea seguro.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de revisión', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable', valor: '' },
        { id: 'punto', etiqueta: 'Punto de encuentro verificado', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'ru1',
          criterio: '¿Las salidas de evacuación están completamente destapadas y sin candado mientras hay personal?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ru2',
          criterio: '¿Las flechas verdes de "Salida" se ven con claridad desde cualquier puesto?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ru3',
          criterio: '¿El punto de encuentro está lejos de postes, cables de luz, vidrios o tráfico rápido?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ru4',
          criterio: '¿Hay una lista actualizada de los 10 trabajadores a la mano para pasar asistencia afuera?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-emg-registro-simulacro',
      titulo: 'Registro y evaluación de simulacros de emergencia',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'FORMATO DE REGISTRO Y EVALUACIÓN DE SIMULACROS DE EMERGENCIA'
      ),
      instruccionesUso:
        'Diligenciar durante y después de cada simulacro. Anote el tiempo real que tardó el equipo en salir, qué funcionó bien y qué se debe mejorar.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha del simulacro', valor: '' },
        { id: 'escenario', etiqueta: 'Situación practicada (ej. sismo / incendio / fuga)', valor: '' },
        { id: 'horaInicio', etiqueta: 'Hora de alarma', valor: '' },
        { id: 'tiempoTotal', etiqueta: 'Tiempo total de evacuación', valor: '' },
        { id: 'totalSalieron', etiqueta: 'Cantidad de personas que salieron', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'si1',
          criterio: '¿Todos escucharon la alarma o aviso desde su puesto de trabajo?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'si2',
          criterio: '¿El equipo salió caminando rápido, en calma y sin empujarse?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'si3',
          criterio: '¿Se pasó lista de asistencia completa en el punto de encuentro?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'si4',
          criterio: '¿Se apagaron o cerraron equipos críticos de forma segura según el protocolo?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      observacionesGenerales: '',
    },
    {
      id: 'fmt-emg-asistencia-capacitacion',
      titulo: 'Registro de asistencia a capacitaciones de emergencias',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'REGISTRO DE ASISTENCIA A CAPACITACIONES DE EMERGENCIAS'
      ),
      instruccionesUso:
        'Llenar con los nombres y firmas de los trabajadores que participan en cada capacitación del Plan de Emergencias.',
      camposEncabezado: [
        { id: 'tema', etiqueta: 'Tema de emergencia dictado', valor: '' },
        { id: 'fecha', etiqueta: 'Fecha', valor: '' },
        { id: 'instructor', etiqueta: 'Quien orienta la charla / ARL', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'ec1',
          criterio: '¿Cada trabajador identificó su rol sencillo y a quién avisar primero?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'ec2',
          criterio: '¿Quedaron claros los peligros que NO debe intentar apagar o reparar un trabajador sin entrenamiento especializado?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Asistentes de Frikaz S.A.S.',
        columnas: ['N.°', 'Nombre del trabajador', 'Cargo', 'Firma / Confirmación'],
        filas: Array.from({ length: 10 }, (_, idx) => [String(idx + 1), '', '', '']),
      },
      observacionesGenerales: '',
    },
    {
      id: 'fmt-emg-mejora-post-simulacro',
      titulo: 'Plan de acciones de mejora posterior a simulacro o emergencia',
      categoria: 'PLAN_EMERGENCIAS',
      cajaCalidad: crearCajaCalidadEditable(
        'PLAN DE ACCIONES DE MEJORA POSTERIOR A SIMULACRO O EMERGENCIA'
      ),
      instruccionesUso:
        'Anote aquí cada falla o demora encontrada en el simulacro (ej. puerta trabada, alarma baja, falta señalización) con un responsable y fecha realista para corregirla.',
      camposEncabezado: [
        { id: 'fecha', etiqueta: 'Fecha de elaboración', valor: '' },
        { id: 'evento', etiqueta: 'Simulacro o situación evaluada', valor: '' },
        { id: 'responsable', etiqueta: 'Responsable de seguimiento', valor: '' },
      ],
      itemsVerificacion: [
        {
          id: 'pm1',
          criterio: '¿Se revisaron las dificultades observadas con todo el equipo de trabajo?',
          cumplimiento: '',
          observacion: '',
        },
        {
          id: 'pm2',
          criterio: '¿Cada mejora tiene fecha realista y persona encargada de hacerla?',
          cumplimiento: '',
          observacion: '',
        },
      ],
      tablaRegistro: {
        titulo: 'Compromisos de mejora después del simulacro o incidente',
        columnas: ['Qué falló o se puede mejorar', 'Acción sencilla a realizar', 'Responsable', 'Fecha límite', 'Estado'],
        filas: crearFilasTablaVacias(5, 6),
      },
      observacionesGenerales: '',
    },
  ];

  const map: Record<string, FormatoEditableDocumento> = {};
  formatos.forEach((f) => {
    map[f.id] = f;
  });
  return map;
}

// ============================================================================
// 2. MATERIALES COMPLETOS DE CAPACITACIÓN EN LENGUAJE SENCILLO
// ============================================================================

function crearCapacitacion(
  data: Omit<MaterialCapacitacionPlan, 'observaciones' | 'asistenciaRegistrada'>
): MaterialCapacitacionPlan {
  return {
    ...data,
    observaciones: '',
    asistenciaRegistrada: crearFilasAsistenciaVacias(10),
  };
}

// ============================================================================
// 3. PLANES DE MEJORA INDIVIDUALES PARA LOS 10 RIESGOS + MATRIZ DINÁMICA
// ============================================================================

export function crearPlanesMejoraSeed(riesgos: RiesgoGTC45Item[]): PlanMejoraPorRiesgo[] {
  const byId = (id: string) => riesgos.find((r) => r.id === id);

  const construir = (cfg: {
    orden: number;
    claveReferencia: string;
    nombreRiesgo: string;
    riesgoFallbackId: string;
    riesgoFallbackCodigo: string;
    cargoFallback: string;
    procesoFallback: string;
    actividadFallback: string;
    estadoValidacionReal: 'CONFIRMADO' | 'PENDIENTE_VALIDACION';
    motivoValidacionReal: string;
    vinculadoAPlanEmergencias?: boolean;
    situacionQueSeBuscaMejorar: string;
    actividadMejoraPropuesta: string;
    explicacionSencilla: string;
    medidaPrevencionControl: string;
    capacitacion: MaterialCapacitacionPlan;
    formatosIds: string[];
    responsable: string;
    fechaInicio: string;
    fechaFin: string;
    recursosNecesarios: string;
    evidenciaRequerida: string;
    resultadoEsperado: string;
    calorExtremoControl?: PlanMejoraPorRiesgo['calorExtremoControl'];
  }): PlanMejoraPorRiesgo => {
    const r = byId(cfg.riesgoFallbackId);
    const riesgoId = r?.id || cfg.riesgoFallbackId;
    const riesgoCodigo = r?.codigo || cfg.riesgoFallbackCodigo;
    const nivel = r?.interpretacionNR || 'II';
    const puntaje = r?.nivelRiesgo || 200;
    const proceso = r?.proceso || cfg.procesoFallback;
    const { cargosOficiales } = resolverCargoPrincipalYExpuestos(
      r?.cargo || cfg.cargoFallback,
      r?.cargosExpuestos
    );
    const cargo = cargosOficiales.join(', ');
    const actividad = r?.actividades || cfg.actividadFallback;

    return {
      id: `pmr-${cfg.claveReferencia}`,
      orden: cfg.orden,
      claveReferencia: cfg.claveReferencia,
      nombreRiesgo: cfg.nombreRiesgo,
      riesgoId,
      riesgoCodigo,
      nivelRiesgoMatriz: nivel,
      puntajeMatriz: puntaje,
      procesoMatriz: proceso,
      cargoMatriz: cargo,
      actividadMatriz: actividad,
      riesgoSnapshot: r
        ? crearRiesgoSnapshot(r)
        : {
            nivelRiesgo: puntaje,
            interpretacionNR: nivel,
            peligroDescripcion: cfg.nombreRiesgo,
            medidasResumen: cfg.medidaPrevencionControl,
            cargo,
            proceso,
          },
      estadoValidacionReal: cfg.estadoValidacionReal,
      motivoValidacionReal: cfg.motivoValidacionReal,
      vinculadoAPlanEmergencias: cfg.vinculadoAPlanEmergencias,
      situacionQueSeBuscaMejorar: cfg.situacionQueSeBuscaMejorar,
      actividadMejoraPropuesta: cfg.actividadMejoraPropuesta,
      explicacionSencilla: cfg.explicacionSencilla,
      medidaPrevencionControl: cfg.medidaPrevencionControl,
      capacitacion: cfg.capacitacion,
      formatosIds: cfg.formatosIds,
      responsable: cfg.responsable,
      fechaInicio: cfg.fechaInicio,
      fechaFin: cfg.fechaFin,
      recursosNecesarios: cfg.recursosNecesarios,
      evidenciaRequerida: cfg.evidenciaRequerida,
      evidenciasAdjuntas: [],
      resultadoEsperado: cfg.resultadoEsperado,
      estado: 'Por hacer',
      calorExtremoControl: cfg.calorExtremoControl,
      observacionesGerencia: '',
      historialCambios: [
        {
          id: `hp-${cfg.claveReferencia}-init`,
          fecha: new Date().toISOString().split('T')[0],
          usuario: 'Plan Anual SG-SST',
          accion: 'Plan creado',
          detalle: `Conectado con riesgo ${riesgoCodigo} (${cargo}) de la Matriz GTC 45.`,
        },
      ],
    };
  };

  return [
    // A. Calor extremo
    construir({
      orden: 1,
      claveReferencia: 'calor_extremo',
      nombreRiesgo: 'Calor extremo por las actividades de producción',
      riesgoFallbackId: 'RSK-PROD-01',
      riesgoFallbackCodigo: 'GTC45-PR-01',
      cargoFallback: 'Operario de frito',
      procesoFallback: 'Operativo / Manufactura',
      actividadFallback: 'Fritura continua de pasabocas (papas y plátanos)',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: Frikaz S.A.S. opera freidoras industriales con aceite caliente a más de 160 °C – 180 °C en la línea de producción.',
      situacionQueSeBuscaMejorar:
        'Exposición continua al calor de las freidoras y riesgo de salpicaduras de aceite caliente en manos, brazos y cara durante el turno.',
      actividadMejoraPropuesta:
        'Establecer intervalos de descanso de 30 minutos para favorecer la aclimatación al calor, organizando pausas en espacios frescos y ventilados, con acceso a hidratación y seguimiento de las condiciones de exposición de los trabajadores. Verificar semanalmente la campana extractora, asegurar guantes térmicos y caretas completas en buen estado para Operario de frito.',
      explicacionSencilla:
        'Trabajar muchas horas junto al aceite caliente cansa el cuerpo y puede causar quemaduras graves si salpica una gota o tocamos una superficie caliente. Con buena ventilación, pausas en lugar fresco, guantes largos y tomando agua con frecuencia cuidamos la salud.',
      medidaPrevencionControl:
        'Mantener encendida la campana extractora durante todo el freído, aplicar los intervalos propuestos de descanso de 30 minutos en espacio fresco y ventilado (sujetos a validación técnica según temperatura real y carga de trabajo), usar siempre guantes largos resistentes al calor, delantal impermeable y careta facial al mover cestas, rotar tareas cuando sea viable y mantener hidratación disponible.',
      calorExtremoControl: {
        validacionCondicionesReales:
          'Medida propuesta de intervalos de descanso de 30 minutos pendiente de validación técnica frente a la exposición real, temperatura ambiente/proceso en zona de freidoras, carga física de trabajo, actividad desarrollada y criterios técnicos de SST.',
        temperaturaReferencia: 'Pendiente de registro en planta (medición térmica)',
        cargaTrabajo: 'Moderada a alta (pendiente validar en puesto de fritura)',
        duracionPausaMinutos: 30,
        requiereValidacionTecnicaSst: true,
        medidasComplementarias: {
          hidratacion: true,
          ventilacion: true,
          reduccionExposicion: true,
          rotacionTareas: false,
          vigilanciaSintomas: true,
          notasComplementarias:
            'Complementar con campana extractora encendida, punto de hidratación fresco, rotación cuando sea viable en el equipo de 10 trabajadores y vigilancia de síntomas de agotamiento térmico.',
        },
      },
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Trabajo seguro frente al calor y prevención de quemaduras en freidoras',
        objetivo:
          'Capacitar específicamente al Operario de frito (y al Operario de pelado y Operario de empaque cuando apoyen cerca de fritura) para reconocer señales de cansancio por calor y usar los EPP térmicos.',
        duracionSugerida: '25 minutos en planta',
        temasPrincipales: [
          'Por qué el calor excesivo agota el cuerpo y cómo evitar mareos.',
          'Uso obligatorio de guantes largos, delantal y careta al trabajar con aceite a 180 °C.',
          'Regla de oro: jamás acercar agua ni trapos mojados al aceite hirviendo.',
          'Pausas cortas para tomar agua durante la jornada.',
        ],
        desarrolloSencillo: [
          '1. Antes de empezar a freír, encienda la campana extractora y compruebe que el termostato marque bien.',
          '2. Póngase sus guantes largos resistentes al calor, el delantal y la careta antes de meter o sacar producto.',
          '3. Escurra el producto húmedo (papa o plátano) muy bien antes de echarlo al aceite para que no salpique.',
          '4. Tome un vaso de agua fresca cada hora y avise a un compañero si siente mareo, dolor de cabeza o demasiado calor.',
        ],
        recomendacionesPracticas: [
          'Si un guante térmico está roto o húmedo por dentro, cámbielo antes de usarlo.',
          'Nunca deje trapos o envases plásticos en el borde de la freidora.',
        ],
        actividadComprension:
          'Cada operario muestra cómo colocarse la careta y los guantes antes de levantar la canasta, y señala dónde está el punto de hidratación.',
        evaluacionSencilla: [
          {
            pregunta: '¿Qué debemos revisar antes de echar la papa o plátano al aceite caliente?',
            respuestaEsperada:
              'Que esté bien escurrida (sin exceso de agua) y tener puestos guantes térmicos, delantal y careta.',
          },
          {
            pregunta: '¿Qué debe hacer si siente mareo o mucho agotamiento por el calor?',
            respuestaEsperada:
              'Avisar a un compañero, retirarse un momento a un lugar fresco y tomar agua.',
          },
        ],
      }),
      formatosIds: ['fmt-inspeccion-calor-freidoras', 'fmt-entrega-epp', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de frito',
      fechaInicio: '2027-05-03',
      fechaFin: '2027-06-28',
      recursosNecesarios:
        'Guantes térmicos largos, caretas faciales y delantales (reposición según desgaste), agua potable para hidratación y 25 minutos de charla interna.',
      evidenciaRequerida:
        'Lista de chequeo de zona de fritura diligenciada, registro de entrega de EPP térmico firmado y lista de asistencia a la charla.',
      resultadoEsperado:
        'Operario de frito protegido contra quemaduras y fatiga térmica, con elementos completos y extractor funcionando en cada turno.',
    }),

    // B. Ruido constante
    construir({
      orden: 2,
      claveReferencia: 'ruido_constante',
      nombreRiesgo: 'Ruido constante',
      riesgoFallbackId: 'RSK-PROD-03',
      riesgoFallbackCodigo: 'GTC45-PR-03',
      cargoFallback: 'Operario de pelado, Operario de frito, Operario de empaque',
      procesoFallback: 'Operativo / Manufactura',
      actividadFallback: 'Pelado mecánico, rebanado de papa/plátano y extracción de humos',
      estadoValidacionReal: 'PENDIENTE_VALIDACION',
      motivoValidacionReal:
        'Confirmado que operan peladora, rebanadora y extractor; sin embargo, el nivel exacto de decibeles (si supera 85 dBA) está PENDIENTE DE VALIDACIÓN mediante medición o verificación con ARL.',
      situacionQueSeBuscaMejorar:
        'Posible exposición diaria a ruido fuerte continuo de la peladora, rebanadora y extractor sin haber confirmado los decibeles reales ni el ajuste de protectores auditivos.',
      actividadMejoraPropuesta:
        'Revisar tornillos y mantenimiento preventivo de motores para quitar vibraciones, garantizar tapaoídos limpios para Operario de pelado, Operario de frito, Operario de selección y Operario de empaque, y solicitar apoyo a la ARL para medir el ruido real.',
      explicacionSencilla:
        'El ruido fuerte todos los días va dañando el oído poco a poco sin que uno lo note al principio. Cuidar los motores para que no suenen golpeados y usar los tapaoídos bien puestos evita quedar con zumbido o sordera.',
      medidaPrevencionControl:
        'Ajustar bases y lubricar máquinas periódicamente, exigir el uso correcto de tapaoídos cuando la peladora/rebanadora esté encendida, y realizar sonometría con apoyo técnico/ARL para confirmar el nivel real.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Cuidado del oído y uso correcto de tapaoídos en zona de máquinas',
        objetivo:
          'Capacitar a Operario de pelado, Operario de selección, Operario de frito y Operario de empaque expuestos al ruido de planta en la colocación, limpieza y resguardo correcto de protectores auditivos.',
        duracionSugerida: '20 minutos',
        temasPrincipales: [
          'Señales de alerta en el oído (zumbido después del turno o necesidad de gritar para hablar).',
          'Cómo colocar correctamente los tapaoídos de inserción o copa.',
          'Limpieza diaria para evitar infecciones en el oído.',
        ],
        desarrolloSencillo: [
          '1. Si tiene que levantar la voz para hablar con un compañero a un brazo de distancia, hay ruido alto.',
          '2. Lávese muy bien las manos antes de tocar los tapaoídos.',
          '3. Colóqueselos antes de encender la peladora o la rebanadora, no después.',
          '4. Al terminar el turno, lávelos con agua y jabón suave y guárdelos en su estuche limpio.',
        ],
        recomendacionesPracticas: [
          'Si siente que una máquina está sonando más fuerte o vibrando raro, avise para revisarla.',
          'No preste sus tapaoídos a otros compañeros.',
        ],
        actividadComprension:
          'Práctica rápida de colocación e inspección del estuche limpio de los tapaoídos de cada trabajador de planta.',
        evaluacionSencilla: [
          {
            pregunta: '¿En qué momento se deben poner los tapaoídos?',
            respuestaEsperada: 'Antes de encender las máquinas ruidosas, con las manos limpias.',
          },
          {
            pregunta: '¿Qué señal indica que el ruido está afectando sus oídos?',
            respuestaEsperada: 'Sentir pito o zumbido en los oídos al salir del trabajo.',
          },
        ],
      }),
      formatosIds: ['fmt-inspeccion-ruido-auditiva', 'fmt-entrega-epp', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de pelado',
      fechaInicio: '2027-05-12',
      fechaFin: '2027-06-28',
      recursosNecesarios:
        'Protectores auditivos certificados (bajo costo por persona), gestión gratuita de medición con la ARL y revisión mecánica básica de motores.',
      evidenciaRequerida:
        'Lista de chequeo de máquinas y protección auditiva, comprobante de entrega de tapaoídos y solicitud o resultado de sonometría.',
      resultadoEsperado:
        'Nivel de ruido validado en planta, motores sin vibraciones anormales y 100% del personal expuesto usando correctamente protección auditiva.',
    }),

    // C. Atrapamiento
    construir({
      orden: 3,
      claveReferencia: 'atrapamiento',
      nombreRiesgo: 'Atrapamiento en maquinaria y partes en movimiento',
      riesgoFallbackId: 'RSK-CIRC-02',
      riesgoFallbackCodigo: 'GTC45-CM-02',
      cargoFallback: 'Operario de pelado, Operario de empaque',
      procesoFallback: 'Operativo / Mantenimiento',
      actividadFallback: 'Pelado, rebanado, sellado y bandas o motores en movimiento',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: Frikaz cuenta con peladora mecánica, rebanadora con cuchillas y selladora de banda térmica con partes móviles operadas por Operario de pelado y Operario de empaque.',
      situacionQueSeBuscaMejorar:
        'Riesgo de atrapar dedos, manos, ropa o cabello al operar o limpiar máquinas con cuchillas, poleas o bandas sin protección completa o sin desconectar la energía.',
      actividadMejoraPropuesta:
        'Revisar que todas las tapas y resguardos de las máquinas estén completos y fijos, verificar la regla estricta de "apagar y desconectar antes de limpiar", y prohibir ropa suelta, anillos o relojes.',
      explicacionSencilla:
        'Una cuchilla, banda o polea gira muy rápido y no da tiempo de reaccionar. Por eso ninguna máquina se debe limpiar o destapar prendida ni sin su tapa protectora puesta.',
      medidaPrevencionControl:
        'Mantener instaladas todas las guardas/tapas protectoras, desconectar físicamente el equipo antes de limpiar o destrabar, usar empujadores (nunca la mano) en rebanadora, uniforme ajustado y cofia recogiendo todo el cabello.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Reglas de oro para trabajar y limpiar máquinas sin atrapamientos ni cortes',
        objetivo:
          'Garantizar que Operario de pelado y Operario de empaque nunca metan la mano, destapen tapas o limpien la peladora, rebanadora o selladora mientras esté conectada.',
        duracionSugerida: '25 minutos',
        temasPrincipales: [
          'Qué partes de nuestras máquinas pueden atrapar o cortar (cuchillas, rodillos, bandas, poleas).',
          'Regla obligatoria: apagar + desconectar + esperar a que deje de girar antes de limpiar.',
          'Por qué está prohibido quitar tapas protectoras o usar pulseras, anillos o mangas sueltas.',
        ],
        desarrolloSencillo: [
          '1. Antes de prender la máquina, mire que sus tapas y resguardos estén bien puestos.',
          '2. Nunca use la mano para empujar papa o plátano hacia las cuchillas; use siempre la pieza o empujador seguro.',
          '3. Si algo se atasca o toca lavar la máquina: primero apáguela, segundo desconéctela del enchufe y tercero espere que pare por completo.',
          '4. Trabaje siempre con cofia bien puesta y sin anillos, pulseras ni mangas colgadas.',
        ],
        recomendacionesPracticas: [
          'Si falta un tornillo o una tapa está floja, NO encienda la máquina y avise de inmediato.',
          'Al limpiar cuchillas desmontadas, use guante anticorte.',
        ],
        actividadComprension:
          'Demostración práctica (con máquina desconectada) de los 3 pasos antes de limpiar: apagar, desconectar y verificar que nada se mueve.',
        evaluacionSencilla: [
          {
            pregunta: 'Si un trozo de papa queda atascado en la rebanadora, ¿qué es lo primero que debe hacer?',
            respuestaEsperada: 'Apagar la máquina, desconectarla de la corriente y esperar a que pare por completo.',
          },
          {
            pregunta: '¿Qué accesorios están prohibidos cerca de máquinas en movimiento?',
            respuestaEsperada: 'Anillos, pulseras, relojes, cadenas colgadas, cabello suelto y ropa floja.',
          },
        ],
      }),
      formatosIds: ['fmt-inspeccion-maquinaria-atrapamiento', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de pelado',
      fechaInicio: '2027-02-01',
      fechaFin: '2027-05-29',
      recursosNecesarios:
        'Tornillería/tapas faltantes en resguardos (ajuste mecánico sencillo), tarjeta de aviso "No encender - En limpieza" y 25 minutos de inducción práctica.',
      evidenciaRequerida:
        'Lista de chequeo de seguridad en máquinas diligenciada, evidencia de resguardos completos y registro de asistencia firmado.',
      resultadoEsperado:
        'Todas las máquinas operando con resguardos fijos y procedimiento diario de desconexión antes de limpieza.',
    }),

    // D. Riesgo eléctrico
    construir({
      orden: 4,
      claveReferencia: 'riesgo_electrico',
      nombreRiesgo: 'Riesgo eléctrico',
      riesgoFallbackId: 'RSK-INST-01',
      riesgoFallbackCodigo: 'GTC45-IP-01',
      cargoFallback: 'Operario de selección, Operario de pelado, Operario de frito, Operario de empaque',
      procesoFallback: 'Infraestructura / Mantenimiento',
      actividadFallback: 'Uso y revisión visual de energía eléctrica (220V) en equipos y tableros',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: Frikaz trabaja con equipos eléctricos y zonas húmedas de lavado y fritura, lo que exige tableros sellados y cables en perfecto estado (sin reparaciones improvisadas).',
      situacionQueSeBuscaMejorar:
        'Tableros o tomas eléctricas cerca de agua y aceite que puedan causar descargas eléctricas o cortos si tienen tapas dañadas, cables pelados o cosas arrumadas al frente.',
      actividadMejoraPropuesta:
        'Realizar inspección visual mensual de tomas y cables (sin abrir tableros), mantener siempre despejado el frente de tableros eléctricos y contratar electricista certificado externo cuando se requiera corregir alguna falla.',
      explicacionSencilla:
        'El agua y la electricidad no se pueden juntar. Un cable pelado o un enchufe mojado puede dar un corrientazo mortal. Ningún trabajador sin formación eléctrica debe abrir cajas de tacos ni arreglar cables.',
      medidaPrevencionControl:
        'Prohibir que personal no calificado abra tableros o haga empalmes con cinta, dejar 1 metro libre frente a tableros, usar zapatos con suela de caucho y exigir revisión por electricista certificado cuando falten tapas o protecciones contra humedad.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Prevención de accidentes eléctricos en planta de alimentos húmeda',
        objetivo:
          'Capacitar a Operario de selección, Operario de pelado, Operario de frito y Operario de empaque sobre qué sí pueden hacer y qué NO deben hacer jamás frente a enchufes, cables y tableros eléctricos.',
        duracionSugerida: '15 minutos',
        temasPrincipales: [
          'Peligro del agua y pisos mojados cerca de enchufes o cables.',
          'Cómo desconectar equipos agarrando la clavija y nunca jalando del cable.',
          'Prohibición total de reparar cables o abrir el tablero si no es electricista certificado.',
        ],
        desarrolloSencillo: [
          '1. Antes de lavar el piso o una máquina, desconecte las clavijas con las manos secas.',
          '2. Nunca jale el cable para desenchufar; agarre la clavija firme.',
          '3. No deje canastillas ni trapeadores recostados contra la caja de la luz.',
          '4. Si un enchufe echa chispas, huele a quemado o da cosquilleo eléctrico, NO lo use y avise para llamar al electricista.',
        ],
        recomendacionesPracticas: [
          'Avise de inmediato si ve un cable pelado o una tapa rota.',
          'Mantenga bien secas las manos y el calzado al encender equipos.',
        ],
        actividadComprension:
          'Recorrido de 5 minutos señalando dónde está el tablero principal y recordando que nadie sin tarjeta eléctrica debe abrirlo.',
        evaluacionSencilla: [
          {
            pregunta: 'Si un trabajador ve un cable pelado o un tablero sin tapa, ¿debe arreglarlo él mismo?',
            respuestaEsperada:
              'No. Debe avisar de inmediato a Gerencia o SST para que lo revise un electricista autorizado.',
          },
        ],
      }),
        formatosIds: ['fmt-inspeccion-electrica', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Gerente',
      fechaInicio: '2027-02-08',
      fechaFin: '2027-02-27',
      recursosNecesarios:
        'Señalización amarilla para tableros, orden en el área (sin costo) y contratación puntual de electricista certificado si se requiere ajustar tapas o tomas.',
      evidenciaRequerida:
        'Lista de chequeo visual eléctrica diligenciada, fotos de tableros despejados y soporte del electricista si se hacen reparaciones.',
      resultadoEsperado:
        'Instalaciones eléctricas cerradas, señalizadas, alejadas de salpicaduras de agua y manipuladas únicamente por personal competente.',
    }),

    // E. Fuga de gas
    construir({
      orden: 5,
      claveReferencia: 'fuga_gas',
      nombreRiesgo: 'Fuga de gas',
      riesgoFallbackId: 'RSK-INST-02',
      riesgoFallbackCodigo: 'GTC45-IP-02',
      cargoFallback: 'Operario de frito',
      procesoFallback: 'Infraestructura / Servicios Industriales',
      actividadFallback: 'Suministro de gas hacia los quemadores de freidoras',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: Frikaz utiliza gas combustible en los quemadores de las freidoras industriales operadas por el Operario de frito.',
      situacionQueSeBuscaMejorar:
        'Posibilidad de escape de gas en válvulas, uniones o quemadores por descuido al cerrar llaves o desgaste de tubería.',
      actividadMejoraPropuesta:
        'Implementar revisión diaria de apertura y cierre de llaves de gas, señalizar claramente la llave principal de corte rápido y programar mantenimiento técnico certificado de quemadores y uniones.',
      explicacionSencilla:
        'El gas acumulado en un espacio cerrado puede causar un incendio o explosión si hay una chispa. Cerrar bien las llaves al terminar y saber qué hacer si huele a gas protege la vida de los 10 trabajadores.',
      medidaPrevencionControl:
        'Dejar libre y visible la llave general de gas, revisar color de llama (azul) y mangueras en buen estado, cerrar llaves al terminar turno y prohibir que trabajadores no autorizados manipulen o reparen tuberías de gas.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Manejo seguro de gas y qué hacer si huele a gas en planta',
        objetivo:
          'Capacitar principalmente al Operario de frito (y al personal de planta) en el cierre correcto de quemadores al final del día y pasos seguros ante olor a gas sin provocar chispas.',
        duracionSugerida: '20 minutos',
        temasPrincipales: [
          'Dónde queda la llave principal de corte rápido de gas.',
          'Cómo revisar visualmente mangueras y llama azul sin usar fuego.',
          'Qué hacer y qué NO hacer si hay olor fuerte a gas.',
        ],
        desarrolloSencillo: [
          '1. Al llegar en la mañana, huela el ambiente antes de prender luces o máquinas.',
          '2. Al terminar de freír, cierre primero las llaves de cada quemador y luego la llave principal.',
          '3. Si siente olor fuerte a gas: NO prenda ni apague interruptores de luz, NO use celulares ni encendedores.',
          '4. Abra puertas para ventilar, cierre la llave general solo si está cerca y sin peligro, salga al exterior y llame ayuda técnica.',
        ],
        recomendacionesPracticas: [
          'Nunca busque una fuga con fósforos ni encendedores.',
          'No intente apretar ni reparar tubos de gas por su cuenta.',
        ],
        actividadComprension:
          'Todos los trabajadores caminan hasta ubicar exactamente la llave principal de gas y comprueban que no haya cajas estorbando.',
        evaluacionSencilla: [
          {
            pregunta: 'Si al entrar a la planta huele fuerte a gas, ¿debe encender la luz para ver mejor?',
            respuestaEsperada:
              '¡No! Encender o apagar interruptores produce chispa. Se debe ventilar, cerrar la llave si es seguro, salir y pedir ayuda especializada.',
          },
        ],
      }),
      formatosIds: ['fmt-inspeccion-gas', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de frito',
      fechaInicio: '2027-02-12',
      fechaFin: '2027-08-21',
      recursosNecesarios:
        'Letrero visible en llave principal de gas y revisión periódica con técnico certificado en gas.',
      evidenciaRequerida:
        'Formato de chequeo de gas diligenciado, foto de llave general señalizada y soporte de mantenimiento técnico cuando se realice.',
      resultadoEsperado:
        'Operación segura de quemadores, llaves cerradas al fin de turno y todo el equipo sabiendo actuar sin riesgos ante olor a gas.',
    }),

    // F. Orden y aseo
    construir({
      orden: 6,
      claveReferencia: 'orden_aseo',
      nombreRiesgo: 'Orden y aseo (pisos húmedos, grasa y obstáculos)',
      riesgoFallbackId: 'RSK-ALM-ASEO-02',
      riesgoFallbackCodigo: 'GTC45-AA-02',
      cargoFallback: 'Operario de selección, Operario de pelado, Operario de frito, Operario de empaque, Conductor',
      procesoFallback: 'Apoyo / Saneamiento Básico y Planta',
      actividadFallback: 'Circulación en planta, lavado de pisos y almacenamiento de cajas',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: en áreas de selección, pelado, fritura, empaque y carga hay agua, grasa en piso y movimiento constante de canastillas y cajas.',
      situacionQueSeBuscaMejorar:
        'Riesgo de resbalones, tropiezos o caída de cajas mal apiladas en pasillos por pisos mojados/grasosos o desorden temporal.',
      actividadMejoraPropuesta:
        'Establecer rutina diaria de orden y aseo entre los cargos operativos de planta, usar siempre aviso de piso húmedo al lavar, limpiar de inmediato cualquier gota de aceite y mantener libres los pasillos.',
      explicacionSencilla:
        'Una gota de aceite o una canastilla atravesada en el pasillo puede causar una caída fuerte o fractura. Mantener el puesto limpio y el camino despejado nos cuida a todos.',
      medidaPrevencionControl:
        'Usar calzado antideslizante en buen estado, colocar letrero amarillo cuando el piso esté mojado, limpiar derrames de grasa al instante y apilar cajas en forma segura (máximo 1.50 m, sin tapar pasillos).',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Orden, limpieza inmediata y prevención de caídas en planta',
        objetivo:
          'Lograr que Operario de selección, Operario de pelado, Operario de frito, Operario de empaque y Conductor mantengan sus zonas limpias y pasillos despejados durante toda la jornada.',
        duracionSugerida: '15 minutos',
        temasPrincipales: [
          'Por qué ocurren resbalones en planta de fritos (agua + aceite).',
          'Uso obligatorio del aviso de piso húmedo y limpieza inmediata de derrames.',
          'Cómo acomodar canastillas y cajas sin bloquear pasillos ni salidas.',
        ],
        desarrolloSencillo: [
          '1. Si cae aceite o agua al suelo, no siga caminando encima: límpielo de inmediato o ponga el aviso.',
          '2. Nunca deje canastillas, cables o mangueras atravesadas donde caminan los compañeros.',
          '3. Revise cada mes que la suela de sus botas no esté lisa.',
        ],
        recomendacionesPracticas: [
          'Los últimos 10 minutos de cada turno son para dejar el área ordenada y los pasillos libres.',
        ],
        actividadComprension:
          'Recorrido rápido de 10 minutos identificando y recogiendo cualquier objeto que estorbe en pasillos.',
        evaluacionSencilla: [
          {
            pregunta: '¿Qué debe hacer si nota un reguero de aceite o agua en el piso?',
            respuestaEsperada:
              'Limpiarlo de inmediato o colocar el aviso de precaución para que nadie se resbale.',
          },
        ],
      }),
      formatosIds: ['fmt-inspeccion-orden-aseo', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de selección',
      fechaInicio: '2027-03-01',
      fechaFin: '2027-03-30',
      recursosNecesarios:
        'Aviso amarillo de piso húmedo, implementos de limpieza habituales y reposición oportuna de botas antideslizantes.',
      evidenciaRequerida:
        'Lista de chequeo de orden y aseo firmada semanalmente y fotos de pasillos despejados.',
      resultadoEsperado:
        'Pasillos despejados, pisos limpios y cero caídas o tropiezos por desorden.',
    }),

    // G. Exposición a productos químicos
    construir({
      orden: 7,
      claveReferencia: 'productos_quimicos',
      nombreRiesgo: 'Exposición a productos químicos',
      riesgoFallbackId: 'RSK-PROD-02',
      riesgoFallbackCodigo: 'GTC45-PR-02',
      cargoFallback: 'Operario de selección, Operario de frito, Operario de empaque',
      procesoFallback: 'Operativo / Saneamiento Básico',
      actividadFallback: 'Lavado y desinfección de mesones, equipos y pisos',
      estadoValidacionReal: 'PENDIENTE_VALIDACION',
      motivoValidacionReal:
        'PENDIENTE DE VALIDACIÓN en planta: se sabe que se usan desengrasantes y desinfectantes para alimentos, pero se debe confirmar en bodega cuáles productos específicos se compran hoy y verificar sus etiquetas y Fichas de Datos de Seguridad (FDS) reales.',
      situacionQueSeBuscaMejorar:
        'Uso de envases reenvasados sin etiqueta o sin tener las hojas de seguridad reales a la mano, además de riesgo de quemaduras en piel u ojos o mezcla peligrosa de químicos.',
      actividadMejoraPropuesta:
        'Hacer el inventario real de todos los químicos que usa hoy Frikaz S.A.S., conseguir las Fichas de Seguridad con el proveedor, etiquetar claramente cada frasco y garantizar guantes largos de nitrilo y gafas cerradas.',
      explicacionSencilla:
        'Si un frasco no tiene etiqueta, alguien puede confundirlo o usarlo sin guantes y quemarse la piel o los ojos. Además, mezclar cloro con otros productos suelta gases que ahogan y hacen mucho daño.',
      medidaPrevencionControl:
        'Etiquetar todos los envases (jamás usar botellas de gaseosa o agua), no mezclar productos entre sí (solo diluir en agua según indicación), guardar copias sencillas de las FDS en carpeta y usar guantes de nitrilo y gafas cerradas al limpiar.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Uso seguro y etiquetado de productos de limpieza y desinfección',
        objetivo:
          'Capacitar a Operario de selección, Operario de frito y Operario de empaque (y apoyo de limpieza de turno) para evitar quemaduras en piel u ojos, confusión de envases y mezclas peligrosas.',
        duracionSugerida: '20 minutos',
        temasPrincipales: [
          'Regla cero envases sin etiqueta ni botellas de bebidas.',
          'Qué químicos jamás se deben mezclar (ej. cloro con otros detergentes o ácidos).',
          'Uso de guantes de nitrilo y gafas cerradas al preparar mezclas.',
          'Qué hacer si cae químico en ojos o piel (lavar con abundante agua limpia 15 minutos y avisar).',
        ],
        desarrolloSencillo: [
          '1. Antes de destapar un producto, lea la etiqueta para saber qué es y qué protección necesita.',
          '2. Nunca pase detergente o cloro a botellas de agua o gaseosa.',
          '3. Prepare siempre las mezclas en lugar ventilado usando guantes de nitrilo y gafas cerradas.',
          '4. Si salpica en los ojos o la piel, lave enseguida con mucha agua limpia y avise al encargado.',
        ],
        recomendacionesPracticas: [
          'Si ve un atomizador o galón borroso o sin etiqueta, devuélvalo para rotularlo antes de usarlo.',
        ],
        actividadComprension:
          'Revisar juntos los envases que hay hoy en el cuarto de aseo y verificar uno por uno si tienen etiqueta legible.',
        evaluacionSencilla: [
          {
            pregunta: '¿Por qué está prohibido guardar desengrasante o cloro en una botella de agua?',
            respuestaEsperada:
              'Porque alguien puede tomarlo por error o usarlo sin saber que es un químico peligroso.',
          },
          {
            pregunta: '¿Qué hacer si salpica desinfectante o desengrasante en un ojo?',
            respuestaEsperada:
              'Lavar de inmediato con abundante agua limpia durante al menos 15 minutos y avisar para atención médica.',
          },
        ],
      }),
      formatosIds: ['fmt-inventario-quimicos', 'fmt-entrega-epp', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de selección',
      fechaInicio: '2027-03-08',
      fechaFin: '2027-03-30',
      recursosNecesarios:
        'Impresión de etiquetas resistentes al agua, carpeta para Fichas de Seguridad (pedir gratis al proveedor) y guantes largos de nitrilo + gafas cerradas.',
      evidenciaRequerida:
        'Inventario real de químicos diligenciado en el formato, fotos de envases etiquetados, FDS recopiladas y lista de asistencia.',
      resultadoEsperado:
        'Inventario real validado, 100% de los envases etiquetados con FDS disponibles y personal protegido al diluir y aplicar productos.',
    }),

    // H. Riesgo biomecánico
    construir({
      orden: 8,
      claveReferencia: 'biomecanico',
      nombreRiesgo: 'Riesgo biomecánico por posturas prolongadas y manipulación de cargas',
      riesgoFallbackId: 'RSK-PROD-04',
      riesgoFallbackCodigo: 'GTC45-PR-04',
      cargoFallback: 'Operario de selección, Operario de pelado, Operario de empaque, Conductor',
      procesoFallback: 'Operativo / Manufactura y Despacho',
      actividadFallback: 'Selección en mesa, empaque manual de bolsas y movimiento de bultos o cajas',
      estadoValidacionReal: 'CONFIRMADO',
      motivoValidacionReal:
        'Confirmado en planta: en selección y empaque se trabaja varias horas de pie con movimientos repetitivos, y en pelado, bodega y reparto se mueven bultos y cajas.',
      situacionQueSeBuscaMejorar:
        'Cansancio en espalda, piernas, hombros y muñecas por permanecer mucho tiempo en la misma postura de pie, hacer movimientos repetitivos o levantar peso doblando mal la espalda.',
      actividadMejoraPropuesta:
        'Implementar 2 pausas activas guiadas al día (mañana y tarde), rotar tareas entre Operario de selección, Operario de pelado y Operario de empaque para descansar las muñecas, y reforzar técnica de cargas con el Conductor.',
      explicacionSencilla:
        'Estar parado muchas horas haciendo el mismo movimiento o agacharse a levantar bultos con la espalda doblada va lastimando la columna y las muñecas. Estirar unos minutos y usar las piernas al cargar evita dolores e incapacidades.',
      medidaPrevencionControl:
        'Pausas activas diarias de 5-10 minutos, rotación entre puestos cuando sea viable, uso de carretilla para bultos pesados (no levantar más de 25 kg hombres / 12.5 kg mujeres solo) y tapetes cómodos en empaque cuando estén disponibles.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Cuidado de la espalda, muñecas y pausas activas en planta y reparto',
        objetivo:
          'Capacitar a Operario de selección, Operario de pelado, Operario de empaque y Conductor sobre cómo cargar bultos y cajas sin lastimar la columna y hacer estiramientos cortos.',
        duracionSugerida: '20 minutos',
        temasPrincipales: [
          'Cómo levantar una caja o bulto: acercar el peso al cuerpo, doblar rodillas y subir con las piernas.',
          'Pesos máximos permitidos sin ayuda y cuándo usar la carretilla o pedir apoyo a un compañero.',
          'Rutina corta de pausas activas para muñecas, cuello, espalda y piernas.',
        ],
        desarrolloSencillo: [
          '1. Antes de levantar un bulto o caja, pruebe qué tan pesado está.',
          '2. Ponga los pies separados, doble las rodillas, mantenga la espalda recta y pegue la caja al pecho al subir.',
          '3. Si pesa más de lo cómodo (o más de 25 kg en hombres / 12.5 kg en mujeres), use carretilla o carguen entre dos.',
          '4. En la mañana y tarde hagan 5 minutos de estiramiento de manos, hombros y espalda.',
        ],
        recomendacionesPracticas: [
          'No gire la cintura cargando peso; dé pasos cortos para voltear con todo el cuerpo.',
        ],
        actividadComprension:
          'Práctica rápida: cada trabajador levanta una caja vacía usando rodillas y guía un estiramiento corto de muñecas.',
        evaluacionSencilla: [
          {
            pregunta: '¿Con qué parte del cuerpo se debe hacer la fuerza al levantar una caja del suelo?',
            respuestaEsperada: 'Con las piernas (doblando las rodillas), manteniendo la espalda recta.',
          },
        ],
      }),
      formatosIds: ['fmt-ergonomia-pausas', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Operario de empaque',
      fechaInicio: '2027-04-05',
      fechaFin: '2027-04-29',
      recursosNecesarios:
        'Cartel sencillo de técnica de carga, carretilla en buen estado y 10 minutos diarios para pausas activas (sin inversión costosa).',
      evidenciaRequerida:
        'Lista de chequeo ergonómica diligenciada, registro de pausas activas o rotación y lista de asistencia a la capacitación.',
      resultadoEsperado:
        'Trabajadores aplicando postura segura al cargar, pausas activas constantes y menor fatiga física al final del turno.',
    }),

    // I. Situaciones de emergencia (CONECTADO DIRECTAMENTE CON PLAN DE EMERGENCIAS)
    construir({
      orden: 9,
      claveReferencia: 'situaciones_emergencia',
      nombreRiesgo: 'Situaciones de emergencia (incendio, fuga, quemadura, sismo y evacuación)',
      riesgoFallbackId: 'RSK-EMERG-02',
      riesgoFallbackCodigo: 'GTC45-EM-02',
      cargoFallback: 'Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque, Conductor',
      procesoFallback: 'Gestión de Emergencias y Seguridad',
      actividadFallback: 'Prevención, preparación y respuesta ante emergencias en planta',
      estadoValidacionReal: 'PENDIENTE_VALIDACION',
      motivoValidacionReal:
        'Confirmada la necesidad del Plan de Emergencias por uso de aceite a 180 °C, gas, electricidad y riesgo sísmico; los datos físicos exactos de rutas, salidas, punto de encuentro y equipos disponibles requieren inspección y validación en planta.',
      vinculadoAPlanEmergencias: true,
      situacionQueSeBuscaMejorar:
        'Necesidad de contar con un Plan de Emergencias completo adaptado a los 6 cargos oficiales de Frikaz S.A.S., con equipos verificados, salidas definidas y práctica real mediante simulacro.',
      actividadMejoraPropuesta:
        'Validar e implementar el Plan de Prevención, Preparación y Respuesta ante Emergencias en la sección dedicada de PLAN ANUAL, verificar equipos (extintores, botiquín), definir punto de encuentro y hacer simulacro.',
      explicacionSencilla:
        'En una emergencia (como fuego en una freidora, olor a gas, quemadura o temblor) cada segundo cuenta. Saber quién avisa, por dónde salir y dónde reunirse afuera salva vidas.',
      medidaPrevencionControl:
        'Mantener salidas de evacuación destapadas y sin candado durante la jornada, verificar estado de extintores y botiquín, asignar roles sencillos entre los 6 cargos oficiales y consultar siempre el módulo PLAN DE EMERGENCIAS.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Socialización del Plan de Emergencias y roles en los 6 cargos oficiales',
        objetivo:
          'Dar a conocer a Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque y Conductor el Plan de Emergencias, qué hacer sin exponerse al peligro y cómo evacuar.',
        duracionSugerida: '30 minutos',
        temasPrincipales: [
          'Señales de alarma y qué emergencia puede ocurrir en nuestra planta.',
          'Qué NO intentar hacer (no apagar fuego grande ni echar agua al aceite; no reparar gas ni electricidad).',
          'Roles sencillos de aviso, corte seguro, evacuación, conteo y llamada a emergencias asignados en los 6 cargos oficiales.',
        ],
        desarrolloSencillo: [
          '1. Si ocurre fuego en aceite, fuga de gas o temblor, la prioridad siempre es la vida de las personas.',
          '2. Quien detecte el problema avisa en voz alta y activa la señal acordada.',
          '3. Todos salen en orden por la ruta definida hacia el punto de encuentro, sin correr ni devolver por objetos.',
          '4. Afuera se pasa lista de los 10 trabajadores y se llama a ayuda externa (123 / Bomberos / Ambulancia / ARL).',
        ],
        recomendacionesPracticas: [
          'Revise las demás capacitaciones y simulacros detallados dentro de la sección PLAN DE EMERGENCIAS.',
        ],
        actividadComprension:
          'Recorrido grupal hasta las salidas y verificación de los números de emergencia.',
        evaluacionSencilla: [
          {
            pregunta: '¿Cuál es el error más peligroso si se prende el aceite de una freidora?',
            respuestaEsperada:
              'Echar agua al aceite en llamas. Se debe alejar al personal, cortar el gas si es seguro y evacuar o activar ayuda.',
          },
        ],
      }),
      formatosIds: [
        'fmt-emg-inspeccion-recursos',
        'fmt-emg-rutas-evacuacion',
        'fmt-emg-registro-simulacro',
      ],
      responsable: 'Gerente',
      fechaInicio: '2027-07-02',
      fechaFin: '2027-10-29',
      recursosNecesarios:
        'Inspección física de equipos existentes, señalización básica de salida y punto de encuentro, cartelera de teléfonos y 1 simulacro anual.',
      evidenciaRequerida:
        'Plan de Emergencias validado, listas de inspección de equipos y rutas, asistencia a capacitación y registro del simulacro.',
      resultadoEsperado:
        'Plan de Emergencias completo, validado en planta y practicado por los 6 cargos oficiales de Frikaz S.A.S.',
    }),

    // J. Robos
    construir({
      orden: 10,
      claveReferencia: 'robos',
      nombreRiesgo: 'Robos o situaciones de inseguridad',
      riesgoFallbackId: 'RSK-EXT-02',
      riesgoFallbackCodigo: 'GTC45-EX-02',
      cargoFallback: 'Conductor, Gerente',
      procesoFallback: 'Seguridad Física / Entorno Laboral y Rutas',
      actividadFallback: 'Entrada y salida de planta y entregas comerciales en calle',
      estadoValidacionReal: 'PENDIENTE_VALIDACION',
      motivoValidacionReal:
        'PENDIENTE DE VALIDACIÓN: la exposición exacta a hurtos en los alrededores de la planta y en las rutas actuales de entrega debe confirmarse directamente con Andrea Orjuela – Gerente y el Conductor.',
      situacionQueSeBuscaMejorar:
        'Exposición a posibles hurtos o atracos durante el ingreso/salida del personal o en entregas comerciales con manejo de mercancía o efectivo.',
      actividadMejoraPropuesta:
        'Confirmar con Gerente y Conductor las medidas reales de seguridad hoy existentes (iluminación, puerta cerrada, pagos por transferencia), acordar salida acompañada al fin del turno y socializar pautas de no confrontación.',
      explicacionSencilla:
        'Ninguna mercancía, dinero ni celular vale más que la vida de un trabajador. La regla más importante ante un robo es mantener la calma, no enfrentarse ni discutir, proteger la integridad y avisar luego a las autoridades y a Gerencia.',
      medidaPrevencionControl:
        'Mantener puerta de planta cerrada con control de ingreso, evitar contar o mostrar dinero en público, fomentar pagos por transferencia, procurar salidas acompañadas al paradero y aplicar conducta estricta de NO confrontación ante un atraco.',
      capacitacion: crearCapacitacion({
        requiereCapacitacion: true,
        nombre: 'Autocuidado en calle y actuación segura (sin confrontación) ante un robo',
        objetivo:
          'Capacitar principalmente al Conductor (y al personal en ingreso y salida de turno) sobre pautas de prevención diaria y protección de la vida sin enfrentamientos.',
        duracionSugerida: '15 minutos',
        temasPrincipales: [
          'Medidas preventivas al entrar/salir de planta y durante entregas.',
          'Manejo discreto de efectivo y preferencia por pagos electrónicos.',
          'Qué hacer y qué NO hacer durante un atraco: cero forcejeo o confrontación.',
        ],
        desarrolloSencillo: [
          '1. Al entrar o salir de planta, evite caminar con el celular en la mano y procure salir en grupo hacia el transporte.',
          '2. En entregas, mantenga cerrado el vehículo cuando no esté descargando y no exhiba dinero en la calle.',
          '3. Si ocurre un robo: NO pelee, NO discuta, NO haga movimientos bruscos ni intente perseguir al agresor.',
          '4. Una vez pase el peligro y esté en un lugar seguro, avise a la Policía (123) y a Gerencia.',
        ],
        recomendacionesPracticas: [
          'La empresa prioriza siempre su vida por encima de cualquier caja o dinero.',
        ],
        actividadComprension:
          'Conversatorio corto con el Conductor y el equipo para identificar los horarios o puntos que sienten más solos al salir.',
        evaluacionSencilla: [
          {
            pregunta: 'Si un delincuente exige el dinero o mercancía durante una entrega, ¿qué debe hacer el trabajador?',
            respuestaEsperada:
              'Mantener la calma, no enfrentarse ni resistirse, entregar lo que pidan para proteger su vida y avisar luego desde un lugar seguro.',
          },
        ],
      }),
      formatosIds: ['fmt-reporte-incidentes-condiciones', 'fmt-registro-capacitacion-riesgos'],
      responsable: 'Conductor',
      fechaInicio: '2027-07-02',
      fechaFin: '2027-08-31',
      recursosNecesarios:
        'Validación de iluminación y cerraduras actuales, directorio policial del cuadrante y charla preventiva de 15 minutos.',
      evidenciaRequerida:
        'Acta o nota de validación de condiciones reales de seguridad, registro de charla de prevención y reporte en caso de novedades.',
      resultadoEsperado:
        'Exposición real validada en planta y rutas, medidas preventivas sencillas aplicadas y equipo capacitado en actuación segura sin confrontación.',
    }),
  ];
}

/**
 * Permite crear un plan de mejora individual para cualquier otro riesgo de la Matriz GTC 45
 * que no sea uno de los 10 riesgos base, sin mezclarlos ni perder trazabilidad.
 */
export function construirPlanDesdeRiesgoMatriz(
  r: RiesgoGTC45Item,
  orden: number
): PlanMejoraPorRiesgo {
  const medidas = extraerMedidasRiesgo(r);
  const { cargoPrincipal, cargosOficiales } = resolverCargoPrincipalYExpuestos(
    r.cargo,
    r.cargosExpuestos
  );
  const cargo = cargosOficiales.join(', ');
  const hoy = new Date().toISOString().split('T')[0];

  return {
    id: `pmr-mtx-${r.id}`,
    orden,
    claveReferencia: `matriz_${r.id}`,
    nombreRiesgo: `${r.peligroClasificacion}: ${r.peligroDescripcion}`,
    riesgoId: r.id,
    riesgoCodigo: r.codigo || r.id,
    nivelRiesgoMatriz: r.interpretacionNR,
    puntajeMatriz: r.nivelRiesgo,
    procesoMatriz: r.proceso,
    cargoMatriz: cargo,
    actividadMatriz: r.actividades,
    riesgoSnapshot: crearRiesgoSnapshot(r),
    estadoValidacionReal: 'PENDIENTE_VALIDACION',
    motivoValidacionReal:
      'Agregado desde la Matriz de Peligros GTC 45; validar en planta las medidas específicas y recursos antes de ejecutar.',
    situacionQueSeBuscaMejorar: r.peligroDescripcion,
    actividadMejoraPropuesta:
      medidas !== 'Sin medidas registradas en matriz'
        ? medidas
        : `Definir e implementar medidas de prevención y control para ${cargo} en ${r.zonaLugar}.`,
    explicacionSencilla: `Este peligro puede causar: ${r.efectosPosibles}`,
    medidaPrevencionControl: medidas,
    capacitacion: crearCapacitacion({
      requiereCapacitacion: true,
      nombre: `Prevención y control frente a: ${r.peligroClasificacion} (${r.codigo || r.id})`,
      objetivo: `Capacitar específicamente a ${cargo} en cómo prevenir accidentes o molestias por este peligro.`,
      duracionSugerida: '15 minutos',
      temasPrincipales: [
        `Qué es el peligro identificado en ${r.zonaLugar}.`,
        'Cómo usar los controles o elementos de protección del puesto.',
        'A quién avisar si algo falla.',
      ],
      desarrolloSencillo: [
        `1. Antes de iniciar ${r.actividades}, revise que su área y elementos estén en orden.`,
        '2. Aplique las medidas preventivas indicadas en la matriz para su puesto.',
        '3. Reporte cualquier falla o molestia de inmediato.',
      ],
      recomendacionesPracticas: ['Seguir siempre las instrucciones de cuidado del área.'],
      actividadComprension: 'Revisión rápida en el puesto de trabajo con el trabajador encargado.',
      evaluacionSencilla: [
        {
          pregunta: '¿Qué medida principal debe cumplir en este puesto para cuidarse?',
          respuestaEsperada: 'Aplicar los controles definidos y reportar cualquier falla.',
        },
      ],
    }),
    formatosIds: ['fmt-registro-capacitacion-riesgos', 'fmt-reporte-incidentes-condiciones'],
    responsable: cargoPrincipal,
    fechaInicio: '2027-01-15',
    fechaFin: '2027-11-30',
    recursosNecesarios: 'Recursos internos proporcionales a 10 trabajadores (pendiente validar costo exacto).',
    evidenciaRequerida: 'Soporte fotográfico, lista de chequeo o acta firmada para revisión de Gerencia.',
    evidenciasAdjuntas: [],
    resultadoEsperado: `Riesgo ${r.codigo || r.id} controlado en el área ${r.zonaLugar}.`,
    estado: 'Por hacer',
    observacionesGerencia: '',
    historialCambios: [
      {
        id: `hp-mtx-${r.id}-${Date.now()}`,
        fecha: hoy,
        usuario: 'Matriz de Riesgos GTC 45',
        accion: 'Plan generado desde matriz',
        detalle: `Sincronizado con el riesgo ${r.codigo || r.id} (${cargo} - Nivel ${r.interpretacionNR}).`,
      },
    ],
  };
}

// ============================================================================
// 4. SEED DEL PLAN DE PREVENCIÓN, PREPARACIÓN Y RESPUESTA ANTE EMERGENCIAS (20 PUNTOS)
//    - Nunca inventa dirección, teléfonos locales, rutas, salidas, punto de encuentro ni equipos.
//    - Marca explícitamente "Pendiente por definir / verificar en planta" donde falta confirmación.
//    - Nunca instruye a trabajadores sin formación a combatir incendios grandes o reparar gas/electricidad.
//    - Vinculado estrictamente con los 6 cargos oficiales de Frikaz S.A.S.
// ============================================================================

export function crearPlanEmergenciasSeed(): PlanEmergenciasFrikaz {
  return {
    cajaCalidad: crearCajaCalidadEditable(
      'PLAN DE PREVENCIÓN, PREPARACIÓN Y RESPUESTA ANTE EMERGENCIAS – FRIKAZ S.A.S.'
    ),
    identificacionEmpresa: {
      razonSocial: 'Frikaz S.A.S.',
      nit: 'Pendiente por confirmar en cámara de comercio / RUT',
      actividadEconomica:
        'Elaboración y comercialización de snacks fritos (papas, plátanos y pasabocas)',
      numeroTrabajadores:
        '10 trabajadores distribuidos en los 6 cargos oficiales (Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque y Conductor)',
      procesosPrincipales:
        'Selección de materia prima, pelado, fritura en aceite caliente, empaque/sellado y distribución en vehículo.',
      direccionVerificada: 'Pendiente por definir / verificar en planta',
      telefonoEmergenciasInterno: 'Pendiente por definir / verificar en planta',
      horarioOperacion: 'Pendiente por confirmar horario exacto de turnos',
    },
    objetivoGeneral:
      'Proteger la vida y la salud de los 10 trabajadores de Frikaz S.A.S. (en sus 6 cargos oficiales) y visitantes ante cualquier emergencia en planta o entregas, definiendo pasos sencillos, seguros y claros para prevenir, avisar, evacuar y pedir ayuda a tiempo.',
    objetivosEspecificos: [
      'Identificar las emergencias reales posibles en Frikaz S.A.S. (aceite caliente, gas, electricidad, máquinas, sismos, caídas y otras por validar en planta).',
      'Asignar responsabilidades sencillas de emergencia dentro de los 6 cargos oficiales sin crear cargos ficticios ni brigadas irrealizables.',
      'Establecer qué debe hacer y qué NO debe intentar hacer cada trabajador en cada emergencia.',
      'Verificar físicamente en planta los equipos disponibles (extintores, botiquín, camilla, alarma), las salidas reales y el punto de encuentro seguro.',
      'Capacitar al personal y realizar simulacros sencillos para corregir fallas a tiempo.',
    ],
    alcance:
      'Aplica a los 6 cargos oficiales de Frikaz S.A.S. (Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque y Conductor), así como a contratistas o visitantes mientras permanezcan en la planta.',
    descripcionActividadesFrikaz:
      'En Frikaz S.A.S. laboran 10 trabajadores organizados en 6 cargos oficiales: Gerente (dirección y control SST), Operario de selección (clasificación y apoyo Vigía SST), Operario de pelado (peladora y rebanadora), Operario de frito (freidoras con gas y aceite caliente), Operario de empaque (selladora y bodega) y Conductor (entrega de pedidos en ruta).',
    identificacionAmenazasResumen:
      'Se evalúan 10 escenarios principales diferenciando los que ya están confirmados por los procesos de snacks fritos (freidoras, gas, máquinas, electricidad, caídas, sismo) de los que requieren inspección y validación directa en planta o rutas (derrames químicos específicos y robos/inseguridad).',
    analisisVulnerabilidad: {
      enPersonas:
        'Equipo de 10 trabajadores en 6 cargos oficiales donde todos conocen pasos básicos de aviso y evacuación; las funciones de emergencia se asignan dentro de los mismos 6 cargos (con formación pendiente por confirmar).',
      enRecursosYEquipos:
        'Pendiente por verificar en planta: confirmar ubicación real, cantidad y vigencia de extintores, botiquín completo, camilla, linternas y sistema de alarma.',
      enProcesosEInstalaciones:
        'Presencia confirmada de aceite caliente y gas combustible en fritura, equipos eléctricos cerca de humedad y máquinas cortadoras; requiere confirmar salidas despejadas y punto de encuentro.',
      nivelVulnerabilidadActual: 'Pendiente de calificación tras inspección física en planta',
    },
    evaluacionPriorizacion:
      'Prioridad ALTA (confirmadas por operación): Incendio en zona de fritura/empaque, Fuga de gas, Quemaduras por aceite caliente, Accidentes con maquinaria y Contacto eléctrico. Prioridad MEDIA / NATURAL: Emergencias por altas temperaturas, Caídas/lesiones y Sismos. POR VALIDAR EN PLANTA: Derrames de productos químicos (según químicos reales en bodega) y Robos o inseguridad.',
    recursosDisponibles: [
      {
        id: 'rec-ext-k',
        recurso: 'Extintor para grasas y aceites (Clase K) en zona de fritura',
        categoria: 'Contra incendios',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta (cantidad, capacidad y fecha de recarga)',
        observaciones: 'No usar nunca agua si se prende el aceite.',
      },
      {
        id: 'rec-ext-mp',
        recurso: 'Extintor multipropósito (ABC) o CO2 para áreas generales / tablero eléctrico',
        categoria: 'Contra incendios',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta',
        observaciones: 'Verificar manómetro en verde y señalización.',
      },
      {
        id: 'rec-botiquin',
        recurso: 'Botiquín de primeros auxilios (gasas, solución salina, vendas, guantes)',
        categoria: 'Primeros auxilios',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta',
        observaciones: 'Revisar que nada esté vencido; no incluir medicamentos sin fórmula.',
      },
      {
        id: 'rec-camilla',
        recurso: 'Camilla rígida con inmovilizadores y cuello',
        categoria: 'Primeros auxilios',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta',
        observaciones: 'Debe estar accesible y sin cajas encima.',
      },
      {
        id: 'rec-alarma',
        recurso: 'Alarma sonora o pito para dar aviso de evacuación en toda la planta',
        categoria: 'Evacuación y alarma',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta',
        observaciones: 'Debe escucharse incluso con la peladora y extractor encendidos.',
      },
      {
        id: 'rec-kit-derrames',
        recurso: 'Kit básico de contención de derrames / paños absorbentes',
        categoria: 'Control de fugas o derrames',
        estadoVerificacion: 'Pendiente por verificar en planta',
        cantidadUbicacion: 'Pendiente por verificar en planta',
        observaciones: 'Validar según químicos reales usados en limpieza.',
      },
    ],
    organizacionEmergencias: [
      {
        id: 'org-1',
        rol: 'Coordinación general y decisión de evacuación (Función asignada a: Gerente)',
        funcionSencilla:
          'Dar la orden clara de evacuar o suspender labores y liderar la respuesta general de Frikaz S.A.S.',
        responsablePrincipal: 'Gerente (Andrea Orjuela) — pendiente confirmar suplente en turno',
        suplente: 'Operario de selección (función Vigía SST — pendiente confirmar)',
      },
      {
        id: 'org-2',
        rol: 'Activar alarma, dar aviso y corte seguro en planta (Función asignada en: Operario de frito / Operario de pelado)',
        funcionSencilla:
          'Sonar el pito o alarma, avisar a las zonas con ruido y cerrar la llave de gas o apagar máquinas solo si está al alcance y sin peligro.',
        responsablePrincipal: 'Pendiente por asignar entre Operario de frito y Operario de pelado',
        suplente: 'Pendiente por asignar dentro de los 6 cargos oficiales',
      },
      {
        id: 'org-3',
        rol: 'Apoyar la salida y verificar que no quede nadie adentro (Función asignada en: Operario de empaque)',
        funcionSencilla:
          'Guiar al equipo hacia la salida definida, revisar rápidamente área de empaque/bodega sin arriesgarse y abrir la puerta de salida.',
        responsablePrincipal: 'Pendiente por asignar dentro de Operario de empaque',
        suplente: 'Pendiente por asignar dentro de los 6 cargos oficiales',
      },
      {
        id: 'org-4',
        rol: 'Llevar listado y verificar asistencia en el punto de encuentro (Función asignada en: Operario de selección)',
        funcionSencilla:
          'Tomar la lista de los 10 trabajadores del día y contar que todos estén completos y sanos afuera.',
        responsablePrincipal: 'Pendiente por asignar dentro de Operario de selección',
        suplente: 'Gerente (pendiente confirmar)',
      },
      {
        id: 'org-5',
        rol: 'Solicitar ayuda externa y acercar botiquín (Función asignada en: Gerente / Conductor en planta)',
        funcionSencilla:
          'Llamar al 123 / Bomberos / Ambulancia / ARL con dirección exacta, esperar en la puerta para orientarlos y acercar el botiquín básico.',
        responsablePrincipal: 'Pendiente por asignar dentro de los 6 cargos oficiales (con formación por validar)',
        suplente: 'Pendiente por asignar dentro de los 6 cargos oficiales',
      },
    ],
    procedimientoGeneral: [
      '1. MANTENER LA CALMA Y DAR AVISO: Quien vea una emergencia avisa en voz fuerte y activa el pito o alarma para que todos escuchen.',
      '2. PROTEGER LA VIDA PRIMERO: Ningún trabajador debe arriesgarse a apagar un incendio grande, entrar a humo espeso ni arreglar tubos de gas o cables.',
      '3. CORTE SEGURO SOLO SI NO HAY PELIGRO: Si está a un paso y es seguro, cerrar llave de gas o apagar máquina cercana; si hay fuego o humo, salir de inmediato.',
      '4. SALIR CON CALMA: Caminar rápido por la ruta definida sin correr, sin empujar y sin devolverse por bolsos ni pertenencias.',
      '5. CONTARSE AFUERA Y PEDIR AYUDA: Reunirse en el punto de encuentro, pasar lista de los 10 trabajadores y llamar al 123 / Bomberos / Ambulancia / ARL.',
    ],
    escenarios: [
      {
        id: 'esc-incendio',
        nombre: '1. Incendio (freidora, aceite o materiales de empaque)',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por uso continuo de aceite caliente (>160 °C), gas y cajas de cartón/empaque en planta.',
        nivelPrioridad: 'ALTA',
        queHacer: [
          'Dar la voz de alarma de inmediato y alejar a los compañeros de la zona.',
          'Si es un fuego muy pequeño que apenas empieza y el trabajador está entrenado, usar SOLO el extintor adecuado (Clase K para aceite) manteniendo distancia hacia la salida. Si el fuego crece o hay humo, NO intentar apagarlo: evacuar.',
          'Cerrar la llave principal de gas únicamente si se puede hacer desde zona segura sin acercarse al fuego.',
        ],
        queNoHacer: [
          'NUNCA echar agua al aceite caliente en llamas (provoca una llamarada explosiva).',
          'NUNCA obligar a trabajadores sin entrenamiento a combatir un incendio que ya está grande o echando humo negro.',
          'No abrir puertas calientes ni devolverse por objetos.',
        ],
        comoInformar: 'Gritar "¡Fuego!" o sonar la alarma/pito de evacuación sin perder tiempo.',
        aQuienAvisar: 'A todo el equipo en planta, Coordinador de emergencias y Andrea Orjuela – Gerente.',
        cuandoEvacuar: 'De inmediato si el fuego no se controla en pocos segundos, si crece rápido o si empieza a llenarse de humo.',
        comoProtegerse: 'Si hay humo, agacharse cerca del piso, cubrir nariz y boca con un paño seco o la camisa y salir rápido.',
        comoSolicitarAyudaExterna: 'Desde afuera y a salvo, llamar al 123 / Bomberos dando la dirección exacta de la planta.',
      },
      {
        id: 'esc-fuga-gas',
        nombre: '2. Fuga de gas',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por red y quemadores de gas que alimentan las freidoras industriales.',
        nivelPrioridad: 'ALTA',
        queHacer: [
          'Avisar en voz alta para que nadie prenda fósforos, estufas ni máquinas.',
          'Abrir puertas y ventanas para ventilar si se puede hacer al salir.',
          'Cerrar la llave general de gas solo si está en lugar seguro y de paso hacia la salida.',
          'Salir todos de la planta hacia un lugar abierto lejos de la fachada.',
        ],
        queNoHacer: [
          'NUNCA prender ni apagar interruptores de luz eléctrica, extractores ni celulares dentro de la planta.',
          'NUNCA intentar reparar o apretar tuberías o válvulas de gas por cuenta propia.',
          'NUNCA buscar fugas con encendedor o vela.',
        ],
        comoInformar: 'Avisar en voz alta sin usar celulares ni timbres eléctricos dentro del área con olor a gas.',
        aQuienAvisar: 'A todos en planta, Gerencia y empresa de gas / Bomberos.',
        cuandoEvacuar: 'Inmediatamente al sentir olor fuerte a gas o escuchar silbido en tubería.',
        comoProtegerse: 'Alejarse al aire libre, respirar aire limpio y no generar ninguna chispa.',
        comoSolicitarAyudaExterna: 'Ya estando afuera a distancia segura, llamar al 123 / Bomberos y a la línea de emergencias de la empresa de gas.',
      },
      {
        id: 'esc-quemaduras',
        nombre: '3. Quemaduras (aceite caliente, vapor o superficies)',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por fritura con aceite caliente y selladora térmica.',
        nivelPrioridad: 'ALTA',
        queHacer: [
          'Apartar con cuidado a la persona del calor sin pisar aceite derramado.',
          'Enfriar la zona quemada dejando correr agua limpia fresca (NO helada) durante 10 a 20 minutos.',
          'Retirar con suavidad relojes o anillos cerca del área SOLO si no están pegados a la piel.',
          'Cubrir suavemente con gasa limpia estéril sin apretar y llevar o pedir atención médica.',
        ],
        queNoHacer: [
          'NUNCA aplicar crema dental, aceite, café, mantequilla, pomadas ni hielo directo.',
          'NUNCA reventar ampollas ni arrancar ropa que haya quedado pegada a la piel.',
        ],
        comoInformar: 'Avisar en voz clara al encargado de primeros auxilios y a Gerencia.',
        aQuienAvisar: 'Encargado de botiquín/apoyo en planta, Andrea Orjuela – Gerente, ARL / Ambulancia.',
        cuandoEvacuar: 'Solo si la quemadura fue causada por fuego o explosión que siga activa en la planta.',
        comoProtegerse: 'Quien ayude debe ponerse guantes limpios del botiquín y revisar que no siga salpicando aceite.',
        comoSolicitarAyudaExterna: 'Si la quemadura es grande, en cara/manos/ojos o con ampollas extensas, llamar al 123 (Ambulancia) y reportar a la ARL.',
      },
      {
        id: 'esc-altas-temp',
        nombre: '4. Emergencias por altas temperaturas (golpe de calor o desmayo)',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado en área de fritura cuando hay jornadas largas o falla la extracción de aire caliente.',
        nivelPrioridad: 'MEDIA',
        queHacer: [
          'Llevar al trabajador a un lugar fresco y con sombra o aire limpio.',
          'Aflojar ropa apretada (delantal, gorra/cofia, cuello) y recostarlo con piernas un poco elevadas si está mareado.',
          'Si está despierto y puede tragar bien, darle sorbos pequeños de agua fresca; humedecer frente y cuello con paño húmedo.',
        ],
        queNoHacer: [
          'NUNCA darle bebidas ni agua a la fuerza si la persona está desmayada o confundida.',
          'No dejarlo solo ni volverlo a poner frente a la freidora el resto del turno sin valoración.',
        ],
        comoInformar: 'Avisar al compañero más cercano y al coordinador de emergencias.',
        aQuienAvisar: 'Coordinador SST, Andrea Orjuela – Gerente y EPS/ARL si no mejora rápido.',
        cuandoEvacuar: 'Trasladar a la persona afectada a la zona fresca o exterior ventilado; no requiere evacuar toda la planta.',
        comoProtegerse: 'Apagar o vigilar la freidora mientras otro compañero acompaña al trabajador afectado.',
        comoSolicitarAyudaExterna: 'Si no despierta, vomita, tiene fiebre muy alta o convulsiona, llamar al 123 (Ambulancia) de inmediato.',
      },
      {
        id: 'esc-maquinaria',
        nombre: '5. Accidentes con maquinaria (corte o atrapamiento)',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por uso de peladora mecánica, rebanadora con cuchillas y selladora continua.',
        nivelPrioridad: 'ALTA',
        queHacer: [
          'Presionar el botón rojo de parada de emergencia o desconectar la máquina DE INMEDIATO.',
          'Si hay sangrado, ponerse guantes limpios y presionar firme con gasa o paño limpio sobre la herida.',
          'Mantener abrigado y calmado al compañero mientras llega la ambulancia.',
        ],
        queNoHacer: [
          'NUNCA jalar a la fuerza una mano o dedo que haya quedado atrapado dentro de rodillos o engranajes; esperar a personal de rescate si no sale fácil tras apagar.',
          'NUNCA meter la mano en la máquina si aún gira o está conectada.',
          'NUNCA lavar una herida profunda con alcohol ni echar sustancias.',
        ],
        comoInformar: 'Gritar para que apaguen el equipo enseguida y activar la ayuda médica.',
        aQuienAvisar: 'Operario más cercano (para apagar equipo), Gerencia, 123 (Ambulancia/Bomberos si hay atrapamiento) y ARL.',
        cuandoEvacuar: 'Despejar alrededor del herido para que respire y pueda entrar la ayuda.',
        comoProtegerse: 'Desconectar el enchufe o bajar el taco de la máquina antes de acercar las manos.',
        comoSolicitarAyudaExterna: 'Llamar al 123 indicando si la persona está atrapada en una máquina o tiene herida grave, y reportar a la ARL.',
      },
      {
        id: 'esc-electrico',
        nombre: '6. Contacto eléctrico / descarga',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por operación de equipos de 220V en zonas con agua y grasa.',
        nivelPrioridad: 'ALTA',
        queHacer: [
          'PRIMERO cortar la corriente bajando el taco general o desenchufando SOLO si es seguro y con manos secas.',
          'Solo cuando la corriente esté cortada, acercarse a revisar si la persona respira.',
          'Si la energía no se puede cortar, alejar a los demás y esperar a bomberos/empresa de energía.',
        ],
        queNoHacer: [
          'NUNCA tocar directamente a una persona que sigue pegada a un cable o máquina con corriente (usted también se electrocuta).',
          'NUNCA usar objetos metálicos ni mojados para separarla, ni intentar reparar el daño eléctrico.',
        ],
        comoInformar: 'Avisar a gritos "¡Peligro eléctrico, corten la luz!" para que nadie toque a la víctima.',
        aQuienAvisar: 'Quien pueda bajar el taco principal de forma segura, Gerencia y 123 (Ambulancia).',
        cuandoEvacuar: 'Si hay chispas, humo en el tablero o peligro de fuego, evacuar toda la planta de inmediato.',
        comoProtegerse: 'Mantenerse en piso seco, con botas de caucho y a distancia hasta confirmar energía cortada.',
        comoSolicitarAyudaExterna: 'Llamar siempre al 123 para valoración médica urgente (la electricidad puede afectar el corazón aunque por fuera no se vea herida).',
      },
      {
        id: 'esc-quimicos',
        nombre: '7. Derrames o contacto con productos químicos de limpieza',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'PENDIENTE_VALIDACION',
        sustentoEnFrikaz:
          'Pendiente validar listado completo y cantidades reales de desengrasantes/desinfectantes presentes en planta.',
        nivelPrioridad: 'POR_VALIDAR',
        queHacer: [
          'Alejar al personal del área del derrame y abrir puertas para ventilar.',
          'Revisar la etiqueta o Ficha de Seguridad del producto real antes de recogerlo.',
          'Si cayó en ojos o piel: lavar con abundante agua limpia de forma continua durante 15 minutos.',
          'Recoger derrames pequeños solo con guantes gruesos de nitrilo, gafas y paño/material absorbente.',
        ],
        queNoHacer: [
          'NUNCA mezclar otros productos químicos sobre el derrame (ej. echar cloro sobre otro líquido).',
          'NUNCA limpiar con las manos sin guantes ni oler el líquido directamente para adivinar qué es.',
        ],
        comoInformar: 'Avisar al responsable de aseo/SST indicando exactamente qué producto se regó.',
        aQuienAvisar: 'Compañeros del área, Coordinador SST y Gerencia.',
        cuandoEvacuar: 'Si el derrame desprende gas irritante fuerte que hace toser o arder los ojos, salir todos al aire libre.',
        comoProtegerse: 'Ponerse gafas cerradas y guantes de nitrilo; nunca tocar el producto directo.',
        comoSolicitarAyudaExterna: 'Si alguien inhaló vapores fuertes, tragó químico o tuvo salpicadura en ojos, llamar al 123 / ambulancia llevando el nombre exacto del producto.',
      },
      {
        id: 'esc-caidas',
        nombre: '8. Caídas y lesiones graves en planta',
        origen: 'TECNOLOGICO_OPERATIVO',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por circulación en pisos que pueden humedecerse con agua o grasa y manejo de bultos.',
        nivelPrioridad: 'MEDIA',
        queHacer: [
          'Acudir a ayudar mirando que no haya aceite o cables cerca para no caer también.',
          'Si la persona se golpeó fuerte la cabeza, cuello o espalda o no puede apoyar un pie/brazo: NO moverla; abrigarla y tranquilizarla.',
          'Si es un golpe leve sin herida ni sospecha de fractura, ayudar a sentarse con calma y valorar con botiquín.',
        ],
        queNoHacer: [
          'NUNCA levantar de golpe ni sentar a alguien que se golpeó la espalda, cadera o cabeza.',
          'NUNCA sobar ni intentar acomodar un hueso o articulación torcida.',
        ],
        comoInformar: 'Avisar al encargado de primeros auxilios y a Andrea Orjuela – Gerente.',
        aQuienAvisar: 'Equipo en planta, Gerencia y línea de emergencias si hay dolor intenso o golpe en cabeza.',
        cuandoEvacuar: 'No requiere evacuar planta, salvo despejar la zona para atención.',
        comoProtegerse: 'Asegurar que máquinas cercanas queden apagadas si estaban al lado de la caída.',
        comoSolicitarAyudaExterna: 'Llamar al 123 (Ambulancia) si hubo golpe en cabeza, desmayo o sospecha de fractura, y reportar a ARL.',
      },
      {
        id: 'esc-sismo',
        nombre: '9. Sismos o temblores',
        origen: 'NATURAL',
        estadoValidacion: 'CONFIRMADO',
        sustentoEnFrikaz:
          'Confirmado por ubicación en zona sísmica y presencia de estanterías, freidoras con aceite caliente y tubería de gas.',
        nivelPrioridad: 'MEDIA',
        queHacer: [
          'DURANTE EL TEMBLOR: Mantener la calma, alejarse de inmediato de las freidoras con aceite caliente, estanterías altas y vidrios; proteger la cabeza agachándose junto a una zona firme.',
          'DESPUÉS DEL TEMBLOR: Apagar equipos y cerrar la llave de gas si es seguro; salir en calma hacia el punto de encuentro definido.',
          'Contar a los 10 trabajadores afuera y revisar si hay grietas o olor a gas antes de volver a entrar.',
        ],
        queNoHacer: [
          'NUNCA correr desesperado ni salir justo al lado de freidoras llenas mientras tiembla fuerte.',
          'NUNCA quedarse debajo de estanterías sin anclar ni debajo de cables eléctricos en la calle.',
          'No encender llamas ni revisar fugas de gas con fósforos al volver.',
        ],
        comoInformar: 'Al terminar el movimiento, dar la orden clara de evacuar en orden y pasar lista afuera.',
        aQuienAvisar: 'A los 10 trabajadores, Gerencia y autoridades locales (123) si hay personas heridas o daños en estructura/gas.',
        cuandoEvacuar: 'Apenas termine el movimiento fuerte, evacuar toda la planta al punto de encuentro.',
        comoProtegerse: 'Alejarse de aceite hirviendo, vidrios y objetos pesados que puedan caer.',
        comoSolicitarAyudaExterna: 'Si alguien queda atrapado o herido o si se rompe un tubo de gas, llamar al 123 desde el punto de encuentro.',
      },
      {
        id: 'esc-robos',
        nombre: '10. Robos o situaciones de inseguridad (planta o entregas)',
        origen: 'SOCIAL',
        estadoValidacion: 'PENDIENTE_VALIDACION',
        sustentoEnFrikaz:
          'Pendiente validar nivel real de exposición en alrededores de planta y rutas de entrega actuales.',
        nivelPrioridad: 'POR_VALIDAR',
        queHacer: [
          'Mantener la calma en todo momento, respirar profundo y obedecer sin discutir.',
          'Mantener las manos visibles y avisar con tranquilidad antes de hacer cualquier movimiento.',
          'Solo cuando los agresores se hayan ido y exista seguridad, cerrar la puerta o resguardarse, atender a quien esté asustado o golpeado y avisar.',
        ],
        queNoHacer: [
          'NUNCA enfrentar, forcejear, gritar, amenazar ni perseguir a un ladrón o persona armada.',
          'NUNCA arriesgar la vida por defender cajas de producto, efectivo o un celular.',
        ],
        comoInformar: 'Avisar en silencio solo si es seguro; de lo contrario, reportar apenas termine el riesgo.',
        aQuienAvisar: 'Policía (123) y Andrea Orjuela – Gerente apenas esté a salvo.',
        cuandoEvacuar: 'Salir o refugiarse en zona segura únicamente cuando no aumente el peligro.',
        comoProtegerse: 'Cuidar primero la vida propia y de los compañeros sin confrontación.',
        comoSolicitarAyudaExterna: 'Llamar al 123 (Policía y Ambulancia si hubo lesión física) cuando ya esté fuera de peligro.',
      },
    ],
    rutasSalidasEvacuacion: {
      rutaPrincipal:
        'Pendiente por definir / verificar en planta: recorrer desde cada puesto (selección, pelado, fritura, empaque y oficina) hasta la puerta principal o salida segura.',
      salidasEmergencia:
        'Pendiente por definir / verificar en planta (confirmar cantidad real de puertas, ancho y que abran sin candado durante toda la jornada).',
      senalizacionEIluminacion:
        'Pendiente por verificar en planta (flechas verdes visibles y luz si se corta la energía).',
      observaciones: '',
    },
    puntoEncuentro: {
      ubicacionDefinida:
        'Pendiente por definir / verificar en planta (debe ser un lugar abierto, seguro, lejos de vidrios, postes eléctricos y circulación rápida de vehículos).',
      criterioSeguridad:
        'Verificar que los 10 trabajadores quepan cómodos sin quedar expuestos a tráfico ni cables caídos.',
      verificacionConteo:
        'La persona encargada de lista verifica nombre por nombre a los 10 trabajadores del día antes de autorizar cualquier reingreso.',
    },
    comunicacionAyudaExterna: {
      mecanismoAlarmaInterna:
        'Pendiente por definir / verificar en planta (ej. pito de alto alcance o timbre audible desde pelado y fritura).',
      directorioExterno: [
        {
          id: 'dir-123',
          entidad: 'Línea Única de Emergencias (Policía / Bomberos / Ambulancia)',
          telefono: '123 (Confirmar operación local)',
          cuandoLlamar: 'Cualquier emergencia con heridos, fuego, fuga de gas o atraco.',
        },
        {
          id: 'dir-arl',
          entidad: 'ARL de Frikaz S.A.S. (Atención accidentes de trabajo)',
          telefono: 'Pendiente por verificar número real de póliza ARL',
          cuandoLlamar: 'Todo accidente ocurrido durante el trabajo o en ruta laboral.',
        },
        {
          id: 'dir-gas',
          entidad: 'Empresa distribuidora de Gas (Emergencias fugas)',
          telefono: 'Pendiente por verificar número real de recibo de gas',
          cuandoLlamar: 'Olor fuerte a gas o daño en tubería/medidor.',
        },
        {
          id: 'dir-luz',
          entidad: 'Empresa de Energía Eléctrica',
          telefono: 'Pendiente por verificar número real de recibo de luz',
          cuandoLlamar: 'Cables caídos en exterior o falla en acometida eléctrica.',
        },
        {
          id: 'dir-gerencia',
          entidad: 'Andrea Orjuela – Gerente (Contacto interno principal)',
          telefono: 'Pendiente por confirmar teléfono actualizado en cartelera',
          cuandoLlamar: 'Aviso inmediato ante cualquier emergencia en planta o entrega.',
        },
      ],
    },
    programaCapacitacionSimulacros: [
      {
        id: 'emg-act-1',
        tipo: 'CAPACITACION',
        titulo: 'Socialización del Plan de Emergencias y roles en los 6 cargos oficiales',
        descripcionSencilla:
          'Explicar a todo el equipo qué emergencias aplican a Frikaz S.A.S., qué rol asume cada cargo oficial, por dónde salir y dónde reunirse.',
        objetivo: 'Que los 10 trabajadores (en sus 6 cargos oficiales) conozcan y entiendan el Plan de Emergencias.',
        fechaProgramada: 'Julio 2027',
        responsable: 'Gerente y Operario de selección',
        participantesEsperados: '10 trabajadores de Frikaz S.A.S. (6 cargos oficiales)',
        estado: 'Por hacer',
        observaciones: '',
        evidencias: [],
        materialCapacitacion: crearCapacitacion({
          requiereCapacitacion: true,
          nombre: 'Socialización del Plan de Emergencias de Frikaz S.A.S.',
          objetivo:
            'Presentar en lenguaje claro el Plan de Emergencias, la alarma, las salidas verificadas, el punto de encuentro y la función de cada uno de los 6 cargos oficiales.',
          duracionSugerida: '30 minutos',
          temasPrincipales: [
            'Cuáles son nuestras emergencias reales y cuáles requieren cuidado diario.',
            'La señal de aviso o pito de emergencia.',
            'Funciones sencillas asignadas dentro de los 6 cargos oficiales.',
            'Camino al punto de encuentro y lista de asistencia.',
          ],
          desarrolloSencillo: [
            '1. Explicar los 5 pasos del procedimiento general (calma, proteger vida, corte seguro si aplica, salir sin correr, contarse afuera).',
            '2. Confirmar en voz alta quién tiene cada función y su suplente entre los 6 cargos oficiales.',
            '3. Hacer recorrido a pie hasta la salida y el punto de encuentro.',
          ],
          recomendacionesPracticas: [
            'Preguntar cualquier duda sobre cómo apagar su propia máquina antes de salir.',
          ],
          actividadComprension: 'Caminata grupal desde cada puesto hasta el punto de encuentro.',
          evaluacionSencilla: [
            {
              pregunta: '¿Qué es lo primero que hacemos al llegar al punto de encuentro?',
              respuestaEsperada:
                'Permanecer juntos y esperar a que pasen lista de los 10 trabajadores.',
            },
          ],
        }),
      },
      {
        id: 'emg-act-2',
        tipo: 'CAPACITACION',
        titulo: 'Actuación segura ante incendios en freidoras y uso básico de extintores',
        descripcionSencilla:
          'Aprender qué hacer si se prende el aceite, por qué jamás echar agua, cuándo evacuar y práctica con apoyo de ARL/Bomberos.',
        objetivo: 'Prevenir quemaduras graves o incendios descontrolados en fritura.',
        fechaProgramada: 'Agosto 2027',
        responsable: 'Operario de frito',
        participantesEsperados: '10 trabajadores (énfasis en Operario de frito)',
        estado: 'Por hacer',
        observaciones: '',
        evidencias: [],
        materialCapacitacion: crearCapacitacion({
          requiereCapacitacion: true,
          nombre: 'Actuación segura ante incendios y grasas calientes',
          objetivo:
            'Diferenciar un conato controlable de un incendio para evacuar y prohibir el uso de agua en aceite caliente.',
          duracionSugerida: '25 minutos',
          temasPrincipales: [
            'Por qué el agua explota al caer en aceite caliente.',
            'Extintor Clase K vs extintor multipropósito.',
            'Cuándo evacuar inmediatamente sin arriesgarse.',
          ],
          desarrolloSencillo: [
            '1. Si el fuego en la freidora es grande o hay humo denso, NO se acerque: salga y avise a Bomberos.',
            '2. Solo si recibió práctica previa y el fuego apenas comienza, apague el gas desde lejos y use el extintor apuntando con calma dejando la salida a su espalda.',
          ],
          recomendacionesPracticas: [
            'Mantener el extintor siempre libre, sin canastillas delante.',
          ],
          actividadComprension: 'Identificar físicamente dónde está cada extintor en planta y qué dice su etiqueta.',
          evaluacionSencilla: [
            {
              pregunta: '¿Qué extintor sirve para incendios de aceite de cocina/freidora?',
              respuestaEsperada: 'El extintor especial Clase K (nunca agua).',
            },
          ],
        }),
      },
      {
        id: 'emg-act-3',
        tipo: 'CAPACITACION',
        titulo: 'Actuación ante fugas de gas y emergencias eléctricas',
        descripcionSencilla:
          'Qué hacer si huele a gas o hay falla eléctrica sin provocar chispas ni tocar cables ni tuberías.',
        objetivo: 'Evitar explosiones o electrocuciones por reacciones inseguras.',
        fechaProgramada: 'Agosto 2027',
        responsable: 'Operario de frito',
        participantesEsperados: '10 trabajadores (6 cargos oficiales)',
        estado: 'Por hacer',
        observaciones: '',
        evidencias: [],
        materialCapacitacion: crearCapacitacion({
          requiereCapacitacion: true,
          nombre: 'Actuación segura ante fuga de gas o falla eléctrica',
          objetivo:
            'Enseñar acciones prohibidas (interruptores, celulares, tocar víctimas energizadas) y pasos seguros de evacuación.',
          duracionSugerida: '20 minutos',
          temasPrincipales: [
            'Cero chispas cuando huele a gas.',
            'Cortar luz antes de acercarse en accidente eléctrico.',
            'Llamar a personal técnico certificado, nunca reparar sin saber.',
          ],
          desarrolloSencillo: [
            '1. Olor a gas = abrir puertas, cerrar llave si es seguro, NO tocar interruptores y salir.',
            '2. Descarga eléctrica = bajar taco general primero; jamás tocar al compañero directo si sigue conectado.',
          ],
          recomendacionesPracticas: ['Memorizar la ubicación de la llave general de gas y el tablero principal.'],
          actividadComprension: 'Señalar sin tocar la llave de gas y la caja principal de tacos.',
          evaluacionSencilla: [
            {
              pregunta: '¿Qué debemos hacer antes de tocar a alguien que recibió una descarga eléctrica?',
              respuestaEsperada: 'Cortar primero la corriente eléctrica desde el taco principal de forma segura.',
            },
          ],
        }),
      },
      {
        id: 'emg-act-4',
        tipo: 'CAPACITACION',
        titulo: 'Evacuación ordenada en planta y punto de encuentro',
        descripcionSencilla:
          'Práctica paso a paso de cómo apagar equipos con seguridad, salir en orden y pasar lista de los 10 trabajadores.',
        objetivo: 'Lograr una evacuación ordenada sin tropiezos ni olvido de personal.',
        fechaProgramada: 'Agosto 2027',
        responsable: 'Operario de empaque',
        participantesEsperados: '10 trabajadores (6 cargos oficiales)',
        estado: 'Por hacer',
        observaciones: '',
        evidencias: [],
        materialCapacitacion: crearCapacitacion({
          requiereCapacitacion: true,
          nombre: 'Evacuación ordenada y conteo en punto de encuentro',
          objetivo: 'Practicar la salida segura por la ruta definida sin correr ni devolverse.',
          duracionSugerida: '20 minutos',
          temasPrincipales: [
            'Señal de salida y orden de evacuación.',
            'Ayuda mutua para salir sin empujar.',
            'Conteo en el punto de encuentro y prohibición de entrar sin orden.',
          ],
          desarrolloSencillo: [
            '1. Al escuchar la alarma, suspenda la tarea, apague su equipo si está a la mano y camine hacia la salida.',
            '2. Si hay visitantes o proveedores adentro, guíelos con usted.',
            '3. En el punto de encuentro quédese con el grupo hasta que pasen lista.',
          ],
          recomendacionesPracticas: ['Mantener siempre las salidas libres de cajas.'],
          actividadComprension: 'Caminata de práctica desde puestos de trabajo hasta punto de encuentro.',
          evaluacionSencilla: [
            {
              pregunta: '¿Se puede devolver un trabajador a buscar su chaqueta o celular si ya evacuó?',
              respuestaEsperada: 'No. Nadie vuelve a entrar hasta que se confirme que es seguro.',
            },
          ],
        }),
      },
      {
        id: 'emg-act-5',
        tipo: 'CAPACITACION',
        titulo: 'Primeros auxilios básicos (quemaduras, cortes, golpes de calor y desmayos)',
        descripcionSencilla:
          'Qué hacer mientras llega la ambulancia usando el botiquín básico y qué errores evitar (como echar remedios caseros en quemaduras).',
        objetivo: 'Brindar atención inicial segura en accidentes frecuentes de planta de alimentos.',
        fechaProgramada: 'Agosto / Septiembre 2027',
        responsable: 'Operario de selección',
        participantesEsperados: '10 trabajadores (6 cargos oficiales)',
        estado: 'Por hacer',
        observaciones: '',
        evidencias: [],
        materialCapacitacion: crearCapacitacion({
          requiereCapacitacion: true,
          nombre: 'Primeros auxilios básicos para planta de alimentos',
          objetivo: 'Capacitar en atención inicial segura de quemaduras, cortadas, desmayos y caídas.',
          duracionSugerida: '30 minutos',
          temasPrincipales: [
            'Cómo lavar y cubrir una quemadura (solo agua fresca y gasa limpia).',
            'Cómo detener sangrado en una cortada con presión limpia.',
            'Cuándo NO mover a un accidentado (golpes fuertes de cabeza o espalda).',
          ],
          desarrolloSencillo: [
            '1. Póngase guantes limpios del botiquín antes de atender una herida.',
            '2. En quemaduras: agua limpia fresca 10-20 minutos, nada de cremas ni remedios.',
            '3. En golpes fuertes o caídas: no mueva al compañero y llame al 123.',
          ],
          recomendacionesPracticas: ['Revisar cada mes que el botiquín tenga gasas, guantes y solución salina.'],
          actividadComprension: 'Abrir el botiquín real de planta y reconocer para qué sirve cada elemento.',
          evaluacionSencilla: [
            {
              pregunta: '¿Qué es lo único que se debe echar sobre una quemadura reciente?',
              respuestaEsperada: 'Agua limpia fresca (nunca hielo, crema dental, aceite ni café).',
            },
          ],
        }),
      },
      {
        id: 'emg-sim-1',
        tipo: 'SIMULACRO',
        titulo: 'Simulacro anual de evacuación en planta Frikaz S.A.S.',
        descripcionSencilla:
          'Ejercicio práctico completo con los 10 trabajadores: sonar alarma, suspender equipos, salir al punto de encuentro, pasar lista y anotar qué mejorar.',
        objetivo:
          'Medir cuánto tiempo tardamos en evacuar y detectar fallas reales (alarma, puertas, rutas o roles) para corregirlas.',
        fechaProgramada: 'Octubre 2027 (siempre que existan las condiciones necesarias)',
        responsable: 'Gerente',
        participantesEsperados: 'Los 10 trabajadores de Frikaz S.A.S. (6 cargos oficiales)',
        estado: 'Por hacer',
        observaciones: 'Llenar el formato de Registro y Evaluación de Simulacros y el Plan de Mejora post-simulacro después de hacerlo.',
        evidencias: [],
      },
    ],
    actividadesPrimerosAuxilios: [
      {
        id: 'pa-brig-01',
        tipoActividad: 'Capacitación en primeros auxilios',
        nombre: 'Capacitación en primeros auxilios básicos para brigada y planta Frikaz',
        objetivo: 'Fortalecer los conocimientos básicos de los trabajadores para brindar auxilio seguro y oportuno mientras llega atención médica.',
        descripcion: 'Sesión práctica sobre bioseguridad con guantes del botiquín, control básico de heridas y qué no hacer en quemaduras por aceite.',
        fechaProgramada: '2027-03-18',
        fechaRealizacion: '',
        responsable: 'Operario de selección',
        participantes: [],
        participantesNotas: '10 trabajadores de Frikaz S.A.S. (6 cargos oficiales)',
        estado: 'Pendiente',
        evidencias: [],
        observaciones: 'Programada para vigencia 2027; pendiente de ejecución y adjunto de lista de asistencia.',
        indicadorCodigo: 'IND-EMG-PA',
      },
      {
        id: 'pa-brig-02',
        tipoActividad: 'Atención inicial de lesiones',
        nombre: 'Taller de atención inicial de lesiones en cocina, pelado y fritura',
        objetivo: 'Asegurar respuesta inicial correcta ante quemaduras térmicas por aceite caliente y cortes leves en peladora/rebanadora.',
        descripcion: 'Demostración práctica de lavado con agua fresca (10-20 min) en quemaduras, presión directa limpia en sangrados y verificación del botiquín.',
        fechaProgramada: '2027-05-14',
        fechaRealizacion: '',
        responsable: 'Operario de frito',
        participantes: [],
        participantesNotas: 'Brigadistas y operarios de planta',
        estado: 'Pendiente',
        evidencias: [],
        observaciones: 'Requiere verificar insumos vigentes en botiquín antes de la práctica.',
        indicadorCodigo: 'IND-EMG-PA',
      },
      {
        id: 'pa-brig-03',
        tipoActividad: 'Valoración básica de una persona afectada',
        nombre: 'Entrenamiento en valoración básica de una persona afectada (desmayo o golpe de calor)',
        objetivo: 'Capacitar en la verificación segura de conciencia, respiración y signos de alarma sin mover inadecuadamente al trabajador lesionado.',
        descripcion: 'Revisión paso a paso para identificar desmayos por calor en freidoras, caídas en piso húmedo y señales que obligan a no movilizar.',
        fechaProgramada: '2027-06-25',
        fechaRealizacion: '',
        responsable: 'Operario de pelado',
        participantes: [],
        participantesNotas: 'Brigada de emergencias y personal de planta',
        estado: 'Pendiente',
        evidencias: [],
        observaciones: 'Pendiente de realización en planta.',
        indicadorCodigo: 'IND-EMG-PA',
      },
      {
        id: 'pa-brig-04',
        tipoActividad: 'Activación de la ruta de atención',
        nombre: 'Ejercicio de activación de la ruta de atención (123, ARL y Gerencia)',
        objetivo: 'Validar que cualquier integrante de la brigada sepa activar con rapidez la línea 123, la ARL y el reporte a Gerencia.',
        descripcion: 'Simulación de llamada de emergencia con ubicación exacta de planta, notificación a Andrea Orjuela – Gerente y registro de evento en ARL.',
        fechaProgramada: '2027-08-12',
        fechaRealizacion: '',
        responsable: 'Gerente',
        participantes: [],
        participantesNotas: 'Gerencia, Brigada y Conductor (rutas de entrega)',
        estado: 'Pendiente',
        evidencias: [],
        observaciones: 'Confirmar previamente números actualizados de ARL y cuadrante en cartelera.',
        indicadorCodigo: 'IND-EMG-PA',
      },
      {
        id: 'pa-brig-05',
        tipoActividad: 'Práctica de respuesta ante emergencias',
        nombre: 'Práctica integral de respuesta ante emergencias y traslado con camilla/botiquín',
        objetivo: 'Evaluar la coordinación real de la brigada entre atención inicial en primeros auxilios y evacuación hacia el punto de encuentro.',
        descripcion: 'Ejercicio práctico previo al simulacro anual integrando señal de alarma, atención primaria y conteo completo de los 10 trabajadores.',
        fechaProgramada: '2027-09-24',
        fechaRealizacion: '',
        responsable: 'Operario de empaque',
        participantes: [],
        participantesNotas: '10 trabajadores de Frikaz S.A.S.',
        estado: 'Pendiente',
        evidencias: [],
        observaciones: 'Debe registrar evidencias fotográficas y fecha real antes de marcarse como Realizada.',
        indicadorCodigo: 'IND-EMG-PA',
      },
    ] as ActividadPrimerosAuxiliosBrigada[],
    inspeccionEquiposPrograma: {
      frecuenciaSugerida: 'Revisión mensual de extintores, botiquín y salidas despejadas',
      responsable: 'Operario de selección',
      criteriosRevision:
        'Comprobar manómetro en verde, fecha vigente de recarga, botiquín sin elementos vencidos, salidas sin candados y pito/alarma funcionando.',
      proximaInspeccion: 'Septiembre 2027 (verificación previa antes del simulacro)',
    },
    evidenciasPlan: [],
    seguimientoActualizacion: {
      estado: 'Por hacer',
      frecuenciaRevision: 'Revisión anual y cada vez que cambien equipos, sede o procesos en planta',
      ultimaRevision: 'Pendiente por definir tras validación en planta',
      observacionesGerencia: '',
    },
    formatosEmergenciaIds: [
      'fmt-emg-amenazas-vulnerabilidad',
      'fmt-emg-inspeccion-recursos',
      'fmt-emg-rutas-evacuacion',
      'fmt-emg-registro-simulacro',
      'fmt-emg-asistencia-capacitacion',
      'fmt-emg-mejora-post-simulacro',
    ],
  };
}
