import React, { useState, useEffect } from 'react';
import type { AssistantNavigationTarget } from '../types/assistantNavigation';
import { NormaPhvaItem } from '../types/phvaEvidence';
import { generateFrikazExcelWorkbook } from '../services/excelMatrixService';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  Leaf,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Info,
  Sparkles,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

import {
  EstadoEstandarFrikaz,
  ESTADOS_ESTANDAR_FRIKAZ,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../services/gerenteControlService';

interface MatrizExcelViewProps {
  items: NormaPhvaItem[];
  onSelectNorma?: (norma: NormaPhvaItem) => void;
  navigationRequest?: AssistantNavigationTarget | null;
}

type ExcelSheetTab = 'inicio' | 'phva_unificada' | 'gestion_sst' | 'gestion_ambiental' | 'plan_accion';

export const MatrizExcelView: React.FC<MatrizExcelViewProps> = ({
  items,
  onSelectNorma,
  navigationRequest,
}) => {
  const [activeSheet, setActiveSheet] = useState<ExcelSheetTab>('inicio');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<'TODAS' | 'SST' | 'AMBIENTAL'>('TODAS');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | EstadoEstandarFrikaz>('TODOS');

  useEffect(() => {
    if (!navigationRequest || navigationRequest.tab !== 'matriz_excel') return;
    if (navigationRequest.excelSheet) {
      setActiveSheet(navigationRequest.excelSheet);
    }
    if (navigationRequest.searchQuery !== undefined) {
      setSearchTerm(navigationRequest.searchQuery);
      if (!navigationRequest.excelSheet) {
        setActiveSheet('phva_unificada');
      }
    }
  }, [navigationRequest]);

  // Cálculos dinámicos estandarizados con los 6 estados oficiales
  const totalNormas = items.length;
  const porHacer = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'Por hacer').length;
  const enProceso = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'En proceso').length;
  const pendienteRevision = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'Pendiente de revisión').length;
  const devueltoAjustes = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'Devuelto para ajustes').length;
  const cumplidas = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'Cumplido').length;
  const aprobadas = items.filter((i) => normalizarEstadoEstandar(i.estado) === 'Aprobado').length;
  const cerradasOk = cumplidas + aprobadas;
  const evaluadas = items.filter((i) => i.estado !== 'NO_APLICA').length;
  const porcentajeCumplimiento =
    evaluadas > 0
      ? Math.round(((cerradasOk + (enProceso + pendienteRevision) * 0.5) / evaluadas) * 100)
      : 0;

  const sstItems = items.filter((i) => i.area === 'SST' || i.area === 'INTEGRAL');
  const ambItems = items.filter((i) => i.area === 'AMBIENTAL' || i.area === 'INTEGRAL');
  const sstCumplidas = sstItems.filter((i) => {
    const est = normalizarEstadoEstandar(i.estado);
    return est === 'Cumplido' || est === 'Aprobado';
  }).length;
  const ambCumplidas = ambItems.filter((i) => {
    const est = normalizarEstadoEstandar(i.estado);
    return est === 'Cumplido' || est === 'Aprobado';
  }).length;

  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const blob = await generateFrikazExcelWorkbook(items);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Matriz_Legal_Automatizada_Frikaz_SAS_PHVA_2026_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4500);
    } catch (err) {
      console.error('Error generando archivo Excel:', err);
      setExportError('No se pudo crear el archivo Excel en este momento. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtrado de la hoja unificada
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.normaOficial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tituloSituacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.articulos.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea =
      filterArea === 'TODAS' ||
      item.area === filterArea ||
      (filterArea === 'SST' && item.area === 'INTEGRAL') ||
      (filterArea === 'AMBIENTAL' && item.area === 'INTEGRAL');

    const matchesEstado =
      filterEstado === 'TODOS' || normalizarEstadoEstandar(item.estado) === filterEstado;

    return matchesSearch && matchesArea && matchesEstado;
  });

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL DEL MÓDULO TABLA DE NORMAS */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white shadow-xl border-2 border-emerald-500/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black uppercase tracking-wider">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Tabla Completa de Normas
              </span>
              <span className="rounded-md bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-300 border border-orange-400/30">
                Con cuentas automáticas
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                5 Vistas · {items.length} Normas Registradas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Tabla de Normas SST y Ambientales — Frikaz S.A.S.
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Aquí puedes revisar todas las normas de seguridad y cuidado ambiental organizadas en 5 secciones claras, y descargar el archivo completo cuando lo necesites para revisarlo en tu computador.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-900/40 hover:shadow-xl transition-all cursor-pointer border border-emerald-400/40 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparando descarga...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Descargar Tabla Completa</span>
                </>
              )}
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              ¡Listo! Ya se descargó el archivo con todas las normas, sumas automáticas y estados al día para abrir en tu computador.
            </span>
          </div>
        )}
        {exportError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-400 text-rose-200 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}
      </div>

      {/* PESTAÑAS DE HOJAS DE EXCEL (SIMULADOR DE HOJAS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-4 pt-3 border-b border-slate-800 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            <button
              onClick={() => setActiveSheet('inicio')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeSheet === 'inicio'
                  ? 'bg-white text-[#0f172a] shadow-md border-t-2 border-orange-500'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-orange-500" />
              <span>Hoja 1. Inicio (Dashboard)</span>
            </button>

            <button
              onClick={() => setActiveSheet('phva_unificada')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeSheet === 'phva_unificada'
                  ? 'bg-white text-[#0f172a] shadow-md border-t-2 border-orange-500'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4 text-blue-500" />
              <span>Hoja 2. Matriz PHVA Unificada</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSheet('gestion_sst')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeSheet === 'gestion_sst'
                  ? 'bg-white text-[#0f172a] shadow-md border-t-2 border-orange-500'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Hoja 3. Gestión SST</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {sstItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSheet('gestion_ambiental')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeSheet === 'gestion_ambiental'
                  ? 'bg-white text-[#0f172a] shadow-md border-t-2 border-orange-500'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Leaf className="h-4 w-4 text-teal-500" />
              <span>Hoja 4. Gestión Ambiental</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
                {ambItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSheet('plan_accion')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeSheet === 'plan_accion'
                  ? 'bg-white text-[#0f172a] shadow-md border-t-2 border-orange-500'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileCheck className="h-4 w-4 text-purple-500" />
              <span>5. Plan de Acción</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO SEGÚN LA HOJA SELECCIONADA */}
        <div className="p-6">
          {/* HOJA 1: INICIO */}
          {activeSheet === 'inicio' && (
            <div className="space-y-6">
              {/* Encabezado Hoja Inicio */}
              <div className="bg-[#0f172a] rounded-xl p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center font-black text-white text-xl shadow-md">
                    FZ
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      FRIKAZ S.A.S. — RESUMEN DE SEGURIDAD, SALUD Y AMBIENTE
                    </h2>
                    <p className="text-xs text-orange-200 font-medium">
                      Resumen claro y automático de nuestras normas de seguridad, salud y cuidado ambiental
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">NIT: 901.654.892-3</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-300">Bosa Piamonte, Bogotá</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs font-bold text-orange-300">10 Trabajadores</span>
                </div>
              </div>

              {/* Botones de navegación interna */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  Accesos Rápidos a cada Sección
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveSheet('phva_unificada')}
                    className="p-3 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-left transition-all border-l-4 border-orange-500 shadow-sm cursor-pointer group"
                  >
                    <span className="text-[11px] text-orange-300 font-bold block">Hoja 2</span>
                    <span className="text-xs font-black block group-hover:text-orange-200">
                      Lista Completa PHVA ➔
                    </span>
                    <span className="text-[10px] text-slate-400">{items.length} normas explicadas paso a paso</span>
                  </button>

                  <button
                    onClick={() => setActiveSheet('gestion_sst')}
                    className="p-3 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-left transition-all border-l-4 border-emerald-500 shadow-sm cursor-pointer group"
                  >
                    <span className="text-[11px] text-emerald-300 font-bold block">Hoja 3</span>
                    <span className="text-xs font-black block group-hover:text-emerald-200">
                      Gestión SST ➔
                    </span>
                    <span className="text-[10px] text-slate-400">Seguridad y Salud en el Trabajo</span>
                  </button>

                  <button
                    onClick={() => setActiveSheet('gestion_ambiental')}
                    className="p-3 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-left transition-all border-l-4 border-teal-500 shadow-sm cursor-pointer group"
                  >
                    <span className="text-[11px] text-teal-300 font-bold block">Hoja 4</span>
                    <span className="text-xs font-black block group-hover:text-teal-200">
                      Gestión Ambiental ➔
                    </span>
                    <span className="text-[10px] text-slate-400">Aceites ACU, residuos y vertimientos</span>
                  </button>

                  <button
                    onClick={() => setActiveSheet('plan_accion')}
                    className="p-3 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white text-left transition-all border-l-4 border-purple-500 shadow-sm cursor-pointer group"
                  >
                    <span className="text-[11px] text-purple-300 font-bold block">Hoja 5</span>
                    <span className="text-xs font-black block group-hover:text-purple-200">
                      Plan de Acción ➔
                    </span>
                    <span className="text-[10px] text-slate-400">Causas, mejoras y verificación</span>
                  </button>
                </div>
              </div>

              {/* Panel de Indicadores por los 6 Estados Oficiales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Resumen de Estados de Cumplimiento (6 Estados Oficiales)
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                    Solo Gerencia marca Cumplido, Aprobado o Devuelto
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Normas</span>
                    <span className="text-2xl font-black text-[#0f172a] font-mono">{totalNormas}</span>
                  </div>

                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">Por hacer</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{porHacer}</span>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">En proceso</span>
                    <span className="text-2xl font-black text-sky-700 font-mono">{enProceso}</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Pend. revisión</span>
                    <span className="text-2xl font-black text-amber-700 font-mono">{pendienteRevision}</span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Devuelto ajustes</span>
                    <span className="text-2xl font-black text-rose-700 font-mono">{devueltoAjustes}</span>
                  </div>

                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-teal-800 uppercase block">Cumplido</span>
                    <span className="text-2xl font-black text-teal-700 font-mono">{cumplidas}</span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Aprobado</span>
                    <span className="text-2xl font-black text-emerald-700 font-mono">{aprobadas}</span>
                  </div>

                  <div className="bg-linear-to-b from-orange-500 to-orange-600 rounded-xl p-3 text-center text-white shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-wider block text-orange-100">
                      % Avance Real
                    </span>
                    <span className="text-2xl font-black font-mono">{porcentajeCumplimiento}%</span>
                  </div>
                </div>
              </div>

              {/* Comparativa SST vs Ambiental */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#0f172a] uppercase">Gestión SST (MinTrabajo)</h4>
                        <p className="text-[11px] text-slate-500">{sstItems.length} obligaciones registradas</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {Math.round((sstCumplidas / Math.max(1, sstItems.length)) * 100)}%
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Cumplidas:</span>
                      <span className="font-bold font-mono text-emerald-600">{sstCumplidas}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Normas Clave:</span>
                      <span className="font-medium text-slate-800">Dec. 1072/15, Res. 0312/19, Res. 2400/79</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Riesgos Prioritarios:</span>
                      <span className="font-medium text-slate-800">Fritura &gt;160°C, corte mecánico, vapor</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Leaf className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#0f172a] uppercase">Gestión Ambiental (SDA / MinAmbiente)</h4>
                        <p className="text-[11px] text-slate-500">{ambItems.length} obligaciones registradas</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {Math.round((ambCumplidas / Math.max(1, ambItems.length)) * 100)}%
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Cumplidas:</span>
                      <span className="font-bold font-mono text-emerald-600">{ambCumplidas}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Normas Clave:</span>
                      <span className="font-medium text-slate-800">Res. 316/18 (ACU), Dec. 1076/15, Res. 2184/19</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Aspectos Prioritarios:</span>
                      <span className="font-medium text-slate-800">Aceite usado de fritura, trampa de grasas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOJA 2: MATRIZ PHVA UNIFICADA */}
          {activeSheet === 'phva_unificada' && (
            <div className="space-y-4">
              {/* Barra de Filtros y Búsqueda */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full md:w-80">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar norma, artículo o palabra..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    <option value="TODAS">Todas las Áreas</option>
                    <option value="SST">Solo SST</option>
                    <option value="AMBIENTAL">Solo Ambiental</option>
                  </select>

                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    {ESTADOS_ESTANDAR_FRIKAZ.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs text-slate-500 font-bold ml-2">
                    {filteredItems.length} de {items.length} filas
                  </span>
                </div>
              </div>

              {/* Vista previa en formato de cuadrícula de Excel */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[550px] shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0f172a] text-white z-20 shadow-md">
                    <tr>
                      <th className="p-2.5 border-r border-slate-700 w-12 text-center font-mono">Fila</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[110px] font-bold">Código</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[90px] font-bold text-center">Área</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[180px] font-bold">Norma Oficial</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[130px] font-bold">Artículo</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[220px] font-bold">Obligación</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[180px] font-bold bg-[#1e293b]">PLANEAR</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[180px] font-bold bg-[#1e293b]">HACER</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[180px] font-bold bg-[#1e293b]">VERIFICAR</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[180px] font-bold bg-[#1e293b]">ACTUAR</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[140px] font-bold text-center bg-orange-600">Estado</th>
                      <th className="p-2.5 border-r border-slate-700 min-w-[90px] font-bold text-center">% Avance</th>
                      <th className="p-2.5 min-w-[140px] font-bold">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredItems.map((item, index) => {
                      const codigo = `OBL-${item.area === 'SST' ? 'SST' : item.area === 'AMBIENTAL' ? 'AMB' : 'INT'}-${String(index + 1).padStart(3, '0')}`;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => onSelectNorma && onSelectNorma(item)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-400 text-[11px] bg-slate-50">
                            {index + 3}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {codigo}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                item.area === 'SST'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.area === 'AMBIENTAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.area}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                            {item.normaOficial}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600 text-[11px]">
                            {item.articulos}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600 line-clamp-2 max-w-xs">
                            {item.descripcion}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600 bg-slate-50/50">
                            Planificar cumplimiento en sede Bosa.
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600 bg-slate-50/50">
                            {item.tituloSituacion}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600 bg-slate-50/50">
                            Inspección y cotejo documental.
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[11px] text-slate-600 bg-slate-50/50">
                            Actualizar matriz GTC 45 y control.
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            {(() => {
                              const badge = getBadgeClassesEstadoFrikaz(item.estado);
                              return (
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-black border ${badge.light}`}
                                >
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                            {(() => {
                              const est = normalizarEstadoEstandar(item.estado);
                              return est === 'Cumplido' || est === 'Aprobado'
                                ? '100%'
                                : est === 'En proceso' || est === 'Pendiente de revisión'
                                  ? '50%'
                                  : '0%';
                            })()}
                          </td>
                          <td className="p-2 text-slate-600 text-[11px] truncate max-w-[140px]">
                            {item.responsable}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HOJA 3: GESTIÓN SST */}
          {activeSheet === 'gestion_sst' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase">
                    Hoja 3: Gestión SST — Frikaz S.A.S.
                  </h3>
                  <p className="text-xs text-blue-700">
                    Obligaciones en seguridad industrial, salud en el trabajo, ARL, comités y control de riesgos de planta
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs">
                  {sstItems.length} Normas SST
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-white sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16 text-center">ID</th>
                      <th className="p-2.5 min-w-[200px]">Norma SST</th>
                      <th className="p-2.5 min-w-[100px] text-center">Fase</th>
                      <th className="p-2.5 min-w-[240px]">Obligación SST</th>
                      <th className="p-2.5 min-w-[140px]">Responsable</th>
                      <th className="p-2.5 min-w-[200px]">Evidencia Exigida</th>
                      <th className="p-2.5 min-w-[110px] text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sstItems.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-500">SST-{String(idx + 1).padStart(3, '0')}</td>
                        <td className="p-2 font-bold text-slate-800">{it.normaOficial}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded-sm bg-slate-100 font-bold text-slate-700 text-[10px]">
                            {it.fase}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">{it.descripcion}</td>
                        <td className="p-2 text-slate-700 font-medium">{it.responsable}</td>
                        <td className="p-2 text-slate-500 text-[11px]">{it.evidenciaCumplimiento}</td>
                        <td className="p-2 text-center">
                          {(() => {
                            const badge = getBadgeClassesEstadoFrikaz(it.estado);
                            return (
                              <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${badge.light}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HOJA 4: GESTIÓN AMBIENTAL */}
          {activeSheet === 'gestion_ambiental' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-emerald-900 uppercase">
                    Hoja 4: Gestión Ambiental — Frikaz S.A.S.
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Control de Aceite de Cocina Usado (ACU Res. 316), residuos sólidos, vertimientos y emisiones de fritura
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs">
                  {ambItems.length} Normas Ambientales
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#065f46] text-white sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16 text-center">ID</th>
                      <th className="p-2.5 min-w-[200px]">Norma Ambiental</th>
                      <th className="p-2.5 min-w-[100px] text-center">Fase</th>
                      <th className="p-2.5 min-w-[240px]">Aspecto / Obligación</th>
                      <th className="p-2.5 min-w-[140px]">Responsable</th>
                      <th className="p-2.5 min-w-[200px]">Evidencia Ambiental</th>
                      <th className="p-2.5 min-w-[110px] text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ambItems.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-500">AMB-{String(idx + 1).padStart(3, '0')}</td>
                        <td className="p-2 font-bold text-slate-800">{it.normaOficial}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded-sm bg-slate-100 font-bold text-slate-700 text-[10px]">
                            {it.fase}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">{it.descripcion}</td>
                        <td className="p-2 text-slate-700 font-medium">{it.responsable}</td>
                        <td className="p-2 text-slate-500 text-[11px]">{it.evidenciaCumplimiento}</td>
                        <td className="p-2 text-center">
                          {(() => {
                            const badge = getBadgeClassesEstadoFrikaz(it.estado);
                            return (
                              <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${badge.light}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HOJA 5: PLAN DE ACCIÓN */}
          {activeSheet === 'plan_accion' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-purple-900 uppercase">
                    Hoja 5: Plan de Acción y Mejora Continua
                  </h3>
                  <p className="text-xs text-purple-700">
                    Registro de hallazgos, causas raíz, acciones correctivas, fechas límite y verificación de eficacia
                  </p>
                </div>
                <span className="px-3 py-1 bg-purple-600 text-white font-bold rounded-lg text-xs">
                  Cierre de Ciclo PHVA
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-white">
                    <tr>
                      <th className="p-2.5">ID Acción</th>
                      <th className="p-2.5">Código Norma</th>
                      <th className="p-2.5">Hallazgo / Desviación</th>
                      <th className="p-2.5">Causa Raíz</th>
                      <th className="p-2.5">Acción Correctiva</th>
                      <th className="p-2.5">Responsable</th>
                      <th className="p-2.5">Fecha Límite</th>
                      <th className="p-2.5 text-center">Estado</th>
                      <th className="p-2.5">Verificación de Eficacia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-slate-700">ACT-2026-001</td>
                      <td className="p-2 font-mono text-slate-500">OBL-SST-003</td>
                      <td className="p-2 text-slate-800">Actualización curso de 20 horas SG-SST.</td>
                      <td className="p-2 text-slate-600">Vencimiento del ciclo bianual legal.</td>
                      <td className="p-2 text-slate-700 font-medium">Inscripción en plataforma virtual ARL.</td>
                      <td className="p-2 text-slate-600">Líder SG-SST</td>
                      <td className="p-2 font-mono text-slate-600">2026-11-30</td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-bold text-[10px]">
                          En proceso
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 text-[11px]">En seguimiento ARL</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-slate-700">ACT-2026-002</td>
                      <td className="p-2 font-mono text-slate-500">OBL-AMB-008</td>
                      <td className="p-2 text-slate-800">Cierre de bitácora entrega Aceite ACU.</td>
                      <td className="p-2 text-slate-600">Demora en certificación de gestor.</td>
                      <td className="p-2 text-slate-700 font-medium">Solicitar manifiesto oficial sellado.</td>
                      <td className="p-2 text-slate-600">Coordinador Ambiental</td>
                      <td className="p-2 font-mono text-slate-600">2026-10-30</td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[10px]">
                          Por hacer
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 text-[11px]">Pendiente de revisión de Gerencia</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-slate-700">ACT-2026-003</td>
                      <td className="p-2 font-mono text-slate-500">OBL-SST-006</td>
                      <td className="p-2 text-slate-800">Mantenimiento y recarga extintores Solkaflam.</td>
                      <td className="p-2 text-slate-600">Inspección semestral de planta.</td>
                      <td className="p-2 text-slate-700 font-medium">Prueba de presión y tarjeta de vigencia.</td>
                      <td className="p-2 text-slate-600">Jefe de Planta</td>
                      <td className="p-2 font-mono text-slate-600">2026-08-20</td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                          Pendiente de revisión
                        </span>
                      </td>
                      <td className="p-2 text-amber-700 font-bold text-[11px]">Esperando revisión de Gerencia</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
