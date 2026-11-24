import React, { useState, useMemo } from 'react';
import {
  ActividadPlanAnual,
  AlertaPlanAnual,
  PlanAnualVigencia,
  RegistroNotificacionPlan,
  ResponsablePlanOption,
  TipoAlertaPlan,
} from '../../types/planAnual';
import { sendEmailReal } from '../../services/emailService';
import {
  EstadoEstandarFrikaz,
  ESTADOS_ESTANDAR_FRIKAZ,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../../services/gerenteControlService';
import {
  Bell,
  Mail,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Send,
  History,
  UserCheck,
} from 'lucide-react';

interface PlanAnualAlertasEvidenciasTabProps {
  plan: PlanAnualVigencia;
  alertas: AlertaPlanAnual[];
  responsables: ResponsablePlanOption[];
  mode?: 'evidencias' | 'alertas' | 'ambos';
  onAbrirActividad: (
    act: ActividadPlanAnual,
    initialTab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onUpdatePlan: (updated: PlanAnualVigencia, logAction?: string) => void;
}

export const PlanAnualAlertasEvidenciasTab: React.FC<PlanAnualAlertasEvidenciasTabProps> = ({
  plan,
  alertas,
  responsables,
  mode = 'ambos',
  onAbrirActividad,
  onUpdatePlan,
}) => {
  const [filtroTipo, setFiltroTipo] = useState<TipoAlertaPlan | 'TODAS'>('TODAS');
  const [filtroResp, setFiltroResp] = useState<string>('TODOS');
  const [filtroEstadoEv, setFiltroEstadoEv] = useState<'TODAS' | EstadoEstandarFrikaz>('TODAS');
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [feedbackEnvio, setFeedbackEnvio] = useState<{
    tipo: 'ok' | 'info' | 'err';
    mensaje: string;
  } | null>(null);

  const alertasFiltradas = useMemo(() => {
    return alertas.filter((a) => {
      const mTipo = filtroTipo === 'TODAS' || a.tipo === filtroTipo;
      const mResp = filtroResp === 'TODOS' || a.responsableNombre === filtroResp;
      return mTipo && mResp;
    });
  }, [alertas, filtroTipo, filtroResp]);

  const actividadesParaRevision = useMemo(() => {
    return plan.actividades.filter((a) => {
      const est = normalizarEstadoEstandar(a.estado);
      return (
        est === 'Pendiente de revisión' ||
        est === 'Devuelto para ajustes' ||
        a.evidencias.some(
          (e) => normalizarEstadoEstandar(e.estadoRevision) === 'Pendiente de revisión'
        ) ||
        (est !== 'Cumplido' && est !== 'Aprobado' && a.evidencias.length === 0)
      );
    });
  }, [plan.actividades]);

  const todasLasEvidencias = useMemo(() => {
    const lista = plan.actividades.flatMap((act) =>
      act.evidencias.map((ev) => ({
        ev,
        act,
      }))
    );
    return lista.filter((item) =>
      filtroEstadoEv === 'TODAS'
        ? true
        : normalizarEstadoEstandar(item.ev.estadoRevision) === filtroEstadoEv
    );
  }, [plan.actividades, filtroEstadoEv]);

  const getTipoLabel = (t: TipoAlertaPlan) => {
    switch (t) {
      case 'VENCIDA':
        return 'Tarea Vencida';
      case 'PROXIMA_A_VENCER':
        return 'Por Vencer Pronto';
      case 'RECORDATORIO_PREVENTIVO':
        return 'Recordatorio a Tiempo';
      case 'EVIDENCIA_PENDIENTE_REVISION':
        return 'Prueba por Revisar';
      case 'SIN_EVIDENCIA_SOPORTE':
        return 'Falta Subir Prueba';
      case 'NO_REALIZADA_EN_PERIODO':
        return 'Pasó su Mes sin Cerrar';
    }
  };

  const handleEnviarAvisoCorreo = async (alerta: AlertaPlanAnual) => {
    setEnviandoId(alerta.id);
    setFeedbackEnvio(null);

    const asunto = `[Frikaz S.A.S. - Recordatorio ${plan.vigencia}] ${getTipoLabel(alerta.tipo)}: ${alerta.actividadCodigo} - ${alerta.actividadNombre}`;
    const cuerpo = [
      `Hola ${alerta.responsableNombre}, buen día:`,
      '',
      `Desde el Plan Anual de Seguridad, Salud y Ambiente (${plan.vigencia}) de Frikaz S.A.S. te recordamos con mucho gusto esta tarea pendiente:`,
      `- Tarea: ${alerta.actividadCodigo} · ${alerta.actividadNombre}`,
      `- Qué está pasando: ${alerta.motivo}`,
      `- Fecha límite: ${alerta.fechaLimite}`,
      `- Quién la revisa y aprueba: ${alerta.aprobadorNombre}`,
      `- Qué hacer ahora: ${alerta.accionRecomendada}`,
      '',
      'Cuando la termines, por favor entra al módulo independiente PLAN ANUAL y sube la foto, acta o certificado de respaldo.',
      '¡Muchas gracias por cuidarte y cuidar a tus compañeros!',
    ].join('\n');

    const resp = await sendEmailReal({
      to: alerta.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
      subject: asunto,
      text: cuerpo,
      tipoNotificacion: alerta.tipo,
      workerName: alerta.responsableNombre,
    });

    const registro: RegistroNotificacionPlan = {
      id: `notif-${Date.now()}`,
      fechaHora: new Date().toISOString(),
      actividadId: alerta.actividadId,
      actividadNombre: `${alerta.actividadCodigo} - ${alerta.actividadNombre}`,
      destinatarioNombre: alerta.responsableNombre,
      destinatarioCorreo: alerta.responsableCorreo || 'frikaz.fritosnacks@gmail.com',
      tipoAlerta: getTipoLabel(alerta.tipo),
      canal: resp.success ? 'CORREO_REAL' : 'SISTEMA',
      estadoEnvio: resp.success
        ? `Enviado (${resp.trackingCode || 'Correo OK'})`
        : `Guardado en bandeja interna (correo externo sin configurar: ${resp.error || 'local'})`,
    };

    onUpdatePlan(
      {
        ...plan,
        notificacionesEnviadas: [registro, ...plan.notificacionesEnviadas],
      },
      `Recordatorio enviado a ${alerta.responsableNombre} (${alerta.actividadCodigo})`
    );

    if (resp.success) {
      setFeedbackEnvio({
        tipo: 'ok',
        mensaje: `Se envió el correo de recordatorio a ${alerta.responsableNombre} (${alerta.responsableCorreo}).`,
      });
    } else {
      setFeedbackEnvio({
        tipo: 'info',
        mensaje: `El aviso quedó guardado en el historial para ${alerta.responsableNombre}. (El envío por correo externo no está conectado en este momento).`,
      });
    }
    setEnviandoId(null);
  };

  return (
    <div className="space-y-6 text-xs">
      {(mode === 'ambos' || mode === 'alertas') && (
        <>
          {/* KPIs de Alertas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                Tareas Vencidas
              </span>
              <span className="text-2xl font-black font-mono text-rose-950">
                {alertas.filter((a) => a.tipo === 'VENCIDA').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                Pruebas por Revisar
              </span>
              <span className="text-2xl font-black font-mono text-amber-950">
                {alertas.filter((a) => a.tipo === 'EVIDENCIA_PENDIENTE_REVISION').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200">
              <span className="text-[10px] font-bold uppercase text-orange-800 block">
                Vencen Pronto (≤ 15 días)
              </span>
              <span className="text-2xl font-black font-mono text-orange-950">
                {alertas.filter((a) => a.tipo === 'PROXIMA_A_VENCER').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Avisos Enviados
              </span>
              <span className="text-2xl font-black font-mono text-slate-900">
                {plan.notificacionesEnviadas.length}
              </span>
            </div>
          </div>

          {feedbackEnvio && (
            <div
              className={`rounded-xl border p-3.5 flex items-center gap-2 font-bold ${
                feedbackEnvio.tipo === 'ok'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>{feedbackEnvio.mensaje}</span>
            </div>
          )}

          {/* A. ALERTAS AUTOMÁTICAS JUSTIFICADAS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#f97316]" />
              <span>Seguimiento a tareas con alerta</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Avisos reales cuando una tarea está por vencer, se venció o espera revisión de Andrea Orjuela – Gerente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="TODAS">Todos los avisos ({alertas.length})</option>
              <option value="VENCIDA">Vencidas</option>
              <option value="EVIDENCIA_PENDIENTE_REVISION">Pruebas por revisar</option>
              <option value="PROXIMA_A_VENCER">Por vencer pronto</option>
              <option value="RECORDATORIO_PREVENTIVO">Recordatorios a tiempo</option>
              <option value="NO_REALIZADA_EN_PERIODO">Pasó su mes sin cerrar</option>
              <option value="SIN_EVIDENCIA_SOPORTE">Falta subir prueba</option>
            </select>

            <select
              value={filtroResp}
              onChange={(e) => setFiltroResp(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="TODOS">Encargado: Todos</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.nombre}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {alertasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center text-emerald-900 space-y-1">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
            <p className="font-bold">¡Todo al día! No hay avisos pendientes con este filtro.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alertasFiltradas.map((al) => {
              const act = plan.actividades.find((a) => a.id === al.actividadId);
              return (
                <div
                  key={al.id}
                  className={`rounded-xl border p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    al.severidad === 'CRITICA'
                      ? 'bg-rose-50/60 border-rose-300'
                      : al.severidad === 'ALTA'
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          al.severidad === 'CRITICA'
                            ? 'bg-rose-600 text-white'
                            : al.severidad === 'ALTA'
                            ? 'bg-[#f97316] text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {getTipoLabel(al.tipo)}
                      </span>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                        {al.actividadCodigo}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Límite: {al.fechaLimite}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900">{al.actividadNombre}</h4>
                    <p className="text-[11px] text-slate-700">{al.motivo}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <span>
                        <strong>Responsable:</strong> {al.responsableNombre}
                      </span>
                      <span>
                        <strong>Aprueba:</strong> {al.aprobadorNombre}
                      </span>
                      <span className="text-indigo-800 font-semibold">
                        → {al.accionRecomendada}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {act && (
                      <button
                        type="button"
                        onClick={() => onAbrirActividad(act, 'evidencias')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        <FileCheck2 className="h-3.5 w-3.5 text-[#fed7aa]" />
                        <span>Subir o Revisar Prueba</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={enviandoId === al.id}
                      onClick={() => handleEnviarAvisoCorreo(al)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold hover:bg-orange-50 hover:border-[#f97316] cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5 text-[#f97316]" />
                      <span>{enviandoId === al.id ? 'Enviando...' : 'Enviar Recordatorio'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        </>
      )}

      {/* B. BANDEJA DE CIERRE CON EVIDENCIA Y REVISIÓN POR APROBADOR */}
      {(mode === 'ambos' || mode === 'evidencias') && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  <span>Revisión y aprobación de evidencias (Gerencia)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verifique las pruebas subidas durante el año {plan.vigencia} y su estado de aprobación por Gerencia.
                </p>
              </div>
              <select
                value={filtroEstadoEv}
                onChange={(e) => setFiltroEstadoEv(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="TODAS">Todas las pruebas</option>
                {ESTADOS_ESTANDAR_FRIKAZ.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>

            {todasLasEvidencias.length === 0 ? (
              <p className="text-slate-500 italic text-center p-4 bg-slate-50 rounded-xl">
                No hay documentos ni fotos subidas con ese filtro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                      <th className="p-2.5">Archivo o Prueba</th>
                      <th className="p-2.5">Tarea</th>
                      <th className="p-2.5">Quién la subió / Fecha</th>
                      <th className="p-2.5">Quién revisa</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 text-right">Abrir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todasLasEvidencias.map(({ ev, act }) => (
                      <tr key={ev.id} className="hover:bg-orange-50/40">
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{ev.nombreArchivo}</p>
                          <p className="text-[10px] text-slate-500">{ev.descripcionSoporte}</p>
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                            {act.codigo}
                          </span>
                          <span className="text-slate-800">{act.nombre}</span>
                        </td>
                        <td className="p-2.5 text-slate-600">
                          <p>{ev.cargadoPor}</p>
                          <p className="font-mono text-[10px]">{ev.fechaCarga}</p>
                        </td>
                        <td className="p-2.5 text-slate-600">{ev.revisadoPor || act.aprobadorNombre}</td>
                        <td className="p-2.5">
                          {(() => {
                            const badgeEv = getBadgeClassesEstadoFrikaz(ev.estadoRevision);
                            return (
                              <span
                                className={`px-2 py-0.5 rounded border font-black text-[10px] ${badgeEv.light}`}
                              >
                                {badgeEv.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onAbrirActividad(act, 'evidencias')}
                            className="px-2.5 py-1 rounded-lg bg-[#0f172a] text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer"
                          >
                            Ver Prueba
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-[#0f172a] flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>Revisión y Cierre de Tareas con Prueba</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Regla importante: ninguna tarea pasa a <strong>Cumplido</strong> si no tiene escrita qué se hizo, su foto o documento adjunto y el visto bueno oficial de Gerencia tras revisar el soporte.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actividadesParaRevision.length === 0 ? (
            <div className="md:col-span-2 p-6 text-center text-slate-500 bg-slate-50 rounded-xl">
              ¡Excelente! Todas las tareas del año {plan.vigencia} ya están cerradas y aprobadas.
            </div>
          ) : (
            actividadesParaRevision.map((act) => {
              const pendientesRev = act.evidencias.filter(
                (e) => normalizarEstadoEstandar(e.estadoRevision) === 'Pendiente de revisión'
              ).length;
              return (
                <div
                  key={act.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0f172a] text-white font-mono font-black text-[10px]">
                        {act.codigo}
                      </span>
                      {pendientesRev > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                          {pendientesRev} prueba(s) por aprobar
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Falta subir foto o soporte
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-900">{act.nombre}</h4>
                    <p className="text-[11px] text-slate-600">
                      <strong>Qué hay que subir:</strong> {act.evidenciaRequerida}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Encargado: {act.responsableNombre} · Revisa: {act.aprobadorNombre}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAbrirActividad(act, 'evidencias')}
                    className={`w-full py-2 rounded-xl font-black inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      pendientesRev > 0
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-[#f97316] text-white hover:bg-[#ea580c]'
                    }`}
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>
                      {pendientesRev > 0
                        ? 'Revisar y Aprobar / Pedir Corrección'
                        : 'Subir Foto o Documento para Cerrar'}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      )}

      {/* C. HISTORIAL DE AVISOS ENVIADOS */}
      {(mode === 'ambos' || mode === 'alertas') && plan.notificacionesEnviadas.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="font-black text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <span>Historial de Recordatorios Enviados ({plan.notificacionesEnviadas.length})</span>
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {plan.notificacionesEnviadas.slice(0, 15).map((n) => (
              <div
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
              >
                <div>
                  <span className="font-bold text-slate-900">{n.destinatarioNombre}</span>{' '}
                  <span className="text-slate-500">({n.tipoAlerta})</span> —{' '}
                  <span className="text-slate-700">{n.actividadNombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-bold">
                    {n.estadoEnvio}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {n.fechaHora.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
