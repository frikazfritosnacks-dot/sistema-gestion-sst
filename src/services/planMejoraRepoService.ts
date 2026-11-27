import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import type { ActividadPlanAnual } from '../types/planAnual';
import type {
  PlanMejoraPorRiesgo,
  RegistroAsistenciaItem,
} from '../types/planAnualMejoraEmergencias';
import type {
  CertificadoParticipacionMejora,
  DocumentoRepositorioMejora,
  PlanMejoraRepositorioStore,
  TipoDocumentoRepositorioMejora,
} from '../types/planMejoraRepositorio';
import { NOMBRE_GERENTE_OFICIAL } from './gerenteControlService';

const STORAGE_KEY_REPO_MEJORA = 'frikaz_plan_mejora_repo_v1';

// ============================================================================
// 1. PERSISTENCIA EN LOCALSTORAGE
// ============================================================================

export function loadPlanMejoraRepositorio(): PlanMejoraRepositorioStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPO_MEJORA);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanMejoraRepositorioStore;
      if (parsed && Array.isArray(parsed.certificados) && Array.isArray(parsed.documentos)) {
        return {
          certificados: parsed.certificados,
          documentos: parsed.documentos,
          historial: Array.isArray(parsed.historial) ? parsed.historial : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo repositorio de planes de mejora:', err);
  }
  return {
    certificados: [],
    documentos: [],
    historial: [],
  };
}

export function savePlanMejoraRepositorio(store: PlanMejoraRepositorioStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_REPO_MEJORA, JSON.stringify(store));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frikaz:repo-mejora-updated'));
    }
    return true;
  } catch (err) {
    console.error('Error guardando repositorio de planes de mejora:', err);
    return false;
  }
}

// ============================================================================
// 2. VALIDACIÓN ESTRICTA DE ASISTENCIA Y DETECCIÓN DE CAMBIOS POST-EMISIÓN
// ============================================================================

export interface ParticipacionValidadaTrabajador {
  trabajadorNombre: string;
  cargo: string;
  asistio: boolean;
  fechaRealizacion: string;
  firmaOConfirmacion: string;
  totalSesionesRegistradas: number;
  sesionesAsistidas: number;
  cumpleCondicion: boolean;
  motivoBloqueo?: string;
  asistenciaHash: string;
}

export function calcularHashAsistencia(registros: RegistroAsistenciaItem[], fechaFallback: string): string {
  const canon = registros
    .map((r) => `${r.nombreTrabajador.trim().toLowerCase()}|${r.cargo}|${r.fecha || fechaFallback}|${r.asistio ? '1' : '0'}`)
    .sort()
    .join(';');
  return canon;
}

export function evaluarParticipacionTrabajadoresPlan(
  plan: PlanMejoraPorRiesgo,
  actividadesPlan: ActividadPlanAnual[] = []
): ParticipacionValidadaTrabajador[] {
  const registros = plan.capacitacion?.asistenciaRegistrada || [];
  if (registros.length === 0) return [];

  // Agrupar por trabajador por si existen múltiples sesiones registradas para la misma persona
  const porTrabajador = new Map<string, RegistroAsistenciaItem[]>();
  registros.forEach((reg) => {
    const key = reg.nombreTrabajador.trim().toLowerCase();
    if (!key) return;
    const list = porTrabajador.get(key) || [];
    list.push(reg);
    porTrabajador.set(key, list);
  });

  // Revisar también actividades vinculadas del Plan Anual para contexto de fecha
  const actVinculada = actividadesPlan.find(
    (a) =>
      a.planMejoraRiesgoId === plan.id ||
      (a.riesgoId && a.riesgoId === plan.riesgoId)
  );
  const fechaPlan =
    registros.find((r) => r.asistio && r.fecha)?.fecha || actVinculada?.fechaCierre || '';

  const resultado: ParticipacionValidadaTrabajador[] = [];

  porTrabajador.forEach((sesiones) => {
    const base = sesiones[sesiones.length - 1];
    const totalSesiones = sesiones.length;
    const sesionesAsistidas = sesiones.filter((s) => s.asistio === true).length;
    const fechaReal = sesiones.find((s) => s.asistio && s.fecha)?.fecha || fechaPlan;
    const todasAsistidas = sesionesAsistidas > 0 && sesionesAsistidas === totalSesiones;

    let motivoBloqueo: string | undefined;
    if (sesionesAsistidas === 0) {
      motivoBloqueo = 'Sin asistencia registrada (no asistió).';
    } else if (sesionesAsistidas < totalSesiones) {
      motivoBloqueo = `Asistencia incompleta (${sesionesAsistidas}/${totalSesiones} sesiones registradas).`;
    } else if (!fechaReal) {
      motivoBloqueo = 'Falta registrar la fecha real de realización.';
    }

    resultado.push({
      trabajadorNombre: base.nombreTrabajador.trim(),
      cargo: base.cargo,
      asistio: sesionesAsistidas > 0,
      fechaRealizacion: fechaReal,
      firmaOConfirmacion: base.firmaOConfirmacion || '',
      totalSesionesRegistradas: totalSesiones,
      sesionesAsistidas,
      cumpleCondicion: todasAsistidas && Boolean(fechaReal),
      motivoBloqueo,
      asistenciaHash: calcularHashAsistencia(sesiones, fechaReal),
    });
  });

  return resultado;
}

/**
 * Revisa si la asistencia de un plan cambió después de emitir un certificado
 * sin borrar el certificado ya emitido.
 */
export function detectarCambiosAsistenciaEnCertificados(
  store: PlanMejoraRepositorioStore,
  planes: PlanMejoraPorRiesgo[],
  actividadesPlan: ActividadPlanAnual[] = []
): { storeActualizado: PlanMejoraRepositorioStore; alertasNuevas: number } {
  let alertasNuevas = 0;
  const hoy = new Date().toISOString().split('T')[0];
  const historialExtra: PlanMejoraRepositorioStore['historial'] = [];

  const nextCerts = store.certificados.map((cert) => {
    const plan = planes.find((p) => p.id === cert.planId);
    if (!plan) return cert;
    const participaciones = evaluarParticipacionTrabajadoresPlan(plan, actividadesPlan);
    const actual = participaciones.find(
      (p) => p.trabajadorNombre.toLowerCase() === cert.trabajadorNombre.toLowerCase()
    );

    if (!actual || !actual.cumpleCondicion || actual.asistenciaHash !== cert.asistenciaHash) {
      const motivo = !actual
        ? 'El trabajador ya no figura en el listado de asistencia del plan.'
        : !actual.cumpleCondicion
        ? actual.motivoBloqueo || 'La asistencia del trabajador ya no cumple las condiciones.'
        : 'La asistencia o fecha registrada del trabajador fue modificada después de emitir el certificado.';

      if (cert.estadoValidez !== 'REQUIERE_REVISION_ASISTENCIA' || cert.motivoAlertaValidez !== motivo) {
        alertasNuevas += 1;
        historialExtra.push({
          id: `hist-cert-warn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fecha: hoy,
          usuario: 'Control Automático de Trazabilidad',
          accion: 'Alerta de validez en certificado',
          detalle: `Certificado ${cert.codigoCertificado} (${cert.trabajadorNombre}): ${motivo}`,
        });
      }
      return {
        ...cert,
        estadoValidez: 'REQUIERE_REVISION_ASISTENCIA' as const,
        motivoAlertaValidez: motivo,
      };
    }

    return cert;
  });

  if (alertasNuevas === 0) {
    return { storeActualizado: store, alertasNuevas: 0 };
  }

  return {
    alertasNuevas,
    storeActualizado: {
      ...store,
      certificados: nextCerts,
      historial: [...historialExtra, ...store.historial],
    },
  };
}

// ============================================================================
// 3. GENERACIÓN REAL DE CERTIFICADOS EN PDF (JSPDF + LOGO FRIKAZ S.A.S.)
// ============================================================================

export async function cargarLogoBase64DataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/frikaz_logo.jpg');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function dibujarPaginaCertificadoPdf(
  doc: jsPDF,
  cert: CertificadoParticipacionMejora,
  logoDataUrl: string | null
) {
  const pageW = doc.internal.pageSize.getWidth(); // 279.4mm (Letter landscape)
  const pageH = doc.internal.pageSize.getHeight(); // 215.9mm (Letter landscape)

  // Marco exterior verde petróleo + acento naranja Frikaz con márgenes adecuados
  doc.setDrawColor(15, 91, 83);
  doc.setLineWidth(1.5);
  doc.rect(12, 12, pageW - 24, pageH - 24);

  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.6);
  doc.rect(15.5, 15.5, pageW - 31, pageH - 31);

  // Encabezado corporativo superior
  doc.setFillColor(244, 250, 248);
  doc.rect(16, 16, pageW - 32, 34, 'F');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', 23, 20, 26, 26);
    } catch {
      // Continuar con texto limpio si falla decodificación
    }
  }

  doc.setTextColor(13, 59, 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FRIKAZ S.A.S.', logoDataUrl ? 54 : 25, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(53, 91, 86);
  doc.text(
    'Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) · Planta Bosa, Bogotá D.C.',
    logoDataUrl ? 54 : 25,
    35.5
  );

  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 91, 83);
  doc.text(`Código: ${cert.codigoCertificado}`, pageW - 23, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Emisión: ${cert.fechaEmision}`, pageW - 23, 34.5, { align: 'right' });

  // Título principal
  doc.setTextColor(15, 91, 83);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CERTIFICADO DE PARTICIPACIÓN', pageW / 2, 64, { align: 'center' });

  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.9);
  doc.line(pageW / 2 - 58, 67.5, pageW / 2 + 58, 67.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('FRIKAZ S.A.S. hace constar y reconoce que:', pageW / 2, 77, { align: 'center' });

  // Nombre del trabajador
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19.5);
  const nombreMostrar = cert.trabajadorNombre?.trim()
    ? cert.trabajadorNombre.trim().toUpperCase()
    : 'TRABAJADOR (PENDIENTE DE REGISTRO)';
  doc.text(nombreMostrar, pageW / 2, 87, { align: 'center' });

  // Identificación y Cargo
  doc.setTextColor(15, 107, 97);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const idPart = cert.numeroIdentificacion?.trim()
    ? `Identificación: ${cert.numeroIdentificacion.trim()}   ·   `
    : '';
  const cargoPart = `Cargo: ${cert.cargo?.trim() || 'Pendiente de registro'}`;
  doc.text(`${idPart}${cargoPart}`, pageW / 2, 94.5, { align: 'center' });

  // Texto formal de reconocimiento
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const temaTitulo = cert.temaDesarrollado?.trim() || cert.nombreActividad?.trim() || 'Capacitación SST';
  const partesContexto: string[] = [
    `Participó en la capacitación "${temaTitulo}"`,
  ];
  if (cert.nombrePlan?.trim() && !cert.nombrePlan.includes('Plan Anual')) {
    partesContexto.push(`en el marco de ${cert.nombrePlan}`);
  } else {
    partesContexto.push('programada dentro del Plan Anual de Trabajo del SG-SST de FRIKAZ S.A.S.');
  }
  const textoReconocimiento = `${partesContexto.join(' ')}.`;
  const linesRecon = doc.splitTextToSize(textoReconocimiento, pageW - 56);
  doc.text(linesRecon, pageW / 2, 105, { align: 'center' });

  const yBox = Math.max(118, 105 + linesRecon.length * 5.2 + 4);
  const boxH = cert.observaciones?.trim() ? 45 : 34;

  // Caja limpia con los detalles registrados (sin inventar datos)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(24, yBox, pageW - 48, boxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 91, 83);
  doc.text('Tema / Capacitación:', 30, yBox + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const temaLines = doc.splitTextToSize(temaTitulo, pageW - 96);
  doc.text(temaLines.slice(0, 2), 68, yBox + 8);

  const yRow2 = yBox + (temaLines.length > 1 ? 19 : 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 91, 83);
  doc.text('Fecha de realización:', 30, yRow2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(
    cert.fechaRealizacion?.trim() || 'Pendiente de registro',
    68,
    yRow2
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 91, 83);
  doc.text('Duración:', 142, yRow2);
  doc.setFont('helvetica', cert.intensidadHoraria?.trim() ? 'normal' : 'italic');
  doc.setTextColor(cert.intensidadHoraria?.trim() ? 30 : 100, cert.intensidadHoraria?.trim() ? 41 : 116, cert.intensidadHoraria?.trim() ? 59 : 139);
  doc.text(
    cert.intensidadHoraria?.trim() || 'No registrada',
    162,
    yRow2
  );

  if (cert.observaciones?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 91, 83);
    doc.text('Observaciones:', 30, yRow2 + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const obsLines = doc.splitTextToSize(cert.observaciones.trim(), pageW - 92);
    doc.text(obsLines.slice(0, 2), 60, yRow2 + 9);
  }

  // Bloque de firma de quien certifica (sin inventar nombres ni cargos)
  const yFirma = pageH - 36;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 52, yFirma, pageW / 2 + 52, yFirma);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    cert.certificadorNombre?.trim() || 'Firma de quien certifica',
    pageW / 2,
    yFirma + 5.5,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    cert.certificadorCargo?.trim() || 'FRIKAZ S.A.S. · SG-SST',
    pageW / 2,
    yFirma + 10.5,
    { align: 'center' }
  );
}

export async function generarCertificadoPdfDataUrl(
  cert: CertificadoParticipacionMejora
): Promise<string> {
  const logo = await cargarLogoBase64DataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  dibujarPaginaCertificadoPdf(doc, cert, logo);
  return doc.output('datauristring');
}

export async function descargarCertificadoPdf(
  cert: CertificadoParticipacionMejora
): Promise<void> {
  const logo = await cargarLogoBase64DataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  dibujarPaginaCertificadoPdf(doc, cert, logo);
  const safeName = (cert.trabajadorNombre || 'Trabajador').replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`${cert.codigoCertificado}_${safeName}.pdf`);
}

export async function descargarCertificadosPlanPdfConjunto(
  certificados: CertificadoParticipacionMejora[],
  tituloPlan: string
): Promise<void> {
  if (certificados.length === 0) return;
  const logo = await cargarLogoBase64DataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  certificados.forEach((cert, idx) => {
    if (idx > 0) doc.addPage('letter', 'landscape');
    dibujarPaginaCertificadoPdf(doc, cert, logo);
  });
  const safePlan = tituloPlan.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
  doc.save(`Certificados_${safePlan}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generarHtmlCertificadoCarta(
  certificados: CertificadoParticipacionMejora[],
  logoDataUrl: string | null
): string {
  const paginas = certificados
    .map((cert) => {
      const nombre = escapeHtml(
        cert.trabajadorNombre?.trim() || 'TRABAJADOR (PENDIENTE DE REGISTRO)'
      );
      const idStr = cert.numeroIdentificacion?.trim()
        ? `Identificación: <strong>${escapeHtml(cert.numeroIdentificacion.trim())}</strong> &nbsp;·&nbsp; `
        : '';
      const cargoStr = `Cargo: <strong>${escapeHtml(
        cert.cargo?.trim() || 'Pendiente de registro'
      )}</strong>`;
      const tema = escapeHtml(
        cert.temaDesarrollado?.trim() || cert.nombreActividad?.trim() || 'Capacitación SST'
      );
      const fecha = escapeHtml(cert.fechaRealizacion?.trim() || 'Pendiente de registro');
      const duracion = cert.intensidadHoraria?.trim()
        ? escapeHtml(cert.intensidadHoraria.trim())
        : 'No registrada';
      const obsHtml = cert.observaciones?.trim()
        ? `<div class="obs-row"><strong>Observaciones:</strong> ${escapeHtml(
            cert.observaciones.trim()
          )}</div>`
        : '';
      const certNombre = escapeHtml(
        cert.certificadorNombre?.trim() || 'Firma de quien certifica'
      );
      const certCargo = escapeHtml(
        cert.certificadorCargo?.trim() || 'FRIKAZ S.A.S. · SG-SST'
      );
      const logoHtml = logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Logo Frikaz S.A.S." class="logo" />`
        : '';

      return `
        <section class="cert-page">
          <div class="border-outer">
            <div class="border-inner">
              <header class="header">
                <div class="brand">
                  ${logoHtml}
                  <div>
                    <div class="company">FRIKAZ S.A.S.</div>
                    <div class="subtitle">Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) · Planta Bosa, Bogotá D.C.</div>
                  </div>
                </div>
                <div class="meta">
                  <div class="code">Código: ${escapeHtml(cert.codigoCertificado)}</div>
                  <div class="emission">Emisión: ${escapeHtml(cert.fechaEmision)}</div>
                </div>
              </header>

              <main class="body">
                <h1>CERTIFICADO DE PARTICIPACIÓN</h1>
                <div class="accent-bar"></div>
                <p class="intro">FRIKAZ S.A.S. hace constar y reconoce que:</p>
                <div class="worker-name">${nombre.toUpperCase()}</div>
                <div class="worker-meta">${idStr}${cargoStr}</div>
                <p class="recognition">
                  Participó en la capacitación <strong>“${tema}”</strong>, programada dentro del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) de FRIKAZ S.A.S.
                </p>

                <div class="details-box">
                  <div><strong>Tema / Capacitación:</strong> ${tema}</div>
                  <div class="details-grid">
                    <div><strong>Fecha de realización:</strong> ${fecha}</div>
                    <div><strong>Duración:</strong> ${duracion}</div>
                  </div>
                  ${obsHtml}
                </div>
              </main>

              <footer class="footer">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signer-name">${certNombre}</div>
                  <div class="signer-role">${certCargo}</div>
                </div>
              </footer>
            </div>
          </div>
        </section>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Certificado de Participación - FRIKAZ S.A.S.</title>
  <style>
    @page { size: letter landscape; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Roboto, Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cert-page {
      width: 279.4mm;
      height: 215.9mm;
      padding: 12mm;
      page-break-after: always;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }
    .cert-page:last-child { page-break-after: auto; }
    .border-outer {
      width: 100%;
      height: 100%;
      border: 2.2pt solid #0f5b53;
      padding: 3.5mm;
      display: flex;
    }
    .border-inner {
      width: 100%;
      height: 100%;
      border: 0.9pt solid #f97316;
      padding: 6mm 9mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      background: #f4faf8;
      border-radius: 6px;
      padding: 4mm 6mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #d6ebe5;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 20mm; height: 20mm; object-fit: contain; border-radius: 6px; background: #fff; padding: 2px; border: 1px solid #d6ebe5; }
    .company { font-size: 16pt; font-weight: 800; color: #0d3b36; letter-spacing: 0.4px; }
    .subtitle { font-size: 9pt; color: #355b56; margin-top: 2px; }
    .meta { text-align: right; }
    .code { font-family: monospace; font-size: 9.5pt; font-weight: 700; color: #0f5b53; }
    .emission { font-size: 8.5pt; color: #64748b; margin-top: 3px; }
    .body { text-align: center; padding: 2mm 4mm; }
    h1 {
      margin: 4mm 0 2mm;
      font-size: 22pt;
      font-weight: 900;
      color: #0f5b53;
      letter-spacing: 0.8px;
    }
    .accent-bar {
      width: 110mm;
      height: 2.5px;
      background: #f97316;
      margin: 0 auto 5mm;
    }
    .intro { font-size: 11pt; color: #475569; margin: 0 0 3mm; }
    .worker-name { font-size: 20pt; font-weight: 900; color: #0f172a; margin: 0 0 2mm; }
    .worker-meta { font-size: 10.5pt; color: #0f6b61; margin: 0 0 4.5mm; }
    .recognition { font-size: 10.5pt; line-height: 1.5; color: #1e293b; max-width: 210mm; margin: 0 auto 5mm; }
    .details-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4mm 6mm;
      text-align: left;
      font-size: 9.5pt;
      color: #1e293b;
      max-width: 220mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2.5mm;
    }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .obs-row { border-top: 1px dashed #cbd5e1; padding-top: 2mm; color: #334155; }
    .footer { display: flex; justify-content: center; padding-bottom: 3mm; }
    .signature-box { text-align: center; min-width: 95mm; }
    .signature-line { border-top: 1px solid #64748b; margin-bottom: 2.5mm; }
    .signer-name { font-size: 10pt; font-weight: 800; color: #0f172a; }
    .signer-role { font-size: 8.5pt; color: #475569; margin-top: 1px; }
  </style>
</head>
<body>
${paginas}
</body>
</html>`;
}

export async function imprimirCertificadosCarta(
  certificados: CertificadoParticipacionMejora[]
): Promise<boolean> {
  if (certificados.length === 0 || typeof document === 'undefined') return false;
  const logo = await cargarLogoBase64DataUrl();
  const html = generarHtmlCertificadoCarta(certificados, logo);
  return await new Promise<boolean>((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
          resolve(true);
        }, 1200);
      } catch {
        iframe.remove();
        resolve(false);
      }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

function normalizarClaveCert(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buscarCertificadoExistente(
  store: PlanMejoraRepositorioStore,
  params: {
    capacitacionKey?: string;
    planId: string;
    nombreActividad: string;
    trabajadorId?: string;
    trabajadorNombre: string;
    numeroIdentificacion?: string;
  }
): CertificadoParticipacionMejora | undefined {
  const keyCap = params.capacitacionKey ? normalizarClaveCert(params.capacitacionKey) : '';
  const actNorm = normalizarClaveCert(params.nombreActividad);
  const nomNorm = normalizarClaveCert(params.trabajadorNombre);
  const idNorm = params.numeroIdentificacion ? normalizarClaveCert(params.numeroIdentificacion) : '';

  return store.certificados.find((c) => {
    const mismaCap =
      keyCap && c.capacitacionKey
        ? normalizarClaveCert(c.capacitacionKey) === keyCap
        : c.planId === params.planId &&
          normalizarClaveCert(c.nombreActividad) === actNorm;
    if (!mismaCap) return false;

    if (params.trabajadorId && c.trabajadorId && c.trabajadorId === params.trabajadorId) {
      return true;
    }
    if (idNorm && c.numeroIdentificacion && normalizarClaveCert(c.numeroIdentificacion) === idNorm) {
      return true;
    }
    return nomNorm.length > 0 && normalizarClaveCert(c.trabajadorNombre) === nomNorm;
  });
}

export async function upsertCertificadoEnRepositorio(
  store: PlanMejoraRepositorioStore,
  input: {
    certificadoExistenteId?: string;
    capacitacionKey: string;
    origenModulo: 'PLAN_ANUAL' | 'PLAN_MEJORA_RIESGO' | 'PLAN_EMERGENCIAS' | 'OTRO';
    planId: string;
    nombrePlan: string;
    riesgoCodigo: string;
    nombreRiesgo: string;
    actividadId?: string;
    nombreActividad: string;
    trabajadorId?: string;
    trabajadorNombre: string;
    numeroIdentificacion?: string;
    cargo: string;
    fechaRealizacion: string;
    intensidadHoraria: string;
    temaDesarrollado: string;
    certificadorNombre: string;
    certificadorCargo: string;
    observaciones?: string;
    asistenciaHash?: string;
  },
  usuarioAccion: string
): Promise<{
  store: PlanMejoraRepositorioStore;
  certificado: CertificadoParticipacionMejora;
  pdfDataUrl: string;
  fueActualizado: boolean;
}> {
  const hoy = new Date().toISOString().split('T')[0];
  const ahoraIso = new Date().toISOString();

  const existente =
    (input.certificadoExistenteId
      ? store.certificados.find((c) => c.id === input.certificadoExistenteId)
      : undefined) ||
    buscarCertificadoExistente(store, {
      capacitacionKey: input.capacitacionKey,
      planId: input.planId,
      nombreActividad: input.nombreActividad,
      trabajadorId: input.trabajadorId,
      trabajadorNombre: input.trabajadorNombre,
      numeroIdentificacion: input.numeroIdentificacion,
    });

  let codigoCert = existente?.codigoCertificado || '';
  if (!codigoCert) {
    const prefijo =
      input.origenModulo === 'PLAN_EMERGENCIAS'
        ? 'CERT-EMG'
        : input.origenModulo === 'PLAN_MEJORA_RIESGO'
        ? 'CERT-PM'
        : 'CERT-CAP';
    let seq = store.certificados.length + 1;
    do {
      codigoCert = `${prefijo}-${String(seq).padStart(3, '0')}`;
      seq += 1;
    } while (store.certificados.some((c) => c.codigoCertificado === codigoCert));
  }

  const certId = existente?.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const historialPrevio = existente?.historialCambios || [];
  const entradaHistorial = {
    id: `hcert-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    fecha: ahoraIso,
    usuario: usuarioAccion,
    accion: existente ? 'Certificado actualizado' : 'Certificado emitido',
    detalle: existente
      ? `Actualización de datos del certificado ${codigoCert} para ${input.trabajadorNombre} (${input.temaDesarrollado}).`
      : `Emisión inicial del certificado ${codigoCert} para ${input.trabajadorNombre} en "${input.temaDesarrollado}".`,
  };

  const certificadoFinal: CertificadoParticipacionMejora = {
    id: certId,
    codigoCertificado: codigoCert,
    planId: input.planId,
    nombrePlan: input.nombrePlan,
    riesgoCodigo: input.riesgoCodigo,
    nombreRiesgo: input.nombreRiesgo,
    actividadId: input.actividadId,
    capacitacionKey: input.capacitacionKey,
    origenModulo: input.origenModulo,
    nombreActividad: input.nombreActividad,
    trabajadorId: input.trabajadorId,
    trabajadorNombre: input.trabajadorNombre.trim(),
    numeroIdentificacion: input.numeroIdentificacion?.trim() || undefined,
    cargo: input.cargo.trim(),
    fechaRealizacion: input.fechaRealizacion.trim(),
    intensidadHoraria: input.intensidadHoraria.trim(),
    temaDesarrollado: input.temaDesarrollado.trim(),
    certificadorNombre: input.certificadorNombre.trim(),
    certificadorCargo: input.certificadorCargo.trim(),
    observaciones: input.observaciones?.trim() || undefined,
    fechaEmision: existente?.fechaEmision || hoy,
    fechaUltimaActualizacion: existente ? hoy : undefined,
    emitidoPor: existente?.emitidoPor || usuarioAccion,
    asistenciaHash:
      input.asistenciaHash ||
      `${normalizarClaveCert(input.trabajadorNombre)}|${input.fechaRealizacion}|manual`,
    estadoValidez: 'VIGENTE',
    documentoRepoId: existente?.documentoRepoId,
    historialCambios: [entradaHistorial, ...historialPrevio],
  };

  const pdfDataUrl = await generarCertificadoPdfDataUrl(certificadoFinal);
  const nombreArchivo = `${codigoCert}_${certificadoFinal.trabajadorNombre.replace(/\s+/g, '_')}.pdf`;

  const docExistente = store.documentos.find(
    (d) => d.certificadoId === certId || (existente?.documentoRepoId && d.id === existente.documentoRepoId)
  );

  let nextStore: PlanMejoraRepositorioStore;
  if (docExistente) {
    const docActualizado: DocumentoRepositorioMejora = {
      ...docExistente,
      trabajadorId: certificadoFinal.trabajadorId,
      trabajadorNombre: certificadoFinal.trabajadorNombre,
      cargo: certificadoFinal.cargo,
      planId: certificadoFinal.planId,
      nombrePlan: certificadoFinal.nombrePlan,
      riesgoCodigo: certificadoFinal.riesgoCodigo,
      nombreRiesgo: certificadoFinal.nombreRiesgo,
      actividadNombre: certificadoFinal.temaDesarrollado || certificadoFinal.nombreActividad,
      nombreArchivo,
      archivoDataUrl: pdfDataUrl,
      fechaActividad: certificadoFinal.fechaRealizacion || 'Pendiente de registro',
      responsableRegistro: usuarioAccion,
      observaciones: `Certificado ${codigoCert} actualizado el ${hoy}.${certificadoFinal.observaciones ? ` ${certificadoFinal.observaciones}` : ''}`,
      certificadoId: certId,
    };
    certificadoFinal.documentoRepoId = docExistente.id;
    nextStore = {
      certificados: store.certificados.map((c) => (c.id === certId ? certificadoFinal : c)),
      documentos: store.documentos.map((d) => (d.id === docExistente.id ? docActualizado : d)),
      historial: [
        {
          id: `hist-repo-${Date.now()}`,
          fecha: hoy,
          usuario: usuarioAccion,
          accion: 'Certificado actualizado en repositorio',
          detalle: `${docActualizado.numeroRegistro} · ${codigoCert} actualizado para ${certificadoFinal.trabajadorNombre} (${certificadoFinal.temaDesarrollado}).`,
        },
        ...store.historial,
      ],
    };
  } else {
    const resRepo = registrarDocumentoEnRepositorio(
      {
        ...store,
        certificados: [certificadoFinal, ...store.certificados],
      },
      {
        trabajadorId: certificadoFinal.trabajadorId,
        trabajadorNombre: certificadoFinal.trabajadorNombre,
        cargo: certificadoFinal.cargo,
        planId: certificadoFinal.planId,
        nombrePlan: certificadoFinal.nombrePlan,
        riesgoCodigo: certificadoFinal.riesgoCodigo,
        nombreRiesgo: certificadoFinal.nombreRiesgo,
        actividadNombre: certificadoFinal.temaDesarrollado || certificadoFinal.nombreActividad,
        tipoDocumento: 'Certificado',
        nombreArchivo,
        archivoDataUrl: pdfDataUrl,
        fechaActividad: certificadoFinal.fechaRealizacion || 'Pendiente de registro',
        estadoDocumento: 'Registrado',
        responsableRegistro: usuarioAccion,
        observaciones: `Certificado ${codigoCert} emitido y guardado automáticamente.${certificadoFinal.observaciones ? ` ${certificadoFinal.observaciones}` : ''}`,
        certificadoId: certId,
        esAutomatico: true,
      },
      usuarioAccion
    );
    certificadoFinal.documentoRepoId = resRepo.doc.id;
    nextStore = {
      ...resRepo.store,
      certificados: resRepo.store.certificados.map((c) =>
        c.id === certId ? certificadoFinal : c
      ),
    };
  }

  savePlanMejoraRepositorio(nextStore);
  return {
    store: nextStore,
    certificado: certificadoFinal,
    pdfDataUrl,
    fueActualizado: Boolean(existente),
  };
}

// ============================================================================
// 4. UTILIDADES DEL REPOSITORIO Y EXPORTACIÓN EXCEL (4 HOJAS)
// ============================================================================

export function siguienteNumeroRegistroRepo(docs: DocumentoRepositorioMejora[]): string {
  const maxNum = docs.reduce((max, d) => {
    const match = /(\d+)$/.exec(d.numeroRegistro || '');
    const val = match ? Number(match[1]) : 0;
    return val > max ? val : max;
  }, 0);
  return `DOC-PM-${String(maxNum + 1).padStart(3, '0')}`;
}

export function registrarDocumentoEnRepositorio(
  store: PlanMejoraRepositorioStore,
  nuevo: Omit<DocumentoRepositorioMejora, 'id' | 'numeroRegistro' | 'fechaRegistro'>,
  usuarioAccion: string
): { store: PlanMejoraRepositorioStore; doc: DocumentoRepositorioMejora } {
  const hoy = new Date().toISOString().split('T')[0];
  const doc: DocumentoRepositorioMejora = {
    ...nuevo,
    id: `repo-pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    numeroRegistro: siguienteNumeroRegistroRepo(store.documentos),
    fechaRegistro: hoy,
  };
  return {
    doc,
    store: {
      ...store,
      documentos: [doc, ...store.documentos],
      historial: [
        {
          id: `hist-repo-${Date.now()}`,
          fecha: hoy,
          usuario: usuarioAccion,
          accion: `Documento registrado (${doc.tipoDocumento})`,
          detalle: `${doc.numeroRegistro} · "${doc.nombreArchivo}" vinculado a ${doc.trabajadorNombre} (${doc.nombrePlan}).`,
        },
        ...store.historial,
      ],
    },
  };
}

export interface FilaTrazabilidadGeneral {
  numeroRegistro: string;
  trabajadorNombre: string;
  cargo: string;
  planNombre: string;
  riesgoRelacionado: string;
  actividadRealizada: string;
  tipoDocumento: TipoDocumentoRepositorioMejora | string;
  nombreArchivo: string;
  fechaRealizacion: string;
  fechaRegistro: string;
  estadoAsistencia: string;
  estadoCertificado: string;
  responsableRegistro: string;
  observaciones: string;
}

export async function exportarTrazabilidadPlanesMejoraExcel(
  planes: PlanMejoraPorRiesgo[],
  store: PlanMejoraRepositorioStore,
  actividadesPlan: ActividadPlanAnual[] = []
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Frikaz S.A.S. - Trazabilidad Planes de Mejora por Riesgo';
  wb.created = new Date();

  const planMap = new Map(planes.map((p) => [p.id, p]));
  const hoy = new Date().toISOString().split('T')[0];

  // Construir filas consolidadas reales para Hoja 1 (Trazabilidad general)
  const filasGenerales: FilaTrazabilidadGeneral[] = [];

  // 1) Registros del repositorio documental
  store.documentos.forEach((d) => {
    const plan = planMap.get(d.planId);
    const cert = d.certificadoId
      ? store.certificados.find((c) => c.id === d.certificadoId)
      : store.certificados.find(
          (c) =>
            c.planId === d.planId &&
            c.trabajadorNombre.toLowerCase() === d.trabajadorNombre.toLowerCase()
        );
    const asis = plan?.capacitacion?.asistenciaRegistrada.find(
      (a) => a.nombreTrabajador.toLowerCase() === d.trabajadorNombre.toLowerCase()
    );
    filasGenerales.push({
      numeroRegistro: d.numeroRegistro,
      trabajadorNombre: d.trabajadorNombre,
      cargo: d.cargo,
      planNombre: d.nombrePlan,
      riesgoRelacionado: `${d.riesgoCodigo} - ${d.nombreRiesgo}`,
      actividadRealizada: d.actividadNombre,
      tipoDocumento: d.tipoDocumento,
      nombreArchivo: d.nombreArchivo,
      fechaRealizacion: d.fechaActividad || 'Pendiente de verificación',
      fechaRegistro: d.fechaRegistro,
      estadoAsistencia: asis
        ? asis.asistio
          ? 'Asistió'
          : 'No asistió'
        : d.tipoDocumento === 'Certificado'
        ? 'Asistencia válida'
        : 'Pendiente de verificación',
      estadoCertificado: cert
        ? `${cert.codigoCertificado} (${cert.estadoValidez === 'VIGENTE' ? 'Emitido vigente' : 'Revisar por cambio de asistencia'})`
        : 'Sin certificado emitido',
      responsableRegistro: d.responsableRegistro,
      observaciones: d.observaciones || '',
    });
  });

  // 2) Asistencias registradas en los planes que aún no tienen documento individual en repo
  planes.forEach((p) => {
    const lista = p.capacitacion?.asistenciaRegistrada || [];
    lista.forEach((a, i) => {
      const yaCubierta = filasGenerales.some(
        (f) =>
          f.planNombre === `Plan #${p.orden}: ${p.nombreRiesgo}` &&
          f.trabajadorNombre.toLowerCase() === a.nombreTrabajador.toLowerCase()
      );
      if (yaCubierta) return;
      const cert = store.certificados.find(
        (c) =>
          c.planId === p.id &&
          c.trabajadorNombre.toLowerCase() === a.nombreTrabajador.toLowerCase()
      );
      filasGenerales.push({
        numeroRegistro: `ASI-P${p.orden}-${String(i + 1).padStart(2, '0')}`,
        trabajadorNombre: a.nombreTrabajador,
        cargo: a.cargo,
        planNombre: `Plan #${p.orden}: ${p.nombreRiesgo}`,
        riesgoRelacionado: `${p.riesgoCodigo} - ${p.nombreRiesgo}`,
        actividadRealizada: p.capacitacion?.nombre || p.actividadMejoraPropuesta,
        tipoDocumento: 'Asistencia',
        nombreArchivo: 'Registro en sistema (Asistencia plan)',
        fechaRealizacion: a.fecha || 'Pendiente de verificación',
        fechaRegistro: hoy,
        estadoAsistencia: a.asistio ? 'Asistió' : 'No asistió',
        estadoCertificado: cert ? `${cert.codigoCertificado} (${cert.estadoValidez})` : 'Sin certificado emitido',
        responsableRegistro: p.responsable,
        observaciones: a.firmaOConfirmacion || '',
      });
    });

    // 3) Evidencias adjuntas directamente en cada plan
    (p.evidenciasAdjuntas || []).forEach((ev, idx) => {
      const yaEnRepo = store.documentos.some(
        (d) => d.planId === p.id && d.nombreArchivo === ev.nombreArchivo
      );
      if (yaEnRepo) return;
      filasGenerales.push({
        numeroRegistro: `EVI-P${p.orden}-${String(idx + 1).padStart(2, '0')}`,
        trabajadorNombre: ev.cargadoPor || 'Equipo Frikaz S.A.S.',
        cargo: p.cargoMatriz,
        planNombre: `Plan #${p.orden}: ${p.nombreRiesgo}`,
        riesgoRelacionado: `${p.riesgoCodigo} - ${p.nombreRiesgo}`,
        actividadRealizada: p.actividadMejoraPropuesta,
        tipoDocumento: 'Evidencia',
        nombreArchivo: ev.nombreArchivo,
        fechaRealizacion: ev.fechaCarga || 'Pendiente de verificación',
        fechaRegistro: ev.fechaCarga || hoy,
        estadoAsistencia: 'No aplica',
        estadoCertificado: 'No aplica',
        responsableRegistro: ev.cargadoPor || p.responsable,
        observaciones: ev.descripcionSoporte || '',
      });
    });
  });

  // Helper estilo encabezado corporativo verde petróleo
  const estilarHoja = (
    ws: ExcelJS.Worksheet,
    titulo: string,
    headers: string[],
    widths: number[]
  ) => {
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

  // HOJA 1: Trazabilidad general
  const ws1 = wb.addWorksheet('Trazabilidad general', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  estilarHoja(
    ws1,
    `FRIKAZ S.A.S. — TRAZABILIDAD GENERAL DE PLANES DE MEJORA POR RIESGO (${hoy})`,
    [
      'Número de registro',
      'Nombre completo del trabajador',
      'Cargo',
      'Plan de mejora',
      'Riesgo relacionado',
      'Actividad realizada',
      'Tipo de documento',
      'Nombre del archivo',
      'Fecha de realización',
      'Fecha de registro',
      'Estado de asistencia',
      'Estado del certificado',
      'Responsable del registro',
      'Observaciones',
    ],
    [18, 28, 22, 30, 28, 32, 20, 28, 16, 16, 20, 26, 24, 34]
  );

  filasGenerales.forEach((f, idx) => {
    const row = ws1.getRow(4 + idx);
    row.values = [
      f.numeroRegistro,
      f.trabajadorNombre,
      f.cargo,
      f.planNombre,
      f.riesgoRelacionado,
      f.actividadRealizada,
      f.tipoDocumento,
      f.nombreArchivo,
      f.fechaRealizacion,
      f.fechaRegistro,
      f.estadoAsistencia,
      f.estadoCertificado,
      f.responsableRegistro,
      f.observaciones,
    ];
    row.alignment = { vertical: 'top', wrapText: true };
  });

  // HOJA 2: Asistencias
  const ws2 = wb.addWorksheet('Asistencias', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  estilarHoja(
    ws2,
    `FRIKAZ S.A.S. — REGISTRO DE ASISTENCIAS POR PLAN DE MEJORA (${hoy})`,
    [
      'Plan de mejora',
      'Riesgo relacionado',
      'Actividad / Capacitación',
      'Trabajador',
      'Cargo',
      'Fecha',
      'Asistió',
      'Confirmación / Observación',
      'Certificado asociado',
    ],
    [30, 26, 32, 28, 22, 14, 14, 28, 26]
  );

  let row2Idx = 4;
  planes.forEach((p) => {
    const evals = evaluarParticipacionTrabajadoresPlan(p, actividadesPlan);
    evals.forEach((ev) => {
      const cert = store.certificados.find(
        (c) =>
          c.planId === p.id &&
          c.trabajadorNombre.toLowerCase() === ev.trabajadorNombre.toLowerCase()
      );
      const r = ws2.getRow(row2Idx++);
      r.values = [
        `Plan #${p.orden}: ${p.nombreRiesgo}`,
        `${p.riesgoCodigo} - ${p.nombreRiesgo}`,
        p.capacitacion?.nombre || p.actividadMejoraPropuesta,
        ev.trabajadorNombre,
        ev.cargo,
        ev.fechaRealizacion || 'Pendiente de verificación',
        ev.asistio ? 'Sí' : 'No',
        ev.motivoBloqueo || ev.firmaOConfirmacion || 'Asistencia válida',
        cert ? `${cert.codigoCertificado} (${cert.estadoValidez})` : 'Sin emitir',
      ];
      r.alignment = { vertical: 'top', wrapText: true };
    });
  });

  // HOJA 3: Certificados
  const ws3 = wb.addWorksheet('Certificados', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  estilarHoja(
    ws3,
    `FRIKAZ S.A.S. — CERTIFICADOS DE PARTICIPACIÓN EMITIDOS (${hoy})`,
    [
      'Código certificado',
      'Trabajador',
      'Cargo',
      'Plan de mejora',
      'Riesgo controlado',
      'Actividad realizada',
      'Fecha de realización',
      'Intensidad horaria',
      'Fecha de emisión',
      'Emitido por',
      'Estado validez',
    ],
    [20, 28, 22, 30, 28, 30, 16, 18, 16, 24, 26]
  );

  store.certificados.forEach((c, idx) => {
    const r = ws3.getRow(4 + idx);
    r.values = [
      c.codigoCertificado,
      c.trabajadorNombre,
      c.cargo,
      c.nombrePlan,
      `${c.riesgoCodigo} - ${c.nombreRiesgo}`,
      c.nombreActividad,
      c.fechaRealizacion,
      c.intensidadHoraria || 'No registrada',
      c.fechaEmision,
      c.emitidoPor,
      c.estadoValidez === 'VIGENTE'
        ? 'Vigente'
        : `Requiere revisión (${c.motivoAlertaValidez || 'Asistencia modificada'})`,
    ];
    r.alignment = { vertical: 'top', wrapText: true };
  });

  // HOJA 4: Repositorio documental
  const ws4 = wb.addWorksheet('Repositorio documental', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  estilarHoja(
    ws4,
    `FRIKAZ S.A.S. — REPOSITORIO DOCUMENTAL DE PLANES DE MEJORA (${hoy})`,
    [
      'Número de registro',
      'Trabajador',
      'Cargo',
      'Plan de mejora',
      'Riesgo',
      'Actividad',
      'Tipo de documento',
      'Nombre de archivo',
      'Fecha actividad',
      'Fecha registro',
      'Estado documento',
      'Responsable registro',
      'Observaciones',
    ],
    [18, 26, 20, 28, 26, 28, 20, 30, 15, 15, 20, 24, 34]
  );

  store.documentos.forEach((d, idx) => {
    const r = ws4.getRow(4 + idx);
    r.values = [
      d.numeroRegistro,
      d.trabajadorNombre,
      d.cargo,
      d.nombrePlan,
      `${d.riesgoCodigo} - ${d.nombreRiesgo}`,
      d.actividadNombre,
      d.tipoDocumento,
      d.nombreArchivo,
      d.fechaActividad || 'Pendiente de verificación',
      d.fechaRegistro,
      d.estadoDocumento,
      d.responsableRegistro,
      d.observaciones || '',
    ];
    r.alignment = { vertical: 'top', wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Trazabilidad_Planes_Mejora_Frikaz_${hoy}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
