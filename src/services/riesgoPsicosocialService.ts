import ExcelJS from 'exceljs';
import type { TrabajadorFichaSST } from '../types/planAnual';
import type {
  AuditoriaAccesoPsicosocial,
  InstrumentoPsicosocialTipo,
  RegistroTrabajadorPsicosocial,
  RiesgoPsicosocialStore,
} from '../types/riesgoPsicosocial';

const STORAGE_KEY_PSICOSOCIAL = 'frikaz_bateria_riesgo_psicosocial_v1';

// ============================================================================
// 1. PERSISTENCIA Y SINCRONIZACIÓN SIN DUPLICAR TRABAJADORES OFICIALES
// ============================================================================

export function loadRiesgoPsicosocialStore(
  trabajadores: TrabajadorFichaSST[]
): RiesgoPsicosocialStore {
  let base: RiesgoPsicosocialStore = { registros: [], auditoria: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PSICOSOCIAL);
    if (raw) {
      const parsed = JSON.parse(raw) as RiesgoPsicosocialStore;
      if (parsed && Array.isArray(parsed.registros)) {
        base = {
          registros: parsed.registros,
          auditoria: Array.isArray(parsed.auditoria) ? parsed.auditoria : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo batería psicosocial:', err);
  }

  // Vincular con todos los trabajadores oficiales existentes sin duplicarlos ni inventar evaluaciones
  const hoy = new Date().toISOString().split('T')[0];
  const existentes = new Map(base.registros.map((r) => [r.trabajadorId, r]));
  let huboNuevos = false;

  const sincronizados: RegistroTrabajadorPsicosocial[] = trabajadores.map((t, idx) => {
    const prev = existentes.get(t.id);
    if (prev) return prev;
    huboNuevos = true;
    return {
      id: `psi-reg-${t.id}`,
      codigoInterno: `PSI-${String(idx + 1).padStart(3, '0')}`,
      trabajadorId: t.id,
      fechaAplicacion: '',
      instrumentosAplicados: [],
      profesionalNombre: '',
      profesionalLicenciaSST: '',
      estadoEvaluacion: 'Pendiente',
      observacionesAdministrativas: '',
      documentos: [],
      fechaActualizacion: hoy,
    };
  });

  // Conservar registros históricos de trabajadores retirados si ya tenían soportes
  base.registros.forEach((r) => {
    if (!trabajadores.some((t) => t.id === r.trabajadorId)) {
      sincronizados.push(r);
    }
  });

  const nextStore: RiesgoPsicosocialStore = {
    registros: sincronizados,
    auditoria: base.auditoria,
  };

  if (huboNuevos) {
    saveRiesgoPsicosocialStore(nextStore);
  }

  return nextStore;
}

export function saveRiesgoPsicosocialStore(store: RiesgoPsicosocialStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_PSICOSOCIAL, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('Error guardando batería psicosocial:', err);
    return false;
  }
}

export function registrarAuditoriaPsicosocial(
  store: RiesgoPsicosocialStore,
  usuario: string,
  accion: AuditoriaAccesoPsicosocial['accion'],
  detalle: string
): RiesgoPsicosocialStore {
  const entry: AuditoriaAccesoPsicosocial = {
    id: `aud-psi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fechaHora: new Date().toLocaleString('es-CO'),
    usuario,
    accion,
    detalle,
  };
  const next: RiesgoPsicosocialStore = {
    ...store,
    auditoria: [entry, ...store.auditoria].slice(0, 150),
  };
  saveRiesgoPsicosocialStore(next);
  return next;
}

// ============================================================================
// 2. CONSOLIDADO GENERAL (SIN EXPONER INFORMACIÓN INDIVIDUAL)
// ============================================================================

export interface ConsolidadoPsicosocialResumen {
  totalTrabajadoresRegistrados: number;
  evaluacionesRealizadas: number;
  evaluacionesPendientes: number;
  enAplicacionOProgramadas: number;
  conDocumentosPendientes: number;
  fechasAplicacionUnicas: string[];
  distribucionPorCargo: Array<{
    cargo: string;
    total: number;
    realizadas: number;
    pendientes: number;
  }>;
  estadoGeneralProceso: string;
  conteoInstrumentos: Record<InstrumentoPsicosocialTipo, number>;
  resultadosOficialesDisponibles: Array<{
    factor: 'Factores intralaborales' | 'Factores extralaborales' | 'Estrés';
    conResultadoOficial: number;
    distribucionNiveles: Record<string, number>;
  }>;
}

export function calcularConsolidadoPsicosocial(
  store: RiesgoPsicosocialStore,
  trabajadores: TrabajadorFichaSST[]
): ConsolidadoPsicosocialResumen {
  const trabMap = new Map(trabajadores.map((t) => [t.id, t]));
  const regsActivos = store.registros.filter((r) => {
    const t = trabMap.get(r.trabajadorId);
    return !t || t.estadoLaboral === 'ACTIVO';
  });

  const esRealizada = (e: RegistroTrabajadorPsicosocial) =>
    e.estadoEvaluacion === 'Aplicada' || e.estadoEvaluacion === 'Evaluada con soporte';

  const totalTrabajadoresRegistrados = regsActivos.length;
  const evaluacionesRealizadas = regsActivos.filter(esRealizada).length;
  const evaluacionesPendientes = regsActivos.filter(
    (r) => r.estadoEvaluacion === 'Pendiente' || r.estadoEvaluacion === 'Pendiente de verificación'
  ).length;
  const enAplicacionOProgramadas = regsActivos.filter(
    (r) => r.estadoEvaluacion === 'Programada' || r.estadoEvaluacion === 'En aplicación'
  ).length;
  const conDocumentosPendientes = regsActivos.filter(
    (r) => r.documentos.length === 0
  ).length;

  const fechasSet = new Set<string>();
  regsActivos.forEach((r) => {
    if (r.fechaAplicacion && r.fechaAplicacion.trim()) {
      fechasSet.add(r.fechaAplicacion.trim());
    }
  });

  const cargoMap = new Map<string, { total: number; realizadas: number; pendientes: number }>();
  regsActivos.forEach((r) => {
    const cargo = trabMap.get(r.trabajadorId)?.cargoNombre || 'Pendiente de verificación';
    const cur = cargoMap.get(cargo) || { total: 0, realizadas: 0, pendientes: 0 };
    cur.total += 1;
    if (esRealizada(r)) cur.realizadas += 1;
    else cur.pendientes += 1;
    cargoMap.set(cargo, cur);
  });

  const conteoInstrumentos: Record<InstrumentoPsicosocialTipo, number> = {
    'Forma A': 0,
    'Forma B': 0,
    'Factores intralaborales': 0,
    'Factores extralaborales': 0,
    Estrés: 0,
    Otros: 0,
  };
  regsActivos.forEach((r) => {
    r.instrumentosAplicados.forEach((inst) => {
      conteoInstrumentos[inst] = (conteoInstrumentos[inst] || 0) + 1;
    });
  });

  const estadoGeneralProceso =
    totalTrabajadoresRegistrados === 0
      ? 'Pendiente de registro de trabajadores'
      : evaluacionesRealizadas === 0 && enAplicacionOProgramadas === 0
      ? 'Pendiente de aplicación (sin evaluaciones realizadas aún)'
      : evaluacionesRealizadas === totalTrabajadoresRegistrados
      ? conDocumentosPendientes > 0
        ? 'Aplicada con soportes documentales pendientes'
        : 'Proceso completo con soportes registrados'
      : 'En seguimiento / ejecución parcial';

  const contarNiveles = (
    extractor: (r: RegistroTrabajadorPsicosocial) => string | undefined
  ) => {
    const dist: Record<string, number> = {};
    let conRes = 0;
    regsActivos.forEach((r) => {
      const val = extractor(r);
      if (val && val !== 'Pendiente de calificación') {
        conRes += 1;
        dist[val] = (dist[val] || 0) + 1;
      }
    });
    return { conResultadoOficial: conRes, distribucionNiveles: dist };
  };

  return {
    totalTrabajadoresRegistrados,
    evaluacionesRealizadas,
    evaluacionesPendientes,
    enAplicacionOProgramadas,
    conDocumentosPendientes,
    fechasAplicacionUnicas: Array.from(fechasSet).sort(),
    distribucionPorCargo: Array.from(cargoMap.entries()).map(([cargo, stats]) => ({
      cargo,
      ...stats,
    })),
    estadoGeneralProceso,
    conteoInstrumentos,
    resultadosOficialesDisponibles: [
      {
        factor: 'Factores intralaborales',
        ...contarNiveles((r) => r.resultadoOficialProfesional?.intralaboral),
      },
      {
        factor: 'Factores extralaborales',
        ...contarNiveles((r) => r.resultadoOficialProfesional?.extralaboral),
      },
      {
        factor: 'Estrés',
        ...contarNiveles((r) => r.resultadoOficialProfesional?.estres),
      },
    ],
  };
}

// ============================================================================
// 3. EXPORTACIÓN EXCEL (4 HOJAS) CON CONTROL DE CONFIDENCIALIDAD
// ============================================================================

export async function exportarConsolidadoPsicosocialExcel(
  store: RiesgoPsicosocialStore,
  trabajadores: TrabajadorFichaSST[],
  accesoIndividualAutorizado: boolean
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Frikaz S.A.S. - Batería de Riesgo Psicosocial';
  const hoy = new Date().toISOString().split('T')[0];
  const trabMap = new Map(trabajadores.map((t) => [t.id, t]));
  const consolidado = calcularConsolidadoPsicosocial(store, trabajadores);

  const estilar = (ws: ExcelJS.Worksheet, titulo: string, headers: string[], widths: number[]) => {
    const colEnd = String.fromCharCode(64 + headers.length);
    ws.mergeCells(`A1:${colEnd}1`);
    const c1 = ws.getCell('A1');
    c1.value = titulo;
    c1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B53' } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    const r3 = ws.getRow(3);
    headers.forEach((h, i) => {
      const cell = r3.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    r3.height = 24;
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: headers.length },
    };
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
  };

  // HOJA 1: Consolidado general
  const ws1 = wb.addWorksheet('Consolidado general', { views: [{ state: 'frozen', ySplit: 3 }] });
  estilar(
    ws1,
    `FRIKAZ S.A.S. — CONSOLIDADO GENERAL BATERÍA DE RIESGO PSICOSOCIAL (${hoy})`,
    ['Indicador / Concepto', 'Valor / Cantidad', 'Observación normativa'],
    [40, 26, 52]
  );
  const filasRes: Array<[string, string | number, string]> = [
    ['Total de trabajadores registrados', consolidado.totalTrabajadoresRegistrados, 'Sincronizado con fichas oficiales de Frikaz S.A.S.'],
    ['Evaluaciones realizadas', consolidado.evaluacionesRealizadas, 'Incluye estado Aplicada o Evaluada con soporte'],
    ['Evaluaciones pendientes', consolidado.evaluacionesPendientes, 'Pendientes de aplicación o verificación'],
    ['Programadas / En aplicación', consolidado.enAplicacionOProgramadas, 'Con fecha asignada o en curso'],
    ['Registros con documentos pendientes', consolidado.conDocumentosPendientes, 'Sin archivos de soporte cargados aún'],
    ['Estado general del proceso', consolidado.estadoGeneralProceso, 'Resolución 2764 de 2022 / Resolución 2646 de 2008'],
    [
      'Fechas de aplicación registradas',
      consolidado.fechasAplicacionUnicas.length > 0
        ? consolidado.fechasAplicacionUnicas.join(', ')
        : 'Pendiente de verificación',
      'Solo fechas realmente registradas',
    ],
  ];
  filasRes.forEach((rowVals, i) => {
    ws1.getRow(4 + i).values = rowVals;
  });

  const offsetCargo = 4 + filasRes.length + 2;
  ws1.getRow(offsetCargo).values = ['Distribución por cargo oficial', 'Total / Realizadas / Pendientes', 'Observación'];
  ws1.getRow(offsetCargo).font = { bold: true };
  consolidado.distribucionPorCargo.forEach((dc, idx) => {
    ws1.getRow(offsetCargo + 1 + idx).values = [
      dc.cargo,
      `${dc.total} total · ${dc.realizadas} realizadas · ${dc.pendientes} pendientes`,
      'Solo conteos consolidados (sin exponer datos médicos individuales)',
    ];
  });

  // HOJA 2: Registro de trabajadores (anonimizado si no hay autorización explícita)
  const ws2 = wb.addWorksheet('Registro de trabajadores', { views: [{ state: 'frozen', ySplit: 3 }] });
  estilar(
    ws2,
    accesoIndividualAutorizado
      ? `FRIKAZ S.A.S. — REGISTRO NOMINAL AUTORIZADO RIESGO PSICOSOCIAL (${hoy})`
      : `FRIKAZ S.A.S. — REGISTRO CONSOLIDADO ANONIMIZADO RIESGO PSICOSOCIAL (${hoy})`,
    ['Código interno', 'Nombre completo', 'Cargo', 'Área o proceso', 'Fecha evaluación', 'Tipo de evaluación', 'Estado'],
    [16, 32, 22, 30, 18, 32, 22]
  );

  store.registros.forEach((r, idx) => {
    const t = trabMap.get(r.trabajadorId);
    const nombre = accesoIndividualAutorizado
      ? t?.nombreCompleto || 'Pendiente de verificación'
      : `Registro Confidencial (${r.codigoInterno})`;
    ws2.getRow(4 + idx).values = [
      r.codigoInterno,
      nombre,
      t?.cargoNombre || 'Pendiente de verificación',
      r.areaProcesoOverride || t?.areaProceso || 'Pendiente de verificación',
      r.fechaAplicacion || 'Pendiente de verificación',
      r.instrumentosAplicados.length > 0
        ? r.instrumentosAplicados.join(', ')
        : 'Pendiente de definición',
      r.estadoEvaluacion,
    ];
  });

  // HOJA 3: Seguimiento de evaluaciones
  const ws3 = wb.addWorksheet('Seguimiento de evaluaciones', { views: [{ state: 'frozen', ySplit: 3 }] });
  estilar(
    ws3,
    `FRIKAZ S.A.S. — SEGUIMIENTO DE APLICACIÓN Y SOPORTES (${hoy})`,
    ['Código', 'Tipo de instrumento', 'Fecha', 'Profesional responsable', 'Estado de evaluación', 'Estado documental', 'Observaciones administrativas'],
    [14, 34, 16, 30, 22, 24, 38]
  );
  store.registros.forEach((r, idx) => {
    ws3.getRow(4 + idx).values = [
      r.codigoInterno,
      r.instrumentosAplicados.length > 0 ? r.instrumentosAplicados.join(', ') : 'Pendiente',
      r.fechaAplicacion || 'Pendiente',
      r.profesionalNombre
        ? `${r.profesionalNombre}${r.profesionalLicenciaSST ? ` (Lic. ${r.profesionalLicenciaSST})` : ''}`
        : 'Pendiente de asignar profesional con licencia SST',
      r.estadoEvaluacion,
      r.documentos.length > 0 ? `${r.documentos.length} soporte(s) adjunto(s)` : 'Sin documentos adjuntos',
      r.observacionesAdministrativas || '',
    ];
  });

  // HOJA 4: Resultados generales (únicamente oficiales cuando existan)
  const ws4 = wb.addWorksheet('Resultados generales', { views: [{ state: 'frozen', ySplit: 3 }] });
  estilar(
    ws4,
    `FRIKAZ S.A.S. — RESULTADOS GENERALES CONSOLIDADOS (${hoy})`,
    ['Tipo de factor', 'Cantidad de evaluaciones con calificación', 'Resultados disponibles', 'Nivel de riesgo oficialmente determinado', 'Fecha de consolidación'],
    [28, 28, 34, 38, 20]
  );
  consolidado.resultadosOficialesDisponibles.forEach((res, idx) => {
    const nivelesTxt = Object.entries(res.distribucionNiveles)
      .map(([niv, cant]) => `${niv}: ${cant}`)
      .join(' | ');
    ws4.getRow(4 + idx).values = [
      res.factor,
      res.conResultadoOficial,
      res.conResultadoOficial > 0
        ? `${res.conResultadoOficial} calificación(es) oficial(es) registrada(s)`
        : 'Sin resultados oficiales calificados aún (no se calculan promedios sin datos)',
      nivelesTxt || 'Pendiente de calificación por profesional competente',
      hoy,
    ];
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Consolidado_Riesgo_Psicosocial_Frikaz_${hoy}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
