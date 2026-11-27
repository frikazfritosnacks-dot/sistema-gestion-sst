import {
  getAccessToken,
  getCurrentGoogleUser,
  googleSignIn,
  CUENTA_OBJETIVO_GMAIL,
} from './gmailAuthService';
import { sendEmailViaGmailApi } from './gmailApiService';
import { sendEmailReal, type EmailAttachmentPayload } from './emailService';

export interface EnvioCorreoFrikazRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  tipoNotificacion?: string;
  workerName?: string;
  cargo?: string;
  canalPreferido?: 'auto' | 'gmail' | 'smtp';
  attachments?: EmailAttachmentPayload[];
}

export interface EnvioCorreoFrikazResult {
  success: boolean;
  canal: 'Gmail API' | 'SMTP Servidor' | 'Ninguno';
  messageId?: string;
  trackingCode?: string;
  error?: string;
  details?: string;
  missingVars?: string[];
  requiresGoogleAuth?: boolean;
}

export function esCorreoValidoFrikaz(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

/**
 * Ejecuta el envío real de correo usando el canal Gmail API (si hay sesión OAuth activa)
 * o el backend SMTP (`/api/email/send`). Nunca simula un envío exitoso cuando falla.
 */
export async function enviarCorreoRealFrikaz(
  req: EnvioCorreoFrikazRequest
): Promise<EnvioCorreoFrikazResult> {
  const dest = (req.to || '').trim();
  if (!esCorreoValidoFrikaz(dest)) {
    return {
      success: false,
      canal: 'Ninguno',
      error: 'El correo electrónico ingresado no tiene un formato válido.',
    };
  }

  const prefer = req.canalPreferido || 'auto';

  // 1. Canal Gmail API (cuando ya hay token o el usuario eligió Gmail explícitamente)
  if (prefer === 'gmail' || prefer === 'auto') {
    const token = await getAccessToken();
    if (token) {
      const gmailRes = await sendEmailViaGmailApi({
        to: dest,
        subject: req.subject,
        html: req.html,
        text: req.text,
        attachments: req.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType || 'application/octet-stream',
        })),
      });

      if (gmailRes.success) {
        return {
          success: true,
          canal: 'Gmail API',
          messageId: gmailRes.messageId,
          trackingCode: `GMAIL-${Date.now()}`,
        };
      }

      if (prefer === 'gmail') {
        return {
          success: false,
          canal: 'Gmail API',
          error: gmailRes.error || 'No se pudo enviar el correo mediante Gmail API.',
        };
      }
    } else if (prefer === 'gmail') {
      return {
        success: false,
        canal: 'Gmail API',
        error: `No hay una sesión activa de Gmail para ${CUENTA_OBJETIVO_GMAIL}. Conecta la cuenta o usa el canal SMTP del servidor.`,
        requiresGoogleAuth: true,
      };
    }
  }

  // 2. Canal SMTP real en backend (/api/email/send)
  const smtpRes = await sendEmailReal({
    to: dest,
    subject: req.subject,
    text: req.text,
    html: req.html,
    tipoNotificacion: req.tipoNotificacion,
    workerName: req.workerName,
    cargo: req.cargo,
    attachments: req.attachments,
  });

  if (smtpRes.success) {
    return {
      success: true,
      canal: 'SMTP Servidor',
      messageId: smtpRes.messageId,
      trackingCode: smtpRes.trackingCode,
    };
  }

  return {
    success: false,
    canal: 'SMTP Servidor',
    error:
      smtpRes.error ||
      'El servicio de correo SMTP no se encuentra configurado o rechazó el envío.',
    details: smtpRes.details || smtpRes.instructions,
    missingVars: smtpRes.missingVars,
  };
}

export async function conectarGmailFrikaz() {
  const res = await googleSignIn(CUENTA_OBJETIVO_GMAIL);
  return res?.user || getCurrentGoogleUser();
}
