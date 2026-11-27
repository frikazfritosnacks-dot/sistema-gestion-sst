export type InstrumentoPsicosocialTipo =
  | 'Forma A'
  | 'Forma B'
  | 'Factores intralaborales'
  | 'Factores extralaborales'
  | 'Estrés'
  | 'Otros';

export type EstadoEvaluacionPsicosocial =
  | 'Pendiente'
  | 'Programada'
  | 'En aplicación'
  | 'Aplicada'
  | 'Evaluada con soporte'
  | 'Pendiente de verificación';

export type NivelRiesgoPsicosocialOficial =
  | 'Sin riesgo o riesgo despreciable'
  | 'Riesgo bajo'
  | 'Riesgo medio'
  | 'Riesgo alto'
  | 'Riesgo muy alto'
  | 'Pendiente de calificación';

export type TipoSoportePsicosocial =
  | 'Consentimiento informado'
  | 'Instrumento oficial autorizado'
  | 'Informe calificado por profesional SST'
  | 'Soporte de aplicación'
  | 'Otro soporte';

export interface DocumentoPsicosocialAdjunto {
  id: string;
  nombreArchivo: string;
  tipoSoporte: TipoSoportePsicosocial;
  instrumento?: InstrumentoPsicosocialTipo;
  archivoDataUrl?: string;
  fechaCarga: string;
  cargadoPor: string;
  observaciones?: string;
}

export interface RegistroTrabajadorPsicosocial {
  id: string;
  codigoInterno: string; // Ej. PSI-001 (para consolidado sin exponer nombres)
  trabajadorId: string; // Enlace estricto al trabajador oficial en HACER (sin duplicar)
  areaProcesoOverride?: string;
  fechaAplicacion: string;
  instrumentosAplicados: InstrumentoPsicosocialTipo[];
  otroInstrumentoTexto?: string;
  profesionalNombre: string;
  profesionalLicenciaSST: string;
  estadoEvaluacion: EstadoEvaluacionPsicosocial;
  observacionesAdministrativas: string;
  documentos: DocumentoPsicosocialAdjunto[];
  resultadoOficialProfesional?: {
    intralaboral?: NivelRiesgoPsicosocialOficial;
    extralaboral?: NivelRiesgoPsicosocialOficial;
    estres?: NivelRiesgoPsicosocialOficial;
    fechaConsolidacion?: string;
    observacionesProfesional?: string;
  };
  fechaActualizacion: string;
}

export interface AuditoriaAccesoPsicosocial {
  id: string;
  fechaHora: string;
  usuario: string;
  accion: 'CONSULTA' | 'MODIFICACION' | 'CARGA_DOCUMENTO' | 'DESCARGA';
  detalle: string;
}

export interface RiesgoPsicosocialStore {
  registros: RegistroTrabajadorPsicosocial[];
  auditoria: AuditoriaAccesoPsicosocial[];
}
