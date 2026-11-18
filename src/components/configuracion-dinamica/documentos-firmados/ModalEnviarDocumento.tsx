import React, { useState, useEffect } from 'react';
import { TipoDocumentoFirmado } from '../../../types/documentosFirmados';
import {
  registrarNuevoEnvio,
  CUENTA_INSTITUCIONAL,
} from '../../../services/documentosFirmadosService';
import {
  sendEmailReal,
  EstadoEnvioCorreo,
  EmailSendResponse,
  EmailAttachmentPayload,
} from '../../../services/emailService';
import {
  CARGOS_SST_CANONICOS,
  generarResponsabilidadesWordBase64,
  generarPoliticaWordBase64,
  getStoredPoliticaSST,
} from '../../../services/organigramaService';
import {
  getCurrentGoogleUser,
  getAccessToken,
  googleSignIn,
  switchGoogleAccount,
  CUENTA_OBJETIVO_GMAIL,
} from '../../../services/gmailAuthService';
import {
  sendEmailViaGmailApi,
  getGmailProfile,
} from '../../../services/gmailApiService';
import {
  Mail,
  Send,
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Paperclip,
  RefreshCw,
  Info,
  Server,
  ArrowRightLeft,
} from 'lucide-react';

interface ModalEnviarDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  tipoDocumento: TipoDocumentoFirmado;
  tituloEntidad: string; // Nombre del Cargo o Nombre de la Política
  nombreDocumentoAdjunto: string;
  nombreTrabajadorSugerido?: string;
  onEnvioExitoso?: (envioId: string, destinatario: string) => void;
}

export const ModalEnviarDocumento: React.FC<ModalEnviarDocumentoProps> = ({
  isOpen,
  onClose,
  tipoDocumento,
  tituloEntidad,
  nombreDocumentoAdjunto,
  nombreTrabajadorSugerido = '',
  onEnvioExitoso,
}) => {
  const [nombreTrabajador, setNombreTrabajador] = useState(nombreTrabajadorSugerido);
  const [correoTrabajador, setCorreoTrabajador] = useState('');
  const [estadoOperacional, setEstadoOperacional] = useState<EstadoEnvioCorreo>('Pendiente de envío');
  const [errorDetallado, setErrorDetallado] = useState<string | null>(null);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [resultadoEnvio, setResultadoEnvio] = useState<EmailSendResponse | null>(null);
  const [generandoAdjunto, setGenerandoAdjunto] = useState(false);

  // Integración Google Workspace Gmail API
  const [googleUser, setGoogleUser] = useState(getCurrentGoogleUser());
  const [canalEnvio, setCanalEnvio] = useState<'gmail' | 'smtp'>('gmail');
  const [conectarGoogleCargando, setConectarGoogleCargando] = useState(false);

  useEffect(() => {
    const usr = getCurrentGoogleUser();
    setGoogleUser(usr);
    getAccessToken().then((token) => {
      if (token) {
        setCanalEnvio('gmail');
      }
    });
  }, [isOpen]);

  const handleConectarGoogle = async () => {
    setConectarGoogleCargando(true);
    setErrorDetallado(null);
    try {
      const res = await googleSignIn(CUENTA_OBJETIVO_GMAIL);
      if (res) {
        setGoogleUser(res.user);
        setCanalEnvio('gmail');
      }
    } catch (err: any) {
      setErrorDetallado(err.message || 'Error al conectar con Google Workspace.');
    } finally {
      setConectarGoogleCargando(false);
    }
  };

  const handleSwitchToFrikaz = async () => {
    setConectarGoogleCargando(true);
    setErrorDetallado(null);
    try {
      const res = await switchGoogleAccount(CUENTA_OBJETIVO_GMAIL);
      if (res) {
        setGoogleUser(res.user);
        setCanalEnvio('gmail');
      }
    } catch (err: any) {
      setErrorDetallado(err.message || 'Error al cambiar a la cuenta de Frikaz S.A.S.');
    } finally {
      setConectarGoogleCargando(false);
    }
  };

  // Textos claros y cercanos para los trabajadores de Frikaz S.A.S.
  const asuntoDefecto =
    tipoDocumento === 'responsabilidades'
      ? 'Tus responsabilidades de seguridad en el trabajo – Frikaz S.A.S.'
      : 'Compromiso de Seguridad y Salud (Política SST) – Frikaz S.A.S.';

  const cuerpoDefecto =
    tipoDocumento === 'responsabilidades'
      ? `Hola, compañero(a):

En este archivo te enviamos los cuidados y responsabilidades de seguridad (SG-SST) para tu puesto (${tituloEntidad}) en Frikaz S.A.S.

¿Qué debes hacer con este documento?
1. Ábrelo y léelo con calma para saber cómo cuidarte y prevenir accidentes en tu turno.
2. Escribe tu nombre, número de cédula y fírmalo (puedes imprimirlo y tomarle una foto clara, o firmarlo en el archivo).
3. Responde a este mismo correo enviando el documento ya firmado para guardarlo en tu carpeta de trabajador.

Si tienes alguna duda sobre cómo firmarlo o no entiendes algún punto, pregúntale con confianza al Vigía de SST o a tu jefe de planta.

Un saludo cordial,
Equipo de Seguridad y Salud en el Trabajo (SG-SST)
Frikaz S.A.S. — Planta Bosa, Bogotá D.C.
Correo de contacto: ${CUENTA_INSTITUCIONAL}`
      : `Hola, compañero(a):

Te compartimos nuestro compromiso de Seguridad y Salud en el Trabajo (Política SST) de Frikaz S.A.S., donde explicamos cómo entre todos cuidamos la vida, la salud y la limpieza en la planta.

¿Qué debes hacer?
1. Léelo con atención para conocer nuestras reglas de cuidado y prevención.
2. Escribe tu nombre, cédula y fírmalo como señal de que lo conoces.
3. Responde a este correo adjuntando el documento firmado para guardarlo en el archivo de la empresa.

Cualquier pregunta, acércate al Vigía de SST o a la oficina.

Un saludo cordial,
Equipo de Seguridad y Salud en el Trabajo (SG-SST)
Frikaz S.A.S. — Planta Bosa, Bogotá D.C.
Correo de contacto: ${CUENTA_INSTITUCIONAL}`;

  const [asunto, setAsunto] = useState(asuntoDefecto);
  const [cuerpo, setCuerpo] = useState(cuerpoDefecto);

  if (!isOpen) return null;

  const validarEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const ejecutarEnvioReal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorDetallado(null);
    setMissingVars([]);
    setResultadoEnvio(null);

    const emailLimpio = correoTrabajador.trim();
    if (!emailLimpio) {
      setErrorDetallado('Por favor escribe el correo electrónico del trabajador.');
      setEstadoOperacional('Error en el envío');
      return;
    }
    if (!validarEmail(emailLimpio)) {
      setErrorDetallado('Ese correo no parece válido. Revisa que tenga @ y dominio (ejemplo: nombre@gmail.com).');
      setEstadoOperacional('Error en el envío');
      return;
    }

    setEstadoOperacional('Enviando');

    // Preparar documento adjunto formal en Word (.docx) cuando aplique
    let attachments: EmailAttachmentPayload[] | undefined = undefined;

    if (tipoDocumento === 'responsabilidades') {
      const cargoMatch = CARGOS_SST_CANONICOS.find(
        (c) => c.nombre.trim().toLowerCase() === tituloEntidad.trim().toLowerCase()
      );
      if (cargoMatch) {
        setGenerandoAdjunto(true);
        try {
          const docWord = await generarResponsabilidadesWordBase64(cargoMatch, {
            nombreTrabajador: nombreTrabajador.trim(),
          });
          attachments = [
            {
              filename: docWord.filename || nombreDocumentoAdjunto,
              content: docWord.base64,
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              encoding: 'base64',
            },
          ];
        } catch (errAdj: any) {
          console.warn('Aviso: No se pudo adjuntar Word base64:', errAdj);
        } finally {
          setGenerandoAdjunto(false);
        }
      }
    } else if (tipoDocumento === 'politicas') {
      setGenerandoAdjunto(true);
      try {
        const docWord = await generarPoliticaWordBase64(getStoredPoliticaSST());
        attachments = [
          {
            filename: docWord.filename || nombreDocumentoAdjunto,
            content: docWord.base64,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            encoding: 'base64',
          },
        ];
      } catch (errAdj: any) {
        console.warn('Aviso: No se pudo adjuntar Word base64 de política:', errAdj);
      } finally {
        setGenerandoAdjunto(false);
      }
    }

    // ------------------------------------------------------------------------
    // RUTA 1: ENVÍO REAL DIRECTO POR GMAIL API (GOOGLE WORKSPACE)
    // ------------------------------------------------------------------------
    if (canalEnvio === 'gmail') {
      let token = await getAccessToken();
      if (!token) {
        try {
          const signResult = await googleSignIn();
          if (signResult) {
            token = signResult.accessToken;
            setGoogleUser(signResult.user);
          } else {
            setErrorDetallado('Primero debes autorizar tu cuenta de Google para poder enviar por Gmail.');
            setEstadoOperacional('Error en el envío');
            return;
          }
        } catch (err: any) {
          setErrorDetallado(`No pudimos iniciar sesión con Google: ${err.message || err}`);
          setEstadoOperacional('Error en el envío');
          return;
        }
      }

      try {
        const gmailAttachments = attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        }));

        const resGmail = await sendEmailViaGmailApi({
          to: emailLimpio,
          subject: asunto.trim(),
          text: cuerpo,
          attachments: gmailAttachments,
        });

        if (resGmail.success) {
          const { envioId } = registrarNuevoEnvio({
            nombreTrabajador: nombreTrabajador.trim() || 'Trabajador de Frikaz S.A.S.',
            correoTrabajador: emailLimpio,
            cargo: tituloEntidad,
            tipoDocumento,
            nombreDocumento: nombreDocumentoAdjunto,
            asunto,
            cuerpo,
          });

          const resp: EmailSendResponse = {
            success: true,
            status: 'Enviado correctamente al proveedor',
            messageId: resGmail.messageId,
            trackingCode: envioId,
            details: `Correo enviado desde ${googleUser?.email || CUENTA_INSTITUCIONAL} usando Gmail.`,
          };

          setResultadoEnvio(resp);
          setEstadoOperacional('Enviado correctamente al proveedor');

          if (onEnvioExitoso) {
            onEnvioExitoso(envioId, emailLimpio);
          }
        } else {
          setEstadoOperacional('Error en el envío');
          setErrorDetallado(resGmail.error || resGmail.details || 'No se pudo enviar el correo por Gmail.');
        }
      } catch (errGmail: any) {
        setEstadoOperacional('Error en el envío');
        setErrorDetallado(`Problema al enviar por Gmail: ${errGmail.message || errGmail}`);
      }
      return;
    }

    // ------------------------------------------------------------------------
    // RUTA 2: ENVÍO REAL MEDIANTE SERVIDOR SMTP (BACKEND NODEMAILER)
    // ------------------------------------------------------------------------
    try {
      const resp = await sendEmailReal({
        to: emailLimpio,
        subject: asunto.trim(),
        text: cuerpo,
        tipoNotificacion:
          tipoDocumento === 'responsabilidades'
            ? 'Asignación de Responsabilidades por Cargo'
            : 'Divulgación de Política Institucional SST',
        workerName: nombreTrabajador.trim() || 'Trabajador Frikaz',
        cargo: tituloEntidad,
        attachments,
      });

      setResultadoEnvio(resp);
      setEstadoOperacional(resp.status);

      if (resp.success) {
        const { envioId } = registrarNuevoEnvio({
          nombreTrabajador: nombreTrabajador.trim() || 'Trabajador de Frikaz S.A.S.',
          correoTrabajador: emailLimpio,
          cargo: tituloEntidad,
          tipoDocumento,
          nombreDocumento: nombreDocumentoAdjunto,
          asunto,
          cuerpo,
        });

        if (onEnvioExitoso) {
          onEnvioExitoso(resp.trackingCode || envioId, emailLimpio);
        }
      } else {
        setErrorDetallado(resp.error || resp.details || 'Error al conectar con el servicio de correo.');
        if (resp.missingVars && resp.missingVars.length > 0) {
          setMissingVars(resp.missingVars);
        }
      }
    } catch (err: any) {
      setEstadoOperacional('Error en el envío');
      setErrorDetallado(`Fallo de conexión o red: ${err.message || err}`);
    }
  };

  const resetModal = () => {
    setEstadoOperacional('Pendiente de envío');
    setErrorDetallado(null);
    setResultadoEnvio(null);
    setMissingVars([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header Modal */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Envío Real por Correo
                </span>
                <span className="text-xs text-slate-400">
                  {tipoDocumento === 'responsabilidades' ? 'Roles y Cuidados del Cargo' : 'Compromiso de Seguridad'}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                {tipoDocumento === 'responsabilidades'
                  ? 'Enviar documento del cargo por correo'
                  : 'Enviar compromiso de seguridad por correo'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Se envía de verdad desde {CUENTA_INSTITUCIONAL} con el archivo Word listo para firmar
              </p>
            </div>
          </div>

          <button
            onClick={resetModal}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Estado Operacional Real */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Server className="h-3.5 w-3.5 text-slate-400" />
            Estado del envío:
          </span>
          <span
            className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border flex items-center gap-1.5 ${
              estadoOperacional === 'Pendiente de envío'
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : estadoOperacional === 'Enviando'
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/40 animate-pulse'
                : estadoOperacional === 'Enviado correctamente al proveedor' ||
                  estadoOperacional === 'Entregado'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
            }`}
          >
            {estadoOperacional === 'Enviando' && (
              <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
            )}
            {estadoOperacional === 'Enviado correctamente al proveedor' && (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            )}
            {(estadoOperacional === 'Error en el envío' ||
              estadoOperacional === 'Rechazado por el servidor destinatario') && (
              <AlertCircle className="h-3 w-3 text-rose-400" />
            )}
            {estadoOperacional}
          </span>
        </div>

        {/* Formulario */}
        <form onSubmit={ejecutarEnvioReal} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selector de Canal: Gmail API vs Servidor SMTP */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-400" />
                ¿Por qué medio deseas enviar el correo?
              </span>
              {googleUser ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Gmail conectado: {googleUser.email}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleConectarGoogle}
                  disabled={conectarGoogleCargando}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{conectarGoogleCargando ? 'Conectando...' : 'Conectar Gmail'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCanalEnvio('gmail')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  canalEnvio === 'gmail'
                    ? 'bg-sky-950/60 border-sky-500 text-sky-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Cuenta Gmail (Más fácil)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                    Recomendado
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Envía directo desde Gmail con el archivo Word adjunto.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCanalEnvio('smtp')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  canalEnvio === 'smtp'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Servidor Interno (SMTP)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                    Alterno
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Envío automático usando el servidor configurado de correo.
                </p>
              </button>
            </div>
          </div>

          {/* Alerta de Error Operacional Detallado (si ocurrió) */}
          {errorDetallado && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs space-y-2 animate-fadeIn shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-rose-100">
                    No se pudo enviar el correo:
                  </span>
                  <p className="text-rose-200 leading-relaxed font-mono text-[11px]">{errorDetallado}</p>
                </div>
              </div>

              {missingVars.length > 0 && canalEnvio === 'smtp' && (
                <div className="mt-2 pt-2 border-t border-rose-800/60 bg-rose-950/50 p-2.5 rounded-xl space-y-1">
                  <span className="font-bold text-rose-200 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-rose-300" />
                    Falta configurar estos datos en el servidor de correo:
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-rose-300 space-y-0.5 font-mono">
                    {missingVars.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-rose-300/80 pt-1">
                    Consejo: Es más fácil elegir &quot;Cuenta Gmail&quot; arriba y conectar tu correo en un clic.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Banner de Éxito Real Verificado */}
          {resultadoEnvio && resultadoEnvio.success && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs space-y-2 animate-fadeIn shadow-lg">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-100 text-sm">
                    ¡Correo enviado con éxito!
                  </h4>
                  <p className="text-emerald-200 leading-relaxed">
                    El mensaje salió correctamente ({canalEnvio === 'gmail' ? 'por Gmail' : 'por el servidor de correo'}) hacia{' '}
                    <strong className="text-white">{correoTrabajador}</strong>.
                  </p>
                  {resultadoEnvio.trackingCode && (
                    <p className="text-[11px] font-mono text-emerald-300">
                      Código de seguimiento: {resultadoEnvio.trackingCode}
                    </p>
                  )}
                  {resultadoEnvio.details && (
                    <p className="text-[10px] text-emerald-400/90 pt-0.5">
                      {resultadoEnvio.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ficha Resumen del Elemento a Enviar */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Cargo o documento seleccionado:</span>
              </span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                {tituloEntidad}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-orange-400" />
                <span>Archivo Word (.docx) que va adjunto:</span>
              </span>
              <span className="font-mono text-[11px] text-orange-300 bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-500/30">
                {nombreDocumentoAdjunto}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-purple-400" />
                <span>Correo desde el que sale:</span>
              </span>
              <span className="font-mono text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {canalEnvio === 'gmail' && googleUser?.email ? googleUser.email : CUENTA_INSTITUCIONAL}
              </span>
            </div>
          </div>

          {/* Datos del Destinatario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nombre del trabajador que recibe:
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  disabled={estadoOperacional === 'Enviando'}
                  value={nombreTrabajador}
                  onChange={(e) => setNombreTrabajador(e.target.value)}
                  placeholder="Ej. Juan Pérez - Operario de Frito"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Correo electrónico del trabajador: <span className="text-orange-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  disabled={estadoOperacional === 'Enviando'}
                  value={correoTrabajador}
                  onChange={(e) => setCorreoTrabajador(e.target.value)}
                  placeholder="trabajador@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Asunto del Correo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Título o asunto del correo:
            </label>
            <input
              type="text"
              disabled={estadoOperacional === 'Enviando'}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-medium disabled:opacity-60"
            />
          </div>

          {/* Cuerpo del Correo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Mensaje para el trabajador:
              </label>
              <span className="text-[10px] text-slate-400">Explica paso a paso cómo firmar y responder</span>
            </div>
            <textarea
              rows={6}
              disabled={estadoOperacional === 'Enviando'}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-orange-500 font-sans leading-relaxed resize-none disabled:opacity-60"
            />
          </div>

          {/* Footer de Acciones */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetModal}
              disabled={estadoOperacional === 'Enviando'}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              {resultadoEnvio && resultadoEnvio.success ? 'Cerrar' : 'Cancelar'}
            </button>

            <div className="flex items-center gap-2">
              {estadoOperacional === 'Error en el envío' && (
                <button
                  type="button"
                  onClick={() => ejecutarEnvioReal()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Intentar de nuevo</span>
                </button>
              )}

              {!(resultadoEnvio && resultadoEnvio.success) && (
                <button
                  type="submit"
                  disabled={estadoOperacional === 'Enviando'}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {estadoOperacional === 'Enviando' ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{generandoAdjunto ? 'Preparando archivo Word...' : 'Enviando correo...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>
                        Enviar por {canalEnvio === 'gmail' ? 'Gmail' : 'Servidor'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
