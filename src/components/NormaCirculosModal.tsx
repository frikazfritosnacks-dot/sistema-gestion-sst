import React, { useState, useEffect } from 'react';
import {
  NormaPhvaItem,
  EstadoCumplimiento,
  FasePhva,
} from '../types/phvaEvidence';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  RotateCcw,
  Trash2,
  Check,
  CalendarCheck,
  Mail,
  UserCheck,
} from 'lucide-react';
import { getCaracterizacionActual } from '../services/dynamicRulesEngine';
import { identificarRequisitosObligatorios } from '../services/planAnualService';
import {
  ESTADOS_ESTANDAR_FRIKAZ,
  esEstadoExclusivoGerente,
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  useGerenteAutorizado,
} from '../services/gerenteControlService';

interface NormaCirculosModalProps {
  item: NormaPhvaItem | null;
  isOpen: boolean;
  initialEditMode?: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: EstadoCumplimiento) => void;
  onSaveNorma?: (updatedItem: NormaPhvaItem) => void;
  onDeleteNorma?: (id: string) => void;
}

export const NormaCirculosModal: React.FC<NormaCirculosModalProps> = ({
  item,
  isOpen,
  initialEditMode = false,
  onClose,
  onUpdateStatus,
  onSaveNorma,
  onDeleteNorma,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<NormaPhvaItem | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { esGerente, solicitarAccesoGerente } = useGerenteAutorizado();

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        estado: normalizarEstadoEstandar(item.estado),
      });
      setIsEditing(Boolean(initialEditMode && esGerente));
      setSaveSuccess(false);
      setConfirmDelete(false);
    }
  }, [item, isOpen, initialEditMode, esGerente]);

  if (!isOpen || !item || !formData) return null;

  const handleChange = (
    field: keyof NormaPhvaItem,
    value: string | boolean | EstadoCumplimiento | FasePhva
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!formData) return;

    if (onSaveNorma) {
      onSaveNorma(formData);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 900);
  };

  const handleDelete = () => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDeleteNorma) {
      onDeleteNorma(formData.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header - Azul Oscuro con Acentos Naranja y Logo Frikaz */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white border-b-4 border-[#f97316]">
          <div className="flex items-center gap-3.5">
            <img
              src="/frikaz_logo.jpg"
              alt="Logo Frikaz"
              className="h-12 w-auto max-w-[90px] object-contain rounded-lg border border-orange-200/40 bg-white p-0.5 shadow-xs shrink-0"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#fed7aa] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a]">
                  Fase {formData.fase}
                </span>
                <span className="text-xs text-orange-200 font-bold">
                  {formData.subtema}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">
                  {formData.area === 'SST'
                    ? 'Seguridad y Salud'
                    : formData.area === 'AMBIENTAL'
                    ? 'Ambiental'
                    : 'Integral'}
                </span>
                {isEditing && (
                  <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-slate-900 animate-pulse">
                    MODO EDICIÓN ACTIVO
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
                {formData.tituloSituacion}
              </h3>
              <p className="text-xs text-slate-300">
                <strong className="text-white">{formData.normaOficial}</strong> —{' '}
                {formData.entidadEmisora} ({formData.articulos})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  if (!esGerente) {
                    solicitarAccesoGerente();
                    return;
                  }
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-xs font-bold hover:bg-[#ea580c] transition-colors shadow-xs cursor-pointer"
                title="Habilitar edición de los 6 círculos y campos de la norma (Andrea Orjuela – Gerente)"
              >
                <span>Editar Norma</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...item });
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                title="Cancelar cambios y volver a vista lectura"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Cancelar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Cerrar ventana"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-800">
          {saveSuccess && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-500 p-3.5 flex items-center justify-between text-emerald-900 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>¡Listo! Guardamos los cambios en la guía de Frikaz S.A.S.</span>
              </div>
            </div>
          )}

          {/* Encabezado claro de los 6 puntos */}
          <div className="text-center pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#991b1b]">
              GUÍA CLARA DE LA NORMA — 6 PUNTOS IMPORTANTES
            </span>
            <h4 className="text-sm font-semibold text-slate-600 mt-0.5">
              Qué pide la ley, por qué nos cuida y qué hacemos cada día en Frikaz S.A.S.
            </h4>
          </div>

          {/* FORM / VIEW MODE TOGGLE */}
          {isEditing ? (
            /* ========================================================================= */
            /* MODO EDICIÓN COMPLETO                                                      */
            /* ========================================================================= */
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 uppercase">
                    Datos Principales de la Norma:
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Cambia lo que necesites y presiona <strong>Guardar Cambios</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Título o Situación Regulada:
                    </label>
                    <input
                      type="text"
                      value={formData.tituloSituacion}
                      onChange={(e) => handleChange('tituloSituacion', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Área Normativa:
                    </label>
                    <select
                      value={formData.area}
                      onChange={(e) => handleChange('area', e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                    >
                      <option value="SST">Seguridad y Salud en el Trabajo (SST)</option>
                      <option value="AMBIENTAL">Gestión Ambiental</option>
                      <option value="INTEGRAL">Integral (SST + Ambiental)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Norma Oficial:
                    </label>
                    <input
                      type="text"
                      value={formData.normaOficial}
                      onChange={(e) => handleChange('normaOficial', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Ej. Decreto 1072 de 2015"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Entidad Emisora:
                    </label>
                    <input
                      type="text"
                      value={formData.entidadEmisora}
                      onChange={(e) => handleChange('entidadEmisora', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Ej. Ministerio del Trabajo / SDA"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Artículos Aplicables:
                    </label>
                    <input
                      type="text"
                      value={formData.articulos}
                      onChange={(e) => handleChange('articulos', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Ej. Art. 2.2.4.6.8"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Fase PHVA:
                    </label>
                    <select
                      value={formData.fase}
                      onChange={(e) => handleChange('fase', e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                    >
                      <option value="PLANEAR">Fase 1: PLANEAR</option>
                      <option value="HACER">Fase 2: HACER</option>
                      <option value="VERIFICAR">Fase 3: VERIFICAR</option>
                      <option value="ACTUAR">Fase 4: ACTUAR</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Subtema o Módulo:
                    </label>
                    <input
                      type="text"
                      value={formData.subtema}
                      onChange={(e) => handleChange('subtema', e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Estado de Cumplimiento:
                    </label>
                    <select
                      value={normalizarEstadoEstandar(formData.estado)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (esEstadoExclusivoGerente(val) && !esGerente) {
                          solicitarAccesoGerente();
                          return;
                        }
                        handleChange('estado', val as any);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white font-bold"
                    >
                      {ESTADOS_ESTANDAR_FRIKAZ.map((est) => {
                        const bloqueado = esEstadoExclusivoGerente(est) && !esGerente;
                        return (
                          <option key={est} value={est} disabled={bloqueado}>
                            {est}
                            {bloqueado ? ' (Solo Gerente)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* EDICIÓN DE LOS 6 PUNTOS CLAVE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="font-extrabold text-sm text-[#0f172a] uppercase tracking-wide">
                    Los 6 Puntos Explicativos de la Norma:
                  </h4>
                  <span className="text-xs text-[#991b1b] font-bold">
                    Escríbelos en palabras sencillas para todo el equipo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CÍRCULO 1 */}
                  <div className="rounded-xl border border-slate-300 p-3.5 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
                        ¿Qué dice o pide la norma?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.descripcion}
                      onChange={(e) => handleChange('descripcion', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Explica con palabras sencillas qué pide esta norma..."
                      required
                    />
                  </div>

                  {/* CÍRCULO 2 */}
                  <div className="rounded-xl border border-orange-300 p-3.5 bg-orange-50/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-orange-950">
                        ¿Por qué nos cuida en Frikaz S.A.S.?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.importancia}
                      onChange={(e) => handleChange('importancia', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Cómo protege la salud y seguridad de los 10 trabajadores..."
                      required
                    />
                  </div>

                  {/* CÍRCULO 3 */}
                  <div className="rounded-xl border border-blue-300 p-3.5 bg-blue-50/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-[#1e3a8a]">
                        ¿Qué debemos hacer en la planta?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.aplicabilidad}
                      onChange={(e) => handleChange('aplicabilidad', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Pasos concretos en freidoras, empaque, bodega o entregas..."
                      required
                    />
                  </div>

                  {/* CÍRCULO 4 */}
                  <div className="rounded-xl border-2 border-[#991b1b] p-3.5 bg-red-50/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-bold text-xs">
                        4
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-[#991b1b]">
                        ¿Sigue vigente hoy?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.textoVigencia}
                      onChange={(e) => handleChange('textoVigencia', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Confirmación de que la norma está vigente..."
                      required
                    />
                  </div>

                  {/* CÍRCULO 5 */}
                  <div className="rounded-xl border border-slate-300 p-3.5 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs">
                        5
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
                        ¿Dónde y a quiénes aplica?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.jurisdiccionAlcance}
                      onChange={(e) => handleChange('jurisdiccionAlcance', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Si aplica en todo el país, Bogotá o áreas específicas..."
                      required
                    />
                  </div>

                  {/* CÍRCULO 6 */}
                  <div className="rounded-xl border border-emerald-300 p-3.5 bg-emerald-50/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                        6
                      </div>
                      <label className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                        ¿Con qué documento o soporte se demuestra?
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.evidenciaCumplimiento}
                      onChange={(e) => handleChange('evidenciaCumplimiento', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                      placeholder="Planillas, certificados, actas, fotos o registros..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* TRAZABILIDAD Y RESPONSABLES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Responsable Asignado:
                  </label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) => handleChange('responsable', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                    placeholder="Ej. Gerente / Operario de selección"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fecha de Última Verificación:
                  </label>
                  <input
                    type="date"
                    value={formData.fechaVerificacion}
                    onChange={(e) => handleChange('fechaVerificacion', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Observaciones Técnicas:
                  </label>
                  <input
                    type="text"
                    value={formData.observaciones}
                    onChange={(e) => handleChange('observaciones', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0f172a] focus:outline-hidden bg-white"
                    placeholder="Notas internas..."
                  />
                </div>
              </div>

              {/* BOTONES DE ACCIÓN DEL FORMULARIO */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                      confirmDelete
                        ? 'bg-[#991b1b] text-white border-[#991b1b]'
                        : 'bg-red-50 text-[#991b1b] border-red-300 hover:bg-red-100'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{confirmDelete ? 'Confirmar: Eliminar Norma' : 'Eliminar Esta Norma'}</span>
                  </button>
                  {confirmDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      No eliminar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...item });
                      setIsEditing(false);
                      setConfirmDelete(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors"
                  >
                    Descartar Cambios
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0f172a] text-white text-xs font-black hover:bg-slate-800 transition-colors shadow-md"
                  >
                    <Save className="h-4 w-4 text-[#fed7aa]" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* MODO LECTURA Y SEGUIMIENTO AUTOMATIZADO                                   */
            /* ========================================================================= */
            <>
              {/* Interactive Status Bar with 6 Standardized States + Gerente Gate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-700 block">
                      ¿En qué estado va esta norma?
                    </span>
                    <p className="text-xs text-slate-500">
                      El equipo puede consultar el avance. Solo{' '}
                      <strong>Andrea Orjuela – Gerente</strong> (ingresando con su correo) aprueba, devuelve, edita o marca como Cumplido.
                    </p>
                  </div>
                  {!esGerente && (
                    <button
                      type="button"
                      onClick={solicitarAccesoGerente}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] text-[#fed7aa] text-xs font-bold hover:bg-slate-800 cursor-pointer shrink-0"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Ingresar como Gerente</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {ESTADOS_ESTANDAR_FRIKAZ.map((est) => {
                    const actual = normalizarEstadoEstandar(formData.estado) === est;
                    const exclusivoGerente = esEstadoExclusivoGerente(est);
                    const badge = getBadgeClassesEstadoFrikaz(est);
                    return (
                      <button
                        key={est}
                        type="button"
                        onClick={() => {
                          if (!esGerente) {
                            solicitarAccesoGerente();
                            return;
                          }
                          onUpdateStatus(formData.id, est);
                          setFormData((prev) => (prev ? { ...prev, estado: est } : prev));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          actual
                            ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                            : !esGerente
                              ? 'bg-slate-100 border-slate-300 text-slate-500 hover:border-orange-300 hover:text-slate-700'
                              : `${badge.light} hover:opacity-90`
                        }`}
                        title={
                          !esGerente
                            ? 'Requiere ingresar con el correo de Andrea Orjuela – Gerente'
                            : exclusivoGerente
                              ? `${badge.descripcionCorta} (Gerencia)`
                              : badge.descripcionCorta
                        }
                      >
                        <span>{est}</span>
                      </button>
                    );
                  })}
                </div>

                {formData.resultadoRevision && (
                  <div className="rounded-lg bg-white border border-emerald-200 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span>
                        Revisión de Gerencia: {formData.resultadoRevision} por {formData.revisadoPor}
                      </span>
                    </div>
                    <span className="text-slate-500">
                      Fecha: {formData.fechaRevision || formData.fechaVerificacion}
                    </span>
                    {formData.observacionesRevision && (
                      <p className="w-full text-[11px] text-slate-600">
                        Observación: {formData.observacionesRevision}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* LOS 6 PUNTOS EXPLICADOS EN LENGUAJE SENCILLO */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* CÍRCULO 1: DESCRIPCIÓN */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs relative flex flex-col justify-between hover:border-slate-400 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
                        Descripción
                      </h5>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {formData.descripcion}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-slate-400 font-medium">
                    ¿Qué dice o pide esta norma?
                  </span>
                </div>

                {/* CÍRCULO 2: IMPORTANCIA */}
                <div className="rounded-xl border border-orange-200 bg-[#fff7ed] p-4 shadow-xs relative flex flex-col justify-between hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-orange-950">
                        Importancia
                      </h5>
                    </div>
                    <p className="text-xs text-orange-950 leading-relaxed font-medium">
                      {formData.importancia}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-orange-700 font-semibold">
                    ¿Por qué nos cuida en Frikaz S.A.S. (10 trabajadores)?
                  </span>
                </div>

                {/* CÍRCULO 3: APLICABILIDAD */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs relative flex flex-col justify-between hover:border-blue-400 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#1e3a8a]">
                        Cómo se Aplica
                      </h5>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-normal">
                      {formData.aplicabilidad}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-blue-700 font-semibold">
                    ¿Qué debemos hacer cada día en la planta?
                  </span>
                </div>

                {/* CÍRCULO 4: VIGENTE */}
                <div className="rounded-xl border-2 border-[#991b1b] bg-red-50/60 p-4 shadow-xs relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-bold text-xs">
                        4
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#991b1b]">
                        ¿Está Vigente?
                      </h5>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#991b1b] text-white text-xs font-bold mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>VIGENTE HOY EN COLOMBIA</span>
                    </div>
                    <p className="text-xs text-red-950 leading-relaxed">
                      {formData.textoVigencia}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-red-800 font-bold">
                    Confirmado en fuentes oficiales del país
                  </span>
                </div>

                {/* CÍRCULO 5: JURISDICCIÓN Y ALCANCE */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs relative flex flex-col justify-between hover:border-slate-400 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs">
                        5
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
                        Dónde y a Quiénes Aplica
                      </h5>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {formData.jurisdiccionAlcance}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-slate-500 font-medium">
                    Lugares y personas cubiertas por la norma
                  </span>
                </div>

                {/* CÍRCULO 6: EVIDENCIA PARA CUMPLIMIENTO */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-xs relative flex flex-col justify-between hover:border-emerald-500 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                        6
                      </div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                        Soporte que lo Demuestra
                      </h5>
                    </div>
                    <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                      {formData.evidenciaCumplimiento}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] text-emerald-800 font-bold">
                    Documentos, planillas o registros para tener al día
                  </span>
                </div>
              </div>

              {/* Trazabilidad normativa para el Plan Anual */}
              {(() => {
                const configActual = getCaracterizacionActual();
                const reqs = identificarRequisitosObligatorios(configActual, [formData]);
                const reqMatch = reqs.find(
                  (r) =>
                    r.normaId === formData.id ||
                    formData.normaOficial
                      .toLowerCase()
                      .includes(r.normaOficial.split('/')[0].trim().toLowerCase())
                );
                return (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-indigo-950 uppercase text-[11px] flex items-center gap-1.5">
                        <CalendarCheck className="h-4 w-4 text-[#f97316]" />
                        ¿Cómo entra esta norma al Plan Anual (PLANEAR)?
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-900 font-bold text-[10px]">
                        {reqMatch
                          ? `Cada cuánto se hace: ${reqMatch.frecuenciaRespaldada}`
                          : 'Se revisa según avance en la lista'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px]">
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Requisito a Cumplir
                        </span>
                        <span className="font-semibold text-slate-800">
                          {reqMatch ? reqMatch.requisitoObligatorio : formData.tituloSituacion}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Norma y Actividad Práctica
                        </span>
                        <span className="font-semibold text-slate-800 block">
                          {formData.normaOficial} ({formData.articulos})
                        </span>
                        <span className="text-slate-600">
                          {reqMatch ? reqMatch.actividadPropuesta : formData.aplicabilidad.slice(0, 120)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Frecuencia, Responsable y Soporte
                        </span>
                        <span className="text-slate-800 block">
                          <strong>Cada cuánto:</strong>{' '}
                          {reqMatch
                            ? `${reqMatch.frecuenciaRespaldada} (${reqMatch.sustentoFrecuencia})`
                            : 'Según seguimiento del plan'}
                        </span>
                        <span className="text-slate-600 block">
                          <strong>Encargado:</strong>{' '}
                          {reqMatch ? reqMatch.responsableSugerido : formData.responsable} ·{' '}
                          <strong>Fecha:</strong>{' '}
                          {reqMatch ? reqMatch.periodoCumplimiento : `Año ${new Date().getFullYear()}`}
                        </span>
                        <span className="text-emerald-800 block mt-0.5">
                          <strong>Soporte:</strong>{' '}
                          {reqMatch ? reqMatch.evidenciaNecesaria : formData.evidenciaCumplimiento.slice(0, 110)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Traceability Footnote */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <div>
                  <span>
                    <strong>Encargado:</strong> {formData.responsable}
                  </span>
                  <span className="mx-2">·</span>
                  <span>
                    <strong>Última Revisión:</strong> {formData.fechaVerificacion}
                  </span>
                </div>
                {formData.observaciones && (
                  <span className="italic text-slate-600">{formData.observaciones}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f97316] text-white text-xs font-bold hover:bg-[#ea580c] transition-colors shadow-xs"
            >
              <span>Editar los 6 Puntos de esta Norma</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Todos los cambios se guardan automáticamente en este equipo.
            </span>
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-[#0f172a] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
