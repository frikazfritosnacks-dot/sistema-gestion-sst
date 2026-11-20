// ============================================================================
// SERVICIO OFICIAL: PARTES INTERESADAS Y CHECKLISTS - FRIKAZ S.A.S.
// Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST)
// Sede: Bosa, Bogotá D.C. — NIT: 901.458.723-1
// ============================================================================

import ExcelJS from 'exceljs';
import {
  ParteInteresada,
  CargoChecklistInterno,
  ItemChecklistNecesidad,
  RegistroHistorialChecklist,
  IndicadoresGlobalesPartesInteresadas,
  ResumenIndicadoresCargo,
} from '../types/partesInteresadas';
import { esEstadoExclusivoGerente, normalizarEstadoEstandar } from './gerenteControlService';

const STORAGE_KEY_PARTES = 'frikaz_partes_interesadas_v1';
const STORAGE_KEY_CHECKLIST = 'frikaz_checklist_partes_v1';
const STORAGE_KEY_HISTORIAL = 'frikaz_historial_checklist_v1';
const STORAGE_KEY_PLAIN_LANG = 'frikaz_partes_plain_lang_v1';
const STORAGE_KEY_GERENTE_GATE = 'frikaz_partes_gerente_gate_v1';

// ----------------------------------------------------------------------------
// DATOS SEMILLA: PARTES INTERESADAS (INTERNAS Y EXTERNAS)
// ----------------------------------------------------------------------------

export const PARTES_INTERESADAS_INICIALES: ParteInteresada[] = [
  // A. PARTES INTERESADAS INTERNAS
  {
    id: 'pi-int-01',
    nombre: 'Gerente (Dirección de la Empresa)',
    clasificacion: 'interna',
    descripcion:
      'Persona encargada de dirigir Frikaz S.A.S., aprobar el dinero para seguridad y cuidar que la empresa funcione bien y sin accidentes.',
    necesidadesExpectativas:
      'Saber cómo están los riesgos en la planta y las entregas, cumplir las leyes de trabajo, invertir bien el presupuesto de seguridad y evitar accidentes o multas.',
    peligrosSituaciones:
      'Problemas legales o multas graves si ocurre un accidente serio, sanciones por no cumplir las reglas mínimas de la Resolución 0312 de 2019 y paradas en la producción.',
    posiblesAfectaciones:
      'Demandas, multas del Ministerio del Trabajo, mala imagen de la empresa y gastos altos por incapacidades o indemnizaciones.',
    medidasPrevencionControl:
      'Aprobar a tiempo el presupuesto anual, revisar cada 6 meses cómo va la seguridad (SG-SST), hacer auditorías, contar con asesoría técnica externa y revisar los avances cada mes.',
    seguimiento:
      'Reunión mensual de dirección, informe anual de cuentas claras y revisión de cómo va la seguridad en la empresa.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-int-02',
    nombre: 'Operarios (Producción y Planta)',
    clasificacion: 'interna',
    descripcion:
      'Trabajadores que seleccionan, lavan, pelan, rebanan, fríen en aceite caliente (más de 160 °C, hasta 180 °C) y empacan nuestros productos.',
    necesidadesExpectativas:
      'Trabajar en un lugar seguro, tener máquinas con protectores puestos, recibir elementos de protección (EPP) adecuados para el calor y cortes, capacitación clara, pausas activas y botiquín listo.',
    peligrosSituaciones:
      'Quemaduras graves por salpicaduras de aceite caliente, atraparse las manos en rebanadoras o peladoras, resbalones por pisos con grasa o agua, cansancio por estar de pie mucho tiempo y cortes con cuchillas.',
    posiblesAfectaciones:
      'Quemaduras en la piel, heridas profundas, pérdida de dedos o manos, fracturas, dolores fuertes de espalda o piernas y desánimo en el trabajo.',
    medidasPrevencionControl:
      'Revisar y hacer mantenimiento cada 15 días a freidoras y selladoras; entregar guantes largos contra el calor, delantales impermeables y botas antideslizantes; limpiar la campana y trampa de grasa; y poner avisos visibles de peligro.',
    seguimiento:
      'Revisiones semanales de seguridad en planta, reporte diario de cosas peligrosas con el Vigía de SST (compañero encargado de vigilar la seguridad) y charlas cortas de 5 minutos antes de empezar el turno.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-int-03',
    nombre: 'Conductor (Entregas y Reparto)',
    clasificacion: 'interna',
    descripcion:
      'Trabajador encargado de cargar, asegurar, transportar y entregar los paquetes de papas, plátanos y chicharrón a tiendas y clientes.',
    necesidadesExpectativas:
      'Tener el furgón en buen estado mecánico, mantenimientos al día, rutas con tiempos reales para no ir con afán, equipo de seguridad en vía y apoyo para no cargar demasiado peso.',
    peligrosSituaciones:
      'Choques o accidentes de tránsito en la ciudad o carretera, fallas de frenos o dirección, dolor de espalda por levantar canastillas pesadas, estrés por el tráfico y robos en la calle.',
    posiblesAfectaciones:
      'Golpes fuertes en todo el cuerpo, fracturas, dolor de cuello o espalda baja, hernias y daños en el vehículo o la mercancía.',
    medidasPrevencionControl:
      'Plan de Seguridad Vial (PESV: reglas para manejar seguro), revisión rápida del carro todos los días antes de salir, mantenimiento a tiempo, guantes de buen agarre, curso de manejo preventivo y forma correcta de levantar cajas (máximo 25 kg hombres / 12,5 kg mujeres).',
    seguimiento:
      'Revisión diaria de la hoja de chequeo del vehículo, control de kilómetros recorridos y reporte inmediato de cualquier susto o falla en la ruta.',
    fechaActualizacion: '2026-03-01',
  },

  // B. PARTES INTERESADAS EXTERNAS
  {
    id: 'pi-ext-01',
    nombre: 'Proveedores (Quienes nos traen insumos)',
    clasificacion: 'externa',
    descripcion:
      'Personas y empresas que nos traen papa, plátano, tocino, aceite, condimentos, bolsas de empaque, gas y productos de limpieza.',
    necesidadesExpectativas:
      'Tener una zona segura y despejada para descargar en Frikaz S.A.S., pagos y pedidos claros a tiempo, y reglas sencillas de higiene y cuidado al entrar.',
    peligrosSituaciones:
      'Atropellos en la zona de carga, caída de bultos o canastillas al descargar, entrar sin permiso cerca de las freidoras calientes o derrames de aceite en el piso.',
    posiblesAfectaciones:
      'Golpes o lesiones a los transportadores que traen mercancía, daños o suciedad en los alimentos, retrasos en la producción y quejas comerciales.',
    medidasPrevencionControl:
      'Reglas claras para recibir mercancía, líneas pintadas en el piso de descarga, charla rápida de seguridad para visitantes y uso obligatorio de botas seguras al entrar.',
    seguimiento:
      'Revisión periódica de proveedores, lista de chequeo cuando llega mercancía y control en la puerta de entrada.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-ext-02',
    nombre: 'Ingeniero Externo de Seguridad en el Trabajo',
    clasificacion: 'externa',
    descripcion:
      'Especialista con licencia en Seguridad y Salud en el Trabajo (SST) que asesora por horas a Frikaz S.A.S. para organizar planes, revisar riesgos y cumplir las normas.',
    necesidadesExpectativas:
      'Que la empresa le entregue la información a tiempo, que la Gerencia apoye los cambios necesarios, que se reporten todos los accidentes con honestidad y que se cumplan sus recomendaciones.',
    peligrosSituaciones:
      'Que no le cuenten cuando pasa un accidente o casi accidente, que no haya dinero para arreglar fallas urgentes o que no se apliquen las medidas en planta.',
    posiblesAfectaciones:
      'Problemas legales si no se corrigen peligros graves y que el plan de seguridad quede atrasado frente a nuevas leyes.',
    medidasPrevencionControl:
      'Contrato claro con fechas de visita, reuniones mensuales con Gerencia y el Vigía de SST, actas firmadas con compromisos y registro digital de cada recomendación.',
    seguimiento:
      'Plan anual de trabajo, revisión de tareas pendientes de mejora e inspecciones internas cada 6 meses.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-ext-03',
    nombre: 'Ministerio del Trabajo',
    clasificacion: 'externa',
    descripcion:
      'Entidad del gobierno en Colombia que vigila que las empresas respeten los derechos de los trabajadores y cumplan las reglas de seguridad (SG-SST).',
    necesidadesExpectativas:
      'Cumplir el Decreto 1072 de 2015 y la Resolución 0312 de 2019 (reglas mínimas de seguridad), avisar rápido si pasa un accidente grave y subir cada año la autoevaluación oficial.',
    peligrosSituaciones:
      'Visitas sorpresa donde encuentren fallas sin corregir, no investigar los accidentes de trabajo o tener trabajadores sin afiliación completa a salud, pensión y ARL.',
    posiblesAfectaciones:
      'Cierre temporal o definitivo de la planta, multas muy altas (hasta 500 salarios mínimos) y procesos legales contra la empresa.',
    medidasPrevencionControl:
      'Cumplir y guardar pruebas de todas las reglas mínimas, hacer cada año la revisión y el plan de mejora, investigar cualquier incidente con el Vigía de SST y mantener los papeles organizados.',
    seguimiento:
      'Registro anual en la plataforma del Fondo de Riesgos Laborales, revisión de normas legales y simulacros de visita de inspección.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-ext-04',
    nombre: 'Ministerio de Salud y Protección Social',
    clasificacion: 'externa',
    descripcion:
      'Entidad nacional que cuida la salud de los trabajadores, previene enfermedades causadas por el trabajo y coordina con la EPS (salud) y la ARL (riesgos laborales).',
    necesidadesExpectativas:
      'Cuidar la salud física de los trabajadores, vigilar dolores musculares o enfermedades del trabajo y llevar el control de las incapacidades médicas.',
    peligrosSituaciones:
      'Contagios en la planta de alimentos, dolores crónicos de espalda o manos sin atender a tiempo y falta de exámenes médicos al entrar o cada año.',
    posiblesAfectaciones:
      'Trabajadores con pérdida de fuerza o capacidad para laborar, enfermedades reconocidas como laborales y reclamos por reubicación.',
    medidasPrevencionControl:
      'Exámenes médicos según cada cargo (antes de entrar y periódicos), revisión especial de espalda y manos, pausas activas programadas y cumplir al pie de la letra las recomendaciones del médico.',
    seguimiento:
      'Revisión cada 3 meses de incapacidades médicas, resumen anual de salud y archivo reservado de historias clínicas en centro médico autorizado.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-ext-05',
    nombre: 'Secretaría Distrital de Salud (Bogotá)',
    clasificacion: 'externa',
    descripcion:
      'Autoridad de salud en Bogotá (y Bosa) que visita plantas de alimentos para revisar higiene, limpieza y condiciones sanas para preparar comida.',
    necesidadesExpectativas:
      'Cumplir la Resolución 2674 de 2013 (Buenas Prácticas de Manufactura - BPM: reglas de limpieza e higiene para hacer alimentos), controlar plagas, manejar bien basuras y aceite usado, y tener personal sano.',
    peligrosSituaciones:
      'Que se ensucie o contamine el alimento, acumulación de grasa en ductos o trampas, o trabajadores sin carnet de manipulación de alimentos ni exámenes médicos vigentes.',
    posiblesAfectaciones:
      'Calificación sanitaria negativa, decomiso de productos, cierre preventivo de la planta y multas económicas.',
    medidasPrevencionControl:
      'Plan diario de limpieza, control de plagas, agua potable y manejo de residuos; exámenes médicos para manipuladores de alimentos; curso anual de higiene (BPM) y limpieza de trampa de grasas.',
    seguimiento:
      'Revisiones mensuales de higiene y limpieza en planta, pruebas de laboratorio a superficies y producto, y recibos de entrega de aceite usado.',
    fechaActualizacion: '2026-03-01',
  },
  {
    id: 'pi-ext-06',
    nombre: 'Clientes y Consumidores',
    clasificacion: 'externa',
    descripcion:
      'Personas que compran nuestros snacks, tiendas de barrio, supermercados y distribuidores que confían en la calidad de Frikaz S.A.S.',
    necesidadesExpectativas:
      'Snacks ricos, crujientes, limpios y seguros para comer, con etiqueta clara y hechos en una empresa donde se cuida a la gente y la higiene.',
    peligrosSituaciones:
      'Que caiga algún pedazo de plástico, metal o cabello en una bolsa, aceite viejo o dañado que dé mal sabor, o no avisar ingredientes que causan alergias.',
    posiblesAfectaciones:
      'Malestar estomacal en clientes, reclamos o demandas, caída en las ventas y tener que recoger mercancía de las tiendas.',
    medidasPrevencionControl:
      'Revisión visual y filtros en empaque, sacar primero lo que se produjo primero (rotación de lotes), revisar temperatura y calidad del aceite, y usar siempre gorro/cofia, tapabocas y bata limpia sin botones.',
    seguimiento:
      'Línea de atención para quejas y sugerencias, control por número de lote y fecha de vencimiento en cada bolsa y pruebas de calidad cada 15 días.',
    fechaActualizacion: '2026-03-01',
  },
];

// ----------------------------------------------------------------------------
// DATOS SEMILLA: CHECKLIST DE NECESIDADES INTERNAS (GERENTE, OPERARIOS, CONDUCTOR)
// ----------------------------------------------------------------------------

export const CHECKLIST_INICIAL_CARGOS: ItemChecklistNecesidad[] = [
  // 1. GERENTE (7 NECESIDADES ESPECÍFICAS)
  {
    id: 'chk-ger-01',
    cargo: 'gerente',
    numero: 1,
    necesidad: 'Estar informado sobre los peligros y riesgos actuales en la empresa.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Tabla de riesgos (Matriz GTC 45) preparada con las 6 áreas; pendiente revisión y visto bueno del Gerente.',
    evidencias: 'Matriz de Riesgos Frikaz S.A.S. versión digital 2026',
    responsable: 'Coordinador / Vigía de SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-02',
    cargo: 'gerente',
    numero: 2,
    necesidad: 'Asegurar que la empresa cumpla todas las leyes de seguridad en el trabajo.',
    estado: 'En proceso',
    observaciones:
      'Normas revisadas en la lista legal; en proceso de completar evidencias y ajustar controles.',
    evidencias: 'Lista de Normas Legales SST (Res. 0312/2019 y Dec. 1072/2015)',
    responsable: 'Gerente General / Asesor Externo',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-03',
    cargo: 'gerente',
    numero: 3,
    necesidad: 'Aprobar dinero, personal y herramientas para cuidar la seguridad.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Presupuesto 2026 propuesto para guantes térmicos, limpieza de campanas y asesoría en seguridad; pendiente aprobación del Gerente.',
    evidencias: 'Propuesta de presupuesto SST 2026',
    responsable: 'Gerente General',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-04',
    cargo: 'gerente',
    numero: 4,
    necesidad: 'Impulsar un ambiente de trabajo seguro, limpio y respetuoso.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Borrador de Política SST listo para firma y aprobación del Gerente.',
    evidencias: 'Borrador Política SST Frikaz S.A.S.',
    responsable: 'Gerente General / Coordinador SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-05',
    cargo: 'gerente',
    numero: 5,
    necesidad: 'Revisar cada cierto tiempo cómo avanza el plan de seguridad.',
    estado: 'En proceso',
    observaciones:
      'Revisión de gerencia programada para revisar los resultados de cumplimiento.',
    evidencias: 'Calendario de reuniones de revisión 2026',
    responsable: 'Gerente General',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-06',
    cargo: 'gerente',
    numero: 6,
    necesidad: 'Apoyar jornadas de salud, bienestar y prevención de accidentes.',
    estado: 'En proceso',
    observaciones:
      'Coordinando con Caja de Compensación y ARL jornadas de examen visual y pausas activas.',
    evidencias: 'Plan de Bienestar y Salud Frikaz 2026',
    responsable: 'Gestión Humana / Vigía de SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ger-07',
    cargo: 'gerente',
    numero: 7,
    necesidad: 'Participar en capacitaciones y reuniones de seguimiento de seguridad.',
    estado: 'En proceso',
    observaciones:
      'Programación de capacitaciones y reuniones de seguimiento en curso.',
    evidencias: 'Registro de participación y reuniones',
    responsable: 'Gerente General',
    fechaVerificacion: '',
  },

  // 2. OPERARIOS (9 NECESIDADES ESPECÍFICAS)
  {
    id: 'chk-ope-01',
    cargo: 'operarios',
    numero: 1,
    necesidad: 'Tener máquinas y herramientas funcionando bien y con protectores.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Revisión preventiva de peladora y selladora cargada; pendiente verificación del Gerente.',
    evidencias: 'Hoja de vida de máquinas y registro de mantenimiento',
    responsable: 'Técnico de Mantenimiento / Jefe de Planta',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-02',
    cargo: 'operarios',
    numero: 2,
    necesidad: 'Recibir elementos de protección personal (EPP) adecuados para cada tarea.',
    estado: 'En proceso',
    observaciones:
      'Planillas de entrega de guantes largos resistentes al calor, delantales y botas en recolección.',
    evidencias: 'Planilla de entrega de EPP a cada operario',
    responsable: 'Coordinador / Vigía de SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-03',
    cargo: 'operarios',
    numero: 3,
    necesidad: 'Trabajar en espacios limpios, ordenados y sin grasa en el piso.',
    estado: 'En proceso',
    observaciones:
      'Orden y aseo diario en tajado y empaque con lavado desengrasante de pisos.',
    evidencias: 'Lista diaria de orden, aseo y desinfección de planta',
    responsable: 'Jefe de Planta / Operarios',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-04',
    cargo: 'operarios',
    numero: 4,
    necesidad: 'Recibir charlas y cursos prácticos sobre higiene en alimentos (BPM) y cómo evitar accidentes.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Certificados de curso de manipulación higiénica de alimentos listos para revisión de Gerencia.',
    evidencias: 'Certificados de manipulación de alimentos',
    responsable: 'Ingeniero de Alimentos / Asesor Externo',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-05',
    cargo: 'operarios',
    numero: 5,
    necesidad: 'Tener pausas activas y descansos para cuidar el cuerpo.',
    estado: 'En proceso',
    observaciones:
      'Ya se hacen pausas activas en la mañana (10:00 a. m.); falta organizarlas igual en el turno de la tarde.',
    evidencias: 'Fotos y planilla de pausas activas de la mañana',
    responsable: 'Vigía de SST / Líder de Producción',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-06',
    cargo: 'operarios',
    numero: 6,
    necesidad: 'Conocer paso a paso cómo trabajar con aceite caliente (170–180 °C) sin quemarse.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Guía visual de pasos seguros para freír y filtrar aceite pegada junto a las freidoras; pendiente verificación.',
    evidencias: 'Cartel de pasos seguros POE-FRI-02 en zona de freidoras',
    responsable: 'Coordinador SST / Maestro Fritador',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-07',
    cargo: 'operarios',
    numero: 7,
    necesidad: 'Saber cómo prevenir cortes, quemaduras, atrapamientos y caídas en su puesto.',
    estado: 'En proceso',
    observaciones:
      'Charlas de riesgos en cada máquina y entrega de guía sencilla de seguridad por cargo.',
    evidencias: 'Registro de inducción al puesto y entrega de guía',
    responsable: 'Coordinador / Vigía de SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-08',
    cargo: 'operarios',
    numero: 8,
    necesidad: 'Hacer mantenimiento a tiempo a todas las máquinas antes de que fallen.',
    estado: 'En proceso',
    observaciones:
      'Rebanadora y freidoras revisadas; falta hacer limpieza y revisión al extractor y la campana a fin de mes.',
    evidencias: 'Calendario de mantenimiento 2026 y órdenes de trabajo',
    responsable: 'Jefe de Planta / Mantenimiento',
    fechaVerificacion: '',
  },
  {
    id: 'chk-ope-09',
    cargo: 'operarios',
    numero: 9,
    necesidad: 'Tener avisos visibles de peligro y piso resbaloso en las zonas de trabajo.',
    estado: 'Por hacer',
    observaciones:
      'Falta cambiar 3 avisos de peligro por calor (>160 °C) y pintar la señal de piso mojado en lavado.',
    evidencias: 'Cotización para comprar nuevos avisos visibles',
    responsable: 'Coordinador SST / Compras',
    fechaVerificacion: '',
  },

  // 3. CONDUCTOR (8 NECESIDADES ESPECÍFICAS)
  {
    id: 'chk-con-01',
    cargo: 'conductor',
    numero: 1,
    necesidad: 'Contar con el vehículo de entregas en buen estado mecánico.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Certificado técnico-mecánico y factura de taller cargados; pendiente visto bueno de Gerencia.',
    evidencias: 'Certificado técnico-mecánico RUNT y factura de taller',
    responsable: 'Conductor / Administrador de Flota',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-02',
    cargo: 'conductor',
    numero: 2,
    necesidad: 'Tener papeles al día y equipo completo de carretera y emergencias.',
    estado: 'En proceso',
    observaciones:
      'Revisando vigencias de SOAT, licencia, botiquín y extintor del vehículo.',
    evidencias: 'SOAT vigente y lista de revisión del kit de carretera',
    responsable: 'Conductor / Coordinador SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-03',
    cargo: 'conductor',
    numero: 3,
    necesidad: 'Tener horarios organizados y tiempos reales para entregar sin afán ni exceso de velocidad.',
    estado: 'En proceso',
    observaciones:
      'Se dividieron 2 zonas (Norte y Sur); falta ajustar horarios en horas de mayor trancón en Bogotá.',
    evidencias: 'Plan de Rutas Frikaz 2026 y tabla de tiempos de entrega',
    responsable: 'Coordinador Logístico / Gerencia',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-04',
    cargo: 'conductor',
    numero: 4,
    necesidad: 'Recibir capacitación sobre cómo manejar con precaución y evitar choques.',
    estado: 'Por hacer',
    observaciones:
      'Programar curso de manejo preventivo y seguridad vial con la ARL.',
    evidencias: 'Programación de curso con ARL',
    responsable: 'Asesor ARL / Coordinador SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-05',
    cargo: 'conductor',
    numero: 5,
    necesidad: 'Contar con chaleco reflectivo, guantes de agarre y botas seguras para entregar pedidos.',
    estado: 'Pendiente de revisión',
    observaciones:
      'Planilla de entrega de EPP de transporte subida para revisión de Gerencia.',
    evidencias: 'Planilla firmada de entrega de EPP de transporte',
    responsable: 'Coordinador SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-06',
    cargo: 'conductor',
    numero: 6,
    necesidad: 'Aprender a levantar y mover canastillas sin lastimarse la espalda.',
    estado: 'Por hacer',
    observaciones:
      'Realizar práctica de levantamiento seguro (doblar rodillas y peso máximo) con la ARL.',
    evidencias: 'Acta pendiente de charla sobre cuidado de espalda',
    responsable: 'Fisioterapeuta ARL / Vigía de SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-07',
    cargo: 'conductor',
    numero: 7,
    necesidad: 'Revisar frenos, luces, llantas y niveles del vehículo todos los días antes de salir.',
    estado: 'En proceso',
    observaciones:
      'Diligenciando lista diaria preoperacional del vehículo antes de salir de Bosa.',
    evidencias: 'Talonario y registro digital de revisiones diarias del carro',
    responsable: 'Conductor / Coordinador SST',
    fechaVerificacion: '',
  },
  {
    id: 'chk-con-08',
    cargo: 'conductor',
    numero: 8,
    necesidad: 'Tener pausas de descanso para no manejar con sueño ni cansancio extremo.',
    estado: 'En proceso',
    observaciones:
      'Se definió parar 20 minutos cada 2 horas y media de manejo; falta revisar el cumplimiento con el reporte GPS.',
    evidencias: 'Regla interna de descanso y prevención de fatiga al volante',
    responsable: 'Gerente / Coordinador Logístico',
    fechaVerificacion: '',
  },
];

// ----------------------------------------------------------------------------
// DATOS SEMILLA: HISTORIAL DE SEGUIMIENTO DEL CHECKLIST
// ----------------------------------------------------------------------------

export const HISTORIAL_INICIAL_CHECKLIST: RegistroHistorialChecklist[] = [
  {
    id: 'rev-01',
    fecha: '2026-03-04',
    cargo: 'operarios',
    responsableEvaluador: 'Coordinador / Vigía de SST',
    porcentajeCumplimiento: 0,
    cumplidas: 0,
    enProceso: 8,
    pendientes: 1,
    observacionesGenerales:
      'Levantamiento inicial completado. Varios puntos están en proceso o pendientes de revisión y aprobación por Gerencia.',
  },
];

// ----------------------------------------------------------------------------
// PERSISTENCIA EN LOCALSTORAGE + MIGRACIÓN SEGURA A LENGUAJE CLARO
// ----------------------------------------------------------------------------

function ensurePlainLangMigration(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY_PLAIN_LANG) === '1') return;

    const rawPartes = localStorage.getItem(STORAGE_KEY_PARTES);
    if (rawPartes) {
      const parsed: ParteInteresada[] = JSON.parse(rawPartes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(PARTES_INTERESADAS_INICIALES.map((p) => [p.id, p]));
        const migratedPartes = parsed.map((p) => {
          const seed = seedById.get(p.id);
          return seed ? { ...seed } : p;
        });
        localStorage.setItem(STORAGE_KEY_PARTES, JSON.stringify(migratedPartes));
      }
    }

    const rawChecklist = localStorage.getItem(STORAGE_KEY_CHECKLIST);
    if (rawChecklist) {
      const parsed: ItemChecklistNecesidad[] = JSON.parse(rawChecklist);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(CHECKLIST_INICIAL_CARGOS.map((c) => [c.id, c]));
        const migratedChecklist = parsed.map((item) => {
          const seed = seedById.get(item.id);
          if (!seed) return item;
          return {
            ...item,
            necesidad: seed.necesidad,
            responsable: seed.responsable,
            observaciones:
              item.fechaVerificacion === seed.fechaVerificacion ? seed.observaciones : item.observaciones,
            evidencias:
              item.fechaVerificacion === seed.fechaVerificacion ? seed.evidencias : item.evidencias,
          };
        });
        localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(migratedChecklist));
      }
    }

    const rawHist = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    if (rawHist) {
      const parsed: RegistroHistorialChecklist[] = JSON.parse(rawHist);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(HISTORIAL_INICIAL_CHECKLIST.map((h) => [h.id, h]));
        const migratedHist = parsed.map((h) => {
          const seed = seedById.get(h.id);
          return seed ? { ...h, observacionesGenerales: seed.observacionesGenerales } : h;
        });
        localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(migratedHist));
      }
    }

    localStorage.setItem(STORAGE_KEY_PLAIN_LANG, '1');
  } catch (error) {
    console.error('Error migrando partes interesadas a lenguaje claro:', error);
  }
}

function ensurePartesGerenteGateMigration(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY_GERENTE_GATE) === '1') return;
    const rawChecklist = localStorage.getItem(STORAGE_KEY_CHECKLIST);
    if (rawChecklist) {
      const parsed: ItemChecklistNecesidad[] = JSON.parse(rawChecklist);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.map((item) => {
          const norm = normalizarEstadoEstandar(item.estado);
          if (!item.resultadoRevision && esEstadoExclusivoGerente(norm)) {
            return {
              ...item,
              estado: 'Pendiente de revisión' as const,
              fechaVerificacion: '',
            };
          }
          return { ...item, estado: norm };
        });
        localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(cleaned));
      }
    }
    localStorage.setItem(STORAGE_KEY_GERENTE_GATE, '1');
  } catch (error) {
    console.error('Error aplicando compuerta de Gerente en partes interesadas:', error);
  }
}

export function getStoredPartesInteresadas(): ParteInteresada[] {
  ensurePlainLangMigration();
  ensurePartesGerenteGateMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARTES);
    if (!raw) {
      saveStoredPartesInteresadas(PARTES_INTERESADAS_INICIALES);
      return PARTES_INTERESADAS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveStoredPartesInteresadas(PARTES_INTERESADAS_INICIALES);
    return PARTES_INTERESADAS_INICIALES;
  } catch (error) {
    console.error('Error leyendo partes interesadas de localStorage:', error);
    return PARTES_INTERESADAS_INICIALES;
  }
}

export function saveStoredPartesInteresadas(partes: ParteInteresada[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PARTES, JSON.stringify(partes));
  } catch (error) {
    console.error('Error guardando partes interesadas en localStorage:', error);
  }
}

export function getStoredChecklistItems(): ItemChecklistNecesidad[] {
  ensurePlainLangMigration();
  ensurePartesGerenteGateMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKLIST);
    if (!raw) {
      saveStoredChecklistItems(CHECKLIST_INICIAL_CARGOS);
      return CHECKLIST_INICIAL_CARGOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveStoredChecklistItems(CHECKLIST_INICIAL_CARGOS);
    return CHECKLIST_INICIAL_CARGOS;
  } catch (error) {
    console.error('Error leyendo checklist de localStorage:', error);
    return CHECKLIST_INICIAL_CARGOS;
  }
}

export function saveStoredChecklistItems(items: ItemChecklistNecesidad[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(items));
  } catch (error) {
    console.error('Error guardando checklist en localStorage:', error);
  }
}

export function getStoredHistorialChecklist(): RegistroHistorialChecklist[] {
  ensurePlainLangMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    if (!raw) {
      saveStoredHistorialChecklist(HISTORIAL_INICIAL_CHECKLIST);
      return HISTORIAL_INICIAL_CHECKLIST;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveStoredHistorialChecklist(HISTORIAL_INICIAL_CHECKLIST);
    return HISTORIAL_INICIAL_CHECKLIST;
  } catch (error) {
    console.error('Error leyendo historial de checklist de localStorage:', error);
    return HISTORIAL_INICIAL_CHECKLIST;
  }
}

export function saveStoredHistorialChecklist(historial: RegistroHistorialChecklist[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
  } catch (error) {
    console.error('Error guardando historial de checklist en localStorage:', error);
  }
}

// ----------------------------------------------------------------------------
// CÁLCULO DE INDICADORES AUTOMÁTICOS
// ----------------------------------------------------------------------------

export function calcularIndicadoresPartesInteresadas(
  items: ItemChecklistNecesidad[]
): IndicadoresGlobalesPartesInteresadas {
  const cargos: CargoChecklistInterno[] = ['gerente', 'operarios', 'conductor'];

  const nombresCargos: Record<CargoChecklistInterno, string> = {
    gerente: 'Gerente (Dirección)',
    operarios: 'Operarios (Producción y Planta)',
    conductor: 'Conductor (Entregas y Reparto)',
  };

  const porCargo = {} as Record<CargoChecklistInterno, ResumenIndicadoresCargo>;

  let totalGlobal = 0;
  let cumplidasGlobal = 0;
  let enProcesoGlobal = 0;
  let pendientesGlobal = 0;

  for (const c of cargos) {
    const itemsCargo = items.filter((it) => it.cargo === c);
    const total = itemsCargo.length;
    const cumplidas = itemsCargo.filter((it) => {
      const est = normalizarEstadoEstandar(it.estado);
      return est === 'Cumplido' || est === 'Aprobado';
    }).length;
    const enProceso = itemsCargo.filter((it) => {
      const est = normalizarEstadoEstandar(it.estado);
      return est === 'En proceso' || est === 'Pendiente de revisión';
    }).length;
    const pendientes = itemsCargo.filter((it) => {
      const est = normalizarEstadoEstandar(it.estado);
      return est === 'Por hacer' || est === 'Devuelto para ajustes';
    }).length;
    const porcentaje = total > 0 ? Math.round((cumplidas / total) * 100) : 0;

    porCargo[c] = {
      cargo: c,
      nombreCargo: nombresCargos[c],
      total,
      cumplidas,
      enProceso,
      pendientes,
      porcentaje,
    };

    totalGlobal += total;
    cumplidasGlobal += cumplidas;
    enProcesoGlobal += enProceso;
    pendientesGlobal += pendientes;
  }

  const porcentajeGlobal =
    totalGlobal > 0 ? Math.round((cumplidasGlobal / totalGlobal) * 100) : 0;

  return {
    totalNecesidades: totalGlobal,
    cumplidas: cumplidasGlobal,
    enProceso: enProcesoGlobal,
    pendientes: pendientesGlobal,
    porcentajeCumplimiento: porcentajeGlobal,
    porCargo,
  };
}

// ----------------------------------------------------------------------------
// EXPORTACIÓN A EXCEL NATIVO CON EXCELJS
// ----------------------------------------------------------------------------

export async function exportarChecklistExcel(
  cargo: CargoChecklistInterno,
  items: ItemChecklistNecesidad[]
): Promise<void> {
  const nombresCargo: Record<CargoChecklistInterno, string> = {
    gerente: 'GERENTE (DIRECCIÓN)',
    operarios: 'OPERARIOS (PRODUCCIÓN Y PLANTA)',
    conductor: 'CONDUCTOR (ENTREGAS Y REPARTO)',
  };

  const itemsCargo = items.filter((it) => it.cargo === cargo);
  const nombreCargoOficial = nombresCargo[cargo];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Frikaz S.A.S. - Seguridad y Salud en el Trabajo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Lista_${cargo.toUpperCase()}`, {
    views: [{ showGridLines: true }],
  });

  // ENCABEZADO INSTITUCIONAL
  worksheet.mergeCells('A1:G1');
  worksheet.mergeCells('A2:G2');
  worksheet.mergeCells('A3:G3');

  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'FRIKAZ S.A.S. — SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };

  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `LISTA DE CHEQUEO DE NECESIDADES EN SEGURIDAD — ${nombreCargoOficial}`;
  subtitleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFEA580C' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  const metaCell = worksheet.getCell('A3');
  metaCell.value = `Sede: Bosa, Bogotá D.C. | NIT: 901.458.723-1 | Fecha: ${new Date().toLocaleDateString('es-CO')} | Documento SG-SST`;
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]);

  // CABECERA DE TABLA
  const headerRow = worksheet.addRow([
    'N.°',
    'LO QUE NECESITA ESTE CARGO PARA TRABAJAR SEGURO',
    'ESTADO',
    'NOTAS Y CÓMO ESTÁ HOY',
    'PRUEBAS O DOCUMENTOS',
    'QUIÉN SE ENCARGA',
    'FECHA DE REVISIÓN',
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FFEA580C' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // FILAS DE DATOS
  itemsCargo.forEach((item) => {
    const estadoNorm = normalizarEstadoEstandar(item.estado);
    const row = worksheet.addRow([
      item.numero,
      item.necesidad,
      estadoNorm.toUpperCase(),
      item.observaciones || 'Sin observaciones registradas',
      item.evidencias || 'Sin evidencias adjuntas',
      item.responsable || 'Por asignar',
      item.fechaVerificacion || 'Pendiente',
    ]);

    row.height = 36;

    // Colores de estado
    const estadoCell = row.getCell(3);
    if (estadoNorm === 'Cumplido' || estadoNorm === 'Aprobado') {
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }, // emerald 100
      };
      estadoCell.font = { bold: true, color: { argb: 'FF166534' } };
    } else if (estadoNorm === 'En proceso' || estadoNorm === 'Pendiente de revisión') {
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }, // amber 100
      };
      estadoCell.font = { bold: true, color: { argb: 'FF92400E' } };
    } else {
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE4E6' }, // rose 100
      };
      estadoCell.font = { bold: true, color: { argb: 'FF9F1239' } };
    }

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // FILA RESUMEN DE CUMPLIMIENTO
  worksheet.addRow([]);
  const cumplidasCount = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'Cumplido' || est === 'Aprobado';
  }).length;
  const enProcesoCount = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'En proceso' || est === 'Pendiente de revisión';
  }).length;
  const pendientesCount = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'Por hacer' || est === 'Devuelto para ajustes';
  }).length;
  const porcentaje = itemsCargo.length > 0 ? Math.round((cumplidasCount / itemsCargo.length) * 100) : 0;

  const totalRow = worksheet.addRow([
    'RESUMEN',
    `Total: ${itemsCargo.length} necesidades | Cumplidas: ${cumplidasCount} | En proceso: ${enProcesoCount} | Pendientes: ${pendientesCount}`,
    `${porcentaje}% CUMPLIDO`,
    'Evaluación realizada conforme al Decreto 1072/2015 y Res. 0312/2019',
    '',
    '',
    new Date().toLocaleDateString('es-CO'),
  ]);

  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
  });

  // ANCHO DE COLUMNAS
  worksheet.columns = [
    { width: 8 },  // Ítem
    { width: 42 }, // Necesidad
    { width: 16 }, // Estado
    { width: 38 }, // Observaciones
    { width: 34 }, // Evidencias
    { width: 28 }, // Responsable
    { width: 18 }, // Fecha
  ];

  // DESCARGA EN EL NAVEGADOR
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Checklist_SST_${cargo.toUpperCase()}_Frikaz_SAS.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportarMatrizExcel(partes: ParteInteresada[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Frikaz S.A.S. - Sistema de Gestión SST';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Matriz_Partes_Interesadas', {
    views: [{ showGridLines: true }],
  });

  worksheet.mergeCells('A1:H1');
  worksheet.mergeCells('A2:H2');

  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'FRIKAZ S.A.S. — PERSONAS Y ENTIDADES INTERESADAS EN LA SEGURIDAD';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };

  const subCell = worksheet.getCell('A2');
  subCell.value = `SG-SST Decreto 1072 de 2015 / ISO 45001 | Total registradas: ${partes.length} | Fecha: ${new Date().toLocaleDateString('es-CO')}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    'PERSONA O ENTIDAD',
    'TIPO',
    'QUIÉN ES Y QUÉ HACE',
    'QUÉ NECESITA O ESPERA',
    'PELIGROS O SITUACIONES QUE LA AFECTAN',
    'QUÉ PUEDE PASAR SI NO SE CUIDA',
    'CÓMO LO PREVENIMOS Y CONTROLAMOS',
    'CÓMO LE HACEMOS SEGUIMIENTO',
  ]);

  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FFEA580C' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  partes.forEach((p) => {
    const row = worksheet.addRow([
      p.nombre,
      p.clasificacion === 'interna' ? 'INTERNA' : 'EXTERNA',
      p.descripcion,
      p.necesidadesExpectativas,
      p.peligrosSituaciones,
      p.posiblesAfectaciones,
      p.medidasPrevencionControl,
      p.seguimiento,
    ]);

    row.height = 48;

    const clasifCell = row.getCell(2);
    if (p.clasificacion === 'interna') {
      clasifCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDE9FE' }, // purple 100
      };
      clasifCell.font = { bold: true, color: { argb: 'FF5B21B6' } };
    } else {
      clasifCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0F2FE' }, // sky 100
      };
      clasifCell.font = { bold: true, color: { argb: 'FF075985' } };
    }

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  worksheet.columns = [
    { width: 28 },
    { width: 16 },
    { width: 34 },
    { width: 38 },
    { width: 38 },
    { width: 34 },
    { width: 42 },
    { width: 32 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Matriz_Partes_Interesadas_Frikaz_SAS.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
