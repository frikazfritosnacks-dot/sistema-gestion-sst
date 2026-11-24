export type MainTabView =
  | 'phva_slides'
  | 'plan_anual'
  | 'matriz_tabla'
  | 'matriz_excel'
  | 'ficha_empresa'
  | 'matriz_riesgos';

export type SeccionPlanAnualNav =
  | 'resumen'
  | 'objetivos'
  | 'actividades'
  | 'evidencias'
  | 'indicadores'
  | 'presupuesto'
  | 'conexiones'
  | 'planes_riesgo'
  | 'plan_emergencias';

export type EmpresaSubcategoriaNav =
  | 'organigrama'
  | 'politicas'
  | 'partes_interesadas'
  | 'documentos_firmados'
  | 'caracterizacion';

export type SpecialAppAction =
  | 'open_passport'
  | 'open_mission'
  | 'open_gerente_login'
  | 'open_admin_sst'
  | 'open_worker_selector';

export interface AssistantNavigationTarget {
  nonce?: number;
  etiquetaDestino?: string;
  tab: MainTabView;
  planSeccion?: SeccionPlanAnualNav;
  subActividades?: 'cronograma' | 'avances' | 'responsables';
  subIndicadores?: 'tablero' | 'captura' | 'riesgos' | 'estandares';
  subPresupuesto?: 'recursos' | 'reportes';
  subConexiones?: 'riesgosNormas' | 'personal' | 'puestos' | 'mejoras';
  subEmergencias?:
    | 'documento'
    | 'amenazas'
    | 'recursos_org'
    | 'capacitaciones'
    | 'formatos_cierre';
  phvaFase?: 'PLANEAR' | 'HACER' | 'VERIFICAR' | 'ACTUAR';
  phvaAreaFilter?: 'TODAS' | 'SST' | 'AMBIENTAL';
  empresaSubcategoria?: EmpresaSubcategoriaNav;
  excelSheet?: 'inicio' | 'phva_unificada' | 'gestion_sst' | 'gestion_ambiental' | 'plan_accion';
  riskViewMode?: 'ficha' | 'por_cargos' | 'tabla';
  cronogramaEstadoFiltro?: string;
  searchQuery?: string;
  riskId?: string;
  actividadId?: string;
  actividadModalTab?: 'datos' | 'evidencias' | 'historial';
  planMejoraId?: string;
  escenarioEmergenciaId?: string;
  formatoId?: string;
  normaId?: string;
  specialAction?: SpecialAppAction;
  requireGerente?: boolean;
}
