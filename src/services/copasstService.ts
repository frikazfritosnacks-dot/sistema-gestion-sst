import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from 'docx';
import {
  crearCajaCalidadDocxTable,
  obtenerMetadatosDocumentoCalidad,
  cargarLogoFrikazBytes,
  DOCX_FONT,
  DOCX_FONT_SIZE_BODY,
  DOCX_LINE_SPACING_1_5,
  DOCX_MARGIN_1_INCH,
} from './calidadDocumentalService';
import type {
  CopasstStore,
  FuncionCopasst,
  TipoNotificacionCopasst,
} from '../types/copasst';
import { NOMBRE_GERENTE_OFICIAL } from './gerenteControlService';

const STORAGE_KEY_COPASST = 'frikaz_copasst_v1';

export const FUNCIONES_COPASST_INICIALES: Omit<
  FuncionCopasst,
  'estadoSeguimiento' | 'actividadesRealizadas'
>[] = [
  {
    id: 'fn-cop-01',
    orden: 1,
    titulo: 'Proponer actividades de mejora',
    descripcion: 'Proponer actividades que ayuden a mejorar la seguridad y salud de los trabajadores.',
  },
  {
    id: 'fn-cop-02',
    orden: 2,
    titulo: 'Promover la participación en SST',
    descripcion: 'Promover la participación de los trabajadores en las actividades de SST.',
  },
  {
    id: 'fn-cop-03',
    orden: 3,
    titulo: 'Apoyar inspecciones de seguridad',
    descripcion: 'Apoyar las inspecciones de seguridad en planta, bodega y rutas.',
  },
  {
    id: 'fn-cop-04',
    orden: 4,
    titulo: 'Revisar condiciones de trabajo e informar peligros',
    descripcion: 'Revisar las condiciones de trabajo e informar sobre posibles peligros.',
  },
  {
    id: 'fn-cop-05',
    orden: 5,
    titulo: 'Participar en investigación de accidentes',
    descripcion: 'Participar en la investigación de accidentes de trabajo cuando corresponda.',
  },
  {
    id: 'fn-cop-06',
    orden: 6,
    titulo: 'Proponer medidas de prevención',
    descripcion: 'Proponer medidas para prevenir accidentes y enfermedades laborales.',
  },
  {
    id: 'fn-cop-07',
    orden: 7,
    titulo: 'Apoyar capacitación y promoción SST',
    descripcion: 'Apoyar las actividades de capacitación y promoción de SST.',
  },
  {
    id: 'fn-cop-08',
    orden: 8,
    titulo: 'Hacer seguimiento a recomendaciones',
    descripcion: 'Realizar seguimiento a las recomendaciones relacionadas con SST.',
  },
  {
    id: 'fn-cop-09',
    orden: 9,
    titulo: 'Participar en reuniones y registrar actas',
    descripcion: 'Participar en las reuniones y dejar registro de los temas tratados.',
  },
  {
    id: 'fn-cop-10',
    orden: 10,
    titulo: 'Comunicar situaciones prioritarias a la gerencia',
    descripcion: 'Comunicar a la gerencia las situaciones que requieran atención.',
  },
];

export const COPASST_STORE_INICIAL: CopasstStore = {
  conformacionConfig: {
    rangoTrabajadoresAplicado: 'Estructura paritaria para Frikaz S.A.S. (10 trabajadores)',
    cuposEmpleadorPrincipal: 1,
    cuposEmpleadorSuplente: 1,
    cuposTrabajadoresPrincipal: 1,
    cuposTrabajadoresSuplente: 1,
    notaNormativa:
      'Referencia normativa colombiana (Decreto 2013 de 1986, Decreto 1072 de 2015, Decreto 1295 de 1994 Art. 63 y Resolución 0312 de 2019): empresas con menos de 10 trabajadores suelen operar con Vigía SST; al contar con 10 trabajadores o conformar comité paritario aplica la estructura de 1 representante principal y 1 suplente por el empleador, y 1 principal y 1 suplente por los trabajadores (periodo de 2 años). Verifique esta obligatoriedad frente a la nómina definitiva antes de la conformación formal.',
    estadoVerificacionLegal: 'Pendiente de verificación normativa',
    estadoComite: 'Pendiente',
  },
  procesoEleccion: {
    fechaConvocatoria: '',
    fechaVotacion: '',
    horarioVotacion: '',
    estadoVotacion: 'Por iniciar',
    candidatos: [],
    votantesRegistradosIds: [],
    votos: [],
    designadosEmpleadorBorrador: {},
    confirmacionOficialRealizada: false,
  },
  miembros: [],
  funciones: FUNCIONES_COPASST_INICIALES.map((f) => ({
    ...f,
    estadoSeguimiento: 'Pendiente',
    actividadesRealizadas: [],
  })),
  simulacionOrganigrama: {
    empleadorPrincipal: null,
    empleadorSuplente: null,
    trabajadoresPrincipal: null,
    trabajadoresSuplente: null,
    fechaActualizacion: new Date().toISOString().split('T')[0],
  },
  notificacionesEnviadas: [],
  repositorioDocumentos: [],
  historialCambios: [
    {
      id: 'cop-init-01',
      fecha: '2026-11-26',
      usuario: 'Sistema SG-SST Frikaz S.A.S.',
      accion: 'Creación del apartado COPASST',
      detalle:
        'Módulo COPASST habilitado sin miembros ni resultados inventados. Los integrantes se registrarán únicamente tras elección/designación confirmada.',
    },
  ],
};

export function loadCopasstStore(): CopasstStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COPASST);
    if (raw) {
      const parsed = JSON.parse(raw) as CopasstStore;
      if (parsed && parsed.procesoEleccion && Array.isArray(parsed.funciones)) {
        return {
          ...COPASST_STORE_INICIAL,
          ...parsed,
          conformacionConfig: {
            ...COPASST_STORE_INICIAL.conformacionConfig,
            ...(parsed.conformacionConfig || {}),
          },
          funciones:
            parsed.funciones.length >= 10
              ? parsed.funciones
              : COPASST_STORE_INICIAL.funciones,
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo COPASST:', err);
  }
  return { ...COPASST_STORE_INICIAL };
}

export function saveCopasstStore(store: CopasstStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_COPASST, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('Error guardando COPASST:', err);
    return false;
  }
}

export function construirPlantillaCorreoCopasst(
  tipo: TipoNotificacionCopasst,
  store: CopasstStore
): { subject: string; text: string } {
  const conv = store.procesoEleccion;
  const activos = store.miembros.filter((m) => m.estado === 'Activo');
  const conteoCandidatos = conv.candidatos
    .map((c) => {
      const votos = conv.votos.filter((v) => v.candidatoId === c.id).length;
      return `- ${c.nombreCompleto} (${c.cargo}): ${votos} voto(s)`;
    })
    .join('\n');

  switch (tipo) {
    case 'Convocatoria a elecciones':
      return {
        subject: 'Convocatoria a elecciones del COPASST – Frikaz S.A.S.',
        text: `Estimados colaboradores de Frikaz S.A.S.,\n\nSe informa la convocatoria oficial para conformar el Comité Paritario de Seguridad y Salud en el Trabajo (COPASST).\n- Fecha de convocatoria: ${conv.fechaConvocatoria || 'Pendiente de verificación'}\n- Fecha de votación: ${conv.fechaVotacion || 'Pendiente de verificación'}\n- Horario: ${conv.horarioVotacion || 'Pendiente de verificación'}\n\nQuienes deseen postularse como representantes de los trabajadores pueden registrarse en la herramienta.\n\nCordialmente,\n${NOMBRE_GERENTE_OFICIAL}\nFrikaz S.A.S.`,
      };
    case 'Apertura del proceso de votación':
      return {
        subject: 'Apertura de votaciones COPASST – Frikaz S.A.S.',
        text: `Estimados colaboradores,\n\nSe encuentra abierto el proceso de votación secreta para elegir a los representantes de los trabajadores ante el COPASST de Frikaz S.A.S.\nFecha: ${conv.fechaVotacion || 'Pendiente de verificación'} | Horario: ${conv.horarioVotacion || 'Pendiente de verificación'}.\nRecuerda: cada trabajador tiene derecho a un único voto confidencial.\n\nCordialmente,\nEquipo SG-SST · Frikaz S.A.S.`,
      };
    case 'Fecha y horario de votación':
      return {
        subject: 'Fecha y horario de votación COPASST – Frikaz S.A.S.',
        text: `Hola equipo de Frikaz S.A.S.,\n\nInformamos la fecha y horario programados para la votación del COPASST:\n- Fecha de votación: ${conv.fechaVotacion || 'Pendiente de verificación'}\n- Horario: ${conv.horarioVotacion || 'Pendiente de verificación'}\n\nTu participación fortalece la seguridad en planta y ruta.\n\nEquipo SG-SST · Frikaz S.A.S.`,
      };
    case 'Recordatorio de votación':
      return {
        subject: 'Recordatorio de votación COPASST – Frikaz S.A.S.',
        text: `Hola equipo de Frikaz S.A.S.,\n\nTe recordamos participar en la elección secreta de los representantes de los trabajadores ante el COPASST:\n- Fecha de votación: ${conv.fechaVotacion || 'Pendiente de verificación'}\n- Horario: ${conv.horarioVotacion || 'Pendiente de verificación'}\n\nCada trabajador tiene derecho a un voto confidencial y libre.\n\nEquipo SG-SST · Frikaz S.A.S.`,
      };
    case 'Resultados de elección':
      return {
        subject: 'Resultados de la elección de representantes de trabajadores al COPASST – Frikaz S.A.S.',
        text: `Estimados colaboradores de Frikaz S.A.S.,\n\nCompartimos los resultados reales registrados en la jornada de votación (${conv.fechaVotacion || 'Pendiente de verificación'}):\n\n${conteoCandidatos || 'Pendiente de verificación (sin candidatos o votos registrados).'}\n\nTotal de votantes registrados: ${conv.votantesRegistradosIds.length}.\n\nCordialmente,\n${NOMBRE_GERENTE_OFICIAL}\nFrikaz S.A.S.`,
      };
    case 'Designación de representantes del empleador':
      return {
        subject: 'Designación de representantes del empleador ante el COPASST – Frikaz S.A.S.',
        text: `Cordial saludo,\n\nLa Gerencia de Frikaz S.A.S. informa la designación de sus representantes ante el Comité Paritario de Seguridad y Salud en el Trabajo (COPASST):\n${
          activos
            .filter((m) => m.representacion === 'Empleador')
            .map((m) => `- ${m.tipoParticipacion}: ${m.nombreCompleto} (${m.cargo})`)
            .join('\n') || '- Pendiente de confirmación oficial.'
        }\n\nCordialmente,\n${NOMBRE_GERENTE_OFICIAL}\nFrikaz S.A.S.`,
      };
    case 'Conformación oficial del comité':
      return {
        subject: 'Conformación oficial del COPASST – Frikaz S.A.S.',
        text: `Estimado equipo de Frikaz S.A.S.,\n\nInformamos la conformación oficial del Comité Paritario de Seguridad y Salud en el Trabajo (COPASST):\n${
          activos
            .map(
              (m) =>
                `- [${m.representacion} · ${m.tipoParticipacion}] ${m.nombreCompleto} — ${m.cargo} (Periodo: ${m.fechaInicioPeriodo || 'Pendiente'} a ${m.fechaFinPeriodo || 'Pendiente'})`
            )
            .join('\n') || '- Pendiente de registro oficial de integrantes.'
        }\n\nCordialmente,\n${NOMBRE_GERENTE_OFICIAL}\nFrikaz S.A.S.`,
      };
    case 'Convocatorias a reuniones':
      return {
        subject: 'Convocatoria a reunión del COPASST – Frikaz S.A.S.',
        text: `Estimados integrantes del COPASST de Frikaz S.A.S.,\n\nSe les convoca a la próxima reunión ordinaria del comité para revisar inspecciones, peligros reportados, actividades del Plan Anual y seguimiento de recomendaciones.\nPor favor confirmar asistencia y revisar los puntos previos en la herramienta.\n\nCordialmente,\nEquipo SG-SST · Frikaz S.A.S.`,
      };
    case 'Recordatorios de actividades':
      return {
        subject: 'Recordatorio de actividades del COPASST – Frikaz S.A.S.',
        text: `Estimados integrantes del COPASST,\n\nLes recordamos realizar seguimiento a las actividades e inspecciones asignadas al comité dentro del Plan Anual 2027 de Frikaz S.A.S. y cargar las actas o evidencias correspondientes.\n\nCordialmente,\nEquipo SG-SST · Frikaz S.A.S.`,
      };
    case 'Comunicación de funciones y responsabilidades':
    default:
      return {
        subject: 'Funciones y responsabilidades del COPASST – Frikaz S.A.S.',
        text: `Estimados integrantes del COPASST de Frikaz S.A.S.,\n\nCompartimos formalmente las funciones del Comité Paritario de Seguridad y Salud en el Trabajo:\n\n${store.funciones
          .map((f) => `${f.orden}. ${f.descripcion}`)
          .join('\n')}\n\nCordialmente,\n${NOMBRE_GERENTE_OFICIAL}\nFrikaz S.A.S.`,
      };
  }
}

export async function generarActaEleccionCopasstPdf(store: CopasstStore): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const conv = store.procesoEleccion;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 91, 83);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FRIKAZ S.A.S. — ACTA DE ELECCIÓN Y CONFORMACIÓN COPASST', pageW / 2, 13, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Comité Paritario de Seguridad y Salud en el Trabajo · SG-SST', pageW / 2, 20, {
    align: 'center',
  });

  let y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Datos del proceso electoral', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Fecha de convocatoria: ${conv.fechaConvocatoria || 'Pendiente de verificación'}   |   Fecha de votación: ${conv.fechaVotacion || 'Pendiente de verificación'}`,
    16,
    y
  );
  y += 5.5;
  doc.text(
    `Horario: ${conv.horarioVotacion || 'Pendiente de verificación'}   |   Total votos secretos emitidos: ${conv.votos.length}`,
    16,
    y
  );
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. Resultados por candidato (Representantes de los trabajadores)', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const ordenados = [...conv.candidatos]
    .map((c) => ({
      ...c,
      votos: conv.votos.filter((v) => v.candidatoId === c.id).length,
    }))
    .sort((a, b) => b.votos - a.votos);

  if (ordenados.length === 0) {
    doc.text('Sin candidatos registrados aún.', 16, y);
    y += 6;
  } else {
    ordenados.forEach((c, idx) => {
      doc.text(
        `${idx + 1}. ${c.nombreCompleto} (${c.cargo}) — ${c.votos} voto(s)`,
        18,
        y
      );
      y += 5.5;
    });
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. Miembros registrados del COPASST', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const activos = store.miembros.filter((m) => m.estado === 'Activo');
  if (activos.length === 0) {
    doc.text('Pendiente de confirmación oficial de integrantes.', 16, y);
    y += 6;
  } else {
    activos.forEach((m) => {
      doc.text(
        `- ${m.representacion} (${m.tipoParticipacion}): ${m.nombreCompleto} · C.C. ${m.numeroIdentificacion || 'Pendiente'} · Cargo: ${m.cargo}`,
        18,
        y
      );
      y += 5.5;
    });
  }

  y += 18;
  doc.line(20, y, 95, y);
  doc.line(115, y, 190, y);
  doc.setFontSize(8.5);
  doc.text(NOMBRE_GERENTE_OFICIAL, 57, y + 5, { align: 'center' });
  doc.text('Testigo / Jurado de votación', 152, y + 5, { align: 'center' });

  doc.save(`Acta_Eleccion_COPASST_Frikaz_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generarActaEleccionCopasstWord(store: CopasstStore): Promise<void> {
  const logoBytes = await cargarLogoFrikazBytes();
  const metaDoc = obtenerMetadatosDocumentoCalidad('ACT-COPASST-01');
  const conv = store.procesoEleccion;
  const ordenados = [...conv.candidatos]
    .map((c) => ({
      ...c,
      votos: conv.votos.filter((v) => v.candidatoId === c.id).length,
    }))
    .sort((a, b) => b.votos - a.votos);
  const activos = store.miembros.filter((m) => m.estado === 'Activo');

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_1_INCH,
              right: DOCX_MARGIN_1_INCH,
              bottom: DOCX_MARGIN_1_INCH,
              left: DOCX_MARGIN_1_INCH,
            },
          },
        },
        children: [
          crearCajaCalidadDocxTable({
            ...metaDoc,
            codigo: 'ACT-COPASST-01',
            tituloDocumento: 'ACTA DE ELECCIÓN Y CONFORMACIÓN DEL COPASST',
            tipoDocumento: 'acta',
            logoBytes,
          }),
          new Paragraph({ spacing: { after: 180 }, children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 180 },
            children: [
              new TextRun({
                text: 'ACTA DE ELECCIÓN Y CONFORMACIÓN DEL COPASST – FRIKAZ S.A.S.',
                bold: true,
                size: DOCX_FONT_SIZE_BODY,
                font: DOCX_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { line: DOCX_LINE_SPACING_1_5, after: 120 },
            children: [
              new TextRun({
                text: `Convocatoria: ${conv.fechaConvocatoria || 'Pendiente de verificación'} | Votación: ${conv.fechaVotacion || 'Pendiente de verificación'} (${conv.horarioVotacion || 'Horario por confirmar'}) | Total votos secretos: ${conv.votos.length}.`,
                size: DOCX_FONT_SIZE_BODY,
                font: DOCX_FONT,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 160, after: 100 },
            children: [
              new TextRun({
                text: 'RESULTADOS DE VOTACIÓN DE LOS TRABAJADORES',
                bold: true,
                size: DOCX_FONT_SIZE_BODY,
                font: DOCX_FONT,
              }),
            ],
          }),
          ...(ordenados.length > 0
            ? ordenados.map(
                (c, i) =>
                  new Paragraph({
                    spacing: { line: DOCX_LINE_SPACING_1_5, after: 80 },
                    children: [
                      new TextRun({
                        text: `${i + 1}. ${c.nombreCompleto} (${c.cargo}): ${c.votos} voto(s).`,
                        size: DOCX_FONT_SIZE_BODY,
                        font: DOCX_FONT,
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Pendiente de registro de candidatos y votaciones.',
                      size: DOCX_FONT_SIZE_BODY,
                      font: DOCX_FONT,
                    }),
                  ],
                }),
              ]),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { line: DOCX_LINE_SPACING_1_5, before: 160, after: 100 },
            children: [
              new TextRun({
                text: 'INTEGRANTES OFICIALES DEL COPASST',
                bold: true,
                size: DOCX_FONT_SIZE_BODY,
                font: DOCX_FONT,
              }),
            ],
          }),
          ...(activos.length > 0
            ? activos.map(
                (m) =>
                  new Paragraph({
                    spacing: { line: DOCX_LINE_SPACING_1_5, after: 80 },
                    children: [
                      new TextRun({
                        text: `- ${m.representacion} (${m.tipoParticipacion}): ${m.nombreCompleto} | Doc: ${m.numeroIdentificacion || 'Pendiente'} | Cargo: ${m.cargo} | Periodo: ${m.fechaInicioPeriodo || 'Pendiente'} a ${m.fechaFinPeriodo || 'Pendiente'}`,
                        size: DOCX_FONT_SIZE_BODY,
                        font: DOCX_FONT,
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Pendiente de confirmación oficial del comité.',
                      size: DOCX_FONT_SIZE_BODY,
                      font: DOCX_FONT,
                    }),
                  ],
                }),
              ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Acta_COPASST_Frikaz_${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
