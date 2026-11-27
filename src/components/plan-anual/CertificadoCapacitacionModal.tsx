import React, { useEffect, useMemo, useState } from 'react';
import type { TrabajadorFichaSST } from '../../types/planAnual';
import type {
  CapacitacionCertificadoContext,
  CertificadoParticipacionMejora,
  PlanMejoraRepositorioStore,
} from '../../types/planMejoraRepositorio';
import {
  buscarCertificadoExistente,
  descargarCertificadoPdf,
  descargarCertificadosPlanPdfConjunto,
  imprimirCertificadosCarta,
  loadPlanMejoraRepositorio,
  upsertCertificadoEnRepositorio,
} from '../../services/planMejoraRepoService';
import { CARGOS_OFICIALES_NOMBRES } from '../../data/cargosOficiales';
import { useGerenteAutorizado } from '../../services/gerenteControlService';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  History,
  Printer,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface CertificadoCapacitacionModalProps {
  contexto: CapacitacionCertificadoContext | null;
  trabajadores: TrabajadorFichaSST[];
  onClose: () => void;
}

interface ParticipanteEditable {
  key: string;
  trabajadorId?: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  cargo: string;
  asistenciaConfirmadaEnGuia?: boolean;
  noAsistioEnGuia?: boolean;
  fechaEnGuia?: string;
  seleccionado: boolean;
}

export const CertificadoCapacitacionModal: React.FC<CertificadoCapacitacionModalProps> = ({
  contexto,
  trabajadores,
  onClose,
}) => {
  const { esGerente, nombreGerente } = useGerenteAutorizado();
  const [repoStore, setRepoStore] = useState<PlanMejoraRepositorioStore>(() =>
    loadPlanMejoraRepositorio()
  );

  const [vista, setVista] = useState<'formulario' | 'preview' | 'historial'>('formulario');

  // Campos de la capacitación y quien certifica
  const [temaCapacitacion, setTemaCapacitacion] = useState('');
  const [fechaRealizacion, setFechaRealizacion] = useState('');
  const [duracionHoras, setDuracionHoras] = useState('');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableCargo, setResponsableCargo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Participantes y filtro
  const [participantes, setParticipantes] = useState<ParticipanteEditable[]>([]);
  const [busquedaTrabajador, setBusquedaTrabajador] = useState('');
  const [certEditandoId, setCertEditandoId] = useState<string | undefined>(undefined);

  // Resultados generados para previsualización / descarga / impresión
  const [certificadosGenerados, setCertificadosGenerados] = useState<
    CertificadoParticipacionMejora[]
  >([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const syncRepo = () => setRepoStore(loadPlanMejoraRepositorio());
    window.addEventListener('frikaz:repo-mejora-updated', syncRepo);
    return () => window.removeEventListener('frikaz:repo-mejora-updated', syncRepo);
  }, []);

  useEffect(() => {
    if (!contexto) return;
    setRepoStore(loadPlanMejoraRepositorio());
    setErrorMsg(null);
    setMensajeEstado(null);
    setBusquedaTrabajador('');
    setPreviewIdx(0);

    const editCert = contexto.certificadoEditar;
    setCertEditandoId(editCert?.id);
    setTemaCapacitacion(
      editCert?.temaDesarrollado ||
        editCert?.nombreActividad ||
        contexto.nombreCapacitacion ||
        ''
    );
    setFechaRealizacion(editCert?.fechaRealizacion ?? contexto.fechaRealizacion ?? '');
    setDuracionHoras(editCert?.intensidadHoraria ?? contexto.duracionHoras ?? '');
    setResponsableNombre(editCert?.certificadorNombre ?? contexto.responsableNombre ?? '');
    setResponsableCargo(editCert?.certificadorCargo ?? contexto.responsableCargo ?? '');
    setObservaciones(editCert?.observaciones ?? contexto.observaciones ?? '');

    // Construir lista de trabajadores registrados + asistencia de guía si existe
    const activos = trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO');
    const baseList = activos.length > 0 ? activos : trabajadores;
    const asistencia = contexto.asistenciaRegistrada || [];

    const mapParticipantes = new Map<string, ParticipanteEditable>();

    baseList.forEach((t) => {
      const idDoc = [t.tipoDocumento, t.numeroDocumento].filter(Boolean).join(' ').trim();
      const regGuia = asistencia.find(
        (a) => a.nombreTrabajador.trim().toLowerCase() === t.nombreCompleto.trim().toLowerCase()
      );
      const esEditado = Boolean(
        editCert &&
          ((editCert.trabajadorId && editCert.trabajadorId === t.id) ||
            editCert.trabajadorNombre.trim().toLowerCase() === t.nombreCompleto.trim().toLowerCase())
      );

      mapParticipantes.set(t.nombreCompleto.trim().toLowerCase(), {
        key: t.id,
        trabajadorId: t.id,
        nombreCompleto: esEditado && editCert ? editCert.trabajadorNombre : t.nombreCompleto,
        numeroIdentificacion:
          esEditado && editCert?.numeroIdentificacion
            ? editCert.numeroIdentificacion
            : idDoc,
        cargo: esEditado && editCert ? editCert.cargo : t.cargoNombre,
        asistenciaConfirmadaEnGuia: regGuia?.asistio === true,
        noAsistioEnGuia: regGuia ? regGuia.asistio === false : false,
        fechaEnGuia: regGuia?.fecha || '',
        // Solo pre-seleccionar si se está editando un certificado existente o si tiene asistencia confirmada en guía
        seleccionado: esEditado || regGuia?.asistio === true,
      });
    });

    // Incluir asistentes registrados en la guía que no estén en la lista de fichas
    asistencia.forEach((reg, idx) => {
      const nom = reg.nombreTrabajador.trim();
      if (!nom) return;
      const keyNorm = nom.toLowerCase();
      if (!mapParticipantes.has(keyNorm)) {
        const esEditado = Boolean(
          editCert && editCert.trabajadorNombre.trim().toLowerCase() === keyNorm
        );
        mapParticipantes.set(keyNorm, {
          key: `guia-${idx}-${keyNorm}`,
          nombreCompleto: nom,
          numeroIdentificacion: esEditado ? editCert?.numeroIdentificacion || '' : '',
          cargo: reg.cargo || CARGOS_OFICIALES_NOMBRES[0],
          asistenciaConfirmadaEnGuia: reg.asistio === true,
          noAsistioEnGuia: reg.asistio === false,
          fechaEnGuia: reg.fecha || '',
          seleccionado: esEditado || reg.asistio === true,
        });
      }
    });

    // Si se está editando un certificado de alguien externo que no está en listas
    if (
      editCert &&
      !mapParticipantes.has(editCert.trabajadorNombre.trim().toLowerCase())
    ) {
      mapParticipantes.set(editCert.trabajadorNombre.trim().toLowerCase(), {
        key: `edit-${editCert.id}`,
        trabajadorId: editCert.trabajadorId,
        nombreCompleto: editCert.trabajadorNombre,
        numeroIdentificacion: editCert.numeroIdentificacion || '',
        cargo: editCert.cargo,
        seleccionado: true,
      });
    }

    setParticipantes(Array.from(mapParticipantes.values()));
    setVista('formulario');
  }, [contexto, trabajadores]);

  const certificadosDeEstaCapacitacion = useMemo(() => {
    if (!contexto) return [];
    const keyNorm = contexto.capacitacionKey.trim().toLowerCase();
    const nomNorm = contexto.nombreCapacitacion.trim().toLowerCase();
    return repoStore.certificados.filter((c) => {
      if (c.capacitacionKey && c.capacitacionKey.trim().toLowerCase() === keyNorm) {
        return true;
      }
      return (
        c.planId === contexto.planId &&
        c.nombreActividad.trim().toLowerCase() === nomNorm
      );
    });
  }, [contexto, repoStore.certificados]);

  if (!contexto) return null;

  const seleccionados = participantes.filter((p) => p.seleccionado);
  const participantesFiltrados = participantes.filter((p) => {
    const q = busquedaTrabajador.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nombreCompleto.toLowerCase().includes(q) ||
      p.numeroIdentificacion.toLowerCase().includes(q) ||
      p.cargo.toLowerCase().includes(q)
    );
  });

  const handleToggleParticipante = (key: string) => {
    setParticipantes((prev) =>
      prev.map((p) => (p.key === key ? { ...p, seleccionado: !p.seleccionado } : p))
    );
    setErrorMsg(null);
  };

  const handleUpdateParticipante = (
    key: string,
    patch: Partial<Pick<ParticipanteEditable, 'nombreCompleto' | 'numeroIdentificacion' | 'cargo'>>
  ) => {
    setParticipantes((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    );
  };

  const handleGenerarYPrevisualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!temaCapacitacion.trim()) {
      setErrorMsg('Ingrese el nombre o tema de la capacitación antes de continuar.');
      return;
    }

    if (seleccionados.length === 0) {
      setErrorMsg(
        'Seleccione al menos un trabajador con participación confirmada. El sistema no genera certificados para trabajadores sin participación registrada.'
      );
      return;
    }

    const faltanNombres = seleccionados.some((s) => !s.nombreCompleto.trim());
    if (faltanNombres) {
      setErrorMsg('Complete el nombre completo de todos los participantes seleccionados.');
      return;
    }

    setProcesando(true);
    try {
      const actor = esGerente ? nombreGerente : 'Equipo SST Frikaz S.A.S.';
      let storeActual = loadPlanMejoraRepositorio();
      const generados: CertificadoParticipacionMejora[] = [];
      let nuevosCount = 0;
      let actualizadosCount = 0;

      for (const part of seleccionados) {
        const res = await upsertCertificadoEnRepositorio(
          storeActual,
          {
            certificadoExistenteId:
              seleccionados.length === 1 ? certEditandoId : undefined,
            capacitacionKey: contexto.capacitacionKey,
            origenModulo: contexto.origenModulo,
            planId: contexto.planId,
            nombrePlan: contexto.nombrePlan,
            riesgoCodigo: contexto.riesgoCodigo,
            nombreRiesgo: contexto.nombreRiesgo,
            actividadId: contexto.actividadId,
            nombreActividad: contexto.nombreCapacitacion,
            trabajadorId: part.trabajadorId,
            trabajadorNombre: part.nombreCompleto.trim(),
            numeroIdentificacion: part.numeroIdentificacion.trim(),
            cargo: part.cargo.trim() || CARGOS_OFICIALES_NOMBRES[0],
            fechaRealizacion: (fechaRealizacion || part.fechaEnGuia || '').trim(),
            intensidadHoraria: duracionHoras.trim(),
            temaDesarrollado: temaCapacitacion.trim(),
            certificadorNombre: responsableNombre.trim(),
            certificadorCargo: responsableCargo.trim(),
            observaciones: observaciones.trim(),
          },
          actor
        );
        storeActual = res.store;
        generados.push(res.certificado);
        if (res.fueActualizado) actualizadosCount += 1;
        else nuevosCount += 1;
      }

      setRepoStore(storeActual);
      setCertificadosGenerados(generados);
      setPreviewIdx(0);
      setVista('preview');
      if (actualizadosCount > 0 && nuevosCount === 0) {
        setMensajeEstado(
          `Se ${actualizadosCount === 1 ? 'actualizó' : 'actualizaron'} ${actualizadosCount} certificado(s) existente(s) conservando su historial en el repositorio.`
        );
      } else if (actualizadosCount > 0 && nuevosCount > 0) {
        setMensajeEstado(
          `Se emitieron ${nuevosCount} certificado(s) nuevo(s) y se actualizaron ${actualizadosCount} existente(s) en el repositorio documental.`
        );
      } else {
        setMensajeEstado(
          `Se ${generados.length === 1 ? 'generó y guardó 1 certificado' : `generaron y guardaron ${generados.length} certificados`} en el repositorio documental.`
        );
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleCargarParaEditar = (cert: CertificadoParticipacionMejora) => {
    setCertEditandoId(cert.id);
    setTemaCapacitacion(cert.temaDesarrollado || cert.nombreActividad);
    setFechaRealizacion(cert.fechaRealizacion || '');
    setDuracionHoras(cert.intensidadHoraria || '');
    setResponsableNombre(cert.certificadorNombre || '');
    setResponsableCargo(cert.certificadorCargo || '');
    setObservaciones(cert.observaciones || '');
    setParticipantes((prev) => {
      let encontrado = false;
      const next = prev.map((p) => {
        const match =
          (cert.trabajadorId && p.trabajadorId === cert.trabajadorId) ||
          p.nombreCompleto.trim().toLowerCase() === cert.trabajadorNombre.trim().toLowerCase();
        if (match) {
          encontrado = true;
          return {
            ...p,
            nombreCompleto: cert.trabajadorNombre,
            numeroIdentificacion: cert.numeroIdentificacion || p.numeroIdentificacion,
            cargo: cert.cargo,
            seleccionado: true,
          };
        }
        return { ...p, seleccionado: false };
      });
      if (!encontrado) {
        next.unshift({
          key: `edit-${cert.id}`,
          trabajadorId: cert.trabajadorId,
          nombreCompleto: cert.trabajadorNombre,
          numeroIdentificacion: cert.numeroIdentificacion || '',
          cargo: cert.cargo,
          seleccionado: true,
        });
      }
      return next;
    });
    setVista('formulario');
    setMensajeEstado(
      `Editando certificado ${cert.codigoCertificado} (${cert.trabajadorNombre}). Al guardar se actualizará sin duplicarse.`
    );
  };

  const certPreviewActual = certificadosGenerados[previewIdx] || certificadosGenerados[0] || null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#b9dad3] max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        {/* Encabezado corporativo Frikaz */}
        <div className="px-5 py-3.5 bg-[#0f172a] text-white border-b-4 border-[#f97316] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-[#0f5b53] text-[#fed7aa] shrink-0">
              <Award className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#f97316] text-white font-black uppercase">
                  Certificados de Capacitación
                </span>
                <span className="text-teal-200 font-semibold truncate">
                  {contexto.nombrePlan}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                {contexto.nombreCapacitacion}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVista('formulario')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                vista === 'formulario'
                  ? 'bg-[#0f5b53] text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Diligenciar</span>
            </button>
            {certificadosGenerados.length > 0 && (
              <button
                type="button"
                onClick={() => setVista('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  vista === 'preview'
                    ? 'bg-[#f97316] text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Vista Certificado ({certificadosGenerados.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setVista('historial')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                vista === 'historial'
                  ? 'bg-[#0f5b53] text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Historial ({certificadosDeEstaCapacitacion.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Volver a capacitaciones"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8fbfa]">
          {mensajeEstado && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-emerald-900 font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{mensajeEstado}</span>
              </div>
              <button
                type="button"
                onClick={() => setMensajeEstado(null)}
                className="text-[10px] underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3.5 py-2.5 text-rose-900 font-bold flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* VISTA 1: FORMULARIO EDITABLE DE DILIGENCIAMIENTO               */}
          {/* ============================================================== */}
          {vista === 'formulario' && (
            <form onSubmit={handleGenerarYPrevisualizar} className="space-y-4">
              {/* Bloque A: Datos de la capacitación y quien certifica */}
              <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <h4 className="font-black text-sm text-[#0d3b36]">
                    1. Datos de la Capacitación y Responsable
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Cargados desde el registro existente. Puede completar o corregir antes de generar.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Nombre o tema de la capacitación *
                    </label>
                    <input
                      type="text"
                      value={temaCapacitacion}
                      onChange={(e) => setTemaCapacitacion(e.target.value)}
                      placeholder="Nombre o tema desarrollado..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Fecha de realización
                    </label>
                    <input
                      type="date"
                      value={fechaRealizacion}
                      onChange={(e) => setFechaRealizacion(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-mono"
                    />
                    {!fechaRealizacion && (
                      <span className="text-[10px] text-amber-700 block mt-0.5">
                        Si aún falta, puede diligenciarla o dejarla pendiente.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Duración en horas (si está registrada)
                    </label>
                    <input
                      type="text"
                      value={duracionHoras}
                      onChange={(e) => setDuracionHoras(e.target.value)}
                      placeholder="Ej. 2 horas (dejar vacío si no aplica)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nombre del responsable / quien dirigió
                    </label>
                    <input
                      type="text"
                      list="frikaz-responsables-cert-list"
                      value={responsableNombre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResponsableNombre(val);
                        const trabMatch = trabajadores.find(
                          (t) => t.nombreCompleto.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (trabMatch && !responsableCargo.trim()) {
                          setResponsableCargo(trabMatch.cargoNombre);
                        }
                      }}
                      placeholder="Ej. Andrea Orjuela o instructor ARL..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                    <datalist id="frikaz-responsables-cert-list">
                      {trabajadores.map((t) => (
                        <option key={t.id} value={t.nombreCompleto}>
                          {t.cargoNombre}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Cargo del responsable (si está registrado)
                    </label>
                    <input
                      type="text"
                      value={responsableCargo}
                      onChange={(e) => setResponsableCargo(e.target.value)}
                      placeholder="Ej. Gerente / Vigía SST / Instructor"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-slate-700 block mb-1">
                      Observaciones adicionales (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas adicionales para mostrar en el certificado, si se requieren..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque B: Selección individual o múltiple de trabajadores participantes */}
              <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-black text-sm text-[#0d3b36] flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0f6b61]" />
                      <span>
                        2. Seleccionar Trabajadores Participantes ({seleccionados.length} seleccionado
                        {seleccionados.length === 1 ? '' : 's'})
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Marque únicamente los trabajadores con participación confirmada. Cada seleccionado recibirá su certificado individual sin duplicados.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={busquedaTrabajador}
                      onChange={(e) => setBusquedaTrabajador(e.target.value)}
                      placeholder="Buscar trabajador o cédula..."
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-[11px] min-w-[680px]">
                    <thead>
                      <tr className="bg-[#0f172a] text-white text-[10px] uppercase">
                        <th className="p-2.5 w-16 text-center">Participó</th>
                        <th className="p-2.5">Nombre completo del trabajador</th>
                        <th className="p-2.5 w-44">N.º de identificación</th>
                        <th className="p-2.5 w-48">Cargo</th>
                        <th className="p-2.5 w-44">Estado / Historial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participantesFiltrados.map((p) => {
                        const existente = buscarCertificadoExistente(repoStore, {
                          capacitacionKey: contexto.capacitacionKey,
                          planId: contexto.planId,
                          nombreActividad: contexto.nombreCapacitacion,
                          trabajadorId: p.trabajadorId,
                          trabajadorNombre: p.nombreCompleto,
                          numeroIdentificacion: p.numeroIdentificacion,
                        });
                        return (
                          <tr
                            key={p.key}
                            className={
                              p.seleccionado ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                            }
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={p.seleccionado}
                                onChange={() => handleToggleParticipante(p.key)}
                                className="h-4 w-4 accent-[#0f5b53] cursor-pointer"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={p.nombreCompleto}
                                onChange={(e) =>
                                  handleUpdateParticipante(p.key, {
                                    nombreCompleto: e.target.value,
                                  })
                                }
                                className="w-full rounded border border-slate-200 px-2 py-1 bg-white font-bold text-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={p.numeroIdentificacion}
                                onChange={(e) =>
                                  handleUpdateParticipante(p.key, {
                                    numeroIdentificacion: e.target.value,
                                  })
                                }
                                placeholder="CC / Documento..."
                                className="w-full rounded border border-slate-200 px-2 py-1 bg-white font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={
                                  (CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(p.cargo)
                                    ? p.cargo
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdateParticipante(p.key, {
                                    cargo: e.target.value || p.cargo,
                                  })
                                }
                                className="w-full rounded border border-slate-200 px-2 py-1 bg-white font-semibold"
                              >
                                {CARGOS_OFICIALES_NOMBRES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                                {!(CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(p.cargo) && (
                                  <option value="">{p.cargo}</option>
                                )}
                              </select>
                            </td>
                            <td className="p-2 space-y-1">
                              {p.asistenciaConfirmadaEnGuia && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  <UserCheck className="h-3 w-3" />
                                  Asistió en guía
                                </span>
                              )}
                              {p.noAsistioEnGuia && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  No asistió en guía
                                </span>
                              )}
                              {existente ? (
                                <span className="block px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 font-mono font-bold text-[10px]">
                                  {existente.codigoCertificado} (se actualizará)
                                </span>
                              ) : (
                                !p.asistenciaConfirmadaEnGuia &&
                                !p.noAsistioEnGuia && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Sin certificado previo
                                  </span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>VOLVER A CAPACITACIONES</span>
                </button>

                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>
                    {procesando
                      ? 'Generando certificado(s)...'
                      : seleccionados.length > 1
                      ? `Generar y Previsualizar (${seleccionados.length} certificados)`
                      : 'Generar y Previsualizar Certificado'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* VISTA 2: PREVISUALIZACIÓN FORMAL TAMAÑO CARTA + PDF + IMPRIMIR */}
          {/* ============================================================== */}
          {vista === 'preview' && certPreviewActual && (
            <div className="space-y-4">
              {/* Barra de acciones exactas solicitadas */}
              <div className="rounded-2xl border border-[#b9dad3] bg-white p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => descargarCertificadoPdf(certPreviewActual)}
                    className="px-3.5 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>DESCARGAR EN PDF</span>
                  </button>

                  {certificadosGenerados.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        descargarCertificadosPlanPdfConjunto(
                          certificadosGenerados,
                          certPreviewActual.temaDesarrollado || contexto.nombreCapacitacion
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-[#fed7aa] font-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Descargar todos en PDF ({certificadosGenerados.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => imprimirCertificadosCarta([certPreviewActual])}
                    className="px-3.5 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>IMPRIMIR CERTIFICADO</span>
                  </button>

                  {certificadosGenerados.length > 1 && (
                    <button
                      type="button"
                      onClick={() => imprimirCertificadosCarta(certificadosGenerados)}
                      className="px-3 py-2 rounded-xl bg-[#e7f4f1] hover:bg-[#d5ece7] text-[#0d3b36] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Imprimir todos ({certificadosGenerados.length})</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVista('formulario')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>EDITAR</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>VOLVER A CAPACITACIONES</span>
                  </button>
                </div>
              </div>

              {/* Selector entre participantes si hay varios */}
              {certificadosGenerados.length > 1 && (
                <div className="rounded-xl border border-[#cce3dd] bg-[#eef6f4] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#0d3b36]">
                    Certificado individual {previewIdx + 1} de {certificadosGenerados.length}:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={previewIdx === 0}
                      onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))}
                      className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {certificadosGenerados.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPreviewIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                          previewIdx === idx
                            ? 'bg-[#0f5b53] text-white'
                            : 'bg-white text-[#0d3b36] border border-[#cfe5df]'
                        }`}
                      >
                        {c.trabajadorNombre.split(' ').slice(0, 2).join(' ')}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={previewIdx === certificadosGenerados.length - 1}
                      onClick={() =>
                        setPreviewIdx((i) => Math.min(certificadosGenerados.length - 1, i + 1))
                      }
                      className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Vista visual limpia tamaño Carta Horizontal */}
              <div className="mx-auto max-w-4xl bg-white rounded-xl shadow-lg border border-slate-300 p-4 sm:p-6">
                <div className="border-[3px] border-[#0f5b53] p-1.5 rounded-sm">
                  <div className="border border-[#f97316] p-5 sm:p-7 flex flex-col justify-between space-y-6">
                    {/* Encabezado */}
                    <div className="bg-[#f4faf8] border-b border-[#d6ebe5] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src="/frikaz_logo.jpg"
                          alt="Logo Frikaz S.A.S."
                          className="h-14 w-14 object-contain rounded-lg bg-white p-1 border border-[#d6ebe5]"
                        />
                        <div>
                          <div className="text-base sm:text-lg font-black text-[#0d3b36] tracking-wide">
                            FRIKAZ S.A.S.
                          </div>
                          <div className="text-[11px] text-[#355b56]">
                            Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) · Planta Bosa, Bogotá D.C.
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-[#0f5b53] text-xs">
                          Código: {certPreviewActual.codigoCertificado}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Emisión: {certPreviewActual.fechaEmision}
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo formal */}
                    <div className="text-center space-y-3 px-2 sm:px-6">
                      <h2 className="text-xl sm:text-3xl font-black text-[#0f5b53] tracking-wide">
                        CERTIFICADO DE PARTICIPACIÓN
                      </h2>
                      <div className="h-1 w-48 bg-[#f97316] mx-auto rounded-full" />

                      <p className="text-xs sm:text-sm text-slate-600 pt-1">
                        FRIKAZ S.A.S. hace constar y reconoce que:
                      </p>

                      <div className="text-xl sm:text-2xl font-black text-[#0f172a] uppercase">
                        {certPreviewActual.trabajadorNombre}
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-[#0f6b61]">
                        {certPreviewActual.numeroIdentificacion
                          ? `Identificación: ${certPreviewActual.numeroIdentificacion}   ·   `
                          : ''}
                        Cargo: {certPreviewActual.cargo}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed pt-1">
                        Participó en la capacitación{' '}
                        <strong className="text-[#0f172a]">
                          “{certPreviewActual.temaDesarrollado || certPreviewActual.nombreActividad}”
                        </strong>
                        , programada dentro del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) de FRIKAZ S.A.S.
                      </p>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2 max-w-2xl mx-auto">
                        <div>
                          <span className="font-black text-[#0f5b53]">Tema / Capacitación: </span>
                          <span className="text-slate-800">
                            {certPreviewActual.temaDesarrollado || certPreviewActual.nombreActividad}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="font-black text-[#0f5b53]">Fecha de realización: </span>
                            <span className="text-slate-800">
                              {certPreviewActual.fechaRealizacion || 'Pendiente de registro'}
                            </span>
                          </div>
                          <div>
                            <span className="font-black text-[#0f5b53]">Duración: </span>
                            <span className="text-slate-800">
                              {certPreviewActual.intensidadHoraria || 'No registrada'}
                            </span>
                          </div>
                        </div>
                        {certPreviewActual.observaciones && (
                          <div className="pt-1.5 border-t border-dashed border-slate-300">
                            <span className="font-black text-[#0f5b53]">Observaciones: </span>
                            <span className="text-slate-700">{certPreviewActual.observaciones}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Firma */}
                    <div className="pt-4 pb-1 flex justify-center">
                      <div className="text-center min-w-[260px]">
                        <div className="border-t border-slate-500 pt-2">
                          <div className="font-black text-slate-900 text-xs">
                            {certPreviewActual.certificadorNombre || 'Firma de quien certifica'}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {certPreviewActual.certificadorCargo || 'FRIKAZ S.A.S. · SG-SST'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-slate-500 mt-2">
                  Formato configurado para descarga e impresión en tamaño Carta (Letter). Guardado automáticamente en el Repositorio Documental.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VISTA 3: HISTORIAL DE CERTIFICADOS DE ESTA CAPACITACIÓN        */}
          {/* ============================================================== */}
          {vista === 'historial' && (
            <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-black text-sm text-[#0d3b36]">
                    Certificados guardados para esta capacitación ({certificadosDeEstaCapacitacion.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Todos los certificados quedan almacenados en el Repositorio Documental sin duplicados. Puede visualizar, descargar, imprimir o actualizar conservando el historial de cambios.
                  </p>
                </div>
                {certificadosDeEstaCapacitacion.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      descargarCertificadosPlanPdfConjunto(
                        certificadosDeEstaCapacitacion,
                        contexto.nombreCapacitacion
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Descargar lote PDF</span>
                  </button>
                )}
              </div>

              {certificadosDeEstaCapacitacion.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-slate-500">
                    Aún no se han generado certificados para esta capacitación.
                  </p>
                  <button
                    type="button"
                    onClick={() => setVista('formulario')}
                    className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                  >
                    Diligenciar primer certificado
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {certificadosDeEstaCapacitacion.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#0f5b53] text-white font-mono font-bold text-[10px]">
                            {c.codigoCertificado}
                          </span>
                          <span className="font-black text-slate-900">{c.trabajadorNombre}</span>
                          {c.numeroIdentificacion && (
                            <span className="text-[10px] font-mono text-slate-600">
                              {c.numeroIdentificacion}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                            {c.cargo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          <strong>Tema:</strong> {c.temaDesarrollado} ·{' '}
                          <strong>Fecha:</strong> {c.fechaRealizacion || 'Pendiente'}
                          {c.intensidadHoraria ? ` · Duración: ${c.intensidadHoraria}` : ''}
                        </p>
                        {c.historialCambios && c.historialCambios.length > 0 && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#f97316]" />
                            <span>
                              {c.historialCambios.length} registro(s) en historial · Último:{' '}
                              {c.historialCambios[0].accion} (
                              {new Date(c.historialCambios[0].fecha).toLocaleDateString('es-CO')})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCertificadosGenerados([c]);
                            setPreviewIdx(0);
                            setVista('preview');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => descargarCertificadoPdf(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#f97316] text-white font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-[#ea580c]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => imprimirCertificadosCarta([c])}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0f5b53] text-white font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-[#0c4842]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Imprimir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCargarParaEditar(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] text-[#fed7aa] font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
