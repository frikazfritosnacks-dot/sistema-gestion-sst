import React, { useState, useMemo, useEffect } from 'react';
import {
  AccionMejoraPlan,
  EvidenciaActividad,
  PlanAnualVigencia,
  RecomendacionIntervencion,
  ResponsablePlanOption,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { extraerMedidasRiesgo } from '../../services/planAnualService';
import {
  Wrench,
  Lightbulb,
  ShieldAlert,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  RotateCcw,
  Upload,
  History,
  ArrowRight,
  Save,
  Mail,
} from 'lucide-react';
import {
  esEstadoExclusivoGerente,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
  type EstadoEstandarFrikaz,
} from '../../services/gerenteControlService';

interface PlanAnualActuarTabProps {
  plan: PlanAnualVigencia;
  riesgos: RiesgoGTC45Item[];
  recomendaciones: RecomendacionIntervencion[];
  accionesMejora: AccionMejoraPlan[];
  responsables: ResponsablePlanOption[];
  accesoMedicoAutorizado: boolean;
  onSolicitarDesbloqueoMedico: () => void;
  presetAccion?: {
    origen: AccionMejoraPlan['origen'];
    tipo: AccionMejoraPlan['tipo'];
    situacionEncontrada: string;
    queSeNecesitaCorregir: string;
    actividadARealizar: string;
    riesgoId?: string;
    actividadPlanId?: string;
    estandarNumero?: number;
    recomendacionId?: string;
  } | null;
  onClearPresetAccion: () => void;
  onAddRecomendacion: (rec: RecomendacionIntervencion) => void;
  onSaveAccion: (accion: AccionMejoraPlan) => void;
}

type SubTabActuar = 'acciones' | 'recomendaciones';

export const PlanAnualActuarTab: React.FC<PlanAnualActuarTabProps> = ({
  plan,
  riesgos,
  recomendaciones,
  accionesMejora,
  responsables,
  accesoMedicoAutorizado,
  onSolicitarDesbloqueoMedico,
  presetAccion,
  onClearPresetAccion,
  onAddRecomendacion,
  onSaveAccion,
}) => {
  const [subTab, setSubTab] = useState<SubTabActuar>('acciones');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoEstandarFrikaz>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | AccionMejoraPlan['tipo']>('TODOS');
  const [filtroOrigenAccion, setFiltroOrigenAccion] = useState<'TODOS' | AccionMejoraPlan['origen']>('TODOS');
  const [filtroOrigenRec, setFiltroOrigenRec] = useState<'TODOS' | RecomendacionIntervencion['origen']>('TODOS');
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();

  // Formulario de nueva/edición acción de mejora
  const [showAccionForm, setShowAccionForm] = useState(false);
  const [accionForm, setAccionForm] = useState({
    id: '',
    codigo: '',
    tipo: 'CORRECTIVA' as AccionMejoraPlan['tipo'],
    origen: 'MATRIZ_RIESGOS' as AccionMejoraPlan['origen'],
    situacionEncontrada: '',
    queSeNecesitaCorregir: '',
    actividadARealizar: '',
    responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaLimite: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    evidenciaNecesaria: 'Foto del ajuste terminado, acta firmada o factura.',
    riesgoId: '',
    actividadPlanId: '',
    estandarNumero: '' as string,
    recomendacionId: '',
  });

  // Formulario nueva recomendación
  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState({
    origen: 'VERIFICACION_ACTIVIDADES' as RecomendacionIntervencion['origen'],
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA' as RecomendacionIntervencion['prioridad'],
    esConfidencialMedica: false,
    riesgoId: '',
    estandarNumero: '' as string,
    responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
  });

  // Controles por acción (historial, devolución, evidencia)
  const [historialAbiertoId, setHistorialAbiertoId] = useState<string | null>(null);
  const [devolverId, setDevolverId] = useState<string | null>(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [evidenciaAbiertaId, setEvidenciaAbiertaId] = useState<string | null>(null);
  const [evNombre, setEvNombre] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDataUrl, setEvDataUrl] = useState<string | undefined>(undefined);
  const [seguimientoAbiertoId, setSeguimientoAbiertoId] = useState<string | null>(null);
  const [seguimientoTexto, setSeguimientoTexto] = useState('');
  const [seguimientoEstado, setSeguimientoEstado] = useState<AccionMejoraPlan['estado']>('EN_PROCESO');

  useEffect(() => {
    if (presetAccion) {
      setSubTab('acciones');
      setAccionForm({
        id: '',
        codigo: '',
        tipo: presetAccion.tipo,
        origen: presetAccion.origen,
        situacionEncontrada: presetAccion.situacionEncontrada,
        queSeNecesitaCorregir: presetAccion.queSeNecesitaCorregir,
        actividadARealizar: presetAccion.actividadARealizar,
        responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaLimite: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
        evidenciaNecesaria: 'Foto del ajuste terminado, acta firmada o certificado.',
        riesgoId: presetAccion.riesgoId || '',
        actividadPlanId: presetAccion.actividadPlanId || '',
        estandarNumero: presetAccion.estandarNumero ? String(presetAccion.estandarNumero) : '',
        recomendacionId: presetAccion.recomendacionId || '',
      });
      setShowAccionForm(true);
      onClearPresetAccion();
    }
  }, [presetAccion, onClearPresetAccion, responsables]);

  const accionesFiltradas = useMemo(() => {
    return accionesMejora.filter((a) => {
      const mEstado =
        filtroEstado === 'TODAS' || normalizarEstadoEstandar(a.estado) === filtroEstado;
      const mTipo = filtroTipo === 'TODOS' || a.tipo === filtroTipo;
      const mOrigen = filtroOrigenAccion === 'TODOS' || a.origen === filtroOrigenAccion;
      return mEstado && mTipo && mOrigen;
    });
  }, [accionesMejora, filtroEstado, filtroTipo, filtroOrigenAccion]);

  const recomendacionesFiltradas = useMemo(
    () =>
      recomendaciones.filter(
        (r) => filtroOrigenRec === 'TODOS' || r.origen === filtroOrigenRec
      ),
    [recomendaciones, filtroOrigenRec]
  );

  const handleGuardarAccion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accionForm.situacionEncontrada.trim() || !accionForm.actividadARealizar.trim()) return;

    const hoy = new Date().toISOString().split('T')[0];
    const existente = accionesMejora.find((a) => a.id === accionForm.id);
    const nueva: AccionMejoraPlan = existente
      ? {
          ...existente,
          tipo: accionForm.tipo,
          origen: accionForm.origen,
          situacionEncontrada: accionForm.situacionEncontrada.trim(),
          queSeNecesitaCorregir: accionForm.queSeNecesitaCorregir.trim(),
          actividadARealizar: accionForm.actividadARealizar.trim(),
          responsable: accionForm.responsable,
          fechaInicio: accionForm.fechaInicio,
          fechaLimite: accionForm.fechaLimite,
          evidenciaNecesaria: accionForm.evidenciaNecesaria.trim(),
          riesgoId: accionForm.riesgoId || undefined,
          actividadPlanId: accionForm.actividadPlanId || undefined,
          estandarNumero: accionForm.estandarNumero ? Number(accionForm.estandarNumero) : undefined,
          historial: [
            {
              id: `hm-${Date.now()}`,
              fecha: hoy,
              usuario: accionForm.responsable,
              accion: 'ACTUALIZADA',
              detalle: 'Se actualizaron los datos de la acción de mejora.',
            },
            ...existente.historial,
          ],
        }
      : {
          id: `acm-${Date.now()}`,
          codigo: `ACM-${plan.vigencia}-${String(accionesMejora.length + 1).padStart(2, '0')}`,
          tipo: accionForm.tipo,
          origen: accionForm.origen,
          situacionEncontrada: accionForm.situacionEncontrada.trim(),
          queSeNecesitaCorregir: accionForm.queSeNecesitaCorregir.trim() || accionForm.actividadARealizar.trim(),
          actividadARealizar: accionForm.actividadARealizar.trim(),
          responsable: accionForm.responsable,
          fechaInicio: accionForm.fechaInicio,
          fechaLimite: accionForm.fechaLimite,
          evidenciaNecesaria: accionForm.evidenciaNecesaria.trim(),
          evidenciasAdjuntas: [],
          estado: 'PENDIENTE',
          resultadoSeguimiento: 'Acción creada; pendiente de iniciar ejecución.',
          riesgoId: accionForm.riesgoId || undefined,
          actividadPlanId: accionForm.actividadPlanId || undefined,
          estandarNumero: accionForm.estandarNumero ? Number(accionForm.estandarNumero) : undefined,
          recomendacionId: accionForm.recomendacionId || undefined,
          historial: [
            {
              id: `hm-${Date.now()}`,
              fecha: hoy,
              usuario: accionForm.responsable,
              accion: 'CREADA',
              detalle: `Acción ${accionForm.tipo} creada desde ${accionForm.origen.replace(/_/g, ' ')}.`,
            },
          ],
        };

    onSaveAccion(nueva);
    setShowAccionForm(false);
  };

  const handleAdjuntarEvidenciaAccion = (accion: AccionMejoraPlan) => {
    if (!evNombre.trim()) return;
    const hoy = new Date().toISOString().split('T')[0];
    const nuevaEv: EvidenciaActividad = {
      id: `ev-acm-${Date.now()}`,
      nombreArchivo: evNombre.trim(),
      tipoSoporte: evDataUrl?.startsWith('data:image') ? 'IMAGEN' : 'PDF',
      descripcionSoporte: evDesc.trim() || 'Soporte de ejecución de acción de mejora.',
      archivoDataUrl: evDataUrl,
      fechaCarga: hoy,
      cargadoPor: accion.responsable,
      estadoRevision: 'PENDIENTE_REVISION',
    };
    onSaveAccion({
      ...accion,
      estado: accion.estado === 'PENDIENTE' ? 'EN_PROCESO' : accion.estado,
      evidenciasAdjuntas: [...accion.evidenciasAdjuntas, nuevaEv],
      historial: [
        {
          id: `hm-${Date.now()}`,
          fecha: hoy,
          usuario: accion.responsable,
          accion: 'EVIDENCIA_ADJUNTADA',
          detalle: `Se subió el soporte "${nuevaEv.nombreArchivo}".`,
        },
        ...accion.historial,
      ],
    });
    setEvidenciaAbiertaId(null);
    setEvNombre('');
    setEvDesc('');
    setEvDataUrl(undefined);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Encabezado y pestañas de ACTUAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0f172a]">
              Acciones de Mejora, Preventivas y Correctivas
            </h3>
            <p className="text-[11px] text-slate-500">
              Registre situaciones que necesitan corrección, defina acciones preventivas, correctivas y de mejora, y haga seguimiento a responsables y fechas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAccionForm({
                id: '',
                codigo: '',
                tipo: 'CORRECTIVA',
                origen: 'MATRIZ_RIESGOS',
                situacionEncontrada: '',
                queSeNecesitaCorregir: '',
                actividadARealizar: '',
                responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
                fechaInicio: new Date().toISOString().split('T')[0],
                fechaLimite: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
                evidenciaNecesaria: 'Foto del ajuste terminado, acta firmada o factura.',
                riesgoId: '',
                actividadPlanId: '',
                estandarNumero: '',
                recomendacionId: '',
              });
              setSubTab('acciones');
              setShowAccionForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva acción de mejora</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSubTab('acciones')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center justify-between border cursor-pointer ${
              subTab === 'acciones'
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-[#f97316]" />
              <span>Acciones preventivas, correctivas y de mejora</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-white/90 text-slate-900 font-mono tabular-nums text-[10px]">
              {accionesMejora.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('recomendaciones')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center justify-between border cursor-pointer ${
              subTab === 'recomendaciones'
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-[#f97316]" />
              <span>Situaciones que necesitan corrección</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-white/90 text-slate-900 font-mono tabular-nums text-[10px]">
              {recomendaciones.length}
            </span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* A. RECOMENDACIONES Y PRIORIDADES DE INTERVENCIÓN                    */}
      {/* =================================================================== */}
      {subTab === 'recomendaciones' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroOrigenRec}
                onChange={(e) => setFiltroOrigenRec(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 bg-white font-bold"
              >
                <option value="TODOS">Todos los orígenes</option>
                <option value="EVALUACIONES_MEDICAS">Evaluaciones médicas</option>
                <option value="CONDICIONES_SALUD">Condiciones de salud</option>
                <option value="MATRIZ_RIESGOS">Matriz de riesgos</option>
                <option value="INDICADORES">Indicadores</option>
                <option value="VERIFICACION_ACTIVIDADES">Verificación de actividades</option>
                <option value="ESTANDARES_MINIMOS">Siete estándares mínimos</option>
              </select>
              {!accesoMedicoAutorizado && (
                <button
                  type="button"
                  onClick={onSolicitarDesbloqueoMedico}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Desbloquear recomendaciones médicas confidenciales</span>
                </button>
              )}
              {accesoMedicoAutorizado && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold inline-flex items-center gap-1">
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Salud Ocupacional activa</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowRecForm(!showRecForm)}
              className="px-3.5 py-2 rounded-xl bg-[#0f172a] text-white font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Recomendación</span>
            </button>
          </div>

          {showRecForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!recForm.titulo.trim()) return;
                onAddRecomendacion({
                  id: `rec-${Date.now()}`,
                  fecha: new Date().toISOString().split('T')[0],
                  origen: recForm.origen,
                  titulo: recForm.titulo.trim(),
                  descripcion: recForm.descripcion.trim() || recForm.titulo.trim(),
                  prioridad: recForm.prioridad,
                  esConfidencialMedica: recForm.esConfidencialMedica,
                  riesgoId: recForm.riesgoId || undefined,
                  estandarNumero: recForm.estandarNumero ? Number(recForm.estandarNumero) : undefined,
                  responsable: recForm.responsable,
                  estado: 'ABIERTA',
                });
                setShowRecForm(false);
                setRecForm({
                  origen: 'VERIFICACION_ACTIVIDADES',
                  titulo: '',
                  descripcion: '',
                  prioridad: 'MEDIA',
                  esConfidencialMedica: false,
                  riesgoId: '',
                  estandarNumero: '',
                  responsable: responsables[0]?.nombre || 'Coordinador / Vigía de SST',
                });
              }}
              className="rounded-2xl border border-orange-300 bg-orange-50/40 p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">De dónde proviene</label>
                  <select
                    value={recForm.origen}
                    onChange={(e) => setRecForm({ ...recForm, origen: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="EVALUACIONES_MEDICAS">Evaluaciones médicas</option>
                    <option value="CONDICIONES_SALUD">Condiciones de salud</option>
                    <option value="MATRIZ_RIESGOS">Matriz de riesgos GTC 45</option>
                    <option value="INDICADORES">Indicadores SST</option>
                    <option value="VERIFICACION_ACTIVIDADES">Verificación de actividades</option>
                    <option value="ESTANDARES_MINIMOS">Siete estándares mínimos</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioridad</label>
                  <select
                    value={recForm.prioridad}
                    onChange={(e) => setRecForm({ ...recForm, prioridad: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="ALTA">Alta (urgente)</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Responsable</label>
                  <select
                    value={recForm.responsable}
                    onChange={(e) => setRecForm({ ...recForm, responsable: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    {responsables.map((r) => (
                      <option key={r.id} value={r.nombre}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={recForm.titulo}
                onChange={(e) => setRecForm({ ...recForm, titulo: e.target.value })}
                placeholder="Título claro de la recomendación..."
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                required
              />
              <textarea
                rows={2}
                value={recForm.descripcion}
                onChange={(e) => setRecForm({ ...recForm, descripcion: e.target.value })}
                placeholder="Explique qué se recomienda hacer..."
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recForm.esConfidencialMedica}
                    onChange={(e) =>
                      setRecForm({ ...recForm, esConfidencialMedica: e.target.checked })
                    }
                  />
                  <span>Contiene información médica individual (proteger con reserva médica)</span>
                </label>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                >
                  Guardar Recomendación
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {recomendacionesFiltradas.map((rec) => {
              const oculta = rec.esConfidencialMedica && !accesoMedicoAutorizado;
              return (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          rec.prioridad === 'ALTA'
                            ? 'bg-rose-100 text-rose-800'
                            : rec.prioridad === 'MEDIA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        Prioridad {rec.prioridad}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {rec.origen.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{rec.fecha}</span>
                    </div>

                    {oculta ? (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2 mt-1">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>
                          Recomendación derivada de historia/examen médico individual. Protegida por confidencialidad médica; desbloquee Salud Ocupacional para leer el detalle.
                        </span>
                      </div>
                    ) : (
                      <>
                        <h5 className="font-black text-slate-900 text-sm">{rec.titulo}</h5>
                        <p className="text-[11px] text-slate-600">{rec.descripcion}</p>
                      </>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Responsable sugerido: <strong>{rec.responsable}</strong> · Estado: {rec.estado}
                    </p>
                  </div>

                  {!oculta && rec.estado === 'ABIERTA' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubTab('acciones');
                        setAccionForm({
                          id: '',
                          codigo: '',
                          tipo: rec.prioridad === 'ALTA' ? 'CORRECTIVA' : 'PREVENTIVA',
                          origen:
                            rec.origen === 'MATRIZ_RIESGOS'
                              ? 'MATRIZ_RIESGOS'
                              : rec.origen === 'ESTANDARES_MINIMOS'
                              ? 'ESTANDARES_MINIMOS'
                              : 'CONDICIONES_SALUD',
                          situacionEncontrada: rec.titulo,
                          queSeNecesitaCorregir: rec.descripcion,
                          actividadARealizar: rec.descripcion,
                          responsable: rec.responsable,
                          fechaInicio: new Date().toISOString().split('T')[0],
                          fechaLimite: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
                          evidenciaNecesaria: 'Soporte fotográfico, acta o constancia de cumplimiento.',
                          riesgoId: rec.riesgoId || '',
                          actividadPlanId: '',
                          estandarNumero: rec.estandarNumero ? String(rec.estandarNumero) : '',
                          recomendacionId: rec.id,
                        });
                        setShowAccionForm(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Convertir en Acción</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* B, C, D. ACCIONES DE MEJORA, RIESGOS CONECTADOS Y SEGUIMIENTO       */}
      {/* =================================================================== */}
      {subTab === 'acciones' && (
        <div className="space-y-4">
          {/* Formulario crear/editar acción de mejora */}
          {showAccionForm && (
            <form
              onSubmit={handleGuardarAccion}
              className="rounded-2xl border-2 border-[#f97316] bg-white p-5 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-black text-[#0f172a]">
                  {accionForm.id ? `Editar ${accionForm.codigo}` : 'Registrar Nueva Acción de Mejora'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAccionForm(false)}
                  className="text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de acción</label>
                  <select
                    value={accionForm.tipo}
                    onChange={(e) => setAccionForm({ ...accionForm, tipo: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="CORRECTIVA">Correctiva (corregir falla)</option>
                    <option value="PREVENTIVA">Preventiva (evitar que pase)</option>
                    <option value="MEJORA">De mejora (hacerlo mejor)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">De dónde nace</label>
                  <select
                    value={accionForm.origen}
                    onChange={(e) => setAccionForm({ ...accionForm, origen: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="MATRIZ_RIESGOS">Matriz de Riesgos GTC 45</option>
                    <option value="INDICADORES">Indicadores SST</option>
                    <option value="ESTANDARES_MINIMOS">Siete Estándares Mínimos</option>
                    <option value="CONDICIONES_SALUD">Condiciones de Salud</option>
                    <option value="ACTIVIDAD_PLAN">Actividad del Plan Anual</option>
                    <option value="MANUAL">Hallazgo en planta / Manual</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Responsable</label>
                  <select
                    value={accionForm.responsable}
                    onChange={(e) => setAccionForm({ ...accionForm, responsable: e.target.value })}
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
                  <label className="font-bold text-slate-700 block mb-1">Estándar Mínimo (opcional)</label>
                  <select
                    value={accionForm.estandarNumero}
                    onChange={(e) => setAccionForm({ ...accionForm, estandarNumero: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="">Ninguno / General</option>
                    <option value="1">1. Asignación diseñador SG-SST</option>
                    <option value="2">2. Seguridad Social Integral</option>
                    <option value="3">3. Capacitación SST</option>
                    <option value="4">4. Plan Anual de Trabajo</option>
                    <option value="5">5. Evaluaciones Médicas</option>
                    <option value="6">6. Matriz de Peligros</option>
                    <option value="7">7. Medidas de Prevención</option>
                  </select>
                </div>
              </div>

              {/* Relación directa con la Matriz de Riesgos existente sin duplicarla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Conectar con Riesgo de la Matriz GTC 45 (sin volver a digitarlo)
                  </label>
                  <select
                    value={accionForm.riesgoId}
                    onChange={(e) => setAccionForm({ ...accionForm, riesgoId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="">Sin vínculo directo a un riesgo específico</option>
                    {riesgos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.codigo || r.id} (Nivel {r.interpretacionNR}) — {r.cargo || r.cargosExpuestos}:{' '}
                        {r.peligroDescripcion.slice(0, 65)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Conectar con Actividad del Plan Anual (opcional)
                  </label>
                  <select
                    value={accionForm.actividadPlanId}
                    onChange={(e) =>
                      setAccionForm({ ...accionForm, actividadPlanId: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="">Ninguna</option>
                    {plan.actividades.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo}: {a.nombre.slice(0, 65)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Situación encontrada *</label>
                  <textarea
                    rows={2}
                    value={accionForm.situacionEncontrada}
                    onChange={(e) =>
                      setAccionForm({ ...accionForm, situacionEncontrada: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Qué se necesita corregir o mejorar *
                  </label>
                  <textarea
                    rows={2}
                    value={accionForm.queSeNecesitaCorregir}
                    onChange={(e) =>
                      setAccionForm({ ...accionForm, queSeNecesitaCorregir: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Actividad que se realizará *</label>
                  <textarea
                    rows={2}
                    value={accionForm.actividadARealizar}
                    onChange={(e) =>
                      setAccionForm({ ...accionForm, actividadARealizar: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de inicio</label>
                  <input
                    type="date"
                    value={accionForm.fechaInicio}
                    onChange={(e) => setAccionForm({ ...accionForm, fechaInicio: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha límite</label>
                  <input
                    type="date"
                    value={accionForm.fechaLimite}
                    onChange={(e) => setAccionForm({ ...accionForm, fechaLimite: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Evidencia necesaria</label>
                  <input
                    type="text"
                    value={accionForm.evidenciaNecesaria}
                    onChange={(e) =>
                      setAccionForm({ ...accionForm, evidenciaNecesaria: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccionForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Acción de Mejora</span>
                </button>
              </div>
            </form>
          )}

          {/* Filtros de estado (6 estados estándar) y origen */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'TODAS', label: `Todas (${accionesMejora.length})` },
                  { id: 'Por hacer', label: 'Por hacer' },
                  { id: 'En proceso', label: 'En proceso' },
                  { id: 'Pendiente de revisión', label: 'Pendiente de revisión' },
                  { id: 'Devuelto para ajustes', label: 'Devuelto para ajustes' },
                  { id: 'Cumplido', label: 'Cumplido' },
                  { id: 'Aprobado', label: 'Aprobado' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroEstado(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    filtroEstado === f.id
                      ? 'bg-[#0f172a] text-[#fed7aa]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="CORRECTIVA">Correctivas</option>
                <option value="PREVENTIVA">Preventivas</option>
                <option value="MEJORA">Oportunidades de mejora</option>
              </select>
              <select
                value={filtroOrigenAccion}
                onChange={(e) => setFiltroOrigenAccion(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-bold"
              >
                <option value="TODOS">Todos los orígenes</option>
                <option value="MATRIZ_RIESGOS">Matriz de riesgos</option>
                <option value="INDICADORES">Indicadores</option>
                <option value="ESTANDARES_MINIMOS">Estándares mínimos</option>
                <option value="ACTIVIDAD_PLAN">Actividad Plan</option>
                <option value="CONDICIONES_SALUD">Condiciones de salud</option>
              </select>
            </div>
          </div>

          {/* Listado de Acciones de Mejora */}
          <div className="space-y-3.5">
            {accionesFiltradas.map((acc) => {
              const riesgoVinculado = acc.riesgoId
                ? riesgos.find((r) => r.id === acc.riesgoId)
                : undefined;
              const badgeEstado = getBadgeClassesEstadoFrikaz(acc.estado);

              return (
                <div
                  key={acc.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-black text-[10px]">
                          {acc.codigo}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                          {acc.tipo}
                        </span>
                        <span className={`px-2 py-0.5 rounded border font-black text-[10px] ${badgeEstado.light}`}>
                          {badgeEstado.label}
                        </span>
                        {acc.estandarNumero && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            Estándar #{acc.estandarNumero}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-black text-slate-900">{acc.actividadARealizar}</h5>
                      <p className="text-[11px] text-slate-600">
                        <strong>Situación encontrada:</strong> {acc.situacionEncontrada}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        <strong>Qué se corrige / mejora:</strong> {acc.queSeNecesitaCorregir}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSeguimientoAbiertoId(seguimientoAbiertoId === acc.id ? null : acc.id);
                          setSeguimientoTexto(acc.resultadoSeguimiento);
                          setSeguimientoEstado(acc.estado);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold cursor-pointer"
                      >
                        Actualizar Avance
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenciaAbiertaId(evidenciaAbiertaId === acc.id ? null : acc.id)
                        }
                        className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-950 font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Soporte ({acc.evidenciasAdjuntas.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!esGerente) {
                            solicitarAccesoGerente();
                            return;
                          }
                          setDevolverId(devolverId === acc.id ? null : acc.id);
                          setMotivoDevolucion('');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer inline-flex items-center gap-1 ${
                          esGerente
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        title={
                          esGerente
                            ? 'Devolver para ajustes con observaciones'
                            : 'Solo Andrea Orjuela – Gerente puede devolver para ajustes'
                        }
                      >
                        {esGerente ? <RotateCcw className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                        <span>{esGerente ? 'Devolver' : 'Ingresar como Gerente'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHistorialAbiertoId(historialAbiertoId === acc.id ? null : acc.id)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>{acc.historial.length}</span>
                      </button>
                    </div>
                  </div>

                  {/* Relación viva con Matriz de Riesgos GTC 45 */}
                  {riesgoVinculado && (
                    <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3 text-[11px] space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-black text-rose-950">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                        <span>
                          Conectada con la Matriz GTC 45: {riesgoVinculado.codigo || riesgoVinculado.id} (Nivel{' '}
                          {riesgoVinculado.interpretacionNR}) · Cargo:{' '}
                          {riesgoVinculado.cargo || riesgoVinculado.cargosExpuestos}
                        </span>
                      </div>
                      <p className="text-slate-700">
                        <strong>Peligro:</strong> {riesgoVinculado.peligroDescripcion} ·{' '}
                        <strong>Medida en matriz:</strong> {extraerMedidasRiesgo(riesgoVinculado)}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <strong>Responsable:</strong> {acc.responsable}
                    </div>
                    <div>
                      <strong>Plazo:</strong> {acc.fechaInicio} → {acc.fechaLimite}
                    </div>
                    <div>
                      <strong>Soporte necesario:</strong> {acc.evidenciaNecesaria}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700">
                    <strong>Resultado del seguimiento actual:</strong> {acc.resultadoSeguimiento}
                  </p>

                  {/* Evidencias ya adjuntadas */}
                  {acc.evidenciasAdjuntas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {acc.evidenciasAdjuntas.map((ev) => (
                        <span
                          key={ev.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {ev.nombreArchivo} ({ev.fechaCarga})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Subpanel Actualizar Avance */}
                  {seguimientoAbiertoId === acc.id && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nuevo estado</label>
                          <select
                            value={seguimientoEstado}
                            onChange={(e) => setSeguimientoEstado(e.target.value as any)}
                            className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                          >
                            <option value="PENDIENTE">Por hacer</option>
                            <option value="EN_PROCESO">En proceso</option>
                            <option value="PENDIENTE_REVISION">Pendiente de revisión</option>
                            <option value="DEVUELTA_CORRECCION" disabled={!esGerente}>
                              Devuelto para ajustes {!esGerente ? '(Solo Gerente)' : ''}
                            </option>
                            <option value="CUMPLIDA" disabled={!esGerente}>
                              Cumplido {!esGerente ? '(Solo Gerente)' : ''}
                            </option>
                            <option value="APROBADA" disabled={!esGerente}>
                              Aprobado {!esGerente ? '(Solo Gerente)' : ''}
                            </option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 block mb-1">
                            Resultado comprobado en seguimiento
                          </label>
                          <input
                            type="text"
                            value={seguimientoTexto}
                            onChange={(e) => setSeguimientoTexto(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (esEstadoExclusivoGerente(seguimientoEstado) && !esGerente) {
                            solicitarAccesoGerente();
                            return;
                          }
                          const hoy = new Date().toISOString().split('T')[0];
                          onSaveAccion({
                            ...acc,
                            estado: seguimientoEstado,
                            resultadoSeguimiento: seguimientoTexto,
                            historial: [
                              {
                                id: `hm-${Date.now()}`,
                                fecha: hoy,
                                usuario: esEstadoExclusivoGerente(seguimientoEstado)
                                  ? nombreGerente
                                  : acc.responsable,
                                accion: `ESTADO: ${normalizarEstadoEstandar(seguimientoEstado)}`,
                                detalle: seguimientoTexto,
                              },
                              ...acc.historial,
                            ],
                          });
                          setSeguimientoAbiertoId(null);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-black cursor-pointer"
                      >
                        Guardar Seguimiento
                      </button>
                    </div>
                  )}

                  {/* Subpanel Adjuntar Soporte */}
                  {evidenciaAbiertaId === acc.id && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={evNombre}
                          onChange={(e) => setEvNombre(e.target.value)}
                          placeholder="Nombre del archivo o foto..."
                          className="rounded-lg border border-slate-300 p-2 bg-white"
                        />
                        <input
                          type="text"
                          value={evDesc}
                          onChange={(e) => setEvDesc(e.target.value)}
                          placeholder="Qué demuestra este soporte..."
                          className="rounded-lg border border-slate-300 p-2 bg-white"
                        />
                        <input
                          type="file"
                          accept="image/*,.pdf,.xlsx,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!evNombre) setEvNombre(file.name);
                            const reader = new FileReader();
                            reader.onload = () => setEvDataUrl(String(reader.result || ''));
                            reader.readAsDataURL(file);
                          }}
                          className="text-[11px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdjuntarEvidenciaAccion(acc)}
                        className="px-4 py-1.5 rounded-lg bg-[#f97316] text-white font-black cursor-pointer"
                      >
                        Adjuntar Soporte a {acc.codigo}
                      </button>
                    </div>
                  )}

                  {/* Subpanel Devolver para Corrección */}
                  {devolverId === acc.id && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
                      <p className="font-bold text-purple-950">
                        Explique qué falta corregir para continuar con el seguimiento (no se borra el historial):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={motivoDevolucion}
                          onChange={(e) => setMotivoDevolucion(e.target.value)}
                          placeholder="Ej. Falta foto de los 3 puestos instalados con fecha..."
                          className="flex-1 min-w-[220px] rounded-lg border border-purple-300 p-2 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!motivoDevolucion.trim()) return;
                            const hoy = new Date().toISOString().split('T')[0];
                            onSaveAccion({
                              ...acc,
                              estado: 'DEVUELTA_CORRECCION',
                              resultadoSeguimiento: `Devuelto para ajustes por ${nombreGerente}: ${motivoDevolucion.trim()}`,
                              historial: [
                                {
                                  id: `hm-${Date.now()}`,
                                  fecha: hoy,
                                  usuario: nombreGerente,
                                  accion: 'DEVUELTA_CORRECCION',
                                  detalle: motivoDevolucion.trim(),
                                },
                                ...acc.historial,
                              ],
                            });
                            setDevolverId(null);
                            setMotivoDevolucion('');
                          }}
                          className="px-4 py-2 rounded-lg bg-purple-700 text-white font-black cursor-pointer"
                        >
                          Confirmar Devolución
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Historial de seguimiento */}
                  {historialAbiertoId === acc.id && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                      <span className="font-black text-slate-800 block">
                        Historial completo de lo realizado ({acc.codigo}):
                      </span>
                      {acc.historial.map((h) => (
                        <div key={h.id} className="text-[11px] bg-white p-2 rounded border border-slate-200">
                          <strong className="font-mono text-[#0f172a]">{h.fecha}</strong> ·{' '}
                          <span className="font-bold text-[#f97316]">{h.accion}</span> ({h.usuario}):{' '}
                          {h.detalle}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {accionesFiltradas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No hay acciones de mejora con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
