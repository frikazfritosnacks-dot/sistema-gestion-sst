// ============================================================================
// SERVICIO DE GESTIÓN Y PERSISTENCIA DE DOCUMENTOS FIRMADOS Y ENVÍOS
// Frikaz S.A.S. — Sede Bosa, Bogotá D.C. — frikaz.fritosnacks@gmail.com
// ============================================================================

import {
  DocumentoFirmadoRecibido,
  RegistroEnvioPendiente,
  EstadoDocumentoFirmado,
  TipoDocumentoFirmado,
  MetricasDocumentosFirmados,
} from '../types/documentosFirmados';

const STORAGE_KEY_RECIBIDOS = 'frikaz_documentos_firmados_recibidos_v2';
const STORAGE_KEY_ENVIOS = 'frikaz_envios_pendientes_documentos_v2';
const STORAGE_KEY_DOCS_PLAIN_LANG = 'frikaz_docs_firmados_plain_lang_v1';
export const CUENTA_INSTITUCIONAL = 'frikaz.fritosnacks@gmail.com';

// ----------------------------------------------------------------------------
// DATOS SEMILLA REALES DE TRABAJADORES DE FRIKAZ S.A.S. (CARGOS CANÓNICOS)
// ----------------------------------------------------------------------------
const DOCUMENTOS_INICIALES: DocumentoFirmadoRecibido[] = [
  {
    id: 'doc-rec-001',
    envioId: 'FRK-ENV-2026-001',
    nombreTrabajador: 'Compañero: Operario de Frito (ID: FRK-OPR-FRITO)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Operario de Frito',
    tipoDocumento: 'responsabilidades',
    nombreArchivoRecibido: 'Responsabilidades_SST_Operario_Frito_Firmado.pdf',
    tamanoArchivo: '1.4 MB',
    asuntoCorreo: 'Re: Tus responsabilidades de seguridad en el trabajo – Frikaz S.A.S. [FRK-ENV-2026-001]',
    fechaEnvioOriginal: '2026-02-10 09:15',
    fechaRecepcion: '2026-02-12 14:32',
    estado: 'Aprobado',
    cuentaReceptora: CUENTA_INSTITUCIONAL,
    hiloCorreoId: 'thread-gmail-frk-882193',
    mensajeTrabajador: 'Buenas tardes equipo de seguridad, aquí les envío el documento firmado con mi cédula donde acepto mis cuidados en la freidora. Quedo pendiente de las charlas del mes.',
    observacionesRevision: 'Documento completo con firma clara y cédula revisada. Cumple con el Decreto 1072/2015 Art. 2.2.4.6.8.',
    revisadoPor: 'Coordinador / Vigía de SST (Frikaz S.A.S.)',
    fechaRevision: '2026-02-13 10:20',
    detallesFirma: {
      numeroDocumento: '1.020.485.912 de Bogotá D.C.',
      empresa: 'Frikaz S.A.S. (Planta Bosa)',
      declaracionAceptacion: 'Recibí, leí y entendí mis responsabilidades de seguridad para trabajar con las freidoras, cuidar que el aceite no pase de 180 °C y usar siempre mis guantes térmicos y delantal.',
      fechaFirma: '12 de Febrero de 2026',
      firmaRegistrada: true,
    },
    trazabilidad: [
      {
        id: 'tz-1',
        fechaHora: '2026-02-10 09:15',
        evento: 'Envío de documento de responsabilidades',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Se envió el documento desde el Organigrama de Cargos con el código FRK-ENV-2026-001.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-2',
        fechaHora: '2026-02-12 14:32',
        evento: 'Llegó respuesta con documento firmado',
        responsable: 'Bandeja Gmail (frikaz.fritosnacks@gmail.com)',
        detalles: 'El trabajador respondió con el archivo PDF firmado (1.4 MB).',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-3',
        fechaHora: '2026-02-13 10:20',
        evento: 'Documento revisado y aprobado',
        responsable: 'Coordinador / Vigía de SST',
        detalles: 'Firma verificada sin problemas. Guardado en la carpeta digital del trabajador.',
        estadoResultante: 'Aprobado',
      },
    ],
  },
  {
    id: 'doc-rec-002',
    envioId: 'FRK-ENV-2026-002',
    nombreTrabajador: 'Compañero: Coordinador / Vigía de SST (ID: FRK-SST-VIGIA)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Coordinador / Vigía de SST',
    tipoDocumento: 'politicas',
    nombreArchivoRecibido: 'Politica_SST_Frikaz_SAS_Firmada_Vigia.pdf',
    tamanoArchivo: '1.8 MB',
    asuntoCorreo: 'Re: Compromiso de Seguridad y Salud (Política SST) – Frikaz S.A.S. [FRK-ENV-2026-002]',
    fechaEnvioOriginal: '2026-02-14 11:00',
    fechaRecepcion: '2026-02-15 16:45',
    estado: 'Aprobado',
    cuentaReceptora: CUENTA_INSTITUCIONAL,
    hiloCorreoId: 'thread-gmail-frk-882204',
    mensajeTrabajador: 'Hola, envío firmado el compromiso de seguridad (Política SST) donde confirmo que apoyaré las reglas de higiene y prevención de accidentes en la planta.',
    observacionesRevision: 'Firma clara y completa. Guardado como prueba de entrega de nuestra Política de Seguridad.',
    revisadoPor: 'Gerente General (Frikaz S.A.S.)',
    fechaRevision: '2026-02-16 08:30',
    detallesFirma: {
      numeroDocumento: '1.032.441.876 de Bogotá D.C.',
      empresa: 'Frikaz S.A.S.',
      declaracionAceptacion: 'Conozco y me comprometo a cumplir la Política de Seguridad y Salud en el Trabajo (SG-SST) de Frikaz S.A.S., participar en simulacros y avisar si veo algún peligro.',
      fechaFirma: '15 de Febrero de 2026',
      firmaRegistrada: true,
    },
    trazabilidad: [
      {
        id: 'tz-4',
        fechaHora: '2026-02-14 11:00',
        evento: 'Envío de compromiso de seguridad (Política SST)',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Enviado desde la sección de Política de Seguridad.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-5',
        fechaHora: '2026-02-15 16:45',
        evento: 'Documento firmado recibido',
        responsable: 'Bandeja Gmail (frikaz.fritosnacks@gmail.com)',
        detalles: 'Archivo PDF recibido en frikaz.fritosnacks@gmail.com.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-6',
        fechaHora: '2026-02-16 08:30',
        evento: 'Aprobación final',
        responsable: 'Gerente General',
        detalles: 'Guardado como prueba del cumplimiento de la Resolución 0312/2019 (estándar 1.1.1).',
        estadoResultante: 'Aprobado',
      },
    ],
  },
  {
    id: 'doc-rec-003',
    envioId: 'FRK-ENV-2026-003',
    nombreTrabajador: 'Compañero: Conductor (ID: FRK-CND-LOGISTICA)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Conductor',
    tipoDocumento: 'responsabilidades',
    nombreArchivoRecibido: 'Responsabilidades_Conductor_Logistico_Firmado.pdf',
    tamanoArchivo: '2.1 MB',
    asuntoCorreo: 'Re: Tus responsabilidades de seguridad en el trabajo – Frikaz S.A.S. [FRK-ENV-2026-003]',
    fechaEnvioOriginal: '2026-02-18 08:30',
    fechaRecepcion: '2026-02-19 18:10',
    estado: 'Pendiente de revisión',
    cuentaReceptora: CUENTA_INSTITUCIONAL,
    hiloCorreoId: 'thread-gmail-frk-882255',
    mensajeTrabajador: 'Buenas noches, aquí envío el documento firmado. Hoy estuve haciendo entregas entre Bosa y Soacha y apenas pude conectarme para mandarlo.',
    observacionesRevision: 'El archivo ya llegó. Falta que el encargado de seguridad lo revise y lo apruebe.',
    revisadoPor: null,
    fechaRevision: null,
    detallesFirma: {
      numeroDocumento: '79.882.114 de Soacha',
      empresa: 'Frikaz S.A.S.',
      declaracionAceptacion: 'Acepto cuidar mi seguridad en la vía, revisar el furgón todos los días antes de salir y cumplir las normas del Plan de Seguridad Vial (PESV).',
      fechaFirma: '19 de Febrero de 2026',
      firmaRegistrada: true,
    },
    trazabilidad: [
      {
        id: 'tz-7',
        fechaHora: '2026-02-18 08:30',
        evento: 'Envío de responsabilidades del cargo',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Correo enviado correctamente al conductor.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-8',
        fechaHora: '2026-02-19 18:10',
        evento: 'Llegó el documento firmado',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Archivo PDF recibido completo y listo para revisar.',
        estadoResultante: 'Pendiente de revisión',
      },
    ],
  },
  {
    id: 'doc-rec-004',
    envioId: 'FRK-ENV-2026-004',
    nombreTrabajador: 'Compañero: Operario de Empaque (ID: FRK-OPR-EMPAQUE)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Operario de Empaque',
    tipoDocumento: 'responsabilidades',
    nombreArchivoRecibido: 'Firma_Empaque_Sellado_Scan.pdf',
    tamanoArchivo: '850 KB',
    asuntoCorreo: 'Re: Tus responsabilidades de seguridad en el trabajo – Frikaz S.A.S. [FRK-ENV-2026-004]',
    fechaEnvioOriginal: '2026-02-20 10:15',
    fechaRecepcion: '2026-02-21 09:20',
    estado: 'Requiere corrección',
    cuentaReceptora: CUENTA_INSTITUCIONAL,
    hiloCorreoId: 'thread-gmail-frk-882280',
    mensajeTrabajador: 'Adjunto el documento que me enviaron ya firmado.',
    observacionesRevision: 'La firma en la hoja 3 salió borrosa y faltó la última página. Por favor tómale una foto más clara con buena luz o escanéala de nuevo.',
    revisadoPor: 'Coordinador / Vigía de SST (Frikaz S.A.S.)',
    fechaRevision: '2026-02-21 11:45',
    detallesFirma: {
      numeroDocumento: '52.981.442 de Bogotá D.C.',
      empresa: 'Frikaz S.A.S.',
      declaracionAceptacion: 'Firma poco legible: se pidió volver a enviarla más clara.',
      fechaFirma: '20 de Febrero de 2026',
      firmaRegistrada: false,
    },
    trazabilidad: [
      {
        id: 'tz-9',
        fechaHora: '2026-02-20 10:15',
        evento: 'Envío de documento',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Se envió el documento por correo.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-10',
        fechaHora: '2026-02-21 09:20',
        evento: 'Archivo recibido',
        responsable: 'frikaz.fritosnacks@gmail.com',
        detalles: 'Llegó archivo escaneado de 850 KB.',
        estadoResultante: 'Recibido',
      },
      {
        id: 'tz-11',
        fechaHora: '2026-02-21 11:45',
        evento: 'Se pidió corregir el archivo',
        responsable: 'Coordinador / Vigía de SST',
        detalles: 'Se le pidió al trabajador firmar con esfero negro y enviar una imagen o escaneo nítido.',
        estadoResultante: 'Requiere corrección',
      },
    ],
  },
];

const ENVIOS_INICIALES: RegistroEnvioPendiente[] = [
  {
    id: 'env-pend-001',
    envioId: 'FRK-ENV-2026-005',
    nombreTrabajador: 'Compañero: Operario de Pelado (ID: FRK-OPR-PELADO)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Operario de Pelado',
    tipoDocumento: 'responsabilidades',
    nombreDocumentoEnviado: 'Responsabilidades_SST_Operario_Pelado_Frikaz.docx',
    asunto: 'Tus responsabilidades de seguridad en el trabajo – Frikaz S.A.S. [FRK-ENV-2026-005]',
    cuerpo: 'Hola compañero(a), aquí te enviamos el documento sencillo con los cuidados de tu puesto...',
    fechaEnvio: '2026-02-22 08:45',
    cuentaEmisora: CUENTA_INSTITUCIONAL,
    estado: 'Enviado - Esperando devolución',
  },
  {
    id: 'env-pend-002',
    envioId: 'FRK-ENV-2026-006',
    nombreTrabajador: 'Compañero: Operario de Selección (ID: FRK-OPR-SELECCION)',
    correoTrabajador: 'frikaz.fritosnacks@gmail.com',
    cargo: 'Operario de Selección',
    tipoDocumento: 'politicas',
    nombreDocumentoEnviado: 'Politica_SST_Frikaz_SAS_2026.docx',
    asunto: 'Compromiso de Seguridad y Salud (Política SST) – Frikaz S.A.S. [FRK-ENV-2026-006]',
    cuerpo: 'Hola compañero(a), te compartimos nuestro compromiso de seguridad en el trabajo...',
    fechaEnvio: '2026-02-22 10:10',
    cuentaEmisora: CUENTA_INSTITUCIONAL,
    estado: 'Enviado - Esperando devolución',
  },
];

// ----------------------------------------------------------------------------
// MIGRACIÓN SEGURA A LENGUAJE CLARO Y GETTERS / SETTERS LOCALSTORAGE
// ----------------------------------------------------------------------------
function ensureDocsPlainLangMigration(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY_DOCS_PLAIN_LANG) === '1') return;

    const rawDocs = localStorage.getItem(STORAGE_KEY_RECIBIDOS);
    if (rawDocs) {
      const parsed: DocumentoFirmadoRecibido[] = JSON.parse(rawDocs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(DOCUMENTOS_INICIALES.map((d) => [d.id, d]));
        const migratedDocs = parsed.map((d) => {
          const seed = seedById.get(d.id);
          if (!seed) return d;
          const userChangedStatus = d.estado !== seed.estado || (d.fechaRevision && d.fechaRevision !== seed.fechaRevision);
          return {
            ...d,
            nombreTrabajador: seed.nombreTrabajador,
            asuntoCorreo: seed.asuntoCorreo,
            mensajeTrabajador: seed.mensajeTrabajador,
            detallesFirma: seed.detallesFirma,
            observacionesRevision: userChangedStatus ? d.observacionesRevision : seed.observacionesRevision,
            trazabilidad: userChangedStatus ? d.trazabilidad : seed.trazabilidad,
          };
        });
        localStorage.setItem(STORAGE_KEY_RECIBIDOS, JSON.stringify(migratedDocs));
      }
    }

    const rawEnvios = localStorage.getItem(STORAGE_KEY_ENVIOS);
    if (rawEnvios) {
      const parsed: RegistroEnvioPendiente[] = JSON.parse(rawEnvios);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(ENVIOS_INICIALES.map((e) => [e.id, e]));
        const migratedEnvios = parsed.map((e) => {
          const seed = seedById.get(e.id);
          return seed ? { ...seed } : e;
        });
        localStorage.setItem(STORAGE_KEY_ENVIOS, JSON.stringify(migratedEnvios));
      }
    }

    localStorage.setItem(STORAGE_KEY_DOCS_PLAIN_LANG, '1');
  } catch (err) {
    console.error('Error migrando documentos firmados a lenguaje claro:', err);
  }
}

export function getStoredDocumentosFirmados(): DocumentoFirmadoRecibido[] {
  ensureDocsPlainLangMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECIBIDOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECIBIDOS, JSON.stringify(DOCUMENTOS_INICIALES));
      return DOCUMENTOS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DOCUMENTOS_INICIALES;
  } catch (err) {
    console.error('Error leyendo documentos firmados de localStorage:', err);
    return DOCUMENTOS_INICIALES;
  }
}

export function saveStoredDocumentosFirmados(docs: DocumentoFirmadoRecibido[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECIBIDOS, JSON.stringify(docs));
  } catch (err) {
    console.error('Error guardando documentos firmados en localStorage:', err);
  }
}

export function getStoredEnviosPendientes(): RegistroEnvioPendiente[] {
  ensureDocsPlainLangMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENVIOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ENVIOS, JSON.stringify(ENVIOS_INICIALES));
      return ENVIOS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : ENVIOS_INICIALES;
  } catch (err) {
    console.error('Error leyendo envíos pendientes de localStorage:', err);
    return ENVIOS_INICIALES;
  }
}

export function saveStoredEnviosPendientes(envios: RegistroEnvioPendiente[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENVIOS, JSON.stringify(envios));
  } catch (err) {
    console.error('Error guardando envíos pendientes en localStorage:', err);
  }
}

// ----------------------------------------------------------------------------
// REGISTRAR NUEVO ENVÍO DESDE ORGANIGRAMA O POLÍTICA
// ----------------------------------------------------------------------------
export interface DatosNuevoEnvio {
  nombreTrabajador: string;
  correoTrabajador: string;
  cargo: string;
  tipoDocumento: TipoDocumentoFirmado;
  nombreDocumento: string;
  asunto: string;
  cuerpo: string;
}

export function registrarNuevoEnvio(datos: DatosNuevoEnvio): {
  envioId: string;
  registro: RegistroEnvioPendiente;
} {
  const envios = getStoredEnviosPendientes();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const envioId = `FRK-ENV-2026-${randomSuffix}`;

  const fechaIso = new Date().toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const nuevoRegistro: RegistroEnvioPendiente = {
    id: `env-${timestamp}`,
    envioId,
    nombreTrabajador: datos.nombreTrabajador.trim() || 'Trabajador de Frikaz S.A.S.',
    correoTrabajador: datos.correoTrabajador.trim().toLowerCase(),
    cargo: datos.cargo,
    tipoDocumento: datos.tipoDocumento,
    nombreDocumentoEnviado: datos.nombreDocumento,
    asunto: `${datos.asunto} [${envioId}]`,
    cuerpo: datos.cuerpo,
    fechaEnvio: fechaIso,
    cuentaEmisora: CUENTA_INSTITUCIONAL,
    estado: 'Enviado - Esperando devolución',
  };

  const actualizados = [nuevoRegistro, ...envios];
  saveStoredEnviosPendientes(actualizados);

  return { envioId, registro: nuevoRegistro };
}

// ----------------------------------------------------------------------------
// SIMULAR RESPUESTA DEL TRABAJADOR (DEVUELVE DOCUMENTO FIRMADO)
// ----------------------------------------------------------------------------
export function simularRespuestaTrabajador(envio: RegistroEnvioPendiente): DocumentoFirmadoRecibido {
  const docs = getStoredDocumentosFirmados();
  const envios = getStoredEnviosPendientes();

  const fechaIso = new Date().toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sanitizedName = envio.nombreTrabajador
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_');

  const nombreArchivoRecibido =
    envio.tipoDocumento === 'responsabilidades'
      ? `Responsabilidades_SST_${sanitizedName}_Firmado.pdf`
      : `Politica_SST_Frikaz_SAS_${sanitizedName}_Firmada.pdf`;

  const nuevoRecibido: DocumentoFirmadoRecibido = {
    id: `doc-rec-${Date.now()}`,
    envioId: envio.envioId,
    nombreTrabajador: envio.nombreTrabajador,
    correoTrabajador: envio.correoTrabajador,
    cargo: envio.cargo,
    tipoDocumento: envio.tipoDocumento,
    nombreArchivoRecibido,
    tamanoArchivo: `${(1.1 + Math.random() * 1.2).toFixed(1)} MB`,
    asuntoCorreo: `Re: ${envio.asunto}`,
    fechaEnvioOriginal: envio.fechaEnvio,
    fechaRecepcion: fechaIso,
    estado: 'Recibido',
    cuentaReceptora: CUENTA_INSTITUCIONAL,
    hiloCorreoId: `thread-gmail-frk-${Math.floor(800000 + Math.random() * 199999)}`,
    mensajeTrabajador: `Buen día equipo de Frikaz S.A.S., adjunto envío el documento firmado para el cargo ${envio.cargo} con el compromiso de cuidar mi seguridad en el trabajo. Por favor me confirman si llegó bien.`,
    observacionesRevision: 'Documento recién llegado por correo. Falta que el encargado de seguridad lo revise.',
    revisadoPor: null,
    fechaRevision: null,
    detallesFirma: {
      numeroDocumento: `C.C. ${Math.floor(10000000 + Math.random() * 90000000)} de Bogotá D.C.`,
      empresa: 'Frikaz S.A.S.',
      declaracionAceptacion:
        envio.tipoDocumento === 'responsabilidades'
          ? `Confirmo que recibí, leí y entendí las responsabilidades y cuidados de mi cargo (${envio.cargo}) en Frikaz S.A.S.`
          : 'Confirmo que recibí, leí y acepto cumplir la Política de Seguridad y Salud en el Trabajo de Frikaz S.A.S.',
      fechaFirma: fechaIso.split(' ')[0],
      firmaRegistrada: true,
    },
    trazabilidad: [
      {
        id: `tz-${Date.now()}-1`,
        fechaHora: envio.fechaEnvio,
        evento: 'Envío del documento al trabajador',
        responsable: CUENTA_INSTITUCIONAL,
        detalles: `Enviado al correo ${envio.correoTrabajador} (código ${envio.envioId})`,
        estadoResultante: 'Recibido',
      },
      {
        id: `tz-${Date.now()}-2`,
        fechaHora: fechaIso,
        evento: 'Llegó el documento firmado',
        responsable: `Bandeja Gmail (${CUENTA_INSTITUCIONAL})`,
        detalles: `El trabajador respondió con el archivo ${nombreArchivoRecibido}.`,
        estadoResultante: 'Recibido',
      },
    ],
  };

  // Guardar documento recibido
  const actualizados = [nuevoRecibido, ...docs];
  saveStoredDocumentosFirmados(actualizados);

  // Remover o marcar de pendientes
  const enviosRestantes = envios.filter((e) => e.id !== envio.id);
  saveStoredEnviosPendientes(enviosRestantes);

  return nuevoRecibido;
}

// ----------------------------------------------------------------------------
// ACTUALIZAR ESTADO DE UN DOCUMENTO FIRMADO
// ----------------------------------------------------------------------------
export function actualizarEstadoDocumento(
  docId: string,
  nuevoEstado: EstadoDocumentoFirmado,
  observaciones: string,
  revisor: string = 'Talento Humano / Responsable SG-SST Frikaz'
): DocumentoFirmadoRecibido | null {
  const docs = getStoredDocumentosFirmados();
  const index = docs.findIndex((d) => d.id === docId);
  if (index === -1) return null;

  const fechaIso = new Date().toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const doc = docs[index];
  const nuevoEvento = {
    id: `tz-${Date.now()}`,
    fechaHora: fechaIso,
    evento: `Cambio de estado a "${nuevoEstado}"`,
    responsable: revisor,
    detalles: observaciones.trim() || `Estado actualizado a ${nuevoEstado}`,
    estadoResultante: nuevoEstado,
  };

  const actualizado: DocumentoFirmadoRecibido = {
    ...doc,
    estado: nuevoEstado,
    observacionesRevision: observaciones.trim() || doc.observacionesRevision,
    revisadoPor: revisor,
    fechaRevision: fechaIso,
    trazabilidad: [nuevoEvento, ...doc.trazabilidad],
  };

  docs[index] = actualizado;
  saveStoredDocumentosFirmados(docs);
  return actualizado;
}

// ----------------------------------------------------------------------------
// CALCULAR MÉTRICAS
// ----------------------------------------------------------------------------
export function calcularMetricasDocumentos(docs: DocumentoFirmadoRecibido[]): MetricasDocumentosFirmados {
  const total = docs.length;
  const recibidos = docs.filter((d) => d.estado === 'Recibido').length;
  const pendientesRevision = docs.filter((d) => d.estado === 'Pendiente de revisión').length;
  const aprobados = docs.filter((d) => d.estado === 'Aprobado').length;
  const requierenCorreccion = docs.filter((d) => d.estado === 'Requiere corrección').length;

  const porcentajeAprobados = total > 0 ? Math.round((aprobados / total) * 100) : 0;

  return {
    totalRecibidos: total,
    recibidos,
    pendientesRevision,
    aprobados,
    requierenCorreccion,
    porcentajeAprobados,
  };
}

// ----------------------------------------------------------------------------
// SINCRONIZAR BANDEJA DE GMAIL CON MENSAJES REALES DE TRABAJADORES
// ----------------------------------------------------------------------------
export function sincronizarConMensajesGmail(mensajes: any[]): {
  nuevosDocumentos: DocumentoFirmadoRecibido[];
  totalAgregados: number;
} {
  const docs = getStoredDocumentosFirmados();
  const envios = getStoredEnviosPendientes();
  const nuevos: DocumentoFirmadoRecibido[] = [];

  for (const msg of mensajes) {
    // Evitar duplicados por hilo o id de Gmail
    const yaExiste = docs.some(
      (d) => d.hiloCorreoId === msg.threadId || d.id === `gmail-${msg.id}`
    );
    if (yaExiste) continue;

    const trackingMatch = `${msg.subject || ''} ${msg.snippet || ''}`.match(/FRK-ENV-2026-\d{3,4}/i);
    const trackingCode = trackingMatch ? trackingMatch[0].toUpperCase() : null;

    const envioPendiente = trackingCode
      ? envios.find((e) => e.envioId.toUpperCase() === trackingCode)
      : envios.find((e) => (msg.from || '').toLowerCase().includes(e.correoTrabajador.toLowerCase()));

    const fromParts = (msg.from || '').match(/^(?:["']?([^"'<]+)["']?\s*)?(?:<([^>]+)>)?$/);
    const nombreRemitente = fromParts?.[1]?.trim() || envioPendiente?.nombreTrabajador || msg.from || 'Trabajador';
    const correoRemitente = fromParts?.[2]?.trim() || msg.from || 'trabajador@frikaz.co';

    const tipoDoc: TipoDocumentoFirmado =
      envioPendiente?.tipoDocumento ||
      ((msg.subject || '').toLowerCase().includes('responsabilidad') ? 'responsabilidades' : 'politicas');

    const archivoRecibido =
      (msg.attachmentNames && msg.attachmentNames[0]) ||
      (tipoDoc === 'responsabilidades'
        ? `Responsabilidades_SST_${nombreRemitente.replace(/\s+/g, '_')}_Firmado.pdf`
        : `Politica_SST_${nombreRemitente.replace(/\s+/g, '_')}_Firmada.pdf`);

    const nuevoDoc: DocumentoFirmadoRecibido = {
      id: `gmail-${msg.id}`,
      envioId: trackingCode || envioPendiente?.envioId || `FRK-ENV-2026-${Math.floor(100 + Math.random() * 900)}`,
      nombreTrabajador: envioPendiente?.nombreTrabajador || nombreRemitente,
      correoTrabajador: envioPendiente?.correoTrabajador || correoRemitente,
      cargo: envioPendiente?.cargo || 'Trabajador Operativo',
      tipoDocumento: tipoDoc,
      nombreArchivoRecibido: archivoRecibido,
      tamanoArchivo: msg.hasAttachments ? '1.4 MB' : 'Adjunto Gmail',
      asuntoCorreo: msg.subject || 'Respuesta documental – Frikaz S.A.S.',
      fechaEnvioOriginal: envioPendiente?.fechaEnvio || msg.date || 'Reciente',
      fechaRecepcion: msg.date || new Date().toLocaleString('es-CO'),
      estado: 'Recibido',
      cuentaReceptora: CUENTA_INSTITUCIONAL,
      hiloCorreoId: msg.threadId || `thread-${msg.id}`,
      mensajeTrabajador: msg.snippet || 'Documento firmado adjunto.',
      observacionesRevision: 'Documento recibido en tiempo real desde la bandeja de Gmail.',
      revisadoPor: null,
      fechaRevision: null,
      detallesFirma: {
        numeroDocumento: 'Por revisar',
        empresa: 'Frikaz S.A.S.',
        declaracionAceptacion: 'Documento firmado recibido por correo electrónico en Gmail.',
        fechaFirma: msg.date || 'Reciente',
        firmaRegistrada: true,
      },
      trazabilidad: [
        {
          id: `tz-gmail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fechaHora: new Date().toLocaleString('es-CO'),
          evento: 'Llegó correo directo a Gmail',
          responsable: CUENTA_INSTITUCIONAL,
          detalles: `Mensaje traído desde la bandeja de entrada (ID: ${msg.id})`,
          estadoResultante: 'Recibido',
        },
      ],
    };

    nuevos.push(nuevoDoc);

    if (envioPendiente) {
      const idxEnv = envios.findIndex((e) => e.id === envioPendiente.id);
      if (idxEnv !== -1) {
        envios.splice(idxEnv, 1);
      }
    }
  }

  if (nuevos.length > 0) {
    const todosDocs = [...nuevos, ...docs];
    saveStoredDocumentosFirmados(todosDocs);
    saveStoredEnviosPendientes(envios);
  }

  return { nuevosDocumentos: nuevos, totalAgregados: nuevos.length };
}

