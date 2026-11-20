import {
  NormaPhvaItem,
  IndicadoresAutomaticos,
  FasePhva,
  ResumenFaseCalculado,
  EstadoCumplimiento,
} from '../types/phvaEvidence';
import { INITIAL_PHVA_NORMS } from '../data/phvaNormsData';
import {
  crearRegistroRevisionGerente,
  esEstadoExclusivoGerente,
  esGerenteAutorizado,
  normalizarEstadoEstandar,
} from './gerenteControlService';

const STORAGE_KEY = 'frikaz_phva_evidence_items_v3_74normas';
const PLAIN_LANG_FLAG = 'frikaz_phva_plain_lang_v1';
const GERENTE_GATE_FLAG = 'frikaz_phva_gerente_gate_v1';

export function getPhvaNorms(): NormaPhvaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PHVA_NORMS));
      localStorage.setItem(PLAIN_LANG_FLAG, '1');
      localStorage.setItem(GERENTE_GATE_FLAG, '1');
      return INITIAL_PHVA_NORMS;
    }
    const parsed = JSON.parse(raw) as NormaPhvaItem[];
    const migratedPlain = localStorage.getItem(PLAIN_LANG_FLAG);
    const migratedGate = localStorage.getItem(GERENTE_GATE_FLAG);

    let items = parsed;

    if (!migratedPlain) {
      const userMap = new Map(parsed.map((it) => [it.id, it]));
      const defaultsById = new Set(INITIAL_PHVA_NORMS.map((d) => d.id));
      const refreshedCanonical = INITIAL_PHVA_NORMS.map((def) => {
        const existing = userMap.get(def.id);
        if (!existing) return def;
        return {
          ...def,
          estado: existing.estado,
          fechaVerificacion: existing.fechaVerificacion || def.fechaVerificacion,
          responsable: existing.responsable || def.responsable,
        };
      });
      const customItems = parsed.filter((it) => !defaultsById.has(it.id));
      items = [...refreshedCanonical, ...customItems];
      localStorage.setItem(PLAIN_LANG_FLAG, '1');
    }

    if (items.length < INITIAL_PHVA_NORMS.length) {
      const map = new Map(items.map((it) => [it.id, it]));
      items = INITIAL_PHVA_NORMS.map((def) => map.get(def.id) || def);
    }

    if (!migratedGate) {
      items = items.map((it) => {
        const est = normalizarEstadoEstandar(it.estado);
        // Si venia de semilla pre-cumplida/aprobada sin registro real de revision de Gerencia, reiniciar a Por hacer
        if ((est === 'Cumplido' || est === 'Aprobado') && !it.resultadoRevision) {
          return {
            ...it,
            estado: 'Por hacer',
            fechaRevision: undefined,
            revisadoPor: undefined,
            resultadoRevision: undefined,
            observacionesRevision: undefined,
          };
        }
        return {
          ...it,
          estado: est,
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(GERENTE_GATE_FLAG, '1');
      return items;
    }

    if (!migratedPlain) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    return items;
  } catch (err) {
    console.error('Error reading phva norms from localStorage', err);
    return INITIAL_PHVA_NORMS;
  }
}

export function savePhvaNorms(items: NormaPhvaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frikaz:norms-updated'));
    }
  } catch (err) {
    console.error('Error saving phva norms to localStorage', err);
  }
}

export function updatePhvaNormStatus(
  id: string,
  nuevoEstado: EstadoCumplimiento,
  observacionesRevision?: string
): NormaPhvaItem[] {
  const estadoNorm = normalizarEstadoEstandar(nuevoEstado);
  if (esEstadoExclusivoGerente(estadoNorm) && !esGerenteAutorizado()) {
    return getPhvaNorms();
  }

  const current = getPhvaNorms();
  const revGerente =
    esEstadoExclusivoGerente(estadoNorm) &&
    (estadoNorm === 'Aprobado' ||
      estadoNorm === 'Cumplido' ||
      estadoNorm === 'Devuelto para ajustes')
      ? crearRegistroRevisionGerente(estadoNorm, observacionesRevision)
      : null;

  const updated = current.map((item) =>
    item.id === id
      ? {
          ...item,
          estado: estadoNorm,
          fechaVerificacion: new Date().toISOString().split('T')[0],
          ...(revGerente
            ? {
                fechaRevision: revGerente.fechaRevision,
                revisadoPor: revGerente.revisadoPor,
                resultadoRevision: revGerente.resultadoRevision,
                observacionesRevision: revGerente.observaciones,
              }
            : {}),
        }
      : item
  );
  savePhvaNorms(updated);
  return updated;
}

export function updatePhvaNormFull(updatedItem: NormaPhvaItem): NormaPhvaItem[] {
  const current = getPhvaNorms();
  const existing = current.find((it) => it.id === updatedItem.id);
  const estadoNorm = normalizarEstadoEstandar(updatedItem.estado);
  const estadoAnterior = existing ? normalizarEstadoEstandar(existing.estado) : 'Por hacer';

  // Impedir que un trabajador no autorizado pase el estado a Cumplido/Aprobado/Devuelto para ajustes al guardar
  const estadoFinal: EstadoCumplimiento =
    esEstadoExclusivoGerente(estadoNorm) &&
    estadoNorm !== estadoAnterior &&
    !esGerenteAutorizado()
      ? estadoAnterior
      : estadoNorm;

  const revGerente =
    esEstadoExclusivoGerente(estadoFinal) &&
    estadoFinal !== estadoAnterior &&
    esGerenteAutorizado() &&
    (estadoFinal === 'Aprobado' ||
      estadoFinal === 'Cumplido' ||
      estadoFinal === 'Devuelto para ajustes')
      ? crearRegistroRevisionGerente(estadoFinal, updatedItem.observacionesRevision || updatedItem.observaciones)
      : null;

  const itemToSave: NormaPhvaItem = {
    ...updatedItem,
    estado: estadoFinal,
    ...(revGerente
      ? {
          fechaRevision: revGerente.fechaRevision,
          revisadoPor: revGerente.revisadoPor,
          resultadoRevision: revGerente.resultadoRevision,
          observacionesRevision: revGerente.observaciones,
        }
      : {}),
  };

  const exists = Boolean(existing);
  const updated = exists
    ? current.map((item) => (item.id === itemToSave.id ? itemToSave : item))
    : [...current, itemToSave];
  savePhvaNorms(updated);
  return updated;
}

export function createPhvaNorm(newItem: Omit<NormaPhvaItem, 'id'>): NormaPhvaItem[] {
  const current = getPhvaNorms();
  const id = `custom-${Date.now()}`;
  const est = normalizarEstadoEstandar(newItem.estado);
  const estadoSeguro: EstadoCumplimiento =
    esEstadoExclusivoGerente(est) && !esGerenteAutorizado() ? 'Por hacer' : est;

  const fullItem: NormaPhvaItem = {
    ...newItem,
    estado: estadoSeguro,
    id,
  };
  const updated = [...current, fullItem];
  savePhvaNorms(updated);
  return updated;
}

export function deletePhvaNorm(id: string): NormaPhvaItem[] {
  const current = getPhvaNorms();
  const updated = current.filter((item) => item.id !== id);
  savePhvaNorms(updated);
  return updated;
}

export function resetPhvaNormsToDefault(): NormaPhvaItem[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PHVA_NORMS));
  localStorage.setItem(GERENTE_GATE_FLAG, '1');
  return INITIAL_PHVA_NORMS;
}

export function calcularIndicadoresPhva(items: NormaPhvaItem[]): IndicadoresAutomaticos {
  const fases: FasePhva[] = ['PLANEAR', 'HACER', 'VERIFICAR', 'ACTUAR'];
  const porFase: Record<FasePhva, ResumenFaseCalculado> = {} as any;

  let totalCumplidas = 0;
  let totalParciales = 0;
  let totalNoCumplidas = 0;
  let sstPuntos = 0;
  let sstTotal = 0;
  let ambPuntos = 0;
  let ambTotal = 0;

  fases.forEach((fase) => {
    const faseItems = items.filter((i) => i.fase === fase);
    const cumplidas = faseItems.filter((i) => {
      const est = normalizarEstadoEstandar(i.estado);
      return est === 'Cumplido' || est === 'Aprobado';
    }).length;
    const parciales = faseItems.filter((i) => {
      const est = normalizarEstadoEstandar(i.estado);
      return est === 'En proceso' || est === 'Pendiente de revisión';
    }).length;
    const noCumplidas = faseItems.filter((i) => {
      const est = normalizarEstadoEstandar(i.estado);
      return est === 'Por hacer' || est === 'Devuelto para ajustes';
    }).length;
    const total = faseItems.length;
    const totalEvaluables = faseItems.filter((i) => i.estado !== 'NO_APLICA').length;

    const porcentaje =
      totalEvaluables > 0
        ? Math.round(((cumplidas + parciales * 0.5) / totalEvaluables) * 1000) / 10
        : 0;

    porFase[fase] = {
      total,
      cumplidas,
      parciales,
      noCumplidas,
      porcentaje,
    };

    totalCumplidas += cumplidas;
    totalParciales += parciales;
    totalNoCumplidas += noCumplidas;
  });

  items.forEach((item) => {
    if (item.estado === 'NO_APLICA') {
      return;
    }
    const est = normalizarEstadoEstandar(item.estado);
    const pts =
      est === 'Cumplido' || est === 'Aprobado'
        ? 1.0
        : est === 'En proceso' || est === 'Pendiente de revisión'
          ? 0.5
          : 0;
    if (item.area === 'SST' || item.area === 'INTEGRAL') {
      sstPuntos += pts;
      sstTotal += 1;
    }
    if (item.area === 'AMBIENTAL' || item.area === 'INTEGRAL') {
      ambPuntos += pts;
      ambTotal += 1;
    }
  });

  const totalEvaluablesGeneral = items.filter((i) => i.estado !== 'NO_APLICA').length;

  const generalPorcentaje =
    totalEvaluablesGeneral > 0
      ? Math.round(
          ((totalCumplidas + totalParciales * 0.5) / totalEvaluablesGeneral) * 1000
        ) / 10
      : 0;

  const sstPorcentaje =
    sstTotal > 0 ? Math.round((sstPuntos / sstTotal) * 1000) / 10 : 0;

  const ambientalPorcentaje =
    ambTotal > 0 ? Math.round((ambPuntos / ambTotal) * 1000) / 10 : 0;

  const totalVigentes = items.filter((i) => i.vigente).length;

  return {
    generalPorcentaje,
    sstPorcentaje,
    ambientalPorcentaje,
    porFase,
    totalNormas: items.length,
    totalVigentes,
    alertasPendientes: totalNoCumplidas + totalParciales,
  };
}

export function exportarMatrizPhvaCsv(items: NormaPhvaItem[]): void {
  const fecha = new Date().toLocaleString('es-CO');
  const rows: string[][] = [
    ['FRIKAZ S.A.S. - MATRIZ AUTOMATIZADA DE REQUISITOS LEGALES SST Y AMBIENTAL'],
    ['SISTEMA DE GESTIÓN INTEGRAL SST Y AMBIENTAL'],
    [`Fecha de Generación: ${fecha}`],
    ['Ubicación: Bosa, Piamonte, Bogotá D.C. | 10 Trabajadores'],
    [],
    [
      'FASE PHVA',
      'BLOQUE DE TRABAJO',
      'TEMA EN FRIKAZ',
      'NORMA OFICIAL',
      'ENTIDAD',
      'ARTÍCULOS',
      'ÁREA',
      '1. ¿QUÉ PIDE LA NORMA?',
      '2. ¿POR QUÉ NOS CUIDA EN FRIKAZ?',
      '3. ¿QUÉ HACEMOS EN LA PLANTA?',
      '4. ¿SIGUE VIGENTE?',
      '5. ¿DÓNDE Y A QUIÉNES APLICA?',
      '6. SOPORTE QUE LO DEMUESTRA',
      'ESTADO DE CUMPLIMIENTO',
      'ENCARGADO',
      'FECHA REVISIÓN GERENCIA',
      'REVISADO POR',
      'NOTAS',
    ],
  ];

  items.forEach((item) => {
    rows.push([
      item.fase,
      item.subtema,
      item.tituloSituacion,
      item.normaOficial,
      item.entidadEmisora,
      item.articulos,
      item.area,
      item.descripcion,
      item.importancia,
      item.aplicabilidad,
      item.vigente ? 'Vigente confirmada' : 'Pendiente validación',
      item.jurisdiccionAlcance,
      item.evidenciaCumplimiento,
      normalizarEstadoEstandar(item.estado),
      item.responsable,
      item.fechaRevision || item.fechaVerificacion,
      item.revisadoPor || 'Pendiente revisión de Gerencia',
      item.observaciones,
    ]);
  });

  const escapeCell = (c: any) => `"${String(c || '').replace(/"/g, '""')}"`;
  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCell).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Frikaz_Evidencia1_PHVA_Normativo_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
