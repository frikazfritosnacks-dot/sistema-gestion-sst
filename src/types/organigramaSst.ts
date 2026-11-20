export type NivelJerarquicoSST = 'ALTA_DIRECCION' | 'RESPONSABLE_SST' | 'NIVEL_OPERATIVO';

export interface CargoSST {
  id: string;
  nombre: string;
  nivelJerarquico: NivelJerarquicoSST;
  nivelNombre: string;
  areaProceso: string;
  icono: string;
  colorTheme: {
    badgeBg: string;
    badgeText: string;
    border: string;
    accent: string;
    gradient: string;
    cardBg: string;
  };
  descripcionPuesto: string;
  responsabilidades: string[];
  compromisos: string[];
  ordenNivel: number;
}

export interface CompromisoPolitica {
  id: number;
  titulo: string;
  descripcion: string;
}

export type EstadoPoliticaSST =
  | 'Por hacer'
  | 'En proceso'
  | 'Pendiente de revisión'
  | 'Devuelto para ajustes'
  | 'Cumplido'
  | 'Aprobado'
  | 'Pendiente de aprobación'
  | 'Vigente';

export interface RegistroHistorialPolitica {
  id: string;
  fecha: string;
  hora: string;
  version: string;
  autor: string;
  motivoCambio: string;
  estado: EstadoPoliticaSST;
  detallesModificacion: string;
}

export interface PoliticaSSTData {
  id: string;
  empresa: string;
  nit: string;
  direccion: string;
  actividadPrincipal: string;
  titulo: string;
  declaracionIntroductoria: string;
  compromisos: CompromisoPolitica[];
  comunicacionRevision: string;
  nombreFirmante: string;
  cargoFirmante: string;
  estado: EstadoPoliticaSST;
  fechaUltimaActualizacion: string;
  fechaAprobacion?: string;
  fechaRevision?: string;
  revisadoPor?: string;
  resultadoRevision?: 'Aprobado' | 'Cumplido' | 'Devuelto para ajustes';
  observacionesRevision?: string;
  versionActual: string;
  historialCambios: RegistroHistorialPolitica[];
}
