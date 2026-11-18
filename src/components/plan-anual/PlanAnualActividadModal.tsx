import React, { useState, useEffect } from 'react';
import {
  ActividadPlanAnual,
  AreaPlanAnual,
  EstadoActividadPlan,
  EvidenciaActividad,
  ObjetivoEspecificoPlan,
  PeriodicidadActividad,
  ResponsablePlanOption,
} from '../../types/planAnual';
import {
  X,
  Save,
  Upload,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Calendar,
  DollarSign,
  History,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface PlanAnualActividadModalProps {
  isOpen: boolean;
  actividad: ActividadPlanAnual | null;
  vigencia: number;
  responsables: ResponsablePlanOption[];
  objetivos: ObjetivoEspecificoPlan[];
  initialTab?: 'datos' | 'evidencias' | 'historial';
  onClose: () => void;
  onSave: (act: ActividadPlanAnual) => void;
  onAprobarYCerrar: (
    act: ActividadPlanAnual,
    resultadoActividad: string,
    comentarioRevisor: string
  ) => void;
  onDevolverEvidencia: (
    act: ActividadPlanAnual,
    evidenciaId: string,
    comentarioRevisor: string
  ) => void;
}

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const PlanAnualActividadModal: React.FC<PlanAnualActividadModalProps> = ({
  isOpen,
  actividad,
  vigencia,
  responsables,
  objetivos,
  initialTab = 'datos',
  onClose,
  onSave,
  onAprobarYCerrar,
  onDevolverEvidencia,
}) => {
  const [tab, setTab] = useState<'datos' | 'evidencias' | 'historial'>(initialTab);
  const [form, setForm] = useState<ActividadPlanAnual | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para carga de nueva evidencia
  const [nuevoNombreArchivo, setNuevoNombreArchivo] = useState('');
  const [nuevoTipoSoporte, setNuevoTipoSoporte] = useState<EvidenciaActividad['tipoSoporte']>('PDF');
  const [nuevaDescripcionSoporte, setNuevaDescripcionSoporte] = useState('');
  const [nuevaUrlReferencia, setNuevaUrlReferencia] = useState('');
  const [nuevoArchivoDataUrl, setNuevoArchivoDataUrl] = useState<string | undefined>(undefined);
  const [comentarioRevisor, setComentarioRevisor] = useState('');

  useEffect(() => {
    if (isOpen && actividad) {
      setForm({ ...actividad });
      setTab(initialTab);
      setErrorMsg(null);
      setComentarioRevisor('');
      setNuevoNombreArchivo('');
      setNuevaDescripcionSoporte('');
      setNuevaUrlReferencia('');
      setNuevoArchivoDataUrl(undefined);
    }
  }, [isOpen, actividad, initialTab]);

  if (!isOpen || !form) return null;

  const disponible = (form.presupuestoEstimado || 0) - (form.gastoEjecutado || 0);
  const tieneEvidencias = form.evidencias.length > 0;
  const tieneEvidenciaAprobada = form.evidencias.some((e) => e.estadoRevision === 'APROBADA');

  const handleToggleMes = (mes: number) => {
    const exists = form.programacionMensual.includes(mes);
    const updated = exists
      ? form.programacionMensual.filter((m) => m !== mes)
      : [...form.programacionMensual, mes].sort((a, b) => a - b);
    setForm({ ...form, programacionMensual: updated });
  };

  const handleResponsableChange = (respId: string) => {
    const found = responsables.find((r) => r.id === respId);
    if (!found) return;
    setForm({
      ...form,
      responsableId: found.id,
      responsableNombre: found.nombre,
      responsableCargo: found.cargo,
      responsableCorreo: found.correo,
    });
  };

  const handleAprobadorChange = (aprId: string) => {
    const found = responsables.find((r) => r.id === aprId);
    if (!found) return;
    setForm({
      ...form,
      aprobadorId: found.id,
      aprobadorNombre: found.nombre,
      aprobadorCargo: found.cargo,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNuevoNombreArchivo(file.name);
    if (file.type.includes('image')) setNuevoTipoSoporte('IMAGEN');
    else if (file.type.includes('pdf')) setNuevoTipoSoporte('PDF');
    else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) setNuevoTipoSoporte('EXCEL');

    if (file.size <= 1500000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNuevoArchivoDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdjuntarEvidencia = () => {
    if (!nuevoNombreArchivo.trim() && !nuevaUrlReferencia.trim()) {
      setErrorMsg('Por favor elija un archivo de su equipo o escriba el enlace de la prueba.');
      return;
    }
    if (!nuevaDescripcionSoporte.trim()) {
      setErrorMsg('Cuéntenos en una frase qué muestra esta foto, acta o documento para poder revisarlo.');
      return;
    }

    const nuevaEv: EvidenciaActividad = {
      id: `ev-${Date.now()}`,
      nombreArchivo: nuevoNombreArchivo.trim() || 'Prueba_Digital_Enlace',
      tipoSoporte: nuevoTipoSoporte,
      descripcionSoporte: nuevaDescripcionSoporte.trim(),
      archivoDataUrl: nuevoArchivoDataUrl,
      urlReferencia: nuevaUrlReferencia.trim() || undefined,
      fechaCarga: new Date().toISOString().split('T')[0],
      cargadoPor: form.responsableNombre,
      estadoRevision: 'PENDIENTE_REVISION',
    };

    const actualizado: ActividadPlanAnual = {
      ...form,
      evidencias: [...form.evidencias, nuevaEv],
      estado: form.estado === 'CUMPLIDA' ? 'CUMPLIDA' : 'REQUIERE_REVISION',
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: form.responsableNombre,
          rol: 'Responsable',
          accion: 'EVIDENCIA_ADJUNTADA',
          detalle: `Subió la prueba "${nuevaEv.nombreArchivo}" para que la revise ${form.aprobadorNombre}.`,
        },
        ...form.historialRevisiones,
      ],
    };

    setForm(actualizado);
    onSave(actualizado);
    setNuevoNombreArchivo('');
    setNuevaDescripcionSoporte('');
    setNuevaUrlReferencia('');
    setNuevoArchivoDataUrl(undefined);
    setErrorMsg(null);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.nombre.trim()) {
      setErrorMsg('Escriba el nombre de la tarea antes de guardar.');
      return;
    }

    // Bloqueo estricto de cierre sin evidencia ni resultado
    if (form.estado === 'CUMPLIDA') {
      if (!tieneEvidencias) {
        setErrorMsg(
          `Para marcar esta tarea como Cumplida primero debe subir su prueba. Falta: ${form.evidenciaRequerida || 'Foto, acta o certificado'}. Súbala en la pestaña "2. Pruebas (Evidencias) y Cierre".`
        );
        setTab('evidencias');
        return;
      }
      if (!form.resultadoActividad?.trim()) {
        setErrorMsg(
          'Para marcarla como Cumplida, cuéntenos primero qué se logró y apruebe la prueba en la pestaña "2. Pruebas (Evidencias) y Cierre".'
        );
        setTab('evidencias');
        return;
      }
      if (!tieneEvidenciaAprobada) {
        setErrorMsg(
          `La prueba todavía falta por revisar por ${form.aprobadorNombre}. Use el botón verde "Aprobar Prueba y Cerrar Tarea" en la pestaña de Pruebas.`
        );
        setTab('evidencias');
        return;
      }
    }

    onSave({
      ...form,
      historialRevisiones: [
        {
          id: `hrev-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: form.responsableNombre,
          rol: 'Planificador',
          accion: 'ACTUALIZADA',
          detalle: `Tarea actualizada (Estado: ${form.estado}, Presupuesto: $${form.presupuestoEstimado.toLocaleString('es-CO')}).`,
        },
        ...form.historialRevisiones,
      ],
    });
    onClose();
  };

  const handleEjecutarCierreAprobado = () => {
    setErrorMsg(null);
    if (!tieneEvidencias) {
      setErrorMsg(
        `Falta subir una prueba (foto, acta o documento) para cerrar la tarea. Se pide: ${form.evidenciaRequerida}`
      );
      return;
    }
    if (!form.resultadoActividad || !form.resultadoActividad.trim()) {
      setErrorMsg('Escriba qué se hizo y qué resultado se obtuvo (Paso 1) antes de aprobar y cerrar.');
      return;
    }
    onAprobarYCerrar(
      form,
      form.resultadoActividad.trim(),
      comentarioRevisor.trim() || 'Prueba revisada y aprobada. Cumple con lo acordado.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white border-b-4 border-[#f97316]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-[#fed7aa] text-[#0f172a] font-black font-mono">
                {form.codigo}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-orange-300 font-bold border border-slate-700">
                Vigencia {vigencia}
              </span>
              {form.riesgoCodigo && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 font-bold border border-rose-500/40">
                  Vinculada a Riesgo {form.riesgoCodigo} (Nivel {form.riesgoNivelNR})
                </span>
              )}
              {form.normaOficial && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/40">
                  {form.normaOficial}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1 line-clamp-1">
              {form.nombre || 'Nueva Actividad del Plan Anual'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Internal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('datos')}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              tab === 'datos'
                ? 'bg-[#0f172a] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>1. Datos, Fechas y Presupuesto</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('evidencias')}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              tab === 'evidencias'
                ? 'bg-[#f97316] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>2. Pruebas (Evidencias) y Cierre ({form.evidencias.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('historial')}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              tab === 'historial'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>3. Movimientos Guardados ({form.historialRevisiones.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3.5 text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-bold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {tab === 'datos' && (
            <form id="actividad-plan-form" onSubmit={handleSubmitForm} className="space-y-4">
              {/* Trazabilidad automática si aplica */}
              {(form.riesgoId || form.normaOficial) && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 space-y-1.5">
                  <span className="font-black text-indigo-950 uppercase text-[10px] tracking-wider block">
                    Conectada automáticamente con Peligros y Normas
                  </span>
                  {form.riesgoId && (
                    <div className="text-indigo-900 space-y-0.5">
                      <p>
                        <strong>Peligro GTC 45:</strong> {form.riesgoCodigo} (Nivel{' '}
                        {form.riesgoNivelNR}) · <strong>Puesto:</strong> {form.riesgoCargo} ·{' '}
                        <strong>Área:</strong> {form.riesgoProceso}
                      </p>
                      {form.riesgoMedidasControl && (
                        <p className="text-[11px] text-indigo-800">
                          <strong>Qué hacer para proteger al trabajador:</strong>{' '}
                          {form.riesgoMedidasControl}
                        </p>
                      )}
                    </div>
                  )}
                  {form.normaOficial && (
                    <p className="text-indigo-900">
                      <strong>Norma que la exige:</strong> {form.normaOficial}{' '}
                      {form.normaArticulos ? `(${form.normaArticulos})` : ''}
                    </p>
                  )}
                </div>
              )}

              {/* 1. Nombre, Área, Objetivo, Descripción */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="font-bold text-slate-700 block mb-1">
                    1. Nombre de la Tarea o Actividad *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden"
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Área</label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value as AreaPlanAnual })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="SST">Seguridad y Salud (SST)</option>
                    <option value="AMBIENTAL">Cuidado Ambiental</option>
                    <option value="INTEGRAL">Las dos (SST + Ambiental)</option>
                  </select>
                </div>

                <div className="sm:col-span-12">
                  <label className="font-bold text-slate-700 block mb-1">
                    ¿Qué hay que hacer y cómo se hace? *
                  </label>
                  <textarea
                    rows={2}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden"
                    required
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="font-bold text-slate-700 block mb-1">
                    2. ¿Cómo sabemos que quedó bien hecha? (Criterio para aprobar) *
                  </label>
                  <input
                    type="text"
                    value={form.criterioAceptacion}
                    onChange={(e) => setForm({ ...form, criterioAceptacion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">
                    Meta o Propósito Relacionado
                  </label>
                  <select
                    value={form.objetivoEspecificoId || ''}
                    onChange={(e) =>
                      setForm({ ...form, objetivoEspecificoId: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="">Sin meta específica</option>
                    {objetivos.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo}: {o.titulo.slice(0, 48)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Frecuencia y Fechas */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Calendar className="h-4 w-4 text-[#f97316]" />
                  <span>3. Cada cuánto se hace y Fechas ({vigencia})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">¿Se repite?</label>
                    <select
                      value={form.esRecurrente ? 'RECURRENTE' : 'UNICA'}
                      onChange={(e) => {
                        const rec = e.target.value === 'RECURRENTE';
                        setForm({
                          ...form,
                          esRecurrente: rec,
                          periodicidad: rec && form.periodicidad === 'UNICA' ? 'MENSUAL' : !rec ? 'UNICA' : form.periodicidad,
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                    >
                      <option value="UNICA">Se hace una sola vez</option>
                      <option value="RECURRENTE">Se repite varias veces</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Cada cuánto</label>
                    <select
                      value={form.periodicidad}
                      onChange={(e) => {
                        const p = e.target.value as PeriodicidadActividad;
                        setForm({
                          ...form,
                          periodicidad: p,
                          esRecurrente: p !== 'UNICA',
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                    >
                      <option value="UNICA">Una vez</option>
                      <option value="MENSUAL">Cada mes</option>
                      <option value="BIMESTRAL">Cada 2 meses</option>
                      <option value="TRIMESTRAL">Cada 3 meses</option>
                      <option value="SEMESTRAL">Cada 6 meses</option>
                      <option value="ANUAL">Cada año</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      value={form.fechaInicio}
                      onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Fecha Límite</label>
                    <input
                      type="date"
                      value={form.fechaLimite}
                      onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-600 block mb-1.5">
                    Meses en los que toca hacerla durante el año:
                  </span>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {MESES_CORTOS.map((m, idx) => {
                      const mesNum = idx + 1;
                      const active = form.programacionMensual.includes(mesNum);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleToggleMes(mesNum)}
                          className={`py-1.5 rounded-md font-bold text-[11px] border transition-colors ${
                            active
                              ? 'bg-[#0f172a] text-white border-[#0f172a]'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Responsable y Aprobador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    4. Encargado (quién realiza la tarea)
                  </label>
                  <select
                    value={form.responsableId}
                    onChange={(e) => handleResponsableChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  >
                    {responsables.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} — {r.cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Quien Aprueba (revisa la prueba y cierra la tarea)
                  </label>
                  <select
                    value={form.aprobadorId}
                    onChange={(e) => handleAprobadorChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                  >
                    {responsables.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} — {r.cargo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5, 6 y 7. Presupuesto, Gasto Ejecutado y Estado */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>5 y 6. Dinero Planeado, Gastado y Estado (7)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Presupuesto Separado ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={form.presupuestoEstimado}
                      onChange={(e) =>
                        setForm({ ...form, presupuestoEstimado: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Dinero Gastado ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={form.gastoEjecutado}
                      onChange={(e) =>
                        setForm({ ...form, gastoEjecutado: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">Queda Disponible</span>
                    <div
                      className={`rounded-lg border p-2 text-xs font-mono font-black ${
                        disponible < 0
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      }`}
                    >
                      ${disponible.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">7. Estado</label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value as EstadoActividadPlan })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white font-bold"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_PROCESO">En Marcha</option>
                      <option value="REQUIERE_REVISION">Falta Revisar</option>
                      <option value="VENCIDA">Vencida</option>
                      <option value="CUMPLIDA">Cumplida (necesita prueba aprobada)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 8 y 9. Evidencia requerida y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    8. Prueba o Documento que se Pide para Cerrar
                  </label>
                  <input
                    type="text"
                    value={form.evidenciaRequerida}
                    onChange={(e) => setForm({ ...form, evidenciaRequerida: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    placeholder="Ej. Acta firmada, certificado o fotos..."
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    9. Notas y Novedades
                  </label>
                  <input
                    type="text"
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    placeholder="Anote si pasó algo importante o si falta algo..."
                  />
                </div>
              </div>
            </form>
          )}

          {tab === 'evidencias' && (
            <div className="space-y-5">
              {/* Regla obligatoria de evidencia */}
              {!tieneEvidencias && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950 flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Falta subir la prueba para poder cerrar esta tarea
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Lo que se necesita adjuntar:{' '}
                      <strong>{form.evidenciaRequerida || 'Foto, acta o certificado'}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Paso 1: Resultado de la actividad */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Paso 1. ¿Qué se hizo y qué resultado se logró? *
                </label>
                <textarea
                  rows={2}
                  value={form.resultadoActividad || ''}
                  onChange={(e) => setForm({ ...form, resultadoActividad: e.target.value })}
                  placeholder="Cuéntenos con palabras sencillas qué se realizó en la planta y cómo quedó..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white"
                />
              </div>

              {/* Paso 2: Adjuntar nueva evidencia digital */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-[#f97316]" />
                    <span>Paso 2. Subir Nueva Foto, Acta o Documento</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Las pruebas anteriores siempre quedan guardadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Elegir Archivo (PDF, Foto, Excel)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Nombre del Archivo *
                    </label>
                    <input
                      type="text"
                      value={nuevoNombreArchivo}
                      onChange={(e) => setNuevoNombreArchivo(e.target.value)}
                      placeholder="Ej. Foto_Guantes_2026.pdf"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Tipo</label>
                    <select
                      value={nuevoTipoSoporte}
                      onChange={(e) =>
                        setNuevoTipoSoporte(e.target.value as EvidenciaActividad['tipoSoporte'])
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                    >
                      <option value="PDF">Documento PDF</option>
                      <option value="IMAGEN">Foto / Imagen</option>
                      <option value="ACTA">Acta Firmada</option>
                      <option value="CERTIFICADO">Certificado o Recibo</option>
                      <option value="EXCEL">Hoja Excel</option>
                      <option value="ENLACE">Enlace de Drive o carpeta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      ¿Qué muestra esta prueba? *
                    </label>
                    <input
                      type="text"
                      value={nuevaDescripcionSoporte}
                      onChange={(e) => setNuevaDescripcionSoporte(e.target.value)}
                      placeholder="Explique brevemente qué se ve en el archivo..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">
                      Enlace o link (si aplica)
                    </label>
                    <input
                      type="text"
                      value={nuevaUrlReferencia}
                      onChange={(e) => setNuevaUrlReferencia(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdjuntarEvidencia}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir Prueba y Enviar a Revisión</span>
                </button>
              </div>

              {/* Lista de evidencias cargadas y acciones de aprobación / devolución */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800">
                  Pruebas Subidas ({form.evidencias.length})
                </h4>
                {form.evidencias.length === 0 ? (
                  <p className="text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 text-center">
                    Todavía no se ha subido ninguna foto o documento.
                  </p>
                ) : (
                  form.evidencias.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{ev.nombreArchivo}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                            {ev.tipoSoporte}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              ev.estadoRevision === 'APROBADA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.estadoRevision === 'DEVUELTA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ev.estadoRevision === 'APROBADA'
                              ? 'APROBADA'
                              : ev.estadoRevision === 'DEVUELTA'
                              ? 'PARA CORREGIR'
                              : 'POR REVISAR'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{ev.descripcionSoporte}</p>
                        <p className="text-[10px] text-slate-400">
                          Subido el {ev.fechaCarga} por {ev.cargadoPor}
                          {ev.comentarioRevisor ? ` · Comentario de quien revisó: "${ev.comentarioRevisor}"` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ev.archivoDataUrl && (
                          <a
                            href={ev.archivoDataUrl}
                            download={ev.nombreArchivo}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Ver o Bajar</span>
                          </a>
                        )}
                        {ev.estadoRevision !== 'APROBADA' && form.estado !== 'CUMPLIDA' && (
                          <button
                            type="button"
                            onClick={() => {
                              const motivo =
                                comentarioRevisor.trim() ||
                                'La imagen no se ve clara o falta información. Por favor vuelva a subirla.';
                              onDevolverEvidencia(form, ev.id, motivo);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold hover:bg-rose-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Pedir Corrección</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Paso 3: Revisión y Cierre Definitivo */}
              {form.estado !== 'CUMPLIDA' ? (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-950">
                      Paso 3. Revisión por {form.aprobadorNombre} y Cierre de Tarea
                    </span>
                    {form.esRecurrente && (
                      <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                        Se repite ({form.periodicidad}): al cerrarla se programa la próxima fecha
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={comentarioRevisor}
                    onChange={(e) => setComentarioRevisor(e.target.value)}
                    placeholder="Escriba aquí su visto bueno o qué falta corregir..."
                    className="w-full rounded-lg border border-emerald-300 p-2 text-xs bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEjecutarCierreAprobado}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Aprobar Prueba y Cerrar Tarea</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-black">Tarea Terminada y Aprobada con su Prueba</p>
                    <p className="text-[11px]">
                      Cerrada el: <strong>{form.fechaCierre}</strong> · Aprobada por:{' '}
                      <strong>{form.cerradoPor || form.aprobadorNombre}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Aquí queda anotado todo lo que ha pasado con esta tarea: cuándo se creó, quién subió pruebas, revisiones y aprobaciones:
              </p>
              {form.historialRevisiones.length === 0 ? (
                <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl">
                  Todavía no hay movimientos anotados.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.historialRevisiones.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                          {h.accion}
                        </span>
                        <p className="font-semibold text-slate-900 mt-1">{h.detalle}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {h.usuario} ({h.rol})
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {h.fecha.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100"
          >
            Cancelar / Cerrar
          </button>
          {tab === 'datos' && (
            <button
              type="submit"
              form="actividad-plan-form"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#f97316] text-white text-xs font-black hover:bg-[#ea580c] shadow-xs cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Tarea</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
