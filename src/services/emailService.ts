// ============================================================================
// SERVICIO CLIENTE DE CORREO ELECTRÓNICO REAL (SMTP / API TRANSACCIONAL)
// Frikaz S.A.S. — Sistema de Gestión SG-SST — frikaz.fritosnacks@gmail.com
// ============================================================================

export type EstadoEnvioCorreo =
  | 'Pendiente de envío'
  | 'Enviando'
  | 'Enviado correctamente al proveedor'
  | 'Error en el envío'
  | 'Rechazado por el servidor destinatario'
  | 'Entregado';

export interface EmailAttachmentPayload {
  filename: string;
  content: string; // Base64 o texto
  contentType?: string;
  encoding?: 'base64' | 'utf-8';
}

export interface EmailSendPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  tipoNotificacion?: string;
  workerName?: string;
  cargo?: string;
  trackingCode?: string;
  attachments?: EmailAttachmentPayload[];
}

export interface EmailHistoryItem {
  id: string;
  trackingCode: string;
  to: string;
  from: string;
  subject: string;
  contentSnippet: string;
  tipoNotificacion: string;
  workerName?: string;
  cargo?: string;
  timestamp: string;
  status: EstadoEnvioCorreo;
  provider: string;
  messageId?: string;
  responseInfo?: string;
  errorDetails?: string;
  attempts: number;
  attachmentNames?: string[];
}

export interface EmailServiceStatus {
  configured: boolean;
  provider: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  senderAddress: string;
  missingVars: string[];
  totalSentInHistory: number;
  instructions: string;
}

export interface EmailSendResponse {
  success: boolean;
  status: EstadoEnvioCorreo;
  trackingCode?: string;
  messageId?: string;
  response?: string;
  error?: string;
  details?: string;
  missingVars?: string[];
  record?: EmailHistoryItem;
  instructions?: string;
  httpStatus?: number;
}

/**
 * Función robusta para procesar respuestas del servidor sin romper en HTML o texto plano.
 * Cumple estrictamente con el requerimiento:
 * - Comprueba el código HTTP antes de procesar la respuesta.
 * - Verifica el tipo de contenido recibido.
 * - NO ejecuta response.json() si el servidor devuelve HTML o texto.
 * - Muestra el mensaje real del servidor cuando exista un error.
 */
async function parseSafeResponse(res: Response): Promise<{
  isJson: boolean;
  data: any;
  rawText: string;
  contentType: string;
}> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let rawText = '';
  try {
    rawText = await res.text();
  } catch (err: any) {
    return {
      isJson: false,
      data: null,
      rawText: `Error leyendo el cuerpo de la respuesta: ${err.message}`,
      contentType,
    };
  }

  const trimmed = rawText.trim();
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (contentType.includes('application/json') || looksLikeJson) {
    try {
      const data = JSON.parse(rawText);
      return { isJson: true, data, rawText, contentType };
    } catch {
      return { isJson: false, data: null, rawText, contentType };
    }
  }

  return { isJson: false, data: null, rawText, contentType };
}

/**
 * Limpia fragmentos HTML para extraer texto legible de errores
 */
function extractReadableError(rawText: string, status: number): string {
  if (!rawText || !rawText.trim()) {
    return `El servidor devolvió código de error HTTP ${status}.`;
  }

  // Eliminar etiquetas HTML y normalizar espacios
  const stripped = rawText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length > 350) {
    return `${stripped.slice(0, 350)}... (HTTP ${status})`;
  }
  return `${stripped} (HTTP ${status})`;
}

/**
 * Consulta el estado del servicio de correo en el backend
 */
export async function getEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const res = await fetch('/api/email/status');
    const parsed = await parseSafeResponse(res);

    if (parsed.isJson && parsed.data) {
      return parsed.data;
    }

    return {
      configured: false,
      provider: 'none',
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      senderAddress: 'frikaz.fritosnacks@gmail.com',
      missingVars: ['El sistema de correo dio una respuesta inesperada'],
      totalSentInHistory: 0,
      instructions: extractReadableError(parsed.rawText, res.status),
    };
  } catch (error: any) {
    return {
      configured: false,
      provider: 'none',
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      senderAddress: 'frikaz.fritosnacks@gmail.com',
      missingVars: ['No hay conexión con el servicio de correo'],
      totalSentInHistory: 0,
      instructions: `No pudimos revisar el estado del correo en este momento: ${error.message}`,
    };
  }
}

/**
 * Verifica la conectividad y credenciales SMTP con el servidor
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  message: string;
  missingVars?: string[];
}> {
  try {
    const res = await fetch('/api/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const parsed = await parseSafeResponse(res);

    if (parsed.isJson && parsed.data) {
      return {
        success: Boolean(parsed.data.success),
        message: parsed.data.message || (parsed.data.success ? 'El correo está listo para enviar.' : 'No pudimos comprobar el correo.'),
        missingVars: parsed.data.missingVars,
      };
    }

    return {
      success: false,
      message: extractReadableError(parsed.rawText, res.status),
    };
  } catch (error: any) {
    return {
      success: false,
      message: `No hay internet o no pudimos conectarnos al servicio de correo: ${error.message}`,
    };
  }
}

/**
 * Ejecuta el envío real del correo electrónico a través del backend
 */
export async function sendEmailReal(payload: EmailSendPayload): Promise<EmailSendResponse> {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const parsed = await parseSafeResponse(res);

    if (!parsed.isJson) {
      const serverMessage = extractReadableError(parsed.rawText, res.status);
      return {
        success: false,
        status: 'Error en el envío',
        error: `El servidor de correo respondió de forma inesperada: ${serverMessage}`,
        details: `No pudimos confirmar el envío (código ${res.status}). Intenta de nuevo en unos momentos.`,
        httpStatus: res.status,
      };
    }

    const data = parsed.data;

    if (!res.ok) {
      return {
        success: false,
        status: data.status || 'Error en el envío',
        trackingCode: data.trackingCode,
        error: data.error || `No pudimos enviar el correo (código ${res.status})`,
        details: data.details,
        missingVars: data.missingVars,
        record: data.record,
        instructions: data.instructions,
        httpStatus: res.status,
      };
    }

    return {
      success: true,
      status: data.status || 'Enviado correctamente al proveedor',
      trackingCode: data.trackingCode,
      messageId: data.messageId,
      response: data.response,
      record: data.record,
      httpStatus: res.status,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'Error en el envío',
      error: `No pudimos conectarnos para enviar el correo: ${error.message}`,
      details: 'Revisa tu conexión a internet o intenta de nuevo en un momento.',
    };
  }
}

/**
 * Obtiene el historial persistente de correos enviados desde el backend
 */
export async function getEmailHistory(): Promise<EmailHistoryItem[]> {
  try {
    const res = await fetch('/api/email/history');
    const parsed = await parseSafeResponse(res);
    if (parsed.isJson && parsed.data && Array.isArray(parsed.data.history)) {
      return parsed.data.history;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo historial de correos del backend:', error);
    return [];
  }
}

/**
 * Reintenta el envío de un correo que falló
 */
export async function retryEmailSend(id: string): Promise<EmailSendResponse> {
  try {
    const res = await fetch(`/api/email/retry/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const parsed = await parseSafeResponse(res);

    if (!parsed.isJson) {
      return {
        success: false,
        status: 'Error en el envío',
        error: extractReadableError(parsed.rawText, res.status),
        httpStatus: res.status,
      };
    }

    const data = parsed.data;
    if (!res.ok) {
      return {
        success: false,
        status: data.status || 'Error en el envío',
        error: data.error || `Error HTTP ${res.status}`,
        details: data.details,
        missingVars: data.missingVars,
        httpStatus: res.status,
      };
    }

    return {
      success: true,
      status: data.status || 'Enviado correctamente al proveedor',
      record: data.record,
      httpStatus: res.status,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'Error en el envío',
      error: `Error al intentar reintentar el envío: ${error.message}`,
    };
  }
}
