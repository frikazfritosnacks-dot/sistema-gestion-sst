export type RepresentacionCopasst = 'Empleador' | 'Trabajadores';
export type TipoParticipacionCopasst = 'Principal' | 'Suplente';

export interface CandidatoCopasst {
  id: string;
  trabajadorId: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  cargo: string; // Estrictamente uno de los 6 cargos oficiales
  correo?: string;
  propuestaResumen?: string;
  fechaPostulacion: string;
}

export interface VotoCopasst {
  id: string;
  candidatoId: string;
  fechaHora: string;
  // No almacena trabajadorId para proteger secreto del voto
}

export interface MiembroCopasst {
  id: string;
  trabajadorId?: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  cargo: string; // Estrictamente uno de los 6 cargos oficiales
  correo: string;
  representacion: RepresentacionCopasst;
  tipoParticipacion: TipoParticipacionCopasst;
  fechaEleccionODesignacion: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  estado: 'Activo' | 'Inactivo';
  origenRegistro: 'Elección trabajadores' | 'Designación empleador' | 'Registro manual';
  periodoEtiqueta?: string;
}

export interface FuncionCopasst {
  id: string;
  orden: number;
  titulo: string;
  descripcion: string;
  responsableAsignado?: string;
  estadoSeguimiento: 'Pendiente' | 'En desarrollo' | 'Realizada';
  actividadesRealizadas: Array<{
    id: string;
    fecha: string;
    descripcion: string;
    registradoPor: string;
    soporteNombre?: string;
  }>;
}

export interface SimulacionCopasstRol {
  trabajadorId: string;
  nombreCompleto: string;
  cargo: string;
  correo?: string;
  documento?: string;
}

export interface SimulacionCopasstOrganigrama {
  empleadorPrincipal?: SimulacionCopasstRol | null;
  empleadorSuplente?: SimulacionCopasstRol | null;
  trabajadoresPrincipal?: SimulacionCopasstRol | null;
  trabajadoresSuplente?: SimulacionCopasstRol | null;
  fechaActualizacion: string;
  observaciones?: string;
}

export type TipoNotificacionCopasst =
  | 'Convocatoria a elecciones'
  | 'Apertura del proceso de votación'
  | 'Fecha y horario de votación'
  | 'Recordatorio de votación'
  | 'Resultados de elección'
  | 'Designación de representantes del empleador'
  | 'Conformación oficial del comité'
  | 'Convocatorias a reuniones'
  | 'Recordatorios de actividades'
  | 'Comunicación de funciones y responsabilidades';

export interface NotificacionCopasstHistorial {
  id: string;
  fecha: string;
  tipo: TipoNotificacionCopasst;
  destinatarios: string[];
  asunto: string;
  cuerpoPreview: string;
  canal: string;
  estadoEnvio: 'Enviado' | 'Error';
  detalleError?: string;
  trackingCode?: string;
}

export type TipoDocumentoCopasstRepo =
  | 'Convocatoria'
  | 'Listado de candidatos'
  | 'Registro de votación'
  | 'Acta de elección'
  | 'Acta de conformación'
  | 'Designación del empleador'
  | 'Registro de integrantes'
  | 'Acta de reunión'
  | 'Evidencia de actividad'
  | 'Capacitación del comité'
  | 'Comunicaciones enviadas';

export interface DocumentoCopasstRepo {
  id: string;
  codigoRegistro: string;
  tipo: TipoDocumentoCopasstRepo;
  titulo: string;
  nombreArchivo: string;
  archivoDataUrl?: string;
  fechaDocumento: string;
  fechaCarga: string;
  responsable: string;
  relacionadoCon?: string;
  observaciones?: string;
}

export interface HistorialCopasstItem {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface CopasstStore {
  conformacionConfig: {
    rangoTrabajadoresAplicado: string;
    cuposEmpleadorPrincipal: number;
    cuposEmpleadorSuplente: number;
    cuposTrabajadoresPrincipal: number;
    cuposTrabajadoresSuplente: number;
    notaNormativa: string;
    estadoVerificacionLegal: 'Pendiente de verificación normativa' | 'Confirmado por Gerencia';
    estadoComite: 'Pendiente' | 'En proceso' | 'Conformado' | 'Finalizado';
    fechaConvocatoria?: string;
    fechaEleccion?: string;
    fechaDesignacionEmpleador?: string;
    fechaConformacionOficial?: string;
    fechaInicioPeriodo?: string;
    fechaFinPeriodo?: string;
  };
  procesoEleccion: {
    fechaConvocatoria: string;
    fechaVotacion: string;
    horarioVotacion: string;
    estadoVotacion: 'Por iniciar' | 'Abierta' | 'Cerrada';
    candidatos: CandidatoCopasst[];
    votantesRegistradosIds: string[]; // Evita doble voto sin exponer a quién votó
    votos: VotoCopasst[];
    registroExterno?: {
      habilitado: boolean;
      medioUtilizado: string;
      totalParticipantes?: number;
      principalElegidoId?: string;
      suplenteElegidoId?: string;
      soporteNombre?: string;
      soporteDataUrl?: string;
      observaciones?: string;
    };
    designadosEmpleadorBorrador: {
      principalId?: string;
      suplenteId?: string;
    };
    confirmacionOficialRealizada: boolean;
    fechaConfirmacionOficial?: string;
  };
  miembros: MiembroCopasst[];
  funciones: FuncionCopasst[];
  simulacionOrganigrama: SimulacionCopasstOrganigrama;
  notificacionesEnviadas: NotificacionCopasstHistorial[];
  repositorioDocumentos: DocumentoCopasstRepo[];
  historialCambios: HistorialCopasstItem[];
}
