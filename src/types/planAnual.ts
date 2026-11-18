// ============================================================================
// TIPOS DEL MÓDULO INTEGRADO «PLAN ANUAL» (DENTRO DE PLANEAR) — FRIKAZ S.A.S.
// ============================================================================

export type EstadoAprobacionPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'CERRADO';

export type EstadoActividadPlan =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'REQUIERE_REVISION'
  | 'CUMPLIDA'
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
  estadoRevision: 'PENDIENTE_REVISION' | 'APROBADA' | 'DEVUELTA';
  revisadoPor?: string;
  fechaRevision?: string;
  comentarioRevisor?: string;
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

export interface ActividadPlanAnual {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  criterioAceptacion: string;
  area: AreaPlanAnual;
  origen: OrigenActividadPlan;

  // Trazabilidad automática
  riesgoId?: string;
  riesgoCodigo?: string;
  riesgoNivelNR?: 'I' | 'II' | 'III' | 'IV';
  riesgoCargo?: string;
  riesgoProceso?: string;
  riesgoMedidasControl?: string;
  riesgoSnapshot?: RiesgoSnapshotVinculado;

  normaId?: string;
  normaOficial?: string;
  normaArticulos?: string;
  requisitoObligatorioId?: string;

  objetivoEspecificoId?: string;

  // Frecuencia y fechas
  esRecurrente: boolean;
  periodicidad: PeriodicidadActividad;
  fechaInicio: string; // YYYY-MM-DD
  fechaLimite: string; // YYYY-MM-DD
  programacionMensual: number[]; // [1..12]
  serieRecurrenteId?: string;
  numeroOcurrencia?: number;

  // Responsable y aprobador
  responsableId: string;
  responsableNombre: string;
  responsableCargo: string;
  responsableCorreo?: string;
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorCargo: string;

  // Presupuesto
  presupuestoEstimado: number;
  gastoEjecutado: number;

  // Estado y cierre con evidencia
  estado: EstadoActividadPlan;
  evidenciaRequerida: string;
  evidencias: EvidenciaActividad[];
  resultadoActividad?: string;
  fechaCierre?: string;
  cerradoPor?: string;
  observaciones: string;
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
