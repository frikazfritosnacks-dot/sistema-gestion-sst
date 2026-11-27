import React, { useEffect, useMemo, useState } from 'react';
import type { TrabajadorFichaSST } from '../../types/planAnual';
import type {
  DocumentoPsicosocialAdjunto,
  EstadoEvaluacionPsicosocial,
  InstrumentoPsicosocialTipo,
  NivelRiesgoPsicosocialOficial,
  RegistroTrabajadorPsicosocial,
  RiesgoPsicosocialStore,
  TipoSoportePsicosocial,
} from '../../types/riesgoPsicosocial';
import {
  calcularConsolidadoPsicosocial,
  exportarConsolidadoPsicosocialExcel,
  loadRiesgoPsicosocialStore,
  registrarAuditoriaPsicosocial,
  saveRiesgoPsicosocialStore,
} from '../../services/riesgoPsicosocialService';
import { CARGOS_OFICIALES_NOMBRES } from '../../data/cargosOficiales';
import { useGerenteAutorizado } from '../../services/gerenteControlService';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FolderLock,
  History,
  Lock,
  Paperclip,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Upload,
  UserCheck,
} from 'lucide-react';

export type SubTabPsicosocial =
  | 'registro'
  | 'aplicacion'
  | 'repositorio'
  | 'consolidado'
  | 'excel';

interface PlanAnualPsicosocialTabProps {
  trabajadores: TrabajadorFichaSST[];
  accesoMedicoAutorizado: boolean;
  onSolicitarDesbloqueoMedico: () => void;
  onIrAMatrizRiesgos?: () => void;
  subTabInicial?: SubTabPsicosocial;
}

const INSTRUMENTOS_DISPONIBLES: InstrumentoPsicosocialTipo[] = [
  'Forma A',
  'Forma B',
  'Factores intralaborales',
  'Factores extralaborales',
  'Estrés',
  'Otros',
];

const ESTADOS_EVALUACION: EstadoEvaluacionPsicosocial[] = [
  'Pendiente',
  'Programada',
  'En aplicación',
  'Aplicada',
  'Evaluada con soporte',
  'Pendiente de verificación',
];

const NIVELES_RIESGO_OFICIALES: NivelRiesgoPsicosocialOficial[] = [
  'Pendiente de calificación',
  'Sin riesgo o riesgo despreciable',
  'Riesgo bajo',
  'Riesgo medio',
  'Riesgo alto',
  'Riesgo muy alto',
];

const TIPOS_SOPORTE: TipoSoportePsicosocial[] = [
  'Consentimiento informado',
  'Instrumento oficial autorizado',
  'Informe calificado por profesional SST',
  'Soporte de aplicación',
  'Otro soporte',
];

export const PlanAnualPsicosocialTab: React.FC<PlanAnualPsicosocialTabProps> = ({
  trabajadores,
  accesoMedicoAutorizado,
  onSolicitarDesbloqueoMedico,
  onIrAMatrizRiesgos,
  subTabInicial = 'consolidado',
}) => {
  const { esGerente, nombreGerente } = useGerenteAutorizado();
  const accesoAutorizado = accesoMedicoAutorizado || esGerente;

  const [store, setStore] = useState<RiesgoPsicosocialStore>(() =>
    loadRiesgoPsicosocialStore(trabajadores)
  );
  const [subTab, setSubTab] = useState<SubTabPsicosocial>(subTabInicial);
  const [selectedRegistroId, setSelectedRegistroId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [exportando, setExportando] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Carga de soporte documental
  const [docTipo, setDocTipo] = useState<TipoSoportePsicosocial>('Soporte de aplicación');
  const [docInstrumento, setDocInstrumento] = useState<InstrumentoPsicosocialTipo>('Forma A');
  const [docNombre, setDocNombre] = useState('');
  const [docDataUrl, setDocDataUrl] = useState<string | undefined>(undefined);
  const [docObs, setDocObs] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{
    doc: DocumentoPsicosocialAdjunto;
    codigoInterno: string;
  } | null>(null);

  useEffect(() => {
    setStore(loadRiesgoPsicosocialStore(trabajadores));
  }, [trabajadores]);

  useEffect(() => {
    if (subTabInicial) setSubTab(subTabInicial);
  }, [subTabInicial]);

  const trabMap = useMemo(
    () => new Map(trabajadores.map((t) => [t.id, t])),
    [trabajadores]
  );

  const consolidado = useMemo(
    () => calcularConsolidadoPsicosocial(store, trabajadores),
    [store, trabajadores]
  );

  const registrosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return store.registros.filter((r) => {
      const t = trabMap.get(r.trabajadorId);
      if (filtroCargo !== 'TODOS' && (t?.cargoNombre || '') !== filtroCargo) {
        return false;
      }
      if (filtroEstado !== 'TODOS' && r.estadoEvaluacion !== filtroEstado) {
        return false;
      }
      if (filtroFecha && r.fechaAplicacion !== filtroFecha) {
        return false;
      }
      if (q) {
        const nombreVisible = accesoAutorizado ? t?.nombreCompleto || '' : '';
        const docVisible = accesoAutorizado ? t?.numeroDocumento || '' : '';
        const blob = `${r.codigoInterno} ${nombreVisible} ${docVisible} ${
          t?.cargoNombre || ''
        } ${r.profesionalNombre} ${r.estadoEvaluacion}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [
    store.registros,
    trabMap,
    filtroCargo,
    filtroEstado,
    filtroFecha,
    busqueda,
    accesoAutorizado,
  ]);

  const registroSeleccionado = useMemo(
    () =>
      store.registros.find((r) => r.id === selectedRegistroId) ||
      registrosFiltrados[0] ||
      store.registros[0] ||
      null,
    [store.registros, selectedRegistroId, registrosFiltrados]
  );

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const persistStore = (
    next: RiesgoPsicosocialStore,
    accionAuditoria?: {
      accion: 'CONSULTA' | 'MODIFICACION' | 'CARGA_DOCUMENTO' | 'DESCARGA';
      detalle: string;
    }
  ) => {
    const usuario = esGerente
      ? nombreGerente
      : accesoMedicoAutorizado
      ? 'Profesional / Personal SST Autorizado'
      : 'Usuario Frikaz S.A.S.';
    const finalStore = accionAuditoria
      ? registrarAuditoriaPsicosocial(next, usuario, accionAuditoria.accion, accionAuditoria.detalle)
      : next;
    saveRiesgoPsicosocialStore(finalStore);
    setStore(finalStore);
  };

  const updateRegistro = (
    updated: RegistroTrabajadorPsicosocial,
    detalleAuditoria: string
  ) => {
    if (!accesoAutorizado) {
      onSolicitarDesbloqueoMedico();
      return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    const nextReg = { ...updated, fechaActualizacion: hoy };
    const next: RiesgoPsicosocialStore = {
      ...store,
      registros: store.registros.map((r) => (r.id === nextReg.id ? nextReg : r)),
    };
    persistStore(next, {
      accion: 'MODIFICACION',
      detalle: `${nextReg.codigoInterno}: ${detalleAuditoria}`,
    });
    notify('Registro de batería psicosocial guardado de forma segura.');
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accesoAutorizado) {
      onSolicitarDesbloqueoMedico();
      return;
    }
    if (!registroSeleccionado || !docNombre.trim()) return;
    const hoy = new Date().toISOString().split('T')[0];
    const nuevoDoc: DocumentoPsicosocialAdjunto = {
      id: `doc-psi-${Date.now()}`,
      nombreArchivo: docNombre.trim(),
      tipoSoporte: docTipo,
      instrumento: docInstrumento,
      archivoDataUrl: docDataUrl,
      fechaCarga: hoy,
      cargadoPor: esGerente ? nombreGerente : 'Profesional SST Autorizado',
      observaciones: docObs.trim() || undefined,
    };
    const nextReg: RegistroTrabajadorPsicosocial = {
      ...registroSeleccionado,
      documentos: [nuevoDoc, ...registroSeleccionado.documentos],
      fechaActualizacion: hoy,
    };
    const next: RiesgoPsicosocialStore = {
      ...store,
      registros: store.registros.map((r) => (r.id === nextReg.id ? nextReg : r)),
    };
    persistStore(next, {
      accion: 'CARGA_DOCUMENTO',
      detalle: `${nextReg.codigoInterno} · Soporte "${nuevoDoc.nombreArchivo}" (${nuevoDoc.tipoSoporte})`,
    });
    setDocNombre('');
    setDocDataUrl(undefined);
    setDocObs('');
    notify(`Soporte "${nuevoDoc.nombreArchivo}" guardado bajo custodia confidencial.`);
  };

  const handleDownloadDoc = (
    doc: DocumentoPsicosocialAdjunto,
    codigoInterno: string
  ) => {
    if (!accesoAutorizado) {
      onSolicitarDesbloqueoMedico();
      return;
    }
    persistStore(store, {
      accion: 'DESCARGA',
      detalle: `Descarga autorizada de "${doc.nombreArchivo}" (${codigoInterno})`,
    });
    if (doc.archivoDataUrl) {
      const a = document.createElement('a');
      a.href = doc.archivoDataUrl;
      a.download = doc.nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleExportExcel = async () => {
    setExportando(true);
    try {
      await exportarConsolidadoPsicosocialExcel(
        store,
        trabajadores,
        accesoAutorizado
      );
      persistStore(store, {
        accion: 'DESCARGA',
        detalle: accesoAutorizado
          ? 'Exportación Excel nominal autorizada (4 hojas).'
          : 'Exportación Excel consolidada anonimizada (sin identificación individual).',
      });
      notify(
        accesoAutorizado
          ? 'Excel consolidado y nominal autorizado descargado.'
          : 'Excel consolidado descargado en modo confidencial (sin nombres individuales).'
      );
    } finally {
      setExportando(false);
    }
  };

  const renderBloqueConfidencialidad = (tituloSeccion: string) => (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
        <FolderLock className="h-6 w-6" />
      </div>
      <h4 className="text-sm sm:text-base font-black text-rose-950">
        {tituloSeccion} — Acceso Confidencial Protegido
      </h4>
      <p className="text-xs text-rose-900 max-w-2xl mx-auto leading-relaxed">
        De acuerdo con la Resolución 2764 de 2022, la Resolución 2646 de 2008, la Ley 1581 de 2012 y la custodia de historia clínica ocupacional, los registros individuales, documentos de identidad y soportes de la Batería de Riesgo Psicosocial están restringidos únicamente a <strong>Andrea Orjuela – Gerente</strong> o al <strong>profesional competente autorizado</strong>. Ningún trabajador puede consultar evaluaciones individuales de otros compañeros.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSolicitarDesbloqueoMedico}
          className="px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-[#fed7aa] font-black inline-flex items-center gap-2 cursor-pointer"
        >
          <Lock className="h-4 w-4" />
          <span>Validar Acceso Autorizado (Gerencia / Profesional SST)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('consolidado')}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold hover:bg-slate-50 cursor-pointer"
        >
          Ver Consolidado General (No nominal)
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 text-xs">
      {/* Encabezado principal */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#0d3b36] flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#0f6b61]" />
                <span>BATERÍA DE RIESGO PSICOSOCIAL — Frikaz S.A.S.</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-lg border font-black text-[10px] inline-flex items-center gap-1 ${
                  accesoAutorizado
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                {accesoAutorizado ? (
                  <>
                    <Unlock className="h-3 w-3" />
                    <span>Acceso autorizado activo ({esGerente ? nombreGerente : 'Profesional SST'})</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>Protección de datos activa (Solo consolidado visible)</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Gestión conectada con los {trabajadores.length} trabajadores oficiales y los 6 cargos de Frikaz S.A.S., bajo reserva legal (Resolución 2764 de 2022 y Resolución 2646 de 2008). No se inventan puntuaciones ni interpretaciones sin calificación de profesional SST competente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!accesoAutorizado && (
              <button
                type="button"
                onClick={onSolicitarDesbloqueoMedico}
                className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-[#fed7aa] font-black inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Desbloquear acceso autorizado</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportando}
              className="px-4 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#fed7aa]" />
              <span>{exportando ? 'Generando...' : 'DESCARGAR CONSOLIDADO EN EXCEL'}</span>
            </button>
          </div>
        </div>

        {/* Sub-navegación interna de las 5 secciones */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { id: 'consolidado', label: 'Consolidado general', icon: Activity },
            { id: 'registro', label: 'Registro de trabajadores', icon: UserCheck },
            { id: 'aplicacion', label: 'Aplicación y seguimiento', icon: ClipboardList },
            { id: 'repositorio', label: 'Repositorio de evaluaciones', icon: FolderLock },
            { id: 'excel', label: 'Descarga de Excel y Auditoría', icon: FileSpreadsheet },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as SubTabPsicosocial)}
                className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                    : 'bg-[#f4faf8] text-[#173f3a] border-[#d6ebe5] hover:bg-[#e5f3ef]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#0f6b61]'}`} />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {toastMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-emerald-950 font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 1. CONSOLIDADO GENERAL (NO EXPONE DATOS INDIVIDUALES)              */}
      {/* ================================================================== */}
      {subTab === 'consolidado' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-4">
              <span className="text-[11px] font-bold text-[#3f6660] block">Trabajadores registrados</span>
              <span className="text-2xl font-black font-mono text-[#0d3b36]">
                {consolidado.totalTrabajadoresRegistrados}
              </span>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <span className="text-[11px] font-bold text-emerald-900 block">Evaluaciones realizadas</span>
              <span className="text-2xl font-black font-mono text-emerald-950">
                {consolidado.evaluacionesRealizadas}
              </span>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <span className="text-[11px] font-bold text-amber-900 block">Evaluaciones pendientes</span>
              <span className="text-2xl font-black font-mono text-amber-950">
                {consolidado.evaluacionesPendientes}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] font-bold text-slate-600 block">Programadas / En aplicación</span>
              <span className="text-2xl font-black font-mono text-slate-900">
                {consolidado.enAplicacionOProgramadas}
              </span>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <span className="text-[11px] font-bold text-rose-900 block">Con documentos pendientes</span>
              <span className="text-2xl font-black font-mono text-rose-950">
                {consolidado.conDocumentosPendientes}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <h4 className="text-sm font-black text-[#0d3b36] border-b border-[#e8f2ef] pb-2">
                Estado general del proceso y fechas de aplicación
              </h4>
              <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 space-y-1.5">
                <p>
                  <strong className="text-[#0d3b36]">Estado actual:</strong>{' '}
                  <span className="font-bold text-[#0f5b53]">{consolidado.estadoGeneralProceso}</span>
                </p>
                <p>
                  <strong className="text-[#0d3b36]">Fechas de aplicación registradas:</strong>{' '}
                  {consolidado.fechasAplicacionUnicas.length > 0
                    ? consolidado.fechasAplicacionUnicas.join(' · ')
                    : 'Pendiente de verificación (sin fechas aplicadas aún)'}
                </p>
              </div>

              <h5 className="font-black text-[#26524c] pt-1">
                Distribución consolidada por los 6 cargos oficiales
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f4faf8] text-[#0d3b36] border-b border-[#cfe5df]">
                      <th className="p-2">Cargo oficial</th>
                      <th className="p-2 text-center">Registrados</th>
                      <th className="p-2 text-center">Realizadas</th>
                      <th className="p-2 text-center">Pendientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidado.distribucionPorCargo.map((c) => (
                      <tr key={c.cargo}>
                        <td className="p-2 font-bold text-slate-800">{c.cargo}</td>
                        <td className="p-2 text-center font-mono">{c.total}</td>
                        <td className="p-2 text-center font-mono text-emerald-700 font-bold">
                          {c.realizadas}
                        </td>
                        <td className="p-2 text-center font-mono text-amber-800 font-bold">
                          {c.pendientes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36]">
                  Resultados oficiales calificados por profesional SST
                </h4>
                {onIrAMatrizRiesgos && (
                  <button
                    type="button"
                    onClick={onIrAMatrizRiesgos}
                    className="px-2.5 py-1 rounded-lg bg-[#eef6f4] hover:bg-[#dceee9] text-[#0f5b53] font-bold cursor-pointer"
                  >
                    Ver Riesgo Psicosocial en Matriz →
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Únicamente se consolidan niveles de riesgo cuando un profesional competente y con licencia SST ha registrado calificación oficial. No se calculan promedios ni porcentajes sin datos reales.
              </p>

              <div className="space-y-2.5">
                {consolidado.resultadosOficialesDisponibles.map((res) => {
                  const entries = Object.entries(res.distribucionNiveles);
                  return (
                    <div
                      key={res.factor}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-[#0f172a]">{res.factor}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                          {res.conResultadoOficial} calificación(es) oficial(es)
                        </span>
                      </div>
                      {entries.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {entries.map(([niv, cant]) => (
                            <span
                              key={niv}
                              className="px-2 py-0.5 rounded bg-white border border-[#cfe5df] text-[#0d3b36] font-bold text-[10px]"
                            >
                              {niv}: {cant}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-800 italic">
                          Pendiente de calificación oficial por psicólogo especialista con licencia SST.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-[11px] text-rose-950 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <span>
                  Este tablero consolidado protege la identidad de los trabajadores y prohíbe usar resultados psicosociales para calificar, sancionar o discriminar.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. REGISTRO INDIVIDUAL DE TRABAJADORES                             */}
      {/* ================================================================== */}
      {subTab === 'registro' &&
        (!accesoAutorizado ? (
          renderBloqueConfidencialidad('Registro Individual de Trabajadores')
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, documento o código..."
                  className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5"
                />
              </div>
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-bold"
              >
                <option value="TODOS">Todos los 6 cargos oficiales</option>
                {CARGOS_OFICIALES_NOMBRES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-bold"
              >
                <option value="TODOS">Estado: Todos</option>
                {ESTADOS_EVALUACION.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 bg-white font-mono"
                title="Filtrar por fecha de aplicación"
              />
            </div>

            <div className="rounded-2xl border border-[#b9dad3] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f4faf8] text-[#0d3b36] border-b border-[#cfe5df]">
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Nombres y apellidos</th>
                      <th className="p-2.5">Documento</th>
                      <th className="p-2.5">Cargo oficial</th>
                      <th className="p-2.5">Área / Ingreso / Vinculación</th>
                      <th className="p-2.5">Fecha batería</th>
                      <th className="p-2.5">Tipo evaluación</th>
                      <th className="p-2.5">Profesional responsable</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 text-right">Gestionar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrosFiltrados.map((r) => {
                      const t = trabMap.get(r.trabajadorId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-[#0f5b53]">
                            {r.codigoInterno}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {t?.nombreCompleto || 'Pendiente de verificación'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {t?.tipoDocumento || 'CC'} {t?.numeroDocumento || 'Pendiente'}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {t?.cargoNombre || 'Pendiente'}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600">
                            {r.areaProcesoOverride || t?.areaProceso || 'Pendiente'}
                            <br />
                            <span className="text-[10px] text-slate-500">
                              Ingreso: {t?.fechaIngreso || 'Pendiente'} · {t?.tipoContrato || 'Pendiente'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono">
                            {r.fechaAplicacion || 'Pendiente'}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            {r.instrumentosAplicados.length > 0
                              ? r.instrumentosAplicados.join(', ')
                              : 'Pendiente'}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            {r.profesionalNombre ? (
                              <>
                                <strong>{r.profesionalNombre}</strong>
                                {r.profesionalLicenciaSST && (
                                  <span className="block text-[10px] text-slate-500">
                                    Lic. {r.profesionalLicenciaSST}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-amber-700">Pendiente asignar</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded bg-[#eef6f4] border border-[#cfe5df] text-[#0d3b36] font-bold text-[10px]">
                              {r.estadoEvaluacion}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRegistroId(r.id);
                                setSubTab('aplicacion');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0f5b53] text-white font-bold hover:bg-[#0c4842] cursor-pointer text-[10px]"
                            >
                              Seguimiento / Soportes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      {/* ================================================================== */}
      {/* 3. APLICACIÓN Y SEGUIMIENTO (INSTRUMENTOS Y PROFESIONAL)           */}
      {/* ================================================================== */}
      {subTab === 'aplicacion' &&
        (!accesoAutorizado ? (
          renderBloqueConfidencialidad('Aplicación y Seguimiento de la Batería')
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 rounded-2xl border border-[#b9dad3] bg-white p-4 space-y-2 max-h-[580px] overflow-y-auto">
              <h4 className="font-black text-[#0d3b36] text-sm">
                Trabajadores oficiales ({store.registros.length})
              </h4>
              {store.registros.map((r) => {
                const t = trabMap.get(r.trabajadorId);
                const selected = registroSeleccionado?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRegistroId(r.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                        : 'bg-[#f8fcfa] text-slate-800 border-[#d6ebe5] hover:border-[#0f6b61]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-black">{r.codigoInterno}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          selected ? 'bg-white/20 text-white' : 'bg-white text-[#0d3b36]'
                        }`}
                      >
                        {r.estadoEvaluacion}
                      </span>
                    </div>
                    <p className="font-black mt-0.5">{t?.nombreCompleto || 'Trabajador'}</p>
                    <p className={`text-[10px] ${selected ? 'text-teal-100' : 'text-slate-500'}`}>
                      {t?.cargoNombre} · {r.documentos.length} documento(s)
                    </p>
                  </button>
                );
              })}
            </div>

            {registroSeleccionado && (
              <div className="lg:col-span-8 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-4">
                {(() => {
                  const t = trabMap.get(registroSeleccionado.trabajadorId);
                  return (
                    <>
                      <div className="border-b border-[#e8f2ef] pb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-black text-[#0f6b61]">
                            {registroSeleccionado.codigoInterno} · {t?.tipoDocumento || 'CC'}{' '}
                            {t?.numeroDocumento || 'Pendiente'}
                          </span>
                          <h4 className="text-base font-black text-[#0d3b36]">
                            {t?.nombreCompleto || 'Pendiente de verificación'} — {t?.cargoNombre}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#eef6f4] text-[#0d3b36] font-bold text-[11px]">
                          Actualizado: {registroSeleccionado.fechaActualizacion}
                        </span>
                      </div>

                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          La aplicación, calificación e interpretación de la Batería de Riesgo Psicosocial debe realizarla un psicólogo con posgrado y licencia vigente en SST. No se generan puntuaciones automáticas sin soporte profesional.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Fecha de aplicación
                          </label>
                          <input
                            type="date"
                            value={registroSeleccionado.fechaAplicacion}
                            onChange={(e) =>
                              updateRegistro(
                                { ...registroSeleccionado, fechaAplicacion: e.target.value },
                                `Fecha de aplicación actualizada a ${e.target.value || 'vacío'}`
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Estado de la evaluación
                          </label>
                          <select
                            value={registroSeleccionado.estadoEvaluacion}
                            onChange={(e) =>
                              updateRegistro(
                                {
                                  ...registroSeleccionado,
                                  estadoEvaluacion: e.target.value as EstadoEvaluacionPsicosocial,
                                },
                                `Estado cambiado a ${e.target.value}`
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                          >
                            {ESTADOS_EVALUACION.map((est) => (
                              <option key={est} value={est}>
                                {est}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Área o proceso
                          </label>
                          <input
                            type="text"
                            value={
                              registroSeleccionado.areaProcesoOverride ?? t?.areaProceso ?? ''
                            }
                            onChange={(e) =>
                              updateRegistro(
                                { ...registroSeleccionado, areaProcesoOverride: e.target.value },
                                'Área o proceso actualizado'
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 p-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Profesional responsable (Psicólogo SST)
                          </label>
                          <input
                            type="text"
                            value={registroSeleccionado.profesionalNombre}
                            onChange={(e) =>
                              updateRegistro(
                                { ...registroSeleccionado, profesionalNombre: e.target.value },
                                'Profesional responsable actualizado'
                              )
                            }
                            placeholder="Nombre completo del profesional competente"
                            className="w-full rounded-xl border border-slate-300 p-2"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Licencia SST vigente del profesional
                          </label>
                          <input
                            type="text"
                            value={registroSeleccionado.profesionalLicenciaSST}
                            onChange={(e) =>
                              updateRegistro(
                                {
                                  ...registroSeleccionado,
                                  profesionalLicenciaSST: e.target.value,
                                },
                                'Licencia SST actualizada'
                              )
                            }
                            placeholder="Número de resolución o licencia SST"
                            className="w-full rounded-xl border border-slate-300 p-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 block">
                          Instrumentos / componentes oficiales aplicados
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {INSTRUMENTOS_DISPONIBLES.map((inst) => {
                            const checked =
                              registroSeleccionado.instrumentosAplicados.includes(inst);
                            return (
                              <label
                                key={inst}
                                className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer font-bold ${
                                  checked
                                    ? 'bg-[#e7f4f1] border-[#0f6b61] text-[#0d3b36]'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const nextList = checked
                                      ? registroSeleccionado.instrumentosAplicados.filter(
                                          (x) => x !== inst
                                        )
                                      : [...registroSeleccionado.instrumentosAplicados, inst];
                                    updateRegistro(
                                      { ...registroSeleccionado, instrumentosAplicados: nextList },
                                      `Instrumentos actualizados: ${nextList.join(', ') || 'ninguno'}`
                                    );
                                  }}
                                />
                                <span>{inst}</span>
                              </label>
                            );
                          })}
                        </div>
                        {registroSeleccionado.instrumentosAplicados.includes('Otros') && (
                          <input
                            type="text"
                            value={registroSeleccionado.otroInstrumentoTexto || ''}
                            onChange={(e) =>
                              updateRegistro(
                                {
                                  ...registroSeleccionado,
                                  otroInstrumentoTexto: e.target.value,
                                },
                                'Detalle de otro instrumento actualizado'
                              )
                            }
                            placeholder="Especificar otro instrumento o componente autorizado..."
                            className="w-full rounded-xl border border-slate-300 p-2"
                          />
                        )}
                      </div>

                      {/* Niveles oficiales determinados únicamente por el profesional */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                        <span className="font-black text-[#0d3b36] block">
                          Niveles de riesgo oficiales (únicamente si fueron calificados por el profesional SST)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Factores intralaborales
                            </label>
                            <select
                              value={
                                registroSeleccionado.resultadoOficialProfesional?.intralaboral ||
                                'Pendiente de calificación'
                              }
                              onChange={(e) =>
                                updateRegistro(
                                  {
                                    ...registroSeleccionado,
                                    resultadoOficialProfesional: {
                                      ...registroSeleccionado.resultadoOficialProfesional,
                                      intralaboral: e.target.value as NivelRiesgoPsicosocialOficial,
                                    },
                                  },
                                  `Nivel oficial intralaboral: ${e.target.value}`
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 p-2 bg-white text-[11px]"
                            >
                              {NIVELES_RIESGO_OFICIALES.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Factores extralaborales
                            </label>
                            <select
                              value={
                                registroSeleccionado.resultadoOficialProfesional?.extralaboral ||
                                'Pendiente de calificación'
                              }
                              onChange={(e) =>
                                updateRegistro(
                                  {
                                    ...registroSeleccionado,
                                    resultadoOficialProfesional: {
                                      ...registroSeleccionado.resultadoOficialProfesional,
                                      extralaboral: e.target.value as NivelRiesgoPsicosocialOficial,
                                    },
                                  },
                                  `Nivel oficial extralaboral: ${e.target.value}`
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 p-2 bg-white text-[11px]"
                            >
                              {NIVELES_RIESGO_OFICIALES.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Nivel de estrés
                            </label>
                            <select
                              value={
                                registroSeleccionado.resultadoOficialProfesional?.estres ||
                                'Pendiente de calificación'
                              }
                              onChange={(e) =>
                                updateRegistro(
                                  {
                                    ...registroSeleccionado,
                                    resultadoOficialProfesional: {
                                      ...registroSeleccionado.resultadoOficialProfesional,
                                      estres: e.target.value as NivelRiesgoPsicosocialOficial,
                                    },
                                  },
                                  `Nivel oficial estrés: ${e.target.value}`
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 p-2 bg-white text-[11px]"
                            >
                              {NIVELES_RIESGO_OFICIALES.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Observaciones administrativas (sin exponer datos sensibles)
                        </label>
                        <textarea
                          rows={2}
                          value={registroSeleccionado.observacionesAdministrativas}
                          onChange={(e) =>
                            updateRegistro(
                              {
                                ...registroSeleccionado,
                                observacionesAdministrativas: e.target.value,
                              },
                              'Observaciones administrativas actualizadas'
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 p-2"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ))}

      {/* ================================================================== */}
      {/* 4. REPOSITORIO DE EVALUACIONES (CUSTODIA DOCUMENTAL PROTEGIDA)     */}
      {/* ================================================================== */}
      {subTab === 'repositorio' &&
        (!accesoAutorizado ? (
          renderBloqueConfidencialidad('Repositorio de Evaluaciones y Soportes')
        ) : (
          <div className="space-y-4">
            <form
              onSubmit={handleUploadDoc}
              className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3"
            >
              <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#f97316]" />
                <span>Adjuntar documento o soporte de evaluación psicosocial</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trabajador</label>
                  <select
                    value={registroSeleccionado?.id || ''}
                    onChange={(e) => setSelectedRegistroId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    {store.registros.map((r) => {
                      const t = trabMap.get(r.trabajadorId);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.codigoInterno} · {t?.nombreCompleto || 'Trabajador'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de soporte</label>
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value as TipoSoportePsicosocial)}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    {TIPOS_SOPORTE.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Instrumento</label>
                  <select
                    value={docInstrumento}
                    onChange={(e) =>
                      setDocInstrumento(e.target.value as InstrumentoPsicosocialTipo)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    {INSTRUMENTOS_DISPONIBLES.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre del archivo</label>
                  <input
                    type="text"
                    value={docNombre}
                    onChange={(e) => setDocNombre(e.target.value)}
                    placeholder="Ej. Consentimiento_PSI001.pdf"
                    required
                    className="w-full rounded-xl border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={docObs}
                  onChange={(e) => setDocObs(e.target.value)}
                  placeholder="Observaciones del soporte..."
                  className="flex-1 min-w-[240px] rounded-xl border border-slate-300 p-2"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{docDataUrl ? 'Archivo listo' : 'Seleccionar archivo del computador'}</span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!docNombre) setDocNombre(f.name);
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') setDocDataUrl(reader.result);
                      };
                      reader.readAsDataURL(f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
                >
                  Guardar bajo custodia
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-[#0d3b36]">
                  Documentos almacenados ({store.registros.reduce((s, r) => s + r.documentos.length, 0)})
                </h4>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar trabajador o documento..."
                    className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {registrosFiltrados.flatMap((r) => {
                  const t = trabMap.get(r.trabajadorId);
                  return r.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-black text-[#0d3b36]">
                          {doc.nombreArchivo}{' '}
                          <span className="text-[10px] font-mono text-[#0f6b61]">
                            ({r.codigoInterno} · {t?.nombreCompleto})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {doc.tipoSoporte}
                          {doc.instrumento ? ` · ${doc.instrumento}` : ''} · Fecha: {doc.fechaCarga} · Cargado por: {doc.cargadoPor}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.archivoDataUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ doc, codigoInterno: r.codigoInterno })}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Consultar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(doc, r.codigoInterno)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0f5b53] hover:bg-[#0c4842] text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Descargar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })}
                {registrosFiltrados.every((r) => r.documentos.length === 0) && (
                  <p className="text-center text-slate-500 py-6">
                    No hay documentos de evaluación psicosocial cargados aún para los filtros seleccionados.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

      {/* ================================================================== */}
      {/* 5. DESCARGA DE EXCEL Y AUDITORÍA DE ACCESO                         */}
      {/* ================================================================== */}
      {subTab === 'excel' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
            <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-[#0f6b61]" />
              <span>Exportación Excel de Batería de Riesgo Psicosocial (4 hojas)</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              El libro incluye: <strong>Hoja 1. Consolidado general</strong>, <strong>Hoja 2. Registro de trabajadores</strong> (anonimizado si no hay autorización activa), <strong>Hoja 3. Seguimiento de evaluaciones</strong> y <strong>Hoja 4. Resultados generales</strong>.
            </p>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportando}
              className="px-4 py-2.5 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#fed7aa]" />
              <span>{exportando ? 'Generando archivo...' : 'DESCARGAR CONSOLIDADO EN EXCEL'}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
            <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <History className="h-4 w-4 text-[#f97316]" />
              <span>Bitácora de confidencialidad (quién consulta, modifica o descarga)</span>
            </h4>
            {!accesoAutorizado ? (
              <p className="text-slate-500">
                La bitácora detallada de accesos está disponible para Gerencia y personal SST autorizado.
              </p>
            ) : store.auditoria.length === 0 ? (
              <p className="text-slate-500">Aún no se registran eventos de consulta o descarga.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {store.auditoria.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      <strong className="text-[#0f5b53]">[{a.accion}]</strong> {a.detalle}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {a.usuario} · {a.fechaHora}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[140] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-black text-[#0d3b36]">
                {previewDoc.doc.nombreArchivo} ({previewDoc.codigoInterno})
              </h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            {previewDoc.doc.archivoDataUrl?.startsWith('data:image/') ? (
              <img
                src={previewDoc.doc.archivoDataUrl}
                alt={previewDoc.doc.nombreArchivo}
                className="max-h-[65vh] mx-auto rounded-lg"
              />
            ) : previewDoc.doc.archivoDataUrl?.startsWith('data:application/pdf') ? (
              <iframe
                src={previewDoc.doc.archivoDataUrl}
                title={previewDoc.doc.nombreArchivo}
                className="w-full h-[65vh] rounded-lg border"
              />
            ) : (
              <p className="text-slate-600 py-8 text-center">
                Vista previa no disponible para este tipo de archivo; use el botón Descargar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
