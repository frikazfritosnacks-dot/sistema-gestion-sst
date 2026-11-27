// Types for GTC 45 Risk Identification, Evaluation and Assessment Matrix
// (Matriz de Identificación de Peligros, Evaluación y Valoración de Riesgos GTC 45)
import type {
  EstadoEstandarFrikaz,
  RegistroRevisionGerente,
} from '../services/gerenteControlService';

export type TipoClasificacionPeligro =
  | 'Físico'
  | 'Químico'
  | 'Biológico'
  | 'Biomecánico'
  | 'Psicosocial'
  | 'Condiciones de Seguridad'
  | 'Fenómenos Naturales';

export type InterpretacionNP = 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';

export type InterpretacionNR = 'I' | 'II' | 'III' | 'IV';

export type AceptabilidadRiesgo =
  | 'I - No Aceptable'
  | 'II - No Aceptable o Aceptable con control específico'
  | 'III - Mejorable'
  | 'IV - Aceptable';

export interface CriterioTecnicoNC {
  nc: 10 | 25 | 60 | 100;
  clasificacion: 'Leve' | 'Grave' | 'Muy Grave' | 'Mortal o Catastrófico';
  colorBadge: string;
  bgLight: string;
  borderColor: string;
  definicionTecnica: string;
  criterioIncapacidad: string;
  ejemplosOperativos: string;
}

export const TABLA_TECNICA_NC: Record<number, CriterioTecnicoNC> = {
  10: {
    nc: 10,
    clasificacion: 'Leve',
    colorBadge: 'bg-emerald-500 text-white',
    bgLight: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
    borderColor: 'border-emerald-500',
    definicionTecnica:
      'Golpes suaves, rasguños o molestias pasajeras que se atienden con primeros auxilios y no dejan secuelas ni daños permanentes.',
    criterioIncapacidad: 'Sin incapacidad o descanso médico corto de 1 a 3 días.',
    ejemplosOperativos:
      'Raspones, cortaduras pequeñas, morados leves, cansancio visual, dolor de cabeza suave o ardor pasajero en ojos o piel por vapor o polvo.',
  },
  25: {
    nc: 25,
    clasificacion: 'Grave',
    colorBadge: 'bg-amber-500 text-slate-950 font-bold',
    bgLight: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
    borderColor: 'border-amber-500',
    definicionTecnica:
      'Lesiones que necesitan atención médica e incapacidad de varios días, pero la persona se recupera por completo sin quedar con secuelas permanentes.',
    criterioIncapacidad: 'Incapacidad médica temporal de 4 a 30 días.',
    ejemplosOperativos:
      'Torceduras o esguinces, quemaduras de 1.° o 2.° grado en una zona pequeña por aceite o vapor caliente, fisuras o fracturas simples de un dedo, o heridas que requieren puntos.',
  },
  60: {
    nc: 60,
    clasificacion: 'Muy Grave',
    colorBadge: 'bg-orange-600 text-white font-bold',
    bgLight: 'bg-orange-950/40 border-orange-500/30 text-orange-200',
    borderColor: 'border-orange-500',
    definicionTecnica:
      'Lesiones serias que requieren hospitalización larga o dejan una secuela permanente que afecta parte de la salud o el movimiento del trabajador.',
    criterioIncapacidad:
      'Incapacidad larga (más de 30 días) o pérdida parcial permanente de la capacidad para trabajar (menor al 50%).',
    ejemplosOperativos:
      'Fracturas de brazos, piernas o columna, pérdida (amputación) de dedos, pérdida parcial de audición por ruido fuerte (hipoacusia), pérdida de visión en un ojo o quemaduras extensas de 3.° grado.',
  },
  100: {
    nc: 100,
    clasificacion: 'Mortal o Catastrófico',
    colorBadge: 'bg-rose-600 text-white font-black',
    bgLight: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
    borderColor: 'border-rose-500',
    definicionTecnica:
      'Accidentes muy graves que pueden causar la muerte o lesiones irreversibles que impiden volver a trabajar, afectando a una o varias personas al mismo tiempo.',
    criterioIncapacidad:
      'Incapacidad permanente total (pérdida de capacidad laboral igual o mayor al 50%) o fallecimiento.',
    ejemplosOperativos:
      'Muerte o golpes múltiples graves por caída de altura, descarga eléctrica fatal, atrapamiento del cuerpo en una máquina sin guarda, explosión por fuga de gas o derrumbe por sismo fuerte.',
  },
};

export interface RiesgoGTC45Item {
  id: string;
  codigo?: string;

  // 1. Identificación de la actividad
  proceso: string;
  zonaLugar: string;
  actividades: string;
  tareas: string;
  cargo?: string;
  cargosExpuestos?: string;
  rutinario: 'SÍ' | 'NO';

  // 2. Identificación del peligro
  peligroDescripcion: string;
  peligroClasificacion: TipoClasificacionPeligro;
  efectosPosibles: string;

  // 3. Controles existentes
  controlesFuente: string;
  controlesMedio: string;
  controlesIndividuo: string;

  // 4. Evaluación del riesgo (GTC 45)
  nivelDeficiencia: 0 | 2 | 6 | 10 | number;
  nivelExposicion: 1 | 2 | 3 | 4 | number;
  nivelProbabilidad: number; // ND * NE
  interpretacionNP: InterpretacionNP;
  nivelConsecuencia: 10 | 25 | 60 | 100 | number;
  nivelRiesgo: number; // NP * NC
  interpretacionNR: InterpretacionNR;
  aceptabilidadRiesgo: AceptabilidadRiesgo;

  // 5. Criterios para establecer controles
  numeroExpuestos: number;
  peorConsecuencia: string;
  existenciaRequisitoLegal: 'SÍ' | 'NO';
  requisitoLegalEspecifico?: string;

  // 6. Medidas de intervención
  medidaEliminacion: string;
  medidaSustitucion: string;
  medidaControlesIngenieria: string;
  medidaControlesAdministrativos: string;
  medidaEquiposEPP: string;
  eppItems?: EppItemRiesgo[];

  // Metadata opcional
  observaciones?: string;
  fechaEvaluacion?: string;
  estadoControl?: EstadoEstandarFrikaz;
  revisionGerente?: RegistroRevisionGerente;
}

export type EstadoEntregaEppRiesgo =
  | 'Pendiente de registro'
  | 'Pendiente de entrega'
  | 'Entregado parcialmente'
  | 'Entregado'
  | 'No aplica';

export interface EvidenciaEppRiesgo {
  id: string;
  nombreArchivo: string;
  descripcion?: string;
  fechaCarga: string;
  archivoDataUrl?: string;
}

export interface EppItemRiesgo {
  id: string;
  aplicaEpp: boolean;
  nombreEpp: string;
  justificacionUso: string;
  cargosEspecificos: string[];
  estadoEntrega: EstadoEntregaEppRiesgo;
  fechaEntrega?: string;
  responsableEntrega: string;
  evidencias: EvidenciaEppRiesgo[];
  observaciones?: string;
}
