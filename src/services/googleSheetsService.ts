// ============================================================================
// SERVICIO CLIENTE GOOGLE DRIVE & GOOGLE SHEETS API (REST v3 / v4)
// Frikaz S.A.S. — Sistema de Gestión SG-SST y Ambiental
// ============================================================================

import { getAccessToken } from './gmailAuthService';
import { NormaPhvaItem, EstadoCumplimiento, FasePhva, SubtemaPhva } from '../types/phvaEvidence';
import { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
}

export interface SheetTabMetadata {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabMetadata[];
}

export interface SheetReadResult {
  range: string;
  values: string[][];
}

export interface SyncWorkbookResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheetsCreated: string[];
  totalRowsWritten: number;
}

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED: Inicia sesión con Google para acceder a Drive y Google Sheets.');
  }
  return token;
}

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * Extrae el ID de una URL de Google Sheets o devuelve el ID limpio.
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Lista archivos de Google Sheets en el Google Drive del usuario autenticado.
 */
export async function listDriveSpreadsheets(searchQuery?: string): Promise<DriveSpreadsheetFile[]> {
  const token = await requireToken();

  let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  if (searchQuery && searchQuery.trim().length > 0) {
    const safeQ = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${safeQ}'`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id,name,modifiedTime,webViewLink,owners(displayName,emailAddress))');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('pageSize', '30');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Tu sesión de Google expiró. Vuelve a iniciar sesión con Google.');
    }
    throw new Error(`Error al listar hojas en Google Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Obtiene los metadatos de un Google Spreadsheet (título, URL y pestañas reales).
 * Nunca asume "Sheet1": devuelve los nombres exactos de las pestañas existentes.
 */
export async function getSpreadsheetMetadata(spreadsheetIdOrUrl: string): Promise<SpreadsheetMetadata> {
  const token = await requireToken();
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties(sheetId,title,index,gridProperties)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Tu sesión de Google expiró. Vuelve a iniciar sesión con Google.');
    }
    if (res.status === 404) {
      throw new Error('No se encontró la hoja de cálculo. Verifica el ID o los permisos.');
    }
    throw new Error(`Error al leer metadatos de Google Sheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Sin título',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title || 'Hoja',
      index: s.properties?.index ?? 0,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

/**
 * Lee los valores de una pestaña específica de Google Sheets.
 */
export async function readSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  cellRange?: string
): Promise<SheetReadResult> {
  const token = await requireToken();
  const fullRange = cellRange
    ? `${escapeSheetTitle(sheetTitle)}!${cellRange}`
    : `${escapeSheetTitle(sheetTitle)}!A1:AZ500`;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(fullRange)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Tu sesión de Google expiró. Vuelve a iniciar sesión con Google.');
    }
    throw new Error(`Error al leer datos de "${sheetTitle}" (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    range: data.range || fullRange,
    values: Array.isArray(data.values) ? data.values : [],
  };
}

/**
 * Convierte la Matriz Legal PHVA a filas tabulares para Google Sheets.
 */
export function normasPhvaToSheetRows(items: NormaPhvaItem[]): (string | number | boolean)[][] {
  const headers = [
    'ID',
    'Fase PHVA',
    'Subtema',
    'Área',
    'Norma Oficial',
    'Entidad Emisora',
    'Artículos',
    'Situación Regulada',
    'Estado Cumplimiento',
    'Responsable',
    'Fecha Verificación',
    'Evidencia de Cumplimiento',
    'Aplicabilidad Frikaz S.A.S.',
    'Observaciones',
  ];

  const rows = items.map((item) => [
    item.id,
    item.fase,
    item.subtema,
    item.area,
    item.normaOficial,
    item.entidadEmisora,
    item.articulos,
    item.tituloSituacion,
    item.estado,
    item.responsable,
    item.fechaVerificacion,
    item.evidenciaCumplimiento,
    item.aplicabilidad,
    item.observaciones,
  ]);

  return [headers, ...rows];
}

/**
 * Convierte la Matriz de Riesgos GTC 45 a filas tabulares para Google Sheets.
 */
export function riesgosGtc45ToSheetRows(risks: RiesgoGTC45Item[]): (string | number | boolean)[][] {
  const headers = [
    'Código',
    'Proceso',
    'Zona / Lugar',
    'Cargo Expuesto',
    'Actividades',
    'Tareas',
    'Rutinaria',
    'Clasificación Peligro',
    'Descripción Peligro',
    'Efectos Posibles',
    'Control Fuente',
    'Control Medio',
    'Control Individuo',
    'ND',
    'NE',
    'NP',
    'Interpr. NP',
    'NC',
    'NR',
    'Interpr. NR',
    'Aceptabilidad Riesgo',
    'N° Expuestos',
    'Peor Consecuencia',
    'Requisito Legal',
    'Controles Ingeniería',
    'Controles Admin / Señalización',
    'Equipos y EPP',
  ];

  const rows = risks.map((r) => [
    r.codigo || r.id,
    r.proceso,
    r.zonaLugar,
    r.cargo || r.cargosExpuestos || 'Operario',
    r.actividades,
    r.tareas,
    r.rutinario,
    r.peligroClasificacion,
    r.peligroDescripcion,
    r.efectosPosibles,
    r.controlesFuente || 'Sin información registrada',
    r.controlesMedio || 'Sin información registrada',
    r.controlesIndividuo || 'Sin información registrada',
    r.nivelDeficiencia,
    r.nivelExposicion,
    r.nivelProbabilidad,
    r.interpretacionNP,
    r.nivelConsecuencia,
    r.nivelRiesgo,
    r.interpretacionNR,
    r.aceptabilidadRiesgo,
    r.numeroExpuestos,
    r.peorConsecuencia,
    `${r.existenciaRequisitoLegal}${r.requisitoLegalEspecifico ? ` — ${r.requisitoLegalEspecifico}` : ''}`,
    r.medidaControlesIngenieria || 'No aplica',
    r.medidaControlesAdministrativos || 'Sin información registrada',
    r.medidaEquiposEPP || 'Sin información registrada',
  ]);

  return [headers, ...rows];
}

/**
 * Crea un libro oficial completo de Frikaz S.A.S. en Google Sheets con fórmulas nativas.
 */
export async function createFrikazWorkbookInSheets(params: {
  title: string;
  normas: NormaPhvaItem[];
  riesgos: RiesgoGTC45Item[];
  includeNormas: boolean;
  includeRiesgos: boolean;
}): Promise<SyncWorkbookResult> {
  const token = await requireToken();

  const sheetDefinitions: { title: string; sheetId: number }[] = [
    { title: 'Inicio_Indicadores', sheetId: 101 },
  ];
  if (params.includeNormas) {
    sheetDefinitions.push({ title: 'Matriz_Legal_PHVA', sheetId: 102 });
  }
  if (params.includeRiesgos) {
    sheetDefinitions.push({ title: 'Matriz_Riesgos_GTC45', sheetId: 103 });
  }

  // 1. Crear Spreadsheet con pestañas estructuradas
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: params.title,
        locale: 'es_CO',
      },
      sheets: sheetDefinitions.map((s, idx) => ({
        properties: {
          sheetId: s.sheetId,
          title: s.title,
          index: idx,
          gridProperties: {
            frozenRowCount: idx === 0 ? 0 : 1,
          },
        },
      })),
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear la hoja de cálculo en Google Sheets (${createRes.status}): ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string = created.spreadsheetUrl;

  // 2. Preparar valores para cada pestaña
  const valueData: { range: string; values: (string | number | boolean)[][] }[] = [];
  let totalRowsWritten = 0;

  // Pestaña Inicio_Indicadores con fórmulas nativas de Google Sheets
  const summaryRows: (string | number | boolean)[][] = [
    ['FRIKAZ S.A.S. — TABLERO INTEGRADO SG-SST Y AMBIENTAL (GOOGLE SHEETS)', '', '', ''],
    ['NIT', '901.654.892-3', 'Sede', 'Bosa Piamonte, Bogotá D.C.'],
    ['Fecha de Sincronización', new Date().toLocaleString('es-CO'), 'Trabajadores', 10],
    ['', '', '', ''],
    ['INDICADOR AUTOMATIZADO', 'VALOR', 'FÓRMULA / ORIGEN', 'OBSERVACIÓN'],
  ];

  if (params.includeNormas) {
    summaryRows.push(
      ['Total Normas Legales PHVA', '=COUNTA(Matriz_Legal_PHVA!A2:A)', 'Matriz_Legal_PHVA', 'Obligaciones vigentes SST y Ambiental'],
      ['Normas en Estado CUMPLE', '=COUNTIF(Matriz_Legal_PHVA!I2:I, "CUMPLE")', 'Matriz_Legal_PHVA', 'Cumplimiento total verificado'],
      ['Normas en Estado PARCIAL', '=COUNTIF(Matriz_Legal_PHVA!I2:I, "PARCIAL")', 'Matriz_Legal_PHVA', 'En ejecución o actualización'],
      ['Normas en Estado NO_CUMPLE', '=COUNTIF(Matriz_Legal_PHVA!I2:I, "NO_CUMPLE")', 'Matriz_Legal_PHVA', 'Requieren acción inmediata'],
      [
        '% Cumplimiento Normativo',
        '=IFERROR(ROUND((B7 + B8*0.5)/B6*100, 1), 0)',
        'Cálculo automático',
        'Porcentaje ponderado SG-SST + Ambiental',
      ]
    );
  }

  if (params.includeRiesgos) {
    summaryRows.push(
      ['Total Peligros GTC 45', '=COUNTA(Matriz_Riesgos_GTC45!A2:A)', 'Matriz_Riesgos_GTC45', 'Peligros evaluados por cargo y zona'],
      ['Riesgos Nivel I (No Aceptable / Crítico)', '=COUNTIF(Matriz_Riesgos_GTC45!T2:T, "I")', 'Matriz_Riesgos_GTC45', 'Intervención urgente'],
      ['Riesgos Nivel II (Específico)', '=COUNTIF(Matriz_Riesgos_GTC45!T2:T, "II")', 'Matriz_Riesgos_GTC45', 'Corregir y adoptar controles']
    );
  }

  valueData.push({
    range: `${escapeSheetTitle('Inicio_Indicadores')}!A1`,
    values: summaryRows,
  });
  totalRowsWritten += summaryRows.length;

  if (params.includeNormas) {
    const normaRows = normasPhvaToSheetRows(params.normas);
    valueData.push({
      range: `${escapeSheetTitle('Matriz_Legal_PHVA')}!A1`,
      values: normaRows,
    });
    totalRowsWritten += normaRows.length;
  }

  if (params.includeRiesgos) {
    const riesgoRows = riesgosGtc45ToSheetRows(params.riesgos);
    valueData.push({
      range: `${escapeSheetTitle('Matriz_Riesgos_GTC45')}!A1`,
      values: riesgoRows,
    });
    totalRowsWritten += riesgoRows.length;
  }

  // 3. Escribir datos mediante batchUpdate de valores
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Se creó el archivo pero falló la escritura de datos (${writeRes.status}): ${errText}`);
  }

  // 4. Aplicar formato visual corporativo Frikaz (Azul oscuro #0f172a + texto blanco en encabezados)
  const formatRequests: any[] = [
    // Encabezado principal Inicio_Indicadores
    {
      repeatCell: {
        range: { sheetId: 101, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.059, green: 0.09, blue: 0.165 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 12 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: 101, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.918, green: 0.345, blue: 0.047 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      autoResizeDimensions: {
        dimensions: { sheetId: 101, dimension: 'COLUMNS', startIndex: 0, endIndex: 4 },
      },
    },
  ];

  if (params.includeNormas) {
    formatRequests.push(
      {
        repeatCell: {
          range: { sheetId: 102, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 14 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.059, green: 0.09, blue: 0.165 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      },
      {
        autoResizeDimensions: {
          dimensions: { sheetId: 102, dimension: 'COLUMNS', startIndex: 0, endIndex: 14 },
        },
      }
    );
  }

  if (params.includeRiesgos) {
    formatRequests.push(
      {
        repeatCell: {
          range: { sheetId: 103, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 27 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.059, green: 0.09, blue: 0.165 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      },
      {
        autoResizeDimensions: {
          dimensions: { sheetId: 103, dimension: 'COLUMNS', startIndex: 0, endIndex: 27 },
        },
      }
    );
  }

  // Formato no bloqueante si falla por límites menores
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: formatRequests }),
    }
  ).catch((err) => console.warn('Formato visual opcional no aplicado:', err));

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: params.title,
    sheetsCreated: sheetDefinitions.map((s) => s.title),
    totalRowsWritten,
  };
}

/**
 * Sobrescribe una pestaña existente de Google Sheets (limpia primero y escribe desde A1).
 */
export async function overwriteSheetTab(
  spreadsheetId: string,
  sheetTitle: string,
  rows: (string | number | boolean)[][]
): Promise<{ updatedRows: number }> {
  const token = await requireToken();
  const clearRange = `${escapeSheetTitle(sheetTitle)}!A:AZ`;

  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(clearRange)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!clearRes.ok) {
    const errText = await clearRes.text();
    throw new Error(`Error al limpiar la pestaña "${sheetTitle}" (${clearRes.status}): ${errText}`);
  }

  const writeRange = `${escapeSheetTitle(sheetTitle)}!A1`;
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: writeRange,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Error al escribir datos en "${sheetTitle}" (${writeRes.status}): ${errText}`);
  }

  const result = await writeRes.json();
  return {
    updatedRows: result.updatedRows || rows.length,
  };
}

/**
 * Agrega nuevas filas al final de una pestaña en Google Sheets.
 */
export async function appendSheetRows(
  spreadsheetId: string,
  sheetTitle: string,
  rows: (string | number | boolean)[][]
): Promise<{ updatedRows: number }> {
  const token = await requireToken();
  const range = `${escapeSheetTitle(sheetTitle)}!A1`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al agregar filas en "${sheetTitle}" (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    updatedRows: data.updates?.updatedRows || rows.length,
  };
}

/**
 * Actualiza una celda específica (ej: "B4") dentro de una pestaña de Google Sheets.
 */
export async function updateSingleSheetCell(
  spreadsheetId: string,
  sheetTitle: string,
  cellA1: string,
  newValue: string
): Promise<void> {
  const token = await requireToken();
  const range = `${escapeSheetTitle(sheetTitle)}!${cellA1}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[newValue]],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al actualizar celda ${cellA1} (${res.status}): ${errText}`);
  }
}

/**
 * Envía a la papelera un archivo de Google Drive (solo tras confirmación explícita del usuario).
 */
export async function trashDriveSpreadsheet(fileId: string): Promise<void> {
  const token = await requireToken();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al mover hoja a la papelera (${res.status}): ${errText}`);
  }
}

/**
 * Convierte filas leídas de Google Sheets (formato Matriz_Legal_PHVA) en NormaPhvaItem[].
 */
export function parseNormasFromSheetRows(values: string[][]): NormaPhvaItem[] {
  if (values.length < 2) return [];
  const dataRows = values.slice(1).filter((r) => r.some((cell) => cell && cell.trim().length > 0));

  const validFases: FasePhva[] = ['PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'];
  const validSubtemas: string[] = [
    'DIAGNÓSTICO',
    'ASIGNACIÓN',
    'MATRIZ LEGAL Y PLAN ANUAL',
    'PELIGROS Y ASPECTOS AMBIENTALES',
    'INGRESO',
    'DOTACIÓN Y COMITÉS',
    'RIESGOS',
    'RESIDUOS Y EMERGENCIAS',
    'EVALUACIÓN',
    'AUDITORÍA',
    'EVALUACIÓN DEL CUMPLIMIENTO LEGAL',
    'REVISIÓN POR LA DIRECCIÓN',
    'ACCIDENTES Y ENFERMEDADES',
    'SANCIONES',
    'REQUERIMIENTOS DE LA AUTORIDAD',
    'CIERRE DE CICLO',
    'POLÍTICAS',
    'GESTIÓN',
    'MEDICIÓN',
    'SEGUIMIENTO',
    'MEJORA',
  ];
  const validEstados: EstadoCumplimiento[] = ['CUMPLE', 'PARCIAL', 'NO_CUMPLE', 'PENDIENTE'];

  return dataRows.map((row, index) => {
    const rawFase = (row[1] || 'PLANEAR').toUpperCase().trim() as FasePhva;
    const rawSubtema = (row[2] || 'DIAGNÓSTICO').toUpperCase().trim();
    const rawArea = (row[3] || 'SST').toUpperCase().trim();
    const rawEstado = (row[8] || 'PENDIENTE').toUpperCase().replace(/\s+/g, '_').trim() as EstadoCumplimiento;

    return {
      id: row[0]?.trim() || `gsheet-norma-${Date.now()}-${index}`,
      fase: validFases.includes(rawFase) ? rawFase : 'PLANEAR',
      subtema: validSubtemas.includes(rawSubtema) ? rawSubtema : 'DIAGNÓSTICO',
      area: rawArea === 'AMBIENTAL' || rawArea === 'INTEGRAL' ? rawArea : 'SST',
      normaOficial: row[4]?.trim() || 'Norma importada desde Google Sheets',
      entidadEmisora: row[5]?.trim() || 'Entidad Colombiana',
      articulos: row[6]?.trim() || 'Artículos aplicables',
      tituloSituacion: row[7]?.trim() || row[4]?.trim() || 'Obligación importada',
      estado: validEstados.includes(rawEstado) ? rawEstado : 'PENDIENTE',
      responsable: row[9]?.trim() || 'Responsable SG-SST',
      fechaVerificacion: row[10]?.trim() || new Date().toISOString().split('T')[0],
      evidenciaCumplimiento: row[11]?.trim() || 'Evidencia registrada en Google Sheets',
      aplicabilidad: row[12]?.trim() || 'Aplicable a Frikaz S.A.S.',
      observaciones: row[13]?.trim() || 'Sincronizado desde Google Sheets.',
      descripcion: row[12]?.trim() || row[7]?.trim() || 'Registro sincronizado desde Google Sheets.',
      importancia: 'Requisito legal sincronizado mediante Google Sheets.',
      vigente: true,
      textoVigencia: 'Vigente según seguimiento en Google Sheets.',
      jurisdiccionAlcance: 'Nacional / Bogotá D.C.',
    };
  });
}
