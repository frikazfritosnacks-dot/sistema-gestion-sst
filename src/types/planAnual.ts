// ============================================================================
// TIPOS DEL MÓDULO INTEGRADO «PLAN ANUAL» (DENTRO DE PLANEAR) — FRIKAZ S.A.S.
// ============================================================================

import type { RegistroRevisionGerente } from '../services/gerenteControlService';

export type EstadoAprobacionPlan =
  | 'BORRADOR'
  | 'EN_PROCESO'
  | 'EN_REVISION'
  | 'DEVUELTO_AJUSTES'
  | 'CUMPLIDO'
  | 'APROBADO'
  | 'CERRADO';

export type EstadoActividadPlan =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'REQUIERE_REVISION'
  | 'DEVUELTA'
  | 'CUMPLIDA'
  | 'APROBADA'
  | 'VENCIDA';

export type PeriodicidadActividad =
  | 'UNICA'
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export type AreaPlanAnual = 'SST' | 'AMBIENTAL' | 'INTEGRAL';

export type OrigenActividadPlan = 'RIESGO_GTC45' | 'NORMA_OBLIGATORIA' | 'MANUAL';

export type TipoIndicadorPlan = 'ESTRUCTURA' | 'PROCESO' | 'RESULTADO' | 'AMBIENTAL';

export type TipoCalculoIndicador =
  | 'AUTOMATICO_ACTIVIDADES'
  | 'AUTOMATICO_EVIDENCIAS'
  | 'AUTOMATICO_PRESUPUESTO'
  | 'AUTOMATICO_RIESGOS_CRITICOS'
  | 'MANUAL';

export interface ResponsablePlanOption {
  id: string;
  nombre: string;
  cargo: string;
  correo: string;
  area: string;
  esAprobador?: boolean;
}

export interface MetaObjetivoPlan {
  id: string;
  descripcion: string;
  valorMeta: number;
  unidad: string;
  plazo: string;
}

export interface ObjetivoEspecificoPlan {
  id: string;
  codigo: string;
  area: AreaPlanAnual;
  titulo: string;
  descripcion: string;
  responsable: string;
  metas: MetaObjetivoPlan[];
  indicadoresIds: string[];
  riesgosRelacionadosIds?: string[];
  normasRelacionadas?: string[];
  estandaresRelacionadosIds?: number[];
}

export interface MedicionIndicador {
  id: string;
  periodo: string; // ej. "2026-Q1", "2026-10", "Anual"
  fecha: string;
  valor: number;
  observacion?: string;
}

export interface IndicadorGestionPlan {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoIndicadorPlan;
  objetivoEspecificoId: string;
  metaId?: string;
  formula: string;
  metaValor: number;
  metaOperador: '>=' | '<=' | '=';
  metaTexto: string;
  reglaConteo: string;
  unidadMedida: string;
  fuenteInformacion: string;
  responsable: string;
  periodicidad: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  tipoCalculo: TipoCalculoIndicador;
  filtroArea?: AreaPlanAnual | 'TODAS';
  filtroOrigen?: OrigenActividadPlan | 'TODOS';
  resultadoManual?: number;
  observaciones?: string;
  historicoMediciones: MedicionIndicador[];
}

export interface IndicadorCalculado extends IndicadorGestionPlan {
  resultadoActual: number;
  estadoCalculado: 'CUMPLE_META' | 'EN_SEGUIMIENTO' | 'EN_RIESGO';
  detalleCalculo: string;
  totalBase: number;
  totalLogrado: number;
}

export interface EvidenciaActividad {
  id: string;
  nombreArchivo: string;
  tipoSoporte: 'PDF' | 'IMAGEN' | 'ACTA' | 'EXCEL' | 'CERTIFICADO' | 'ENLACE' | 'OTRO';
  descripcionSoporte: string;
  archivoDataUrl?: string;
  urlReferencia?: string;
  fechaCarga: string;
  cargadoPor: string;
  estadoRevision: 'PENDIENTE_REVISION' | 'CUMPLIDA' | 'APROBADA' | 'DEVUELTA';
  revisadoPor?: string;
  fechaRevision?: string;
  comentarioRevisor?: string;
  resultadoRevision?: 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes';
  revisionGerente?: RegistroRevisionGerente;
}

export interface HistorialRevisionActividad {
  id: string;
  fecha: string;
  usuario: string;
  rol: string;
  accion:
    | 'CREADA'
    | 'EVIDENCIA_ADJUNTADA'
    | 'APROBADA_CERRADA'
    | 'DEVUELTA'
    | 'ACTUALIZADA'
    | 'RECURRENCIA_GENERADA';
  detalle: string;
}

export interface RiesgoSnapshotVinculado {
  nivelRiesgo: number;
  interpretacionNR: 'I' | 'II' | 'III' | 'IV';
  peligroDescripcion: string;
  medidasResumen: string;
  cargo: string;
  proceso: string;
}

export type TipoRecursoActividad =
  | 'PENDIENTE_VALORACION'
  | 'RECURSOS_EXISTENTES'
  | 'CON_PRESUPUESTO';

export interface CambioFechaActividad {
  id: string;
  fechaRegistro: string;
  usuario: string;
  fechaInicioAnterior: string;
  fechaLimiteAnterior: string;
  fechaInicioNueva: string;
  fechaLimiteNueva: string;
  mesesAnteriores?: number[];
  mesesNuevos?: number[];
  motivo: string;
}

export interface ActividadPlanAnual {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  criterioAceptacion: string;
  area: AreaPlanAnual;
  origen: OrigenActividadPlan;

  // Trazabilidad automática con Matriz de Riesgos, Normas, Planes de Mejora, Emergencias, Capacitaciones y Formatos
  riesgoId?: string;
  riesgoCodigo?: string;
  riesgoNivelNR?: 'I' | 'II' | 'III' | 'IV';
  riesgoCargo?: string;
  riesgoProceso?: string;
  riesgoMedidasControl?: string;
  riesgoSnapshot?: RiesgoSnapshotVinculado;
  planMejoraRiesgoId?: string;
  esPlanEmergencias?: boolean;
  capacitacionNombre?: string;
  formatoId?: string;
  formatoNombre?: string;

  normaId?: string;
  normaOficial?: string;
  normaArticulos?: string;
  requisitoObligatorioId?: string;
  estandarMinimoNumero?: number;

  objetivoEspecificoId?: string;

  // Frecuencia, fechas y trazabilidad de reprogramación
  esRecurrente: boolean;
  periodicidad: PeriodicidadActividad;
  fechaInicio: string; // YYYY-MM-DD
  fechaLimite: string; // YYYY-MM-DD
  programacionMensual: number[]; // [1..12]
  serieRecurrenteId?: string;
  numeroOcurrencia?: number;
  reprogramadaParaAnio?: number;
  reprogramacionOrigen?: {
    anioOrigen: number;
    codigoOriginal?: string;
    fechaInicioOriginal: string;
    fechaLimiteOriginal: string;
    motivo: string;
    fechaRegistro: string;
  };
  historialCambiosFechas?: CambioFechaActividad[];

  // Responsable y aprobador
  responsableId: string;
  responsableNombre: string;
  responsableCargo: string;
  responsableCorreo?: string;
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorCargo: string;

  // Recursos y presupuesto diferenciado
  recursosNecesarios?: string;
  tipoRecurso?: TipoRecursoActividad;
  confirmacionRecursos?: string;
  presupuestoEstimado: number; // Presupuesto programado (0 si está pendiente de valoración o usa recursos existentes)
  presupuestoAprobado?: number; // Presupuesto aprobado por Gerencia (0 inicial)
  gastoEjecutado: number; // Presupuesto ejecutado ($0 inicial sin ejecución confirmada)

  // Estado y cierre con evidencia
  estado: EstadoActividadPlan;
  evidenciaRequerida: string;
  evidencias: EvidenciaActividad[];
  resultadoActividad?: string;
  fechaCierre?: string;
  cerradoPor?: string;
  observaciones: string;
  revisionGerente?: RegistroRevisionGerente;
  historialRevisiones: HistorialRevisionActividad[];
}

export interface SolicitudRevisionPlan {
  id: string;
  fechaDeteccion: string;
  tipoFuente: 'MATRIZ_RIESGOS' | 'MATRIZ_NORMATIVA' | 'CARACTERIZACION_EMPRESA';
  titulo: string;
  descripcion: string;
  impactoPlan: string;
  entidadId: string;
  accionSugerida: 'AGREGAR_ACTIVIDAD' | 'REVISAR_ACTIVIDAD' | 'ACTUALIZAR_ALCANCE_0312';
  actividadAfectadaId?: string;
  datosPropuestos?: Partial<ActividadPlanAnual>;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fechaDecision?: string;
  decididoPor?: string;
  observacionDecision?: string;
}

export interface RegistroNotificacionPlan {
  id: string;
  fechaHora: string;
  actividadId: string;
  actividadNombre: string;
  destinatarioNombre: string;
  destinatarioCorreo: string;
  tipoAlerta: string;
  canal: 'SISTEMA' | 'CORREO_REAL';
  estadoEnvio: string;
}

export interface HistorialPlanAnual {
  id: string;
  fechaHora: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface EmpresaSnapshotPlan {
  numeroTrabajadores: number;
  claseRiesgoSST: string;
  grupoEstandares0312: '7 Estándares (Capítulo I)' | '21 Estándares (Capítulo II)' | '60 Estándares (Capítulo III)';
  actividadEconomica: string;
  ciiu: string;
}

export interface PlanAnualVigencia {
  id: string;
  vigencia: number; // Año ej. 2025, 2026
  titulo: string;
  objetivoGeneral: string;
  fechaElaboracion: string;
  responsableId: string;
  responsableNombre: string;
  aprobadorNombre: string;
  estadoAprobacion: EstadoAprobacionPlan;
  fechaAprobacion?: string;
  presupuestoGeneralAprobado?: number;
  presupuestoGeneralActualizadoPor?: string;
  fechaPresupuestoGeneral?: string;
  revisionGerente?: RegistroRevisionGerente;
  empresaSnapshot: EmpresaSnapshotPlan;
  objetivosEspecificos: ObjetivoEspecificoPlan[];
  indicadores: IndicadorGestionPlan[];
  actividades: ActividadPlanAnual[];
  solicitudesRevision: SolicitudRevisionPlan[];
  notificacionesEnviadas: RegistroNotificacionPlan[];
  historialCambios: HistorialPlanAnual[];
}

export type TipoAlertaPlan =
  | 'VENCIDA'
  | 'PROXIMA_A_VENCER'
  | 'RECORDATORIO_PREVENTIVO'
  | 'EVIDENCIA_PENDIENTE_REVISION'
  | 'SIN_EVIDENCIA_SOPORTE'
  | 'NO_REALIZADA_EN_PERIODO';

export interface AlertaPlanAnual {
  id: string;
  tipo: TipoAlertaPlan;
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA';
  actividadId: string;
  actividadCodigo: string;
  actividadNombre: string;
  responsableNombre: string;
  responsableCorreo: string;
  aprobadorNombre: string;
  fechaLimite: string;
  diasRestantes: number;
  motivo: string;
  accionRecomendada: string;
}

export interface RequisitoObligatorioIdentificado {
  id: string;
  normaId?: string;
  normaOficial: string;
  articulos: string;
  area: AreaPlanAnual;
  requisitoObligatorio: string;
  actividadPropuesta: string;
  frecuenciaRespaldada: PeriodicidadActividad;
  sustentoFrecuencia: string;
  responsableSugerido: string;
  aprobadorSugerido: string;
  evidenciaNecesaria: string;
  periodoCumplimiento: string;
  mesesSugeridos: number[];
  aplicaEmpresaActual: boolean;
  motivoAplicabilidad: string;
  grupo0312Relacionado?: string;
  yaProgramadaEnPlan: boolean;
  actividadVinculadaId?: string;
}

// ============================================================================
// NUEVOS TIPOS CONECTADOS DEL PLAN ANUAL SG-SST (HACER - VERIFICAR - ACTUAR - PLANEAR)
// ============================================================================

export interface PruebaComplementariaTrabajador {
  estado: 'REALIZADA' | 'PENDIENTE' | 'NO_APLICA';
  fecha?: string;
  resultado?: string;
  observaciones?: string;
}

export interface TrabajadorFichaSST {
  id: string;
  estadoLaboral: 'ACTIVO' | 'INACTIVO';
  // 1. Datos demográficos y laborales
  nombreCompleto: string;
  tipoDocumento: 'CC' | 'CE' | 'TI' | 'PPT';
  numeroDocumento: string;
  fechaNacimiento: string;
  sexo: 'Femenino' | 'Masculino' | 'Otro';
  estadoCivil: 'Soltero(a)' | 'Casado(a)' | 'Unión Libre' | 'Separado(a)' | 'Viudo(a)';
  escolaridad: 'Primaria' | 'Bachiller' | 'Técnico / Tecnólogo' | 'Profesional' | 'Posgrado';
  localidadResidencia: string;
  telefono: string;
  correo: string;
  cargoId: string;
  cargoNombre: string;
  areaProceso: string;
  actividadPrincipal: string;
  tipoContrato: 'Indefinido' | 'Fijo' | 'Obra o Labor' | 'Aprendizaje' | 'Prestación de Servicios';
  fechaIngreso: string;
  turnoHorario: string;
  eps: string;
  arl: string;
  afp: string;

  // 2. Hábitos y estilos de vida (Información de salud confidencial)
  consumoTabaco: 'No fuma' | 'Ocasional' | 'Frecuente' | 'Exfumador' | 'Pendiente';
  consumoAlcohol: 'No consume' | 'Ocasional' | 'Frecuente' | 'Pendiente';
  otrasSustancias: string;
  actividadFisica: 'Sí, regular (3+ días/sem)' | 'Moderada (1-2 días/sem)' | 'Sedentario / No realiza' | 'Pendiente';
  nutricionHabitos: string;

  // 3. Morbilidad sentida y diagnosticada (Confidencial)
  morbilidadSentida: string;
  enfermedadesDiagnosticadas: string;
  tieneEnfermedadLaboralCalificada: boolean;
  fechaUltimaIncapacidad?: string;

  // 4. Evaluaciones médicas y pruebas complementarias (Confidencial)
  tipoUltimoExamen: 'Ingreso' | 'Periódico' | 'Egreso' | 'Post-incapacidad' | 'Pendiente';
  fechaUltimoExamen: string;
  conceptoAptitud: 'Apto sin restricciones' | 'Apto con recomendaciones' | 'Aplazado' | 'Pendiente';
  audiometria: PruebaComplementariaTrabajador;
  visiometria: PruebaComplementariaTrabajador;
  optometria: PruebaComplementariaTrabajador;
  espirometria: PruebaComplementariaTrabajador;
  laboratorio: PruebaComplementariaTrabajador;

  // 5. Recomendaciones y prioridades de intervención (Confidencial)
  recomendacionesSaludOcupacional: string;
  prioridadIntervencion: 'ALTA' | 'MEDIA' | 'BAJA' | 'NINGUNA';
  necesidadIntervencion: string;
  seguimientoMedico: string;

  fechaActualizacion: string;
}

export interface DiagnosticoSaludEmpresa {
  anio: number;
  bateriaPsicosocial: {
    fechaAplicacion: string;
    estado: 'REALIZADA' | 'PROGRAMADA' | 'PENDIENTE';
    nivelRiesgoIntralaboral: 'Sin riesgo / Despreciable' | 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto' | 'Pendiente';
    nivelRiesgoExtralaboral: 'Sin riesgo / Despreciable' | 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto' | 'Pendiente';
    nivelEstres: 'Muy bajo' | 'Bajo' | 'Medio' | 'Alto' | 'Muy alto' | 'Pendiente';
    observacionesGenerales: string;
  };
  analisisFactibilidad: {
    actividadEconomicaCIIU: string;
    gruposPoblacionalesAnalizados: string;
    conclusionesFactibilidad: string;
    fechaActualizacion: string;
  };
}

export type CodigoIndicadorMinimo0312 =
  | 'IND-SST-01' // Frecuencia de accidentalidad
  | 'IND-SST-02' // Severidad de accidentalidad
  | 'IND-SST-03' // Proporción de accidentes de trabajo mortales
  | 'IND-SST-04' // Prevalencia de la enfermedad laboral
  | 'IND-SST-05' // Incidencia de la enfermedad laboral
  | 'IND-SST-06'; // Ausentismo por causa médica

export interface HojaVidaIndicadorSST {
  id: string;
  codigo: string;
  esNormativo0312: boolean;
  codigoNormativo0312?: CodigoIndicadorMinimo0312;
  nombre: string;
  tipo: TipoIndicadorPlan;
  definicion: string;
  formula: string;
  variablesRequeridas: string[];
  metaValor: number;
  metaOperador: '<=' | '>=' | '=';
  metaTexto: string;
  reglaConteo: string;
  unidadMedida: string;
  fuenteInformacion: string;
  periodicidad: 'MENSUAL' | 'ANUAL' | 'TRIMESTRAL' | 'SEMESTRAL';
  responsable: string;
  interpretacionBase: string;
  objetivoEspecificoId?: string;
}

export interface RegistroPeriodoIndicador {
  id: string;
  anio: number;
  mes: number; // 1..12 para mensual; 0 para consolidado anual
  periodoLabel: string; // "Enero 2026", "Consolidado Anual 2026"
  // Variables de captura (null = información pendiente de registro)
  numeroTrabajadores: number | null; // Auto-alimentado de trabajadores activos / empresa
  accidentesTrabajo: number | null;
  accidentesMortales: number | null;
  diasIncapacidadAT: number | null;
  diasCargadosAT: number | null;
  casosNuevosEL: number | null;
  casosAntiguosEL: number | null;
  diasAusenciaIncapacidadMedica: number | null;
  diasTrabajoProgramados: number | null;
  // Valores manuales por indicador personalizado si aplica
  valoresPersonalizados?: Record<string, number | null>;
  validado: boolean;
  validadoPor?: string;
  revisionGerente?: RegistroRevisionGerente;
  fechaActualizacion: string;
  observaciones?: string;
}

export interface ResultadoIndicadorPeriodo {
  periodoLabel: string;
  anio: number;
  mes: number;
  estadoCalculo:
    | 'CALCULADO'
    | 'PENDIENTE_REGISTRO'
    | 'PENDIENTE_VALIDACION'
    | 'NO_DISPONIBLE_DENOMINADOR_CERO';
  valor: number | null;
  interpretacionAutomatica: string;
  estadoSemaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';
  textoSemaforo: string;
  faltantes: string[];
  variablesUsadas: Array<{ etiqueta: string; valor: string; origen: string }>;
  fechaActualizacion: string;
}

export interface EvaluacionEstandarMinimo {
  numero: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  titulo: string;
  descripcionSencilla: string;
  normaReferencia: string;
  informacionNecesaria: string[];
  estadoRevision:
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'PENDIENTE_REVISION'
    | 'EN_REVISION'
    | 'FALTA_SOPORTE'
    | 'DEVUELTO_AJUSTES'
    | 'CUMPLE_VERIFICADO'
    | 'CUMPLIDO'
    | 'APROBADO'
    | 'REQUIERE_MEJORA';
  revisadoPor?: string;
  fechaRevision?: string;
  resultadoRevision?: 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes';
  revisionGerente?: RegistroRevisionGerente;
  observacionesRevision: string;
  aplicaSegunEmpresa: boolean;
  motivoAplicabilidad: string;
}

export interface RecomendacionIntervencion {
  id: string;
  fecha: string;
  origen:
    | 'EVALUACIONES_MEDICAS'
    | 'CONDICIONES_SALUD'
    | 'MATRIZ_RIESGOS'
    | 'INDICADORES'
    | 'VERIFICACION_ACTIVIDADES'
    | 'ESTANDARES_MINIMOS';
  titulo: string;
  descripcion: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  esConfidencialMedica: boolean;
  trabajadorId?: string;
  riesgoId?: string;
  estandarNumero?: number;
  responsable: string;
  estado: 'ABIERTA' | 'CONVERTIDA_EN_ACCION' | 'CERRADA';
  accionMejoraId?: string;
}

export interface HistorialAccionMejora {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface AccionMejoraPlan {
  id: string;
  codigo: string;
  tipo: 'CORRECTIVA' | 'PREVENTIVA' | 'MEJORA';
  origen:
    | 'MATRIZ_RIESGOS'
    | 'INDICADORES'
    | 'ESTANDARES_MINIMOS'
    | 'CONDICIONES_SALUD'
    | 'ACTIVIDAD_PLAN'
    | 'MANUAL';
  situacionEncontrada: string;
  queSeNecesitaCorregir: string;
  actividadARealizar: string;
  responsable: string;
  fechaInicio: string;
  fechaLimite: string;
  evidenciaNecesaria: string;
  evidenciasAdjuntas: EvidenciaActividad[];
  estado:
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'PENDIENTE_REVISION'
    | 'CUMPLIDA'
    | 'APROBADA'
    | 'ATRASADA'
    | 'DEVUELTA_CORRECCION';
  resultadoSeguimiento: string;
  revisionGerente?: RegistroRevisionGerente;
  // Conexiones sin duplicación
  riesgoId?: string;
  actividadPlanId?: string;
  estandarNumero?: number;
  recomendacionId?: string;
  historial: HistorialAccionMejora[];
}

export interface RegistroAuditoriaPlanAnual {
  id: string;
  fechaHora: string;
  usuario: string;
  modulo: 'HACER' | 'VERIFICAR' | 'ACTUAR' | 'PLANEAR' | 'SEGURIDAD_MEDICA';
  accion: string;
  detalle: string;
}

export interface PlanAnualSgsstData {
  trabajadores: TrabajadorFichaSST[];
  diagnosticosSalud: Record<number, DiagnosticoSaludEmpresa>;
  hojasVidaIndicadores: HojaVidaIndicadorSST[];
  registrosPeriodosIndicadores: RegistroPeriodoIndicador[];
  estandaresMinimos: Record<number, EvaluacionEstandarMinimo[]>;
  recomendaciones: RecomendacionIntervencion[];
  accionesMejora: AccionMejoraPlan[];
  auditoriaCambios: RegistroAuditoriaPlanAnual[];
}

