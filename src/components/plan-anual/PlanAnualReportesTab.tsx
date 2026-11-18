import React, { useState, useMemo } from 'react';
import {
  AreaPlanAnual,
  IndicadorCalculado,
  PlanAnualVigencia,
  ResponsablePlanOption,
} from '../../types/planAnual';
import { exportarPlanAnualExcel } from '../../services/planAnualService';
import {
  FileSpreadsheet,
  Printer,
  BarChart3,
  Layers,
  Filter,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface PlanAnualReportesTabProps {
  plan: PlanAnualVigencia;
  indicadoresCalculados: IndicadorCalculado[];
  todasLasVigencias: Record<number, PlanAnualVigencia>;
  responsables: ResponsablePlanOption[];
  onSeleccionarVigencia: (anio: number) => void;
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const PlanAnualReportesTab: React.FC<PlanAnualReportesTabProps> = ({
  plan,
  indicadoresCalculados,
  todasLasVigencias,
  responsables,
  onSeleccionarVigencia,
}) => {
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroTrimestre, setFiltroTrimestre] = useState<'TODOS' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('TODOS');
  const [filtroResponsable, setFiltroResponsable] = useState<string>('TODOS');
  const [filtroArea, setFiltroArea] = useState<AreaPlanAnual | 'TODAS'>('TODAS');
  const [exportando, setExportando] = useState(false);

  const mesesTrimestre: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number[]> = {
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12],
  };

  const actividadesFiltradas = useMemo(() => {
    return plan.actividades.filter((a) => {
      const mResp =
        filtroResponsable === 'TODOS' || a.responsableNombre === filtroResponsable;
      const mArea = filtroArea === 'TODAS' || a.area === filtroArea;
      const mMes =
        filtroMes === 'TODOS' || a.programacionMensual.includes(Number(filtroMes));
      const mTrim =
        filtroTrimestre === 'TODOS' ||
        a.programacionMensual.some((m) => mesesTrimestre[filtroTrimestre].includes(m));
      return mResp && mArea && mMes && mTrim;
    });
  }, [plan.actividades, filtroResponsable, filtroArea, filtroMes, filtroTrimestre]);

  const resumen = useMemo(() => {
    const total = actividadesFiltradas.length;
    const cumplidas = actividadesFiltradas.filter((a) => a.estado === 'CUMPLIDA').length;
    const vencidas = actividadesFiltradas.filter((a) => a.estado === 'VENCIDA').length;
    const pendientes = actividadesFiltradas.filter(
      (a) =>
        a.estado === 'PENDIENTE' ||
        a.estado === 'EN_PROCESO' ||
        a.estado === 'REQUIERE_REVISION'
    ).length;
    const recurrentes = actividadesFiltradas.filter((a) => a.esRecurrente).length;
    const pctCumplimiento = total > 0 ? Math.round((cumplidas / total) * 1000) / 10 : 0;

    const presupAsignado = actividadesFiltradas.reduce(
      (acc, a) => acc + (a.presupuestoEstimado || 0),
      0
    );
    const presupEjecutado = actividadesFiltradas.reduce(
      (acc, a) => acc + (a.gastoEjecutado || 0),
      0
    );
    const diferencia = presupAsignado - presupEjecutado;

    const evidenciasAdjuntas = actividadesFiltradas.reduce(
      (acc, a) => acc + a.evidencias.length,
      0
    );
    const evidenciasPendientes = actividadesFiltradas.reduce(
      (acc, a) =>
        acc + a.evidencias.filter((e) => e.estadoRevision === 'PENDIENTE_REVISION').length,
      0
    );
    const evidenciasAprobadas = actividadesFiltradas.reduce(
      (acc, a) => acc + a.evidencias.filter((e) => e.estadoRevision === 'APROBADA').length,
      0
    );

    return {
      total,
      cumplidas,
      vencidas,
      pendientes,
      recurrentes,
      pctCumplimiento,
      presupAsignado,
      presupEjecutado,
      diferencia,
      evidenciasAdjuntas,
      evidenciasPendientes,
      evidenciasAprobadas,
    };
  }, [actividadesFiltradas]);

  const porResponsable = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        programadas: number;
        cumplidas: number;
        pendientes: number;
        vencidas: number;
        presup: number;
        ejec: number;
      }
    >();
    actividadesFiltradas.forEach((a) => {
      const cur = map.get(a.responsableNombre) || {
        nombre: a.responsableNombre,
        programadas: 0,
        cumplidas: 0,
        pendientes: 0,
        vencidas: 0,
        presup: 0,
        ejec: 0,
      };
      cur.programadas += 1;
      if (a.estado === 'CUMPLIDA') cur.cumplidas += 1;
      else if (a.estado === 'VENCIDA') cur.vencidas += 1;
      else cur.pendientes += 1;
      cur.presup += a.presupuestoEstimado || 0;
      cur.ejec += a.gastoEjecutado || 0;
      map.set(a.responsableNombre, cur);
    });
    return Array.from(map.values());
  }, [actividadesFiltradas]);

  const porTrimestre = useMemo(() => {
    return (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
      const meses = mesesTrimestre[q];
      const acts = actividadesFiltradas.filter((a) =>
        a.programacionMensual.some((m) => meses.includes(m))
      );
      const comp = acts.filter((a) => a.estado === 'CUMPLIDA').length;
      const pct = acts.length > 0 ? Math.round((comp / acts.length) * 100) : 0;
      return {
        trimestre: q,
        rango: `${MESES_NOMBRES[meses[0] - 1]} - ${MESES_NOMBRES[meses[2] - 1]}`,
        programadas: acts.length,
        cumplidas: comp,
        pct,
      };
    });
  }, [actividadesFiltradas]);

  const porMes = useMemo(() => {
    return MESES_NOMBRES.map((nombre, idx) => {
      const mesNum = idx + 1;
      const acts = actividadesFiltradas.filter((a) => a.programacionMensual.includes(mesNum));
      const comp = acts.filter((a) => a.estado === 'CUMPLIDA').length;
      const pct = acts.length > 0 ? Math.round((comp / acts.length) * 100) : 0;
      return {
        mes: nombre,
        mesCorto: nombre.slice(0, 3),
        programadas: acts.length,
        cumplidas: comp,
        pct,
      };
    });
  }, [actividadesFiltradas]);

  const vigenciasOrdenadas = useMemo(() => {
    return Object.values(todasLasVigencias).sort((a, b) => a.vigencia - b.vigencia);
  }, [todasLasVigencias]);

  const handleExportExcel = async () => {
    setExportando(true);
    try {
      await exportarPlanAnualExcel(plan, indicadoresCalculados);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Barra de Filtros de Reporte y Exportación */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#f97316]" />
            <h3 className="text-sm font-black text-[#0f172a]">
              Resumen de Avance y Dinero por Mes, Trimestre y Año — {plan.vigencia}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportando}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{exportando ? 'Preparando archivo...' : 'Bajar en Excel (.xlsx)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#fed7aa]" />
              <span>Imprimir o guardar PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Mes: Todos (Ene - Dic)</option>
            {MESES_NOMBRES.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                Mes: {m}
              </option>
            ))}
          </select>

          <select
            value={filtroTrimestre}
            onChange={(e) => setFiltroTrimestre(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Trimestre: Todo el año</option>
            <option value="Q1">Trimestre 1 (Ene - Mar)</option>
            <option value="Q2">Trimestre 2 (Abr - Jun)</option>
            <option value="Q3">Trimestre 3 (Jul - Sep)</option>
            <option value="Q4">Trimestre 4 (Oct - Dic)</option>
          </select>

          <select
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="TODOS">Encargado: Todos</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>

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

      {/* KPIs Resumen del Reporte */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Planeadas</span>
          <span className="text-2xl font-black font-mono text-[#0f172a]">{resumen.total}</span>
          <span className="text-[10px] text-slate-500 block">
            {resumen.recurrentes} se repiten
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Ya hechas</span>
          <span className="text-2xl font-black font-mono text-emerald-950">
            {resumen.cumplidas}
          </span>
          <span className="text-[10px] font-bold text-emerald-700 block">
            {resumen.pctCumplimiento}% cumplido
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Por hacer</span>
          <span className="text-2xl font-black font-mono text-amber-950">
            {resumen.pendientes}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Atrasadas</span>
          <span className="text-2xl font-black font-mono text-rose-950">{resumen.vencidas}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Pruebas (Soportes)</span>
          <span className="text-2xl font-black font-mono text-[#0f172a]">
            {resumen.evidenciasAdjuntas}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {resumen.evidenciasAprobadas} aprob. / {resumen.evidenciasPendientes} por revisar
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0f172a] text-white shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#fed7aa] block">
            Plata Disponible
          </span>
          <span className="text-lg font-black font-mono">
            ${resumen.diferencia.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] text-slate-300 block">
            Gastado: ${resumen.presupEjecutado.toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Cumplimiento por Periodo Trimestral + Por Responsable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#f97316]" />
            <span>Avance por cada trimestre del año ({plan.vigencia})</span>
          </h4>
          <div className="space-y-3">
            {porTrimestre.map((t) => (
              <div key={t.trimestre} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">
                    {t.trimestre} ({t.rango})
                  </span>
                  <span className="font-mono font-bold text-slate-700">
                    {t.cumplidas}/{t.programadas} ({t.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#f97316] h-2.5 rounded-full transition-all"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="font-black text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Tareas y dinero por encargado</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2 pr-2">Encargado</th>
                  <th className="py-2 text-center">Plan.</th>
                  <th className="py-2 text-center">Listas</th>
                  <th className="py-2 text-center">Atras.</th>
                  <th className="py-2 text-right">Separado</th>
                  <th className="py-2 text-right">Gastado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {porResponsable.map((r) => (
                  <tr key={r.nombre}>
                    <td className="py-2 pr-2 font-bold text-slate-800">{r.nombre}</td>
                    <td className="py-2 text-center font-mono">{r.programadas}</td>
                    <td className="py-2 text-center font-mono text-emerald-700 font-bold">
                      {r.cumplidas}
                    </td>
                    <td className="py-2 text-center font-mono text-rose-700 font-bold">
                      {r.vencidas}
                    </td>
                    <td className="py-2 text-right font-mono">
                      ${r.presup.toLocaleString('es-CO')}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-700">
                      ${r.ejec.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cumplimiento Mes a Mes (Enero - Diciembre) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h4 className="font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#0f172a]" />
          <span>Avance mes a mes (Enero - Diciembre {plan.vigencia})</span>
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {porMes.map((m) => (
            <div
              key={m.mes}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center space-y-1"
            >
              <span className="font-black text-slate-800 block text-[11px]">{m.mesCorto}</span>
              <span className="font-mono font-black text-sm text-[#0f172a] block">
                {m.programadas > 0 ? `${m.pct}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {m.cumplidas}/{m.programadas}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resultado consolidado de Indicadores KPI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h4 className="font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
          <span>Resultados de las cuentas de control (Indicadores KPI) — Año {plan.vigencia}</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                <th className="p-2.5">Código</th>
                <th className="p-2.5">Qué se mide</th>
                <th className="p-2.5">Tipo</th>
                <th className="p-2.5">Meta esperada</th>
                <th className="p-2.5 text-right">Resultado hoy</th>
                <th className="p-2.5">Cómo va</th>
                <th className="p-2.5">De dónde sale el dato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicadoresCalculados.map((ind) => (
                <tr key={ind.id}>
                  <td className="p-2.5 font-mono font-black text-[#0f172a]">{ind.codigo}</td>
                  <td className="p-2.5 font-bold text-slate-900">{ind.nombre}</td>
                  <td className="p-2.5">{ind.tipo}</td>
                  <td className="p-2.5 font-mono">{ind.metaTexto}</td>
                  <td className="p-2.5 text-right font-mono font-black text-sm">
                    {ind.resultadoActual}
                    {ind.unidadMedida}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        ind.estadoCalculado === 'CUMPLE_META'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ind.estadoCalculado === 'EN_SEGUIMIENTO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ind.estadoCalculado === 'CUMPLE_META'
                        ? 'Va bien (Cumple)'
                        : ind.estadoCalculado === 'EN_SEGUIMIENTO'
                        ? 'En revisión'
                        : 'Falta mejorar'}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600">{ind.detalleCalculo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparativo Histórico Multianual entre Vigencias */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#f97316]" />
              <span>Comparación entre años (Cada año guardado por separado)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Aquí puede revisar y comparar cómo nos fue cada año sin borrar nada de los planes anteriores.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0f172a] text-white uppercase text-[10px]">
                <th className="p-3">Año</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Grupo Res. 0312</th>
                <th className="p-3 text-center">Tareas</th>
                <th className="p-3 text-center">Listas</th>
                <th className="p-3 text-center">% Cumplido</th>
                <th className="p-3 text-right">Separado</th>
                <th className="p-3 text-right">Gastado</th>
                <th className="p-3 text-right">Abrir año</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vigenciasOrdenadas.map((v) => {
                const tot = v.actividades.length;
                const cump = v.actividades.filter((a) => a.estado === 'CUMPLIDA').length;
                const pct = tot > 0 ? Math.round((cump / tot) * 1000) / 10 : 0;
                const pres = v.actividades.reduce((s, a) => s + (a.presupuestoEstimado || 0), 0);
                const ej = v.actividades.reduce((s, a) => s + (a.gastoEjecutado || 0), 0);
                const esActual = v.vigencia === plan.vigencia;

                return (
                  <tr
                    key={v.id}
                    className={esActual ? 'bg-orange-50/70 font-semibold' : 'hover:bg-slate-50'}
                  >
                    <td className="p-3 font-mono font-black text-sm text-[#0f172a]">
                      {v.vigencia}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                        {v.estadoAprobacion}
                      </span>
                    </td>
                    <td className="p-3">{v.empresaSnapshot.grupoEstandares0312}</td>
                    <td className="p-3 text-center font-mono">{tot}</td>
                    <td className="p-3 text-center font-mono text-emerald-700 font-bold">{cump}</td>
                    <td className="p-3 text-center font-mono font-black">{pct}%</td>
                    <td className="p-3 text-right font-mono">${pres.toLocaleString('es-CO')}</td>
                    <td className="p-3 text-right font-mono">${ej.toLocaleString('es-CO')}</td>
                    <td className="p-3 text-right">
                      {esActual ? (
                        <span className="text-[10px] font-black text-[#f97316]">EN USO</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSeleccionarVigencia(v.vigencia)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                        >
                          Ver {v.vigencia}
                        </button>
                      )}
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
