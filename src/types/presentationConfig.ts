import { FasePhva } from './phvaEvidence';

export interface ModuloPresentacion {
  subtema: string;
  titulo: string;
  desc: string;
}

export interface FasePresentacionConfig {
  tituloFase: string;
  subtituloFase: string;
  modulos: ModuloPresentacion[];
}

export interface ConfiguracionPresentacion {
  appHeader: {
    empresa: string;
    subtitulo: string;
    badge: string;
  };
  banner: {
    etiqueta: string;
    subetiqueta: string;
    empresaInfo: string;
    titulo: string;
    descripcion: string;
  };
  fases: Record<FasePhva, FasePresentacionConfig>;
  guiaDocente: {
    titulo: string;
    descripcion: string;
  };
  matrizTabla: {
    titulo: string;
    descripcion: string;
  };
}

export const CONFIG_PRESENTACION_DEFAULT: ConfiguracionPresentacion = {
  appHeader: {
    empresa: 'FRIKAZ S.A.S.',
    subtitulo: 'Guía Práctica de Seguridad y Cuidado Ambiental (PHVA)',
    badge: 'Bosa · 10 Trab.',
  },
  banner: {
    etiqueta: 'CICLO PHVA DE CUIDADO',
    subetiqueta: 'LENGUAJE CLARO Y PRÁCTICO',
    empresaInfo: 'Frikaz S.A.S. (Bosa, Bogotá — 10 Trabajadores)',
    titulo: 'Ciclo PHVA — Normas Claras de Seguridad, Salud y Ambiente',
    descripcion:
      'Aquí encuentras, paso a paso y en palabras sencillas, las normas que cuidan tu salud, evitan accidentes en planta y protegen el medio ambiente en Frikaz S.A.S. Cada norma explica 6 puntos clave: qué pide la ley, por qué nos cuida, qué hacemos en nuestro trabajo, si está vigente, dónde aplica y qué soporte lo demuestra.',
  },
  fases: {
    PLANEAR: {
      tituloFase: '1. PLANEAR — ¿Qué normas nos ayudan a organizar el trabajo seguro y limpio?',
      subtituloFase:
        'Antes de empezar la jornada, planeamos cómo prevenir accidentes y cuidar el entorno. Haz clic en cualquier tarjeta para ver sus 6 puntos explicados de forma sencilla.',
      modulos: [
        {
          subtema: 'DIAGNÓSTICO',
          titulo: 'Módulo 1: Revisión Inicial y Compromisos',
          desc: 'Revisamos qué peligros existen en la planta (Decreto 1072/2015), qué impacta al ambiente (ISO 14001:2026) y firmamos nuestras políticas y metas de cuidado (Ley 99/1993).',
        },
        {
          subtema: 'PELIGROS Y ASPECTOS AMBIENTALES',
          titulo: 'Módulo 2: Peligros en el Trabajo y Cuidado de Recursos',
          desc: 'Identificamos riesgos como aceite caliente o cuchillas (Decreto 1443/2014 compilado en Decreto 1072/2015) y cuidamos el agua, la energía y las materias primas (Ley 99/1993).',
        },
        {
          subtema: 'ASIGNACIÓN',
          titulo: 'Módulo 3: Persona Encargada de Seguridad y Salud',
          desc: 'Nombramos a la persona encargada del SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo) con su curso obligatorio de 50 horas (Decreto 1072/2015).',
        },
        {
          subtema: 'MATRIZ LEGAL Y PLAN ANUAL',
          titulo: 'Módulo 4: Lista de Normas y Plan del Año',
          desc: 'Organizamos el manejo seguro de residuos peligrosos —RESPEL— (Dec. 4741/2005), control de ruido (Res. 0627/2006, Ley 2450/2025), lista de leyes y Plan Anual de actividades.',
        },
      ],
    },
    HACER: {
      tituloFase: '2. HACER — ¿Qué hacemos cada día para cuidarnos y trabajar bien?',
      subtituloFase:
        'Acciones diarias en nuestra planta de snacks fritos: afiliación, exámenes médicos, elementos de protección, comités, manejo seguro de máquinas y separación de residuos.',
      modulos: [
        {
          subtema: 'INGRESO',
          titulo: 'Ingreso, Exámenes Médicos y Capacitación',
          desc: 'Afiliación a EPS, pensión y ARL antes de empezar, exámenes médicos para manipular alimentos e inducción práctica sobre el puesto de trabajo.',
        },
        {
          subtema: 'DOTACIÓN Y COMITÉS',
          titulo: 'Dotación, Elementos de Protección y Comités',
          desc: 'Elección del Vigía SST (compañero que apoya la seguridad) y Comité de Convivencia, más entrega de uniforme y EPP (guantes, botas y delantal contra calor).',
        },
        {
          subtema: 'RIESGOS',
          titulo: 'Cuidado de Riesgos en Planta y Bienestar',
          desc: 'Cuidamos el estrés laboral y las pausas (Res. 2764), y prevenimos accidentes con cuchillas, aceite a 180 °C, espacios cerrados y líquidos de aseo.',
        },
        {
          subtema: 'RESIDUOS Y EMERGENCIAS',
          titulo: 'Residuos, Aceite Usado y Emergencias',
          desc: 'Entrega de aceite de cocina usado (ACU, Res. 316) a gestor autorizado, canecas por colores (Res. 2184) y extintor Clase K junto a freidoras.',
        },
      ],
    },
    VERIFICAR: {
      tituloFase: '3. VERIFICAR — ¿Cómo comprobamos que todo esté funcionando bien?',
      subtituloFase:
        'Revisamos con calma nuestras metas, recorremos la planta, controlamos el agua y los residuos, y la gerencia verifica que las medidas estén dando resultados.',
      modulos: [
        {
          subtema: 'EVALUACIÓN',
          titulo: 'Medición de Resultados e Indicadores',
          desc: 'Revisamos en números sencillos si bajaron los incidentes, si hicimos las capacitaciones y cómo vamos con los 7 estándares mínimos de la ley.',
        },
        {
          subtema: 'AUDITORÍA',
          titulo: 'Revisiones Internas y Control Ambiental',
          desc: 'Recorrido de revisión anual para verificar la trampa de grasas, las entregas de aceite usado, el agua residual y los extractores de humo.',
        },
        {
          subtema: 'EVALUACIÓN DEL CUMPLIMIENTO LEGAL',
          titulo: 'Revisión de Leyes y Cuidado Emocional',
          desc: 'Confirmamos cada seis meses que cumplimos las normas vigentes y aplicamos la ruta de apoyo emocional y salud mental "Código Dorado".',
        },
        {
          subtema: 'REVISIÓN POR LA DIRECCIÓN',
          titulo: 'Revisión de la Gerencia y Aprendices',
          desc: 'La gerencia revisa cómo funcionó el sistema en el año, asegura presupuesto y verifica la protección completa de trabajadores y aprendices.',
        },
      ],
    },
    ACTUAR: {
      tituloFase: '4. ACTUAR — ¿Cómo corregimos fallas y mejoramos cada día?',
      subtituloFase:
        'Cuando ocurre un incidente, un casi accidente o encontramos algo por mejorar, actuamos rápido para corregirlo y evitar que vuelva a pasar.',
      modulos: [
        {
          subtema: 'ACCIDENTES Y ENFERMEDADES',
          titulo: 'Atención y Reporte de Accidentes (FURAT)',
          desc: 'Si alguien se accidenta, primero se atiende su salud, se reporta en 2 días hábiles (formato FURAT), se investigan las causas y se adapta su regreso al trabajo.',
        },
        {
          subtema: 'SANCIONES',
          titulo: 'Prevención de Multas y Responsabilidades',
          desc: 'Mantenemos afiliaciones, guardas de máquinas y cuidado ambiental al día para proteger la vida del equipo y evitar sanciones o cierres a la empresa.',
        },
        {
          subtema: 'REQUERIMIENTOS DE LA AUTORIDAD',
          titulo: 'Atención a Visitas e Inspecciones',
          desc: 'Tenemos en orden los documentos y soportes para responder con transparencia ante visitas del Ministerio del Trabajo o la Secretaría de Ambiente.',
        },
        {
          subtema: 'CIERRE DE CICLO',
          titulo: 'Mejora Continua y Actualización Anual',
          desc: 'Cada año actualizamos nuestra lista de peligros, revisamos procedimientos según lo aprendido y aplicamos mejoras prácticas en planta.',
        },
      ],
    },
  },
  guiaDocente: {
    titulo: 'Guía Rápida: ¿Cómo entender los 6 puntos de cada norma?',
    descripcion:
      'Cada tarjeta explica la norma en 6 pasos sencillos para cualquier trabajador de Frikaz S.A.S.: 1. Qué pide la norma (en palabras claras), 2. Por qué nos protege (importancia en nuestro trabajo diario), 3. Qué hacemos en planta (pasos prácticos en freidoras, empaque o reparto), 4. Vigencia actual (si la ley sigue aplicando hoy en Colombia), 5. Dónde y a quiénes aplica (planta Bosa, trabajadores y aprendices), y 6. Cómo lo demostramos (actas, planillas, certificados o fotos).',
  },
  matrizTabla: {
    titulo: 'Lista Completa de Normas de Seguridad y Ambiente',
    descripcion:
      'Resumen claro de todas las leyes y reglas vigentes en Colombia que cuidan el trabajo y el medio ambiente en Frikaz S.A.S.',
  },
};
