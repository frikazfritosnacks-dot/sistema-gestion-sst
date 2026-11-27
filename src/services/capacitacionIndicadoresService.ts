import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import type {
  ActividadCapacitacionSimulacro,
  CondicionIndicadorCapacitacion,
  EncuestaSatisfaccionCapacitacion,
  IndicadoresGestionCapacitacion,
} from '../types/planAnualMejoraEmergencias';

export const PREGUNTAS_ENCUESTA_SATISFACCION = [
  {
    key: 'p1Contenido' as const,
    numero: 1,
    texto: '¿Cómo califica el contenido de la capacitación?',
  },
  {
    key: 'p2Claridad' as const,
    numero: 2,
    texto: '¿Considera que los temas explicados fueron claros y fáciles de entender?',
  },
  {
    key: 'p3Utilidad' as const,
    numero: 3,
    texto: '¿Considera que lo aprendido puede ser útil para su trabajo?',
  },
  {
    key: 'p4Metodologia' as const,
    numero: 4,
    texto: '¿Cómo califica la metodología utilizada durante la capacitación?',
  },
];

export const ESCALA_LIKERT_CAPACITACION: Array<{
  valor: 1 | 2 | 3 | 4 | 5;
  etiqueta: string;
}> = [
  { valor: 1, etiqueta: '1 - Muy insatisfecho' },
  { valor: 2, etiqueta: '2 - Insatisfecho' },
  { valor: 3, etiqueta: '3 - Ni satisfecho ni insatisfecho' },
  { valor: 4, etiqueta: '4 - Satisfecho' },
  { valor: 5, etiqueta: '5 - Muy satisfecho' },
];

export function crearIndicadoresGestionVacios(): IndicadoresGestionCapacitacion {
  return {
    asistencia: {
      convocados: null,
      asistentes: null,
      evidencias: [],
      observaciones: '',
    },
    presupuesto: {
      presupuestoAsignado: null,
      valorEjecutado: null,
      soportesGasto: [],
      observaciones: '',
    },
    encuestasSatisfaccion: [],
    historialCambios: [],
  };
}

export function asegurarIndicadoresGestion(
  ind?: IndicadoresGestionCapacitacion
): IndicadoresGestionCapacitacion {
  if (!ind) return crearIndicadoresGestionVacios();
  return {
    asistencia: {
      convocados: ind.asistencia?.convocados ?? null,
      asistentes: ind.asistencia?.asistentes ?? null,
      evidencias: Array.isArray(ind.asistencia?.evidencias) ? ind.asistencia.evidencias : [],
      fechaActualizacion: ind.asistencia?.fechaActualizacion,
      observaciones: ind.asistencia?.observaciones || '',
    },
    presupuesto: {
      presupuestoAsignado: ind.presupuesto?.presupuestoAsignado ?? null,
      valorEjecutado: ind.presupuesto?.valorEjecutado ?? null,
      soportesGasto: Array.isArray(ind.presupuesto?.soportesGasto)
        ? ind.presupuesto.soportesGasto
        : [],
      fechaActualizacion: ind.presupuesto?.fechaActualizacion,
      observaciones: ind.presupuesto?.observaciones || '',
    },
    encuestasSatisfaccion: Array.isArray(ind.encuestasSatisfaccion)
      ? ind.encuestasSatisfaccion
      : [],
    fechaActualizacionSatisfaccion: ind.fechaActualizacionSatisfaccion,
    historialCambios: Array.isArray(ind.historialCambios) ? ind.historialCambios : [],
  };
}

export interface ResultadoAsistenciaEficiencia {
  nombreIndicador: string;
  tipo: 'Eficiencia';
  meta: string;
  tendencia: string;
  formula: string;
  convocados: number | null;
  asistentes: number | null;
  noAsistieron: number | null;
  porcentaje: number | null;
  condicion: CondicionIndicadorCapacitacion;
  textoResultado: string;
  alertaCoherencia?: string;
}

export function calcularEficienciaAsistencia(
  ind?: IndicadoresGestionCapacitacion
): ResultadoAsistenciaEficiencia {
  const safe = asegurarIndicadoresGestion(ind);
  const { convocados, asistentes } = safe.asistencia;

  const base: Omit<
    ResultadoAsistenciaEficiencia,
    'convocados' | 'asistentes' | 'noAsistieron' | 'porcentaje' | 'condicion' | 'textoResultado'
  > = {
    nombreIndicador: 'Asistencia de los participantes (Cumplimiento de los trabajadores)',
    tipo: 'Eficiencia',
    meta: '100%',
    tendencia: 'Ascendente',
    formula: '(Número de asistentes / Número de convocados) × 100',
  };

  if (
    convocados === null ||
    convocados === undefined ||
    convocados <= 0 ||
    asistentes === null ||
    asistentes === undefined ||
    asistentes < 0
  ) {
    return {
      ...base,
      convocados: convocados ?? null,
      asistentes: asistentes ?? null,
      noAsistieron: null,
      porcentaje: null,
      condicion: 'Pendiente de registro',
      textoResultado: 'Pendiente de registro',
    };
  }

  const noAsistieron = Math.max(0, convocados - asistentes);
  const porcentajeRaw = (asistentes / convocados) * 100;
  const porcentaje = Math.round(porcentajeRaw * 10) / 10;

  let condicion: CondicionIndicadorCapacitacion = 'Crítico';
  if (porcentaje >= 98) condicion = 'Satisfactorio';
  else if (porcentaje >= 95) condicion = 'Normal';

  return {
    ...base,
    convocados,
    asistentes,
    noAsistieron,
    porcentaje,
    condicion,
    textoResultado: `${porcentaje.toFixed(1)}%`,
    alertaCoherencia:
      asistentes > convocados
        ? 'El número de asistentes supera al número de convocados; revise el dato antes de cerrar.'
        : undefined,
  };
}

export interface ResultadoPresupuestoEficacia {
  nombreIndicador: string;
  tipo: 'Eficacia';
  meta: string;
  tendencia: string;
  formula: string;
  presupuestoAsignado: number | null;
  valorEjecutado: number | null;
  saldoDisponible: number | null;
  porcentaje: number | null;
  condicion: CondicionIndicadorCapacitacion;
  textoResultado: string;
  alertaSobreejecucion?: string;
}

export function calcularEficaciaPresupuesto(
  ind?: IndicadoresGestionCapacitacion
): ResultadoPresupuestoEficacia {
  const safe = asegurarIndicadoresGestion(ind);
  const { presupuestoAsignado, valorEjecutado } = safe.presupuesto;

  const base: Omit<
    ResultadoPresupuestoEficacia,
    | 'presupuestoAsignado'
    | 'valorEjecutado'
    | 'saldoDisponible'
    | 'porcentaje'
    | 'condicion'
    | 'textoResultado'
  > = {
    nombreIndicador: 'Ejecución presupuestal de capacitación',
    tipo: 'Eficacia',
    meta: '100% a 95%',
    tendencia: 'Ascendente',
    formula: '(Valor ejecutado / Presupuesto asignado) × 100',
  };

  if (
    presupuestoAsignado === null ||
    presupuestoAsignado === undefined ||
    presupuestoAsignado <= 0 ||
    valorEjecutado === null ||
    valorEjecutado === undefined ||
    valorEjecutado < 0
  ) {
    return {
      ...base,
      presupuestoAsignado: presupuestoAsignado ?? null,
      valorEjecutado: valorEjecutado ?? null,
      saldoDisponible: null,
      porcentaje: null,
      condicion: 'Pendiente de registro',
      textoResultado: 'Pendiente de registro',
    };
  }

  const saldoDisponible = presupuestoAsignado - valorEjecutado;
  const porcentaje = Math.round(((valorEjecutado / presupuestoAsignado) * 100) * 10) / 10;

  let condicion: CondicionIndicadorCapacitacion = 'Crítico';
  if (porcentaje >= 95 && porcentaje <= 105) {
    condicion = 'Satisfactorio';
  } else if (porcentaje >= 90 && porcentaje < 95) {
    condicion = 'Normal';
  } else if (porcentaje > 105) {
    condicion = 'Crítico';
  }

  return {
    ...base,
    presupuestoAsignado,
    valorEjecutado,
    saldoDisponible,
    porcentaje,
    condicion,
    textoResultado: `${porcentaje.toFixed(1)}%`,
    alertaSobreejecucion:
      valorEjecutado > presupuestoAsignado
        ? 'El valor ejecutado supera el presupuesto asignado (saldo negativo).'
        : undefined,
  };
}

export interface ResultadoSatisfaccionEfectividad {
  nombreIndicador: string;
  tipo: 'Efectividad';
  meta: string;
  tendencia: string;
  formula: string;
  totalRespuestas: number;
  promedioSobre5: number | null;
  promediosPorPregunta: {
    p1Contenido: number | null;
    p2Claridad: number | null;
    p3Utilidad: number | null;
    p4Metodologia: number | null;
  };
  porcentaje: number | null;
  condicion: CondicionIndicadorCapacitacion;
  textoResultado: string;
}

export function calcularEfectividadSatisfaccion(
  ind?: IndicadoresGestionCapacitacion
): ResultadoSatisfaccionEfectividad {
  const safe = asegurarIndicadoresGestion(ind);
  const encuestas: EncuestaSatisfaccionCapacitacion[] = safe.encuestasSatisfaccion;

  const base: Omit<
    ResultadoSatisfaccionEfectividad,
    | 'totalRespuestas'
    | 'promedioSobre5'
    | 'promediosPorPregunta'
    | 'porcentaje'
    | 'condicion'
    | 'textoResultado'
  > = {
    nombreIndicador: 'Satisfacción frente a las capacitaciones',
    tipo: 'Efectividad',
    meta: '100% a 95%',
    tendencia: 'Ascendente',
    formula: '(Promedio de las calificaciones obtenidas / 5) × 100',
  };

  if (!encuestas || encuestas.length === 0) {
    return {
      ...base,
      totalRespuestas: 0,
      promedioSobre5: null,
      promediosPorPregunta: {
        p1Contenido: null,
        p2Claridad: null,
        p3Utilidad: null,
        p4Metodologia: null,
      },
      porcentaje: null,
      condicion: 'Pendiente de registro',
      textoResultado: 'Pendiente de registro',
    };
  }

  let sumaTotal = 0;
  let conteoNotas = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  let c4 = 0;

  encuestas.forEach((e) => {
    const vals = [
      { k: 'p1', v: Number(e.p1Contenido) },
      { k: 'p2', v: Number(e.p2Claridad) },
      { k: 'p3', v: Number(e.p3Utilidad) },
      { k: 'p4', v: Number(e.p4Metodologia) },
    ];
    vals.forEach(({ k, v }) => {
      if (Number.isFinite(v) && v >= 1 && v <= 5) {
        sumaTotal += v;
        conteoNotas += 1;
        if (k === 'p1') {
          s1 += v;
          c1 += 1;
        } else if (k === 'p2') {
          s2 += v;
          c2 += 1;
        } else if (k === 'p3') {
          s3 += v;
          c3 += 1;
        } else if (k === 'p4') {
          s4 += v;
          c4 += 1;
        }
      }
    });
  });

  if (conteoNotas === 0) {
    return {
      ...base,
      totalRespuestas: encuestas.length,
      promedioSobre5: null,
      promediosPorPregunta: {
        p1Contenido: null,
        p2Claridad: null,
        p3Utilidad: null,
        p4Metodologia: null,
      },
      porcentaje: null,
      condicion: 'Pendiente de registro',
      textoResultado: 'Pendiente de registro',
    };
  }

  const promedioSobre5 = Math.round((sumaTotal / conteoNotas) * 100) / 100;
  const porcentaje = Math.round(((promedioSobre5 / 5) * 100) * 10) / 10;

  let condicion: CondicionIndicadorCapacitacion = 'Crítico';
  if (porcentaje >= 95) condicion = 'Satisfactorio';
  else if (porcentaje >= 90) condicion = 'Normal';

  return {
    ...base,
    totalRespuestas: encuestas.length,
    promedioSobre5,
    promediosPorPregunta: {
      p1Contenido: c1 > 0 ? Math.round((s1 / c1) * 100) / 100 : null,
      p2Claridad: c2 > 0 ? Math.round((s2 / c2) * 100) / 100 : null,
      p3Utilidad: c3 > 0 ? Math.round((s3 / c3) * 100) / 100 : null,
      p4Metodologia: c4 > 0 ? Math.round((s4 / c4) * 100) / 100 : null,
    },
    porcentaje,
    condicion,
    textoResultado: `${porcentaje.toFixed(1)}%`,
  };
}

export function getBadgeCondicionIndicador(cond: CondicionIndicadorCapacitacion): string {
  switch (cond) {
    case 'Satisfactorio':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'Normal':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Crítico':
      return 'bg-rose-100 text-rose-900 border-rose-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export function formatoMonedaCOP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return 'Pendiente de registro';
  }
  return `$${valor.toLocaleString('es-CO')}`;
}

export async function exportarInformeIndicadoresCapacitacionExcel(
  actividades: ActividadCapacitacionSimulacro[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Frikaz S.A.S. - SG-SST Plan de Emergencias';
  wb.created = new Date();

  const ws = wb.addWorksheet('Indicadores Capacitaciones', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:N1');
  const c1 = ws.getCell('A1');
  c1.value =
    'FRIKAZ S.A.S. — INFORME DE INDICADORES DE GESTIÓN DE CAPACITACIONES (PLAN DE EMERGENCIAS)';
  c1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B53' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:N2');
  const c2 = ws.getCell('A2');
  c2.value = `Fecha de generación: ${new Date().toLocaleDateString('es-CO')} | Solo datos reales registrados (campos sin diligenciar se muestran como "Pendiente de registro")`;
  c2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF0D3B36' } };
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F4F1' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  const headers = [
    'Tipo',
    'Capacitación / Simulacro',
    'Fecha programada',
    'Estado',
    'Convocados',
    'Asistentes',
    'No asistieron',
    '% Asistencia (Eficiencia)',
    'Condición Asistencia',
    'Presupuesto asignado',
    'Valor ejecutado',
    'Saldo disponible',
    '% Ejecución Presupuestal (Eficacia)',
    '% Satisfacción (Efectividad) / Encuestas',
  ];

  const hr = ws.getRow(4);
  headers.forEach((h, idx) => {
    const cell = hr.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  hr.height = 30;

  const widths = [14, 34, 16, 18, 12, 12, 13, 18, 18, 18, 18, 18, 22, 26];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  actividades.forEach((act, idx) => {
    const ef = calcularEficienciaAsistencia(act.indicadoresGestion);
    const efi = calcularEficaciaPresupuesto(act.indicadoresGestion);
    const sat = calcularEfectividadSatisfaccion(act.indicadoresGestion);
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = act.tipo === 'SIMULACRO' ? 'Simulacro' : 'Capacitación';
    row.getCell(2).value = act.titulo;
    row.getCell(3).value = act.fechaProgramada;
    row.getCell(4).value = act.estado;
    row.getCell(5).value = ef.convocados ?? 'Pendiente de registro';
    row.getCell(6).value = ef.asistentes ?? 'Pendiente de registro';
    row.getCell(7).value = ef.noAsistieron ?? 'Pendiente de registro';
    row.getCell(8).value = ef.textoResultado;
    row.getCell(9).value = ef.condicion;
    row.getCell(10).value =
      efi.presupuestoAsignado !== null ? efi.presupuestoAsignado : 'Pendiente de registro';
    row.getCell(11).value =
      efi.valorEjecutado !== null ? efi.valorEjecutado : 'Pendiente de registro';
    row.getCell(12).value =
      efi.saldoDisponible !== null ? efi.saldoDisponible : 'Pendiente de registro';
    row.getCell(13).value = `${efi.textoResultado} (${efi.condicion})`;
    row.getCell(14).value =
      sat.porcentaje !== null
        ? `${sat.textoResultado} (${sat.condicion}) - ${sat.totalRespuestas} resp.`
        : 'Pendiente de registro';

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
    row.height = 26;
  });

  // Hoja 2: Encuestas detalladas
  const wsEnc = wb.addWorksheet('Encuestas de Satisfacción');
  wsEnc.mergeCells('A1:I1');
  const e1 = wsEnc.getCell('A1');
  e1.value = 'REGISTRO INDIVIDUAL DE ENCUESTAS DE SATISFACCIÓN DE CAPACITACIONES';
  e1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  e1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B53' } };
  e1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsEnc.getRow(1).height = 24;

  const encHeaders = [
    'Capacitación',
    'Fecha',
    'Participante',
    'Cargo',
    'P1 Contenido (1-5)',
    'P2 Claridad (1-5)',
    'P3 Utilidad (1-5)',
    'P4 Metodología (1-5)',
    'P5 ¿Qué se podría mejorar?',
  ];
  const ehr = wsEnc.getRow(3);
  encHeaders.forEach((h, i) => {
    const cell = ehr.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  });
  [32, 14, 24, 22, 16, 16, 16, 16, 40].forEach((w, i) => {
    wsEnc.getColumn(i + 1).width = w;
  });

  let encRowIdx = 4;
  actividades.forEach((act) => {
    const encuestas = act.indicadoresGestion?.encuestasSatisfaccion || [];
    encuestas.forEach((enc) => {
      const r = wsEnc.getRow(encRowIdx++);
      r.getCell(1).value = act.titulo;
      r.getCell(2).value = enc.fecha;
      r.getCell(3).value = enc.participanteNombre || 'Anónimo';
      r.getCell(4).value = enc.cargo || 'No especificado';
      r.getCell(5).value = enc.p1Contenido;
      r.getCell(6).value = enc.p2Claridad;
      r.getCell(7).value = enc.p3Utilidad;
      r.getCell(8).value = enc.p4Metodologia;
      r.getCell(9).value = enc.p5MejoraAbierta || 'Sin observaciones';
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Indicadores_Capacitaciones_Emergencias_Frikaz_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarInformeIndicadoresCapacitacionPdf(
  actividades: ActividadCapacitacionSimulacro[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFillColor(15, 91, 83);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FRIKAZ S.A.S. — INDICADORES DE GESTIÓN DE CAPACITACIONES', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Plan de Emergencias · Fecha de informe: ${new Date().toLocaleDateString('es-CO')}`,
    margin,
    18
  );

  y = 33;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Criterios de evaluación (Frikaz S.A.S.):', margin, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    '• Eficiencia (Asistencia): (Asistentes / Convocados) × 100 | Meta 100% | Satisfactorio >=98%, Normal 95-97%, Crítico <95%',
    margin,
    y
  );
  y += 4;
  doc.text(
    '• Eficacia (Presupuesto): (Valor ejecutado / Presupuesto asignado) × 100 | Meta 95%-100% | Satisfactorio 95-100%, Normal 90-94%, Crítico <90%',
    margin,
    y
  );
  y += 4;
  doc.text(
    '• Efectividad (Satisfacción): (Promedio calificaciones 1-5 / 5) × 100 | Meta 95%-100% | Satisfactorio 95-100%, Normal 90-94%, Crítico <90%',
    margin,
    y
  );
  y += 7;

  actividades.forEach((act, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    const ef = calcularEficienciaAsistencia(act.indicadoresGestion);
    const efi = calcularEficaciaPresupuesto(act.indicadoresGestion);
    const sat = calcularEfectividadSatisfaccion(act.indicadoresGestion);
    const ind = asegurarIndicadoresGestion(act.indicadoresGestion);

    doc.setDrawColor(185, 218, 211);
    doc.setFillColor(244, 250, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(13, 59, 54);
    const tituloLines = doc.splitTextToSize(
      `${idx + 1}. [${act.tipo === 'SIMULACRO' ? 'Simulacro' : 'Capacitación'}] ${act.titulo}`,
      pageWidth - margin * 2 - 6
    );
    doc.text(tituloLines[0], margin + 3, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Fecha programada: ${act.fechaProgramada} | Estado: ${act.estado} | Soportes asistencia: ${ind.asistencia.evidencias.length} | Soportes gasto: ${ind.presupuesto.soportesGasto.length}`,
      margin + 3,
      y + 11.5
    );

    doc.text(
      `1) Asistencia (Eficiencia): ${ef.textoResultado} (${ef.condicion}) — Convocados: ${ef.convocados ?? 'Pendiente'}, Asistentes: ${ef.asistentes ?? 'Pendiente'}, No asistieron: ${ef.noAsistieron ?? 'Pendiente'}`,
      margin + 3,
      y + 17.5
    );
    doc.text(
      `2) Presupuesto (Eficacia): ${efi.textoResultado} (${efi.condicion}) — Asignado: ${formatoMonedaCOP(efi.presupuestoAsignado)}, Ejecutado: ${formatoMonedaCOP(efi.valorEjecutado)}, Saldo: ${formatoMonedaCOP(efi.saldoDisponible)}`,
      margin + 3,
      y + 23
    );
    doc.text(
      `3) Satisfacción (Efectividad): ${sat.textoResultado} (${sat.condicion}) — Encuestas: ${sat.totalRespuestas}, Promedio: ${sat.promedioSobre5 !== null ? `${sat.promedioSobre5}/5` : 'Pendiente de registro'}`,
      margin + 3,
      y + 28.5
    );

    y += 38;
  });

  doc.save(
    `Indicadores_Capacitaciones_Emergencias_Frikaz_${new Date().toISOString().split('T')[0]}.pdf`
  );
}
