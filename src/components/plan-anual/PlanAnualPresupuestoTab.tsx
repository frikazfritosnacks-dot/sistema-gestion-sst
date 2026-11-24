import React, { useState, useMemo, useEffect } from 'react';
import {
  ActividadPlanAnual,
  AreaPlanAnual,
  PlanAnualVigencia,
} from '../../types/planAnual';
import {
  calcularResumenPresupuestoPlan,
  formatPresupuestoProgramadoLabel,
} from '../../services/planAnualService';
import {
  getBadgeClassesEstadoFrikaz,
  useGerenteAutorizado,
} from '../../services/gerenteControlService';
import {
  DollarSign,
  Search,
  Edit3,
  PieChart,
  ShieldCheck,
  Wallet,
  Info,
  AlertTriangle,
  Save,
  CheckCircle2,
  Percent,
} from 'lucide-react';

interface PlanAnualPresupuestoTabProps {
  plan: PlanAnualVigencia;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    initialTab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onUpdatePresupuestoGeneral?: (monto: number) => void;
  externalSearch?: string;
  navNonce?: number;
}

export const PlanAnualPresupuestoTab: React.FC<PlanAnualPresupuestoTabProps> = ({
  plan,
  onAbrirActividad,
  onUpdatePresupuestoGeneral,
  externalSearch,
  navNonce,
}) => {
  const { esGerente, solicitarAccesoGerente } = useGerenteAutorizado();
  const [busqueda, setBusqueda] = useState(externalSearch || '');
  const [filtroArea, setFiltroArea] = useState<AreaPlanAnual | 'TODAS'>('TODAS');
  const [presupuestoGeneralDraft, setPresupuestoGeneralDraft] = useState<string>(() =>
    String(plan.presupuestoGeneralAprobado || 0)
  );
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    setPresupuestoGeneralDraft(String(plan.presupuestoGeneralAprobado || 0));
  }, [plan.presupuestoGeneralAprobado]);

  useEffect(() => {
    if (navNonce !== undefined && externalSearch !== undefined) {
      setBusqueda(externalSearch);
    }
  }, [navNonce, externalSearch]);

  const actividades = useMemo(() => {
    return plan.actividades.filter((a) => {
      const q = busqueda.trim().toLowerCase();
      const matchQ =
        !q ||
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.responsableNombre.toLowerCase().includes(q) ||
        (a.recursosNecesarios || '').toLowerCase().includes(q);
      const matchArea = filtroArea === 'TODAS' || a.area === filtroArea;
      return matchQ && matchArea;
    });
  }, [plan.actividades, busqueda, filtroArea]);

  const resumenTotal = useMemo(
    () =>
      calcularResumenPresupuestoPlan(
        plan.actividades,
        plan.presupuestoGeneralAprobado || 0
      ),
    [plan.actividades, plan.presupuestoGeneralAprobado]
  );

  const resumenFiltrado = useMemo(
    () =>
      calcularResumenPresupuestoPlan(
        actividades,
        plan.presupuestoGeneralAprobado || 0
      ),
    [actividades, plan.presupuestoGeneralAprobado]
  );

  const porArea = useMemo(() => {
    return (['SST', 'AMBIENTAL', 'INTEGRAL'] as AreaPlanAnual[]).map((area) => {
      const acts = plan.actividades.filter((a) => a.area === area);
      const r = calcularResumenPresupuestoPlan(acts, plan.presupuestoGeneralAprobado || 0);
      return {
        area,
        cantidad: acts.length,
        ...r,
      };
    });
  }, [plan.actividades, plan.presupuestoGeneralAprobado]);

  const handleGuardarPresupuestoGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!onUpdatePresupuestoGeneral) return;
    const cleanNum = Math.max(0, Number(presupuestoGeneralDraft.replace(/[^\d]/g, '')) || 0);
    onUpdatePresupuestoGeneral(cleanNum);
    setPresupuestoGeneralDraft(String(cleanNum));
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3500);
  };

  const draftNumeric = Math.max(0, Number(presupuestoGeneralDraft.replace(/[^\d]/g, '')) || 0);

  return (
    <div className="space-y-5 text-xs">
      {/* BLOQUE EDITABLE: PRESUPUESTO GENERAL 2027 */}
      <form
        onSubmit={handleGuardarPresupuestoGeneral}
        className="rounded-2xl border border-[#8fc0b5] bg-linear-to-r from-[#eaf5f2] via-[#f4faf8] to-white p-5 shadow-xs space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0f6b61] block">
              Control Financiero Oficial · Enero – Diciembre {plan.vigencia}
            </span>
            <h3 className="text-base sm:text-lg font-black text-[#0d3b36]">
              PRESUPUESTO GENERAL {plan.vigencia}
            </h3>
            <p className="text-[11px] text-[#355b56] max-w-2xl">
              Ingrese aquí el presupuesto general anual autorizado para el SG-SST y Gestión Ambiental en {plan.vigencia}. Solo <strong>Andrea Orjuela – Gerente</strong> puede definirlo o modificarlo; inicia en <strong>$0</strong> hasta confirmar el monto real y se distribuye entre las actividades del plan sin duplicar gastos.
            </p>
            {plan.fechaPresupuestoGeneral && (
              <p className="text-[10px] text-[#0f6b61] font-semibold">
                Última actualización: {plan.fechaPresupuestoGeneral} por{' '}
                {plan.presupuestoGeneralActualizadoPor || 'Andrea Orjuela – Gerente'}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 shrink-0">
            <div>
              <label
                htmlFor="presupuesto-general-2027-input"
                className="text-[10px] font-bold uppercase text-[#0d3b36] block mb-1"
              >
                Monto General Aprobado (COP $)
              </label>
              <div className="relative">
                <DollarSign className="h-4 w-4 text-[#0f6b61] absolute left-3 top-2.5" />
                <input
                  id="presupuesto-general-2027-input"
                  type="number"
                  min={0}
                  step={50000}
                  value={presupuestoGeneralDraft}
                  onChange={(e) => setPresupuestoGeneralDraft(e.target.value)}
                  disabled={!esGerente}
                  title={
                    esGerente
                      ? 'Editar Presupuesto General 2027'
                      : 'Solo Andrea Orjuela – Gerente puede editar el presupuesto general'
                  }
                  className="w-full sm:w-56 rounded-xl border border-[#8fc0b5] bg-white pl-9 pr-3 py-2 text-sm font-mono font-black text-[#0d3b36] tabular-nums focus:border-[#0f5b53] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>
              <span className="text-[10px] font-mono text-[#355b56] block mt-0.5 tabular-nums">
                Vista previa: ${draftNumeric.toLocaleString('es-CO')}
              </span>
            </div>

            {esGerente ? (
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Save className="h-4 w-4" />
                <span>Guardar Presupuesto {plan.vigencia}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={solicitarAccesoGerente}
                className="px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Ingresar como Gerente para editar</span>
              </button>
            )}
          </div>
        </div>

        {savedOk && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Presupuesto General {plan.vigencia} actualizado a $
              {resumenTotal.presupuestoGeneral.toLocaleString('es-CO')} y recalculado en todo el Plan Anual.
            </span>
          </div>
        )}

        {resumenTotal.superaPresupuestoGeneral && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[11px] text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Alerta de distribución presupuestal:</strong> La suma asignada a las actividades ($
              {resumenTotal.aprobado.toLocaleString('es-CO')}) supera el Presupuesto General 2027 ($
              {resumenTotal.presupuestoGeneral.toLocaleString('es-CO')}) por{' '}
              <strong className="font-mono">
                +$
                {(resumenTotal.aprobado - resumenTotal.presupuestoGeneral).toLocaleString('es-CO')}
              </strong>
              . Ajuste el presupuesto general o reasigne los montos de las actividades.
            </div>
          </div>
        )}

        {resumenTotal.ejecucionSuperaGeneral && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-[11px] text-rose-950 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Alerta de ejecución presupuestal:</strong> El gasto ejecutado registrado ($
              {resumenTotal.ejecutado.toLocaleString('es-CO')}) excede el Presupuesto General 2027 ($
              {resumenTotal.presupuestoGeneral.toLocaleString('es-CO')}) en{' '}
              <strong className="font-mono">
                +$
                {(resumenTotal.ejecutado - resumenTotal.presupuestoGeneral).toLocaleString('es-CO')}
              </strong>
              .
            </div>
          </div>
        )}
      </form>

      {/* Nota explicativa clara */}
      <div className="rounded-2xl border border-[#b9dad3] bg-[#f4faf8] p-4 flex items-start gap-3 text-[#0d3b36]">
        <Info className="h-4 w-4 text-[#0f6b61] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px]">
          <p className="font-black">
            Control real del presupuesto — Año {plan.vigencia} (sin gastos automáticos al completar actividades)
          </p>
          <p className="text-[#355b56]">
            El presupuesto ejecutado inicia en <strong>$0</strong> y solo cambia cuando se registra un gasto real con soporte. Cada actividad vinculada (planes de mejora por riesgo, plan de emergencias o capacitaciones) consulta este registro único sin duplicar valores.
          </p>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero con los 5 conceptos solicitados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-[#8fc0b5] bg-[#f4faf8] p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#0f6b61] flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Presupuesto General
          </span>
          <span className="text-xl font-black font-mono tabular-nums text-[#0d3b36] block">
            ${resumenTotal.presupuestoGeneral.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-[#355b56] block">
            Autorizado Gerencia {plan.vigencia}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-[#0f6b61]" />
            Distribuido / Asignado
          </span>
          <span
            className={`text-xl font-black font-mono tabular-nums block ${
              resumenTotal.superaPresupuestoGeneral ? 'text-rose-700' : 'text-[#0d3b36]'
            }`}
          >
            ${resumenTotal.aprobado.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Programado est.: ${resumenTotal.programado.toLocaleString('es-CO')}
          </span>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-orange-800 block">
            Presupuesto Ejecutado
          </span>
          <span className="text-xl font-black font-mono tabular-nums text-orange-950 block">
            ${resumenTotal.ejecutado.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-orange-800 block">
            {resumenTotal.ejecutado === 0
              ? 'Inicio en $0 (sin ejecución confirmada)'
              : 'Valor real ejecutado con soporte'}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" />
            Saldo Disponible
          </span>
          <span className="text-xl font-black font-mono tabular-nums text-emerald-900 block">
            ${resumenTotal.saldoDisponible.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-emerald-800 block">
            {resumenTotal.presupuestoGeneral > 0
              ? `Por distribuir: $${resumenTotal.saldoPorDistribuir.toLocaleString('es-CO')}`
              : 'Suma asignada menos ejecutado'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-[#0f6b61]" />
            Ejecución Presupuestal
          </span>
          <span className="text-xl font-black font-mono tabular-nums text-[#0d3b36] block">
            {resumenTotal.porcentajeEjecucion}%
          </span>
          <span className="text-[10px] text-slate-500 block">
            {resumenTotal.conValorProgramadoCount} valoradas · {resumenTotal.pendientesValoracionCount} por valorar
          </span>
        </div>
      </div>

      {/* Distribución por Área */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
            <PieChart className="h-4 w-4 text-[#f97316]" />
            <span>Distribución de presupuesto y recursos por área</span>
          </h3>
          {(busqueda.trim() || filtroArea !== 'TODAS') && (
            <span className="text-[11px] font-mono font-bold text-[#0f6b61] tabular-nums">
              Filtro actual → Asignado: ${resumenFiltrado.aprobado.toLocaleString('es-CO')} · Ejecutado: ${resumenFiltrado.ejecutado.toLocaleString('es-CO')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {porArea.map((item) => (
            <div
              key={item.area}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">{item.area}</span>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  {item.cantidad} actividad(es)
                </span>
              </div>
              <div className="text-[11px] space-y-0.5 font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Programado:</span>
                  <strong className="text-slate-900">${item.programado.toLocaleString('es-CO')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Distribuido / Aprobado:</span>
                  <strong className="text-[#0f6b61]">${item.aprobado.toLocaleString('es-CO')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Ejecutado:</span>
                  <strong className="text-orange-700">${item.ejecutado.toLocaleString('es-CO')}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-600 font-sans">Saldo de área:</span>
                  <strong className="text-emerald-700">
                    ${Math.max(0, item.aprobado - item.ejecutado).toLocaleString('es-CO')}
                  </strong>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {item.pendientesValoracionCount} por valorar · {item.recursosExistentesCount} con recursos propios
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de Presupuesto por Actividad */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#0f172a]">
              Detalle de recursos y presupuesto por actividad ({actividades.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Haga clic en «Actualizar» para definir recursos necesarios, valorar presupuesto programado o que Gerencia apruebe el monto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar tarea, recurso o encargado..."
                className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-60"
              />
            </div>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="TODAS">Área: Todas</option>
              <option value="SST">SST (Seguridad y Salud)</option>
              <option value="AMBIENTAL">Cuidado Ambiental</option>
              <option value="INTEGRAL">SST + Ambiental</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0f172a] text-white uppercase text-[10px] tracking-wider">
                <th className="p-3">Código y Tarea</th>
                <th className="p-3">Recursos Necesarios</th>
                <th className="p-3 text-right">Programado</th>
                <th className="p-3 text-right">Aprobado</th>
                <th className="p-3 text-right">Ejecutado</th>
                <th className="p-3 text-right">Saldo Disp.</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actividades.map((a) => {
                const aprobado = a.presupuestoAprobado || 0;
                const ejecutado = a.gastoEjecutado || 0;
                const saldo = Math.max(0, aprobado - ejecutado);
                const labelProg = formatPresupuestoProgramadoLabel(a);
                return (
                  <tr key={a.id} className="hover:bg-orange-50/40">
                    <td className="p-3 max-w-[260px]">
                      <div className="flex flex-wrap items-center gap-1 mb-0.5">
                        <span className="font-mono font-black text-[10px] text-[#0f172a] bg-slate-100 px-1.5 py-0.5 rounded">
                          {a.codigo}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{a.area}</span>
                        {a.reprogramacionOrigen && (
                          <span className="px-1.5 py-0.5 rounded bg-[#e7f4f1] text-[#0f6b61] font-bold text-[10px]">
                            De {a.reprogramacionOrigen.anioOrigen}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 block">{a.nombre}</span>
                      <span className="text-[10px] text-slate-500">{a.responsableNombre}</span>
                    </td>
                    <td className="p-3 max-w-[220px]">
                      <span className="text-slate-800 block">
                        {a.recursosNecesarios || 'Pendiente de definir recursos'}
                      </span>
                      {a.confirmacionRecursos && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {a.confirmacionRecursos}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          (a.presupuestoEstimado || 0) > 0
                            ? 'text-slate-900'
                            : 'font-sans text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                        }
                      >
                        {labelProg}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#0f6b61] whitespace-nowrap">
                      ${aprobado.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right font-mono text-orange-700 font-bold whitespace-nowrap">
                      ${ejecutado.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                      ${saldo.toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {(() => {
                        const badge = getBadgeClassesEstadoFrikaz(a.estado);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badge.light}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(a, 'datos')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Actualizar</span>
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
  );
};

