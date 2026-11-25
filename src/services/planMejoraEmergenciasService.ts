import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { RiesgoGTC45Item } from '../types/gtc45RiskMatrix';
import type {
  CajaCalidadEditable,
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
  PlanEmergenciasFrikaz,
  PlanMejoraPorRiesgo,
  PlanesMejoraYEmergenciasStore,
} from '../types/planAnualMejoraEmergencias';
import {
  DOCX_FONT,
  DOCX_FONT_SIZE_BODY,
  DOCX_FONT_SIZE_META,
  DOCX_LINE_SPACING_1_5,
  DOCX_MARGIN_1_INCH,
  cargarLogoFrikazBytes,
  descargarDocumentoDocx,
} from './calidadDocumentalService';
import { normalizarEstadoEstandar } from './gerenteControlService';
import {
  construirPlanDesdeRiesgoMatriz,
  crearCajaCalidadEditable,
  crearFormatosSeed,
  crearPlanEmergenciasSeed,
  crearPlanesMejoraSeed,
} from './planMejoraEmergenciasData';
import { extraerMedidasRiesgo } from './planAnualService';
import { resolverCargoPrincipalYExpuestos } from '../data/cargosOficiales';

const STORAGE_KEY_MEJORA_EMERGENCIAS = 'frikaz_planes_mejora_emergencias_v1';
const STORAGE_KEY_MEJORA_BACKUP_CARGOS = 'frikaz_mejora_emg_backup_pre6cargos_v1';
const REORG_2027_FLAG_MEJORA = 'frikaz_mejora_emg_2027_reorg_v1';
const CARGOS_6_FLAG_MEJORA = 'frikaz_mejora_emg_6_cargos_v1';

// ============================================================================
// 1. PERSISTENCIA Y SINCRONIZACIÓN CON LA MATRIZ DE RIESGOS GTC 45
// ============================================================================

export function loadPlanesMejoraEmergenciasStore(
  riesgos: RiesgoGTC45Item[]
): PlanesMejoraYEmergenciasStore {
  const formatosSeed = crearFormatosSeed();
  const planesSeed = crearPlanesMejoraSeed(riesgos);
  const emergenciasSeed = crearPlanEmergenciasSeed();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEJORA_EMERGENCIAS);
    if (!raw) {
      const initial: PlanesMejoraYEmergenciasStore = {
        versionEsquema: 1,
        ultimaActualizacion: new Date().toISOString(),
        planesPorRiesgo: planesSeed,
        planEmergencias: emergenciasSeed,
        formatos: formatosSeed,
      };
      localStorage.setItem(STORAGE_KEY_MEJORA_EMERGENCIAS, JSON.stringify(initial));
      localStorage.setItem(REORG_2027_FLAG_MEJORA, '1');
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<PlanesMejoraYEmergenciasStore>;
    const mergedFormatos: Record<string, FormatoEditableDocumento> = {
      ...formatosSeed,
      ...(parsed.formatos || {}),
    };
    let mergedPlanes: PlanMejoraPorRiesgo[] =
      Array.isArray(parsed.planesPorRiesgo) && parsed.planesPorRiesgo.length > 0
        ? parsed.planesPorRiesgo.map((p) => ({
            ...p,
            estado: normalizarEstadoEstandar(p.estado),
          }))
        : planesSeed;

    let mergedEmergencias: PlanEmergenciasFrikaz = parsed.planEmergencias
      ? {
          ...emergenciasSeed,
          ...parsed.planEmergencias,
          cajaCalidad: {
            ...emergenciasSeed.cajaCalidad,
            ...(parsed.planEmergencias.cajaCalidad || {}),
          },
          seguimientoActualizacion: {
            ...emergenciasSeed.seguimientoActualizacion,
            ...(parsed.planEmergencias.seguimientoActualizacion || {}),
            estado: normalizarEstadoEstandar(
              parsed.planEmergencias.seguimientoActualizacion?.estado
            ),
          },
        }
      : emergenciasSeed;

    let dirty = false;
    if (!localStorage.getItem(REORG_2027_FLAG_MEJORA)) {
      const seedByRef = new Map(planesSeed.map((s) => [s.claveReferencia, s]));
      mergedPlanes = mergedPlanes.map((p) => {
        const esNoConfirmado2026 =
          p.estado === 'Por hacer' &&
          (!p.evidenciasAdjuntas || p.evidenciasAdjuntas.length === 0) &&
          !p.revisionGerente &&
          (p.fechaInicio.startsWith('2026-') || p.fechaFin.startsWith('2026-'));

        if (!esNoConfirmado2026) return p;

        const targetSeed = seedByRef.get(p.claveReferencia);
        const nuevaInicio = targetSeed?.fechaInicio || '2027-01-15';
        const nuevaFin = targetSeed?.fechaFin || '2027-11-30';
        dirty = true;
        return {
          ...p,
          fechaInicio: nuevaInicio,
          fechaFin: nuevaFin,
          historialCambios: [
            ...(p.historialCambios || []),
            {
              id: `hp-reorg2027-${p.id}`,
              fecha: '2026-11-23',
              usuario: 'Gerente',
              accion: 'Reprogramado de 2026 a 2027',
              detalle: `Sin ejecución confirmada a noviembre de 2026 (${p.fechaInicio} → ${p.fechaFin}); reprogramado al calendario 2027 (${nuevaInicio} → ${nuevaFin}).`,
            },
          ],
        };
      });

      const emgSeedActs = new Map(
        emergenciasSeed.programaCapacitacionSimulacros.map((a) => [a.id, a])
      );
      mergedEmergencias = {
        ...mergedEmergencias,
        programaCapacitacionSimulacros: (
          mergedEmergencias.programaCapacitacionSimulacros || []
        ).map((act) => {
          if (act.fechaProgramada === 'Pendiente por programar') {
            dirty = true;
            return {
              ...act,
              fechaProgramada: emgSeedActs.get(act.id)?.fechaProgramada || 'Julio–Octubre 2027',
            };
          }
          return act;
        }),
        inspeccionEquiposPrograma:
          mergedEmergencias.inspeccionEquiposPrograma.proximaInspeccion ===
          'Pendiente por programar'
            ? ((dirty = true),
              {
                ...mergedEmergencias.inspeccionEquiposPrograma,
                proximaInspeccion: emergenciasSeed.inspeccionEquiposPrograma.proximaInspeccion,
              })
            : mergedEmergencias.inspeccionEquiposPrograma,
      };

      localStorage.setItem(REORG_2027_FLAG_MEJORA, '1');
    }

    if (!localStorage.getItem(CARGOS_6_FLAG_MEJORA)) {
      if (!localStorage.getItem(STORAGE_KEY_MEJORA_BACKUP_CARGOS)) {
        localStorage.setItem(STORAGE_KEY_MEJORA_BACKUP_CARGOS, raw);
      }
      const seedPlanByRef = new Map(planesSeed.map((s) => [s.claveReferencia, s]));
      const riskById = new Map(riesgos.map((r) => [r.id, r]));
      mergedPlanes = mergedPlanes.map((p) => {
        const seedPlan = seedPlanByRef.get(p.claveReferencia);
        const risk = riskById.get(p.riesgoId);
        const { cargoPrincipal, cargosOficiales } = resolverCargoPrincipalYExpuestos(
          risk?.cargo || p.cargoMatriz,
          risk?.cargosExpuestos
        );
        const nuevoCargoMatriz = cargosOficiales.join(', ');
        const respNorm =
          p.responsable &&
          !p.responsable.toLowerCase().includes('coordinador') &&
          !p.responsable.toLowerCase().includes('vigía') &&
          !p.responsable.toLowerCase().includes('vigia') &&
          !p.responsable.toLowerCase().includes('fritura') &&
          !p.responsable.toLowerCase().includes('maquinaria') &&
          !p.responsable.toLowerCase().includes('mantenimiento') &&
          !p.responsable.toLowerCase().includes('repartidor') &&
          !p.responsable.toLowerCase().includes('auxiliar')
            ? resolverCargoPrincipalYExpuestos(p.responsable).cargoPrincipal
            : seedPlan?.responsable || cargoPrincipal;

        return {
          ...p,
          cargoMatriz: nuevoCargoMatriz,
          responsable: respNorm,
          riesgoSnapshot: {
            ...p.riesgoSnapshot,
            cargo: nuevoCargoMatriz,
          },
          capacitacion:
            seedPlan &&
            (!p.capacitacion.observaciones || p.capacitacion.observaciones.trim() === '')
              ? {
                  ...p.capacitacion,
                  objetivo: seedPlan.capacitacion.objetivo,
                }
              : p.capacitacion,
        };
      });

      const emgSeedActMap = new Map(
        emergenciasSeed.programaCapacitacionSimulacros.map((a) => [a.id, a])
      );
      mergedEmergencias = {
        ...mergedEmergencias,
        identificacionEmpresa: {
          ...mergedEmergencias.identificacionEmpresa,
          numeroTrabajadores: emergenciasSeed.identificacionEmpresa.numeroTrabajadores,
        },
        alcance: emergenciasSeed.alcance,
        descripcionActividadesFrikaz: emergenciasSeed.descripcionActividadesFrikaz,
        organizacionEmergencias:
          mergedEmergencias.organizacionEmergencias.map((org, idx) => {
            const seedOrg = emergenciasSeed.organizacionEmergencias[idx];
            if (!seedOrg) return org;
            const sinAsignar =
              !org.responsablePrincipal ||
              org.responsablePrincipal.toLowerCase().includes('pendiente');
            return {
              ...org,
              rol: seedOrg.rol,
              responsablePrincipal: sinAsignar
                ? seedOrg.responsablePrincipal
                : org.responsablePrincipal,
              suplente:
                !org.suplente || org.suplente.toLowerCase().includes('pendiente')
                  ? seedOrg.suplente
                  : org.suplente,
            };
          }),
        programaCapacitacionSimulacros: (
          mergedEmergencias.programaCapacitacionSimulacros || []
        ).map((act) => {
          const sAct = emgSeedActMap.get(act.id);
          return sAct
            ? {
                ...act,
                titulo: sAct.titulo,
                responsable: sAct.responsable,
                participantesEsperados: sAct.participantesEsperados,
              }
            : act;
        }),
        inspeccionEquiposPrograma: {
          ...mergedEmergencias.inspeccionEquiposPrograma,
          responsable: emergenciasSeed.inspeccionEquiposPrograma.responsable,
        },
      };

      localStorage.setItem(CARGOS_6_FLAG_MEJORA, '1');
      dirty = true;
    }

    const result: PlanesMejoraYEmergenciasStore = {
      versionEsquema: 1,
      ultimaActualizacion: parsed.ultimaActualizacion || new Date().toISOString(),
      planesPorRiesgo: mergedPlanes,
      planEmergencias: mergedEmergencias,
      formatos: mergedFormatos,
    };
    if (dirty) {
      savePlanesMejoraEmergenciasStore(result);
    }
    return result;
  } catch (err) {
    console.error('Error cargando planes de mejora y emergencias:', err);
    return {
      versionEsquema: 1,
      ultimaActualizacion: new Date().toISOString(),
      planesPorRiesgo: planesSeed,
      planEmergencias: emergenciasSeed,
      formatos: formatosSeed,
    };
  }
}

export function savePlanesMejoraEmergenciasStore(
  store: PlanesMejoraYEmergenciasStore
): boolean {
  try {
    const next: PlanesMejoraYEmergenciasStore = {
      ...store,
      ultimaActualizacion: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_MEJORA_EMERGENCIAS, JSON.stringify(next));
    return true;
  } catch (err) {
    console.error('Error guardando planes de mejora y emergencias:', err);
    return false;
  }
}

export interface CambioDetectadoMatrizPlan {
  cambiado: boolean;
  eliminadoDeMatriz: boolean;
  cambios: string[];
  riesgoActual?: RiesgoGTC45Item;
}

/**
 * Detecta si un riesgo vinculado en la Matriz GTC 45 cambió respecto al último snapshot
 * guardado en su Plan de Mejora (sin sobrescribir planes ya trabajados o aprobados).
 */
export function detectarCambiosMatrizEnPlan(
  plan: PlanMejoraPorRiesgo,
  riesgos: RiesgoGTC45Item[]
): CambioDetectadoMatrizPlan {
  const actual = riesgos.find(
    (r) => r.id === plan.riesgoId || (plan.riesgoCodigo && r.codigo === plan.riesgoCodigo)
  );
  if (!actual) {
    return {
      cambiado: true,
      eliminadoDeMatriz: true,
      cambios: [
        `El riesgo ${plan.riesgoCodigo || plan.riesgoId} ya no aparece en la Matriz GTC 45 actual. Revise si debe ajustar este plan.`,
      ],
    };
  }

  const cambios: string[] = [];
  if (actual.interpretacionNR !== plan.riesgoSnapshot.interpretacionNR) {
    cambios.push(
      `Cambió el nivel de riesgo: de ${plan.riesgoSnapshot.interpretacionNR} a ${actual.interpretacionNR} (puntaje ${actual.nivelRiesgo}).`
    );
  }
  if (
    actual.peligroDescripcion.trim() !== plan.riesgoSnapshot.peligroDescripcion.trim()
  ) {
    cambios.push('Cambió la descripción del peligro en la matriz.');
  }
  const medidasActuales = extraerMedidasRiesgo(actual);
  if (medidasActuales.trim() !== plan.riesgoSnapshot.medidasResumen.trim()) {
    cambios.push('Se actualizaron las medidas de prevención o control en la matriz.');
  }
  const cargoActual = resolverCargoPrincipalYExpuestos(
    actual.cargo,
    actual.cargosExpuestos
  ).cargosOficiales.join(', ');
  if (cargoActual.trim() !== plan.riesgoSnapshot.cargo.trim()) {
    cambios.push(`Cambió el cargo expuesto a "${cargoActual}".`);
  }

  return {
    cambiado: cambios.length > 0,
    eliminadoDeMatriz: false,
    cambios,
    riesgoActual: actual,
  };
}

/**
 * Encuentra riesgos de la Matriz GTC 45 que aún no tienen su propio Plan de Mejora individual.
 */
export function obtenerRiesgosMatrizSinPlan(
  planes: PlanMejoraPorRiesgo[],
  riesgos: RiesgoGTC45Item[]
): RiesgoGTC45Item[] {
  const idsCubiertos = new Set(planes.map((p) => p.riesgoId));
  // Evitar duplicar riesgos que ya quedaron agrupados como complementarios de los 10 base si coinciden por id
  return riesgos.filter((r) => !idsCubiertos.has(r.id));
}

export function crearPlanesParaRiesgosFaltantes(
  planesActuales: PlanMejoraPorRiesgo[],
  riesgosFaltantes: RiesgoGTC45Item[]
): PlanMejoraPorRiesgo[] {
  let seq = planesActuales.reduce((max, p) => Math.max(max, p.orden), 0) + 1;
  const nuevos = riesgosFaltantes.map((r) => construirPlanDesdeRiesgoMatriz(r, seq++));
  return [...planesActuales, ...nuevos];
}

// ============================================================================
// 2. CONSTRUCTOR DE TABLA «CAJA DE CALIDAD» COMPLETA EN WORD (.DOCX - TIMES NEW ROMAN)
//    Incluye Empresa, Nombre del documento, Código, Versión, Fecha,
//    Elaboró, Revisó y Aprobó.
// ============================================================================

const BORDE_NEGRO = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000',
};

const BORDES_COMPLETOS = {
  top: BORDE_NEGRO,
  bottom: BORDE_NEGRO,
  left: BORDE_NEGRO,
  right: BORDE_NEGRO,
};

const BORDE_GRIS_TABLA = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '666666',
};

const BORDES_TABLA_DATOS = {
  top: BORDE_GRIS_TABLA,
  bottom: BORDE_GRIS_TABLA,
  left: BORDE_GRIS_TABLA,
  right: BORDE_GRIS_TABLA,
};

function txt(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; size?: number; color?: string }
): TextRun {
  return new TextRun({
    text: text || '',
    font: DOCX_FONT,
    size: opts?.size ?? DOCX_FONT_SIZE_BODY,
    bold: opts?.bold,
    italics: opts?.italics,
    color: opts?.color ?? '000000',
  });
}

function crearCajaCalidadCompletaDocx(
  caja: CajaCalidadEditable,
  logoBytes?: Uint8Array | null
): Table {
  const cellMargins = { top: 65, bottom: 65, left: 100, right: 100 };

  const logoChildren: Paragraph[] =
    logoBytes && logoBytes.length > 0
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 20 },
            children: [
              new ImageRun({
                data: logoBytes,
                transformation: { width: 105, height: 45 },
                type: 'jpg',
              }),
            ],
          }),
        ]
      : [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 10, after: 10 },
            children: [txt('PRODUCTOS COMESTIBLES', { bold: true, size: 15, color: '555555' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 10, after: 10 },
            children: [txt('FRIKAZ', { bold: true, size: 24, color: 'D9381E' })],
          }),
        ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Fila 1: Logo (3 filas) | Empresa | Código
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 3,
            width: { size: 22, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: logoChildren,
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 20 },
                children: [txt(caja.empresa || 'Frikaz S.A.S.', { bold: true, size: 24 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Código: ', { bold: true, size: DOCX_FONT_SIZE_META }),
                  txt(caja.codigo || 'Pendiente por asignar', { size: DOCX_FONT_SIZE_META }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Fila 2: Título documento (2 filas) | Versión
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 2,
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 20 },
                children: [
                  txt((caja.nombreDocumento || 'DOCUMENTO SG-SST').toUpperCase(), {
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Versión: ', { bold: true, size: DOCX_FONT_SIZE_META }),
                  txt(caja.version || 'Pendiente por definir', { size: DOCX_FONT_SIZE_META }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Fila 3: Fecha elaboración / actualización
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Fecha: ', { bold: true, size: DOCX_FONT_SIZE_META }),
                  txt(caja.fechaElaboracionActualizacion || 'Pendiente por definir', {
                    size: DOCX_FONT_SIZE_META,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Fila 4: Elaboró | Revisó | Aprobó
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            children: [
              new Paragraph({
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Elaboró: ', { bold: true, size: 18 }),
                  txt(caja.elaboro || 'Pendiente por definir', { size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            children: [
              new Paragraph({
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Revisó: ', { bold: true, size: 18 }),
                  txt(caja.reviso || 'Pendiente por definir', { size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: BORDES_COMPLETOS,
            margins: cellMargins,
            children: [
              new Paragraph({
                spacing: { before: 15, after: 15 },
                children: [
                  txt('Aprobó: ', { bold: true, size: 18 }),
                  txt(caja.aprobo || 'Pendiente por aprobación de Gerencia', { size: 18 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function crearTablaSimpleDocx(columnas: string[], filas: string[][]): Table {
  const anchoCol = Math.floor(100 / Math.max(1, columnas.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: columnas.map(
          (col) =>
            new TableCell({
              width: { size: anchoCol, type: WidthType.PERCENTAGE },
              borders: BORDES_TABLA_DATOS,
              margins: { top: 70, bottom: 70, left: 90, right: 90 },
              shading: { fill: 'EAF5F2' },
              children: [
                new Paragraph({
                  spacing: { before: 10, after: 10 },
                  children: [txt(col, { bold: true, size: 20 })],
                }),
              ],
            })
        ),
      }),
      ...filas.map(
        (fila) =>
          new TableRow({
            children: columnas.map((_, idx) => {
              const val = fila[idx] ?? '';
              return new TableCell({
                width: { size: anchoCol, type: WidthType.PERCENTAGE },
                borders: BORDES_TABLA_DATOS,
                margins: { top: 70, bottom: 70, left: 90, right: 90 },
                children: [
                  new Paragraph({
                    spacing: { before: 10, after: 10 },
                    children: [txt(val || ' ', { size: 20 })],
                  }),
                ],
              });
            }),
          })
      ),
    ],
  });
}

function headingSec(texto: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { line: DOCX_LINE_SPACING_1_5, before: 220, after: 100 },
    children: [txt(texto, { bold: true, size: 24, color: '0F5B53' })],
  });
}

function parrafoNormal(texto: string, boldPrefix?: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: DOCX_LINE_SPACING_1_5, after: 100 },
    children: boldPrefix
      ? [txt(boldPrefix, { bold: true }), txt(texto)]
      : [txt(texto)],
  });
}

function bulletItem(texto: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: DOCX_LINE_SPACING_1_5, after: 60 },
    children: [txt(texto)],
  });
}

function crearDocumentoBaseDocx(titulo: string, children: Array<Paragraph | Table>): Document {
  return new Document({
    creator: 'FRIKAZ S.A.S. - SG-SST',
    title: titulo,
    styles: {
      default: {
        document: {
          run: { font: DOCX_FONT, size: DOCX_FONT_SIZE_BODY, color: '000000' },
          paragraph: {
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 120 },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_1_INCH,
              bottom: DOCX_MARGIN_1_INCH,
              left: DOCX_MARGIN_1_INCH,
              right: DOCX_MARGIN_1_INCH,
            },
          },
        },
        children,
      },
    ],
  });
}

// ============================================================================
// 3. EXPORTADORES A WORD (.DOCX) — TODOS CON CAJA DE CALIDAD Y TIMES NEW ROMAN
// ============================================================================

export async function exportarFormatoWordDocx(
  formato: FormatoEditableDocumento
): Promise<void> {
  const logo = await cargarLogoFrikazBytes();
  const children: Array<Paragraph | Table> = [
    crearCajaCalidadCompletaDocx(formato.cajaCalidad, logo),
    new Paragraph({
      spacing: { before: 140, after: 120 },
      children: [
        txt('Instrucciones: ', { bold: true, size: 22 }),
        txt(formato.instruccionesUso, { italics: true, size: 22 }),
      ],
    }),
  ];

  if (formato.camposEncabezado.length > 0) {
    children.push(
      headingSec('1. DATOS GENERALES DEL REGISTRO'),
      crearTablaSimpleDocx(
        ['Campo', 'Información diligenciada'],
        formato.camposEncabezado.map((c) => [c.etiqueta, c.valor || '___________________________'])
      )
    );
  }

  if (formato.itemsVerificacion.length > 0) {
    children.push(
      headingSec('2. LISTA DE VERIFICACIÓN'),
      crearTablaSimpleDocx(
        ['Ítem a revisar', 'Estado (Marque con X)', 'Observaciones'],
        formato.itemsVerificacion.map((it) => {
          const marca =
            it.cumplimiento === 'SI'
              ? '[X] Sí   [ ] No   [ ] N/A'
              : it.cumplimiento === 'NO'
                ? '[ ] Sí   [X] No   [ ] N/A'
                : it.cumplimiento === 'NA'
                  ? '[ ] Sí   [ ] No   [X] N/A'
                  : '[ ] Sí   [ ] No   [ ] N/A';
          return [it.criterio, marca, it.observacion || ''];
        })
      )
    );
  }

  if (formato.tablaRegistro) {
    children.push(
      headingSec(`3. ${formato.tablaRegistro.titulo.toUpperCase()}`),
      crearTablaSimpleDocx(
        formato.tablaRegistro.columnas,
        formato.tablaRegistro.filas
      )
    );
  }

  children.push(
    headingSec('OBSERVACIONES Y FIRMA DE VERIFICACIÓN'),
    parrafoNormal(
      formato.observacionesGenerales ||
        '_________________________________________________________________________________________'
    ),
    parrafoNormal('_________________________________________________________________________________________'),
    parrafoNormal(
      'Nota: Diligenciar o descargar este formato no aprueba automáticamente el plan; requiere revisión de Andrea Orjuela – Gerente.',
      'Control del SG-SST: '
    )
  );

  const doc = crearDocumentoBaseDocx(formato.titulo, children);
  const slug = formato.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  await descargarDocumentoDocx(doc, `Frikaz_${slug}.docx`);
}

export async function exportarMaterialCapacitacionWordDocx(
  material: MaterialCapacitacionPlan,
  cajaCustom?: CajaCalidadEditable
): Promise<void> {
  const logo = await cargarLogoFrikazBytes();
  const caja = cajaCustom || crearCajaCalidadEditable(`CAPACITACIÓN: ${material.nombre}`);

  const children: Array<Paragraph | Table> = [
    crearCajaCalidadCompletaDocx(caja, logo),
    headingSec(`GUÍA DE CAPACITACIÓN: ${material.nombre}`),
    parrafoNormal(material.objetivo, 'Objetivo: '),
    parrafoNormal(material.duracionSugerida, 'Duración sugerida: '),

    headingSec('1. TEMAS PRINCIPALES'),
    ...material.temasPrincipales.map(bulletItem),

    headingSec('2. EXPLICACIÓN SENCILLA PARA LOS TRABAJADORES'),
    ...material.desarrolloSencillo.map((p) => parrafoNormal(p)),

    headingSec('3. RECOMENDACIONES PRÁCTICAS'),
    ...material.recomendacionesPracticas.map(bulletItem),

    headingSec('4. ACTIVIDAD CORTA DE COMPRENSIÓN'),
    parrafoNormal(material.actividadComprension),

    headingSec('5. EVALUACIÓN SENCILLA (PREGUNTAS DE VERIFICACIÓN)'),
    crearTablaSimpleDocx(
      ['Pregunta para el equipo', 'Respuesta esperada'],
      material.evaluacionSencilla.map((ev) => [ev.pregunta, ev.respuestaEsperada])
    ),

    headingSec('6. REGISTRO DE ASISTENCIA'),
    crearTablaSimpleDocx(
      ['N.°', 'Nombre completo del trabajador', 'Cargo', 'Fecha', 'Firma / Confirmación'],
      material.asistenciaRegistrada.map((a, idx) => [
        String(idx + 1),
        a.nombreTrabajador || '',
        a.cargo || '',
        a.fecha || '',
        a.firmaOConfirmacion || '',
      ])
    ),

    headingSec('7. OBSERVACIONES DE LA JORNADA'),
    parrafoNormal(material.observaciones || '___________________________________________________________'),
  ];

  const doc = crearDocumentoBaseDocx(material.nombre, children);
  const cleanName = material.nombre.slice(0, 35).replace(/[^a-zA-Z0-9]+/g, '_');
  await descargarDocumentoDocx(doc, `Frikaz_Capacitacion_${cleanName}.docx`);
}

export async function exportarPlanMejoraIndividualWordDocx(
  plan: PlanMejoraPorRiesgo,
  formatosAsociados: FormatoEditableDocumento[]
): Promise<void> {
  const logo = await cargarLogoFrikazBytes();
  const caja = crearCajaCalidadEditable(`PLAN DE MEJORA POR RIESGO: ${plan.nombreRiesgo}`);

  const children: Array<Paragraph | Table> = [
    crearCajaCalidadCompletaDocx(caja, logo),
    headingSec(`PLAN DE MEJORA N.° ${plan.orden}: ${plan.nombreRiesgo}`),
    crearTablaSimpleDocx(
      ['Dato del plan', 'Detalle'],
      [
        ['Riesgo vinculado en Matriz GTC 45', `${plan.riesgoCodigo} — Nivel ${plan.nivelRiesgoMatriz} (Puntaje ${plan.puntajeMatriz})`],
        ['Cargo / Proceso identificado', `${plan.cargoMatriz} (${plan.procesoMatriz})`],
        [
          'Validación en realidad de Frikaz S.A.S.',
          plan.estadoValidacionReal === 'CONFIRMADO'
            ? `Confirmado en planta — ${plan.motivoValidacionReal}`
            : `Pendiente de validación — ${plan.motivoValidacionReal}`,
        ],
        ['Responsable', plan.responsable],
        ['Fechas programadas', `Inicio: ${plan.fechaInicio}  |  Fin: ${plan.fechaFin}`],
        ['Estado actual del plan', plan.estado],
        ['Revisión de Gerencia', plan.revisionGerente ? `${plan.revisionGerente.resultadoRevision} (${plan.revisionGerente.fechaRevision}) por ${plan.revisionGerente.revisadoPor}` : 'Pendiente de revisión de Andrea Orjuela – Gerente'],
      ]
    ),

    headingSec('1. SITUACIÓN QUE SE BUSCA MEJORAR Y EXPLICACIÓN SENCILLA'),
    parrafoNormal(plan.situacionQueSeBuscaMejorar, 'Situación identificada: '),
    parrafoNormal(plan.explicacionSencilla, 'Explicación sencilla para los trabajadores: '),

    headingSec('2. ACTIVIDAD DE MEJORA Y MEDIDA DE PREVENCIÓN'),
    parrafoNormal(plan.actividadMejoraPropuesta, 'Actividad de mejora propuesta: '),
    parrafoNormal(plan.medidaPrevencionControl, 'Medida de prevención y control: '),
    parrafoNormal(plan.recursosNecesarios, 'Recursos necesarios (proporcionales a 10 trabajadores): '),
    parrafoNormal(plan.evidenciaRequerida, 'Evidencia requerida para aprobación: '),
    parrafoNormal(plan.resultadoEsperado, 'Resultado esperado: '),

    headingSec('3. CAPACITACIÓN NECESARIA'),
    ...(plan.capacitacion.requiereCapacitacion
      ? [
          parrafoNormal(plan.capacitacion.nombre, 'Nombre de capacitación: '),
          parrafoNormal(plan.capacitacion.objetivo, 'Objetivo: '),
          ...plan.capacitacion.desarrolloSencillo.map((p) => parrafoNormal(p)),
          parrafoNormal(plan.capacitacion.actividadComprension, 'Actividad corta: '),
        ]
      : [parrafoNormal(plan.capacitacion.motivoNoRequiere || 'No requiere capacitación adicional específica.')]),

    headingSec('4. FORMATOS Y DOCUMENTOS DE APOYO'),
    ...formatosAsociados.map((f) => bulletItem(`${f.titulo} (Código: ${f.cajaCalidad.codigo})`)),

    headingSec('5. OBSERVACIONES Y SEGUIMIENTO DE GERENCIA'),
    parrafoNormal(
      plan.observacionesGerencia || 'Sin observaciones registradas aún.',
      'Observaciones de Andrea Orjuela – Gerente: '
    ),
  ];

  const doc = crearDocumentoBaseDocx(`Plan de Mejora - ${plan.nombreRiesgo}`, children);
  await descargarDocumentoDocx(doc, `Frikaz_PlanMejora_${plan.orden}_${plan.claveReferencia}.docx`);
}

export async function exportarPlanEmergenciasCompletoWordDocx(
  plan: PlanEmergenciasFrikaz
): Promise<void> {
  const logo = await cargarLogoFrikazBytes();
  const children: Array<Paragraph | Table> = [
    crearCajaCalidadCompletaDocx(plan.cajaCalidad, logo),

    headingSec('1. IDENTIFICACIÓN DE LA EMPRESA'),
    crearTablaSimpleDocx(
      ['Campo', 'Información de Frikaz S.A.S.'],
      [
        ['Razón social', plan.identificacionEmpresa.razonSocial],
        ['NIT', plan.identificacionEmpresa.nit],
        ['Actividad económica', plan.identificacionEmpresa.actividadEconomica],
        ['Número de trabajadores', plan.identificacionEmpresa.numeroTrabajadores],
        ['Procesos principales', plan.identificacionEmpresa.procesosPrincipales],
        ['Dirección verificada en planta', plan.identificacionEmpresa.direccionVerificada],
        ['Teléfono interno / emergencias', plan.identificacionEmpresa.telefonoEmergenciasInterno],
        ['Horario de operación', plan.identificacionEmpresa.horarioOperacion],
      ]
    ),

    headingSec('2. OBJETIVO GENERAL'),
    parrafoNormal(plan.objetivoGeneral),

    headingSec('3. OBJETIVOS ESPECÍFICOS'),
    ...plan.objetivosEspecificos.map(bulletItem),

    headingSec('4. ALCANCE'),
    parrafoNormal(plan.alcance),

    headingSec('5. DESCRIPCIÓN GENERAL DE ACTIVIDADES DE FRIKAZ S.A.S.'),
    parrafoNormal(plan.descripcionActividadesFrikaz),

    headingSec('6. IDENTIFICACIÓN DE AMENAZAS'),
    parrafoNormal(plan.identificacionAmenazasResumen),

    headingSec('7. ANÁLISIS DE VULNERABILIDAD'),
    parrafoNormal(plan.analisisVulnerabilidad.enPersonas, 'En personas: '),
    parrafoNormal(plan.analisisVulnerabilidad.enRecursosYEquipos, 'En recursos y equipos: '),
    parrafoNormal(plan.analisisVulnerabilidad.enProcesosEInstalaciones, 'En procesos e instalaciones: '),
    parrafoNormal(plan.analisisVulnerabilidad.nivelVulnerabilidadActual, 'Nivel general actual: '),

    headingSec('8. EVALUACIÓN Y PRIORIZACIÓN DE RIESGOS DE EMERGENCIA'),
    parrafoNormal(plan.evaluacionPriorizacion),

    headingSec('9. RECURSOS DISPONIBLES Y POR VERIFICAR'),
    crearTablaSimpleDocx(
      ['Recurso / Equipo', 'Categoría', 'Estado de verificación', 'Cantidad y ubicación real'],
      plan.recursosDisponibles.map((r) => [
        r.recurso,
        r.categoria,
        r.estadoVerificacion,
        r.cantidadUbicacion,
      ])
    ),

    headingSec('10. ORGANIZACIÓN Y RESPONSABILIDADES (10 TRABAJADORES)'),
    crearTablaSimpleDocx(
      ['Rol sencillo', 'Función', 'Responsable principal', 'Suplente'],
      plan.organizacionEmergencias.map((o) => [
        o.rol,
        o.funcionSencilla,
        o.responsablePrincipal,
        o.suplente,
      ])
    ),

    headingSec('11. PROCEDIMIENTO GENERAL ANTE EMERGENCIAS'),
    ...plan.procedimientoGeneral.map((p) => parrafoNormal(p)),

    headingSec('12. PROCEDIMIENTOS ESPECÍFICOS POR TIPO DE EMERGENCIA'),
    ...plan.escenarios.flatMap((esc) => [
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          txt(`${esc.nombre} `, { bold: true, size: 22, color: '0F5B53' }),
          txt(
            `[${esc.estadoValidacion === 'CONFIRMADO' ? 'Confirmado en planta' : 'Pendiente de validación'}]`,
            { italics: true, size: 20, color: '555555' }
          ),
        ],
      }),
      parrafoNormal(esc.sustentoEnFrikaz, 'Contexto en Frikaz: '),
      parrafoNormal(esc.queHacer.join(' '), 'Qué hacer: '),
      parrafoNormal(esc.queNoHacer.join(' '), 'Qué NO hacer: '),
      parrafoNormal(`${esc.comoInformar} Avisar a: ${esc.aQuienAvisar}`, 'Cómo informar y a quién avisar: '),
      parrafoNormal(`${esc.cuandoEvacuar} Protección: ${esc.comoProtegerse}`, 'Cuándo evacuar y cómo protegerse: '),
      parrafoNormal(esc.comoSolicitarAyudaExterna, 'Cómo solicitar ayuda externa: '),
    ]),

    headingSec('13. RUTAS Y SALIDAS DE EVACUACIÓN'),
    parrafoNormal(plan.rutasSalidasEvacuacion.rutaPrincipal, 'Ruta principal: '),
    parrafoNormal(plan.rutasSalidasEvacuacion.salidasEmergencia, 'Salidas de emergencia: '),
    parrafoNormal(plan.rutasSalidasEvacuacion.senalizacionEIluminacion, 'Señalización e iluminación: '),

    headingSec('14. PUNTO DE ENCUENTRO'),
    parrafoNormal(plan.puntoEncuentro.ubicacionDefinida, 'Ubicación definida: '),
    parrafoNormal(plan.puntoEncuentro.criterioSeguridad, 'Criterio de seguridad: '),
    parrafoNormal(plan.puntoEncuentro.verificacionConteo, 'Verificación de asistencia: '),

    headingSec('15. COMUNICACIÓN Y SOLICITUD DE AYUDA EXTERNA'),
    parrafoNormal(plan.comunicacionAyudaExterna.mecanismoAlarmaInterna, 'Alarma interna: '),
    crearTablaSimpleDocx(
      ['Entidad / Contacto', 'Teléfono', 'Cuándo llamar'],
      plan.comunicacionAyudaExterna.directorioExterno.map((d) => [d.entidad, d.telefono, d.cuandoLlamar])
    ),

    headingSec('16 Y 17. PROGRAMA DE CAPACITACIONES Y SIMULACROS'),
    crearTablaSimpleDocx(
      ['Tipo', 'Actividad', 'Fecha programada', 'Responsable', 'Estado'],
      plan.programaCapacitacionSimulacros.map((c) => [
        c.tipo,
        c.titulo,
        c.fechaProgramada,
        c.responsable,
        c.estado,
      ])
    ),

    headingSec('18. INSPECCIÓN DE EQUIPOS DE EMERGENCIA'),
    parrafoNormal(plan.inspeccionEquiposPrograma.frecuenciaSugerida, 'Frecuencia: '),
    parrafoNormal(plan.inspeccionEquiposPrograma.criteriosRevision, 'Criterios: '),
    parrafoNormal(plan.inspeccionEquiposPrograma.proximaInspeccion, 'Próxima inspección: '),

    headingSec('19. REGISTROS Y EVIDENCIAS ADJUNTAS'),
    parrafoNormal(
      plan.evidenciasPlan.length > 0
        ? `Actualmente hay ${plan.evidenciasPlan.length} soporte(s) adjunto(s) para revisión de Gerencia.`
        : 'Aún no se han adjuntado evidencias de ejecución o simulacro.'
    ),

    headingSec('20. SEGUIMIENTO, REVISIÓN Y ACTUALIZACIÓN'),
    parrafoNormal(plan.seguimientoActualizacion.estado, 'Estado del Plan: '),
    parrafoNormal(plan.seguimientoActualizacion.frecuenciaRevision, 'Frecuencia de revisión: '),
    parrafoNormal(plan.seguimientoActualizacion.ultimaRevision, 'Última revisión en planta: '),
    parrafoNormal(
      plan.seguimientoActualizacion.observacionesGerencia || 'Pendiente de revisión y aprobación de Andrea Orjuela – Gerente.',
      'Observaciones de Gerencia: '
    ),
  ];

  const doc = crearDocumentoBaseDocx('Plan de Emergencias Frikaz S.A.S.', children);
  await descargarDocumentoDocx(doc, 'Frikaz_Plan_de_Emergencias_Completo.docx');
}
