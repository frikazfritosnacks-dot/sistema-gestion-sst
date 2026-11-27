import React, { useMemo, useState } from 'react';
import type {
  ActividadPlanAnual,
  EvidenciaActividad,
  TrabajadorFichaSST,
} from '../../types/planAnual';
import type {
  ActividadPrimerosAuxiliosBrigada,
  EstadoPrimerosAuxilios,
  TipoActividadPrimerosAuxilios,
} from '../../types/planAnualMejoraEmergencias';
import { CARGOS_OFICIALES_NOMBRES } from '../../data/cargosOficiales';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  ExternalLink,
  HeartPulse,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';

interface PlanAnualEmergenciasPrimerosAuxiliosPanelProps {
  actividades: ActividadPrimerosAuxiliosBrigada[];
  trabajadores?: TrabajadorFichaSST[];
  actividadesPlan?: ActividadPlanAnual[];
  onAbrirActividadPlan?: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onSaveActividades: (
    next: ActividadPrimerosAuxiliosBrigada[],
    auditDetail?: string
  ) => void;
}

const TIPOS_ACTIVIDAD_PA: TipoActividadPrimerosAuxilios[] = [
  'Capacitación en primeros auxilios',
  'Atención inicial de lesiones',
  'Valoración básica de una persona afectada',
  'Activación de la ruta de atención',
  'Práctica de respuesta ante emergencias',
  'Otra actividad de brigada',
];

const ESTADOS_PA: EstadoPrimerosAuxilios[] = ['Pendiente', 'En proceso', 'Realizada'];

function badgeEstadoPA(estado: EstadoPrimerosAuxilios): string {
  if (estado === 'Realizada') {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  }
  if (estado === 'En proceso') {
    return 'bg-sky-100 text-sky-900 border-sky-300';
  }
  return 'bg-amber-100 text-amber-900 border-amber-300';
}

export const PlanAnualEmergenciasPrimerosAuxiliosPanel: React.FC<
  PlanAnualEmergenciasPrimerosAuxiliosPanelProps
> = ({
  actividades,
  trabajadores = [],
  actividadesPlan = [],
  onAbrirActividadPlan,
  onSaveActividades,
}) => {
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoPrimerosAuxilios>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [avisoValidacionId, setAvisoValidacionId] = useState<string | null>(null);

  // Campos del formulario
  const [tipoActividad, setTipoActividad] = useState<TipoActividadPrimerosAuxilios>(
    'Capacitación en primeros auxilios'
  );
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('2027-07-15');
  const [fechaRealizacion, setFechaRealizacion] = useState('');
  const [responsable, setResponsable] = useState<string>(CARGOS_OFICIALES_NOMBRES[1] || 'Operario de selección');
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [participantesNotas, setParticipantesNotas] = useState('');
  const [estado, setEstado] = useState<EstadoPrimerosAuxilios>('Pendiente');
  const [observaciones, setObservaciones] = useState('');
  const [evidencias, setEvidencias] = useState<EvidenciaActividad[]>([]);
  const [actividadPlanAnualId, setActividadPlanAnualId] = useState('');

  // Estado temporal para subir archivo dentro del editor
  const [evDescTemp, setEvDescTemp] = useState('');

  const resumen = useMemo(() => {
    const total = actividades.length;
    const realizadas = actividades.filter((a) => a.estado === 'Realizada').length;
    const enProceso = actividades.filter((a) => a.estado === 'En proceso').length;
    const pendientes = actividades.filter((a) => a.estado === 'Pendiente').length;
    return { total, realizadas, enProceso, pendientes };
  }, [actividades]);

  const actividadesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return actividades.filter((a) => {
      if (filtroEstado !== 'TODAS' && a.estado !== filtroEstado) return false;
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        a.tipoActividad.toLowerCase().includes(q) ||
        a.objetivo.toLowerCase().includes(q) ||
        a.responsable.toLowerCase().includes(q)
      );
    });
  }, [actividades, filtroEstado, busqueda]);

  const abrirNuevo = () => {
    setEditId(null);
    setErrorForm(null);
    setTipoActividad('Capacitación en primeros auxilios');
    setNombre('');
    setObjetivo('');
    setDescripcion('');
    setFechaProgramada('2027-07-15');
    setFechaRealizacion('');
    setResponsable(CARGOS_OFICIALES_NOMBRES[1] || 'Operario de selección');
    setParticipantes([]);
    setParticipantesNotas('');
    setEstado('Pendiente');
    setObservaciones('');
    setEvidencias([]);
    setActividadPlanAnualId('');
    setEvDescTemp('');
    setEditorAbierto(true);
  };

  const abrirEditar = (act: ActividadPrimerosAuxiliosBrigada) => {
    setEditId(act.id);
    setErrorForm(null);
    setTipoActividad(act.tipoActividad);
    setNombre(act.nombre);
    setObjetivo(act.objetivo);
    setDescripcion(act.descripcion);
    setFechaProgramada(act.fechaProgramada);
    setFechaRealizacion(act.fechaRealizacion);
    setResponsable(act.responsable);
    setParticipantes(act.participantes || []);
    setParticipantesNotas(act.participantesNotas || '');
    setEstado(act.estado);
    setObservaciones(act.observaciones);
    setEvidencias(act.evidencias || []);
    setActividadPlanAnualId(act.actividadPlanAnualId || '');
    setEvDescTemp('');
    setEditorAbierto(true);
  };

  const toggleParticipante = (nombreTrab: string) => {
    setParticipantes((prev) =>
      prev.includes(nombreTrab)
        ? prev.filter((n) => n !== nombreTrab)
        : [...prev, nombreTrab]
    );
  };

  const handleAdjuntarEvidenciaForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hoy = new Date().toISOString().split('T')[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      const ext = file.name.toLowerCase();
      const tipoSoporte: EvidenciaActividad['tipoSoporte'] = ext.endsWith('.pdf')
        ? 'PDF'
        : ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')
        ? 'IMAGEN'
        : ext.endsWith('.xlsx') || ext.endsWith('.xls')
        ? 'EXCEL'
        : 'ACTA';
      const nueva: EvidenciaActividad = {
        id: `ev-pa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nombreArchivo: file.name,
        tipoSoporte,
        descripcionSoporte:
          evDescTemp.trim() || 'Evidencia de actividad de Primeros Auxilios (Brigada de Emergencias).',
        archivoDataUrl: dataUrl,
        fechaCarga: hoy,
        cargadoPor: responsable || 'Brigada SST Frikaz S.A.S.',
        estadoRevision: 'PENDIENTE_REVISION',
      };
      setEvidencias((prev) => [nueva, ...prev]);
      setEvDescTemp('');
      setErrorForm(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEliminarEvidenciaForm = (evId: string) => {
    const nextEvs = evidencias.filter((x) => x.id !== evId);
    setEvidencias(nextEvs);
    if (estado === 'Realizada' && nextEvs.length === 0) {
      setEstado('En proceso');
      setErrorForm(
        'Al retirar la última evidencia, el estado pasó a "En proceso" porque una actividad Realizada requiere al menos un soporte adjunto.'
      );
    }
  };

  const handleGuardarActividad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorForm('Por favor escribe el nombre de la actividad de primeros auxilios.');
      return;
    }
    if (!objetivo.trim()) {
      setErrorForm('Por favor registra el objetivo de la actividad.');
      return;
    }
    if (!descripcion.trim()) {
      setErrorForm('Por favor registra la descripción de la actividad.');
      return;
    }
    if (!fechaProgramada.trim()) {
      setErrorForm('Por favor define la fecha programada.');
      return;
    }
    if (!responsable.trim()) {
      setErrorForm('Por favor selecciona o indica el responsable.');
      return;
    }

    // Regla estricta: NO marcar como Realizada sin fecha de realización y al menos una evidencia
    if (estado === 'Realizada') {
      if (!fechaRealizacion.trim() || evidencias.length === 0) {
        setErrorForm(
          'No es posible marcar la actividad como "Realizada" sin registrar la Fecha de realización y adjuntar al menos una evidencia o documento de soporte.'
        );
        return;
      }
    }

    const hoy = new Date().toISOString().split('T')[0];
    const registro: ActividadPrimerosAuxiliosBrigada = {
      id: editId || `pa-brig-${Date.now()}`,
      tipoActividad,
      nombre: nombre.trim(),
      objetivo: objetivo.trim(),
      descripcion: descripcion.trim(),
      fechaProgramada: fechaProgramada.trim(),
      fechaRealizacion: fechaRealizacion.trim(),
      responsable: responsable.trim(),
      participantes,
      participantesNotas: participantesNotas.trim(),
      estado,
      evidencias,
      observaciones: observaciones.trim(),
      actividadPlanAnualId: actividadPlanAnualId || undefined,
      indicadorCodigo: 'IND-EMG-PA',
      fechaCreacion: editId
        ? actividades.find((a) => a.id === editId)?.fechaCreacion || hoy
        : hoy,
      fechaUltimaActualizacion: hoy,
    };

    const nextLista = editId
      ? actividades.map((a) => (a.id === editId ? registro : a))
      : [registro, ...actividades];

    onSaveActividades(
      nextLista,
      `${editId ? 'Actualizada' : 'Registrada'} actividad de Primeros Auxilios (Brigada): ${registro.nombre} [${registro.estado}]`
    );
    setEditorAbierto(false);
    setEditId(null);
    setErrorForm(null);
  };

  const handleCambioRapidoEstado = (
    act: ActividadPrimerosAuxiliosBrigada,
    nuevoEstado: EstadoPrimerosAuxilios
  ) => {
    if (
      nuevoEstado === 'Realizada' &&
      (!act.fechaRealizacion.trim() || (act.evidencias || []).length === 0)
    ) {
      setAvisoValidacionId(act.id);
      return;
    }
    setAvisoValidacionId(null);
    const hoy = new Date().toISOString().split('T')[0];
    const nextLista = actividades.map((item) =>
      item.id === act.id
        ? { ...item, estado: nuevoEstado, fechaUltimaActualizacion: hoy }
        : item
    );
    onSaveActividades(
      nextLista,
      `Actividad Primeros Auxilios "${act.nombre}" actualizada a "${nuevoEstado}"`
    );
  };

  return (
    <div className="space-y-4">
      {/* Encabezado del componente */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200 font-black text-[10px] uppercase">
                Plan de Emergencias · Brigada de Emergencias
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#eef6f4] text-[#0f5b53] border border-[#cce3dd] font-bold text-[10px]">
                Vinculado a Plan Anual 2027 e Indicadores SST
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-[#0d3b36] flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-600 shrink-0" />
              <span>PRIMEROS AUXILIOS (BRIGADA DE EMERGENCIAS)</span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Organiza capacitaciones en primeros auxilios, atención inicial de lesiones, valoración básica, activación de la ruta de atención y prácticas de respuesta ante emergencias. Ninguna actividad puede marcarse como Realizada sin fecha de realización y evidencia adjunta.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva actividad de primeros auxilios</span>
          </button>
        </div>

        {/* Resumen numérico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#cfe5df] bg-[#f4faf8] p-3">
            <span className="text-[10px] font-bold uppercase text-[#3f6660] block">
              Total programadas
            </span>
            <span className="text-xl font-black font-mono text-[#0d3b36]">{resumen.total}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">
              Pendientes
            </span>
            <span className="text-xl font-black font-mono text-amber-950">{resumen.pendientes}</span>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3">
            <span className="text-[10px] font-bold uppercase text-sky-900 block">
              En proceso
            </span>
            <span className="text-xl font-black font-mono text-sky-950">{resumen.enProceso}</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">
              Realizadas (con soporte)
            </span>
            <span className="text-xl font-black font-mono text-emerald-950">{resumen.realizadas}</span>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#e8f2ef]">
          <div className="flex flex-wrap gap-1.5">
            {(['TODAS', 'Pendiente', 'En proceso', 'Realizada'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstado(est)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition-colors ${
                  filtroEstado === est
                    ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                    : 'bg-[#f4faf8] text-[#173f3a] border-[#cfe5df] hover:bg-[#e5f3ef]'
                }`}
              >
                {est === 'TODAS' ? `Todas (${resumen.total})` : est}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar actividad, objetivo o responsable..."
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Editor / Modal inline para crear o editar actividad */}
      {editorAbierto && (
        <form
          onSubmit={handleGuardarActividad}
          className="rounded-2xl border-2 border-[#0f5b53] bg-white p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#e8f2ef] pb-3">
            <h5 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#f97316]" />
              <span>
                {editId
                  ? 'Editar actividad de Primeros Auxilios (Brigada de Emergencias)'
                  : 'Nueva actividad de Primeros Auxilios (Brigada de Emergencias)'}
              </span>
            </h5>
            <button
              type="button"
              onClick={() => {
                setEditorAbierto(false);
                setErrorForm(null);
              }}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorForm && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-rose-900 font-bold text-[11px] flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorForm}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tipo de actividad de brigada *
              </label>
              <select
                value={tipoActividad}
                onChange={(e) =>
                  setTipoActividad(e.target.value as TipoActividadPrimerosAuxilios)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white font-bold"
              >
                {TIPOS_ACTIVIDAD_PA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nombre de la actividad *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Práctica de atención inicial ante quemaduras en fritura"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Objetivo de la actividad *
            </label>
            <input
              type="text"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Qué busca fortalecer o validar esta actividad en la brigada..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Descripción de la actividad *
            </label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Pasos prácticos, materiales del botiquín, ruta de atención o ejercicio a desarrollar..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fecha programada *
              </label>
              <input
                type="date"
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fecha de realización
              </label>
              <input
                type="date"
                value={fechaRealizacion}
                onChange={(e) => setFechaRealizacion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              />
              {!fechaRealizacion && (
                <span className="text-[10px] text-amber-800 block mt-0.5">
                  Requerida para marcar como Realizada
                </span>
              )}
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Responsable (Cargo oficial) *
              </label>
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              >
                {CARGOS_OFICIALES_NOMBRES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Brigada de Emergencias Frikaz S.A.S.">
                  Brigada de Emergencias Frikaz S.A.S.
                </option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado *</label>
              <select
                value={estado}
                onChange={(e) => {
                  const next = e.target.value as EstadoPrimerosAuxilios;
                  setEstado(next);
                  setErrorForm(null);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white font-bold"
              >
                {ESTADOS_PA.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participantes (trabajadores reales de Frikaz S.A.S.) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-[#0d3b36] text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#0f6b61]" />
                <span>Participantes ({participantes.length} seleccionado(s))</span>
              </span>
              {trabajadores.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setParticipantes(
                        trabajadores
                          .filter((t) => t.estadoLaboral === 'ACTIVO')
                          .map((t) => t.nombreCompleto)
                      )
                    }
                    className="text-[10px] font-bold text-[#0f5b53] hover:underline cursor-pointer"
                  >
                    Seleccionar todos los activos
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantes([])}
                    className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
            {trabajadores.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {trabajadores
                  .filter((t) => t.estadoLaboral === 'ACTIVO')
                  .map((t) => {
                    const checked = participantes.includes(t.nombreCompleto);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipante(t.nombreCompleto)}
                        />
                        <span className="truncate">
                          {t.nombreCompleto}{' '}
                          <span className="text-[10px] text-slate-500">({t.cargoNombre})</span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            )}
            <input
              type="text"
              value={participantesNotas}
              onChange={(e) => setParticipantesNotas(e.target.value)}
              placeholder="Notas adicionales sobre participantes o brigadistas convocados..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
            />
          </div>

          {/* Evidencias o documentos de soporte */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-[#0d3b36] text-xs flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-[#f97316]" />
                <span>Evidencias o documentos de soporte ({evidencias.length})</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Obligatorio adjuntar al menos un soporte para cambiar el estado a Realizada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={evDescTemp}
                onChange={(e) => setEvDescTemp(e.target.value)}
                placeholder="Descripción breve del soporte (ej. Lista de asistencia firmada, fotos práctica)..."
                className="sm:col-span-8 rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
              />
              <label className="sm:col-span-4 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#0f5b53] bg-white hover:bg-[#eef6f4] text-[#0f5b53] font-bold text-xs cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Adjuntar archivo</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx"
                  onChange={handleAdjuntarEvidenciaForm}
                  className="hidden"
                />
              </label>
            </div>

            {evidencias.length === 0 ? (
              <p className="text-[11px] text-amber-800 italic">
                Aún no se han adjuntado evidencias de esta actividad.
              </p>
            ) : (
              <div className="space-y-1.5">
                {evidencias.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{ev.nombreArchivo}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {ev.fechaCarga} · {ev.descripcionSoporte}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ev.archivoDataUrl && (
                        <a
                          href={ev.archivoDataUrl}
                          download={ev.nombreArchivo}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold text-[10px]"
                        >
                          Ver
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEliminarEvidenciaForm(ev.id)}
                        className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Quitar soporte"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Relación opcional con actividad del Plan Anual y Observaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Actividad del Plan Anual 2027 relacionada (opcional)
              </label>
              <select
                value={actividadPlanAnualId}
                onChange={(e) => setActividadPlanAnualId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              >
                <option value="">Sin vínculo directo específico (vinculada al Plan de Emergencias)</option>
                {actividadesPlan.map((ap) => (
                  <option key={ap.id} value={ap.id}>
                    {ap.codigo} · {ap.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Novedades, recomendaciones de la brigada o elementos requeridos..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8f2ef]">
            <button
              type="button"
              onClick={() => {
                setEditorAbierto(false);
                setErrorForm(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0d4a44] text-white font-black cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Guardar actividad de primeros auxilios</span>
            </button>
          </div>
        </form>
      )}

      {/* Listado de actividades */}
      {actividadesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-[#b9dad3] bg-white p-8 text-center text-slate-500">
          No hay actividades de primeros auxilios que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="space-y-3">
          {actividadesFiltradas.map((act) => {
            const linkedPlanAct = act.actividadPlanAnualId
              ? actividadesPlan.find((ap) => ap.id === act.actividadPlanAnualId)
              : undefined;
            const puedeCompletar =
              Boolean(act.fechaRealizacion?.trim()) && (act.evidencias || []).length > 0;

            return (
              <div
                key={act.id}
                className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200 font-bold text-[10px]">
                        {act.tipoActividad}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border font-black text-[10px] ${badgeEstadoPA(
                          act.estado
                        )}`}
                      >
                        {act.estado}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] inline-flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {(act.evidencias || []).length} soporte(s)
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-[#0d3b36]">{act.nombre}</h5>
                    <p className="text-[11px] text-slate-700">
                      <strong>Objetivo:</strong> {act.objetivo}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Descripción:</strong> {act.descripcion}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {ESTADOS_PA.map((est) => {
                      const active = act.estado === est;
                      return (
                        <button
                          key={est}
                          type="button"
                          onClick={() => handleCambioRapidoEstado(act, est)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {est}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => abrirEditar(act)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-[11px] cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Editar / Soportes</span>
                    </button>
                  </div>
                </div>

                {avisoValidacionId === act.id && (
                  <div className="rounded-xl bg-rose-50 border border-rose-300 p-2.5 text-rose-900 font-bold text-[11px] flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      Para marcar esta actividad como «Realizada», primero registra la Fecha de realización y adjunta al menos una evidencia o documento de soporte.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAvisoValidacionId(null);
                        abrirEditar(act);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-700 text-white font-black text-[10px] shrink-0 cursor-pointer"
                    >
                      Registrar ahora
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#e8f2ef] text-[11px]">
                  <div className="rounded-lg bg-[#f4faf8] px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-[#3f6660] flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Fecha programada
                    </span>
                    <span className="font-bold text-[#0d3b36]">
                      {act.fechaProgramada || 'Pendiente de registro'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#f4faf8] px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-[#3f6660] flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Fecha de realización
                    </span>
                    <span
                      className={`font-bold ${
                        act.fechaRealizacion ? 'text-emerald-800' : 'text-amber-800'
                      }`}
                    >
                      {act.fechaRealizacion || 'Pendiente de registro'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#f4faf8] px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-[#3f6660] block">
                      Responsable
                    </span>
                    <span className="font-bold text-[#0d3b36]">{act.responsable}</span>
                  </div>
                  <div className="rounded-lg bg-[#f4faf8] px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-[#3f6660] block">
                      Participantes
                    </span>
                    <span className="font-bold text-[#0d3b36]">
                      {act.participantes && act.participantes.length > 0
                        ? `${act.participantes.length} trabajador(es): ${act.participantes
                            .slice(0, 2)
                            .join(', ')}${act.participantes.length > 2 ? '…' : ''}`
                        : act.participantesNotas || 'Pendiente de registro'}
                    </span>
                  </div>
                </div>

                {(act.observaciones || linkedPlanAct || (act.evidencias || []).length > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div className="space-y-1">
                      {act.observaciones && (
                        <p>
                          <strong>Observaciones:</strong> {act.observaciones}
                        </p>
                      )}
                      {(act.evidencias || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {act.evidencias.map((ev) => (
                            <span
                              key={ev.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              {ev.nombreArchivo}
                              {ev.archivoDataUrl && (
                                <a
                                  href={ev.archivoDataUrl}
                                  download={ev.nombreArchivo}
                                  className="underline ml-1 text-[#0f5b53]"
                                >
                                  Descargar
                                </a>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {linkedPlanAct && onAbrirActividadPlan && (
                      <button
                        type="button"
                        onClick={() => onAbrirActividadPlan(linkedPlanAct, 'datos')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#eef6f4] border border-[#cce3dd] text-[#0f5b53] font-bold text-[10px] hover:bg-[#e1f1ed] cursor-pointer"
                      >
                        <span>Plan Anual: {linkedPlanAct.codigo}</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {!puedeCompletar && act.estado !== 'Realizada' && (
                  <p className="text-[10px] text-slate-500">
                    Requisito para cierre: registrar Fecha de realización y adjuntar evidencia de soporte.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
