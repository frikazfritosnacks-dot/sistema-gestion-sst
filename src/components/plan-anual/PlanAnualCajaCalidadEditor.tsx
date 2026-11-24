import React, { useState, useEffect } from 'react';
import type {
  CajaCalidadEditable,
  FormatoEditableDocumento,
  MaterialCapacitacionPlan,
} from '../../types/planAnualMejoraEmergencias';
import {
  exportarFormatoWordDocx,
  exportarMaterialCapacitacionWordDocx,
} from '../../services/planMejoraEmergenciasService';
import { crearCajaCalidadEditable } from '../../services/planMejoraEmergenciasData';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Printer,
  Save,
  Users,
  X,
} from 'lucide-react';

interface CajaCalidadVisualCardProps {
  caja: CajaCalidadEditable;
  onChange?: (next: CajaCalidadEditable) => void;
  readOnly?: boolean;
}

export const CajaCalidadVisualCard: React.FC<CajaCalidadVisualCardProps> = ({
  caja,
  onChange,
  readOnly = false,
}) => {
  const [editando, setEditando] = useState(false);

  const updateField = (field: keyof CajaCalidadEditable, value: string) => {
    if (!onChange) return;
    onChange({ ...caja, [field]: value });
  };

  return (
    <div className="rounded-xl border-2 border-slate-800 bg-white overflow-hidden text-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-800">
        {/* Col 1: Logo */}
        <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col items-center justify-center bg-slate-50/70">
          <img
            src="/frikaz_logo.jpg"
            alt="Logo Frikaz S.A.S."
            className="h-11 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-[10px] font-black tracking-wider text-[#d9381e] mt-1">
            FRIKAZ S.A.S.
          </span>
        </div>

        {/* Col 2: Empresa y Nombre del documento */}
        <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-800 text-center font-black text-slate-900 bg-slate-50">
            {caja.empresa || 'Frikaz S.A.S.'}
          </div>
          <div className="px-3 py-2.5 flex-1 flex items-center justify-center text-center">
            {editando && onChange ? (
              <input
                type="text"
                value={caja.nombreDocumento}
                onChange={(e) => updateField('nombreDocumento', e.target.value)}
                className="w-full text-center font-black text-slate-900 border border-teal-400 rounded px-2 py-1 text-xs"
              />
            ) : (
              <span className="font-black text-slate-900 uppercase leading-snug text-[11px]">
                {caja.nombreDocumento}
              </span>
            )}
          </div>
        </div>

        {/* Col 3: Código, Versión, Fecha */}
        <div className="md:col-span-4 divide-y divide-slate-800 text-[11px]">
          <div className="px-3 py-1.5 flex items-center justify-between gap-2">
            <span className="font-black text-slate-700 shrink-0">Código:</span>
            {editando && onChange ? (
              <input
                type="text"
                value={caja.codigo}
                onChange={(e) => updateField('codigo', e.target.value)}
                className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px]"
              />
            ) : (
              <span className="font-mono text-slate-800 truncate">{caja.codigo}</span>
            )}
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between gap-2">
            <span className="font-black text-slate-700 shrink-0">Versión:</span>
            {editando && onChange ? (
              <input
                type="text"
                value={caja.version}
                onChange={(e) => updateField('version', e.target.value)}
                className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px]"
              />
            ) : (
              <span className="font-mono text-slate-800 truncate">{caja.version}</span>
            )}
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between gap-2">
            <span className="font-black text-slate-700 shrink-0">Fecha:</span>
            {editando && onChange ? (
              <input
                type="text"
                value={caja.fechaElaboracionActualizacion}
                onChange={(e) => updateField('fechaElaboracionActualizacion', e.target.value)}
                placeholder="AAAA-MM-DD"
                className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px]"
              />
            ) : (
              <span className="font-mono text-slate-800 truncate">
                {caja.fechaElaboracionActualizacion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior: Elaboró / Revisó / Aprobó */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-[11px] bg-slate-50/50">
        <div className="px-3 py-1.5 flex items-center gap-1.5">
          <span className="font-black text-slate-700 shrink-0">Elaboró:</span>
          {editando && onChange ? (
            <input
              type="text"
              value={caja.elaboro}
              onChange={(e) => updateField('elaboro', e.target.value)}
              className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px] bg-white"
            />
          ) : (
            <span className="text-slate-700 truncate">{caja.elaboro}</span>
          )}
        </div>
        <div className="px-3 py-1.5 flex items-center gap-1.5">
          <span className="font-black text-slate-700 shrink-0">Revisó:</span>
          {editando && onChange ? (
            <input
              type="text"
              value={caja.reviso}
              onChange={(e) => updateField('reviso', e.target.value)}
              className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px] bg-white"
            />
          ) : (
            <span className="text-slate-700 truncate">{caja.reviso}</span>
          )}
        </div>
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-black text-slate-700 shrink-0">Aprobó:</span>
            {editando && onChange ? (
              <input
                type="text"
                value={caja.aprobo}
                onChange={(e) => updateField('aprobo', e.target.value)}
                className="w-full border border-teal-400 rounded px-1.5 py-0.5 text-[11px] bg-white"
              />
            ) : (
              <span className="text-slate-700 truncate">{caja.aprobo}</span>
            )}
          </div>
          {!readOnly && onChange && (
            <button
              type="button"
              onClick={() => setEditando(!editando)}
              className="px-2 py-0.5 rounded bg-[#0f5b53] text-white font-bold text-[10px] hover:bg-[#0c4842] shrink-0 cursor-pointer inline-flex items-center gap-1 print:hidden"
            >
              <Edit3 className="h-3 w-3" />
              <span>{editando ? 'Listo' : 'Editar caja'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL DE FORMATO EDITABLE + IMPRESIÓN + DESCARGA WORD (.DOCX TIMES NEW ROMAN)
// ============================================================================

interface FormatoDocumentoModalProps {
  formato: FormatoEditableDocumento | null;
  onClose: () => void;
  onSaveFormato: (next: FormatoEditableDocumento) => void;
}

export const FormatoDocumentoModal: React.FC<FormatoDocumentoModalProps> = ({
  formato,
  onClose,
  onSaveFormato,
}) => {
  const [draft, setDraft] = useState<FormatoEditableDocumento | null>(formato);
  const [guardadoMsg, setGuardadoMsg] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setDraft(formato ? JSON.parse(JSON.stringify(formato)) : null);
    setGuardadoMsg(false);
  }, [formato]);

  if (!draft) return null;

  const handleGuardar = () => {
    const actualizado: FormatoEditableDocumento = {
      ...draft,
      fechaUltimoGuardado: new Date().toISOString().split('T')[0],
    };
    onSaveFormato(actualizado);
    setDraft(actualizado);
    setGuardadoMsg(true);
    setTimeout(() => setGuardadoMsg(false), 3000);
  };

  const handleDescargarWord = async () => {
    setExportando(true);
    try {
      await exportarFormatoWordDocx(draft);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-[#b9dad3] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        {/* Topbar */}
        <div className="px-5 py-3.5 bg-linear-to-r from-[#eaf5f2] to-white border-b border-[#d6ebe5] flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-[#0f5b53] text-white shrink-0">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h4 className="font-black text-sm text-[#0d3b36] truncate">{draft.titulo}</h4>
              <p className="text-[11px] text-slate-600">
                Formato editable · Puede llenarlo aquí, imprimirlo o descargarlo en Word (Times New Roman).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGuardar}
              className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar borrador</span>
            </button>
            <button
              type="button"
              onClick={handleDescargarWord}
              disabled={exportando}
              className="px-3 py-1.5 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{exportando ? 'Generando Word...' : 'Descargar Word (.docx)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
              aria-label="Cerrar formato"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {guardadoMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2 text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                Formato guardado correctamente. Recuerde adjuntar evidencia si desea enviarlo a revisión de Andrea Orjuela – Gerente.
              </span>
            </div>
          )}

          {/* Aviso de control */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-950">
            <strong>Importante:</strong> Llenar, guardar o descargar este formato <strong>no</strong> cambia el estado del plan a <em>Cumplido</em> ni <em>Aprobado</em>. Solo Andrea Orjuela – Gerente aprueba después de revisar los soportes reales.
          </div>

          {/* Caja de Calidad Editable */}
          <CajaCalidadVisualCard
            caja={draft.cajaCalidad}
            onChange={(cajaCalidad) => setDraft({ ...draft, cajaCalidad })}
          />

          {/* Instrucciones */}
          <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 text-[11px] text-[#173f3a]">
            <strong>Cómo usar este formato:</strong> {draft.instruccionesUso}
          </div>

          {/* Encabezado editable */}
          {draft.camposEncabezado.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-black text-[#0d3b36] text-xs uppercase tracking-wider">
                1. Datos del registro
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {draft.camposEncabezado.map((campo, idx) => (
                  <div key={campo.id} className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      {campo.etiqueta}
                    </label>
                    <input
                      type="text"
                      value={campo.valor}
                      onChange={(e) => {
                        const next = [...draft.camposEncabezado];
                        next[idx] = { ...campo, valor: e.target.value };
                        setDraft({ ...draft, camposEncabezado: next });
                      }}
                      placeholder="Escriba aquí..."
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de verificación */}
          {draft.itemsVerificacion.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-black text-[#0d3b36] text-xs uppercase tracking-wider">
                2. Puntos de revisión
              </h5>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#eaf5f2] text-[#0d3b36] text-[11px]">
                    <tr>
                      <th className="p-2.5 font-black">Qué revisar</th>
                      <th className="p-2.5 font-black w-44">Cumple</th>
                      <th className="p-2.5 font-black w-56">Observación / qué falta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {draft.itemsVerificacion.map((item, idx) => (
                      <tr key={item.id} className="bg-white">
                        <td className="p-2.5 text-slate-800">{item.criterio}</td>
                        <td className="p-2.5">
                          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                            {(['SI', 'NO', 'NA'] as const).map((op) => (
                              <button
                                key={op}
                                type="button"
                                onClick={() => {
                                  const next = [...draft.itemsVerificacion];
                                  next[idx] = {
                                    ...item,
                                    cumplimiento: item.cumplimiento === op ? '' : op,
                                  };
                                  setDraft({ ...draft, itemsVerificacion: next });
                                }}
                                className={`px-2.5 py-1 font-bold text-[11px] cursor-pointer ${
                                  item.cumplimiento === op
                                    ? op === 'SI'
                                      ? 'bg-emerald-600 text-white'
                                      : op === 'NO'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-700 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {op === 'SI' ? 'Sí' : op === 'NO' ? 'No' : 'N/A'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.observacion}
                            onChange={(e) => {
                              const next = [...draft.itemsVerificacion];
                              next[idx] = { ...item, observacion: e.target.value };
                              setDraft({ ...draft, itemsVerificacion: next });
                            }}
                            placeholder="Anotar..."
                            className="w-full rounded border border-slate-300 px-2 py-1 text-[11px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla adicional editable */}
          {draft.tablaRegistro && (
            <div className="space-y-2">
              <h5 className="font-black text-[#0d3b36] text-xs uppercase tracking-wider">
                3. {draft.tablaRegistro.titulo}
              </h5>
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead className="bg-[#eaf5f2] text-[#0d3b36] text-[11px]">
                    <tr>
                      {draft.tablaRegistro.columnas.map((col, cIdx) => (
                        <th key={cIdx} className="p-2 font-black border-b border-slate-200">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {draft.tablaRegistro.filas.map((fila, rIdx) => (
                      <tr key={rIdx} className="bg-white">
                        {draft.tablaRegistro!.columnas.map((_, cIdx) => (
                          <td key={cIdx} className="p-1.5">
                            <input
                              type="text"
                              value={fila[cIdx] || ''}
                              onChange={(e) => {
                                const nextFilas = draft.tablaRegistro!.filas.map((f, ri) =>
                                  ri === rIdx
                                    ? f.map((val, ci) => (ci === cIdx ? e.target.value : val))
                                    : f
                                );
                                setDraft({
                                  ...draft,
                                  tablaRegistro: {
                                    ...draft.tablaRegistro!,
                                    filas: nextFilas,
                                  },
                                });
                              }}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observaciones generales */}
          <div className="space-y-1">
            <label className="font-black text-[#0d3b36] text-xs uppercase tracking-wider block">
              Observaciones generales
            </label>
            <textarea
              rows={3}
              value={draft.observacionesGenerales}
              onChange={(e) => setDraft({ ...draft, observacionesGenerales: e.target.value })}
              placeholder="Escriba aquí comentarios adicionales o compromisos..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL DE GUÍA COMPLETA DE CAPACITACIÓN (LECTURA, ASISTENCIA Y DESCARGA WORD)
// ============================================================================

interface MaterialCapacitacionModalProps {
  material: MaterialCapacitacionPlan | null;
  tituloContexto?: string;
  onClose: () => void;
  onSaveMaterial: (next: MaterialCapacitacionPlan) => void;
}

export const MaterialCapacitacionModal: React.FC<MaterialCapacitacionModalProps> = ({
  material,
  tituloContexto,
  onClose,
  onSaveMaterial,
}) => {
  const [draft, setDraft] = useState<MaterialCapacitacionPlan | null>(material);
  const [caja, setCaja] = useState<CajaCalidadEditable>(() =>
    crearCajaCalidadEditable(
      material ? `GUÍA DE CAPACITACIÓN: ${material.nombre}` : 'GUÍA DE CAPACITACIÓN SST'
    )
  );
  const [guardado, setGuardado] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setDraft(material ? JSON.parse(JSON.stringify(material)) : null);
    if (material) {
      setCaja(crearCajaCalidadEditable(`GUÍA DE CAPACITACIÓN: ${material.nombre}`));
    }
    setGuardado(false);
  }, [material]);

  if (!draft) return null;

  const handleGuardar = () => {
    onSaveMaterial(draft);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const handleWord = async () => {
    setExportando(true);
    try {
      await exportarMaterialCapacitacionWordDocx(draft, caja);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-[#b9dad3] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-linear-to-r from-[#eaf5f2] to-white border-b border-[#d6ebe5] flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-[#0f5b53] text-white shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h4 className="font-black text-sm text-[#0d3b36] truncate">{draft.nombre}</h4>
              {tituloContexto && (
                <p className="text-[11px] text-slate-600 truncate">{tituloContexto}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGuardar}
              className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar asistencia / notas</span>
            </button>
            <button
              type="button"
              onClick={handleWord}
              disabled={exportando}
              className="px-3 py-1.5 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{exportando ? 'Generando Word...' : 'Descargar Guía (.docx)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {guardado && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2 text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Registro de asistencia y observaciones guardado correctamente.</span>
            </div>
          )}

          <CajaCalidadVisualCard caja={caja} onChange={setCaja} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
              <span className="font-black text-[#0d3b36] block mb-0.5">Objetivo sencillo</span>
              <p className="text-slate-700 leading-relaxed">{draft.objetivo}</p>
            </div>
            <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3">
              <span className="font-black text-[#0d3b36] block mb-0.5">Duración estimada</span>
              <p className="font-bold text-[#0f5b53]">{draft.duracionSugerida}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
              <h5 className="font-black text-[#0d3b36] text-xs uppercase">Temas principales</h5>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {draft.temasPrincipales.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
              <h5 className="font-black text-[#0d3b36] text-xs uppercase">
                Recomendaciones prácticas
              </h5>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {draft.recomendacionesPracticas.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-[#b9dad3] bg-white p-4 space-y-2">
            <h5 className="font-black text-[#0d3b36] text-xs uppercase">
              Explicación paso a paso para los trabajadores
            </h5>
            <div className="space-y-1.5 text-slate-800 leading-relaxed">
              {draft.desarrolloSencillo.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-1">
            <h5 className="font-black text-amber-950 text-xs uppercase">
              Actividad corta para comprobar que se entendió
            </h5>
            <p className="text-amber-950 leading-relaxed">{draft.actividadComprension}</p>
          </div>

          <div className="space-y-2">
            <h5 className="font-black text-[#0d3b36] text-xs uppercase">
              Evaluación sencilla (preguntas orales o escritas)
            </h5>
            <div className="space-y-2">
              {draft.evaluacionSencilla.map((ev, i) => (
                <div
                  key={ev.id || i}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1"
                >
                  <p className="font-bold text-slate-900">
                    {i + 1}. {ev.pregunta}
                  </p>
                  <p className="text-[11px] text-[#0f5b53]">
                    <strong>Respuesta esperada:</strong> {ev.respuestaEsperada}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-black text-[#0d3b36] text-xs uppercase flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#0f6b61]" />
              <span>Registro de asistencia (hasta 10 trabajadores)</span>
            </h5>
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[520px]">
                <thead className="bg-[#eaf5f2] text-[#0d3b36] text-[11px]">
                  <tr>
                    <th className="p-2 font-black w-10">N.°</th>
                    <th className="p-2 font-black">Nombre del trabajador</th>
                    <th className="p-2 font-black">Cargo / Área</th>
                    <th className="p-2 font-black w-28">Fecha</th>
                    <th className="p-2 font-black">Confirmación / Firma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {draft.asistenciaRegistrada.map((row, idx) => (
                    <tr key={row.id} className="bg-white">
                      <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.nombreTrabajador}
                          onChange={(e) => {
                            const next = [...draft.asistenciaRegistrada];
                            next[idx] = { ...row, nombreTrabajador: e.target.value };
                            setDraft({ ...draft, asistenciaRegistrada: next });
                          }}
                          placeholder="Nombre..."
                          className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.cargo}
                          onChange={(e) => {
                            const next = [...draft.asistenciaRegistrada];
                            next[idx] = { ...row, cargo: e.target.value };
                            setDraft({ ...draft, asistenciaRegistrada: next });
                          }}
                          placeholder="Cargo..."
                          className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="date"
                          value={row.fecha}
                          onChange={(e) => {
                            const next = [...draft.asistenciaRegistrada];
                            next[idx] = { ...row, fecha: e.target.value };
                            setDraft({ ...draft, asistenciaRegistrada: next });
                          }}
                          className="w-full rounded border border-slate-200 px-1.5 py-1 text-[11px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.firmaOConfirmacion}
                          onChange={(e) => {
                            const next = [...draft.asistenciaRegistrada];
                            next[idx] = {
                              ...row,
                              firmaOConfirmacion: e.target.value,
                              asistio: e.target.value.trim().length > 0,
                            };
                            setDraft({ ...draft, asistenciaRegistrada: next });
                          }}
                          placeholder="Asistió / Firma..."
                          className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-black text-[#0d3b36] text-xs uppercase block">
              Espacio para observaciones de la capacitación
            </label>
            <textarea
              rows={2}
              value={draft.observaciones}
              onChange={(e) => setDraft({ ...draft, observaciones: e.target.value })}
              placeholder="Anote dudas del equipo, recomendaciones o compromisos..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
