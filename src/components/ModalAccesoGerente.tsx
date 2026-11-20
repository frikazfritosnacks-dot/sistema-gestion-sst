import React, { useEffect, useState } from 'react';
import {
  CORREO_GERENTE_AUTORIZADO,
  EVENT_GERENTE_MODAL,
  NOMBRE_GERENTE_OFICIAL,
  useGerenteAutorizado,
} from '../services/gerenteControlService';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Mail,
  LogOut,
  RefreshCw,
} from 'lucide-react';

export const ModalAccesoGerente: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const {
    esGerente,
    nombreGerente,
    correoAutenticado,
    avatarGerente,
    fechaActivacion,
    ingresarConCorreoGerente,
    cambiarCuentaCorreoGerente,
    cerrarSesionGerente,
  } = useGerenteAutorizado();

  useEffect(() => {
    const handleOpen = () => {
      setFeedback(null);
      setIsOpen(true);
    };
    window.addEventListener(EVENT_GERENTE_MODAL, handleOpen);
    return () => window.removeEventListener(EVENT_GERENTE_MODAL, handleOpen);
  }, []);

  if (!isOpen) return null;

  const handleIngresarGoogle = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await ingresarConCorreoGerente();
    setLoading(false);
    if (res.ok) {
      setFeedback({ tipo: 'ok', texto: res.mensaje });
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
      }, 950);
    } else {
      setFeedback({ tipo: 'error', texto: res.mensaje });
    }
  };

  const handleCambiarCuenta = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await cambiarCuentaCorreoGerente();
    setLoading(false);
    if (res.ok) {
      setFeedback({ tipo: 'ok', texto: res.mensaje });
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
      }, 950);
    } else {
      setFeedback({ tipo: 'error', texto: res.mensaje });
    }
  };

  const handleCerrarSesion = async () => {
    setLoading(true);
    await cerrarSesionGerente();
    setLoading(false);
    setFeedback({
      tipo: 'ok',
      texto: 'Se cerró la sesión de Gerencia. La herramienta quedó en modo de consulta para colaboradores.',
    });
  };

  const tieneOtroCorreoActivo = Boolean(
    correoAutenticado &&
      correoAutenticado.trim().toLowerCase() !== CORREO_GERENTE_AUTORIZADO
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header con Avatar Ilustrado de Andrea Orjuela */}
        <div className="bg-[#0f172a] text-white px-5 py-4 border-b-4 border-[#f97316] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={avatarGerente}
              alt={NOMBRE_GERENTE_OFICIAL}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover border-2 border-[#f97316] shrink-0 bg-slate-800"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-tight truncate">
                {NOMBRE_GERENTE_OFICIAL}
              </h3>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 text-[#f97316] shrink-0" />
                <span className="truncate">{CORREO_GERENTE_AUTORIZADO}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 leading-relaxed">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#f97316]" />
              <span>Ingreso de Gerencia con correo electrónico</span>
            </p>
            <p className="text-slate-600">
              Para editar actividades, riesgos, configuraciones, parámetros, normas o aprobar documentos en toda la herramienta, inicia sesión con la cuenta autorizada de Gerencia:
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-900">
              <Mail className="h-3.5 w-3.5 text-[#f97316]" />
              <span>{CORREO_GERENTE_AUTORIZADO}</span>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl p-3 border flex items-start gap-2 font-medium ${
                feedback.tipo === 'ok'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.texto}</span>
            </div>
          )}

          {esGerente ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                <img
                  src={avatarGerente}
                  alt={nombreGerente}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover border-2 border-emerald-500 shrink-0 bg-slate-800"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-black">
                    <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Sesión de Gerencia verificada</span>
                  </div>
                  <p className="text-emerald-900 font-bold truncate">{nombreGerente}</p>
                  <p className="text-[11px] text-emerald-800 truncate">{correoAutenticado}</p>
                  {fechaActivacion && (
                    <p className="text-[10px] text-emerald-700">
                      Edición completa habilitada en toda la herramienta
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCerrarSesion}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 font-bold hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Cerrar sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Continuar editando
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {tieneOtroCorreoActivo && (
                <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Cuenta sin permisos de Gerencia</p>
                    <p className="text-[11px] mt-0.5">
                      Actualmente está conectada la cuenta <strong>{correoAutenticado}</strong>. Cambia a{' '}
                      <strong>{CORREO_GERENTE_AUTORIZADO}</strong> para editar toda la herramienta.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={tieneOtroCorreoActivo ? handleCambiarCuenta : handleIngresarGoogle}
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 48 48">
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
                  )}
                  <span>
                    {loading
                      ? 'Verificando correo...'
                      : tieneOtroCorreoActivo
                        ? `Cambiar a ${CORREO_GERENTE_AUTORIZADO}`
                        : 'Ingresar con correo de Gerencia'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Seguir en vista de consulta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
