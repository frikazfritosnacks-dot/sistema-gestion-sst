import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  CUENTA_OBJETIVO_GMAIL,
  getCurrentGoogleUser,
  googleSignIn,
  logoutGoogle,
  subscribeTokenChange,
  switchGoogleAccount,
} from './gmailAuthService';
import { GAME_IMAGES } from './gameAssets';

// ============================================================================
// CONTROL CENTRALIZADO DE ESTADOS Y ACCESO DE GERENCIA POR CORREO — FRIKAZ S.A.S.
// Solo los 6 estados permitidos en toda la herramienta:
//   1. Por hacer
//   2. En proceso
//   3. Pendiente de revisión
//   4. Devuelto para ajustes  (Exclusivo Gerente)
//   5. Cumplido               (Exclusivo Gerente tras revisión)
//   6. Aprobado               (Exclusivo Gerente tras aprobación explícita)
// ============================================================================

export type EstadoEstandarFrikaz =
  | 'Por hacer'
  | 'En proceso'
  | 'Pendiente de revisión'
  | 'Devuelto para ajustes'
  | 'Cumplido'
  | 'Aprobado';

export const ESTADOS_ESTANDAR_FRIKAZ: readonly EstadoEstandarFrikaz[] = [
  'Por hacer',
  'En proceso',
  'Pendiente de revisión',
  'Devuelto para ajustes',
  'Cumplido',
  'Aprobado',
] as const;

export const ESTADOS_TRABAJADOR_FRIKAZ: readonly EstadoEstandarFrikaz[] = [
  'Por hacer',
  'En proceso',
  'Pendiente de revisión',
] as const;

export const ESTADOS_EXCLUSIVOS_GERENTE: readonly EstadoEstandarFrikaz[] = [
  'Devuelto para ajustes',
  'Cumplido',
  'Aprobado',
] as const;

export type ResultadoRevisionGerente =
  | 'Aprobado'
  | 'Cumplido'
  | 'Devuelto para ajustes';

export interface RegistroRevisionGerente {
  fechaRevision: string;
  revisadoPor: string;
  resultadoRevision: ResultadoRevisionGerente;
  observaciones: string;
}

const LEGACY_STORAGE_KEY_GERENTE_AUTH = 'frikaz_gerente_autorizado_v1';
export const EVENT_GERENTE_UPDATED = 'frikaz:gerente-session-updated';
const EVENT_OPEN_GERENTE_MODAL = 'frikaz:open-gerente-modal';

export const NOMBRE_GERENTE_OFICIAL = 'Andrea Orjuela – Gerente';
export const CARGO_GERENTE_OFICIAL = 'Gerente';
export const CORREO_GERENTE_AUTORIZADO = CUENTA_OBJETIVO_GMAIL.trim().toLowerCase();

// Limpiar rastro antiguo de clave local para que nunca otorgue acceso por localStorage
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_STORAGE_KEY_GERENTE_AUTH);
  }
} catch {
  // noop
}

export function esUsuarioGerenteFirebase(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  const emailNorm = user.email.trim().toLowerCase();
  return emailNorm === CORREO_GERENTE_AUTORIZADO && user.emailVerified !== false;
}

export function esEstadoExclusivoGerente(estado?: string | null): boolean {
  if (!estado) return false;
  const norm = normalizarEstadoEstandar(estado);
  return (
    norm === 'Cumplido' ||
    norm === 'Aprobado' ||
    norm === 'Devuelto para ajustes'
  );
}

/**
 * Convierte cualquier código interno o heredado de la aplicación a uno de los
 * 6 estados estándar visibles para el equipo de Frikaz S.A.S.
 */
export function normalizarEstadoEstandar(estado?: string | null): EstadoEstandarFrikaz {
  if (!estado) return 'Por hacer';
  const clean = estado.trim();
  const upper = clean.toUpperCase();

  if (clean === 'Por hacer') return 'Por hacer';
  if (clean === 'En proceso') return 'En proceso';
  if (clean === 'Pendiente de revisión') return 'Pendiente de revisión';
  if (clean === 'Devuelto para ajustes') return 'Devuelto para ajustes';
  if (clean === 'Cumplido') return 'Cumplido';
  if (clean === 'Aprobado') return 'Aprobado';

  if (upper === 'APROBADO' || upper === 'APROBADA' || upper === 'VIGENTE') {
    return 'Aprobado';
  }
  if (
    upper === 'CUMPLIDO' ||
    upper === 'CUMPLIDA' ||
    upper === 'CUMPLE' ||
    upper === 'CUMPLE_VERIFICADO' ||
    upper === 'CERRADO' ||
    upper === 'CERRADA'
  ) {
    return 'Cumplido';
  }
  if (
    upper === 'DEVUELTO_AJUSTES' ||
    upper === 'DEVUELTA' ||
    upper === 'DEVUELTA_CORRECCION' ||
    upper === 'REQUIERE_CORRECCION' ||
    upper === 'REQUIERE CORRECCIÓN' ||
    upper === 'RECHAZADA' ||
    upper === 'REQUIERE_MEJORA'
  ) {
    return 'Devuelto para ajustes';
  }
  if (
    upper === 'PENDIENTE_REVISION' ||
    upper === 'REQUIERE_REVISION' ||
    upper === 'EN_REVISION' ||
    upper === 'PENDIENTE DE APROBACIÓN' ||
    upper === 'PENDIENTE_APROBACION'
  ) {
    return 'Pendiente de revisión';
  }
  if (
    upper === 'EN_PROCESO' ||
    upper === 'PARCIAL' ||
    upper === 'RECIBIDO' ||
    upper === 'FALTA_SOPORTE'
  ) {
    return 'En proceso';
  }

  return 'Por hacer';
}

export function getBadgeClassesEstadoFrikaz(estadoRaw?: string | null): {
  label: EstadoEstandarFrikaz;
  light: string;
  dark: string;
  dot: string;
  descripcionCorta: string;
} {
  const label = normalizarEstadoEstandar(estadoRaw);
  switch (label) {
    case 'Aprobado':
      return {
        label,
        light: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dot: 'bg-emerald-500',
        descripcionCorta: 'Aprobado por Gerencia tras revisar el soporte o documento.',
      };
    case 'Cumplido':
      return {
        label,
        light: 'bg-teal-100 text-teal-800 border-teal-300',
        dark: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        dot: 'bg-teal-500',
        descripcionCorta: 'Verificado y cerrado como Cumplido por Gerencia.',
      };
    case 'Devuelto para ajustes':
      return {
        label,
        light: 'bg-rose-100 text-rose-800 border-rose-300',
        dark: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dot: 'bg-rose-500',
        descripcionCorta: 'Gerencia pidió corregir o completar el soporte antes de aprobar.',
      };
    case 'Pendiente de revisión':
      return {
        label,
        light: 'bg-amber-100 text-amber-800 border-amber-300',
        dark: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-500',
        descripcionCorta: 'Ya tiene avances o soportes; falta que Gerencia lo revise.',
      };
    case 'En proceso':
      return {
        label,
        light: 'bg-sky-100 text-sky-800 border-sky-300',
        dark: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        dot: 'bg-sky-500',
        descripcionCorta: 'El equipo está trabajando en esta tarea.',
      };
    case 'Por hacer':
    default:
      return {
        label: 'Por hacer',
        light: 'bg-slate-100 text-slate-700 border-slate-300',
        dark: 'bg-slate-700/60 text-slate-300 border-slate-600',
        dot: 'bg-slate-400',
        descripcionCorta: 'Pendiente por iniciar.',
      };
  }
}

export interface SesionGerenteEstado {
  autorizado: boolean;
  nombre: string;
  correo: string;
  fechaActivacion: string;
  avatarUrl: string;
}

export function getSesionGerente(): SesionGerenteEstado {
  const user = getCurrentGoogleUser();
  const autorizado = esUsuarioGerenteFirebase(user);
  return {
    autorizado,
    nombre: NOMBRE_GERENTE_OFICIAL,
    correo: user?.email || '',
    fechaActivacion: autorizado ? user?.metadata?.lastSignInTime || new Date().toISOString() : '',
    avatarUrl: GAME_IMAGES.avatars.gerente.jpg,
  };
}

export function esGerenteAutorizado(): boolean {
  return esUsuarioGerenteFirebase(getCurrentGoogleUser());
}

function dispatchGerenteUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_GERENTE_UPDATED, { detail: getSesionGerente() }));
  }
}

export async function ingresarConCorreoGerente(): Promise<{
  ok: boolean;
  emailIncorrecto?: string;
  mensaje: string;
}> {
  try {
    const res = await googleSignIn(CORREO_GERENTE_AUTORIZADO);
    if (!res?.user) {
      return {
        ok: false,
        mensaje: 'No se completó el ingreso con Google. Intenta nuevamente.',
      };
    }

    const emailAutenticado = (res.user.email || '').trim().toLowerCase();
    if (!esUsuarioGerenteFirebase(res.user)) {
      dispatchGerenteUpdated();
      return {
        ok: false,
        emailIncorrecto: res.user.email || emailAutenticado,
        mensaje: `Ingresaste con "${res.user.email || 'otra cuenta'}", pero solo el correo oficial de Gerencia (${CORREO_GERENTE_AUTORIZADO}) tiene permiso para editar toda la herramienta.`,
      };
    }

    dispatchGerenteUpdated();
    return {
      ok: true,
      mensaje: `Bienvenida, ${NOMBRE_GERENTE_OFICIAL}. Tu cuenta quedó verificada con acceso completo para editar toda la herramienta.`,
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        ok: false,
        mensaje: 'Se cerró la ventana de Google antes de completar el ingreso.',
      };
    }
    return {
      ok: false,
      mensaje:
        err?.message || 'No fue posible verificar la cuenta de correo de Gerencia. Intenta de nuevo.',
    };
  }
}

export async function cambiarCuentaCorreoGerente(): Promise<{
  ok: boolean;
  emailIncorrecto?: string;
  mensaje: string;
}> {
  try {
    const res = await switchGoogleAccount(CORREO_GERENTE_AUTORIZADO);
    if (!res?.user) {
      return {
        ok: false,
        mensaje: 'No se seleccionó una cuenta de Google.',
      };
    }
    if (!esUsuarioGerenteFirebase(res.user)) {
      dispatchGerenteUpdated();
      return {
        ok: false,
        emailIncorrecto: res.user.email || '',
        mensaje: `El correo "${res.user.email}" no corresponde a Gerencia (${CORREO_GERENTE_AUTORIZADO}).`,
      };
    }
    dispatchGerenteUpdated();
    return {
      ok: true,
      mensaje: `Bienvenida, ${NOMBRE_GERENTE_OFICIAL}. Acceso de edición completo activado.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      mensaje: err?.message || 'No se pudo cambiar la cuenta de Google.',
    };
  }
}

export async function cerrarSesionGerente(): Promise<void> {
  try {
    await logoutGoogle();
  } catch (err) {
    console.error('Error cerrando sesión de Gerencia:', err);
  } finally {
    dispatchGerenteUpdated();
  }
}

export function abrirModalAccesoGerente(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_OPEN_GERENTE_MODAL));
  }
}

export function crearRegistroRevisionGerente(
  resultadoRevision: ResultadoRevisionGerente,
  observaciones?: string
): RegistroRevisionGerente {
  return {
    fechaRevision: new Date().toISOString().split('T')[0],
    revisadoPor: NOMBRE_GERENTE_OFICIAL,
    resultadoRevision,
    observaciones:
      observaciones?.trim() ||
      (resultadoRevision === 'Aprobado'
        ? 'Revisado y aprobado por Andrea Orjuela – Gerente.'
        : resultadoRevision === 'Cumplido'
          ? 'Verificado en planta y marcado como Cumplido por Andrea Orjuela – Gerente.'
          : 'Devuelto por Andrea Orjuela – Gerente para ajustes antes de su aprobación final.'),
  };
}

export function useGerenteAutorizado() {
  const [sesion, setSesion] = useState<SesionGerenteEstado>(() => getSesionGerente());
  const [usuarioGoogle, setUsuarioGoogle] = useState<User | null>(() => getCurrentGoogleUser());

  useEffect(() => {
    const sync = () => {
      setUsuarioGoogle(getCurrentGoogleUser());
      setSesion(getSesionGerente());
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUsuarioGoogle(user);
      setSesion(getSesionGerente());
      dispatchGerenteUpdated();
    });

    const unsubToken = subscribeTokenChange(() => {
      sync();
    });

    window.addEventListener(EVENT_GERENTE_UPDATED, sync);
    window.addEventListener('storage', sync);
    return () => {
      unsubAuth();
      unsubToken();
      window.removeEventListener(EVENT_GERENTE_UPDATED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const ingresar = useCallback(async () => {
    const res = await ingresarConCorreoGerente();
    setUsuarioGoogle(getCurrentGoogleUser());
    setSesion(getSesionGerente());
    return res;
  }, []);

  const cambiarCuenta = useCallback(async () => {
    const res = await cambiarCuentaCorreoGerente();
    setUsuarioGoogle(getCurrentGoogleUser());
    setSesion(getSesionGerente());
    return res;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionGerente();
    setUsuarioGoogle(getCurrentGoogleUser());
    setSesion(getSesionGerente());
  }, []);

  return {
    esGerente: sesion.autorizado,
    nombreGerente: NOMBRE_GERENTE_OFICIAL,
    correoAutorizado: CORREO_GERENTE_AUTORIZADO,
    correoAutenticado: usuarioGoogle?.email || sesion.correo || '',
    avatarGerente: GAME_IMAGES.avatars.gerente.jpg,
    fechaActivacion: sesion.fechaActivacion,
    usuarioGoogle,
    ingresarConCorreoGerente: ingresar,
    cambiarCuentaCorreoGerente: cambiarCuenta,
    cerrarSesionGerente: cerrarSesion,
    solicitarAccesoGerente: abrirModalAccesoGerente,
  };
}

export const EVENT_GERENTE_MODAL = EVENT_OPEN_GERENTE_MODAL;
