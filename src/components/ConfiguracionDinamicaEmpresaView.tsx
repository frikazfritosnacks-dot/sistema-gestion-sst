import React, { useState, useMemo } from 'react';
import {
  CaracterizacionEmpresaDinamica,
  ModalidadContrato,
  SectorEconomico,
  ClaseRiesgoLaboral,
  ModalidadTrabajo,
  ResumenEvaluacionImpacto,
  PropuestaCambioNorma,
  RegistroHistorialCambio,
} from '../types/dynamicConfig';
import { NormaPhvaItem, IndicadoresAutomaticos } from '../types/phvaEvidence';
import {
  CONFIGURACION_FRIKAZ_INICIAL,
  getCaracterizacionActual,
  saveCaracterizacion,
  evaluarImpactoCambio,
  aplicarPropuestasANormas,
  getHistorialCambios,
  registrarEnHistorial,
} from '../services/dynamicRulesEngine';
import {
  Building2,
  Users,
  Shield,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  FileSpreadsheet,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Info,
  Scale,
  Award,
  Factory,
  HelpCircle,
  Clock,
  Eye,
  Activity,
  Crown,
  FileText,
  Users2,
  Inbox,
  Mail,
} from 'lucide-react';
import { OrganigramaInteractivoView } from './configuracion-dinamica/OrganigramaInteractivoView';
import { PoliticaSstView } from './configuracion-dinamica/PoliticaSstView';
import { PartesInteresadasView } from './configuracion-dinamica/partes-interesadas/PartesInteresadasView';
import { DocumentosFirmadosRecibidosView } from './configuracion-dinamica/documentos-firmados/DocumentosFirmadosRecibidosView';

export type SubcategoriaConfiguracionDinamica =
  | 'organigrama'
  | 'politicas'
  | 'partes_interesadas'
  | 'documentos_firmados'
  | 'caracterizacion';

interface ConfiguracionDinamicaEmpresaViewProps {
  normas: NormaPhvaItem[];
  indicadores: IndicadoresAutomaticos;
  onActualizarNormas: (normasActualizadas: NormaPhvaItem[]) => void;
  onOpenNormaModal: (norma: NormaPhvaItem) => void;
  onOpenMatrizExcel: () => void;
}

export const ConfiguracionDinamicaEmpresaView: React.FC<
  ConfiguracionDinamicaEmpresaViewProps
> = ({
  normas,
  indicadores,
  onActualizarNormas,
  onOpenNormaModal,
  onOpenMatrizExcel,
}) => {
  // Subcategoría activa dentro de Configuración Dinámica (Organigrama, Políticas, Caracterización)
  const [subcategoriaActiva, setSubcategoriaActiva] = useState<SubcategoriaConfiguracionDinamica>('organigrama');

  // Estado de la caracterización empresarial viva
  const [config, setConfig] = useState<CaracterizacionEmpresaDinamica>(() =>
    getCaracterizacionActual()
  );

  // Copia de respaldo anterior para calcular diferencias al instante
  const [configAnterior, setConfigAnterior] = useState<CaracterizacionEmpresaDinamica>(() =>
    getCaracterizacionActual()
  );

  // Evaluación de impacto activa
  const [evaluacionActual, setEvaluacionActual] = useState<ResumenEvaluacionImpacto | null>(() => {
    const actual = getCaracterizacionActual();
    return evaluarImpactoCambio(actual, actual, normas, 'Encargado SST Frikaz');
  });

  // Modal de revisión de propuestas
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [activeRevisionTab, setActiveRevisionTab] = useState<
    'TODAS' | 'NUEVAS' | 'REVISION' | 'MODIFICADAS' | 'PENDIENTES' | 'ESTABLES'
  >('TODAS');

  // Historial de auditoría
  const [historial, setHistorial] = useState<RegistroHistorialCambio[]>(() =>
    getHistorialCambios()
  );
  const [showHistorialModal, setShowHistorialModal] = useState(false);

  // Feedback de éxito
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Propuestas en evaluación editable
  const [propuestasEditables, setPropuestasEditables] = useState<PropuestaCambioNorma[]>(
    () => evaluacionActual?.propuestas || []
  );

  // Sincronizar evaluación cuando cambia la configuración
  const ejecutarEvaluacionAutomatica = (
    nuevaConfig: CaracterizacionEmpresaDinamica,
    anteriorCfg: CaracterizacionEmpresaDinamica = config
  ) => {
    const impacto = evaluarImpactoCambio(
      anteriorCfg,
      nuevaConfig,
      normas,
      'Encargado SST Frikaz'
    );
    setEvaluacionActual(impacto);
    setPropuestasEditables(impacto.propuestas);
    saveCaracterizacion(nuevaConfig);
  };

  // Handler para cambios de trabajadores
  const handleCambioTrabajadores = (nuevoValor: number) => {
    const clamp = Math.max(1, Math.min(500, nuevoValor));
    const ant = { ...config };
    const nueva = { ...config, numeroTrabajadores: clamp };
    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
  };

  // Handler para modalidades de contrato
  const handleToggleModalidadContrato = (modalidad: ModalidadContrato) => {
    const ant = { ...config };
    const existe = config.modalidadesContrato.includes(modalidad);
    const nuevasModalidades = existe
      ? config.modalidadesContrato.filter((m) => m !== modalidad)
      : [...config.modalidadesContrato, modalidad];

    // Mantener al menos 1 modalidad
    if (nuevasModalidades.length === 0) return;

    const nueva = { ...config, modalidadesContrato: nuevasModalidades };
    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
  };

  // Handler para sector económico
  const handleCambioSector = (sector: SectorEconomico) => {
    const ant = { ...config };
    let ciiu = config.ciiuPrincipal;
    let actividad = config.actividadEconomicaConcreta;

    if (sector === 'secundario') {
      ciiu = '1089 - Elaboración de otros productos alimenticios n.c.p. (Snacks fritos)';
      actividad =
        'Preparación y venta de snacks fritos (papas, plátanos y chicharrones)';
    } else if (sector === 'terciario') {
      ciiu = '4630 - Comercio al por mayor de alimentos, bebidas y tabaco';
      actividad = 'Reparto y venta de alimentos empacados';
    } else if (sector === 'primario') {
      ciiu = '0119 - Cultivo de otros cultivos no perennes (Tubérculos y plátano)';
      actividad = 'Cultivo y cosecha de papa y plátano en el campo';
    }

    const nueva = {
      ...config,
      sectorEconomico: sector,
      ciiuPrincipal: ciiu,
      actividadEconomicaConcreta: actividad,
    };
    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
  };

  // Handler para clase de riesgo
  const handleCambioRiesgo = (riesgo: ClaseRiesgoLaboral) => {
    const ant = { ...config };
    const nueva = { ...config, claseRiesgoSST: riesgo };
    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
  };

  // Handler para alternar procesos, maquinaria o sustancias
  const handleToggleChip = (
    campo: 'procesosProductivos' | 'maquinariaEquipos' | 'sustanciasQuimicas',
    item: string
  ) => {
    const ant = { ...config };
    const listaActual = [...config[campo]];
    const index = listaActual.indexOf(item);
    if (index >= 0) {
      listaActual.splice(index, 1);
    } else {
      listaActual.push(item);
    }
    const nueva = { ...config, [campo]: listaActual };
    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
  };

  // APROBAR O RECHAZAR UNA PROPUESTA ESPECÍFICA
  const handleAccionPropuesta = (
    propuestaId: string,
    accion: 'APROBAR' | 'RECHAZAR'
  ) => {
    setPropuestasEditables((prev) =>
      prev.map((p) => {
        if (p.id === propuestaId) {
          return {
            ...p,
            estadoPropuesta: accion === 'APROBAR' ? 'APROBADA' : 'RECHAZADA',
            decisionUsuario: {
              accion,
              fecha: new Date().toISOString(),
              responsable: 'Encargado SST Frikaz',
              justificacion:
                accion === 'APROBAR'
                  ? 'Aprobado luego de revisar que sí aplica en la planta.'
                  : 'Descartado porque no aplica a nuestra forma de trabajo actual.',
            },
          };
        }
        return p;
      })
    );
  };

  // APLICAR TODAS LAS PROPUESTAS APROBADAS A LAS 74 NORMAS Y REGISTRAR EN HISTORIAL
  const handleAplicarCambiosDefinitivos = () => {
    if (!evaluacionActual) return;

    const propuestasParaAplicar = propuestasEditables.filter(
      (p) => p.estadoPropuesta === 'APROBADA' || p.estadoPropuesta === 'PENDIENTE'
    );

    const { normasActualizadas, conteoActualizadas } = aplicarPropuestasANormas(
      normas,
      propuestasParaAplicar,
      config,
      'Encargado SST Frikaz'
    );

    // Actualizar estado general en App
    onActualizarNormas(normasActualizadas);

    // Registrar en Historial Inmutable
    const aprobadas = propuestasParaAplicar.length;
    const rechazadas = propuestasEditables.filter(
      (p) => p.estadoPropuesta === 'RECHAZADA'
    ).length;

    const registro: RegistroHistorialCambio = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      usuario: 'Encargado SST Frikaz',
      caracteristicaModificada: evaluacionActual.variableModificada,
      valorAnterior: JSON.stringify(evaluacionActual.valorAnterior).slice(0, 80),
      valorNuevo: JSON.stringify(evaluacionActual.valorNuevo).slice(0, 80),
      cantidadNormasReevaluadas: evaluacionActual.totalNormasEvaluadas,
      resumenResultado: evaluacionActual.resumenEjecutivo,
      propuestasGeneradas: evaluacionActual.propuestas.length,
      propuestasAprobadas: aprobadas,
      propuestasRechazadas: rechazadas,
      estadoFinal:
        aprobadas > 0 ? (rechazadas > 0 ? 'APLICADO_PARCIAL' : 'APLICADO_TOTAL') : 'RECHAZADO',
    };

    registrarEnHistorial(registro);
    setHistorial(getHistorialCambios());

    // Actualizar config anterior de referencia
    setConfigAnterior({ ...config });
    saveCaracterizacion(config);

    setMensajeExito(
      `¡Listo! Se actualizaron ${conteoActualizadas} reglas en el Ciclo PHVA y en la Lista de Normas.`
    );
    setTimeout(() => setMensajeExito(null), 5000);
    setIsRevisionModalOpen(false);
  };

  // EJECUCIÓN DIRECTA DE LOS ESCENARIOS DE PRUEBA EXIGIDOS
  const handleEjecutarPruebaControlada = (escenario: number) => {
    const ant = { ...config };
    let nueva: CaracterizacionEmpresaDinamica = { ...config };

    if (escenario === 1) {
      // 1. Cambiar de 10 a 15 trabajadores
      nueva = {
        ...nueva,
        numeroTrabajadores: 15,
      };
    } else if (escenario === 2) {
      // 2. Cambiar de 15 a 8 trabajadores
      nueva = {
        ...nueva,
        numeroTrabajadores: 8,
      };
    } else if (escenario === 3) {
      // 3. Seleccionar varias modalidades de contrato
      nueva = {
        ...nueva,
        modalidadesContrato: ['indefinido', 'aprendizaje', 'servicios'],
      };
    } else if (escenario === 4) {
      // 4. Cambiar a 55 trabajadores (Escenario de 60 estándares completos)
      nueva = {
        ...nueva,
        numeroTrabajadores: 55,
        claseRiesgoSST: 'Clase III (Medio)',
      };
    } else if (escenario === 5) {
      // 5. Restablecer línea base inicial Frikaz S.A.S.
      nueva = { ...CONFIGURACION_FRIKAZ_INICIAL };
    }

    setConfig(nueva);
    ejecutarEvaluacionAutomatica(nueva, ant);
    setIsRevisionModalOpen(true);
  };

  // Filtrado de propuestas en el modal
  const propuestasFiltradas = useMemo(() => {
    if (activeRevisionTab === 'TODAS') return propuestasEditables;
    if (activeRevisionTab === 'NUEVAS')
      return propuestasEditables.filter((p) => p.categoriaAlerta === 'NORMA_NUEVA_APLICABLE');
    if (activeRevisionTab === 'REVISION')
      return propuestasEditables.filter((p) => p.categoriaAlerta === 'REVISION_APLICABILIDAD');
    if (activeRevisionTab === 'MODIFICADAS')
      return propuestasEditables.filter((p) => p.categoriaAlerta === 'OBLIGACION_MODIFICADA');
    if (activeRevisionTab === 'PENDIENTES')
      return propuestasEditables.filter((p) => p.categoriaAlerta === 'INFORMACION_PENDIENTE');
    if (activeRevisionTab === 'ESTABLES')
      return propuestasEditables.filter((p) => p.categoriaAlerta === 'SIN_CAMBIOS');
    return propuestasEditables;
  }, [propuestasEditables, activeRevisionTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ============================================================ */}
      {/* SUB-NAVEGACIÓN OFICIAL EN CONFIGURACIÓN DINÁMICA             */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setSubcategoriaActiva('organigrama')}
          className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subcategoriaActiva === 'organigrama'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="p-2 rounded-lg bg-white/10 text-purple-300 shrink-0">
            <Crown className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-white font-black text-xs sm:text-sm">
              1. Equipo y Responsabilidades SST
            </span>
            <span className="block text-[10px] font-normal opacity-85 text-purple-200">
              Quién cuida qué en los 7 cargos · Descarga en Word (.DOCX)
            </span>
          </div>
        </button>

        <button
          onClick={() => setSubcategoriaActiva('politicas')}
          className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subcategoriaActiva === 'politicas'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-950/50 ring-1 ring-orange-400/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="p-2 rounded-lg bg-white/10 text-orange-200 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-white font-black text-xs sm:text-sm">
              2. Compromiso y Política de Seguridad
            </span>
            <span className="block text-[10px] font-normal opacity-85 text-orange-200">
              Compromisos de Frikaz · Word · Imprimir · Cambios
            </span>
          </div>
        </button>

        <button
          onClick={() => setSubcategoriaActiva('partes_interesadas')}
          className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subcategoriaActiva === 'partes_interesadas'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-400/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="p-2 rounded-lg bg-white/10 text-blue-200 shrink-0">
            <Users2 className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-white font-black text-xs sm:text-sm">
              3. Personas y Entidades Relacionadas
            </span>
            <span className="block text-[10px] font-normal opacity-85 text-blue-200">
              Compañeros · Entidades · Listas de revisión · Excel/PDF
            </span>
          </div>
        </button>

        <button
          onClick={() => setSubcategoriaActiva('documentos_firmados')}
          className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subcategoriaActiva === 'documentos_firmados'
              ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-950/50 ring-1 ring-sky-400/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="p-2 rounded-lg bg-white/10 text-sky-300 shrink-0">
            <Inbox className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-white font-black text-xs sm:text-sm">
              4. Documentos devueltos por correo
            </span>
            <span className="block text-[10px] font-normal opacity-85 text-sky-200">
              Correo frikaz.fritosnacks@gmail.com · Envíos y firmas
            </span>
          </div>
        </button>

        <button
          onClick={() => setSubcategoriaActiva('caracterizacion')}
          className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subcategoriaActiva === 'caracterizacion'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="p-2 rounded-lg bg-white/10 text-emerald-300 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-white font-black text-xs sm:text-sm">
              5. Cómo Funciona la Planta y sus Reglas
            </span>
            <span className="block text-[10px] font-normal opacity-85 text-emerald-200">
              Trabajadores · Contratos · Máquinas · Simular cambios
            </span>
          </div>
        </button>
      </div>

      {/* SUBCATEGORÍA 1: ORGANIGRAMA Y RESPONSABILIDADES SST */}
      {subcategoriaActiva === 'organigrama' && (
        <OrganigramaInteractivoView onIrAPoliticas={() => setSubcategoriaActiva('politicas')} />
      )}

      {/* SUBCATEGORÍA 2: POLÍTICAS DEL SG-SST */}
      {subcategoriaActiva === 'politicas' && (
        <PoliticaSstView />
      )}

      {/* SUBCATEGORÍA 3: PARTES INTERESADAS */}
      {subcategoriaActiva === 'partes_interesadas' && (
        <PartesInteresadasView />
      )}

      {/* SUBCATEGORÍA 4: DOCUMENTOS FIRMADOS RECIBIDOS POR CORREO */}
      {subcategoriaActiva === 'documentos_firmados' && (
        <DocumentosFirmadosRecibidosView />
      )}

      {/* SUBCATEGORÍA 5: CARACTERIZACIÓN EMPRESARIAL Y MOTOR DE REGLAS (ORIGINAL) */}
      {subcategoriaActiva === 'caracterizacion' && (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* 1. HEADER FUTURISTA 3D: CONFIGURACIÓN DINÁMICA DE LA EMPRESA */}
          {/* ============================================================ */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-linear-to-r from-[#0f172a] via-[#1e293b] to-[#0a192f] p-6 text-white shadow-2xl shadow-slate-950/50">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/20 px-3 py-1 text-xs font-black tracking-wider uppercase text-orange-300 border border-orange-500/30">
                <SlidersHorizontal className="h-3.5 w-3.5 text-orange-400" />
                Datos Vivos de la Empresa
              </span>
              <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                Revisión Automática de Seguridad y Ambiente
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Cómo Funciona Frikaz S.A.S. Hoy</span>
              <span className="text-orange-400 text-lg font-mono">
                [Planta Bosa]
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Si cambia el número de trabajadores, los contratos o las máquinas de la planta, actualízalo aquí. El sistema revisa al instante qué reglas cambian en el Ciclo PHVA y en la lista de obligaciones para que nunca falte ningún cuidado.
            </p>
          </div>

          {/* Botones de acción superior */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white text-xs font-black hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/30 cursor-pointer active:scale-95"
            >
              <Scale className="h-4 w-4" />
              <span>Ver Qué Cambia en las Reglas</span>
              {evaluacionActual && evaluacionActual.totalNormasAfectadas > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-orange-600 font-extrabold text-[10px]">
                  {evaluacionActual.totalNormasAfectadas}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHistorialModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <History className="h-4 w-4 text-slate-400" />
              <span>Cambios guardados ({historial.length})</span>
            </button>

            <button
              onClick={onOpenMatrizExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
              title="Abrir la Tabla Excel de normas"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Tabla Excel</span>
            </button>
          </div>
        </div>

        {/* Banner de resumen dinámico instantáneo */}
        {evaluacionActual && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2 text-slate-200">
              <Zap className="h-4 w-4 text-orange-400 shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-semibold text-slate-300">
                Resultado de la última revisión:
              </span>
              <span className="text-orange-200 font-medium">
                {evaluacionActual.resumenEjecutivo}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span>Reglas que cambian: <strong className="text-orange-400">{evaluacionActual.totalNormasAfectadas}</strong></span>
              <span>Siguen igual: <strong className="text-emerald-400">{evaluacionActual.normasSinCambios.length}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Notificación de éxito flotante */}
      {mensajeExito && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/90 p-4 text-emerald-100 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* BARRA DE PRUEBAS OBLIGATORIAS CONTROLADAS (SECCIÓN 10) */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Simular ejemplos de cambio en la planta:
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleEjecutarPruebaControlada(1)}
              className="px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>1. Subir a 15 Trabajadores</span>
              <span className="text-[10px] bg-orange-200 px-1 rounded text-orange-900">
                (21 Reglas / COPASST)
              </span>
            </button>

            <button
              onClick={() => handleEjecutarPruebaControlada(2)}
              className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>2. Bajar a 8 Trabajadores</span>
              <span className="text-[10px] bg-sky-200 px-1 rounded text-sky-900">
                (7 Reglas / Vigía)
              </span>
            </button>

            <button
              onClick={() => handleEjecutarPruebaControlada(3)}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>3. Sumar Otros Contratos</span>
              <span className="text-[10px] bg-purple-200 px-1 rounded text-purple-900">
                (Aprendices SENA + Servicios)
              </span>
            </button>

            <button
              onClick={() => handleEjecutarPruebaControlada(4)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>4. Crecer a 55 Trabajadores</span>
              <span className="text-[10px] bg-rose-200 px-1 rounded text-rose-900">
                (60 Reglas / Riesgo III)
              </span>
            </button>

            <button
              onClick={() => handleEjecutarPruebaControlada(5)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Volver a los datos actuales de Frikaz S.A.S."
            >
              <RotateCcw className="h-3 w-3" />
              <span>Volver al estado real</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CUADÍCULA PRINCIPAL: TARJETAS INTERACTIVAS A, B, C, D */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* TARJETA B: CANTIDAD DE TRABAJADORES (COL 12 o 5) */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                B
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Cuántas Personas Trabajan Hoy
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define las reglas de seguridad, si hay Vigía o COPASST y el Comité de Convivencia
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              {config.numeroTrabajadores} en planta
            </span>
          </div>

          {/* Control Numérico Interactivo [-] 10 Trabajadores [+] */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <span className="block text-xs font-semibold text-slate-700">
              Cantidad actual de trabajadores:
            </span>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCambioTrabajadores(config.numeroTrabajadores - 1)}
                className="h-11 w-12 rounded-xl bg-white border border-slate-300 text-slate-800 text-xl font-black hover:bg-slate-100 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                title="Quitar trabajadores"
              >
                −
              </button>

              <div className="flex-1 flex items-center justify-center bg-white border border-slate-300 rounded-xl px-4 py-2 shadow-inner">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.numeroTrabajadores}
                  onChange={(e) =>
                    handleCambioTrabajadores(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-16 text-center text-xl font-black text-slate-900 focus:outline-hidden font-mono"
                />
                <span className="text-xs font-bold text-slate-500 ml-1">
                  trabajadores
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCambioTrabajadores(config.numeroTrabajadores + 1)}
                className="h-11 w-12 rounded-xl bg-orange-500 text-white text-xl font-black hover:bg-orange-600 active:scale-95 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center cursor-pointer"
                title="Sumar trabajadores"
              >
                +
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Números rápidos para probar:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  onClick={() => handleCambioTrabajadores(8)}
                  className={`px-2 py-0.5 rounded border ${config.numeroTrabajadores === 8 ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
                >
                  8
                </button>
                <button
                  onClick={() => handleCambioTrabajadores(10)}
                  className={`px-2 py-0.5 rounded border ${config.numeroTrabajadores === 10 ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
                >
                  10
                </button>
                <button
                  onClick={() => handleCambioTrabajadores(15)}
                  className={`px-2 py-0.5 rounded border ${config.numeroTrabajadores === 15 ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
                >
                  15
                </button>
                <button
                  onClick={() => handleCambioTrabajadores(25)}
                  className={`px-2 py-0.5 rounded border ${config.numeroTrabajadores === 25 ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
                >
                  25
                </button>
                <button
                  onClick={() => handleCambioTrabajadores(55)}
                  className={`px-2 py-0.5 rounded border ${config.numeroTrabajadores === 55 ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
                >
                  55
                </button>
              </div>
            </div>
          </div>

          {/* Diagnóstico en vivo de Umbrales Legales */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-slate-500" />
              Qué nos pide la ley según el tamaño de la planta:
            </h4>

            {/* 1. Estándares Mínimos Res 0312/2019 */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <Shield className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">
                  Reglas de Seguridad y Salud (Res. 0312 de 2019):
                </span>
                <span className="text-slate-600 text-[11px]">
                  {config.numeroTrabajadores <= 10
                    ? '7 Reglas básicas (para empresas de hasta 10 trabajadores en riesgo I, II o III).'
                    : config.numeroTrabajadores <= 50
                      ? '21 Reglas de seguridad (para empresas de 11 a 50 trabajadores).'
                      : '60 Reglas completas (para empresas de más de 50 trabajadores o riesgo alto).'}
                </span>
              </div>
            </div>

            {/* 2. Participación: COPASST vs Vigía */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <Users className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">
                  Quién vigila la seguridad (Res. 2013/1986):
                </span>
                <span className="text-slate-600 text-[11px]">
                  {config.numeroTrabajadores < 10
                    ? '1 Vigía de SST (compañero nombrado para ayudar a revisar la seguridad).'
                    : 'COPASST obligatorio (equipo donde participa 1 representante elegido por los trabajadores y 1 por la empresa).'}
                </span>
              </div>
            </div>

            {/* 3. Comité de Convivencia Laboral */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
              <Award className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">
                  Comité de Convivencia y Buen Trato (Res. 652/2012):
                </span>
                <span className="text-slate-600 text-[11px]">
                  {config.numeroTrabajadores <= 10
                    ? '2 Integrantes (1 por la empresa y 1 por los trabajadores).'
                    : '4 Integrantes (2 por la empresa y 2 por los trabajadores).'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TARJETA A: TIPO DE CONTRATO (COL 12 o 7) */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Tipos de Contrato en Frikaz S.A.S.
                </h3>
                <p className="text-[11px] text-slate-500">
                  Marca los contratos que existen hoy en la empresa
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {config.modalidadesContrato.length} marcados
            </span>
          </div>

          {/* Botones de Modalidades Contractuales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              {
                id: 'indefinido' as ModalidadContrato,
                label: 'Contrato a término indefinido',
                desc: 'Tiene ARL, salud (EPS) y pensión pagas por la empresa todo el tiempo.',
              },
              {
                id: 'fijo' as ModalidadContrato,
                label: 'Contrato a término fijo',
                desc: 'Con fechas de renovación y exámenes médicos periódicos al día.',
              },
              {
                id: 'obra_labor' as ModalidadContrato,
                label: 'Por obra o labor',
                desc: 'Con afiliación a salud y ARL lista antes del primer día de trabajo.',
              },
              {
                id: 'aprendizaje' as ModalidadContrato,
                label: 'Aprendiz del SENA',
                desc: 'ARL obligatoria en práctica. Si es menor de edad, no puede operar freidoras.',
              },
              {
                id: 'servicios' as ModalidadContrato,
                label: 'Prestación de servicios',
                desc: 'Revisar cada mes su planilla PILA paga (ARL y salud) antes de entrar a planta.',
              },
              {
                id: 'temporal_mision' as ModalidadContrato,
                label: 'Personal temporal o en misión',
                desc: 'Debemos entregarle el mismo cuidado, lugar seguro y elementos de protección.',
              },
              {
                id: 'teletrabajo' as ModalidadContrato,
                label: 'Trabajo desde casa / remoto',
                desc: 'Revisar que su silla, mesa y luz en casa sean cómodas y seguras.',
              },
              {
                id: 'otra' as ModalidadContrato,
                label: 'Otros acuerdos de trabajo',
                desc: 'Personal por días o convenios especiales.',
              },
            ].map((mod) => {
              const active = config.modalidadesContrato.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleToggleModalidadContrato(mod.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-orange-500 bg-orange-50/60 shadow-xs ring-1 ring-orange-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${active ? 'text-orange-950' : 'text-slate-800'}`}>
                      {mod.label}
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                        active
                          ? 'bg-orange-500 text-white'
                          : 'border border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 leading-snug">
                    {mod.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel Informativo de Obligaciones Contractuales */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <Info className="h-3.5 w-3.5 text-orange-500" />
              <span>Por qué importa el tipo de contrato en seguridad:</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Las reglas de seguridad protegen a todas las personas que trabajan dentro de la planta, sin importar su contrato (Decreto 1072 de 2015). Si hay <strong>aprendices SENA</strong> debemos cuidarlos más en zonas calientes, y si entran contratistas por <strong>servicios</strong> siempre pedimos su planilla PILA antes de entrar cerca de las freidoras.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TARJETA C: SECTOR ECONÓMICO Y ACTIVIDAD (COL 12) */}
        {/* ============================================================ */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                C
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  A Qué Se Dedica la Empresa
                </h3>
                <p className="text-[11px] text-slate-500">
                  Actividad económica principal y trabajo real de nuestra planta
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {config.sectorEconomico.toUpperCase()} · Código {config.ciiuPrincipal.slice(0, 4)}
            </span>
          </div>

          {/* Selector de Sector Económico en Tarjetas 3D */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                id: 'primario' as SectorEconomico,
                label: 'Sector Primario',
                desc: 'Cultivo y trabajo directo en el campo o la tierra.',
                icon: Factory,
              },
              {
                id: 'secundario' as SectorEconomico,
                label: 'Sector Secundario (FRIKAZ)',
                desc: 'Fabricación y fritura de snacks para consumo.',
                icon: Flame,
              },
              {
                id: 'terciario' as SectorEconomico,
                label: 'Sector Terciario',
                desc: 'Ventas, entregas en camioneta y servicios.',
                icon: Building2,
              },
              {
                id: 'otro' as SectorEconomico,
                label: 'Otro Sector',
                desc: 'Otras actividades o trabajos combinados.',
                icon: Layers,
              },
            ].map((sec) => {
              const selected = config.sectorEconomico === sec.id;
              const IconComp = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleCambioSector(sec.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    selected
                      ? 'border-orange-500 bg-linear-to-b from-orange-50 to-white shadow-md ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        selected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>
                    <span
                      className={`font-black text-xs ${
                        selected ? 'text-orange-950' : 'text-slate-800'
                      }`}
                    >
                      {sec.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {sec.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Formulario CIIU y Actividad Concreta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Código de actividad (CIIU):
              </label>
              <input
                type="text"
                value={config.ciiuPrincipal}
                onChange={(e) => {
                  const nueva = { ...config, ciiuPrincipal: e.target.value };
                  setConfig(nueva);
                  ejecutarEvaluacionAutomatica(nueva);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs focus:border-orange-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Con este código la ARL define cuánto se paga de seguro y qué reglas ambientales nos tocan.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Qué hacemos en Frikaz S.A.S.:
              </label>
              <input
                type="text"
                value={config.actividadEconomicaConcreta}
                onChange={(e) => {
                  const nueva = {
                    ...config,
                    actividadEconomicaConcreta: e.target.value,
                  };
                  setConfig(nueva);
                  ejecutarEvaluacionAutomatica(nueva);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ejemplo Frikaz S.A.S.: Preparación y fritura de papas, plátanos y chicharrones.
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TARJETA D: OTRAS CARACTERÍSTICAS CONDICIONANTES (COL 12) */}
        {/* ============================================================ */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                D
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Máquinas, Productos de Limpieza y Nivel de Riesgo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nivel de riesgo ARL, equipos que usamos y químicos de aseo en la planta
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Revisión completa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* 1. CLASE DE RIESGO LABORAL */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="block font-bold text-slate-900 text-xs">
                Clase de Riesgo Laboral (ARL):
              </span>
              <div className="space-y-1">
                {(
                  [
                    'Clase I (Mínimo)',
                    'Clase II (Bajo)',
                    'Clase III (Medio)',
                    'Clase IV (Alto)',
                    'Clase V (Máximo)',
                  ] as ClaseRiesgoLaboral[]
                ).map((riesgo) => (
                  <button
                    key={riesgo}
                    type="button"
                    onClick={() => handleCambioRiesgo(riesgo)}
                    className={`w-full py-1.5 px-3 rounded-lg text-left font-semibold text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                      config.claseRiesgoSST === riesgo
                        ? 'bg-orange-500 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{riesgo}</span>
                    {config.claseRiesgoSST === riesgo && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">
                Frikaz S.A.S. opera en Clase II/III por uso de calor &gt;160°C y cortadoras mecánicas.
              </span>
            </div>

            {/* 2. MAQUINARIA Y EQUIPOS */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="block font-bold text-slate-900 text-xs">
                Equipos y Maquinaria en Planta:
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[
                  'Freidoras industriales dobles continuas (>160°C)',
                  'Rebanadora rotativa con cuchillas mecánicas',
                  'Peladora abrasiva mecánica con agua',
                  'Marmita en acero inoxidable para escaldado',
                  'Selladora continua de banda térmica con fechador',
                  'Campana extractora con trampa de grasas en ducto',
                  'Trampa física de retención de grasas en desagüe',
                ].map((maq) => {
                  const checked = config.maquinariaEquipos.includes(maq);
                  return (
                    <button
                      key={maq}
                      type="button"
                      onClick={() => handleToggleChip('maquinariaEquipos', maq)}
                      className={`w-full p-1.5 rounded-lg text-left text-[11px] transition-colors flex items-center justify-between cursor-pointer border ${
                        checked
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-semibold'
                          : 'bg-white text-slate-500 border-slate-200 line-through'
                      }`}
                    >
                      <span className="truncate pr-1">{maq}</span>
                      <span
                        className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 ${
                          checked ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SUSTANCIAS QUÍMICAS */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="block font-bold text-slate-900 text-xs">
                Sustancias Químicas y Combustibles:
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[
                  'Aceite vegetal comestible para fritura (>160°C)',
                  'Gas natural por tubería / GLP para quemadores',
                  'Detergente desengrasante alcalino industrial',
                  'Hipoclorito de sodio y desinfectantes para alimentos',
                  'Soda cáustica para limpieza profunda de campana',
                ].map((sust) => {
                  const checked = config.sustanciasQuimicas.includes(sust);
                  return (
                    <button
                      key={sust}
                      type="button"
                      onClick={() => handleToggleChip('sustanciasQuimicas', sust)}
                      className={`w-full p-1.5 rounded-lg text-left text-[11px] transition-colors flex items-center justify-between cursor-pointer border ${
                        checked
                          ? 'bg-amber-50 text-amber-950 border-amber-300 font-semibold'
                          : 'bg-white text-slate-500 border-slate-200 line-through'
                      }`}
                    >
                      <span className="truncate pr-1">{sust}</span>
                      <span
                        className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 ${
                          checked ? 'bg-amber-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* ============================================================ */}
      {/* MODAL / PANTALLA DE COMPARACIÓN NORMATIVA Y APROBACIÓN */}
      {/* ============================================================ */}
      {isRevisionModalOpen && evaluacionActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#0f172a] p-5 text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="rounded-md bg-orange-500/30 text-orange-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border border-orange-500/40">
                  Revisión de Cambios en las Reglas
                </span>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Qué Cambia Según los Datos de la Planta</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  {evaluacionActual.resumenEjecutivo}
                </p>
              </div>

              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Categorías / Tabs de Comparación */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex flex-wrap gap-2 text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveRevisionTab('TODAS')}
                className={`px-3 py-2 rounded-t-lg transition-all ${
                  activeRevisionTab === 'TODAS'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({propuestasEditables.length})
              </button>

              <button
                onClick={() => setActiveRevisionTab('MODIFICADAS')}
                className={`px-3 py-2 rounded-t-lg transition-all ${
                  activeRevisionTab === 'MODIFICADAS'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reglas que Cambian ({evaluacionActual.obligacionesModificadas.length})
              </button>

              <button
                onClick={() => setActiveRevisionTab('REVISION')}
                className={`px-3 py-2 rounded-t-lg transition-all ${
                  activeRevisionTab === 'REVISION'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Revisar ({evaluacionActual.normasParaRevisar.length})
              </button>

              <button
                onClick={() => setActiveRevisionTab('PENDIENTES')}
                className={`px-3 py-2 rounded-t-lg transition-all ${
                  activeRevisionTab === 'PENDIENTES'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Faltan Datos ({evaluacionActual.datosPendientes.length})
              </button>

              <button
                onClick={() => setActiveRevisionTab('ESTABLES')}
                className={`px-3 py-2 rounded-t-lg transition-all ${
                  activeRevisionTab === 'ESTABLES'
                    ? 'bg-white text-emerald-600 border-t-2 border-emerald-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Siguen Igual ({evaluacionActual.normasSinCambios.length})
              </button>
            </div>

            {/* Listado de Propuestas con Acciones de Aprobación */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {propuestasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay reglas en este grupo.
                </div>
              ) : (
                propuestasFiltradas.map((prop) => {
                  const esAprobada = prop.estadoPropuesta === 'APROBADA';
                  const esRechazada = prop.estadoPropuesta === 'RECHAZADA';

                  return (
                    <div
                      key={prop.id}
                      className={`p-4 rounded-xl border transition-all ${
                        esAprobada
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : esRechazada
                            ? 'border-rose-300 bg-rose-50/50 opacity-75'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              prop.area === 'SST'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prop.area} · {prop.fasePhva}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-900">
                            {prop.normaOficial}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({prop.articulos})
                          </span>
                        </div>

                        {/* Estado de Aprobación */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              esAprobada
                                ? 'bg-emerald-600 text-white'
                                : esRechazada
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {esAprobada
                              ? 'APROBADA'
                              : esRechazada
                                ? 'DESCARTADA'
                                : 'POR DECIDIR'}
                          </span>
                        </div>
                      </div>

                      {/* Motivo y Justificación Legal */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Cómo estaba antes:
                          </span>
                          <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                            {prop.valorAnteriorTexto}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                            Cómo quedaría ahora:
                          </span>
                          <p className="text-slate-800 text-[11px] bg-orange-50/70 p-2 rounded-lg border border-orange-200 font-medium">
                            {prop.valorPropuestoTexto}
                          </p>
                        </div>
                      </div>

                      {/* Justificación y Botones */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-[11px] text-slate-500 max-w-xl">
                          <strong className="text-slate-700">Por qué aplica: </strong>
                          {prop.justificacionLegal}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAccionPropuesta(prop.id, 'APROBAR')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              esAprobada
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAccionPropuesta(prop.id, 'RECHAZAR')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              esRechazada
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Descartar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer con Aprobación Definitiva */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                Al guardar, estos cambios pasan de una vez al Ciclo PHVA y a los indicadores de la planta.
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Salir sin guardar
                </button>

                <button
                  type="button"
                  onClick={handleAplicarCambiosDefinitivos}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-md shadow-orange-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Guardar y Actualizar Reglas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE HISTORIAL DE AUDITORÍA Y TRAZABILIDAD (SECCIÓN 9) */}
      {/* ============================================================ */}
      {showHistorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-slate-200">
            <div className="bg-[#0f172a] p-5 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  Registro de Cambios
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-orange-500" />
                  <span>Historial de Cambios Hechos en la Empresa</span>
                </h3>
              </div>

              <button
                onClick={() => setShowHistorialModal(false)}
                className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {historial.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Todavía no se ha guardado ningún cambio.
                </div>
              ) : (
                historial.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-mono text-[11px] text-slate-500">
                          {new Date(item.timestamp).toLocaleString('es-CO')}
                        </span>
                        <span className="font-bold text-slate-800">
                          · {item.usuario}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                        {item.estadoFinal}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium text-xs">
                      {item.resumenResultado}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span>Qué cambió: {item.caracteristicaModificada}</span>
                      <span>
                        Aprobadas: <strong className="text-emerald-600">{item.propuestasAprobadas}</strong> | Descartadas: <strong className="text-rose-600">{item.propuestasRechazadas}</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-100 p-3 text-right shrink-0">
              <button
                onClick={() => setShowHistorialModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
