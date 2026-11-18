// ============================================================================
// SERVICIO DE AUTENTICACIÓN GOOGLE WORKSPACE / GMAIL API (FIREBASE AUTH)
// Frikaz S.A.S. — Sistema de Gestión SG-SST
// ============================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializar o reutilizar instancia de Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Scopes de Gmail autorizados (preservados)
export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.labels',
];

// Scopes de Google Drive y Google Sheets autorizados
export const DRIVE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// Lista unificada de scopes de Google Workspace
export const GOOGLE_WORKSPACE_SCOPES = [
  ...GMAIL_SCOPES,
  ...DRIVE_SHEETS_SCOPES,
];

export const CUENTA_OBJETIVO_GMAIL = 'frikaz.fritosnacks@gmail.com';

const createGoogleProvider = (loginHint?: string) => {
  const p = new GoogleAuthProvider();
  GOOGLE_WORKSPACE_SCOPES.forEach((scope) => p.addScope(scope));
  const customParams: Record<string, string> = {
    prompt: 'select_account',
  };
  if (loginHint) {
    customParams.login_hint = loginHint;
  }
  p.setCustomParameters(customParams);
  return p;
};

// Variables en memoria para caché seguro de token (NUNCA en localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

type TokenListener = (user: User | null, token: string | null) => void;
const tokenListeners = new Set<TokenListener>();

const notifyTokenListeners = () => {
  tokenListeners.forEach((cb) => {
    try {
      cb(cachedUser, cachedAccessToken);
    } catch (e) {
      console.error('Error en token listener:', e);
    }
  });
};

export const subscribeTokenChange = (listener: TokenListener): (() => void) => {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
};

// Escuchador de estado de autenticación
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
    notifyTokenListeners();
  });
};

/**
 * Iniciar sesión con Google para acceder a Workspace APIs (Gmail, Drive, Sheets)
 * Se puede especificar loginHint (por defecto frikaz.fritosnacks@gmail.com)
 */
export const googleSignIn = async (
  loginHint: string = CUENTA_OBJETIVO_GMAIL
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const providerWithHint = createGoogleProvider(loginHint);
    const result = await signInWithPopup(auth, providerWithHint);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se recibió el token de acceso de Google OAuth');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyTokenListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error durante inicio de sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Cambiar cuenta de Google: Cierra la sesión activa y abre el selector
 * sugiriendo directamente frikaz.fritosnacks@gmail.com
 */
export const switchGoogleAccount = async (
  targetEmail: string = CUENTA_OBJETIVO_GMAIL
): Promise<{ user: User; accessToken: string } | null> => {
  await logoutGoogle();
  return await googleSignIn(targetEmail);
};

/**
 * Obtener token de acceso en memoria
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Obtener usuario actual en memoria
 */
export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

/**
 * Cerrar sesión de Google
 */
export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyTokenListeners();
};
