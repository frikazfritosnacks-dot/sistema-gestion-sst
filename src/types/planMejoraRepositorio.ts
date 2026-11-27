export type TipoDocumentoRepositorioMejora =
  | 'Asistencia'
  | 'Documento trabajador'
  | 'Evidencia'
  | 'Capacitación'
  | 'Evaluación'
  | 'Certificado'
  | 'Otro soporte';

export interface HistorialCertificadoCambio {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface CertificadoParticipacionMejora {
  id: string;
  codigoCertificado: string;
  planId: string;
  nombrePlan: string;
  riesgoCodigo: string;
  nombreRiesgo: string;
  actividadId?: string;
  capacitacionKey?: string;
  origenModulo?: 'PLAN_ANUAL' | 'PLAN_MEJORA_RIESGO' | 'PLAN_EMERGENCIAS' | 'OTRO';
  nombreActividad: string;
  trabajadorId?: string;
  trabajadorNombre: string;
  numeroIdentificacion?: string;
  cargo: string;
  fechaRealizacion: string;
  intensidadHoraria: string; // Vacío si no está registrada
  temaDesarrollado: string;
  certificadorNombre: string; // Vacío si no está registrado
  certificadorCargo: string; // Vacío si no está registrado
  observaciones?: string;
  fechaEmision: string;
  fechaUltimaActualizacion?: string;
  emitidoPor: string;
  asistenciaHash: string;
  estadoValidez: 'VIGENTE' | 'REQUIERE_REVISION_ASISTENCIA';
  motivoAlertaValidez?: string;
  documentoRepoId?: string;
  historialCambios?: HistorialCertificadoCambio[];
}

export interface CapacitacionCertificadoContext {
  capacitacionKey: string;
  origenModulo: 'PLAN_ANUAL' | 'PLAN_MEJORA_RIESGO' | 'PLAN_EMERGENCIAS' | 'OTRO';
  planId: string;
  nombrePlan: string;
  riesgoCodigo: string;
  nombreRiesgo: string;
  actividadId?: string;
  nombreCapacitacion: string;
  fechaRealizacion?: string;
  duracionHoras?: string;
  responsableNombre?: string;
  responsableCargo?: string;
  observaciones?: string;
  asistenciaRegistrada?: Array<{
    nombreTrabajador: string;
    cargo: string;
    fecha: string;
    asistio: boolean;
    firmaOConfirmacion?: string;
  }>;
  certificadoEditar?: CertificadoParticipacionMejora;
}

export interface DocumentoRepositorioMejora {
  id: string;
  numeroRegistro: string;
  trabajadorId?: string;
  trabajadorNombre: string;
  cargo: string;
  planId: string;
  nombrePlan: string;
  riesgoCodigo: string;
  nombreRiesgo: string;
  actividadNombre: string;
  tipoDocumento: TipoDocumentoRepositorioMejora;
  nombreArchivo: string;
  archivoDataUrl?: string;
  fechaActividad: string;
  fechaRegistro: string;
  estadoDocumento: 'Registrado' | 'Pendiente de revisión' | 'Aprobado' | 'Requiere revisión';
  responsableRegistro: string;
  observaciones: string;
  certificadoId?: string;
  esAutomatico?: boolean;
}

export interface HistorialRepositorioMejora {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface PlanMejoraRepositorioStore {
  certificados: CertificadoParticipacionMejora[];
  documentos: DocumentoRepositorioMejora[];
  historial: HistorialRepositorioMejora[];
}
