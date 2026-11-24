import React, { useState, useMemo } from 'react';
import {
  ActividadPlanAnual,
  AccionMejoraPlan,
  DiagnosticoSaludEmpresa,
  PlanAnualVigencia,
  TrabajadorFichaSST,
} from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { CargoSST } from '../../types/organigramaSst';
import {
  coincidenCargoYRiesgo,
  construirResumenSociodemografico,
  evaluarCompletitudTrabajador,
  obtenerConexionesRiesgo,
} from '../../services/planAnualSgsstService';
import { extraerMedidasRiesgo } from '../../services/planAnualService';
import { PlanAnualTrabajadorModal } from './PlanAnualTrabajadorModal';
import {
  Users,
  HeartPulse,
  ShieldAlert,
  ClipboardCheck,
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Edit3,
  ExternalLink,
  Save,
} from 'lucide-react';
import {
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
  type EstadoEstandarFrikaz,
} from '../../services/gerenteControlService';

interface PlanAnualHacerTabProps {
  plan: PlanAnualVigencia;
  trabajadores: TrabajadorFichaSST[];
  diagnosticoSalud: DiagnosticoSaludEmpresa;
  riesgos: RiesgoGTC45Item[];
  cargos: CargoSST[];
  accionesMejora: AccionMejoraPlan[];
  accesoMedicoAutorizado: boolean;
  subTabInicial?: SubTabHacer;
  hideHeaderAndTabs?: boolean;
  onSolicitarDesbloqueoMedico: () => void;
  onSaveTrabajador: (trabajador: TrabajadorFichaSST) => void;
  onSaveDiagnosticoSalud: (diag: DiagnosticoSaludEmpresa) => void;
  onUpdateRiesgoControles: (riesgoActualizado: RiesgoGTC45Item) => void;
  onAbrirActividad: (
    act: ActividadPlanAnual,
    tab?: 'datos' | 'evidencias' | 'historial'
  ) => void;
  onEnviarRecomendacionAActuar: (trab: TrabajadorFichaSST) => void;
}

export type SubTabHacer = 'ejecucion' | 'evidencias' | 'trabajadores' | 'matriz';

export const PlanAnualHacerTab: React.FC<PlanAnualHacerTabProps> = ({
  plan,
  trabajadores,
  diagnosticoSalud,
  riesgos,
  cargos,
  accionesMejora,
  accesoMedicoAutorizado,
  subTabInicial = 'ejecucion',
  hideHeaderAndTabs = false,
  onSolicitarDesbloqueoMedico,
  onSaveTrabajador,
  onSaveDiagnosticoSalud,
  onUpdateRiesgoControles,
  onAbrirActividad,
  onEnviarRecomendacionAActuar,
}) => {
  const [subTab, setSubTab] = useState<SubTabHacer>(subTabInicial);
  const [vistaTrabajadores, setVistaTrabajadores] = useState<'fichas' | 'salud'>('fichas');
  const [filtroRespEjec, setFiltroRespEjec] = useState<string>('TODOS');
  const [filtroEstadoEjec, setFiltroEstadoEjec] = useState<string>('TODOS');

  React.useEffect(() => {
    setSubTab(subTabInicial);
  }, [subTabInicial]);
  const [busquedaTrab, setBusquedaTrab] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('TODOS');
  const [filtroEstadoFicha, setFiltroEstadoFicha] = useState<'TODOS' | 'COMPLETA' | 'PENDIENTE'>('TODOS');
  const [trabajadorModal, setTrabajadorModal] = useState<TrabajadorFichaSST | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Matriz de riesgos conectada
  const [busquedaRiesgo, setBusquedaRiesgo] = useState('');
  const [filtroNivelRiesgo, setFiltroNivelRiesgo] = useState<'TODOS' | 'I' | 'II' | 'III' | 'IV'>('TODOS');
  const [riesgoSeleccionadoId, setRiesgoSeleccionadoId] = useState<string>(riesgos[0]?.id || '');
  const [editandoMedidas, setEditandoMedidas] = useState(false);
  const [medidasForm, setMedidasForm] = useState({
    medidaControlesIngenieria: '',
    medidaControlesAdministrativos: '',
    medidaEquiposEPP: '',
  });

  // Diagnóstico de salud (Batería psicosocial y factibilidad)
  const [diagForm, setDiagForm] = useState<DiagnosticoSaludEmpresa>(diagnosticoSalud);
  const [diagGuardadoMsg, setDiagGuardadoMsg] = useState<string | null>(null);

  // Evidencias filtro
  const [filtroEstadoEv, setFiltroEstadoEv] = useState<'TODAS' | EstadoEstandarFrikaz>('TODAS');

  const resumenSociodemo = useMemo(
    () => construirResumenSociodemografico(trabajadores),
    [trabajadores]
  );

  const trabajadoresFiltrados = useMemo(() => {
    const q = busquedaTrab.trim().toLowerCase();
    return trabajadores.filter((t) => {
      const mText =
        !q ||
        t.nombreCompleto.toLowerCase().includes(q) ||
        t.numeroDocumento.toLowerCase().includes(q) ||
        t.cargoNombre.toLowerCase().includes(q) ||
        t.actividadPrincipal.toLowerCase().includes(q);
      const mCargo = filtroCargo === 'TODOS' || t.cargoNombre === filtroCargo;
      const comp = evaluarCompletitudTrabajador(t);
      const mComp =
        filtroEstadoFicha === 'TODOS'
          ? true
          : filtroEstadoFicha === 'COMPLETA'
          ? comp.completa
          : !comp.completa;
      return mText && mCargo && mComp;
    });
  }, [trabajadores, busquedaTrab, filtroCargo, filtroEstadoFicha]);

  const riesgosFiltrados = useMemo(() => {
    const q = busquedaRiesgo.trim().toLowerCase();
    return riesgos.filter((r) => {
      const mNivel = filtroNivelRiesgo === 'TODOS' || r.interpretacionNR === filtroNivelRiesgo;
      const mQ =
        !q ||
        (r.codigo || '').toLowerCase().includes(q) ||
        r.peligroDescripcion.toLowerCase().includes(q) ||
        (r.cargo || r.cargosExpuestos || '').toLowerCase().includes(q) ||
        r.proceso.toLowerCase().includes(q);
      return mNivel && mQ;
    });
  }, [riesgos, filtroNivelRiesgo, busquedaRiesgo]);

  const riesgoActivo = useMemo(
    () => riesgos.find((r) => r.id === riesgoSeleccionadoId) || riesgosFiltrados[0] || riesgos[0],
    [riesgos, riesgoSeleccionadoId, riesgosFiltrados]
  );

  const conexionesRiesgoActivo = useMemo(() => {
    if (!riesgoActivo) {
      return { trabajadoresRelacionados: [], actividadesPlan: [], evidenciasPlan: [], acciones: [] };
    }
    return obtenerConexionesRiesgo(riesgoActivo, trabajadores, plan, accionesMejora);
  }, [riesgoActivo, trabajadores, plan, accionesMejora]);

  const todasEvidencias = useMemo(() => {
    const lista = plan.actividades.flatMap((act) =>
      act.evidencias.map((ev) => ({ act, ev }))
    );
    return lista.filter((item) =>
      filtroEstadoEv === 'TODAS'
        ? true
        : normalizarEstadoEstandar(item.ev.estadoRevision) === filtroEstadoEv
    );
  }, [plan.actividades, filtroEstadoEv]);

  const handleNuevoTrabajador = () => {
    const defCargo = cargos[2] || cargos[0];
    setTrabajadorModal({
      id: `trab-${Date.now()}`,
      estadoLaboral: 'ACTIVO',
      nombreCompleto: '',
      tipoDocumento: 'CC',
      numeroDocumento: '',
      fechaNacimiento: '',
      sexo: 'Femenino',
      estadoCivil: 'Soltero(a)',
      escolaridad: 'Bachiller',
      localidadResidencia: 'Bosa, Bogotá',
      telefono: '',
      correo: 'frikaz.fritosnacks@gmail.com',
      cargoId: defCargo?.id || 'cargo-operario-seleccion',
      cargoNombre: defCargo?.nombre || 'Operario de Selección',
      areaProceso: defCargo?.areaProceso || 'Planta de Producción',
      actividadPrincipal: '',
      tipoContrato: 'Fijo',
      fechaIngreso: new Date().toISOString().split('T')[0],
      turnoHorario: 'Lunes a Sábado 6:00 a.m. - 2:30 p.m.',
      eps: '',
      arl: 'Positiva ARL',
      afp: '',
      consumoTabaco: 'Pendiente',
      consumoAlcohol: 'Pendiente',
      otrasSustancias: 'Ninguna',
      actividadFisica: 'Pendiente',
      nutricionHabitos: '',
      morbilidadSentida: '',
      enfermedadesDiagnosticadas: '',
      tieneEnfermedadLaboralCalificada: false,
      tipoUltimoExamen: 'Pendiente',
      fechaUltimoExamen: '',
      conceptoAptitud: 'Pendiente',
      audiometria: { estado: 'PENDIENTE' },
      visiometria: { estado: 'PENDIENTE' },
      optometria: { estado: 'NO_APLICA' },
      espirometria: { estado: 'NO_APLICA' },
      laboratorio: { estado: 'PENDIENTE' },
      recomendacionesSaludOcupacional: '',
      prioridadIntervencion: 'NINGUNA',
      necesidadIntervencion: '',
      seguimientoMedico: '',
      fechaActualizacion: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Navegación interna de Ejecución y Personal (oculta cuando PlanAnualView controla las secciones) */}
      {!hideHeaderAndTabs && (
      <div className="rounded-2xl border border-[#c3dfd8] bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0d3b36]">
              Actividades, Evidencias y Personal
            </h3>
            <p className="text-[11px] text-slate-500">
              Registre avances y soportes de las tareas programadas, consulte la información de los trabajadores y verifique controles por puesto.
            </p>
          </div>
          <button
            type="button"
            onClick={onSolicitarDesbloqueoMedico}
            className={`px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer border ${
              accesoMedicoAutorizado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {accesoMedicoAutorizado ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>
              {accesoMedicoAutorizado ? 'Salud Desbloqueada' : 'Privacidad Médica'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'ejecucion', label: 'Actividades y avances', badge: plan.actividades.length, icon: ClipboardCheck },
            { id: 'evidencias', label: 'Evidencias subidas', badge: todasEvidencias.length, icon: FileCheck2 },
            { id: 'trabajadores', label: 'Trabajadores y salud', badge: trabajadores.length, icon: Users },
            { id: 'matriz', label: 'Riesgos del puesto', badge: riesgos.length, icon: ShieldAlert },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as SubTabHacer)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center justify-between gap-1.5 border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                    : 'bg-[#f4faf8] text-slate-700 border-[#d6ebe5] hover:bg-[#e5f3ef]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#f97316]'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-mono tabular-nums text-[10px]">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* =================================================================== */}
      {/* TRABAJADORES Y SALUD AGRUPADA                                       */}
      {/* =================================================================== */}
      {subTab === 'trabajadores' && (
        <div className="space-y-4">
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1 gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setVistaTrabajadores('fichas')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                vistaTrabajadores === 'fichas'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Listado de trabajadores ({trabajadores.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaTrabajadores('salud')}
              className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                vistaTrabajadores === 'salud'
                  ? 'bg-[#0f172a] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5" />
              <span>Condiciones de salud y encuesta ({resumenSociodemo.totalActivos} activos)</span>
            </button>
          </div>

          {vistaTrabajadores === 'fichas' && (
          <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busquedaTrab}
                  onChange={(e) => setBusquedaTrab(e.target.value)}
                  placeholder="Buscar por nombre, cédula o cargo..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="TODOS">Todos los cargos</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                value={filtroEstadoFicha}
                onChange={(e) => setFiltroEstadoFicha(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="TODOS">Todas las fichas</option>
                <option value="COMPLETA">Fichas completas (100%)</option>
                <option value="PENDIENTE">Con datos pendientes</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleNuevoTrabajador}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Nuevo Trabajador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {trabajadoresFiltrados.map((t) => {
              const comp = evaluarCompletitudTrabajador(t);
              const riesgosPuesto = riesgos.filter((r) => coincidenCargoYRiesgo(t.cargoNombre, r));
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-bold text-[10px]">
                          {t.cargoNombre}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                            comp.completa
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {comp.completa ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {comp.porcentaje}% Completo
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1">{t.nombreCompleto}</h4>
                      <p className="text-[11px] text-slate-500">
                        {t.tipoDocumento} {t.numeroDocumento} · {t.tipoContrato} · Ingreso: {t.fechaIngreso}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTrabajadorModal(t);
                        setModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Ver / Editar</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong>Qué hace:</strong> {t.actividadPrincipal || 'Sin actividad registrada'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-600">
                      <strong>Seguridad Social:</strong> {t.eps || 'Falta EPS'} · {t.arl || 'Falta ARL'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-900 font-bold">
                      {riesgosPuesto.length} peligro(s) GTC 45 en su puesto
                    </span>
                  </div>

                  {!comp.completa && (
                    <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                      <strong>Pendiente:</strong> {comp.pendientes.join(', ')}
                    </div>
                  )}

                  {accesoMedicoAutorizado ? (
                    <div className="text-[11px] text-slate-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                      <span>
                        <strong>Último examen ({t.tipoUltimoExamen}):</strong> {t.conceptoAptitud} · Prioridad: {t.prioridadIntervencion}
                      </span>
                      {t.prioridadIntervencion === 'ALTA' && (
                        <button
                          type="button"
                          onClick={() => onEnviarRecomendacionAActuar(t)}
                          className="text-[#f97316] font-black hover:underline shrink-0 cursor-pointer"
                        >
                          Registrar acción de mejora →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-100 p-2 rounded-lg flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-rose-600" />
                      <span>Diagnósticos, exámenes y hábitos ocultos por privacidad médica.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
          )}

          {vistaTrabajadores === 'salud' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-[#0f172a]">
                  Perfil de Personas y Resumen General de Salud (Datos Agrupados sin Nombres)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Se calcula automáticamente leyendo las fichas de los {resumenSociodemo.totalActivos} trabajadores activos, cuidando la confidencialidad médica individual.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                Afiliaciones completas: {resumenSociodemo.afiliacionCompleta}/{resumenSociodemo.totalActivos}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Trabajadores Activos</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{resumenSociodemo.totalActivos}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Fichas al 100%</span>
                <span className="text-2xl font-black text-emerald-900 font-mono">{resumenSociodemo.completos}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Con Pruebas Pendientes</span>
                <span className="text-2xl font-black text-amber-950 font-mono">{resumenSociodemo.pruebasPendientes}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Prioridad Alta de Cuidado</span>
                <span className="text-2xl font-black text-rose-900 font-mono">{resumenSociodemo.conRecomendacionAlta}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { titulo: 'Por Sexo', data: resumenSociodemo.porSexo },
                { titulo: 'Por Rango de Edad', data: resumenSociodemo.porEdad },
                { titulo: 'Por Tipo de Contrato', data: resumenSociodemo.porContrato },
                { titulo: 'Molestias Reportadas por Área (Anónimo)', data: resumenSociodemo.molestiasPorArea },
              ].map((grupo) => (
                <div key={grupo.titulo} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <h5 className="font-black text-slate-800">{grupo.titulo}</h5>
                  {Object.keys(grupo.data).length === 0 ? (
                    <p className="text-[11px] text-slate-400">Sin registros aún</p>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(grupo.data).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 truncate pr-2">{k}</span>
                          <span className="font-mono font-black text-[#0f172a] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Batería de riesgo psicosocial y análisis de factibilidad */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveDiagnosticoSalud(diagForm);
              setDiagGuardadoMsg('Información de bienestar emocional y factibilidad guardada correctamente.');
              setTimeout(() => setDiagGuardadoMsg(null), 3500);
            }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-[#0f172a]">
                  Encuesta de Bienestar en el Trabajo (Batería Psicosocial) y Análisis por Actividad ({diagForm.anio})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Mide cómo se sienten los trabajadores con la carga de trabajo, horarios y ambiente, y analiza qué mejoras son viables en Frikaz S.A.S.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Guardar Diagnóstico</span>
              </button>
            </div>

            {diagGuardadoMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold">
                {diagGuardadoMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Estado encuesta psicosocial</label>
                <select
                  value={diagForm.bateriaPsicosocial.estado}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      bateriaPsicosocial: { ...diagForm.bateriaPsicosocial, estado: e.target.value as any },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="REALIZADA">Realizada</option>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha aplicación</label>
                <input
                  type="date"
                  value={diagForm.bateriaPsicosocial.fechaAplicacion}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      bateriaPsicosocial: { ...diagForm.bateriaPsicosocial, fechaAplicacion: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Riesgo dentro del trabajo</label>
                <select
                  value={diagForm.bateriaPsicosocial.nivelRiesgoIntralaboral}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      bateriaPsicosocial: {
                        ...diagForm.bateriaPsicosocial,
                        nivelRiesgoIntralaboral: e.target.value as any,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="Sin riesgo / Despreciable">Sin riesgo / Despreciable</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                  <option value="Muy Alto">Muy Alto</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nivel de estrés general</label>
                <select
                  value={diagForm.bateriaPsicosocial.nivelEstres}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      bateriaPsicosocial: {
                        ...diagForm.bateriaPsicosocial,
                        nivelEstres: e.target.value as any,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="Muy bajo">Muy bajo</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                  <option value="Muy alto">Muy alto</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Observaciones de la encuesta psicosocial
                </label>
                <textarea
                  rows={2}
                  value={diagForm.bateriaPsicosocial.observacionesGenerales}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      bateriaPsicosocial: {
                        ...diagForm.bateriaPsicosocial,
                        observacionesGenerales: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Análisis de factibilidad por actividad económica y grupos de trabajo
                </label>
                <textarea
                  rows={2}
                  value={diagForm.analisisFactibilidad.conclusionesFactibilidad}
                  onChange={(e) =>
                    setDiagForm({
                      ...diagForm,
                      analisisFactibilidad: {
                        ...diagForm.analisisFactibilidad,
                        conclusionesFactibilidad: e.target.value,
                        fechaActualizacion: new Date().toISOString().split('T')[0],
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                />
              </div>
            </div>
          </form>
        </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* C. MATRIZ DE PELIGROS Y RIESGOS CONECTADA (SIN DUPLICAR)            */}
      {/* =================================================================== */}
      {subTab === 'matriz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div>
              <h4 className="font-black text-[#0f172a]">
                Matriz Oficial de Riesgos GTC 45 ({riesgos.length} registros)
              </h4>
              <p className="text-[11px] text-slate-500">
                Es la misma matriz de la herramienta. Al elegir un riesgo verá qué trabajadores, tareas y mejoras están conectados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={busquedaRiesgo}
                  onChange={(e) => setBusquedaRiesgo(e.target.value)}
                  placeholder="Filtrar por cargo, área o peligro..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 text-xs"
                />
              </div>
              <select
                value={filtroNivelRiesgo}
                onChange={(e) => setFiltroNivelRiesgo(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white font-bold"
              >
                <option value="TODOS">Todos niveles</option>
                <option value="I">Nivel I (Crítico)</option>
                <option value="II">Nivel II (Alto)</option>
                <option value="III">Nivel III (Medio)</option>
                <option value="IV">Nivel IV (Bajo)</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {riesgosFiltrados.map((r) => {
                const selected = riesgoActivo?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRiesgoSeleccionadoId(r.id);
                      setEditandoMedidas(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#0f172a] text-white border-[#0f172a]'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-[10px] opacity-80">
                        {r.codigo || r.id} · {r.cargo || r.cargosExpuestos}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          r.interpretacionNR === 'I'
                            ? 'bg-rose-600 text-white'
                            : r.interpretacionNR === 'II'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-200 text-slate-900'
                        }`}
                      >
                        Nivel {r.interpretacionNR}
                      </span>
                    </div>
                    <p className="font-bold mt-1 line-clamp-2">{r.peligroDescripcion}</p>
                    <span className="text-[10px] opacity-75 block mt-0.5">{r.proceso}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            {riesgoActivo ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-950 font-mono font-black text-[10px]">
                      {riesgoActivo.codigo || riesgoActivo.id} · Nivel {riesgoActivo.interpretacionNR} ({riesgoActivo.nivelRiesgo} pts)
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {riesgoActivo.peligroDescripcion}
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      <strong>Cargo y actividad:</strong> {riesgoActivo.cargo || riesgoActivo.cargosExpuestos} · {riesgoActivo.proceso} ({riesgoActivo.actividades})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMedidasForm({
                        medidaControlesIngenieria: riesgoActivo.medidaControlesIngenieria || '',
                        medidaControlesAdministrativos: riesgoActivo.medidaControlesAdministrativos || '',
                        medidaEquiposEPP: riesgoActivo.medidaEquiposEPP || '',
                      });
                      setEditandoMedidas(!editandoMedidas);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{editandoMedidas ? 'Cancelar' : 'Actualizar Medidas'}</span>
                  </button>
                </div>

                {editandoMedidas ? (
                  <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                    <p className="text-[11px] text-orange-950">
                      Los cambios se guardan en la Matriz GTC 45 oficial sin modificar automáticamente tareas que ya fueron aprobadas en el Plan Anual.
                    </p>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ajustes en máquina o lugar (Ingeniería)</label>
                      <input
                        type="text"
                        value={medidasForm.medidaControlesIngenieria}
                        onChange={(e) =>
                          setMedidasForm({ ...medidasForm, medidaControlesIngenieria: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Reglas, horarios y capacitación</label>
                      <input
                        type="text"
                        value={medidasForm.medidaControlesAdministrativos}
                        onChange={(e) =>
                          setMedidasForm({ ...medidasForm, medidaControlesAdministrativos: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Elementos de Protección Personal (EPP)</label>
                      <input
                        type="text"
                        value={medidasForm.medidaEquiposEPP}
                        onChange={(e) =>
                          setMedidasForm({ ...medidasForm, medidaEquiposEPP: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateRiesgoControles({
                          ...riesgoActivo,
                          ...medidasForm,
                        });
                        setEditandoMedidas(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#f97316] text-white font-black cursor-pointer"
                    >
                      Guardar en Matriz Oficial
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                    <strong>Medidas de prevención y control:</strong> {extraerMedidasRiesgo(riesgoActivo)}
                  </div>
                )}

                {/* Conexión completa: Trabajadores + Actividades Plan + Evidencias + Acciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-black text-slate-900">
                      Trabajadores expuestos por su cargo ({conexionesRiesgoActivo.trabajadoresRelacionados.length})
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Relación laboral por puesto de trabajo (no muestra datos médicos privados).
                    </p>
                    <div className="space-y-1">
                      {conexionesRiesgoActivo.trabajadoresRelacionados.map((tw) => (
                        <div key={tw.id} className="text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                          <span className="font-bold text-slate-800">{tw.nombreCompleto}</span>
                          <span className="text-[10px] text-slate-500">{tw.cargoNombre}</span>
                        </div>
                      ))}
                      {conexionesRiesgoActivo.trabajadoresRelacionados.length === 0 && (
                        <p className="text-[11px] text-slate-400">Ningún trabajador activo asignado a este cargo aún.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-black text-slate-900">
                      Actividades del Plan Anual conectadas ({conexionesRiesgoActivo.actividadesPlan.length})
                    </h5>
                    <div className="space-y-1.5">
                      {conexionesRiesgoActivo.actividadesPlan.map((act) => (
                        <div key={act.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-[10px] text-[#f97316] block">
                              {act.codigo} · {normalizarEstadoEstandar(act.estado)}
                            </span>
                            <p className="font-bold text-slate-800 truncate">{act.nombre}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAbrirActividad(act, 'datos')}
                            className="p-1.5 rounded bg-[#0f172a] text-white cursor-pointer shrink-0"
                            title="Abrir ficha de actividad"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {conexionesRiesgoActivo.actividadesPlan.length === 0 && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg">
                          Este riesgo aún no tiene tarea en el Plan Anual. Puede programarla desde Riesgos y normas o Actividades.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <h5 className="font-black text-slate-900">
                      Evidencias disponibles ({conexionesRiesgoActivo.evidenciasPlan.length})
                    </h5>
                    {conexionesRiesgoActivo.evidenciasPlan.map((ev) => (
                      <div key={ev.id} className="text-[11px] bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                        <strong className="text-emerald-950">{ev.nombreArchivo}</strong>
                        <span className="block text-[10px] text-emerald-800">
                          {ev.actividadCodigo} · Estado: {normalizarEstadoEstandar(ev.estadoRevision)}
                        </span>
                      </div>
                    ))}
                    {conexionesRiesgoActivo.evidenciasPlan.length === 0 && (
                      <p className="text-[11px] text-slate-400">Sin soportes subidos para este riesgo todavía.</p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <h5 className="font-black text-slate-900">
                      Acciones de mejora vinculadas ({conexionesRiesgoActivo.acciones.length})
                    </h5>
                    {conexionesRiesgoActivo.acciones.map((acm) => (
                      <div key={acm.id} className="text-[11px] bg-orange-50/70 p-2 rounded-lg border border-orange-200">
                        <strong className="text-orange-950">{acm.codigo} ({normalizarEstadoEstandar(acm.estado)})</strong>
                        <p className="text-slate-700">{acm.actividadARealizar}</p>
                      </div>
                    ))}
                    {conexionesRiesgoActivo.acciones.length === 0 && (
                      <p className="text-[11px] text-slate-400">Sin acciones correctivas o preventivas abiertas.</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Seleccione un riesgo de la lista para ver sus conexiones.</p>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* EJECUCIÓN DE ACTIVIDADES PROGRAMADAS                                */}
      {/* =================================================================== */}
      {subTab === 'ejecucion' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-[#0f172a]">
                Actividades programadas y avances — {plan.vigencia}
              </h4>
              <p className="text-[11px] text-slate-500">
                Consulte el responsable de cada actividad, registre avances realizados y suba evidencias de cumplimiento.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroRespEjec}
                onChange={(e) => setFiltroRespEjec(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-bold"
              >
                <option value="TODOS">Todos los responsables</option>
                {Array.from(new Set(plan.actividades.map((a) => a.responsableNombre))).map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
              <select
                value={filtroEstadoEjec}
                onChange={(e) => setFiltroEstadoEjec(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-bold"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="Por hacer">Por hacer</option>
                <option value="En proceso">En proceso</option>
                <option value="Pendiente de revisión">Pendiente de revisión</option>
                <option value="Devuelto para ajustes">Devuelto para ajustes</option>
                <option value="Cumplido">Cumplido</option>
                <option value="Aprobado">Aprobado</option>
              </select>
            </div>
          </div>
          <div className="space-y-2.5">
            {plan.actividades
              .filter((act) => {
                const mResp = filtroRespEjec === 'TODOS' || act.responsableNombre === filtroRespEjec;
                const mEst =
                  filtroEstadoEjec === 'TODOS' ||
                  normalizarEstadoEstandar(act.estado) === filtroEstadoEjec;
                return mResp && mEst;
              })
              .map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#0f172a] text-white font-mono font-bold text-[10px]">
                      {act.codigo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border font-black text-[10px] ${getBadgeClassesEstadoFrikaz(act.estado).light}`}
                    >
                      {getBadgeClassesEstadoFrikaz(act.estado).label}
                    </span>
                    {act.riesgoCodigo && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-bold text-[10px]">
                        Riesgo {act.riesgoCodigo} (Nivel {act.riesgoNivelNR})
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">{act.nombre}</p>
                  <p className="text-[11px] text-slate-600">
                    Responsable: <strong>{act.responsableNombre}</strong> · Fecha límite: {act.fechaLimite} · Evidencias: {act.evidencias.length}
                  </p>
                  {act.resultadoActividad && (
                    <p className="text-[11px] text-emerald-800">
                      <strong>Avance registrado:</strong> {act.resultadoActividad}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAbrirActividad(act, 'datos')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Registrar avance
                  </button>
                  <button
                    type="button"
                    onClick={() => onAbrirActividad(act, 'evidencias')}
                    className="px-3 py-1.5 rounded-lg bg-[#f97316] text-white font-bold hover:bg-[#ea580c] cursor-pointer"
                  >
                    Subir evidencia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* E. EVIDENCIAS DE EJECUCIÓN ORGANIZADAS                              */}
      {/* =================================================================== */}
      {subTab === 'evidencias' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-[#0f172a]">
                Archivo Organizado de Evidencias (por Actividad)
              </h4>
              <p className="text-[11px] text-slate-500">
                Cada fotografía, acta, factura o certificado queda guardado dentro de su actividad correspondiente.
              </p>
            </div>
            <select
              value={filtroEstadoEv}
              onChange={(e) => setFiltroEstadoEv(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white font-bold"
            >
              <option value="TODAS">Todos los estados</option>
              <option value="Pendiente de revisión">Pendiente de revisión</option>
              <option value="Devuelto para ajustes">Devuelto para ajustes</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Cumplido">Cumplido</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {todasEvidencias.map(({ act, ev }) => {
              const badgeEv = getBadgeClassesEstadoFrikaz(ev.estadoRevision);
              return (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#fed7aa] font-mono font-bold text-[10px]">
                      {act.codigo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                      {ev.tipoSoporte}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badgeEv.light}`}
                    >
                      {badgeEv.label}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{ev.nombreArchivo}</p>
                  <p className="text-[11px] text-slate-600">
                    {ev.descripcionSoporte} · Actividad: <strong>{act.nombre}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAbrirActividad(act, 'evidencias')}
                  className="px-3 py-1.5 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  Abrir Soporte en Actividad
                </button>
              </div>
              );
            })}
            {todasEvidencias.length === 0 && (
              <p className="text-slate-500 text-center py-6">
                No hay evidencias con el filtro seleccionado.
              </p>
            )}
          </div>
        </div>
      )}

      <PlanAnualTrabajadorModal
        isOpen={modalOpen}
        trabajador={trabajadorModal}
        cargos={cargos}
        riesgos={riesgos}
        accesoMedicoAutorizado={accesoMedicoAutorizado}
        onSolicitarDesbloqueoMedico={onSolicitarDesbloqueoMedico}
        onClose={() => {
          setModalOpen(false);
          setTrabajadorModal(null);
        }}
        onSave={onSaveTrabajador}
      />
    </div>
  );
};
