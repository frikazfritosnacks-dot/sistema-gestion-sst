import React, { useState, useEffect } from 'react';
import {
  EstadoAprobacionPlan,
  EvaluacionEstandarMinimo,
  HojaVidaIndicadorSST,
  IndicadorCalculado,
  IndicadorGestionPlan,
  ObjetivoEspecificoPlan,
  PlanAnualVigencia,
  ResponsablePlanOption,
  TipoCalculoIndicador,
  TipoIndicadorPlan,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import {
  esEstadoExclusivoGerente,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
} from '../../services/gerenteControlService';
import {
  Target,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Sparkles,
  TrendingUp,
  Eye,
  X,
  Mail,
} from 'lucide-react';

interface PlanAnualObjetivosKpiTabProps {
  plan: PlanAnualVigencia;
  indicadoresCalculados: IndicadorCalculado[];
  hojasVidaIndicadores?: HojaVidaIndicadorSST[];
  riesgos?: RiesgoGTC45Item[];
  estandares?: EvaluacionEstandarMinimo[];
  responsables: ResponsablePlanOption[];
  mode?: 'objetivos' | 'indicadores' | 'ambos';
  onUpdatePlan: (updated: PlanAnualVigencia, logAction?: string) => void;
}

export const PlanAnualObjetivosKpiTab: React.FC<PlanAnualObjetivosKpiTabProps> = ({
  plan,
  indicadoresCalculados,
  hojasVidaIndicadores = [],
  riesgos = [],
  estandares = [],
  responsables,
  mode = 'ambos',
  onUpdatePlan,
}) => {
  const { esGerente, solicitarAccesoGerente } = useGerenteAutorizado();
  const planCerrado =
    normalizarEstadoEstandar(plan.estadoAprobacion) === 'Aprobado' ||
    normalizarEstadoEstandar(plan.estadoAprobacion) === 'Cumplido';
  const [hojaVidaModal, setHojaVidaModal] = useState<HojaVidaIndicadorSST | null>(null);
  const [editVinculosObjId, setEditVinculosObjId] = useState<string | null>(null);
  // Edición de Objetivo General
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [objGeneralForm, setObjGeneralForm] = useState({
    objetivoGeneral: plan.objetivoGeneral,
    fechaElaboracion: plan.fechaElaboracion,
    responsableNombre: plan.responsableNombre,
    aprobadorNombre: plan.aprobadorNombre,
    estadoAprobacion: plan.estadoAprobacion,
  });

  // Creación de Objetivo Específico
  const [showNewObjForm, setShowNewObjForm] = useState(false);
  const [newObj, setNewObj] = useState({
    titulo: '',
    descripcion: '',
    area: 'SST' as 'SST' | 'AMBIENTAL' | 'INTEGRAL',
    responsable: responsables[0]?.nombre || 'Gerente',
    metaDescripcion: '',
    metaValor: 100,
    metaUnidad: '%',
  });

  // Creación de Indicador KPI
  const [showNewIndForm, setShowNewIndForm] = useState(false);
  const [newInd, setNewInd] = useState<{
    nombre: string;
    tipo: TipoIndicadorPlan;
    objetivoEspecificoId: string;
    formula: string;
    metaValor: number;
    metaOperador: '>=' | '<=' | '=';
    reglaConteo: string;
    unidadMedida: string;
    fuenteInformacion: string;
    responsable: string;
    periodicidad: IndicadorGestionPlan['periodicidad'];
    tipoCalculo: TipoCalculoIndicador;
    resultadoManual: number;
  }>({
    nombre: '',
    tipo: 'PROCESO',
    objetivoEspecificoId: plan.objetivosEspecificos[0]?.id || '',
    formula: '(Tareas cumplidas / Total de tareas del plan) × 100',
    metaValor: 90,
    metaOperador: '>=',
    reglaConteo: 'Cuenta automáticamente cuántas tareas ya se cerraron con su prueba aprobada.',
    unidadMedida: '%',
    fuenteInformacion: 'Calendario del Plan Anual Frikaz S.A.S.',
    responsable: responsables[0]?.nombre || 'Gerente',
    periodicidad: 'TRIMESTRAL',
    tipoCalculo: 'AUTOMATICO_ACTIVIDADES',
    resultadoManual: 0,
  });

  // Registro de medición histórica en un indicador
  const [medicionIndId, setMedicionIndId] = useState<string | null>(null);
  const [medicionPeriodo, setMedicionPeriodo] = useState(`${plan.vigencia}-Q4`);
  const [medicionObs, setMedicionObs] = useState('');

  useEffect(() => {
    setObjGeneralForm({
      objetivoGeneral: plan.objetivoGeneral,
      fechaElaboracion: plan.fechaElaboracion,
      responsableNombre: plan.responsableNombre,
      aprobadorNombre: plan.aprobadorNombre,
      estadoAprobacion: plan.estadoAprobacion,
    });
    setEditingGeneral(false);
    setMedicionPeriodo(`${plan.vigencia}-Q4`);
    setMedicionIndId(null);
  }, [plan.vigencia, plan.objetivoGeneral, plan.fechaElaboracion, plan.responsableNombre, plan.aprobadorNombre, plan.estadoAprobacion]);

  const handleDeleteObjetivo = (objId: string) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const target = plan.objetivosEspecificos.find((o) => o.id === objId);
    if (!target) return;
    onUpdatePlan(
      {
        ...plan,
        objetivosEspecificos: plan.objetivosEspecificos.filter((o) => o.id !== objId),
      },
      `Objetivo específico eliminado: ${target.codigo}`
    );
  };

  const handleDeleteIndicador = (indId: string) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const target = plan.indicadores.find((i) => i.id === indId);
    if (!target) return;
    onUpdatePlan(
      {
        ...plan,
        indicadores: plan.indicadores.filter((i) => i.id !== indId),
        objetivosEspecificos: plan.objetivosEspecificos.map((o) => ({
          ...o,
          indicadoresIds: o.indicadoresIds.filter((id) => id !== indId),
        })),
      },
      `Indicador KPI eliminado: ${target.codigo}`
    );
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const estadoNorm = normalizarEstadoEstandar(objGeneralForm.estadoAprobacion);
    onUpdatePlan(
      {
        ...plan,
        objetivoGeneral: objGeneralForm.objetivoGeneral,
        fechaElaboracion: objGeneralForm.fechaElaboracion,
        responsableNombre: objGeneralForm.responsableNombre,
        aprobadorNombre: objGeneralForm.aprobadorNombre,
        estadoAprobacion: objGeneralForm.estadoAprobacion,
        fechaAprobacion:
          estadoNorm === 'Aprobado' && !plan.fechaAprobacion
            ? new Date().toISOString().split('T')[0]
            : plan.fechaAprobacion,
      },
      `Actualización de Objetivo General / Estado (${estadoNorm})`
    );
    setEditingGeneral(false);
  };

  const handleAddObjetivoEspecifico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!newObj.titulo.trim()) return;
    const codigo = `OBJ-0${plan.objetivosEspecificos.length + 1}`;
    const obj: ObjetivoEspecificoPlan = {
      id: `obj-${plan.vigencia}-${Date.now()}`,
      codigo,
      area: newObj.area,
      titulo: newObj.titulo.trim(),
      descripcion: newObj.descripcion.trim() || newObj.titulo.trim(),
      responsable: newObj.responsable,
      metas: newObj.metaDescripcion.trim()
        ? [
            {
              id: `meta-${Date.now()}`,
              descripcion: newObj.metaDescripcion.trim(),
              valorMeta: newObj.metaValor,
              unidad: newObj.metaUnidad,
              plazo: `Diciembre ${plan.vigencia}`,
            },
          ]
        : [],
      indicadoresIds: [],
    };
    onUpdatePlan(
      { ...plan, objetivosEspecificos: [...plan.objetivosEspecificos, obj] },
      `Nuevo objetivo específico creado: ${codigo}`
    );
    setNewObj({
      titulo: '',
      descripcion: '',
      area: 'SST',
      responsable: responsables[0]?.nombre || 'Gerente',
      metaDescripcion: '',
      metaValor: 100,
      metaUnidad: '%',
    });
    setShowNewObjForm(false);
  };

  const handleAddIndicador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!newInd.nombre.trim()) return;
    const codigo = `IND-0${plan.indicadores.length + 1}`;
    const indId = `ind-${plan.vigencia}-${Date.now()}`;
    const nuevo: IndicadorGestionPlan = {
      id: indId,
      codigo,
      nombre: newInd.nombre.trim(),
      tipo: newInd.tipo,
      objetivoEspecificoId: newInd.objetivoEspecificoId,
      formula: newInd.formula,
      metaValor: newInd.metaValor,
      metaOperador: newInd.metaOperador,
      metaTexto: `${newInd.metaOperador} ${newInd.metaValor}${newInd.unidadMedida}`,
      reglaConteo: newInd.reglaConteo,
      unidadMedida: newInd.unidadMedida,
      fuenteInformacion: newInd.fuenteInformacion,
      responsable: newInd.responsable,
      periodicidad: newInd.periodicidad,
      tipoCalculo: newInd.tipoCalculo,
      resultadoManual: newInd.tipoCalculo === 'MANUAL' ? newInd.resultadoManual : undefined,
      historicoMediciones: [],
    };

    const objetivosActualizados = plan.objetivosEspecificos.map((o) =>
      o.id === newInd.objetivoEspecificoId
        ? { ...o, indicadoresIds: [...o.indicadoresIds, indId] }
        : o
    );

    onUpdatePlan(
      {
        ...plan,
        indicadores: [...plan.indicadores, nuevo],
        objetivosEspecificos: objetivosActualizados,
      },
      `Nuevo indicador KPI creado: ${codigo} (${nuevo.nombre})`
    );
    setShowNewIndForm(false);
  };

  const handleRegistrarMedicionSnapshot = (ind: IndicadorCalculado) => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const nuevaMed = {
      id: `med-${Date.now()}`,
      periodo: medicionPeriodo.trim() || `${plan.vigencia}`,
      fecha: new Date().toISOString().split('T')[0],
      valor: ind.resultadoActual,
      observacion: medicionObs.trim() || ind.detalleCalculo,
    };
    const updatedInds = plan.indicadores.map((i) =>
      i.id === ind.id
        ? { ...i, historicoMediciones: [...i.historicoMediciones, nuevaMed] }
        : i
    );
    onUpdatePlan(
      { ...plan, indicadores: updatedInds },
      `Medición periódica registrada en ${ind.codigo}: ${ind.resultadoActual}${ind.unidadMedida}`
    );
    setMedicionIndId(null);
    setMedicionObs('');
  };

  return (
    <div className="space-y-6 text-xs">
      {(mode === 'ambos' || mode === 'objetivos') && (
        <>
          {/* A. OBJETIVO GENERAL DEL PLAN ANUAL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0f172a] text-[#fed7aa]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a]">
                Objetivo general del plan (Año {plan.vigencia})
              </h3>
              <p className="text-[11px] text-slate-500">
                La información de cada año se guarda aparte para que pueda consultarla y compararla cuando quiera.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!esGerente) {
                solicitarAccesoGerente();
                return;
              }
              setObjGeneralForm({
                objetivoGeneral: plan.objetivoGeneral,
                fechaElaboracion: plan.fechaElaboracion,
                responsableNombre: plan.responsableNombre,
                aprobadorNombre: plan.aprobadorNombre,
                estadoAprobacion: plan.estadoAprobacion,
              });
              setEditingGeneral(!editingGeneral);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{editingGeneral ? 'Cancelar' : 'Editar Propósito General'}</span>
          </button>
        </div>

        {!editingGeneral ? (
          <div className="space-y-3">
            <p className="text-slate-800 text-xs sm:text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
              {plan.objetivoGeneral}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Año
                </span>
                <span className="font-black text-slate-900 font-mono text-sm">
                  {plan.vigencia}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Fecha en que se hizo
                </span>
                <span className="font-bold text-slate-900">{plan.fechaElaboracion}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Encargado
                </span>
                <span className="font-bold text-slate-900">{plan.responsableNombre}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Estado
                </span>
                {(() => {
                  const badgePlan = getBadgeClassesEstadoFrikaz(plan.estadoAprobacion);
                  return (
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded border font-black text-[10px] ${badgePlan.light}`}
                    >
                      {badgePlan.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveGeneral} className="space-y-3 bg-orange-50/40 p-4 rounded-xl border border-orange-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Propósito General *</label>
              <textarea
                rows={3}
                value={objGeneralForm.objetivoGeneral}
                onChange={(e) =>
                  setObjGeneralForm({ ...objGeneralForm, objetivoGeneral: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha en que se hizo</label>
                <input
                  type="date"
                  value={objGeneralForm.fechaElaboracion}
                  onChange={(e) =>
                    setObjGeneralForm({ ...objGeneralForm, fechaElaboracion: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Encargado</label>
                <select
                  value={objGeneralForm.responsableNombre}
                  onChange={(e) =>
                    setObjGeneralForm({ ...objGeneralForm, responsableNombre: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {responsables.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Quien Aprueba</label>
                <select
                  value={objGeneralForm.aprobadorNombre}
                  onChange={(e) =>
                    setObjGeneralForm({ ...objGeneralForm, aprobadorNombre: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {responsables.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <span>Estado del Plan</span>
                  {!esGerente && <Mail className="h-3 w-3 text-amber-600" />}
                </label>
                <select
                  value={objGeneralForm.estadoAprobacion}
                  onChange={(e) => {
                    const val = e.target.value as EstadoAprobacionPlan;
                    if (esEstadoExclusivoGerente(val) && !esGerente) {
                      solicitarAccesoGerente();
                      return;
                    }
                    setObjGeneralForm({
                      ...objGeneralForm,
                      estadoAprobacion: val,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white font-bold"
                >
                  <option value="Por hacer">Por hacer</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Pendiente de revisión">Pendiente de revisión</option>
                  <option value="Devuelto para ajustes" disabled={!esGerente}>
                    Devuelto para ajustes (Solo Gerente)
                  </option>
                  <option value="Cumplido" disabled={!esGerente}>
                    Cumplido (Solo Gerente)
                  </option>
                  <option value="Aprobado" disabled={!esGerente}>
                    Aprobado (Solo Gerente)
                  </option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </form>
        )}
      </div>

      {/* B. OBJETIVOS ESPECÍFICOS Y METAS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-[#0f172a]">
              Objetivos específicos y metas ({plan.vigencia})
            </h3>
            <p className="text-[11px] text-slate-500">
              Conectados directamente con las tareas y cuentas del Plan Anual {plan.vigencia}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewObjForm(!showNewObjForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Nuevo Objetivo</span>
          </button>
        </div>

        {showNewObjForm && (
          <form
            onSubmit={handleAddObjetivoEspecifico}
            className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Título del Objetivo *</label>
                <input
                  type="text"
                  value={newObj.titulo}
                  onChange={(e) => setNewObj({ ...newObj, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Área</label>
                <select
                  value={newObj.area}
                  onChange={(e) => setNewObj({ ...newObj, area: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="SST">SST</option>
                  <option value="AMBIENTAL">Ambiental</option>
                  <option value="INTEGRAL">Integral</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Meta de la Vigencia</label>
                <input
                  type="text"
                  value={newObj.metaDescripcion}
                  onChange={(e) => setNewObj({ ...newObj, metaDescripcion: e.target.value })}
                  placeholder="Ej. Reducir accidentalidad térmica a cero"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Valor Meta</label>
                <input
                  type="number"
                  value={newObj.metaValor}
                  onChange={(e) => setNewObj({ ...newObj, metaValor: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Responsable</label>
                <select
                  value={newObj.responsable}
                  onChange={(e) => setNewObj({ ...newObj, responsable: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {responsables.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white font-bold hover:bg-[#ea580c] cursor-pointer"
            >
              Guardar Objetivo Específico
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plan.objetivosEspecificos.map((obj) => {
            const indsRelacionados = indicadoresCalculados.filter(
              (i) => i.objetivoEspecificoId === obj.id
            );
            const actsRelacionadas = plan.actividades.filter(
              (a) => a.objetivoEspecificoId === obj.id
            );
            const actsCumplidas = actsRelacionadas.filter((a) => {
              const est = normalizarEstadoEstandar(a.estado);
              return est === 'Cumplido' || est === 'Aprobado';
            }).length;

            return (
              <div
                key={obj.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-black font-mono text-[10px]">
                      {obj.codigo}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          obj.area === 'SST'
                            ? 'bg-blue-100 text-blue-800'
                            : obj.area === 'AMBIENTAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {obj.area}
                      </span>
                      {!planCerrado && (
                        <button
                          type="button"
                          onClick={() => handleDeleteObjetivo(obj.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Eliminar objetivo específico"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-900 leading-snug">{obj.titulo}</h4>
                  <p className="text-[11px] text-slate-600">{obj.descripcion}</p>

                  {obj.metas.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Metas:
                      </span>
                      {obj.metas.map((m) => (
                        <div
                          key={m.id}
                          className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-700">{m.descripcion}</span>
                          <span className="font-mono font-black text-[#f97316] shrink-0">
                            {m.valorMeta}
                            {m.unidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Actividades vinculadas:</span>
                    <strong className="text-slate-900">
                      {actsCumplidas}/{actsRelacionadas.length} cumplidas
                    </strong>
                  </div>

                  {/* Riesgos, Estándares e Indicadores conectados */}
                  {(obj.riesgosRelacionadosIds?.length || 0) > 0 && (
                    <div className="text-[10px] text-rose-900">
                      <strong>Riesgos asociados:</strong>{' '}
                      {obj.riesgosRelacionadosIds
                        ?.map((id) => riesgos.find((r) => r.id === id)?.codigo || id)
                        .join(', ')}
                    </div>
                  )}
                  {(obj.estandaresRelacionadosIds?.length || 0) > 0 && (
                    <div className="text-[10px] text-indigo-900">
                      <strong>Estándares mínimos:</strong>{' '}
                      {obj.estandaresRelacionadosIds?.map((n) => `#${n}`).join(', ')}
                    </div>
                  )}

                  {hojasVidaIndicadores.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Indicadores conectados (clic para ver Hoja de Vida):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {hojasVidaIndicadores
                          .filter(
                            (hv) =>
                              obj.indicadoresIds.includes(hv.id) ||
                              hv.objetivoEspecificoId === obj.id ||
                              (obj.indicadoresIds.length === 0 && hv.esNormativo0312 && obj.area !== 'AMBIENTAL')
                          )
                          .slice(0, 6)
                          .map((hv) => (
                            <button
                              key={hv.id}
                              type="button"
                              onClick={() => setHojaVidaModal(hv)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-[#f97316] text-[10px] font-bold text-slate-800 cursor-pointer"
                              title={`Ver hoja de vida de ${hv.nombre}`}
                            >
                              <Eye className="h-2.5 w-2.5 text-[#f97316]" />
                              <span>
                                {hv.codigo}: {hv.nombre.slice(0, 22)}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {indsRelacionados.map((ind) => (
                      <span
                        key={ind.id}
                        className="px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] font-bold text-slate-800"
                      >
                        {ind.codigo}: {ind.resultadoActual}
                        {ind.unidadMedida}
                      </span>
                    ))}
                  </div>

                  {!planCerrado && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditVinculosObjId(editVinculosObjId === obj.id ? null : obj.id)
                      }
                      className="text-[10px] font-bold text-[#f97316] hover:underline cursor-pointer"
                    >
                      {editVinculosObjId === obj.id
                        ? 'Cerrar conexiones'
                        : 'Conectar riesgos, estándares e indicadores'}
                    </button>
                  )}

                  {editVinculosObjId === obj.id && (
                    <div className="mt-2 p-2.5 rounded-xl bg-white border border-orange-200 space-y-2 text-[10px]">
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">
                          Indicadores relacionados (sin duplicar datos):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {hojasVidaIndicadores.map((hv) => {
                            const checked = obj.indicadoresIds.includes(hv.id);
                            return (
                              <button
                                key={hv.id}
                                type="button"
                                onClick={() => {
                                  const nextIds = checked
                                    ? obj.indicadoresIds.filter((i) => i !== hv.id)
                                    : [...obj.indicadoresIds, hv.id];
                                  onUpdatePlan({
                                    ...plan,
                                    objetivosEspecificos: plan.objetivosEspecificos.map((o) =>
                                      o.id === obj.id ? { ...o, indicadoresIds: nextIds } : o
                                    ),
                                  });
                                }}
                                className={`px-2 py-0.5 rounded border cursor-pointer font-bold ${
                                  checked
                                    ? 'bg-[#0f172a] text-white border-[#0f172a]'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {hv.codigo}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {estandares.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-1">
                            Siete Estándares Mínimos relacionados:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {estandares.map((est) => {
                              const current = obj.estandaresRelacionadosIds || [];
                              const checked = current.includes(est.numero);
                              return (
                                <button
                                  key={est.numero}
                                  type="button"
                                  onClick={() => {
                                    const nextEst = checked
                                      ? current.filter((n) => n !== est.numero)
                                      : [...current, est.numero];
                                    onUpdatePlan({
                                      ...plan,
                                      objetivosEspecificos: plan.objetivosEspecificos.map((o) =>
                                        o.id === obj.id
                                          ? { ...o, estandaresRelacionadosIds: nextEst }
                                          : o
                                      ),
                                    });
                                  }}
                                  className={`px-2 py-0.5 rounded border cursor-pointer font-bold ${
                                    checked
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  Est. #{est.numero}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {riesgos.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-1">
                            Riesgos prioritarios (Nivel I y II):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {riesgos
                              .filter((r) => r.interpretacionNR === 'I' || r.interpretacionNR === 'II')
                              .map((r) => {
                                const current = obj.riesgosRelacionadosIds || [];
                                const checked = current.includes(r.id);
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      const nextR = checked
                                        ? current.filter((id) => id !== r.id)
                                        : [...current, r.id];
                                      onUpdatePlan({
                                        ...plan,
                                        objetivosEspecificos: plan.objetivosEspecificos.map((o) =>
                                          o.id === obj.id
                                            ? { ...o, riesgosRelacionadosIds: nextR }
                                            : o
                                        ),
                                      });
                                    }}
                                    className={`px-2 py-0.5 rounded border cursor-pointer font-bold ${
                                      checked
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {r.codigo || r.id}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal rápido para consultar la Hoja de Vida de cualquier Indicador desde un Objetivo */}
      {hojaVidaModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-black text-[10px]">
                  {hojaVidaModal.codigo} · {hojaVidaModal.tipo} · {hojaVidaModal.periodicidad}
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-1">{hojaVidaModal.nombre}</h4>
              </div>
              <button
                type="button"
                onClick={() => setHojaVidaModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-slate-700">
              <strong>Definición:</strong> {hojaVidaModal.definicion}
            </p>
            <p className="font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <strong>Fórmula:</strong> {hojaVidaModal.formula}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Regla de conteo:</strong> {hojaVidaModal.reglaConteo}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>De dónde sale el dato:</strong> {hojaVidaModal.fuenteInformacion}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Meta y Unidad:</strong> {hojaVidaModal.metaTexto} ({hojaVidaModal.unidadMedida})
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Responsable:</strong> {hojaVidaModal.responsable}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* C. INDICADORES DE GESTIÓN (KPI) CON CÁLCULO AUTOMÁTICO */}
      {(mode === 'ambos' || mode === 'indicadores') && (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a]">
                Indicadores de avance y cumplimiento
              </h3>
              <p className="text-[11px] text-slate-500">
                Se calculan solos mirando las tareas terminadas, las pruebas aprobadas, el dinero usado y los riesgos atendidos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewIndForm(!showNewIndForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Nuevo Indicador</span>
          </button>
        </div>

        {showNewIndForm && (
          <form
            onSubmit={handleAddIndicador}
            className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Nombre del Indicador *</label>
                <input
                  type="text"
                  value={newInd.nombre}
                  onChange={(e) => setNewInd({ ...newInd, nombre: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo</label>
                <select
                  value={newInd.tipo}
                  onChange={(e) => setNewInd({ ...newInd, tipo: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
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
                  value={newInd.formula}
                  onChange={(e) => setNewInd({ ...newInd, formula: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Modo de Cálculo</label>
                <select
                  value={newInd.tipoCalculo}
                  onChange={(e) =>
                    setNewInd({ ...newInd, tipoCalculo: e.target.value as TipoCalculoIndicador })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="AUTOMATICO_ACTIVIDADES">Automático: % Actividades Cumplidas</option>
                  <option value="AUTOMATICO_EVIDENCIAS">Automático: % Evidencias Aprobadas</option>
                  <option value="AUTOMATICO_PRESUPUESTO">Automático: % Ejecución Presupuesto</option>
                  <option value="AUTOMATICO_RIESGOS_CRITICOS">Automático: Cobertura Riesgos I/II</option>
                  <option value="MANUAL">Manual (medición externa)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Objetivo Asociado</label>
                <select
                  value={newInd.objetivoEspecificoId}
                  onChange={(e) =>
                    setNewInd({ ...newInd, objetivoEspecificoId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {plan.objetivosEspecificos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo}: {o.titulo.slice(0, 35)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Operador Meta</label>
                <select
                  value={newInd.metaOperador}
                  onChange={(e) => setNewInd({ ...newInd, metaOperador: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value=">=">&gt;= (Mayor o igual)</option>
                  <option value="<=">&lt;= (Menor o igual)</option>
                  <option value="=">= (Igual)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Meta Numérica</label>
                <input
                  type="number"
                  value={newInd.metaValor}
                  onChange={(e) => setNewInd({ ...newInd, metaValor: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Unidad</label>
                <input
                  type="text"
                  value={newInd.unidadMedida}
                  onChange={(e) => setNewInd({ ...newInd, unidadMedida: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Periodicidad</label>
                <select
                  value={newInd.periodicidad}
                  onChange={(e) => setNewInd({ ...newInd, periodicidad: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="MENSUAL">Mensual</option>
                  <option value="TRIMESTRAL">Trimestral</option>
                  <option value="SEMESTRAL">Semestral</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Responsable</label>
                <select
                  value={newInd.responsable}
                  onChange={(e) => setNewInd({ ...newInd, responsable: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  {responsables.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Regla de Conteo (cómo se obtiene el dato)
                </label>
                <input
                  type="text"
                  value={newInd.reglaConteo}
                  onChange={(e) => setNewInd({ ...newInd, reglaConteo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fuente de Información</label>
                <input
                  type="text"
                  value={newInd.fuenteInformacion}
                  onChange={(e) => setNewInd({ ...newInd, fuenteInformacion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
            >
              Guardar Indicador
            </button>
          </form>
        )}

        <div className="space-y-4">
          {indicadoresCalculados.map((ind) => {
            const obj = plan.objetivosEspecificos.find((o) => o.id === ind.objetivoEspecificoId);
            const isAuto = ind.tipoCalculo !== 'MANUAL';

            return (
              <div
                key={ind.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0f172a] text-white font-mono font-black text-[10px]">
                        {ind.codigo}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                        {ind.tipo}
                      </span>
                      {isAuto && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                          <Sparkles className="h-3 w-3" />
                          Cálculo Automático
                        </span>
                      )}
                      {obj && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Objetivo: {obj.codigo}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">{ind.nombre}</h4>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Resultado Actual
                      </span>
                      <span className="text-2xl font-black font-mono text-[#0f172a]">
                        {ind.resultadoActual}
                        {ind.unidadMedida}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 ${
                        ind.estadoCalculado === 'CUMPLE_META'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : ind.estadoCalculado === 'EN_SEGUIMIENTO'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {ind.estadoCalculado === 'CUMPLE_META' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : ind.estadoCalculado === 'EN_SEGUIMIENTO' ? (
                        <Clock className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {ind.estadoCalculado === 'CUMPLE_META'
                        ? 'CUMPLE META'
                        : ind.estadoCalculado === 'EN_SEGUIMIENTO'
                        ? 'EN SEGUIMIENTO'
                        : 'EN RIESGO'}
                    </span>
                    {!planCerrado && (
                      <button
                        type="button"
                        onClick={() => handleDeleteIndicador(ind.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar indicador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ficha técnica resumida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Cómo se calcula:</span>
                    <span className="text-slate-800 font-mono">{ind.formula}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Meta y Qué se cuenta:</span>
                    <span className="text-slate-800">
                      <strong>{ind.metaTexto}</strong> · {ind.reglaConteo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">De dónde sale el dato y cada cuánto:</span>
                    <span className="text-slate-800">
                      {ind.fuenteInformacion} · <strong>{ind.periodicidad}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Encargado y Resultado de hoy:</span>
                    <span className="text-slate-800">
                      {ind.responsable} · <em className="text-indigo-700">{ind.detalleCalculo}</em>
                    </span>
                  </div>
                </div>

                {/* Comportamiento histórico en la vigencia */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-[#f97316]" />
                      Comportamiento {plan.vigencia}:
                    </span>
                    {ind.historicoMediciones.map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded bg-white border border-slate-300 text-[11px] font-mono text-slate-700"
                        title={`Fecha: ${m.fecha}${m.observacion ? ` · ${m.observacion}` : ''}`}
                      >
                        <strong>{m.periodo}:</strong> {m.valor}
                        {ind.unidadMedida}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {medicionIndId === ind.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          value={medicionPeriodo}
                          onChange={(e) => setMedicionPeriodo(e.target.value)}
                          placeholder="Periodo (ej. 2026-Q4)"
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] w-28"
                        />
                        <input
                          type="text"
                          value={medicionObs}
                          onChange={(e) => setMedicionObs(e.target.value)}
                          placeholder="Observación"
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] w-36"
                        />
                        <button
                          type="button"
                          onClick={() => handleRegistrarMedicionSnapshot(ind)}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Guardar Corte
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMedicionIndId(ind.id)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-[11px] hover:bg-slate-100 cursor-pointer"
                      >
                        + Registrar Corte del Periodo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};
