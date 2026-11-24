import type { EstadoEstandarFrikaz, RegistroRevisionGerente } from '../services/gerenteControlService';
import type { EvidenciaActividad, RiesgoSnapshotVinculado } from './planAnual';

// ============================================================================
// TIPOS PARA «PLANES DE MEJORA POR RIESGO» Y «PLAN DE EMERGENCIAS» — FRIKAZ S.A.S.
// ============================================================================

export type EstadoValidacionReal = 'CONFIRMADO' | 'PENDIENTE_VALIDACION';

export interface CajaCalidadEditable {
  empresa: string;
  nombreDocumento: string;
  codigo: string;
  version: string;
  fechaElaboracionActualizacion: string;
  elaboro: string;
  reviso: string;
  aprobo: string;
}

export interface PreguntaEvaluacionSencilla {
  id?: string;
  pregunta: string;
  respuestaEsperada: string;
}

export interface RegistroAsistenciaItem {
  id: string;
  nombreTrabajador: string;
  cargo: string;
  fecha: string;
  asistio: boolean;
  firmaOConfirmacion: string;
}

export interface MaterialCapacitacionPlan {
  requiereCapacitacion: boolean;
  motivoNoRequiere?: string;
  nombre: string;
  objetivo: string;
  duracionSugerida: string;
  temasPrincipales: string[];
  desarrolloSencillo: string[];
  recomendacionesPracticas: string[];
  actividadComprension: string;
  evaluacionSencilla: PreguntaEvaluacionSencilla[];
  observaciones: string;
  asistenciaRegistrada: RegistroAsistenciaItem[];
}

export interface CampoEncabezadoFormato {
  id: string;
  etiqueta: string;
  valor: string;
}

export interface ItemVerificacionFormato {
  id: string;
  criterio: string;
  cumplimiento: '' | 'SI' | 'NO' | 'NA';
  observacion: string;
}

export interface TablaRegistroFormato {
  titulo: string;
  columnas: string[];
  filas: string[][];
}

export interface FormatoEditableDocumento {
  id: string;
  titulo: string;
  categoria: 'PLAN_MEJORA_RIESGO' | 'PLAN_EMERGENCIAS';
  riesgoClave?: string;
  cajaCalidad: CajaCalidadEditable;
  instruccionesUso: string;
  camposEncabezado: CampoEncabezadoFormato[];
  itemsVerificacion: ItemVerificacionFormato[];
  tablaRegistro?: TablaRegistroFormato;
  observacionesGenerales: string;
  fechaUltimoGuardado?: string;
}

export interface HistorialPlanMejoraItem {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export interface PlanMejoraPorRiesgo {
  id: string;
  orden: number;
  claveReferencia: string;
  nombreRiesgo: string;
  riesgoId: string;
  riesgoCodigo: string;
  nivelRiesgoMatriz: 'I' | 'II' | 'III' | 'IV';
  puntajeMatriz: number;
  procesoMatriz: string;
  cargoMatriz: string;
  actividadMatriz: string;
  riesgoSnapshot: RiesgoSnapshotVinculado;
  estadoValidacionReal: EstadoValidacionReal;
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
  evidenciasAdjuntas: EvidenciaActividad[];
  resultadoEsperado: string;
  estado: EstadoEstandarFrikaz;
  observacionesGerencia: string;
  revisionGerente?: RegistroRevisionGerente;
  historialCambios: HistorialPlanMejoraItem[];
}

export interface EscenarioEmergenciaFrikaz {
  id: string;
  nombre: string;
  origen: 'TECNOLOGICO_OPERATIVO' | 'NATURAL' | 'SOCIAL';
  estadoValidacion: EstadoValidacionReal;
  sustentoEnFrikaz: string;
  nivelPrioridad: 'ALTA' | 'MEDIA' | 'POR_VALIDAR';
  queHacer: string[];
  queNoHacer: string[];
  comoInformar: string;
  aQuienAvisar: string;
  cuandoEvacuar: string;
  comoProtegerse: string;
  comoSolicitarAyudaExterna: string;
}

export interface RecursoEmergenciaItem {
  id: string;
  recurso: string;
  categoria: 'Contra incendios' | 'Primeros auxilios' | 'Evacuación y alarma' | 'Control de fugas o derrames';
  estadoVerificacion:
    | 'Pendiente por verificar en planta'
    | 'Confirmado disponible'
    | 'Faltante / Por conseguir'
    | 'No aplica';
  cantidadUbicacion: string;
  observaciones: string;
}

export interface RolOrganizacionEmergencias {
  id: string;
  rol: string;
  funcionSencilla: string;
  responsablePrincipal: string;
  suplente: string;
}

export interface ActividadCapacitacionSimulacro {
  id: string;
  tipo: 'CAPACITACION' | 'SIMULACRO';
  titulo: string;
  descripcionSencilla: string;
  objetivo: string;
  fechaProgramada: string;
  responsable: string;
  participantesEsperados: string;
  estado: EstadoEstandarFrikaz;
  materialCapacitacion?: MaterialCapacitacionPlan;
  observaciones: string;
  evidencias: EvidenciaActividad[];
  revisionGerente?: RegistroRevisionGerente;
}

export interface PlanEmergenciasFrikaz {
  cajaCalidad: CajaCalidadEditable;
  // 1. Identificación de la empresa
  identificacionEmpresa: {
    razonSocial: string;
    nit: string;
    actividadEconomica: string;
    numeroTrabajadores: string;
    procesosPrincipales: string;
    direccionVerificada: string;
    telefonoEmergenciasInterno: string;
    horarioOperacion: string;
  };
  // 2. Objetivo general
  objetivoGeneral: string;
  // 3. Objetivos específicos
  objetivosEspecificos: string[];
  // 4. Alcance
  alcance: string;
  // 5. Descripción general de actividades
  descripcionActividadesFrikaz: string;
  // 6. Identificación de amenazas
  identificacionAmenazasResumen: string;
  // 7. Análisis de vulnerabilidad
  analisisVulnerabilidad: {
    enPersonas: string;
    enRecursosYEquipos: string;
    enProcesosEInstalaciones: string;
    nivelVulnerabilidadActual: string;
  };
  // 8. Evaluación y priorización de riesgos de emergencia
  evaluacionPriorizacion: string;
  // 9. Recursos disponibles
  recursosDisponibles: RecursoEmergenciaItem[];
  // 10. Organización y responsabilidades (10 trabajadores)
  organizacionEmergencias: RolOrganizacionEmergencias[];
  // 11. Procedimiento general ante emergencias
  procedimientoGeneral: string[];
  // 12. Procedimientos específicos por tipo de emergencia
  escenarios: EscenarioEmergenciaFrikaz[];
  // 13. Rutas y salidas de evacuación
  rutasSalidasEvacuacion: {
    rutaPrincipal: string;
    salidasEmergencia: string;
    senalizacionEIluminacion: string;
    observaciones: string;
  };
  // 14. Punto de encuentro
  puntoEncuentro: {
    ubicacionDefinida: string;
    criterioSeguridad: string;
    verificacionConteo: string;
  };
  // 15. Comunicación y solicitud de ayuda externa
  comunicacionAyudaExterna: {
    mecanismoAlarmaInterna: string;
    directorioExterno: Array<{
      id: string;
      entidad: string;
      telefono: string;
      cuandoLlamar: string;
    }>;
  };
  // 16 & 17. Capacitación en emergencias y Simulacros
  programaCapacitacionSimulacros: ActividadCapacitacionSimulacro[];
  // 18. Inspección de equipos de emergencia
  inspeccionEquiposPrograma: {
    frecuenciaSugerida: string;
    responsable: string;
    criteriosRevision: string;
    proximaInspeccion: string;
  };
  // 19. Registros y evidencias
  evidenciasPlan: EvidenciaActividad[];
  // 20. Seguimiento, revisión y actualización
  seguimientoActualizacion: {
    estado: EstadoEstandarFrikaz;
    frecuenciaRevision: string;
    ultimaRevision: string;
    observacionesGerencia: string;
    revisionGerente?: RegistroRevisionGerente;
  };
  formatosEmergenciaIds: string[];
}

export interface PlanesMejoraYEmergenciasStore {
  versionEsquema: number;
  ultimaActualizacion: string;
  planesPorRiesgo: PlanMejoraPorRiesgo[];
  planEmergencias: PlanEmergenciasFrikaz;
  formatos: Record<string, FormatoEditableDocumento>;
}
