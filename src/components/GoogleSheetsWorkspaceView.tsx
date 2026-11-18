import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { NormaPhvaItem } from '../types/phvaEvidence';
import { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';
import {
  getAccessToken,
  getCurrentGoogleUser,
  googleSignIn,
  initAuth,
  subscribeTokenChange,
  CUENTA_OBJETIVO_GMAIL,
} from '../services/gmailAuthService';
import {
  DriveSpreadsheetFile,
  SpreadsheetMetadata,
  listDriveSpreadsheets,
  getSpreadsheetMetadata,
  readSheetValues,
  createFrikazWorkbookInSheets,
  overwriteSheetTab,
  appendSheetRows,
  updateSingleSheetCell,
  trashDriveSpreadsheet,
  normasPhvaToSheetRows,
  riesgosGtc45ToSheetRows,
  parseNormasFromSheetRows,
} from '../services/googleSheetsService';
import { loadStoredRisks } from '../services/riskMatrixStorage';
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  ExternalLink,
  Plus,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Table as TableIcon,
  FolderOpen,
  ShieldAlert,
  Layers,
  X,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsWorkspaceViewProps {
  normas: NormaPhvaItem[];
  onImportNormas?: (imported: NormaPhvaItem[]) => void;
}

type PendingMutationAction =
  | {
      type: 'CREATE_WORKBOOK';
      title: string;
      includeNormas: boolean;
      includeRiesgos: boolean;
      summary: string;
      details: string[];
    }
  | {
      type: 'OVERWRITE_TAB';
      spreadsheetId: string;
      spreadsheetTitle: string;
      sheetTitle: string;
      datasetKind: 'normas' | 'riesgos';
      rows: (string | number | boolean)[][];
      summary: string;
      details: string[];
    }
  | {
      type: 'UPDATE_CELL';
      spreadsheetId: string;
      spreadsheetTitle: string;
      sheetTitle: string;
      cellA1: string;
      oldValue: string;
      newValue: string;
      summary: string;
      details: string[];
    }
  | {
      type: 'APPEND_ROW';
      spreadsheetId: string;
      spreadsheetTitle: string;
      sheetTitle: string;
      rowValues: string[];
      summary: string;
      details: string[];
    }
  | {
      type: 'TRASH_FILE';
      fileId: string;
      fileName: string;
      summary: string;
      details: string[];
    }
  | {
      type: 'IMPORT_TO_APP';
      spreadsheetTitle: string;
      sheetTitle: string;
      parsedNormas: NormaPhvaItem[];
      summary: string;
      details: string[];
    };

function colIndexToLetter(colIdx: number): string {
  let letter = '';
  let n = colIdx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export const GoogleSheetsWorkspaceView: React.FC<GoogleSheetsWorkspaceViewProps> = ({
  normas,
  onImportNormas,
}) => {
  // Auth State
  const [user, setUser] = useState<User | null>(getCurrentGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Drive & Spreadsheet Explorer State
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [manualIdInput, setManualIdInput] = useState('');

  // Selected Spreadsheet & Active Tab
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Create / Sync Controls
  const [newWorkbookTitle, setNewWorkbookTitle] = useState(
    `Frikaz S.A.S. — Matriz Integral SG-SST (${new Date().toISOString().split('T')[0]})`
  );
  const [includeNormas, setIncludeNormas] = useState(true);
  const [includeRiesgos, setIncludeRiesgos] = useState(true);

  // Inline Cell Edit & Append Row
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; value: string; original: string } | null>(
    null
  );
  const [newRowInputs, setNewRowInputs] = useState<string[]>([]);
  const [showAddRowForm, setShowAddRowForm] = useState(false);

  // Confirmation Modal & Feedback
  const [pendingAction, setPendingAction] = useState<PendingMutationAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(
    null
  );

  // Load GTC 45 Risks from persistent storage
  const riesgos = useMemo<RiesgoGTC45Item[]>(() => loadStoredRisks(), []);

  // Load Drive spreadsheets
  const fetchDriveFiles = useCallback(async (search?: string) => {
    setLoadingDrive(true);
    try {
      const files = await listDriveSpreadsheets(search);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error cargando hojas de Drive:', err);
      if (err.message?.includes('AUTH_')) {
        setHasToken(false);
      }
      setStatusMessage({ type: 'error', text: err.message || 'No se pudieron listar los archivos de Drive.' });
    } finally {
      setLoadingDrive(false);
    }
  }, []);

  // Open a spreadsheet by ID/URL -> ALWAYS fetch metadata first to list real tabs
  const handleOpenSpreadsheet = useCallback(async (idOrUrl: string, preferredTab?: string) => {
    if (!idOrUrl.trim()) return;
    setLoadingSheet(true);
    setStatusMessage(null);
    setEditingCell(null);
    setShowAddRowForm(false);
    try {
      const metadata = await getSpreadsheetMetadata(idOrUrl);
      setSelectedSpreadsheet(metadata);
      const tabToOpen =
        preferredTab && metadata.sheets.some((s) => s.title === preferredTab)
          ? preferredTab
          : metadata.sheets[0]?.title || '';
      setSelectedSheetTitle(tabToOpen);

      if (tabToOpen) {
        const result = await readSheetValues(metadata.spreadsheetId, tabToOpen);
        setSheetRows(result.values);
      } else {
        setSheetRows([]);
      }
    } catch (err: any) {
      console.error('Error abriendo Google Sheet:', err);
      if (err.message?.includes('AUTH_')) {
        setHasToken(false);
      }
      setStatusMessage({ type: 'error', text: err.message || 'No se pudo abrir la hoja de cálculo.' });
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  // Switch active tab inside currently opened spreadsheet
  const handleSelectTab = useCallback(
    async (tabTitle: string) => {
      if (!selectedSpreadsheet) return;
      setSelectedSheetTitle(tabTitle);
      setLoadingSheet(true);
      setEditingCell(null);
      setShowAddRowForm(false);
      try {
        const result = await readSheetValues(selectedSpreadsheet.spreadsheetId, tabTitle);
        setSheetRows(result.values);
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || `Error al leer la pestaña "${tabTitle}".` });
      } finally {
        setLoadingSheet(false);
      }
    },
    [selectedSpreadsheet]
  );

  // Sync Firebase Auth & in-memory token state
  useEffect(() => {
    const syncToken = async () => {
      const token = await getAccessToken();
      const currentUser = getCurrentGoogleUser();
      setUser(currentUser);
      setHasToken(Boolean(token));
      if (token) {
        fetchDriveFiles();
      }
    };

    syncToken();

    const unsubInit = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setHasToken(Boolean(token));
        if (token) fetchDriveFiles();
      },
      () => {
        setHasToken(false);
      }
    );

    const unsubToken = subscribeTokenChange((authUser, token) => {
      setUser(authUser);
      setHasToken(Boolean(token));
      if (token) {
        fetchDriveFiles();
      } else {
        setDriveFiles([]);
        setSelectedSpreadsheet(null);
        setSheetRows([]);
      }
    });

    return () => {
      unsubInit();
      unsubToken();
    };
  }, [fetchDriveFiles]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn(CUENTA_OBJETIVO_GMAIL);
      if (res?.accessToken) {
        setUser(res.user);
        setHasToken(true);
        await fetchDriveFiles();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo completar el inicio de sesión con Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Request confirmations for mutating operations
  const requestCreateWorkbook = () => {
    if (!includeNormas && !includeRiesgos) {
      setStatusMessage({ type: 'error', text: 'Selecciona al menos una matriz para exportar a Google Sheets.' });
      return;
    }
    const sheetsList = ['Inicio_Indicadores (con fórmulas COUNTIF/COUNTA)'];
    if (includeNormas) sheetsList.push(`Matriz_Legal_PHVA (${normas.length} obligaciones)`);
    if (includeRiesgos) sheetsList.push(`Matriz_Riesgos_GTC45 (${riesgos.length} peligros)`);

    setPendingAction({
      type: 'CREATE_WORKBOOK',
      title: newWorkbookTitle.trim() || 'Frikaz S.A.S. — Matriz SG-SST',
      includeNormas,
      includeRiesgos,
      summary: `¿Crear una nueva hoja de cálculo "${newWorkbookTitle.trim()}" en tu Google Drive?`,
      details: [
        `Archivo nuevo en Google Drive (${user?.email || 'tu cuenta'})`,
        `Pestañas a crear: ${sheetsList.join(' • ')}`,
        'Se aplicará formato corporativo Frikaz y fórmulas nativas de Google Sheets.',
      ],
    });
  };

  const requestOverwriteTab = (datasetKind: 'normas' | 'riesgos') => {
    if (!selectedSpreadsheet || !selectedSheetTitle) return;
    const rows =
      datasetKind === 'normas' ? normasPhvaToSheetRows(normas) : riesgosGtc45ToSheetRows(riesgos);
    const label = datasetKind === 'normas' ? 'Matriz Legal PHVA' : 'Matriz de Riesgos GTC 45';

    setPendingAction({
      type: 'OVERWRITE_TAB',
      spreadsheetId: selectedSpreadsheet.spreadsheetId,
      spreadsheetTitle: selectedSpreadsheet.title,
      sheetTitle: selectedSheetTitle,
      datasetKind,
      rows,
      summary: `¿Sobrescribir el contenido de la pestaña "${selectedSheetTitle}" en "${selectedSpreadsheet.title}"?`,
      details: [
        `Se limpiarán los datos actuales en la pestaña "${selectedSheetTitle}" (rango A:AZ).`,
        `Se escribirán ${rows.length} filas de ${label} (incluyendo encabezado).`,
        'Esta acción modifica directamente el archivo en tu Google Drive.',
      ],
    });
  };

  const requestUpdateCell = () => {
    if (!editingCell || !selectedSpreadsheet || !selectedSheetTitle) return;
    const cellA1 = `${colIndexToLetter(editingCell.col)}${editingCell.row + 1}`;
    setPendingAction({
      type: 'UPDATE_CELL',
      spreadsheetId: selectedSpreadsheet.spreadsheetId,
      spreadsheetTitle: selectedSpreadsheet.title,
      sheetTitle: selectedSheetTitle,
      cellA1,
      oldValue: editingCell.original,
      newValue: editingCell.value,
      summary: `¿Actualizar la celda ${cellA1} en "${selectedSheetTitle}"?`,
      details: [
        `Hoja de cálculo: ${selectedSpreadsheet.title}`,
        `Valor anterior: "${editingCell.original || '(vacío)'}"`,
        `Nuevo valor: "${editingCell.value}"`,
      ],
    });
  };

  const requestAppendRow = () => {
    if (!selectedSpreadsheet || !selectedSheetTitle) return;
    const cleaned = newRowInputs.map((v) => v.trim());
    if (cleaned.every((v) => v === '')) {
      setStatusMessage({ type: 'error', text: 'Ingresa al menos un valor antes de agregar la fila.' });
      return;
    }
    setPendingAction({
      type: 'APPEND_ROW',
      spreadsheetId: selectedSpreadsheet.spreadsheetId,
      spreadsheetTitle: selectedSpreadsheet.title,
      sheetTitle: selectedSheetTitle,
      rowValues: cleaned,
      summary: `¿Agregar una nueva fila al final de "${selectedSheetTitle}" en "${selectedSpreadsheet.title}"?`,
      details: [
        `Pestaña destino: ${selectedSheetTitle}`,
        `Columnas con datos: ${cleaned.filter(Boolean).length} de ${cleaned.length}`,
      ],
    });
  };

  const requestTrashFile = (file: DriveSpreadsheetFile) => {
    setPendingAction({
      type: 'TRASH_FILE',
      fileId: file.id,
      fileName: file.name,
      summary: `¿Enviar a la papelera de Google Drive el archivo "${file.name}"?`,
      details: [
        `Archivo: ${file.name}`,
        'El archivo se moverá a la papelera de tu Google Drive.',
      ],
    });
  };

  const requestImportToApp = () => {
    if (!selectedSpreadsheet || !selectedSheetTitle || sheetRows.length < 2) return;
    const parsed = parseNormasFromSheetRows(sheetRows);
    if (parsed.length === 0) {
      setStatusMessage({ type: 'error', text: 'No se encontraron filas válidas para importar en esta pestaña.' });
      return;
    }
    setPendingAction({
      type: 'IMPORT_TO_APP',
      spreadsheetTitle: selectedSpreadsheet.title,
      sheetTitle: selectedSheetTitle,
      parsedNormas: parsed,
      summary: `¿Importar ${parsed.length} normas desde "${selectedSheetTitle}" hacia la Matriz PHVA local de la app?`,
      details: [
        `Origen: ${selectedSpreadsheet.title} → ${selectedSheetTitle}`,
        `Registros detectados: ${parsed.length} obligaciones legales`,
        'Esto reemplazará la lista de normas PHVA activa en esta sesión de la aplicación.',
      ],
    });
  };

  // Execute confirmed mutation
  const executePendingAction = async () => {
    if (!pendingAction) return;
    setIsExecutingAction(true);
    setStatusMessage(null);
    try {
      if (pendingAction.type === 'CREATE_WORKBOOK') {
        const res = await createFrikazWorkbookInSheets({
          title: pendingAction.title,
          normas,
          riesgos,
          includeNormas: pendingAction.includeNormas,
          includeRiesgos: pendingAction.includeRiesgos,
        });
        setStatusMessage({
          type: 'success',
          text: `Libro creado en Google Sheets ("${res.title}") con ${res.totalRowsWritten} filas escritas.`,
          url: res.spreadsheetUrl,
        });
        await fetchDriveFiles(driveSearch);
        await handleOpenSpreadsheet(res.spreadsheetId, res.sheetsCreated[1] || res.sheetsCreated[0]);
      } else if (pendingAction.type === 'OVERWRITE_TAB') {
        const res = await overwriteSheetTab(
          pendingAction.spreadsheetId,
          pendingAction.sheetTitle,
          pendingAction.rows
        );
        setStatusMessage({
          type: 'success',
          text: `Pestaña "${pendingAction.sheetTitle}" actualizada con ${res.updatedRows} filas.`,
          url: selectedSpreadsheet?.spreadsheetUrl,
        });
        await handleSelectTab(pendingAction.sheetTitle);
      } else if (pendingAction.type === 'UPDATE_CELL') {
        await updateSingleSheetCell(
          pendingAction.spreadsheetId,
          pendingAction.sheetTitle,
          pendingAction.cellA1,
          pendingAction.newValue
        );
        setEditingCell(null);
        setStatusMessage({
          type: 'success',
          text: `Celda ${pendingAction.cellA1} actualizada en "${pendingAction.sheetTitle}".`,
        });
        await handleSelectTab(pendingAction.sheetTitle);
      } else if (pendingAction.type === 'APPEND_ROW') {
        await appendSheetRows(pendingAction.spreadsheetId, pendingAction.sheetTitle, [
          pendingAction.rowValues,
        ]);
        setShowAddRowForm(false);
        setNewRowInputs([]);
        setStatusMessage({
          type: 'success',
          text: `Nueva fila agregada correctamente a "${pendingAction.sheetTitle}".`,
        });
        await handleSelectTab(pendingAction.sheetTitle);
      } else if (pendingAction.type === 'TRASH_FILE') {
        await trashDriveSpreadsheet(pendingAction.fileId);
        if (selectedSpreadsheet?.spreadsheetId === pendingAction.fileId) {
          setSelectedSpreadsheet(null);
          setSheetRows([]);
        }
        setStatusMessage({
          type: 'success',
          text: `Archivo "${pendingAction.fileName}" enviado a la papelera de Google Drive.`,
        });
        await fetchDriveFiles(driveSearch);
      } else if (pendingAction.type === 'IMPORT_TO_APP') {
        if (onImportNormas) {
          onImportNormas(pendingAction.parsedNormas);
        }
        setStatusMessage({
          type: 'success',
          text: `Se importaron ${pendingAction.parsedNormas.length} obligaciones legales desde Google Sheets al sistema SG-SST.`,
        });
      }
      setPendingAction(null);
    } catch (err: any) {
      console.error('Error ejecutando acción en Google Sheets:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Ocurrió un error al ejecutar la operación en Google Sheets.',
      });
      setPendingAction(null);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Filtered rows for display (keeping original row index for accurate A1 cell editing)
  const indexedRows = useMemo(() => {
    const header = sheetRows[0] || [];
    const body = sheetRows.slice(1).map((cells, idx) => ({
      originalRowIndex: idx + 1,
      cells,
    }));
    const filtered = tableSearch.trim()
      ? body.filter((r) => r.cells.some((c) => c?.toLowerCase().includes(tableSearch.toLowerCase())))
      : body;
    return { header, rows: filtered };
  }, [sheetRows, tableSearch]);

  const maxCols = useMemo(() => {
    let max = indexedRows.header.length;
    indexedRows.rows.forEach((r) => {
      if (r.cells.length > max) max = r.cells.length;
    });
    return Math.max(max, 1);
  }, [indexedRows]);

  // ============================================================================
  // RENDER: AUTH REQUIRED STATE
  // ============================================================================
  if (!hasToken) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-8 text-white shadow-xl border border-emerald-500/30">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Integración Oficial Google Sheets &amp; Google Drive</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Conecta Google Sheets con el SG-SST de Frikaz S.A.S.
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Inicia sesión con tu cuenta de Google para explorar hojas de cálculo de Google Drive, leer pestañas en
              tiempo real y sincronizar la Matriz Legal PHVA ({normas.length} normas) y la Matriz de Riesgos GTC 45 (
              {riesgos.length} peligros) con fórmulas nativas.
            </p>

            {statusMessage?.type === 'error' && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs text-left flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col items-center gap-3">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#1f1f1f] text-sm font-semibold border border-[#747775]/40 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
                ) : (
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
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
                <span>{isSigningIn ? 'Conectando...' : 'Sign in with Google'}</span>
              </button>

              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>El acceso se solicita con tu permiso explícito y los tokens se mantienen solo en memoria.</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <FolderOpen className="h-5 w-5 text-emerald-400 mb-2" />
                <h3 className="text-xs font-bold text-white">Explorar Google Drive</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Busca y abre tus hojas de cálculo existentes o pega un enlace directo de Google Sheets.
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <UploadCloud className="h-5 w-5 text-orange-400 mb-2" />
                <h3 className="text-xs font-bold text-white">Sincronizar Matrices</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Crea un libro corporativo en Google Sheets con indicadores automáticos, Matriz PHVA y GTC 45.
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <Edit3 className="h-5 w-5 text-blue-400 mb-2" />
                <h3 className="text-xs font-bold text-white">Lectura y Edición Segura</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Visualiza pestañas reales, edita celdas o agrega filas siempre con confirmación explícita.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: AUTHENTICATED WORKSPACE VIEW
  // ============================================================================
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white shadow-xl border border-emerald-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black uppercase tracking-wider">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Google Sheets Conectado
              </span>
              {user?.email && (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono">
                  {user.email}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Centro de Sincronización Google Sheets — Frikaz S.A.S.
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Crea hojas de cálculo corporativas con fórmulas nativas, lee cualquier pestaña de tus archivos en Google
              Drive, edita celdas o importa normas hacia la plataforma.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchDriveFiles(driveSearch)}
              disabled={loadingDrive}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${loadingDrive ? 'animate-spin' : ''}`} />
              <span>Actualizar Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusMessage.url && (
              <a
                href={statusMessage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                <span>Abrir en Google Sheets</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* EXPORT / CREATE NEW WORKBOOK CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#0f172a]">
                Crear Libro Oficial de Frikaz S.A.S. en Google Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Genera un archivo nuevo en tu Google Drive con tablero de fórmulas automáticas (<code className="font-mono text-emerald-700">COUNTIF</code>, <code className="font-mono text-emerald-700">COUNTA</code>) y encabezados corporativos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5 space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Nombre del nuevo archivo en Google Drive</label>
            <input
              type="text"
              value={newWorkbookTitle}
              onChange={(e) => setNewWorkbookTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Frikaz S.A.S. — Matriz Integral SG-SST 2026"
            />
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center gap-4 pb-1.5">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNormas}
                onChange={(e) => setIncludeNormas(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Layers className="h-3.5 w-3.5 text-orange-500" />
              <span>Matriz Legal PHVA ({normas.length})</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRiesgos}
                onChange={(e) => setIncludeRiesgos(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <span>Riesgos GTC 45 ({riesgos.length})</span>
            </label>
          </div>

          <div className="lg:col-span-3 flex justify-end">
            <button
              onClick={requestCreateWorkbook}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm cursor-pointer transition-colors"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Crear en Google Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GRID: DRIVE EXPLORER (LEFT) + SHEET VIEWER / EDITOR (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: DRIVE FILE LIST & DIRECT URL */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 flex flex-col max-h-[700px]">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-600" />
              <span>Tus Hojas en Google Drive ({driveFiles.length})</span>
            </h3>

            {/* Search in Drive */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchDriveFiles(driveSearch);
              }}
              className="flex gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Buscar
              </button>
            </form>

            {/* Open by URL / ID */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">
                O abrir por enlace / ID de Google Sheets:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={manualIdInput}
                  onChange={(e) => setManualIdInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => handleOpenSpreadsheet(manualIdInput)}
                  disabled={!manualIdInput.trim() || loadingSheet}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                  title="Cargar hoja de cálculo"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingDrive ? (
              <div className="py-10 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-600" />
                <p>Consultando Google Drive...</p>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300">
                No se encontraron hojas de cálculo con ese filtro. Crea un libro arriba o pega un enlace de Google Sheets.
              </div>
            ) : (
              driveFiles.map((file) => {
                const isSelected = selectedSpreadsheet?.spreadsheetId === file.id;
                return (
                  <div
                    key={file.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleOpenSpreadsheet(file.id)}
                        className="text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate block" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        {file.modifiedTime && (
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Modificado: {new Date(file.modifiedTime).toLocaleDateString('es-CO')}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/60"
                            title="Abrir en Google Sheets"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => requestTrashFile(file)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Enviar a papelera de Drive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED SPREADSHEET TABS & LIVE DATA GRID */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[550px] max-h-[700px]">
          {!selectedSpreadsheet ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3 text-slate-500">
              <TableIcon className="h-12 w-12 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">Selecciona una hoja de cálculo de Google Drive</h3>
              <p className="text-xs max-w-md">
                Elige un archivo del panel izquierdo para consultar sus pestañas reales, visualizar sus filas, editar
                celdas o sincronizar las matrices de Frikaz S.A.S.
              </p>
            </div>
          ) : (
            <>
              {/* Spreadsheet Top Bar */}
              <div className="bg-[#0f172a] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                    <h3 className="text-sm font-black truncate" title={selectedSpreadsheet.title}>
                      {selectedSpreadsheet.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedSpreadsheet.sheets.length} pestaña(s) • Pestaña activa: <strong className="text-emerald-300">{selectedSheetTitle}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={selectedSpreadsheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    <span>Abrir en Sheets</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    onClick={() => handleSelectTab(selectedSheetTitle)}
                    disabled={loadingSheet}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingSheet ? 'animate-spin' : ''}`} />
                    <span>Recargar</span>
                  </button>
                </div>
              </div>

              {/* Real Sheet Tabs */}
              <div className="bg-slate-900 px-4 pt-2 border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
                {selectedSpreadsheet.sheets.map((tab) => (
                  <button
                    key={tab.sheetId}
                    onClick={() => handleSelectTab(tab.title)}
                    className={`px-3.5 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedSheetTitle === tab.title
                        ? 'bg-white text-[#0f172a] border-t-2 border-emerald-500'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>

              {/* Action Toolbar for Active Tab */}
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filtrar filas visibles..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const colCount = Math.max(maxCols, 4);
                      setNewRowInputs(Array(colCount).fill(''));
                      setShowAddRowForm((v) => !v);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Agregar Fila</span>
                  </button>

                  <button
                    onClick={() => requestOverwriteTab('normas')}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Escribir Matriz Legal PHVA actual en esta pestaña"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Volcar Matriz PHVA aquí</span>
                  </button>

                  <button
                    onClick={() => requestOverwriteTab('riesgos')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Escribir Matriz de Riesgos GTC 45 actual en esta pestaña"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Volcar GTC 45 aquí</span>
                  </button>

                  {onImportNormas && sheetRows.length > 1 && (
                    <button
                      onClick={requestImportToApp}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Importar filas de esta pestaña hacia la Matriz PHVA de la aplicación"
                    >
                      <DownloadCloud className="h-3.5 w-3.5" />
                      <span>Importar a App</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Row Inline Form */}
              {showAddRowForm && (
                <div className="bg-emerald-50/70 border-b border-emerald-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">
                      Nueva fila para "{selectedSheetTitle}"
                    </span>
                    <button
                      onClick={() => setShowAddRowForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                    {newRowInputs.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const next = [...newRowInputs];
                          next[idx] = e.target.value;
                          setNewRowInputs(next);
                        }}
                        placeholder={indexedRows.header[idx] || `Columna ${colIndexToLetter(idx)}`}
                        className="px-2 py-1 text-xs bg-white border border-emerald-300 rounded-md"
                      />
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={requestAppendRow}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Guardar Fila en Google Sheets
                    </button>
                  </div>
                </div>
              )}

              {/* Sheet Data Grid */}
              <div className="flex-1 overflow-auto">
                {loadingSheet ? (
                  <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                    <p>Leyendo datos de "{selectedSheetTitle}"...</p>
                  </div>
                ) : sheetRows.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                    <p>La pestaña "{selectedSheetTitle}" está vacía.</p>
                    <p className="text-[11px] text-slate-400">
                      Usa los botones de arriba para volcar la Matriz PHVA o GTC 45 en esta pestaña.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-800 z-10 shadow-xs">
                      <tr>
                        <th className="p-2 border border-slate-200 bg-slate-200 text-center font-mono text-[10px] w-10">
                          #
                        </th>
                        {Array.from({ length: maxCols }).map((_, cIdx) => (
                          <th
                            key={cIdx}
                            className="p-2 border border-slate-200 font-bold min-w-[130px] max-w-[260px] bg-slate-100"
                          >
                            <span className="text-[9px] font-mono text-slate-400 mr-1.5">
                              {colIndexToLetter(cIdx)}
                            </span>
                            <span>{indexedRows.header[cIdx] || ''}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {indexedRows.rows.map((rowObj) => (
                        <tr key={rowObj.originalRowIndex} className="hover:bg-emerald-50/40">
                          <td className="p-2 border border-slate-200 bg-slate-50 text-center font-mono text-[10px] text-slate-400">
                            {rowObj.originalRowIndex + 1}
                          </td>
                          {Array.from({ length: maxCols }).map((_, cIdx) => {
                            const cellVal = rowObj.cells[cIdx] ?? '';
                            const isEditing =
                              editingCell?.row === rowObj.originalRowIndex && editingCell?.col === cIdx;

                            return (
                              <td
                                key={cIdx}
                                onClick={() => {
                                  if (!isEditing) {
                                    setEditingCell({
                                      row: rowObj.originalRowIndex,
                                      col: cIdx,
                                      value: cellVal,
                                      original: cellVal,
                                    });
                                  }
                                }}
                                className="p-2 border border-slate-200 align-top max-w-[260px] cursor-pointer hover:bg-emerald-50"
                                title="Clic para editar esta celda en Google Sheets"
                              >
                                {isEditing ? (
                                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingCell.value}
                                      onChange={(e) =>
                                        setEditingCell({ ...editingCell, value: e.target.value })
                                      }
                                      className="w-full px-1.5 py-1 text-xs border border-emerald-500 rounded bg-white"
                                    />
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        onClick={() => setEditingCell(null)}
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700 cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={requestUpdateCell}
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-600 text-white font-bold cursor-pointer"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="line-clamp-3 text-slate-700">{cellVal}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MANDATORY CONFIRMATION DIALOG FOR MUTATING / DESTRUCTIVE ACTIONS */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-[#0f172a] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-black">Confirmar Operación en Google Workspace</h3>
              </div>
              <button
                onClick={() => !isExecutingAction && setPendingAction(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm font-bold text-slate-900">{pendingAction.summary}</p>

              <ul className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                {pendingAction.details.map((d, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setPendingAction(null)}
                  disabled={isExecutingAction}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={executePendingAction}
                  disabled={isExecutingAction}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                    pendingAction.type === 'TRASH_FILE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isExecutingAction ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Ejecutando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Ejecutar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
