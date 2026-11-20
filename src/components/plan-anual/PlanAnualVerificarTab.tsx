import React, { useState, useMemo } from 'react';
import {
  AccionMejoraPlan,
  ActividadPlanAnual,
  AlertaPlanAnual,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  PlanAnualVigencia,
  RegistroPeriodoIndicador,
  ResponsablePlanOption,
  TrabajadorFichaSST,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { CaracterizacionEmpresaDinamica } from '../../types/dynamicConfig';
import {
  MESES_NOMBRES,
  calcularResultadoIndicadorPeriodo,
  exportarIndicadoresExcel,
  obtenerSoportesRealesEstandar,
} from '../../services/planAnualSgsstService';
import { extraerMedidasRiesgo } from '../../services/planAnualService';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface PlanAnualVerificarTabProps {
  plan: PlanAnualVigencia;
  todosLosPlanes: Record<number, PlanAnualVigencia>;
  anioActivo: number;
  trabajadores: TrabajadorFichaSST[];
  riesgos: RiesgoGTC45Item[];
  config: CaracterizacionEmpresaDinamica;
  hojasVidaIndicadores: HojaVidaIndicadorSST[];
  registrosPeriodosIndicadores: RegistroPeriodoIndicador[];
  estandares: EvaluacionEstandarMinimo[];
  accionesMejora: AccionMejoraPlan[];
  alertas: AlertaPlanAnual[];
  responsables: ResponsablePlanOption[];
  onSaveRegistroPeriodo: (registro: RegistroPeriodoIndicador) => void;
  onSyncTrabajadoresPeriodos: (anio: number) => void;
  onAddIndicadorCustom: (nuevo: HojaVidaIndicadorSST) => void;
  onUpdateEstandar: (estandar: EvaluacionEstandarMinimo) => void;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onCrearAccionDesdeVerificar: (preset: {
    origen: AccionMejoraPlan['origen'];
    tipo: AccionMejoraPlan['tipo'];
    situacionEncontrada: string;
    queSeNecesitaCorregir: string;
    actividadARealizar: string;
    riesgoId?: string;
    actividadPlanId?: string;
    estandarNumero?: number;
  }) => void;
}

type SubTabVerificar = 'tablero' | 'captura' | 'riesgos' | 'estandares';

const COLOR_SEMAFORO: Record<
  'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS',
  { badge: string; bar: string; label: string }
> = {
  VERDE: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    bar: '#10b981',
    label: 'Verde · Meta cumplida',
  },
  AMARILLO: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    bar: '#f59e0b',
    label: 'Amarillo · En atención / Por validar',
  },
  ROJO: {
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    bar: '#ef4444',
    label: 'Rojo · Fuera de meta / Requiere acción',
  },
  GRIS: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    bar: '#cbd5e1',
    label: 'Gris · Sin datos completos aún',
  },
};

export const PlanAnualVerificarTab: React.FC<PlanAnualVerificarTabProps> = ({
  plan,
  todosLosPlanes,
  anioActivo,
  trabajadores,
  riesgos,
  config,
  hojasVidaIndicadores,
  registrosPeriodosIndicadores,
  estandares,
  accionesMejora,
  alertas,
  responsables,
  onSaveRegistroPeriodo,
  onSyncTrabajadoresPeriodos,
  onAddIndicadorCustom,
  onUpdateEstandar,
  onAbrirActividad,
  onCrearAccionDesdeVerificar,
}) => {
  const [subTab, setSubTab] = useState<SubTabVerificar>('tablero');
  const [filtroTrimestre, setFiltroTrimestre] = useState<'TODOS' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('TODOS');
  const [filtroMes, setFiltroMes] = useState<number>(0); // 0 = Último periodo validado / Consolidado
  const [hojaAbiertaId, setHojaAbiertaId] = useState<string | null>(null);
  const [mostrarArchivoAnteriores, setMostrarArchivoAnteriores] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Nuevo indicador propio de Frikaz S.A.S. (sin tocar los 6 obligatorios)
  const [showNuevoInd, setShowNuevoInd] = useState(false);
  const [nuevoIndForm, setNuevoIndForm] = useState({
    nombre: '',
    tipo: 'PROCESO' as HojaVidaIndicadorSST['tipo'],
    definicion: '',
    formula: '',
    metaValor: 90,
    metaOperador: '>=' as HojaVidaIndicadorSST['metaOperador'],
    unidadMedida: '%',
    reglaConteo: '',
    fuenteInformacion: '',
    periodicidad: 'MENSUAL' as HojaVidaIndicadorSST['periodicidad'],
    responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
    interpretacionBase: 'Resultado del periodo medido.',
  });

  // Edición de periodo en captura mensual
  const [editingPeriodoId, setEditingPeriodoId] = useState<string | null>(null);
  const [periodoDraft, setPeriodoDraft] = useState<RegistroPeriodoIndicador | null>(null);

  // Verificación de riesgos filtro
  const [filtroVerifRiesgo, setFiltroVerifRiesgo] = useState<'TODOS' | 'SIN_CONTROL_O_VENCIDO' | 'PRIORITARIOS'>('TODOS');

  // Edición de revisión manual de estándares
  const [editingEstandarNum, setEditingEstandarNum] = useState<number | null>(null);
  const [estandarDraft, setEstandarDraft] = useState<EvaluacionEstandarMinimo | null>(null);

  const activosCount = useMemo(
    () => trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO').length,
    [trabajadores]
  );

  const registrosAnio = useMemo(
    () =>
      registrosPeriodosIndicadores
        .filter((r) => r.anio === anioActivo)
        .sort((a, b) => a.mes - b.mes),
    [registrosPeriodosIndicadores, anioActivo]
  );

  const registrosMensualesFiltrados = useMemo(() => {
    const trimMeses: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number[]> = {
      Q1: [1, 2, 3],
      Q2: [4, 5, 6],
      Q3: [7, 8, 9],
      Q4: [10, 11, 12],
    };
    return registrosAnio.filter((r) => {
      if (r.mes === 0) return false;
      if (filtroMes > 0) return r.mes === filtroMes;
      if (filtroTrimestre !== 'TODOS') return trimMeses[filtroTrimestre].includes(r.mes);
      return true;
    });
  }, [registrosAnio, filtroMes, filtroTrimestre]);

  const registroConsolidadoAnual = useMemo(
    () =>
      registrosAnio.find((r) => r.mes === 0) || {
        id: `per-${anioActivo}-00`,
        anio: anioActivo,
        mes: 0,
        periodoLabel: `Consolidado Anual ${anioActivo}`,
        numeroTrabajadores: activosCount || config.numeroTrabajadores,
        accidentesTrabajo: null,
        accidentesMortales: null,
        diasIncapacidadAT: null,
        diasCargadosAT: null,
        casosNuevosEL: null,
        casosAntiguosEL: null,
        diasAusenciaIncapacidadMedica: null,
        diasTrabajoProgramados: null,
        validado: false,
        fechaActualizacion: new Date().toISOString().split('T')[0],
      },
    [registrosAnio, anioActivo, activosCount, config.numeroTrabajadores]
  );

  const resumenActividades = useMemo(() => {
    const total = plan.actividades.length;
    const cumplidas = plan.actividades.filter((a) => a.estado === 'CUMPLIDA').length;
    const vencidas = plan.actividades.filter((a) => a.estado === 'VENCIDA').length;
    const pendientes = total - cumplidas - vencidas;
    const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
    return { total, cumplidas, vencidas, pendientes, pct };
  }, [plan.actividades]);

  const resumenEstandares = useMemo(() => {
    const verificados = estandares.filter((e) => e.estadoRevision === 'CUMPLE_VERIFICADO').length;
    const requierenMejora = estandares.filter(
      (e) => e.estadoRevision === 'REQUIERE_MEJORA' || e.estadoRevision === 'FALTA_SOPORTE'
    ).length;
    return { verificados, requierenMejora, total: estandares.length };
  }, [estandares]);

  const aniosDisponibles = useMemo(
    () =>
      Object.keys(todosLosPlanes)
        .map(Number)
        .sort((a, b) => a - b),
    [todosLosPlanes]
  );

  const handleAgregarIndicadorCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoIndForm.nombre.trim() || !nuevoIndForm.formula.trim()) return;
    const idx = hojasVidaIndicadores.length + 1;
    const nuevo: HojaVidaIndicadorSST = {
      id: `ind-custom-${Date.now()}`,
      codigo: `IND-${String(idx).padStart(2, '0')}`,
      esNormativo0312: false,
      nombre: nuevoIndForm.nombre.trim(),
      tipo: nuevoIndForm.tipo,
      definicion: nuevoIndForm.definicion.trim() || nuevoIndForm.nombre.trim(),
      formula: nuevoIndForm.formula.trim(),
      variablesRequeridas: ['Valor medido en el periodo'],
      metaValor: nuevoIndForm.metaValor,
      metaOperador: nuevoIndForm.metaOperador,
      metaTexto: `${nuevoIndForm.metaOperador} ${nuevoIndForm.metaValor} ${nuevoIndForm.unidadMedida}`,
      reglaConteo: nuevoIndForm.reglaConteo.trim() || 'Registro directo validado por el responsable.',
      unidadMedida: nuevoIndForm.unidadMedida.trim() || '%',
      fuenteInformacion: nuevoIndForm.fuenteInformacion.trim() || 'Registros internos de Frikaz S.A.S.',
      periodicidad: nuevoIndForm.periodicidad,
      responsable: nuevoIndForm.responsable,
      interpretacionBase: nuevoIndForm.interpretacionBase.trim() || 'Resultado registrado en el periodo.',
    };
    onAddIndicadorCustom(nuevo);
    setShowNuevoInd(false);
    setNuevoIndForm({
      nombre: '',
      tipo: 'PROCESO',
      definicion: '',
      formula: '',
      metaValor: 90,
      metaOperador: '>=',
      unidadMedida: '%',
      reglaConteo: '',
      fuenteInformacion: '',
      periodicidad: 'MENSUAL',
      responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
      interpretacionBase: 'Resultado del periodo medido.',
    });
  };

  const parseNullableNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const num = Number(raw);
    return Number.isNaN(num) || num < 0 ? null : num;
  };

  const handleExportExcel = async () => {
    setExportando(true);
    try {
      await exportarIndicadoresExcel(
        anioActivo,
        hojasVidaIndicadores,
        registrosPeriodosIndicadores,
        trabajadores,
        config
      );
    } finally {
      setExportando(false);
    }
  };

  const riesgosEvaluados = useMemo(() => {
    return riesgos
      .map((r) => {
        const acts = plan.actividades.filter((a) => a.riesgoId === r.id);
        const evs = acts.flatMap((a) => a.evidencias);
        const cumplidas = acts.filter((a) => a.estado === 'CUMPLIDA').length;
        const vencidas = acts.filter((a) => a.estado === 'VENCIDA').length;
        const acciones = accionesMejora.filter((ac) => ac.riesgoId === r.id);
        const necesitaAtencion =
          acts.length === 0 || vencidas > 0 || ((r.interpretacionNR === 'I' || r.interpretacionNR === 'II') && cumplidas === 0);
        return { r, acts, evs, cumplidas, vencidas, acciones, necesitaAtencion };
      })
      .filter((item) => {
        if (filtroVerifRiesgo === 'SIN_CONTROL_O_VENCIDO') return item.necesitaAtencion;
        if (filtroVerifRiesgo === 'PRIORITARIOS') {
          return item.r.interpretacionNR === 'I' || item.r.interpretacionNR === 'II';
        }
        return true;
      });
  }, [riesgos, plan.actividades, accionesMejora, filtroVerifRiesgo]);

  return (
    <div className="space-y-5 text-xs">
      {/* Navegación interna de VERIFICAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0f172a]">
              2. VERIFICAR — Indicadores Reales (Res. 0312), Riesgos y 7 Estándares Mínimos
            </h3>
            <p className="text-[11px] text-slate-500">
              Revise cómo van las cuentas de accidentalidad, incapacidad y enfermedades laborales con datos reales (nunca inventados en cero), los controles de riesgos y los 7 estándares de ley.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exportando ? 'Generando...' : `Descargar Excel Indicadores ${anioActivo}`}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              id: 'tablero',
              label: 'A–D. Tablero e Indicadores',
              badge: hojasVidaIndicadores.length,
              icon: TrendingUp,
            },
            {
              id: 'captura',
              label: 'C. Datos Mensuales y Validación',
              badge: `${registrosAnio.filter((r) => r.validado && r.mes >= 1).length}/12`,
              icon: Database,
            },
            {
              id: 'riesgos',
              label: 'E. Verificación de Riesgos',
              badge: riesgosEvaluados.length,
              icon: ShieldAlert,
            },
            {
              id: 'estandares',
              label: 'F. Siete Estándares Mínimos',
              badge: `${resumenEstandares.verificados}/${resumenEstandares.total}`,
              icon: Award,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as SubTabVerificar)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center justify-between gap-1.5 border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#f97316]'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-mono text-[10px]">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* A, B, D. TABLERO DE CONTROL Y HOJAS DE VIDA (6 INDICADORES RES 0312) */}
      {/* =================================================================== */}
      {subTab === 'tablero' && (
        <div className="space-y-5">
          {/* Resumen general del cumplimiento + alertas + semaforización explicada */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Actividades Cumplidas
              </span>
              <span className="text-2xl font-black font-mono text-emerald-700">
                {resumenActividades.cumplidas}/{resumenActividades.total}
              </span>
              <span className="text-[10px] text-slate-500 block">{resumenActividades.pct}% de avance</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                Pendientes / En proceso
              </span>
              <span className="text-2xl font-black font-mono text-amber-950">
                {resumenActividades.pendientes}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                Actividades Atrasadas
              </span>
              <span className="text-2xl font-black font-mono text-rose-950">
                {resumenActividades.vencidas}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Alertas Activas
              </span>
              <span className="text-2xl font-black font-mono text-[#f97316]">{alertas.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0f172a] text-white shadow-xs">
              <span className="text-[10px] font-bold uppercase text-[#fed7aa] block">
                Estándares Verificados
              </span>
              <span className="text-2xl font-black font-mono">
                {resumenEstandares.verificados} / {resumenEstandares.total}
              </span>
            </div>
          </div>

          {/* Filtros de periodo y explicación de Semaforización */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-[#f97316]" />
                <span className="font-black text-slate-800">Consultar periodo ({anioActivo}):</span>
                <select
                  value={filtroTrimestre}
                  onChange={(e) => {
                    setFiltroTrimestre(e.target.value as any);
                    setFiltroMes(0);
                  }}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-bold"
                >
                  <option value="TODOS">Todo el año (Ene - Dic)</option>
                  <option value="Q1">Trimestre 1 (Ene - Mar)</option>
                  <option value="Q2">Trimestre 2 (Abr - Jun)</option>
                  <option value="Q3">Trimestre 3 (Jul - Sep)</option>
                  <option value="Q4">Trimestre 4 (Oct - Dic)</option>
                </select>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-bold"
                >
                  <option value={0}>Mostrar último mes validado</option>
                  {MESES_NOMBRES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      Mes específico: {m}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowNuevoInd(!showNuevoInd)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#fed7aa]" />
                <span>Agregar Indicador Propio de Frikaz</span>
              </button>
            </div>

            {/* Leyenda sencilla de Semaforización */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
              <p className="font-black text-slate-800 text-[11px] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#f97316]" />
                <span>¿Qué significan los colores de aviso (Semaforización)?</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 font-bold">
                  Verde: Cumplimos la meta esperada.
                </span>
                <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-bold">
                  Amarillo: Hay datos por revisar/validar o alerta temprana.
                </span>
                <span className="px-2 py-1 rounded bg-rose-100 text-rose-900 font-bold">
                  Rojo: Superamos el límite permitido; requiere acción en ACTUAR.
                </span>
                <span className="px-2 py-1 rounded bg-slate-200 text-slate-800 font-bold">
                  Gris: Faltan datos por registrar (no se inventa un cero).
                </span>
              </div>
            </div>
          </div>

          {/* Formulario para crear indicador propio adicional sin tocar los 6 de Res. 0312 */}
          {showNuevoInd && (
            <form
              onSubmit={handleAgregarIndicadorCustom}
              className="rounded-2xl border border-orange-300 bg-orange-50/40 p-4 space-y-3"
            >
              <h4 className="font-black text-[#0f172a]">
                Nuevo Indicador Propio de Frikaz S.A.S. (los 6 de ley siguen protegidos)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nombre del indicador *</label>
                  <input
                    type="text"
                    value={nuevoIndForm.nombre}
                    onChange={(e) => setNuevoIndForm({ ...nuevoIndForm, nombre: e.target.value })}
                    placeholder="Ej. Cumplimiento de inspecciones mensuales de freidoras"
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de indicador</label>
                  <select
                    value={nuevoIndForm.tipo}
                    onChange={(e) => setNuevoIndForm({ ...nuevoIndForm, tipo: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="ESTRUCTURA">Estructura</option>
                    <option value="PROCESO">Proceso</option>
                    <option value="RESULTADO">Resultado</option>
                    <option value="AMBIENTAL">Ambiental</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Fórmula *</label>
                  <input
                    type="text"
                    value={nuevoIndForm.formula}
                    onChange={(e) => setNuevoIndForm({ ...nuevoIndForm, formula: e.target.value })}
                    placeholder="Ej. (Inspecciones hechas / Inspecciones planeadas) × 100"
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meta numérica</label>
                  <div className="flex gap-1">
                    <select
                      value={nuevoIndForm.metaOperador}
                      onChange={(e) =>
                        setNuevoIndForm({ ...nuevoIndForm, metaOperador: e.target.value as any })
                      }
                      className="rounded-lg border border-slate-300 p-2 bg-white"
                    >
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="=">=</option>
                    </select>
                    <input
                      type="number"
                      value={nuevoIndForm.metaValor}
                      onChange={(e) =>
                        setNuevoIndForm({ ...nuevoIndForm, metaValor: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cada cuánto se mide</label>
                  <select
                    value={nuevoIndForm.periodicidad}
                    onChange={(e) =>
                      setNuevoIndForm({ ...nuevoIndForm, periodicidad: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="MENSUAL">Mensual</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Qué documento se revisa (Fuente de información)
                  </label>
                  <input
                    type="text"
                    value={nuevoIndForm.fuenteInformacion}
                    onChange={(e) =>
                      setNuevoIndForm({ ...nuevoIndForm, fuenteInformacion: e.target.value })
                    }
                    placeholder="Ej. Lista de chequeo mensual de cocina"
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cómo se interpreta el dato</label>
                  <input
                    type="text"
                    value={nuevoIndForm.interpretacionBase}
                    onChange={(e) =>
                      setNuevoIndForm({ ...nuevoIndForm, interpretacionBase: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                >
                  Guardar Indicador Propio
                </button>
                <button
                  type="button"
                  onClick={() => setShowNuevoInd(false)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Tarjetas de los 6 Indicadores Principales Res. 0312 de 2019 Art. 30 + Custom */}
          <div className="space-y-4">
            {hojasVidaIndicadores.map((ind) => {
              const esAnual = ind.periodicidad === 'ANUAL';
              const regActual = esAnual
                ? registroConsolidadoAnual
                : filtroMes > 0
                ? registrosAnio.find((r) => r.mes === filtroMes) || registroConsolidadoAnual
                : [...registrosMensualesFiltrados]
                    .reverse()
                    .find((r) => r.validado) ||
                  registrosMensualesFiltrados[registrosMensualesFiltrados.length - 1] ||
                  registroConsolidadoAnual;

              const resultado = calcularResultadoIndicadorPeriodo(
                ind,
                regActual,
                trabajadores,
                config
              );

              // Serie para gráfico SVG
              const serie = esAnual
                ? aniosDisponibles.map((yr) => {
                    const rYr = registrosPeriodosIndicadores.find(
                      (p) => p.anio === yr && p.mes === 0
                    );
                    return rYr
                      ? calcularResultadoIndicadorPeriodo(ind, rYr, trabajadores, config)
                      : null;
                  })
                : registrosMensualesFiltrados.map((regM) =>
                    calcularResultadoIndicadorPeriodo(ind, regM, trabajadores, config)
                  );

              const maxValChart = Math.max(
                1,
                ind.metaValor || 1,
                ...serie.map((s) => (s && s.valor !== null ? s.valor : 0))
              );
              const hojaAbierta = hojaAbiertaId === ind.id;
              const semStyle = COLOR_SEMAFORO[resultado.estadoSemaforo];

              return (
                <div
                  key={ind.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-black text-[10px]">
                          {ind.codigo}
                        </span>
                        {ind.esNormativo0312 ? (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                            Obligatorio Ley · Res. 0312 Art. 30
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">
                            Propio Frikaz S.A.S.
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {ind.tipo} · {ind.periodicidad}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg border font-black text-[10px] ${semStyle.badge}`}
                        >
                          {semStyle.label}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-[#0f172a]">
                        {ind.nombre}
                      </h4>
                      <p className="text-[11px] text-slate-600">{ind.definicion}</p>
                    </div>

                    {/* Resultado real o estado faltante */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 min-w-[230px] text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Periodo mostrado: {resultado.periodoLabel}
                      </span>
                      {resultado.valor !== null ? (
                        <span className="text-2xl font-black font-mono text-[#0f172a]">
                          {resultado.valor}{' '}
                          <span className="text-xs font-bold text-slate-500">
                            {ind.unidadMedida}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs font-black text-amber-800 block mt-1">
                          {resultado.estadoCalculo === 'PENDIENTE_REGISTRO'
                            ? 'Información pendiente de registro'
                            : resultado.estadoCalculo === 'PENDIENTE_VALIDACION'
                            ? 'Pendiente de validación'
                            : 'Cálculo no disponible (denominador 0)'}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Meta: <strong>{ind.metaTexto}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Interpretación automática en lenguaje sencillo */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-[#0f172a]">Qué significa este resultado: </strong>
                      {resultado.interpretacionAutomatica}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setHojaAbiertaId(hojaAbierta ? null : ind.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        {hojaAbierta ? 'Ocultar Hoja de Vida' : 'Ver Hoja de Vida Completa'}
                      </button>
                      {(resultado.estadoSemaforo === 'ROJO' ||
                        resultado.estadoSemaforo === 'AMARILLO') && (
                        <button
                          type="button"
                          onClick={() =>
                            onCrearAccionDesdeVerificar({
                              origen: 'INDICADORES',
                              tipo: 'CORRECTIVA',
                              situacionEncontrada: `Resultado del indicador ${ind.codigo} (${ind.nombre}) en ${resultado.periodoLabel}: ${resultado.interpretacionAutomatica}`,
                              queSeNecesitaCorregir: `Analizar causas y llevar el indicador dentro de la meta (${ind.metaTexto}).`,
                              actividadARealizar: `Revisar novedades de ${resultado.periodoLabel} e implementar medidas de prevención en planta.`,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
                        >
                          Crear Acción en ACTUAR →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Gráfico SVG limpio de comportamiento en el tiempo */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>
                        Comportamiento {esAnual ? 'por Año' : `mes a mes (${anioActivo})`} — Actualizado:{' '}
                        {resultado.fechaActualizacion}
                      </span>
                      <span>Hover / toca una barra para ver el detalle</span>
                    </div>
                    <svg
                      viewBox={`0 0 ${Math.max(serie.length * 46, 260)} 86`}
                      className="w-full h-22 overflow-visible"
                      role="img"
                      aria-label={`Gráfico de tendencia para ${ind.nombre}`}
                    >
                      {serie.map((punto, idx) => {
                        const x = idx * 46 + 10;
                        const labelCorto = punto
                          ? esAnual
                            ? String(punto.anio)
                            : MESES_NOMBRES[(punto.mes || 1) - 1].slice(0, 3)
                          : String(aniosDisponibles[idx] || '');
                        const val = punto && punto.valor !== null ? punto.valor : null;
                        const h =
                          val !== null ? Math.max(8, Math.round((val / maxValChart) * 50)) : 12;
                        const y = 58 - h;
                        const fill = punto ? COLOR_SEMAFORO[punto.estadoSemaforo].bar : '#e2e8f0';
                        return (
                          <g key={`${ind.id}-bar-${idx}`}>
                            <title>
                              {punto
                                ? `${punto.periodoLabel}: ${
                                    val !== null ? `${val} ${ind.unidadMedida}` : punto.textoSemaforo
                                  }`
                                : 'Sin registro'}
                            </title>
                            <rect
                              x={x}
                              y={y}
                              width={26}
                              height={h}
                              rx={5}
                              fill={fill}
                              opacity={val !== null ? 0.92 : 0.45}
                            />
                            <text
                              x={x + 13}
                              y={Math.max(10, y - 3)}
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="700"
                              fill="#0f172a"
                            >
                              {val !== null ? val : '—'}
                            </text>
                            <text
                              x={x + 13}
                              y={74}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="600"
                              fill="#475569"
                            >
                              {labelCorto}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Hoja de vida completa expandible */}
                  {hojaAbierta && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="font-bold text-indigo-950 block">Fórmula oficial:</span>
                        <p className="font-mono text-slate-800 bg-white p-2 rounded border border-indigo-100 mt-0.5">
                          {ind.formula}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          Regla de conteo (cómo se obtiene cada dato):
                        </span>
                        <p className="text-slate-700 mt-0.5">{ind.reglaConteo}</p>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          De dónde sale el dato (Fuente de información):
                        </span>
                        <p className="text-slate-700 mt-0.5">{ind.fuenteInformacion}</p>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          Variables utilizadas en {resultado.periodoLabel}:
                        </span>
                        <ul className="mt-0.5 space-y-1 text-slate-700">
                          {resultado.variablesUsadas.map((v) => (
                            <li key={v.etiqueta} className="bg-white px-2 py-1 rounded border border-indigo-100">
                              <strong>{v.etiqueta}:</strong> {v.valor}{' '}
                              <span className="text-[10px] text-slate-500">({v.origen})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          Unidad de medida, Meta y Encargado:
                        </span>
                        <p className="text-slate-700 mt-0.5">
                          Unidad: <strong>{ind.unidadMedida}</strong> · Meta: <strong>{ind.metaTexto}</strong> · Responsable: <strong>{ind.responsable}</strong>
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          Interpretación modelo (Res. 0312):
                        </span>
                        <p className="text-slate-700 mt-0.5">{ind.interpretacionBase}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Archivo colapsable de indicadores históricos anteriores (sin perder información guardada) */}
          {plan.indicadores.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  Histórico guardado de indicadores anteriores ({plan.indicadores.length} registros conservados)
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarArchivoAnteriores(!mostrarArchivoAnteriores)}
                  className="text-[11px] font-bold text-[#f97316] hover:underline cursor-pointer"
                >
                  {mostrarArchivoAnteriores ? 'Ocultar archivo histórico' : 'Consultar archivo histórico'}
                </button>
              </div>
              {mostrarArchivoAnteriores && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {plan.indicadores.map((old) => (
                    <div key={old.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <strong className="text-slate-800">
                        {old.codigo}: {old.nombre}
                      </strong>
                      <p className="text-[10px] text-slate-500">
                        Meta: {old.metaTexto} · Mediciones previas: {old.historicoMediciones.length}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* C. BASE DE DATOS MENSUAL (CAPTURA Y VALIDACIÓN SIN DATOS INVENTADOS) */}
      {/* =================================================================== */}
      {subTab === 'captura' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[#0f172a]">
                Base de Datos Mensual y Consolidado Anual ({anioActivo})
              </h4>
              <p className="text-[11px] text-slate-500">
                El número de trabajadores se toma de sus fichas activas en HACER ({activosCount} activos hoy). Si deja un campo vacío, el sistema avisará «Información pendiente de registro» y nunca inventará un cero falso.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSyncTrabajadoresPeriodos(anioActivo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold cursor-pointer shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#fed7aa]" />
              <span>Actualizar N° Trabajadores ({activosCount}) desde HACER</span>
            </button>
          </div>

          {/* Formulario inline de edición de un periodo */}
          {periodoDraft && editingPeriodoId && (
            <div className="rounded-2xl border-2 border-[#f97316] bg-orange-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-[#0f172a]">
                  Editar datos reales de: {periodoDraft.periodoLabel}
                </h5>
                <span className="text-[10px] text-slate-600">
                  Deje en blanco cualquier dato que aún no tenga confirmado.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[11px]">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">N° Trabajadores</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.numeroTrabajadores ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        numeroTrabajadores: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Accidentes Trabajo (AT)</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.accidentesTrabajo ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        accidentesTrabajo: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">AT Mortales</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.accidentesMortales ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        accidentesMortales: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Días incapacidad AT</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.diasIncapacidadAT ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        diasIncapacidadAT: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Días cargados AT</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.diasCargadosAT ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        diasCargadosAT: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Casos nuevos EL</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.casosNuevosEL ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        casosNuevosEL: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Casos antiguos EL</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.casosAntiguosEL ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        casosAntiguosEL: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Días ausencia médica</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.diasAusenciaIncapacidadMedica ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        diasAusenciaIncapacidadMedica: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Días programados mes</label>
                  <input
                    type="number"
                    min={0}
                    value={periodoDraft.diasTrabajoProgramados ?? ''}
                    onChange={(e) =>
                      setPeriodoDraft({
                        ...periodoDraft,
                        diasTrabajoProgramados: parseNullableNumber(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-1.5 bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-300 w-full cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={periodoDraft.validado}
                      onChange={(e) =>
                        setPeriodoDraft({ ...periodoDraft, validado: e.target.checked })
                      }
                    />
                    <span>Periodo Validado</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={periodoDraft.observaciones || ''}
                  onChange={(e) =>
                    setPeriodoDraft({ ...periodoDraft, observaciones: e.target.value })
                  }
                  placeholder="Nota aclaratoria del periodo (opcional)..."
                  className="flex-1 min-w-[240px] rounded-lg border border-slate-300 p-2 bg-white text-xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPeriodoId(null);
                      setPeriodoDraft(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveRegistroPeriodo({
                        ...periodoDraft,
                        validadoPor: periodoDraft.validado
                          ? 'Coordinador / Vigía de SST'
                          : undefined,
                        fechaActualizacion: new Date().toISOString().split('T')[0],
                      });
                      setEditingPeriodoId(null);
                      setPeriodoDraft(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Guardar Datos del Periodo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de periodos mensuales y consolidado anual */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#0f172a] text-white uppercase text-[10px]">
                    <th className="p-2.5">Periodo</th>
                    <th className="p-2.5 text-center">Trab.</th>
                    <th className="p-2.5 text-center">AT</th>
                    <th className="p-2.5 text-center">Mortales</th>
                    <th className="p-2.5 text-center">Días Inc. AT</th>
                    <th className="p-2.5 text-center">Casos EL (N/A)</th>
                    <th className="p-2.5 text-center">Ausencia Méd.</th>
                    <th className="p-2.5 text-center">Días Prog.</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...registrosAnio.filter((r) => r.mes >= 1), registroConsolidadoAnual].map(
                    (reg) => {
                      const esConsolidado = reg.mes === 0;
                      const showVal = (v: number | null) =>
                        v === null ? <span className="text-amber-700 font-bold">Pend.</span> : v;
                      return (
                        <tr
                          key={reg.id}
                          className={
                            esConsolidado ? 'bg-orange-50/70 font-bold' : 'hover:bg-slate-50'
                          }
                        >
                          <td className="p-2.5 font-bold text-slate-900">{reg.periodoLabel}</td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.numeroTrabajadores)}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.accidentesTrabajo)}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.accidentesMortales)}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.diasIncapacidadAT)}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {reg.casosNuevosEL === null || reg.casosAntiguosEL === null ? (
                              <span className="text-amber-700 font-bold">Pend.</span>
                            ) : (
                              `${reg.casosNuevosEL} / ${reg.casosAntiguosEL}`
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.diasAusenciaIncapacidadMedica)}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {showVal(reg.diasTrabajoProgramados)}
                          </td>
                          <td className="p-2.5">
                            {reg.validado ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                Validado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                Pendiente de validar
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPeriodoId(reg.id);
                                setPeriodoDraft({ ...reg });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                            >
                              Registrar / Validar
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* E. VERIFICACIÓN DE LOS RIESGOS CONECTADOS AL PLAN ANUAL             */}
      {/* =================================================================== */}
      {subTab === 'riesgos' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[#0f172a]">
                Verificación de Riesgos y Controles de la Matriz GTC 45
              </h4>
              <p className="text-[11px] text-slate-500">
                Compruebe si cada riesgo tiene medidas realizadas y soportes válidos. Si algo falló o está vencido, envíelo a ACTUAR con un clic.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'TODOS', label: 'Todos los riesgos' },
                { id: 'PRIORITARIOS', label: 'Solo Nivel I y II' },
                { id: 'SIN_CONTROL_O_VENCIDO', label: 'Requieren atención / Sin control' },
              ].map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setFiltroVerifRiesgo(op.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    filtroVerifRiesgo === op.id
                      ? 'bg-[#0f172a] text-[#fed7aa]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {riesgosEvaluados.map(({ r, acts, evs, cumplidas, vencidas, acciones, necesitaAtencion }) => (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs space-y-2.5 ${
                  necesitaAtencion ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0f172a] text-white font-mono font-black text-[10px]">
                        {r.codigo || r.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          r.interpretacionNR === 'I'
                            ? 'bg-rose-600 text-white'
                            : r.interpretacionNR === 'II'
                            ? 'bg-[#f97316] text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        Nivel {r.interpretacionNR}
                      </span>
                      <span className="font-bold text-slate-700">
                        Cargo: {r.cargo || r.cargosExpuestos} · Área: {r.proceso}
                      </span>
                      {necesitaAtencion ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px]">
                          Necesita atención ({vencidas} vencidas / {acts.length} tareas)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Con seguimiento ({cumplidas}/{acts.length} cumplidas · {evs.length} soportes)
                        </span>
                      )}
                    </div>
                    <h5 className="text-sm font-black text-slate-900">{r.peligroDescripcion}</h5>
                    <p className="text-[11px] text-slate-600">
                      <strong>Medidas definidas en la matriz:</strong> {extraerMedidasRiesgo(r)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {acts[0] && (
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(acts[0], 'evidencias')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Ver Actividad y Soportes</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onCrearAccionDesdeVerificar({
                          origen: 'MATRIZ_RIESGOS',
                          tipo: vencidas > 0 ? 'CORRECTIVA' : 'PREVENTIVA',
                          situacionEncontrada: `Al verificar el riesgo ${r.codigo || r.id} (${r.peligroDescripcion}) en ${r.cargo || r.cargosExpuestos}, se detectan medidas pendientes o sin efecto esperado.`,
                          queSeNecesitaCorregir: `Reforzar e implementar en planta: ${extraerMedidasRiesgo(r)}`,
                          actividadARealizar: `Ejecutar verificación en puesto de trabajo y recoger evidencia fotográfica/firma para ${r.codigo || r.id}.`,
                          riesgoId: r.id,
                          actividadPlanId: acts[0]?.id,
                          estandarNumero: 7,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
                    >
                      Medida no efectiva / Crear Acción en ACTUAR →
                    </button>
                  </div>
                </div>

                {acciones.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-900">
                    <strong>Acciones de mejora ya abiertas en ACTUAR:</strong>{' '}
                    {acciones.map((a) => `${a.codigo} (${a.estado})`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* F. VERIFICACIÓN DE LOS SIETE ESTÁNDARES MÍNIMOS (RES. 0312 CAP. I)  */}
      {/* =================================================================== */}
      {subTab === 'estandares' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Revisión de los Siete (7) Estándares Mínimos — Año {anioActivo}</span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-1">
              Cada punto reúne automáticamente la información real de trabajadores, matriz GTC 45, capacitación y plan anual.{' '}
              <strong>Ningún estándar se marca como cumplido solo por llenar un formulario:</strong>{' '}
              usted revisa qué existe y qué falta, y aprueba manualmente su estado.
            </p>
          </div>

          <div className="space-y-3.5">
            {estandares.map((est) => {
              const soportes = obtenerSoportesRealesEstandar(
                est.numero,
                plan,
                trabajadores,
                riesgos,
                accionesMejora
              );
              const isEditing = editingEstandarNum === est.numero && estandarDraft;
              const badgeColor =
                est.estadoRevision === 'CUMPLE_VERIFICADO'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : est.estadoRevision === 'FALTA_SOPORTE' || est.estadoRevision === 'REQUIERE_MEJORA'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300';

              return (
                <div
                  key={est.numero}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg border font-black text-[10px] ${badgeColor}`}>
                          {est.estadoRevision.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {est.normaReferencia}
                        </span>
                      </div>
                      <h5 className="text-sm font-black text-[#0f172a]">{est.titulo}</h5>
                      <p className="text-[11px] text-slate-600">{est.descripcionSencilla}</p>
                      <p className="text-[10px] text-indigo-800 bg-indigo-50 px-2 py-1 rounded inline-block">
                        {est.motivoAplicabilidad}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEstandarNum(isEditing ? null : est.numero);
                          setEstandarDraft(isEditing ? null : { ...est });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold cursor-pointer"
                      >
                        {isEditing ? 'Cerrar Revisión' : 'Revisar y Cambiar Estado'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onCrearAccionDesdeVerificar({
                            origen: 'ESTANDARES_MINIMOS',
                            tipo: 'MEJORA',
                            situacionEncontrada: `Revisión del Estándar ${est.titulo}: ${soportes.faltantesDetectados.join(' ') || est.observacionesRevision}`,
                            queSeNecesitaCorregir: `Completar los soportes requeridos: ${est.informacionNecesaria.join('; ')}`,
                            actividadARealizar: `Gestionar documentos o actividades faltantes para cerrar el estándar ${est.numero} en ${anioActivo}.`,
                            estandarNumero: est.numero,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-950 font-black hover:bg-orange-200 cursor-pointer"
                      >
                        + Acción en ACTUAR
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-black text-slate-800 block">Qué información necesita:</span>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {est.informacionNecesaria.map((inf) => (
                          <li key={inf}>{inf}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                      <span className="font-black text-emerald-950 block">Qué ya tenemos registrado:</span>
                      <ul className="list-disc pl-4 text-emerald-900 space-y-0.5">
                        {soportes.registrosDisponibles.map((reg) => (
                          <li key={reg}>{reg}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                      <span className="font-black text-amber-950 block">
                        Qué falta o necesita revisión ({soportes.faltantesDetectados.length}):
                      </span>
                      {soportes.faltantesDetectados.length > 0 ? (
                        <ul className="list-disc pl-4 text-amber-900 space-y-0.5">
                          {soportes.faltantesDetectados.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-emerald-800 font-bold">
                          Soportes conectados completos. Listo para confirmación del revisor.
                        </p>
                      )}
                      {soportes.accionesRelacionadas.length > 0 && (
                        <p className="text-[10px] text-indigo-900 pt-1">
                          Acciones en ACTUAR: {soportes.accionesRelacionadas.map((a) => a.codigo).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {est.observacionesRevision && !isEditing && (
                    <p className="text-[11px] text-slate-600">
                      <strong>Nota de revisión ({est.fechaRevision || 'En curso'}):</strong>{' '}
                      {est.observacionesRevision}
                    </p>
                  )}

                  {isEditing && estandarDraft && (
                    <div className="rounded-xl border border-orange-300 bg-orange-50/50 p-3.5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Resultado real de la revisión
                          </label>
                          <select
                            value={estandarDraft.estadoRevision}
                            onChange={(e) =>
                              setEstandarDraft({
                                ...estandarDraft,
                                estadoRevision: e.target.value as EvaluacionEstandarMinimo['estadoRevision'],
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                          >
                            <option value="PENDIENTE_REVISION">Pendiente de revisión</option>
                            <option value="EN_REVISION">En revisión</option>
                            <option value="FALTA_SOPORTE">Falta soporte</option>
                            <option value="REQUIERE_MEJORA">Requiere mejora</option>
                            <option value="CUMPLE_VERIFICADO">Cumple (Verificado manualmente)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Revisado por</label>
                          <select
                            value={estandarDraft.revisadoPor || responsables[0]?.nombre || ''}
                            onChange={(e) =>
                              setEstandarDraft({ ...estandarDraft, revisadoPor: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                          >
                            {responsables.map((r) => (
                              <option key={r.id} value={r.nombre}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Fecha de revisión</label>
                          <input
                            type="date"
                            value={
                              estandarDraft.fechaRevision ||
                              new Date().toISOString().split('T')[0]
                            }
                            onChange={(e) =>
                              setEstandarDraft({ ...estandarDraft, fechaRevision: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Observaciones de lo encontrado en los soportes
                        </label>
                        <input
                          type="text"
                          value={estandarDraft.observacionesRevision}
                          onChange={(e) =>
                            setEstandarDraft({
                              ...estandarDraft,
                              observacionesRevision: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateEstandar({
                            ...estandarDraft,
                            fechaRevision:
                              estandarDraft.fechaRevision ||
                              new Date().toISOString().split('T')[0],
                          });
                          setEditingEstandarNum(null);
                          setEstandarDraft(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer"
                      >
                        Guardar Verificación del Estándar {est.numero}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
