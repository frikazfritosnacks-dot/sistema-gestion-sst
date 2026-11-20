import ExcelJS from 'exceljs';
import {
  AccionMejoraPlan,
  CodigoIndicadorMinimo0312,
  DiagnosticoSaludEmpresa,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  PlanAnualSgsstData,
  PlanAnualVigencia,
  RecomendacionIntervencion,
  RegistroAuditoriaPlanAnual,
  RegistroPeriodoIndicador,
  ResultadoIndicadorPeriodo,
  TrabajadorFichaSST,
} from '../types/planAnual';
import { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';
import { CaracterizacionEmpresaDinamica } from '../types/dynamicConfig';
import { getStoredCargosSST } from './organigramaService';
import { determinarGrupoEstandares0312 } from './planAnualService';
import { normalizarEstadoEstandar } from './gerenteControlService';

const STORAGE_KEY_SGSST = 'frikaz_plan_anual_sgsst_v1';
const GERENTE_GATE_FLAG_SGSST = 'frikaz_sgsst_gerente_gate_v1';

export const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// ============================================================================
// 1. LOS SEIS INDICADORES MÍNIMOS DE SST — RESOLUCIÓN 0312 DE 2019 (ART. 30)
// ============================================================================

export const INDICADORES_NORMATIVOS_0312: HojaVidaIndicadorSST[] = [
  {
    id: 'ind-0312-frecuencia',
    codigo: 'IND-01',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-01',
    nombre: 'Frecuencia de accidentalidad',
    tipo: 'RESULTADO',
    definicion: 'Número de veces que ocurre un accidente de trabajo en el mes.',
    formula:
      '(Número de accidentes de trabajo que se presentaron en el mes / Número de trabajadores en el mes) × 100',
    variablesRequeridas: [
      'Número de accidentes de trabajo que se presentaron en el mes',
      'Número de trabajadores en el mes (se toma automáticamente de la ficha de trabajadores activos)',
    ],
    metaValor: 0,
    metaOperador: '<=',
    metaTexto: '0 accidentes por cada 100 trabajadores (Meta ideal de prevención)',
    reglaConteo:
      'Se cuentan todos los accidentes de trabajo ocurridos en el mes reportados a la ARL (con o sin incapacidad) y se dividen entre el número de trabajadores activos del mes, multiplicado por 100.',
    unidadMedida: 'AT por 100 trab.',
    fuenteInformacion:
      'Registro de reportes de accidente ante la ARL (FURAT) y listado de trabajadores activos en el apartado HACER.',
    periodicidad: 'MENSUAL',
    responsable: 'Coordinador / Vigía de SST',
    interpretacionBase:
      'Por cada cien (100) trabajadores que laboraron en el mes, se presentaron X accidentes de trabajo.',
  },
  {
    id: 'ind-0312-severidad',
    codigo: 'IND-02',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-02',
    nombre: 'Severidad de accidentalidad',
    tipo: 'RESULTADO',
    definicion: 'Número de días perdidos por accidentes de trabajo en el mes.',
    formula:
      '((Número de días de incapacidad por accidente de trabajo en el mes + número de días cargados en el mes) / Número de trabajadores en el mes) × 100',
    variablesRequeridas: [
      'Número de días de incapacidad por accidente de trabajo en el mes',
      'Número de días cargados en el mes (según tabla oficial si hubo pérdida permanente o fatalidad)',
      'Número de trabajadores en el mes (se toma automáticamente de trabajadores activos)',
    ],
    metaValor: 0,
    metaOperador: '<=',
    metaTexto: '0 días perdidos por accidente de trabajo en el mes',
    reglaConteo:
      'Se suman los días de incapacidad médica otorgados por accidente de trabajo en el mes más los días cargados legales, se divide por los trabajadores activos del mes y se multiplica por 100.',
    unidadMedida: 'Días por 100 trab.',
    fuenteInformacion:
      'Incapacidades médicas de la EPS/ARL por accidente de trabajo y registro mensual de personal activo.',
    periodicidad: 'MENSUAL',
    responsable: 'Coordinador / Vigía de SST',
    interpretacionBase:
      'Por cada cien (100) trabajadores que laboraron en el mes, se perdieron X días por accidente de trabajo.',
  },
  {
    id: 'ind-0312-mortales',
    codigo: 'IND-03',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-03',
    nombre: 'Proporción de accidentes de trabajo mortales',
    tipo: 'RESULTADO',
    definicion: 'Número de accidentes de trabajo mortales en el año.',
    formula:
      '(Número de accidentes de trabajo mortales que se presentaron en el año / Total de accidentes de trabajo que se presentaron en el año) × 100',
    variablesRequeridas: [
      'Número de accidentes de trabajo mortales en el año',
      'Total de accidentes de trabajo que se presentaron en el año',
    ],
    metaValor: 0,
    metaOperador: '=',
    metaTexto: '0% de accidentes mortales en el año',
    reglaConteo:
      'Se divide el número de accidentes de trabajo mortales del año entre el total de accidentes de trabajo ocurridos en el mismo año y se multiplica por 100. Si hubo 0 accidentes en el año, no hay denominador distinto de cero.',
    unidadMedida: '%',
    fuenteInformacion:
      'Investigación oficial de accidentes de trabajo, reportes a la ARL y actas de cierre anual.',
    periodicidad: 'ANUAL',
    responsable: 'Andrea Orjuela – Gerente / Vigía SST',
    interpretacionBase: 'En el año, el X % de accidentes de trabajo fueron mortales.',
  },
  {
    id: 'ind-0312-prevalencia',
    codigo: 'IND-04',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-04',
    nombre: 'Prevalencia de la enfermedad laboral',
    tipo: 'RESULTADO',
    definicion:
      'Número de casos de enfermedad laboral presentes en una población en un periodo de tiempo.',
    formula:
      '(Número de casos nuevos y antiguos de enfermedad laboral en el periodo Z / Promedio de trabajadores en el periodo Z) × 100.000',
    variablesRequeridas: [
      'Número de casos nuevos y antiguos de enfermedad laboral calificados en el periodo Z',
      'Promedio de trabajadores en el periodo Z',
    ],
    metaValor: 0,
    metaOperador: '<=',
    metaTexto: '0 casos de enfermedad laboral presentes en la planta',
    reglaConteo:
      'Suma los casos nuevos diagnosticados en el año más los casos antiguos vigentes en trabajadores activos, dividido por el promedio de trabajadores del año, multiplicado por 100.000.',
    unidadMedida: 'Casos por 100.000 trab.',
    fuenteInformacion:
      'Calificaciones médicas de origen laboral (EPS / ARL / Juntas) consolidadas de forma confidencial en el registro de salud.',
    periodicidad: 'ANUAL',
    responsable: 'Coordinador / Vigía de SST y Médico Ocupacional',
    interpretacionBase:
      'Por cada 100.000 trabajadores existen X casos de enfermedad laboral en el periodo Z.',
  },
  {
    id: 'ind-0312-incidencia',
    codigo: 'IND-05',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-05',
    nombre: 'Incidencia de la enfermedad laboral',
    tipo: 'RESULTADO',
    definicion:
      'Número de casos nuevos de enfermedad laboral en una población determinada en un periodo de tiempo.',
    formula:
      '(Número de casos nuevos de enfermedad laboral en el periodo Z / Promedio de trabajadores en el periodo Z) × 100.000',
    variablesRequeridas: [
      'Número de casos nuevos de enfermedad laboral calificados en el periodo Z',
      'Promedio de trabajadores en el periodo Z',
    ],
    metaValor: 0,
    metaOperador: '<=',
    metaTexto: '0 casos nuevos de enfermedad laboral en el año',
    reglaConteo:
      'Cuenta únicamente los casos nuevos calificados como enfermedad laboral durante el año, divididos entre el promedio de trabajadores del año y multiplicados por 100.000.',
    unidadMedida: 'Casos nuevos por 100.000 trab.',
    fuenteInformacion:
      'Notificaciones nuevas de enfermedad laboral emitidas por EPS/ARL en el año (manejo confidencial).',
    periodicidad: 'ANUAL',
    responsable: 'Coordinador / Vigía de SST y Médico Ocupacional',
    interpretacionBase:
      'Por cada 100.000 trabajadores existen X casos nuevos de enfermedad laboral en el periodo Z.',
  },
  {
    id: 'ind-0312-ausentismo',
    codigo: 'IND-06',
    esNormativo0312: true,
    codigoNormativo0312: 'IND-SST-06',
    nombre: 'Ausentismo por causa médica',
    tipo: 'PROCESO',
    definicion: 'Ausentismo es la no asistencia al trabajo, con incapacidad médica.',
    formula:
      '(Número de días de ausencia por incapacidad laboral o común en el mes / Número de días de trabajo programados en el mes) × 100',
    variablesRequeridas: [
      'Número de días de ausencia por incapacidad laboral o común en el mes',
      'Número de días de trabajo programados en el mes (para todo el equipo)',
    ],
    metaValor: 3,
    metaOperador: '<=',
    metaTexto: 'Mantener el ausentismo por debajo o igual al 3 % de los días programados',
    reglaConteo:
      'Suma todos los días de incapacidad médica (enfermedad común, accidente de trabajo o enfermedad laboral) del mes y los divide por el total de días programados de trabajo de toda la planta en ese mes, por 100.',
    unidadMedida: '%',
    fuenteInformacion:
      'Planilla mensual de novedades de nómina e incapacidades médicas radicadas ante EPS/ARL.',
    periodicidad: 'MENSUAL',
    responsable: 'Coordinador / Vigía de SST y Administración',
    interpretacionBase:
      'En el mes se perdió X % de días programados de trabajo por incapacidad médica.',
  },
];

// ============================================================================
// 2. DATOS INICIALES REALISTAS DE TRABAJADORES (10 TRABAJADORES DE FRIKAZ S.A.S.)
// ============================================================================

const TRABAJADORES_INICIALES_SST: TrabajadorFichaSST[] = [
  {
    id: 'trab-01',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Andrea Orjuela',
    tipoDocumento: 'CC',
    numeroDocumento: '1.014.223.889',
    fechaNacimiento: '1984-05-14',
    sexo: 'Femenino',
    estadoCivil: 'Casado(a)',
    escolaridad: 'Profesional',
    localidadResidencia: 'Bosa Piamonte, Bogotá',
    telefono: '311 452 8890',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-gerente-general',
    cargoNombre: 'Gerente',
    areaProceso: 'Dirección General y Toma de Decisiones',
    actividadPrincipal: 'Dirección de la empresa, compras, presupuesto y revisión del SG-SST',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2019-02-01',
    turnoHorario: 'Lunes a Sábado 7:00 a.m. - 4:00 p.m.',
    eps: 'Sura EPS',
    arl: 'Positiva ARL',
    afp: 'Porvenir',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'Ocasional',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Moderada (1-2 días/sem)',
    nutricionHabitos: 'Alimentación balanceada, consume 3 comidas al día y toma 1.5 L de agua.',
    morbilidadSentida: 'Cansancio visual leve al final de la jornada frente al computador.',
    enfermedadesDiagnosticadas: 'Ninguna enfermedad laboral diagnosticada.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-02-10',
    conceptoAptitud: 'Apto sin restricciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Normal bilateral' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Uso de gafas para lectura' },
    optometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Fórmula vigente actualizada' },
    espirometria: { estado: 'NO_APLICA', observaciones: 'Sin exposición directa a vapores de planta' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Perfil lipídico y glicemia normales' },
    recomendacionesSaludOcupacional: 'Pausas visuales cada 2 horas y mantener silla ergonómica ajustada.',
    prioridadIntervencion: 'BAJA',
    necesidadIntervencion: 'Control anual de optometría y pausas activas.',
    seguimientoMedico: 'Control periódico programado febrero 2027.',
    fechaActualizacion: '2026-02-12',
  },
  {
    id: 'trab-02',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Laura Camila Torres Pineda',
    tipoDocumento: 'CC',
    numeroDocumento: '1.030.556.421',
    fechaNacimiento: '1992-09-22',
    sexo: 'Femenino',
    estadoCivil: 'Unión Libre',
    escolaridad: 'Técnico / Tecnólogo',
    localidadResidencia: 'Bosa Brasil, Bogotá',
    telefono: '314 298 1102',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-coordinador-vigia-sst',
    cargoNombre: 'Coordinador / Vigía de SST',
    areaProceso: 'Seguridad y Salud en el Trabajo (SST)',
    actividadPrincipal: 'Inspecciones de planta, capacitaciones, entrega de EPP y seguimiento SST',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2022-04-10',
    turnoHorario: 'Lunes a Sábado 7:00 a.m. - 4:00 p.m.',
    eps: 'Sanitas EPS',
    arl: 'Positiva ARL',
    afp: 'Protección',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Sí, regular (3+ días/sem)',
    nutricionHabitos: 'Consume frutas y verduras a diario.',
    morbilidadSentida: 'Ninguna molestia reportada.',
    enfermedadesDiagnosticadas: 'Sin antecedentes médicos relevantes.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-02-10',
    conceptoAptitud: 'Apto sin restricciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Agudeza visual 20/20' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Capacidad pulmonar normal' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-02-10', resultado: 'Manipulación de alimentos (BPM) apto' },
    recomendacionesSaludOcupacional: 'Continuar uso de tapa oídos al ingresar a zona de pelado/freído.',
    prioridadIntervencion: 'BAJA',
    necesidadIntervencion: 'Renovación anual de curso 50 horas SST y carné de alimentos.',
    seguimientoMedico: 'Al día.',
    fechaActualizacion: '2026-02-15',
  },
  {
    id: 'trab-03',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Jhonatan Stiven Gómez Vargas',
    tipoDocumento: 'CC',
    numeroDocumento: '1.020.485.912',
    fechaNacimiento: '1991-03-18',
    sexo: 'Masculino',
    estadoCivil: 'Soltero(a)',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Bosa La Libertad, Bogotá',
    telefono: '320 671 3340',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-frito',
    cargoNombre: 'Operario de Frito',
    areaProceso: 'Planta de Producción – Área de Cocción y Freidoras',
    actividadPrincipal: 'Operación de freidoras industriales a gas (>170 °C), control de aceite y escurrido',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2021-07-15',
    turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
    eps: 'Compensar EPS',
    arl: 'Positiva ARL',
    afp: 'Colfondos',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'Ocasional',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Moderada (1-2 días/sem)',
    nutricionHabitos: 'Hidratación constante durante turno por calor en freidoras.',
    morbilidadSentida: 'Sensación de calor en cara y antebrazos al final de jornadas largas.',
    enfermedadesDiagnosticadas: 'Sin enfermedades laborales calificadas.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-04',
    conceptoAptitud: 'Apto con recomendaciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Audición conservada' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Sin alteración ventilatoria' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Frotis y coprológico BPM negativos' },
    recomendacionesSaludOcupacional: 'Uso obligatorio de guantes térmicos 250 °C, careta contra salpicaduras, pausas de hidratación cada hora.',
    prioridadIntervencion: 'ALTA',
    necesidadIntervencion: 'Verificar pantallas protectoras en freidoras y reposición de guantes térmicos.',
    seguimientoMedico: 'Seguimiento trimestral de piel y capacidad respiratoria.',
    fechaActualizacion: '2026-03-10',
  },
  {
    id: 'trab-04',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Héctor Julio Sánchez Beltrán',
    tipoDocumento: 'CC',
    numeroDocumento: '80.441.209',
    fechaNacimiento: '1986-11-05',
    sexo: 'Masculino',
    estadoCivil: 'Casado(a)',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Kennedy Britalia, Bogotá',
    telefono: '313 842 1900',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-frito',
    cargoNombre: 'Operario de Frito',
    areaProceso: 'Planta de Producción – Área de Cocción y Freidoras',
    actividadPrincipal: 'Sazonado, centrifugado, trasiego de aceite frío (<40 °C) y apoyo en freidoras',
    tipoContrato: 'Fijo',
    fechaIngreso: '2024-01-15',
    turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
    eps: 'Famisanar EPS',
    arl: 'Positiva ARL',
    afp: 'Porvenir',
    consumoTabaco: 'Exfumador',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Sedentario / No realiza',
    nutricionHabitos: 'Alto consumo de harinas; se recomienda aumentar verduras y agua.',
    morbilidadSentida: 'Molestia lumbar leve al cargar canastillas llenas.',
    enfermedadesDiagnosticadas: 'Lumbalgia mecánica común en manejo con EPS.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-04',
    conceptoAptitud: 'Apto con recomendaciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'PENDIENTE', observaciones: 'Programada para próximo control médico' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-04', resultado: 'Apto manipulador de alimentos' },
    recomendacionesSaludOcupacional: 'No levantar cargas mayores a 20 kg sin ayuda; usar carretilla y hacer pausas de estiramiento lumbar.',
    prioridadIntervencion: 'ALTA',
    necesidadIntervencion: 'Realizar espirometría pendiente y escuela de espalda en puesto de trabajo.',
    seguimientoMedico: 'Cita pendiente de espirometría y valoración de espalda.',
    fechaActualizacion: '2026-03-10',
  },
  {
    id: 'trab-05',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Luis Eduardo Ramírez Castro',
    tipoDocumento: 'CC',
    numeroDocumento: '80.124.553',
    fechaNacimiento: '1983-07-29',
    sexo: 'Masculino',
    estadoCivil: 'Casado(a)',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Bosa Carbonell, Bogotá',
    telefono: '310 519 4481',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-pelado',
    cargoNombre: 'Operario de Pelado',
    areaProceso: 'Planta – Pelado y Corte en Rebanadora',
    actividadPrincipal: 'Pelado mecánico y rebanado de papa y plátano con cuchillas protegidas',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2020-08-01',
    turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
    eps: 'Salud Total EPS',
    arl: 'Positiva ARL',
    afp: 'Porvenir',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'Ocasional',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Moderada (1-2 días/sem)',
    nutricionHabitos: 'Normal.',
    morbilidadSentida: 'Zumbido ocasional en oídos cuando funciona la peladora sin tapones.',
    enfermedadesDiagnosticadas: 'Sin enfermedad laboral calificada.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-05',
    conceptoAptitud: 'Apto con recomendaciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Descenso leve en frecuencias altas (seguimiento)' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Apto BPM' },
    recomendacionesSaludOcupacional: 'Uso permanente de doble protección auditiva si el ruido supera 85 dBA y guante anticorte en limpieza de cuchillas.',
    prioridadIntervencion: 'ALTA',
    necesidadIntervencion: 'Seguimiento auditivo en 6 meses y medición de ruido en peladora.',
    seguimientoMedico: 'Reevaluación audiométrica programada.',
    fechaActualizacion: '2026-03-11',
  },
  {
    id: 'trab-06',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'María Fernanda López Quintero',
    tipoDocumento: 'CC',
    numeroDocumento: '51.992.304',
    fechaNacimiento: '1989-12-12',
    sexo: 'Femenino',
    estadoCivil: 'Soltero(a)',
    escolaridad: 'Técnico / Tecnólogo',
    localidadResidencia: 'Bosa Centro, Bogotá',
    telefono: '315 704 2219',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-seleccion',
    cargoNombre: 'Operario de Selección',
    areaProceso: 'Planta – Recibo, Selección y Lavado',
    actividadPrincipal: 'Selección, lavado manual de papa/plátano y desinfección de áreas',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2021-03-15',
    turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
    eps: 'Sura EPS',
    arl: 'Positiva ARL',
    afp: 'Protección',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Sí, regular (3+ días/sem)',
    nutricionHabitos: 'Buena hidratación y alimentación regular.',
    morbilidadSentida: 'Resequedad en manos cuando lava con desengrasante sin guante largo.',
    enfermedadesDiagnosticadas: 'Dermatitis de contacto leve controlada.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-05',
    conceptoAptitud: 'Apto con recomendaciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-05', resultado: 'Apto manipulador de alimentos' },
    recomendacionesSaludOcupacional: 'Usar guantes de nitrilo largos, crema barrera hidratante y cumplir límite de carga de 12.5 kg para mujeres.',
    prioridadIntervencion: 'MEDIA',
    necesidadIntervencion: 'Dotación oportuna de guantes de nitrilo y rotulado claro de químicos.',
    seguimientoMedico: 'Control de piel en 6 meses.',
    fechaActualizacion: '2026-03-11',
  },
  {
    id: 'trab-07',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Diana Marcela Ortiz Guevara',
    tipoDocumento: 'CC',
    numeroDocumento: '52.981.442',
    fechaNacimiento: '1993-04-08',
    sexo: 'Femenino',
    estadoCivil: 'Unión Libre',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Soacha Compartir',
    telefono: '318 902 5541',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-empaque',
    cargoNombre: 'Operario de Empaque',
    areaProceso: 'Planta – Empaque y Sellado Térmico',
    actividadPrincipal: 'Pesaje, sellado térmico continuo de bolsas y embalaje en cajas',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2022-09-01',
    turnoHorario: 'Lunes a Sábado 7:00 a.m. - 3:30 p.m.',
    eps: 'Compensar EPS',
    arl: 'Positiva ARL',
    afp: 'Porvenir',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Sedentario / No realiza',
    nutricionHabitos: 'Consume poca agua durante la jornada.',
    morbilidadSentida: 'Hormigueo leve en muñeca derecha y cansancio en piernas al estar de pie.',
    enfermedadesDiagnosticadas: 'En estudio médico por molestia de muñeca derecha (tendinitis leve).',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-06',
    conceptoAptitud: 'Apto con recomendaciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Normal' },
    optometria: { estado: 'PENDIENTE', observaciones: 'Remitida a optometría confirmatoria' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Apto BPM' },
    recomendacionesSaludOcupacional: 'Instalar tapete blando (antifatiga), rotar cada 2 horas entre sellado y embalaje y realizar pausas activas de manos.',
    prioridadIntervencion: 'ALTA',
    necesidadIntervencion: 'Tapete antifatiga urgente y rotación de tareas en línea de empaque.',
    seguimientoMedico: 'Revisión de muñeca derecha en 90 días.',
    fechaActualizacion: '2026-03-12',
  },
  {
    id: 'trab-08',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Paola Andrea Murcia Peña',
    tipoDocumento: 'CC',
    numeroDocumento: '1.023.904.118',
    fechaNacimiento: '1996-06-19',
    sexo: 'Femenino',
    estadoCivil: 'Soltero(a)',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Bosa El Recreo, Bogotá',
    telefono: '321 440 7731',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-empaque',
    cargoNombre: 'Operario de Empaque',
    areaProceso: 'Planta – Empaque y Sellado Térmico',
    actividadPrincipal: 'Empaque en bolsas, fechado de lotes y armado de cajas',
    tipoContrato: 'Fijo',
    fechaIngreso: '2025-02-01',
    turnoHorario: 'Lunes a Sábado 7:00 a.m. - 3:30 p.m.',
    eps: 'Sanitas EPS',
    arl: 'Positiva ARL',
    afp: 'Colfondos',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Moderada (1-2 días/sem)',
    nutricionHabitos: 'Alimentación regular.',
    morbilidadSentida: 'Cansancio en pies al final del turno.',
    enfermedadesDiagnosticadas: 'Ninguna.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-06',
    conceptoAptitud: 'Apto sin restricciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-06', resultado: 'Apto BPM' },
    recomendacionesSaludOcupacional: 'Uso de tapete antifatiga y pausas activas de miembros inferiores y muñecas.',
    prioridadIntervencion: 'MEDIA',
    necesidadIntervencion: 'Participar en pausas activas diarias.',
    seguimientoMedico: 'Control anual.',
    fechaActualizacion: '2026-03-12',
  },
  {
    id: 'trab-09',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Yerson Fabián Pinzón Duarte',
    tipoDocumento: 'CC',
    numeroDocumento: '1.019.077.652',
    fechaNacimiento: '1994-10-02',
    sexo: 'Masculino',
    estadoCivil: 'Soltero(a)',
    escolaridad: 'Bachiller',
    localidadResidencia: 'Bosa Islandia, Bogotá',
    telefono: '312 618 0942',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-operario-seleccion',
    cargoNombre: 'Operario de Selección',
    areaProceso: 'Planta – Recibo, Selección y Lavado',
    actividadPrincipal: 'Descargue de bultos de papa y plátano, lavado y apoyo en bodega',
    tipoContrato: 'Fijo',
    fechaIngreso: '2025-05-15',
    turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
    eps: 'Salud Total EPS',
    arl: 'Positiva ARL',
    afp: 'Porvenir',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'Ocasional',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Sí, regular (3+ días/sem)',
    nutricionHabitos: 'Buena hidratación.',
    morbilidadSentida: 'Ninguna.',
    enfermedadesDiagnosticadas: 'Ninguna.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Ingreso',
    fechaUltimoExamen: '2025-05-12',
    conceptoAptitud: 'Apto sin restricciones',
    audiometria: { estado: 'PENDIENTE', observaciones: 'Pendiente renovación periódica anual' },
    visiometria: { estado: 'REALIZADA', fecha: '2025-05-12', resultado: 'Normal' },
    optometria: { estado: 'NO_APLICA' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2025-05-12', resultado: 'Apto manipulador de alimentos' },
    recomendacionesSaludOcupacional: 'Respetar máximo 25 kg por bulto y usar carretilla en bultos de 50 kg.',
    prioridadIntervencion: 'MEDIA',
    necesidadIntervencion: 'Programar examen médico periódico y audiometría 2026.',
    seguimientoMedico: 'Pendiente cita médica periódica.',
    fechaActualizacion: '2026-03-14',
  },
  {
    id: 'trab-10',
    estadoLaboral: 'ACTIVO',
    nombreCompleto: 'Óscar Javier Buitrago Leal',
    tipoDocumento: 'CC',
    numeroDocumento: '79.882.114',
    fechaNacimiento: '1981-01-25',
    sexo: 'Masculino',
    estadoCivil: 'Casado(a)',
    escolaridad: 'Técnico / Tecnólogo',
    localidadResidencia: 'Ciudad Bolívar Perdomo, Bogotá',
    telefono: '316 335 8810',
    correo: 'frikaz.fritosnacks@gmail.com',
    cargoId: 'cargo-conductor',
    cargoNombre: 'Conductor',
    areaProceso: 'Logística, Transporte y Distribución Comercial',
    actividadPrincipal: 'Entrega de pedidos en furgón por Bogotá y Soacha y cargue de cajas',
    tipoContrato: 'Fijo',
    fechaIngreso: '2023-06-01',
    turnoHorario: 'Lunes a Sábado 6:30 a.m. - 3:30 p.m.',
    eps: 'Famisanar EPS',
    arl: 'Positiva ARL',
    afp: 'Protección',
    consumoTabaco: 'No fuma',
    consumoAlcohol: 'No consume',
    otrasSustancias: 'Ninguna',
    actividadFisica: 'Moderada (1-2 días/sem)',
    nutricionHabitos: 'Almuerza por fuera en ruta; se orienta a evitar excesos de grasas.',
    morbilidadSentida: 'Cansancio en cuello al manejar en tráfico pesado.',
    enfermedadesDiagnosticadas: 'Sin antecedentes de enfermedad laboral.',
    tieneEnfermedadLaboralCalificada: false,
    tipoUltimoExamen: 'Periódico',
    fechaUltimoExamen: '2026-03-08',
    conceptoAptitud: 'Apto sin restricciones',
    audiometria: { estado: 'REALIZADA', fecha: '2026-03-08', resultado: 'Normal' },
    visiometria: { estado: 'REALIZADA', fecha: '2026-03-08', resultado: 'Agudeza visual 20/20' },
    optometria: { estado: 'REALIZADA', fecha: '2026-03-08', resultado: 'Apto para conducción diurna/nocturna' },
    espirometria: { estado: 'NO_APLICA' },
    laboratorio: { estado: 'REALIZADA', fecha: '2026-03-08', resultado: 'Glucosa y perfil lipídico normales' },
    recomendacionesSaludOcupacional: 'Tolerancia cero a alcohol/drogas al conducir, revisar preoperacional del vehículo y pausas cada 2 horas de ruta.',
    prioridadIntervencion: 'MEDIA',
    necesidadIntervencion: 'Prueba psicosensométrica y capacitación anual en manejo defensivo.',
    seguimientoMedico: 'Al día.',
    fechaActualizacion: '2026-03-15',
  },
];

// ============================================================================
// 3. DATOS INICIALES DE PERIODOS PARA LOS 6 INDICADORES (2025 Y 2026)
// ============================================================================

function crearPeriodosIniciales(): RegistroPeriodoIndicador[] {
  const registros: RegistroPeriodoIndicador[] = [];

  // Año 2025: datos base registrados, pendientes de validación por Gerencia
  for (let m = 1; m <= 12; m++) {
    registros.push({
      id: `per-2025-${String(m).padStart(2, '0')}`,
      anio: 2025,
      mes: m,
      periodoLabel: `${MESES_NOMBRES[m - 1]} 2025`,
      numeroTrabajadores: 10,
      accidentesTrabajo: m === 7 ? 1 : 0,
      accidentesMortales: 0,
      diasIncapacidadAT: m === 7 ? 3 : 0,
      diasCargadosAT: 0,
      casosNuevosEL: 0,
      casosAntiguosEL: 0,
      diasAusenciaIncapacidadMedica: m === 4 ? 2 : m === 7 ? 4 : m === 10 ? 2 : 0,
      diasTrabajoProgramados: 240,
      validado: false,
      fechaActualizacion: `2025-${String(m).padStart(2, '0')}-28`,
      observaciones:
        m === 7
          ? 'En julio 2025 se anotó 1 caso en empaque con 3 días de incapacidad; pendiente de validación de Gerencia.'
          : 'Datos del mes anotados; pendiente de validación de Gerencia.',
    });
  }
  registros.push({
    id: 'per-2025-00',
    anio: 2025,
    mes: 0,
    periodoLabel: 'Consolidado Anual 2025',
    numeroTrabajadores: 10,
    accidentesTrabajo: 1,
    accidentesMortales: 0,
    diasIncapacidadAT: 3,
    diasCargadosAT: 0,
    casosNuevosEL: 0,
    casosAntiguosEL: 0,
    diasAusenciaIncapacidadMedica: 8,
    diasTrabajoProgramados: 2880,
    validado: false,
    fechaActualizacion: '2025-12-30',
    observaciones: 'Consolidado anual 2025 listo para revisión y validación de Gerencia.',
  });

  // Año 2026: meses con datos cargados para revisión de Gerencia y meses futuros sin cerrar
  for (let m = 1; m <= 12; m++) {
    if (m <= 10) {
      registros.push({
        id: `per-2026-${String(m).padStart(2, '0')}`,
        anio: 2026,
        mes: m,
        periodoLabel: `${MESES_NOMBRES[m - 1]} 2026`,
        numeroTrabajadores: 10,
        accidentesTrabajo: 0,
        accidentesMortales: 0,
        diasIncapacidadAT: 0,
        diasCargadosAT: 0,
        casosNuevosEL: 0,
        casosAntiguosEL: 0,
        diasAusenciaIncapacidadMedica: m === 2 ? 2 : m === 6 ? 3 : m === 9 ? 1 : 0,
        diasTrabajoProgramados: 240,
        validado: false,
        fechaActualizacion: `2026-${String(m).padStart(2, '0')}-28`,
        observaciones:
          m === 2 || m === 6 || m === 9
            ? 'Incapacidad médica registrada; pendiente validación de Gerencia.'
            : 'Datos del mes anotados; pendiente validación de Gerencia.',
      });
    } else if (m === 11) {
      registros.push({
        id: `per-2026-11`,
        anio: 2026,
        mes: 11,
        periodoLabel: 'Noviembre 2026',
        numeroTrabajadores: 10,
        accidentesTrabajo: 0,
        accidentesMortales: 0,
        diasIncapacidadAT: 0,
        diasCargadosAT: 0,
        casosNuevosEL: 0,
        casosAntiguosEL: 0,
        diasAusenciaIncapacidadMedica: null,
        diasTrabajoProgramados: 240,
        validado: false,
        fechaActualizacion: '2026-11-18',
        observaciones: 'Faltan días de incapacidad por confirmar antes de enviar a Gerencia.',
      });
    } else {
      registros.push({
        id: `per-2026-12`,
        anio: 2026,
        mes: 12,
        periodoLabel: 'Diciembre 2026',
        numeroTrabajadores: 10,
        accidentesTrabajo: null,
        accidentesMortales: null,
        diasIncapacidadAT: null,
        diasCargadosAT: null,
        casosNuevosEL: null,
        casosAntiguosEL: null,
        diasAusenciaIncapacidadMedica: null,
        diasTrabajoProgramados: null,
        validado: false,
        fechaActualizacion: '2026-11-18',
        observaciones: 'Mes aún sin datos registrados.',
      });
    }
  }

  registros.push({
    id: 'per-2026-00',
    anio: 2026,
    mes: 0,
    periodoLabel: 'Consolidado Anual 2026',
    numeroTrabajadores: 10,
    accidentesTrabajo: 0,
    accidentesMortales: 0,
    diasIncapacidadAT: 0,
    diasCargadosAT: 0,
    casosNuevosEL: 0,
    casosAntiguosEL: 0,
    diasAusenciaIncapacidadMedica: 6,
    diasTrabajoProgramados: 2400,
    validado: false,
    fechaActualizacion: '2026-11-18',
    observaciones: 'Se consolidará cuando la Gerencia valide los meses del año.',
  });

  return registros;
}

// ============================================================================
// 4. PLANTILLA DE LOS SIETE ESTÁNDARES MÍNIMOS (RES. 0312 DE 2019 CAP. I)
// ============================================================================

export function construirEstandaresBaseAnio(
  _anio: number,
  config: CaracterizacionEmpresaDinamica
): EvaluacionEstandarMinimo[] {
  const { cantidadEstandares } = determinarGrupoEstandares0312(config);
  const esGrupo7 = cantidadEstandares === 7;
  const motivo = esGrupo7
    ? `Aplica directamente porque Frikaz S.A.S. tiene ${config.numeroTrabajadores} trabajadores en ${config.claseRiesgoSST} (Capítulo I: 7 Estándares).`
    : `Aplica como base obligatoria dentro de los ${cantidadEstandares} Estándares que corresponden ahora a Frikaz (${config.numeroTrabajadores} trabajadores, ${config.claseRiesgoSST}).`;

  return [
    {
      numero: 1,
      titulo: '1. Asignación de la persona que diseña el SG-SST',
      descripcionSencilla:
        'Contar con una persona designada por la Gerencia que tenga el curso de 50 horas y conozca la seguridad de la planta.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 1.1.1 / Decreto 1072 de 2015',
      informacionNecesaria: [
        'Carta de asignación firmada por el Gerente General en el Organigrama.',
        'Certificado vigente del curso de 50 horas (o actualización de 20 horas) en SST.',
      ],
      estadoRevision: 'EN_REVISION',
      observacionesRevision: 'Pendiente revisión de soportes y visto bueno del Gerente General.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 2,
      titulo: '2. Afiliación al Sistema de Seguridad Social Integral',
      descripcionSencilla:
        'Verificar que los 10 trabajadores tengan vigentes EPS (salud), ARL (riesgos laborales) y Fondo de Pensiones.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 1.1.4 / Ley 100 de 1993',
      informacionNecesaria: [
        'Registro individual de cada trabajador con EPS, ARL y AFP diligenciados.',
        'Planillas de pago PILA del último mes sin retrasos.',
      ],
      estadoRevision: 'EN_REVISION',
      observacionesRevision: 'En proceso de revisión de planillas PILA y afiliaciones.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 3,
      titulo: '3. Capacitación en Seguridad y Salud en el Trabajo (SST)',
      descripcionSencilla:
        'Realizar charlas prácticas sobre cómo evitar quemaduras en freidoras, uso de cuchillas, pausas activas y manejo seguro de químicos.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 1.2.1 / Decreto 1072 de 2015',
      informacionNecesaria: [
        'Actividades de capacitación programadas en el Plan Anual.',
        'Listas de asistencia firmadas o sellos aprobados de Misión Frikaz.',
      ],
      estadoRevision: 'PENDIENTE',
      observacionesRevision: 'Por hacer o subir listas de asistencia para revisión de Gerencia.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 4,
      titulo: '4. Plan Anual de Trabajo',
      descripcionSencilla:
        'Tener un calendario anual con objetivos, metas, responsables, presupuesto y seguimiento real de actividades.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 2.4.1 / Decreto 1072 Art. 2.2.4.6.17',
      informacionNecesaria: [
        'Objetivos generales y específicos aprobados por Gerencia.',
        'Cronograma con fechas, responsables, presupuesto y evidencias aprobadas.',
      ],
      estadoRevision: 'EN_REVISION',
      observacionesRevision: 'Plan anual en revisión y ejecución; pendiente aprobación de Gerencia.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 5,
      titulo: '5. Evaluaciones médicas ocupacionales',
      descripcionSencilla:
        'Realizar exámenes médicos de ingreso, periódicos y de retiro según los peligros de cada puesto, guardando total reserva médica.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 3.1.4 / Resolución 2346 de 2007',
      informacionNecesaria: [
        'Certificados de aptitud laboral y exámenes (audiometría, visiometría, espirometría, laboratorio BPM) al día.',
        'Protección estricta de historias médicas individuales.',
      ],
      estadoRevision: 'PENDIENTE',
      observacionesRevision: 'Faltan exámenes médicos o pruebas complementarias por completar y revisar.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 6,
      titulo: '6. Identificación de peligros y evaluación y valoración de riesgos',
      descripcionSencilla:
        'Tener actualizada la Matriz de Peligros GTC 45 con participación de los trabajadores y conectada con las tareas de prevención.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 4.1.1 / Decreto 1072 Art. 2.2.4.6.15',
      informacionNecesaria: [
        'Matriz GTC 45 actualizada para todos los cargos y procesos de la planta.',
        'Evidencia de revisión anual y vinculación de los riesgos Nivel I y II al Plan Anual.',
      ],
      estadoRevision: 'EN_REVISION',
      observacionesRevision: 'Matriz GTC 45 conectada con los cargos; pendiente revisión final del Gerente.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
    {
      numero: 7,
      titulo: '7. Medidas de prevención y control frente a peligros y riesgos',
      descripcionSencilla:
        'Aplicar soluciones reales en planta (pantallas contra aceite caliente, tapetes, rótulos SGA, entrega de EPP) y comprobar que funcionen.',
      normaReferencia: 'Resolución 0312 de 2019 — Estándar 4.2.1 / Decreto 1072 Art. 2.2.4.6.24',
      informacionNecesaria: [
        'Actividades ejecutadas y fotos/actas aprobadas para cada riesgo prioritario.',
        'Acciones de mejora abiertas cuando una medida falle o esté atrasada.',
      ],
      estadoRevision: 'PENDIENTE',
      observacionesRevision: 'Medidas de control en desarrollo; pendiente verificación y cierre de Gerencia.',
      aplicaSegunEmpresa: true,
      motivoAplicabilidad: motivo,
    },
  ];
}

// ============================================================================
// 5. SEMILLA INICIAL UNIFICADA DEL SISTEMA PLAN ANUAL SG-SST
// ============================================================================

function crearSeedInicialSgsst(
  config: CaracterizacionEmpresaDinamica,
  riesgos: RiesgoGTC45Item[]
): PlanAnualSgsstData {
  const rCalor = riesgos.find((r) => r.id === 'RSK-PROD-01') || riesgos[0];
  const rRuido = riesgos.find((r) => r.id === 'RSK-PROD-03') || riesgos[2] || riesgos[0];
  const rBiomec = riesgos.find((r) => r.id === 'RSK-PROD-04') || riesgos[3] || riesgos[0];

  const recomendaciones: RecomendacionIntervencion[] = [
    {
      id: 'rec-01',
      fecha: '2026-03-12',
      origen: 'EVALUACIONES_MEDICAS',
      titulo: 'Instalar tapetes blandos (antifatiga) y rotar tareas cada 2 horas en empaque',
      descripcion:
        'Derivado de exámenes ocupacionales periódicos agrupados del área de Empaque: prevenir fatiga en miembros inferiores y sobrecarga repetitiva en muñecas.',
      prioridad: 'ALTA',
      esConfidencialMedica: true,
      trabajadorId: 'trab-07',
      riesgoId: rBiomec?.id,
      estandarNumero: 7,
      responsable: 'Coordinador / Vigía de SST',
      estado: 'CONVERTIDA_EN_ACCION',
      accionMejoraId: 'acm-01',
    },
    {
      id: 'rec-02',
      fecha: '2026-03-11',
      origen: 'MATRIZ_RIESGOS',
      titulo: 'Realizar sonometría anual y reforzar doble protección auditiva en peladora',
      descripcion:
        'En el área de pelado y corte se detectó necesidad de confirmar niveles de ruido (límite 85 dBA) y revisar ajuste de tapa oídos.',
      prioridad: 'ALTA',
      esConfidencialMedica: false,
      riesgoId: rRuido?.id,
      estandarNumero: 7,
      responsable: 'Operario de Pelado',
      estado: 'ABIERTA',
    },
    {
      id: 'rec-03',
      fecha: '2026-03-14',
      origen: 'ESTANDARES_MINIMOS',
      titulo: 'Completar pruebas médicas complementarias pendientes (espirometría, optometría y audiometría)',
      descripcion:
        'Hay 3 trabajadores en planta con una prueba complementaria o examen periódico pendiente de realizar en 2026.',
      prioridad: 'MEDIA',
      esConfidencialMedica: true,
      estandarNumero: 5,
      responsable: 'Coordinador / Vigía de SST',
      estado: 'ABIERTA',
    },
  ];

  const accionesMejora: AccionMejoraPlan[] = [
    {
      id: 'acm-01',
      codigo: 'ACM-2026-01',
      tipo: 'CORRECTIVA',
      origen: 'ACTIVIDAD_PLAN',
      situacionEncontrada:
        'La tarea PA-2026-05 (tapetes antifatiga y pausas activas en selección y empaque) está vencida sin fotografía ni factura de soporte.',
      queSeNecesitaCorregir:
        'Comprar e instalar 3 tapetes antifatiga en la mesa de empaque e implementar planilla diaria de pausas de manos y piernas.',
      actividadARealizar:
        'Adquirir tapetes antifatiga de caucho lavable apto para alimentos, ubicarlos en puestos de sellado y verificar uso durante 2 semanas.',
      responsable: 'Operario de Empaque',
      fechaInicio: '2026-10-15',
      fechaLimite: '2026-11-30',
      evidenciaNecesaria: 'Factura de compra, fotos de los tapetes puestos y planilla de pausas activas.',
      evidenciasAdjuntas: [],
      estado: 'EN_PROCESO',
      resultadoSeguimiento: 'Cotización aprobada por Gerencia; pendiente entrega e instalación en mesa de sellado.',
      riesgoId: rBiomec?.id,
      actividadPlanId: 'act-2026-05',
      estandarNumero: 7,
      recomendacionId: 'rec-01',
      historial: [
        {
          id: 'hm-01',
          fecha: '2026-10-15',
          usuario: 'Coordinador / Vigía de SST',
          accion: 'CREADA',
          detalle: 'Acción abierta por vencimiento de PA-2026-05 y recomendación ergonómica en empaque.',
        },
        {
          id: 'hm-02',
          fecha: '2026-11-05',
          usuario: 'Gerente General (Representante Legal)',
          accion: 'SEGUIMIENTO',
          detalle: 'Presupuesto aprobado para compra de 3 tapetes antifatiga lavables.',
        },
      ],
    },
    {
      id: 'acm-02',
      codigo: 'ACM-2026-02',
      tipo: 'PREVENTIVA',
      origen: 'MATRIZ_RIESGOS',
      situacionEncontrada:
        'Revisión trimestral de termostatos de seguridad (>180 °C) y guantes térmicos en freidoras #1 y #2.',
      queSeNecesitaCorregir:
        'Asegurar que ningún termostato sobrepase 180 °C y reemplazar guantes térmicos con desgaste.',
      actividadARealizar:
        'Inspección mensual de calibración de freidoras y verificación visual de costuras de guantes térmicos.',
      responsable: 'Operario de Frito',
      fechaInicio: '2026-04-28',
      fechaLimite: '2026-05-15',
      evidenciaNecesaria: 'Lista de chequeo de freidoras y recibo de reposición de EPP.',
      evidenciasAdjuntas: [
        {
          id: 'ev-acm-02',
          nombreArchivo: 'Chequeo_Termostatos_Freidoras_2026.pdf',
          tipoSoporte: 'ACTA',
          descripcionSoporte: 'Revisión de corte térmico a 180 °C y guantes cargada para revisión.',
          fechaCarga: '2026-05-10',
          cargadoPor: 'Operario de Frito',
          estadoRevision: 'PENDIENTE_REVISION',
        },
      ],
      estado: 'PENDIENTE_REVISION',
      resultadoSeguimiento: 'Soporte cargado; pendiente revisión y aprobación por el Gerente.',
      riesgoId: rCalor?.id,
      actividadPlanId: 'act-2026-02',
      estandarNumero: 7,
      historial: [
        {
          id: 'hm-03',
          fecha: '2026-04-28',
          usuario: 'Coordinador / Vigía de SST',
          accion: 'CREADA',
          detalle: 'Acción preventiva vinculada a RSK-PROD-01.',
        },
        {
          id: 'hm-04',
          fecha: '2026-05-10',
          usuario: 'Operario de Frito',
          accion: 'EVIDENCIA_ADJUNTADA',
          detalle: 'Lista de chequeo subida para revisión y aprobación del Gerente.',
        },
      ],
    },
  ];

  const diagnosticosSalud: Record<number, DiagnosticoSaludEmpresa> = {
    2025: {
      anio: 2025,
      bateriaPsicosocial: {
        fechaAplicacion: '2025-10-18',
        estado: 'REALIZADA',
        nivelRiesgoIntralaboral: 'Bajo',
        nivelRiesgoExtralaboral: 'Bajo',
        nivelEstres: 'Bajo',
        observacionesGenerales: 'Aplicación anual realizada con psicóloga especialista en SST. Clima laboral favorable.',
      },
      analisisFactibilidad: {
        actividadEconomicaCIIU: config.ciiuPrincipal,
        gruposPoblacionalesAnalizados: 'Fritura (2), Pelado/Corte (1), Selección/Lavado (2), Empaque (2), Logística (1), Administración/SST (2).',
        conclusionesFactibilidad: 'Es viable implementar mejoras ergonómicas de bajo costo (tapetes, rotación de puestos) y pausas de hidratación.',
        fechaActualizacion: '2025-11-20',
      },
    },
    2026: {
      anio: 2026,
      bateriaPsicosocial: {
        fechaAplicacion: '2026-09-25',
        estado: 'REALIZADA',
        nivelRiesgoIntralaboral: 'Medio',
        nivelRiesgoExtralaboral: 'Bajo',
        nivelEstres: 'Bajo',
        observacionesGenerales: 'Se recomienda mantener pausas claras en horas pico de producción y reuniones trimestrales del Comité de Convivencia.',
      },
      analisisFactibilidad: {
        actividadEconomicaCIIU: config.ciiuPrincipal,
        gruposPoblacionalesAnalizados: 'Equipo completo de 10 trabajadores en planta de Bosa y ruta de distribución.',
        conclusionesFactibilidad: 'Priorizar control de temperatura en cocción, protección auditiva en pelado, tapetes antifatiga en empaque y exámenes periódicos al 100%.',
        fechaActualizacion: '2026-10-10',
      },
    },
  };

  return {
    trabajadores: TRABAJADORES_INICIALES_SST,
    diagnosticosSalud,
    hojasVidaIndicadores: [...INDICADORES_NORMATIVOS_0312],
    registrosPeriodosIndicadores: crearPeriodosIniciales(),
    estandaresMinimos: {
      2025: construirEstandaresBaseAnio(2025, config),
      2026: construirEstandaresBaseAnio(2026, config),
    },
    recomendaciones,
    accionesMejora,
    auditoriaCambios: [
      {
        id: 'aud-init-01',
        fechaHora: '2026-01-16T10:00:00',
        usuario: 'Coordinador / Vigía de SST',
        modulo: 'PLANEAR',
        accion: 'Inicialización SG-SST integrado',
        detalle: 'Conectados trabajadores, matriz GTC 45, 6 indicadores Res. 0312/2019 y 7 estándares mínimos.',
      },
    ],
  };
}

// ============================================================================
// 6. PERSISTENCIA EN LOCALSTORAGE CON AUDITORÍA
// ============================================================================

export function loadSgsstData(
  config: CaracterizacionEmpresaDinamica,
  riesgos: RiesgoGTC45Item[]
): PlanAnualSgsstData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SGSST);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanAnualSgsstData;
      if (parsed && Array.isArray(parsed.trabajadores) && Array.isArray(parsed.hojasVidaIndicadores)) {
        const existentesCustom = parsed.hojasVidaIndicadores.filter((i) => !i.esNormativo0312);
        const hojasVida = [...INDICADORES_NORMATIVOS_0312, ...existentesCustom];
        let needsSave = false;
        const trabajadoresActualizados = parsed.trabajadores.map((t) => {
          if (
            t.id === 'trab-01' &&
            (t.nombreCompleto === 'Carlos Andrés Méndez Rojas' || t.cargoNombre === 'Gerente General')
          ) {
            needsSave = true;
            return {
              ...t,
              nombreCompleto: 'Andrea Orjuela',
              sexo: 'Femenino' as const,
              cargoNombre: 'Gerente',
            };
          }
          return t;
        });
        let result: PlanAnualSgsstData = {
          ...parsed,
          trabajadores: trabajadoresActualizados,
          hojasVidaIndicadores: hojasVida,
        };

        if (!localStorage.getItem(GERENTE_GATE_FLAG_SGSST)) {
          const cleanEstandares: Record<number, EvaluacionEstandarMinimo[]> = {};
          Object.entries(result.estandaresMinimos || {}).forEach(([anioKey, lista]) => {
            cleanEstandares[Number(anioKey)] = lista.map((est) => {
              const estNorm = normalizarEstadoEstandar(est.estadoRevision);
              if (!est.revisionGerente && (estNorm === 'Cumplido' || estNorm === 'Aprobado')) {
                return {
                  ...est,
                  estadoRevision: 'EN_REVISION',
                  revisadoPor: undefined,
                  fechaRevision: undefined,
                  observacionesRevision: 'Pendiente de revisión y aprobación por Andrea Orjuela – Gerente.',
                };
              }
              return est;
            });
          });

          result = {
            ...result,
            registrosPeriodosIndicadores: result.registrosPeriodosIndicadores.map((reg) =>
              !reg.revisionGerente && reg.validado
                ? { ...reg, validado: false, validadoPor: undefined }
                : reg
            ),
            estandaresMinimos: cleanEstandares,
            accionesMejora: result.accionesMejora.map((acm) => {
              const evs = (acm.evidenciasAdjuntas || []).map((e) =>
                !e.revisionGerente && (e.estadoRevision === 'APROBADA' || e.estadoRevision === 'CUMPLIDA')
                  ? { ...e, estadoRevision: 'PENDIENTE_REVISION' as const, revisadoPor: undefined, fechaRevision: undefined }
                  : e
              );
              const acmNorm = normalizarEstadoEstandar(acm.estado);
              const resetEst =
                !acm.revisionGerente &&
                (acmNorm === 'Cumplido' || acmNorm === 'Aprobado' || acmNorm === 'Devuelto para ajustes')
                  ? evs.length > 0
                    ? ('PENDIENTE_REVISION' as const)
                    : ('EN_PROCESO' as const)
                  : acm.estado;
              return { ...acm, estado: resetEst, evidenciasAdjuntas: evs };
            }),
          };
          needsSave = true;
          localStorage.setItem(GERENTE_GATE_FLAG_SGSST, '1');
        }

        if (needsSave) {
          saveSgsstData(result);
        }

        return result;
      }
    }
  } catch (err) {
    console.error('Error cargando datos SG-SST del Plan Anual:', err);
  }
  const seed = crearSeedInicialSgsst(config, riesgos);
  saveSgsstData(seed);
  localStorage.setItem(GERENTE_GATE_FLAG_SGSST, '1');
  return seed;
}

export function saveSgsstData(data: PlanAnualSgsstData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_SGSST, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Error guardando datos SG-SST del Plan Anual:', err);
    return false;
  }
}

export function agregarRegistroAuditoria(
  data: PlanAnualSgsstData,
  modulo: RegistroAuditoriaPlanAnual['modulo'],
  accion: string,
  detalle: string,
  usuario: string = 'Responsable SG-SST'
): PlanAnualSgsstData {
  const nuevo: RegistroAuditoriaPlanAnual = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fechaHora: new Date().toISOString(),
    usuario,
    modulo,
    accion,
    detalle,
  };
  return {
    ...data,
    auditoriaCambios: [nuevo, ...data.auditoriaCambios].slice(0, 120),
  };
}

// ============================================================================
// 7. COMPLETITUD DE FICHA DE TRABAJADOR Y DIAGNÓSTICO SOCIODEMOGRÁFICO AGRUPADO
// ============================================================================

export function evaluarCompletitudTrabajador(t: TrabajadorFichaSST): {
  porcentaje: number;
  pendientes: string[];
  completa: boolean;
} {
  const pendientes: string[] = [];
  if (!t.nombreCompleto.trim()) pendientes.push('Nombre completo');
  if (!t.numeroDocumento.trim()) pendientes.push('Número de documento');
  if (!t.fechaNacimiento) pendientes.push('Fecha de nacimiento');
  if (!t.cargoNombre.trim()) pendientes.push('Cargo');
  if (!t.actividadPrincipal.trim()) pendientes.push('Actividad principal');
  if (!t.eps.trim() || !t.arl.trim() || !t.afp.trim()) pendientes.push('Afiliaciones (EPS/ARL/AFP)');
  if (t.consumoTabaco === 'Pendiente' || t.consumoAlcohol === 'Pendiente' || t.actividadFisica === 'Pendiente') {
    pendientes.push('Hábitos y estilos de vida');
  }
  if (t.tipoUltimoExamen === 'Pendiente' || !t.fechaUltimoExamen || t.conceptoAptitud === 'Pendiente') {
    pendientes.push('Evaluación médica ocupacional');
  }
  if (t.audiometria.estado === 'PENDIENTE') pendientes.push('Prueba de audiometría');
  if (t.visiometria.estado === 'PENDIENTE') pendientes.push('Prueba de visiometría');
  if (t.optometria.estado === 'PENDIENTE') pendientes.push('Prueba de optometría');
  if (t.espirometria.estado === 'PENDIENTE') pendientes.push('Prueba de espirometría');
  if (t.laboratorio.estado === 'PENDIENTE') pendientes.push('Exámenes de laboratorio');

  const totalChecks = 13;
  const completados = Math.max(0, totalChecks - pendientes.length);
  const porcentaje = Math.round((completados / totalChecks) * 100);
  return { porcentaje, pendientes, completa: pendientes.length === 0 };
}

export function construirResumenSociodemografico(trabajadores: TrabajadorFichaSST[]) {
  const activos = trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO');
  const total = activos.length;

  const porSexo: Record<string, number> = {};
  const porContrato: Record<string, number> = {};
  const porEscolaridad: Record<string, number> = {};
  const porCargo: Record<string, number> = {};
  const porEdad: Record<string, number> = {
    '18-29 años': 0,
    '30-39 años': 0,
    '40-49 años': 0,
    '50+ años': 0,
  };

  let completos = 0;
  let pruebasPendientes = 0;
  let conRecomendacionAlta = 0;
  let enfermedadesLaboralesActivas = 0;
  let afiliacionCompleta = 0;

  const hoy = new Date();
  activos.forEach((t) => {
    porSexo[t.sexo] = (porSexo[t.sexo] || 0) + 1;
    porContrato[t.tipoContrato] = (porContrato[t.tipoContrato] || 0) + 1;
    porEscolaridad[t.escolaridad] = (porEscolaridad[t.escolaridad] || 0) + 1;
    porCargo[t.cargoNombre] = (porCargo[t.cargoNombre] || 0) + 1;

    if (t.fechaNacimiento) {
      const nac = new Date(t.fechaNacimiento);
      const edad = hoy.getFullYear() - nac.getFullYear();
      if (edad < 30) porEdad['18-29 años']++;
      else if (edad < 40) porEdad['30-39 años']++;
      else if (edad < 50) porEdad['40-49 años']++;
      else porEdad['50+ años']++;
    }

    const comp = evaluarCompletitudTrabajador(t);
    if (comp.completa) completos++;
    if (
      t.audiometria.estado === 'PENDIENTE' ||
      t.visiometria.estado === 'PENDIENTE' ||
      t.optometria.estado === 'PENDIENTE' ||
      t.espirometria.estado === 'PENDIENTE' ||
      t.laboratorio.estado === 'PENDIENTE'
    ) {
      pruebasPendientes++;
    }
    if (t.prioridadIntervencion === 'ALTA') conRecomendacionAlta++;
    if (t.tieneEnfermedadLaboralCalificada) enfermedadesLaboralesActivas++;
    if (t.eps.trim() && t.arl.trim() && t.afp.trim()) afiliacionCompleta++;
  });

  // Morbilidad agrupada por área sin mostrar nombres individuales (protección de datos médicos)
  const molestiasPorArea: Record<string, number> = {};
  activos.forEach((t) => {
    const tieneMolestia =
      t.morbilidadSentida &&
      !t.morbilidadSentida.toLowerCase().includes('ninguna') &&
      t.morbilidadSentida.trim().length > 3;
    if (tieneMolestia) {
      const area = t.areaProceso.split('–')[0].trim() || 'Planta';
      molestiasPorArea[area] = (molestiasPorArea[area] || 0) + 1;
    }
  });

  return {
    totalActivos: total,
    completos,
    incompletos: total - completos,
    pruebasPendientes,
    conRecomendacionAlta,
    enfermedadesLaboralesActivas,
    afiliacionCompleta,
    porSexo,
    porContrato,
    porEscolaridad,
    porCargo,
    porEdad,
    molestiasPorArea,
  };
}

// ============================================================================
// 8. CONEXIÓN BIDIRECCIONAL CON MATRIZ DE RIESGOS GTC 45 (SIN DUPLICACIÓN)
// ============================================================================

export function coincidenCargoYRiesgo(cargoTrabajador: string, r: RiesgoGTC45Item): boolean {
  const cTrab = cargoTrabajador.toLowerCase().trim();
  const cRiesgo = `${r.cargo || ''} ${r.cargosExpuestos || ''}`.toLowerCase();
  if (!cTrab || !cRiesgo) return false;
  if (cRiesgo.includes('todo el personal') || cRiesgo.includes('todos')) return true;

  const palabrasClave = cTrab
    .split(/[\s/]+/)
    .filter((w) => w.length >= 4 && w !== 'operario' && w !== 'general' && w !== 'vigía');
  if (cRiesgo.includes(cTrab)) return true;
  return palabrasClave.some((p) => cRiesgo.includes(p));
}

export function obtenerConexionesRiesgo(
  riesgo: RiesgoGTC45Item,
  trabajadores: TrabajadorFichaSST[],
  plan: PlanAnualVigencia,
  accionesMejora: AccionMejoraPlan[]
) {
  const trabajadoresRelacionados = trabajadores.filter(
    (t) => t.estadoLaboral === 'ACTIVO' && coincidenCargoYRiesgo(t.cargoNombre, riesgo)
  );
  const actividadesPlan = plan.actividades.filter((a) => a.riesgoId === riesgo.id);
  const evidenciasPlan = actividadesPlan.flatMap((a) =>
    a.evidencias.map((ev) => ({ ...ev, actividadCodigo: a.codigo, actividadNombre: a.nombre }))
  );
  const acciones = accionesMejora.filter((acm) => acm.riesgoId === riesgo.id);

  return {
    trabajadoresRelacionados,
    actividadesPlan,
    evidenciasPlan,
    acciones,
  };
}

// ============================================================================
// 9. MOTOR DE CÁLCULO AUTOMÁTICO DE LOS 6 INDICADORES RES. 0312 (SIN DATOS INVENTADOS)
// ============================================================================

export function obtenerRegistroConDatosVivos(
  registro: RegistroPeriodoIndicador,
  trabajadores: TrabajadorFichaSST[],
  config: CaracterizacionEmpresaDinamica
): RegistroPeriodoIndicador {
  const activosCount = trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO').length;
  const numeroTrabajadoresReal = activosCount > 0 ? activosCount : config.numeroTrabajadores;
  return {
    ...registro,
    // Reutiliza el número real de trabajadores si coincide o no se sobrescribió diferente para ese año histórico
    numeroTrabajadores:
      registro.numeroTrabajadores !== null ? registro.numeroTrabajadores : numeroTrabajadoresReal,
  };
}

function formatearNumero(n: number): number {
  return Math.round(n * 100) / 100;
}

function construirSemaforo(
  ind: HojaVidaIndicadorSST,
  valor: number
): { color: 'VERDE' | 'AMARILLO' | 'ROJO'; texto: string } {
  if (ind.metaOperador === '<=') {
    if (valor <= ind.metaValor) {
      return {
        color: 'VERDE',
        texto: 'Verde: Meta cumplida (sin novedades graves fuera del límite).',
      };
    }
    if (ind.metaValor === 0 && valor <= 10) {
      return {
        color: 'AMARILLO',
        texto: 'Amarillo: Hubo novedades; revisar causas y activar seguimiento.',
      };
    }
    if (ind.metaValor > 0 && valor <= ind.metaValor * 1.35) {
      return {
        color: 'AMARILLO',
        texto: 'Amarillo: Ligeramente por encima de la meta; requiere atención.',
      };
    }
    return {
      color: 'ROJO',
      texto: 'Rojo: Superó la meta permitida; abrir acción de mejora urgente en ACTUAR.',
    };
  }
  if (ind.metaOperador === '=') {
    return valor === ind.metaValor
      ? { color: 'VERDE', texto: 'Verde: Meta cumplida exactamente.' }
      : { color: 'ROJO', texto: 'Rojo: Resultado fuera de meta; requiere acción inmediata.' };
  }
  // >=
  if (valor >= ind.metaValor) {
    return { color: 'VERDE', texto: 'Verde: Meta cumplida.' };
  }
  if (valor >= ind.metaValor * 0.7) {
    return { color: 'AMARILLO', texto: 'Amarillo: En seguimiento; aún falta para alcanzar la meta.' };
  }
  return { color: 'ROJO', texto: 'Rojo: Muy por debajo de la meta; requiere intervención.' };
}

export function calcularResultadoIndicadorPeriodo(
  ind: HojaVidaIndicadorSST,
  registroBruto: RegistroPeriodoIndicador,
  trabajadores: TrabajadorFichaSST[],
  config: CaracterizacionEmpresaDinamica
): ResultadoIndicadorPeriodo {
  const reg = obtenerRegistroConDatosVivos(registroBruto, trabajadores, config);
  const faltantes: string[] = [];

  if (!reg.validado) {
    // Igual evaluamos si faltan datos para dar un mensaje completamente útil
  }

  const pushSiFalta = (val: number | null | undefined, label: string) => {
    if (val === null || val === undefined || Number.isNaN(val)) {
      faltantes.push(label);
    }
  };

  if (ind.codigoNormativo0312 === 'IND-SST-01') {
    pushSiFalta(reg.accidentesTrabajo, 'Número de accidentes de trabajo del mes');
    pushSiFalta(reg.numeroTrabajadores, 'Número de trabajadores del mes');

    const vars = [
      {
        etiqueta: 'Accidentes de trabajo en el mes',
        valor: reg.accidentesTrabajo === null ? 'Sin dato' : String(reg.accidentesTrabajo),
        origen: 'Base mensual de captura',
      },
      {
        etiqueta: 'Trabajadores en el mes',
        valor: reg.numeroTrabajadores === null ? 'Sin dato' : String(reg.numeroTrabajadores),
        origen: 'Registro de trabajadores (HACER)',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta diligenciar ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica:
          'Los datos ya fueron guardados, pero falta que la Gerencia los revise y apruebe para oficializar el resultado.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de revisión por Gerencia.',
        faltantes: ['Revisión y aprobación del Gerente'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.numeroTrabajadores || 0) <= 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica:
          'Cálculo no disponible: el número de trabajadores (denominador) es 0.',
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Cálculo no disponible (denominador en cero).',
        faltantes: ['Número de trabajadores mayor a 0'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(((reg.accidentesTrabajo || 0) / (reg.numeroTrabajadores || 1)) * 100);
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `Por cada cien (100) trabajadores que laboraron en ${reg.periodoLabel}, se presentaron ${valor} accidentes de trabajo.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  if (ind.codigoNormativo0312 === 'IND-SST-02') {
    pushSiFalta(reg.diasIncapacidadAT, 'Días de incapacidad por accidente de trabajo');
    pushSiFalta(reg.diasCargadosAT, 'Días cargados en el mes');
    pushSiFalta(reg.numeroTrabajadores, 'Número de trabajadores del mes');

    const vars = [
      {
        etiqueta: 'Días de incapacidad por AT',
        valor: reg.diasIncapacidadAT === null ? 'Sin dato' : String(reg.diasIncapacidadAT),
        origen: 'Base mensual de captura / Incapacidades',
      },
      {
        etiqueta: 'Días cargados en el mes',
        valor: reg.diasCargadosAT === null ? 'Sin dato' : String(reg.diasCargadosAT),
        origen: 'Base mensual de captura',
      },
      {
        etiqueta: 'Trabajadores en el mes',
        valor: reg.numeroTrabajadores === null ? 'Sin dato' : String(reg.numeroTrabajadores),
        origen: 'Registro de trabajadores (HACER)',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica: 'Datos registrados, pero el periodo está pendiente de validación.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de validación.',
        faltantes: ['Validación del periodo'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.numeroTrabajadores || 0) <= 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica: 'Cálculo no disponible: el número de trabajadores es 0.',
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Cálculo no disponible (denominador en cero).',
        faltantes: ['Número de trabajadores mayor a 0'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(
      (((reg.diasIncapacidadAT || 0) + (reg.diasCargadosAT || 0)) / (reg.numeroTrabajadores || 1)) * 100
    );
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `Por cada cien (100) trabajadores que laboraron en ${reg.periodoLabel}, se perdieron ${valor} días por accidente de trabajo.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  if (ind.codigoNormativo0312 === 'IND-SST-03') {
    pushSiFalta(reg.accidentesMortales, 'Accidentes de trabajo mortales en el año');
    pushSiFalta(reg.accidentesTrabajo, 'Total de accidentes de trabajo en el año');

    const vars = [
      {
        etiqueta: 'Accidentes mortales en el año',
        valor: reg.accidentesMortales === null ? 'Sin dato' : String(reg.accidentesMortales),
        origen: 'Consolidado anual / FURAT',
      },
      {
        etiqueta: 'Total accidentes de trabajo en el año',
        valor: reg.accidentesTrabajo === null ? 'Sin dato' : String(reg.accidentesTrabajo),
        origen: 'Consolidado anual / FURAT',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica:
          'Consolidado anual aún pendiente de validación por cierre de año.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de validación anual.',
        faltantes: ['Validación del consolidado anual'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.accidentesTrabajo || 0) === 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica:
          'Cálculo porcentual no disponible porque el total de accidentes de trabajo en el año fue 0 (0 accidentes mortales y 0 accidentes totales).',
        estadoSemaforo: (reg.accidentesMortales || 0) === 0 ? 'VERDE' : 'GRIS',
        textoSemaforo:
          (reg.accidentesMortales || 0) === 0
            ? 'Verde: 0 accidentes totales y 0 mortales (sin accidentes para dividir).'
            : 'Gris: Denominador en cero.',
        faltantes: [],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(((reg.accidentesMortales || 0) / (reg.accidentesTrabajo || 1)) * 100);
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `En el año ${reg.anio}, el ${valor} % de accidentes de trabajo fueron mortales.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  if (ind.codigoNormativo0312 === 'IND-SST-04') {
    pushSiFalta(reg.casosNuevosEL, 'Casos nuevos de enfermedad laboral');
    pushSiFalta(reg.casosAntiguosEL, 'Casos antiguos de enfermedad laboral');
    pushSiFalta(reg.numeroTrabajadores, 'Promedio de trabajadores del periodo');

    const vars = [
      {
        etiqueta: 'Casos nuevos + antiguos de enfermedad laboral',
        valor:
          reg.casosNuevosEL === null || reg.casosAntiguosEL === null
            ? 'Sin dato'
            : `${reg.casosNuevosEL + reg.casosAntiguosEL} (${reg.casosNuevosEL} nuevos + ${reg.casosAntiguosEL} antiguos)`,
        origen: 'Diagnóstico de condiciones de salud (confidencial)',
      },
      {
        etiqueta: 'Promedio de trabajadores en el periodo',
        valor: reg.numeroTrabajadores === null ? 'Sin dato' : String(reg.numeroTrabajadores),
        origen: 'Registro de trabajadores (HACER)',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica: 'Consolidado pendiente de validación médica y SST.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de validación.',
        faltantes: ['Validación del periodo'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.numeroTrabajadores || 0) <= 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica: 'Cálculo no disponible: el promedio de trabajadores es 0.',
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Cálculo no disponible (denominador en cero).',
        faltantes: ['Promedio de trabajadores mayor a 0'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(
      (((reg.casosNuevosEL || 0) + (reg.casosAntiguosEL || 0)) / (reg.numeroTrabajadores || 1)) * 100000
    );
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `Por cada 100.000 trabajadores existen ${valor} casos de enfermedad laboral en ${reg.periodoLabel}.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  if (ind.codigoNormativo0312 === 'IND-SST-05') {
    pushSiFalta(reg.casosNuevosEL, 'Casos nuevos de enfermedad laboral');
    pushSiFalta(reg.numeroTrabajadores, 'Promedio de trabajadores del periodo');

    const vars = [
      {
        etiqueta: 'Casos nuevos de enfermedad laboral',
        valor: reg.casosNuevosEL === null ? 'Sin dato' : String(reg.casosNuevosEL),
        origen: 'Diagnóstico de condiciones de salud (confidencial)',
      },
      {
        etiqueta: 'Promedio de trabajadores en el periodo',
        valor: reg.numeroTrabajadores === null ? 'Sin dato' : String(reg.numeroTrabajadores),
        origen: 'Registro de trabajadores (HACER)',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica: 'Consolidado pendiente de validación médica y SST.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de validación.',
        faltantes: ['Validación del periodo'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.numeroTrabajadores || 0) <= 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica: 'Cálculo no disponible: el promedio de trabajadores es 0.',
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Cálculo no disponible (denominador en cero).',
        faltantes: ['Promedio de trabajadores mayor a 0'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(((reg.casosNuevosEL || 0) / (reg.numeroTrabajadores || 1)) * 100000);
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `Por cada 100.000 trabajadores existen ${valor} casos nuevos de enfermedad laboral en ${reg.periodoLabel}.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  if (ind.codigoNormativo0312 === 'IND-SST-06') {
    pushSiFalta(reg.diasAusenciaIncapacidadMedica, 'Días de ausencia por incapacidad médica en el mes');
    pushSiFalta(reg.diasTrabajoProgramados, 'Número de días de trabajo programados en el mes');

    const vars = [
      {
        etiqueta: 'Días de ausencia por incapacidad médica',
        valor:
          reg.diasAusenciaIncapacidadMedica === null
            ? 'Sin dato'
            : String(reg.diasAusenciaIncapacidadMedica),
        origen: 'Base mensual de captura / Incapacidades EPS y ARL',
      },
      {
        etiqueta: 'Días de trabajo programados en el mes',
        valor: reg.diasTrabajoProgramados === null ? 'Sin dato' : String(reg.diasTrabajoProgramados),
        origen: 'Base mensual de captura / Nómina',
      },
    ];

    if (faltantes.length > 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_REGISTRO',
        valor: null,
        interpretacionAutomatica: `Información pendiente de registro: falta ${faltantes.join(', ')}.`,
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Información pendiente de registro.',
        faltantes,
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if (!reg.validado) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'PENDIENTE_VALIDACION',
        valor: null,
        interpretacionAutomatica: 'Periodo pendiente de validación para emitir el porcentaje oficial.',
        estadoSemaforo: 'AMARILLO',
        textoSemaforo: 'Amarillo: Pendiente de validación.',
        faltantes: ['Validación del periodo'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    if ((reg.diasTrabajoProgramados || 0) <= 0) {
      return {
        periodoLabel: reg.periodoLabel,
        anio: reg.anio,
        mes: reg.mes,
        estadoCalculo: 'NO_DISPONIBLE_DENOMINADOR_CERO',
        valor: null,
        interpretacionAutomatica: 'Cálculo no disponible: los días de trabajo programados son 0.',
        estadoSemaforo: 'GRIS',
        textoSemaforo: 'Gris: Cálculo no disponible (denominador en cero).',
        faltantes: ['Días programados mayor a 0'],
        variablesUsadas: vars,
        fechaActualizacion: reg.fechaActualizacion,
      };
    }
    const valor = formatearNumero(
      ((reg.diasAusenciaIncapacidadMedica || 0) / (reg.diasTrabajoProgramados || 1)) * 100
    );
    const sem = construirSemaforo(ind, valor);
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'CALCULADO',
      valor,
      interpretacionAutomatica: `En ${reg.periodoLabel} se perdió ${valor} % de días programados de trabajo por incapacidad médica.`,
      estadoSemaforo: sem.color,
      textoSemaforo: sem.texto,
      faltantes: [],
      variablesUsadas: vars,
      fechaActualizacion: reg.fechaActualizacion,
    };
  }

  // Indicador personalizado agregado por Frikaz S.A.S.
  const valCustom = reg.valoresPersonalizados?.[ind.id] ?? null;
  if (valCustom === null || valCustom === undefined) {
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'PENDIENTE_REGISTRO',
      valor: null,
      interpretacionAutomatica: 'Información pendiente de registro para este indicador propio.',
      estadoSemaforo: 'GRIS',
      textoSemaforo: 'Gris: Falta ingresar el valor de este periodo.',
      faltantes: [`Valor del periodo para ${ind.nombre}`],
      variablesUsadas: [],
      fechaActualizacion: reg.fechaActualizacion,
    };
  }
  if (!reg.validado) {
    return {
      periodoLabel: reg.periodoLabel,
      anio: reg.anio,
      mes: reg.mes,
      estadoCalculo: 'PENDIENTE_VALIDACION',
      valor: null,
      interpretacionAutomatica: 'Valor ingresado, pendiente de validación.',
      estadoSemaforo: 'AMARILLO',
      textoSemaforo: 'Amarillo: Pendiente de validación.',
      faltantes: ['Validación del periodo'],
      variablesUsadas: [],
      fechaActualizacion: reg.fechaActualizacion,
    };
  }
  const sem = construirSemaforo(ind, valCustom);
  return {
    periodoLabel: reg.periodoLabel,
    anio: reg.anio,
    mes: reg.mes,
    estadoCalculo: 'CALCULADO',
    valor: valCustom,
    interpretacionAutomatica: `${ind.interpretacionBase} Resultado: ${valCustom} ${ind.unidadMedida}.`,
    estadoSemaforo: sem.color,
    textoSemaforo: sem.texto,
    faltantes: [],
    variablesUsadas: [
      { etiqueta: 'Valor registrado', valor: `${valCustom} ${ind.unidadMedida}`, origen: ind.fuenteInformacion },
    ],
    fechaActualizacion: reg.fechaActualizacion,
  };
}

// ============================================================================
// 10. EVALUADOR DE EVIDENCIAS REALES PARA LOS SIETE ESTÁNDARES MÍNIMOS
// ============================================================================

export function obtenerSoportesRealesEstandar(
  numero: EvaluacionEstandarMinimo['numero'],
  plan: PlanAnualVigencia,
  trabajadores: TrabajadorFichaSST[],
  riesgos: RiesgoGTC45Item[],
  accionesMejora: AccionMejoraPlan[]
): {
  registrosDisponibles: string[];
  faltantesDetectados: string[];
  accionesRelacionadas: AccionMejoraPlan[];
} {
  const disponibles: string[] = [];
  const faltantes: string[] = [];
  const activos = trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO');
  const accionesRelacionadas = accionesMejora.filter((a) => a.estandarNumero === numero);

  if (numero === 1) {
    const cargos = getStoredCargosSST();
    const vigia = cargos.find((c) => c.id === 'cargo-coordinador-vigia-sst');
    if (vigia) disponibles.push(`Cargo definido en Organigrama: ${vigia.nombre}`);
    else faltantes.push('Falta asignar responsable SST en el Organigrama.');

    const acts1 = plan.actividades.filter((a) => a.estandarMinimoNumero === 1 || a.nombre.toLowerCase().includes('vigía'));
    if (acts1.length > 0) disponibles.push(`${acts1.length} actividad(es) relacionadas en el Plan Anual.`);
  } else if (numero === 2) {
    const conSegSocial = activos.filter((t) => t.eps.trim() && t.arl.trim() && t.afp.trim());
    disponibles.push(`${conSegSocial.length} de ${activos.length} trabajadores activos tienen EPS, ARL y AFP registrados.`);
    if (conSegSocial.length < activos.length) {
      faltantes.push(`Faltan datos de EPS/ARL/AFP en ${activos.length - conSegSocial.length} trabajador(es).`);
    }
  } else if (numero === 3) {
    const actsCap = plan.actividades.filter(
      (a) =>
        a.estandarMinimoNumero === 3 ||
        a.nombre.toLowerCase().includes('charla') ||
        a.nombre.toLowerCase().includes('capacit') ||
        a.nombre.toLowerCase().includes('pausas')
    );
    const conEvAprobada = actsCap.filter((a) =>
      a.evidencias.some((e) => e.estadoRevision === 'APROBADA' || e.estadoRevision === 'CUMPLIDA')
    );
    disponibles.push(`${actsCap.length} actividad(es) de formación en el Plan Anual (${conEvAprobada.length} con soporte aprobado por Gerencia).`);
    if (actsCap.length === 0 || conEvAprobada.length < actsCap.length) {
      faltantes.push('Faltan actas o listas de asistencia aprobadas por Gerencia en capacitaciones.');
    }
  } else if (numero === 4) {
    const cumplidas = plan.actividades.filter(
      (a) => a.estado === 'CUMPLIDA' || a.estado === 'APROBADA'
    ).length;
    disponibles.push(`Plan ${plan.vigencia} (${plan.estadoAprobacion}): ${plan.actividades.length} actividades (${cumplidas} cumplidas/aprobadas).`);
    if (cumplidas < plan.actividades.length) {
      faltantes.push(`Quedan ${plan.actividades.length - cumplidas} actividades por ejecutar o aprobar por Gerencia.`);
    }
  } else if (numero === 5) {
    const alDia = activos.filter(
      (t) =>
        t.tipoUltimoExamen !== 'Pendiente' &&
        t.audiometria.estado !== 'PENDIENTE' &&
        t.visiometria.estado !== 'PENDIENTE' &&
        t.optometria.estado !== 'PENDIENTE' &&
        t.espirometria.estado !== 'PENDIENTE' &&
        t.laboratorio.estado !== 'PENDIENTE'
    );
    disponibles.push(`${alDia.length} de ${activos.length} trabajadores con evaluaciones y pruebas al día.`);
    if (alDia.length < activos.length) {
      faltantes.push(`${activos.length - alDia.length} trabajador(es) tienen examen médico o prueba complementaria pendiente.`);
    }
  } else if (numero === 6) {
    const criticos = riesgos.filter((r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II');
    const criticosEnPlan = criticos.filter((r) => plan.actividades.some((a) => a.riesgoId === r.id));
    disponibles.push(`${riesgos.length} riesgos en la Matriz GTC 45 (${criticosEnPlan.length}/${criticos.length} Nivel I-II conectados al Plan).`);
    if (criticosEnPlan.length < criticos.length) {
      faltantes.push(`Hay ${criticos.length - criticosEnPlan.length} riesgo(s) Nivel I/II sin actividad programada en PLANEAR.`);
    }
  } else if (numero === 7) {
    const actsRiesgo = plan.actividades.filter((a) => a.origen === 'RIESGO_GTC45' || a.estandarMinimoNumero === 7);
    const cumplidasRiesgo = actsRiesgo.filter(
      (a) => a.estado === 'CUMPLIDA' || a.estado === 'APROBADA'
    );
    disponibles.push(`${cumplidasRiesgo.length} de ${actsRiesgo.length} medidas de prevención y control aprobadas por Gerencia.`);
    if (cumplidasRiesgo.length < actsRiesgo.length) {
      faltantes.push(`Faltan ${actsRiesgo.length - cumplidasRiesgo.length} medida(s) por completar o aprobar por Gerencia.`);
    }
  }

  return { registrosDisponibles: disponibles, faltantesDetectados: faltantes, accionesRelacionadas };
}

// ============================================================================
// 11. EXPORTADOR DE INDICADORES RES. 0312 A EXCEL (.XLSX)
// ============================================================================

export async function exportarIndicadoresExcel(
  anio: number,
  hojasVida: HojaVidaIndicadorSST[],
  registros: RegistroPeriodoIndicador[],
  trabajadores: TrabajadorFichaSST[],
  config: CaracterizacionEmpresaDinamica
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Frikaz S.A.S. - Indicadores SST Res. 0312/2019';
  const ws = wb.addWorksheet(`Indicadores SST ${anio}`);

  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = `FRIKAZ S.A.S. — INDICADORES MÍNIMOS DE SST (RES. 0312 DE 2019 ART. 30) — AÑO ${anio}`;
  title.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  ws.getRow(3).values = [
    'Indicador',
    'Periodicidad',
    'Periodo',
    'Resultado',
    'Estado / Semáforo',
    'Interpretación',
    'Fecha actualización',
  ];
  ws.getRow(3).font = { bold: true };

  const regsAnio = registros
    .filter((r) => r.anio === anio)
    .sort((a, b) => a.mes - b.mes);

  let rowIdx = 4;
  hojasVida.forEach((ind) => {
    const periodosAplicables =
      ind.periodicidad === 'ANUAL'
        ? regsAnio.filter((r) => r.mes === 0)
        : regsAnio.filter((r) => r.mes >= 1);

    periodosAplicables.forEach((reg) => {
      const res = calcularResultadoIndicadorPeriodo(ind, reg, trabajadores, config);
      ws.getRow(rowIdx++).values = [
        `${ind.codigo} - ${ind.nombre}`,
        ind.periodicidad,
        res.periodoLabel,
        res.valor !== null ? `${res.valor} ${ind.unidadMedida}` : 'No disponible / Pendiente',
        res.textoSemaforo,
        res.interpretacionAutomatica,
        res.fechaActualizacion,
      ];
    });
  });

  ws.columns.forEach((c) => {
    c.width = 24;
  });
  ws.getColumn(1).width = 36;
  ws.getColumn(6).width = 48;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Indicadores_SST_Res0312_${anio}_Frikaz.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
