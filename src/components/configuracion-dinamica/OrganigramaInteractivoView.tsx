import React, { useState, useMemo, useEffect } from 'react';
import type { CargoSST, VigiaSSTData } from '../../types/organigramaSst';
import type { AssistantNavigationTarget } from '../../types/assistantNavigation';
import type { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import {
  getStoredCargosSST,
  exportarResponsabilidadesWord,
  getStoredVigiaSST,
  saveVigiaSST,
  construirCorreoResponsabilidadesVigia,
  exportarResponsabilidadesVigiaWord,
} from '../../services/organigramaService';
import { useGerenteAutorizado } from '../../services/gerenteControlService';
import { loadStoredRisks } from '../../services/riskMatrixStorage';
import { getCaracterizacionActual } from '../../services/dynamicRulesEngine';
import { loadSgsstData } from '../../services/planAnualSgsstService';
import { loadPlanesMejoraEmergenciasStore } from '../../services/planMejoraEmergenciasService';
import {
  CARGOS_OFICIALES_NOMBRES,
  coincideConCargoOficial,
} from '../../data/cargosOficiales';
import {
  enviarCorreoRealFrikaz,
  esCorreoValidoFrikaz,
  conectarGmailFrikaz,
} from '../../services/frikazEmailHelper';
import {
  Crown,
  ShieldCheck,
  CheckCircle2,
  Scissors,
  Flame,
  Package,
  Truck,
  FileDown,
  FileText,
  User,
  Briefcase,
  ChevronRight,
  X,
  Check,
  Mail,
  Send,
  Eye,
  Building2,
  ArrowDown,
  ArrowLeft,
  Info,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Trash2,
  Save,
  HardHat,
  CalendarRange,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { ModalEnviarDocumento } from './documentos-firmados/ModalEnviarDocumento';

interface OrganigramaInteractivoViewProps {
  onIrAPoliticas?: () => void;
  onNavigate?: (target: AssistantNavigationTarget) => void;
  initialCargoPeligrosId?: string;
}

const getSemaforoGtc45Classes = (nivel: RiesgoGTC45Item['interpretacionNR']) => {
  switch (nivel) {
    case 'I':
      return {
        badge: 'bg-rose-500/20 text-rose-200 border-rose-500/50',
        dot: 'bg-rose-500',
        label: 'Nivel I · Crítico (No aceptable)',
      };
    case 'II':
      return {
        badge: 'bg-orange-500/20 text-orange-200 border-orange-500/50',
        dot: 'bg-orange-500',
        label: 'Nivel II · Alto (Corregir y adoptar medidas)',
      };
    case 'III':
      return {
        badge: 'bg-amber-500/20 text-amber-200 border-amber-500/50',
        dot: 'bg-amber-400',
        label: 'Nivel III · Medio (Mejorar si es posible)',
      };
    case 'IV':
    default:
      return {
        badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50',
        dot: 'bg-emerald-400',
        label: 'Nivel IV · Bajo (Aceptable)',
      };
  }
};

export const OrganigramaInteractivoView: React.FC<OrganigramaInteractivoViewProps> = ({
  onIrAPoliticas,
  onNavigate,
  initialCargoPeligrosId,
}) => {
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();
  const [cargos] = useState<CargoSST[]>(() => getStoredCargosSST());
  const [riesgosMatriz, setRiesgosMatriz] = useState<RiesgoGTC45Item[]>(() => loadStoredRisks());

  // Suscripción automática a cambios en la Matriz de Peligros GTC 45
  useEffect(() => {
    const syncRisks = () => setRiesgosMatriz(loadStoredRisks());
    window.addEventListener('frikaz:risks-updated', syncRisks);
    window.addEventListener('storage', syncRisks);
    return () => {
      window.removeEventListener('frikaz:risks-updated', syncRisks);
      window.removeEventListener('storage', syncRisks);
    };
  }, []);

  const [cargoSeleccionado, setCargoSeleccionado] = useState<CargoSST | null>(() => {
    const list = getStoredCargosSST();
    return list[0] || null;
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [cargoDrawerModo, setCargoDrawerModo] = useState<'ficha' | 'peligros'>('ficha');

  // Vigía SST (figura transversal, no 7° cargo operativo)
  const [vigiaData, setVigiaData] = useState<VigiaSSTData>(() => getStoredVigiaSST());
  const [vigiaDraft, setVigiaDraft] = useState<VigiaSSTData>(() => getStoredVigiaSST());
  const [isVigiaPanelOpen, setIsVigiaPanelOpen] = useState(false);
  const [nuevaRespVigia, setNuevaRespVigia] = useState('');
  const [isVigiaEmailModalOpen, setIsVigiaEmailModalOpen] = useState(false);
  const [vigiaEmailDestino, setVigiaEmailDestino] = useState('');
  const [vigiaEmailCanal, setVigiaEmailCanal] = useState<'auto' | 'gmail' | 'smtp'>('auto');
  const [vigiaEmailSending, setVigiaEmailSending] = useState(false);
  const [vigiaEmailStatus, setVigiaEmailStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [downloadErrorBanner, setDownloadErrorBanner] = useState<string | null>(null);

  // Formulario opcional para personalizar el nombre del trabajador en el .DOCX
  const [nombreTrabajador, setNombreTrabajador] = useState('');
  const [documentoTrabajador, setDocumentoTrabajador] = useState('');
  const [mostrarPersonalizacion, setMostrarPersonalizacion] = useState(false);

  // Estado para el modal de envío de responsabilidades por correo (cargos)
  const [isModalEnviarOpen, setIsModalEnviarOpen] = useState(false);
  const [cargoParaEnviar, setCargoParaEnviar] = useState<CargoSST | null>(null);

  useEffect(() => {
    if (!initialCargoPeligrosId) return;
    const found = cargos.find((c) => c.id === initialCargoPeligrosId);
    if (found) {
      setCargoSeleccionado(found);
      setCargoDrawerModo('peligros');
      setIsPanelOpen(true);
      setIsVigiaPanelOpen(false);
    }
  }, [initialCargoPeligrosId, cargos]);

  const sgsstDataLive = useMemo(
    () => loadSgsstData(getCaracterizacionActual(), riesgosMatriz),
    [riesgosMatriz]
  );

  const planesStoreLive = useMemo(
    () => loadPlanesMejoraEmergenciasStore(riesgosMatriz),
    [riesgosMatriz]
  );

  const planAnual2027Live = useMemo(() => {
    try {
      const raw = localStorage.getItem('frikaz_plan_anual_vigencias_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.[2027] || Object.values(parsed || {})[0] || null;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const handleAbrirModalEnvio = (cargo: CargoSST, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    setCargoParaEnviar(cargo);
    setIsModalEnviarOpen(true);
  };

  // Selector de ícono para cada cargo
  const renderIconoCargo = (icono: string, className: string = 'h-5 w-5') => {
    switch (icono) {
      case 'Crown':
        return <Crown className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Scissors':
        return <Scissors className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Package':
        return <Package className={className} />;
      case 'Truck':
        return <Truck className={className} />;
      case 'CheckCircle2':
      default:
        return <CheckCircle2 className={className} />;
    }
  };

  // Agrupación jerárquica canónica (1 cargo directivo + 5 cargos operativos = 6 cargos oficiales)
  const nivel1AltaDireccion = useMemo(
    () => cargos.filter((c) => c.nivelJerarquico === 'ALTA_DIRECCION'),
    [cargos]
  );
  const nivel3Operativo = useMemo(
    () => cargos.filter((c) => c.nivelJerarquico === 'NIVEL_OPERATIVO'),
    [cargos]
  );

  // Vinculación transversal en vivo por cada cargo oficial
  const resumenVinculacionPorCargo = useMemo(() => {
    const map = new Map<
      string,
      { trabajadores: number; riesgos: number; planesMejora: number }
    >();
    cargos.forEach((cargo) => {
      const trabajadores = (sgsstDataLive.trabajadores || []).filter(
        (t) => t.cargoId === cargo.id || coincideConCargoOficial(cargo.nombre, t.cargoNombre)
      ).length;
      const riesgosCount = riesgosMatriz.filter((r) =>
        coincideConCargoOficial(cargo.nombre, r.cargo, r.cargosExpuestos)
      ).length;
      const planesCount = (planesStoreLive.planesPorRiesgo || []).filter((p) =>
        coincideConCargoOficial(cargo.nombre, p.cargoMatriz)
      ).length;

      map.set(cargo.id, {
        trabajadores,
        riesgos: riesgosCount,
        planesMejora: planesCount,
      });
    });
    return map;
  }, [cargos, riesgosMatriz, sgsstDataLive.trabajadores, planesStoreLive.planesPorRiesgo]);

  // Peligros y riesgos reales de la matriz GTC 45 filtrados estrictamente para el cargo abierto
  const analisisPeligrosCargo = useMemo(() => {
    if (!cargoSeleccionado) {
      return {
        riesgosCargo: [] as RiesgoGTC45Item[],
        pendientesValidacion: [] as RiesgoGTC45Item[],
        trabajadoresCargo: [],
        planesCargo: [],
        actividadesCargo: [],
      };
    }

    const riesgosCargo = riesgosMatriz.filter((r) =>
      coincideConCargoOficial(cargoSeleccionado.nombre, r.cargo, r.cargosExpuestos)
    );

    const pendientesValidacion = riesgosMatriz.filter((r) => {
      const tieneCargoClaro = CARGOS_OFICIALES_NOMBRES.some((nombreOficial) =>
        coincideConCargoOficial(nombreOficial, r.cargo, r.cargosExpuestos)
      );
      return !tieneCargoClaro;
    });

    const trabajadoresCargo = (sgsstDataLive.trabajadores || []).filter(
      (t) =>
        t.estadoLaboral === 'ACTIVO' &&
        (t.cargoId === cargoSeleccionado.id ||
          coincideConCargoOficial(cargoSeleccionado.nombre, t.cargoNombre))
    );

    const riskIdsSet = new Set(riesgosCargo.map((r) => r.id));

    const planesCargo = (planesStoreLive.planesPorRiesgo || []).filter(
      (p) =>
        riskIdsSet.has(p.riesgoId) ||
        coincideConCargoOficial(cargoSeleccionado.nombre, p.cargoMatriz)
    );

    const actividadesCargo = (planAnual2027Live?.actividades || []).filter(
      (a: any) =>
        (a.riesgoId && riskIdsSet.has(a.riesgoId)) ||
        a.responsableId === cargoSeleccionado.id ||
        coincideConCargoOficial(cargoSeleccionado.nombre, a.responsableCargo, a.riesgoCargo)
    );

    return {
      riesgosCargo,
      pendientesValidacion,
      trabajadoresCargo,
      planesCargo,
      actividadesCargo,
    };
  }, [cargoSeleccionado, riesgosMatriz, sgsstDataLive.trabajadores, planesStoreLive.planesPorRiesgo, planAnual2027Live]);

  // Selección de cargo y apertura de panel lateral interactivo
  const handleSeleccionarCargo = (
    cargo: CargoSST,
    modoInicial: 'ficha' | 'peligros' = 'ficha'
  ) => {
    setCargoSeleccionado(cargo);
    setCargoDrawerModo(modoInicial);
    setIsPanelOpen(true);
    setIsVigiaPanelOpen(false);
    setMostrarPersonalizacion(false);
  };

  // Apertura del panel del Vigía SST
  const handleAbrirVigiaPanel = () => {
    const fresh = getStoredVigiaSST();
    setVigiaData(fresh);
    setVigiaDraft(fresh);
    setIsVigiaPanelOpen(true);
    setIsPanelOpen(false);
  };

  const handleGuardarVigia = () => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    const actualizado: VigiaSSTData = {
      ...vigiaDraft,
      estado:
        vigiaDraft.nombrePersona.trim() && vigiaDraft.cargoBase
          ? vigiaDraft.estado === 'Por asignar'
            ? 'Activo'
            : vigiaDraft.estado
          : vigiaDraft.estado,
      historialCambios: [
        {
          id: `vig-hist-${Date.now()}`,
          fecha: hoy,
          usuario: nombreGerente,
          accion: 'Actualización de registro y responsabilidades del Vigía SST',
          detalle: `Persona: ${vigiaDraft.nombrePersona || 'Pendiente'} · Cargo base: ${vigiaDraft.cargoBase} · Responsabilidades: ${vigiaDraft.responsabilidades.length}`,
        },
        ...(vigiaDraft.historialCambios || []),
      ].slice(0, 80),
    };
    saveVigiaSST(actualizado);
    setVigiaData(actualizado);
    setVigiaDraft(actualizado);
    setDownloadSuccessToast('Datos y responsabilidades del Vigía SST guardados.');
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  const handleAgregarRespVigia = () => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const txt = nuevaRespVigia.trim();
    if (!txt) return;
    setVigiaDraft((prev) => ({
      ...prev,
      responsabilidades: [...prev.responsabilidades, txt],
    }));
    setNuevaRespVigia('');
  };

  const handleAbrirModalCorreoVigia = () => {
    setVigiaEmailDestino(vigiaDraft.correo || vigiaData.correo || '');
    setVigiaEmailStatus(null);
    setIsVigiaEmailModalOpen(true);
  };

  const handleEnviarCorreoVigia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const destino = vigiaEmailDestino.trim();
    if (!esCorreoValidoFrikaz(destino)) {
      setVigiaEmailStatus({
        type: 'error',
        text: 'Ingresa un correo electrónico válido para el Vigía SST antes de enviar.',
      });
      return;
    }

    const vigiaConCorreo: VigiaSSTData = { ...vigiaDraft, correo: destino };
    const { subject, text, html } = construirCorreoResponsabilidadesVigia(vigiaConCorreo);

    setVigiaEmailSending(true);
    setVigiaEmailStatus(null);
    try {
      const res = await enviarCorreoRealFrikaz({
        to: destino,
        subject,
        text,
        html,
        tipoNotificacion: 'Responsabilidades Vigía SST',
        workerName: vigiaConCorreo.nombrePersona || 'Vigía SST por designar',
        cargo: `Vigía SST (${vigiaConCorreo.cargoBase})`,
        canalPreferido: vigiaEmailCanal,
      });

      if (res.success) {
        const hoy = new Date().toLocaleString('es-CO');
        const actualizado: VigiaSSTData = {
          ...vigiaConCorreo,
          ultimoEnvioCorreo: {
            fecha: hoy,
            destinatario: destino,
            asunto: subject,
            canal: res.canal,
            trackingCode: res.trackingCode || res.messageId,
          },
          historialCambios: [
            {
              id: `vig-mail-${Date.now()}`,
              fecha: new Date().toISOString().split('T')[0],
              usuario: nombreGerente,
              accion: 'Envío de responsabilidades por correo',
              detalle: `Enviado a ${destino} mediante ${res.canal} (${subject}).`,
            },
            ...(vigiaConCorreo.historialCambios || []),
          ].slice(0, 80),
        };
        saveVigiaSST(actualizado);
        setVigiaData(actualizado);
        setVigiaDraft(actualizado);
        setVigiaEmailStatus({
          type: 'success',
          text: `Correo enviado correctamente a ${destino} vía ${res.canal}${
            res.trackingCode ? ` (${res.trackingCode})` : ''
          }.`,
        });
      } else {
        setVigiaEmailStatus({
          type: 'error',
          text: `${res.error || 'No fue posible enviar el correo.'}${
            res.details ? ` ${res.details}` : ''
          }`,
        });
      }
    } catch (err) {
      setVigiaEmailStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error inesperado enviando correo.',
      });
    } finally {
      setVigiaEmailSending(false);
    }
  };

  // Descarga formal en Word (Times New Roman 12pt)
  const handleDescargarWord = async (cargo: CargoSST) => {
    try {
      setDownloadErrorBanner(null);
      setIsDownloadingWord(true);
      await exportarResponsabilidadesWord(cargo, {
        nombreTrabajador: nombreTrabajador || undefined,
        numeroIdentificacion: documentoTrabajador || undefined,
      });
      setDownloadSuccessToast(`Listo: se descargó el documento Word de ${cargo.nombre}.`);
      setTimeout(() => setDownloadSuccessToast(null), 4500);
    } catch (error) {
      console.error('Error generando documento Word:', error);
      setDownloadErrorBanner('No pudimos crear el archivo Word en este momento. Intenta de nuevo.');
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const previewCorreoVigia = useMemo(
    () =>
      construirCorreoResponsabilidadesVigia({
        ...vigiaDraft,
        correo: vigiaEmailDestino || vigiaDraft.correo,
      }),
    [vigiaDraft, vigiaEmailDestino]
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de error en descarga */}
      {downloadErrorBanner && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/90 text-rose-200 px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold">
          <span>{downloadErrorBanner}</span>
          <button
            onClick={() => setDownloadErrorBanner(null)}
            className="text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toast de confirmación */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. BARRA SUPERIOR DE ACCIONES Y ENLACES                     */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Building2 className="h-4 w-4 text-orange-400 shrink-0" />
          <span>Mi Empresa</span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="font-bold text-white">Equipo y Responsabilidades SST</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onIrAPoliticas && (
            <button
              onClick={onIrAPoliticas}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-orange-400" />
              <span>Ver Política de Seguridad</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAbrirVigiaPanel}
            className="px-3 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-800/80 text-teal-100 text-xs font-bold border border-teal-500/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <HardHat className="h-3.5 w-3.5 text-teal-300" />
            <span>Vigía SST ({vigiaData.responsabilidades.length} resp.)</span>
          </button>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{cargos.length} Cargos Oficiales + Vigía SST</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ESCENARIO DEL ORGANIGRAMA: IDENTIDAD FRIKAZ S.A.S.        */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#070b14] via-[#0c1527] to-[#070b14] p-6 sm:p-10 text-white shadow-2xl shadow-black/80">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="corporate-tech-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
                <circle cx="48" cy="48" r="1.5" fill="#38bdf8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#corporate-tech-grid)" />
          </svg>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-10">
          {/* ENCABEZADO */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-lg backdrop-blur-md">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                F
              </div>
              <span className="font-black text-sm tracking-widest uppercase text-white font-mono">
                FRIKAZ S.A.S.
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Cuidado en el Trabajo</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              QUIÉN CUIDA QUÉ EN FRIKAZ S.A.S.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Haz clic en cualquiera de los 6 cargos oficiales para consultar sus responsabilidades y sus peligros reales de la Matriz GTC 45, o selecciona al <strong>Vigía SST</strong> como figura de responsabilidad y apoyo en seguridad.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Decreto 1072 de 2015 · Art. 2.2.4.6.8
              </span>
              <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Resolución 0312 de 2019
              </span>
              <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                6 Cargos Oficiales + Vigía SST
              </span>
            </div>
          </div>

          {/* ÁRBOL JERÁRQUICO */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[840px] max-w-5xl mx-auto flex flex-col items-center space-y-6">
              {/* ===================================================== */}
              {/* PRIMER NIVEL – ALTA DIRECCIÓN (GERENTE)               */}
              {/* ===================================================== */}
              <div className="flex flex-col items-center w-full">
                <div className="mb-3">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-purple-500/20 via-purple-500/30 to-purple-500/20 text-purple-200 border border-purple-400/40 shadow-lg shadow-purple-950/50 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-400" />
                    <span>PRIMER NIVEL – ALTA DIRECCIÓN</span>
                  </span>
                </div>

                {nivel1AltaDireccion.map((cargo) => {
                  const isSelected = cargoSeleccionado?.id === cargo.id && isPanelOpen;
                  const stats = resumenVinculacionPorCargo.get(cargo.id);
                  return (
                    <div
                      key={cargo.id}
                      onClick={() => handleSeleccionarCargo(cargo, 'ficha')}
                      className={`group relative cursor-pointer w-96 rounded-3xl p-5 bg-gradient-to-b from-slate-900/95 via-purple-950/30 to-slate-950/95 border-2 transition-all duration-300 backdrop-blur-md shadow-xl ${
                        isSelected
                          ? 'border-purple-400 ring-4 ring-purple-500/30 shadow-purple-500/30 scale-[1.02]'
                          : 'border-purple-500/50 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/25 hover:-translate-y-1.5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {cargo.nivelNombre}
                        </span>
                        <span className="text-[10px] text-purple-300/80 font-bold flex items-center gap-1 group-hover:text-purple-200 transition-colors">
                          <span>Ver responsabilidades</span>
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-600/30 text-purple-300 border border-purple-400/40 shadow-inner">
                          {renderIconoCargo(cargo.icono, 'h-7 w-7 text-purple-300')}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-white group-hover:text-purple-200 transition-colors">
                              {cargo.nombre}
                            </h3>
                            {cargo.titularReferencia && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                                {cargo.titularReferencia}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-snug">
                            {cargo.areaProceso}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="inline-block text-[10px] text-purple-300/90 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                              {cargo.responsabilidades.length} responsabilidades
                            </span>
                            {stats && (
                              <span className="inline-block text-[10px] text-emerald-300/90 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                                {stats.riesgos} riesgos · {stats.trabajadores} titular
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeleccionarCargo(cargo, 'ficha');
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold transition-all border border-purple-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-purple-300" />
                          <span>Ficha</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeleccionarCargo(cargo, 'peligros');
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-xs font-bold transition-all border border-rose-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
                          <span>Peligros y riesgos</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleAbrirModalEnvio(cargo, e)}
                          className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-purple-900/40 text-purple-200 text-xs font-bold transition-all border border-purple-500/30 flex items-center gap-1 cursor-pointer"
                          title="Enviar responsabilidades por correo electrónico"
                        >
                          <Mail className="h-3.5 w-3.5 text-purple-300" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* ===================================================== */}
                {/* FIGURA TRANSVERSAL REINCORPORADA: VIGÍA SST           */}
                {/* (NO ES UN 7° CARGO OPERATIVO)                         */}
                {/* ===================================================== */}
                <div className="relative w-full flex flex-col items-center my-2">
                  <div className="w-1 h-7 bg-gradient-to-b from-purple-500 to-teal-400 rounded-full" />

                  <div
                    onClick={handleAbrirVigiaPanel}
                    className={`group cursor-pointer w-full max-w-xl rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-[#092b28] via-[#0c3934] to-[#0a232e] border-2 transition-all duration-300 shadow-xl ${
                      isVigiaPanelOpen
                        ? 'border-teal-300 ring-4 ring-teal-500/30 scale-[1.01]'
                        : 'border-teal-500/60 hover:border-teal-300 hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-200 border border-teal-400/40 shrink-0">
                          <HardHat className="h-6 w-6 text-teal-300" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-teal-500/25 text-teal-200 border border-teal-400/40">
                              Figura de Responsabilidad SST (No es cargo adicional)
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                vigiaData.estado === 'Activo'
                                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                              }`}
                            >
                              {vigiaData.estado}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-white">
                            Vigía de Seguridad y Salud en el Trabajo (Vigía SST)
                          </h3>
                          <p className="text-xs text-teal-100/90">
                            <strong>Responsable asignado:</strong>{' '}
                            {vigiaData.nombrePersona.trim() || 'Pendiente de asignación/verificación'} ·{' '}
                            <strong>Cargo base oficial:</strong> {vigiaData.cargoBase}
                          </p>
                          <p className="text-[11px] text-teal-200/80">
                            {vigiaData.responsabilidades.length} responsabilidades SST ·{' '}
                            {vigiaData.correo
                              ? `Correo: ${vigiaData.correo}`
                              : 'Correo pendiente de registrar'}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirVigiaPanel();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-100 text-xs font-bold border border-teal-400/40 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver / Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirVigiaPanel();
                            setTimeout(() => handleAbrirModalCorreoVigia(), 50);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Enviar responsabilidades</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================== */}
              {/* CONECTOR DISTRIBUIDOR HACIA LOS 5 CARGOS OPERATIVOS   */}
              {/* ===================================================== */}
              <div className="flex flex-col items-center w-full">
                <div className="relative w-full flex flex-col items-center my-1">
                  <div className="w-1 h-6 bg-gradient-to-b from-teal-400 to-cyan-500" />
                  <div className="h-4 w-4 rounded-full bg-cyan-400 ring-4 ring-slate-950 shadow-md flex items-center justify-center -mt-2 z-10">
                    <ArrowDown className="h-2.5 w-2.5 text-slate-950 stroke-[3]" />
                  </div>
                  <div className="w-[90%] max-w-4xl h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 rounded-full -mt-2" />
                  <div className="w-[90%] max-w-4xl flex justify-between h-7 px-8">
                    <div className="w-0.5 h-full bg-gradient-to-b from-blue-500 to-blue-400" />
                    <div className="w-0.5 h-full bg-gradient-to-b from-cyan-500 to-cyan-400" />
                    <div className="w-0.5 h-full bg-gradient-to-b from-orange-500 to-orange-400" />
                    <div className="w-0.5 h-full bg-gradient-to-b from-amber-500 to-amber-400" />
                    <div className="w-0.5 h-full bg-gradient-to-b from-emerald-500 to-emerald-400" />
                  </div>
                </div>
              </div>

              {/* ===================================================== */}
              {/* SEGUNDO NIVEL – EQUIPO OPERATIVO (5 CARGOS)           */}
              {/* ===================================================== */}
              <div className="w-full">
                <div className="flex items-center justify-center mb-4">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-blue-500/20 via-sky-500/30 to-blue-500/20 text-blue-200 border border-blue-400/40 shadow-lg shadow-blue-950/50 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-sky-400" />
                    <span>NIVEL OPERATIVO – {nivel3Operativo.length} CARGOS EN PLANTA Y RUTA</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {nivel3Operativo.map((cargo) => {
                    const isSelected = cargoSeleccionado?.id === cargo.id && isPanelOpen;
                    const stats = resumenVinculacionPorCargo.get(cargo.id);
                    return (
                      <div
                        key={cargo.id}
                        onClick={() => handleSeleccionarCargo(cargo, 'ficha')}
                        className={`group relative cursor-pointer rounded-3xl p-4 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-[#070b14] border-2 transition-all duration-300 backdrop-blur-md shadow-xl flex flex-col justify-between ${
                          isSelected
                            ? `${cargo.colorTheme.border} ring-4 ring-sky-500/30 scale-[1.02] shadow-2xl`
                            : `${cargo.colorTheme.border} hover:border-white hover:shadow-2xl hover:-translate-y-2`
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div
                              className={`p-2.5 rounded-2xl ${cargo.colorTheme.badgeBg} ${cargo.colorTheme.accent} border ${cargo.colorTheme.border} shadow-inner`}
                            >
                              {renderIconoCargo(cargo.icono, 'h-5 w-5')}
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700">
                              {cargo.responsabilidades.length} resp.
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                              Cargo Oficial
                            </span>
                            <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-snug mt-0.5">
                              {cargo.nombre}
                            </h4>
                            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                              {cargo.areaProceso}
                            </p>
                            {stats && (
                              <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                                  {stats.trabajadores} trab.
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-200 border border-rose-800/60">
                                  {stats.riesgos} riesgos
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeleccionarCargo(cargo, 'ficha');
                              }}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold transition-all border border-slate-700 text-center cursor-pointer"
                            >
                              Ficha
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleAbrirModalEnvio(cargo, e)}
                              className="py-1.5 px-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 text-[10px] font-bold transition-all border border-sky-500/30 flex items-center gap-1 cursor-pointer"
                              title="Enviar responsabilidades por correo electrónico"
                            >
                              <Mail className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeleccionarCargo(cargo, 'peligros');
                            }}
                            className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-[10px] font-black transition-all border border-rose-500/35 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert className="h-3 w-3 text-rose-300" />
                            <span>Peligros y riesgos</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PANEL LATERAL DEL CARGO (FICHA + PELIGROS Y RIESGOS)      */}
      {/* ============================================================ */}
      {isPanelOpen && cargoSeleccionado && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsPanelOpen(false)}
            title="Cerrar y regresar al organigrama"
          />

          <div
            className={`w-full ${
              cargoDrawerModo === 'peligros' ? 'max-w-4xl' : 'max-w-xl'
            } bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col h-full animate-slideInRight text-slate-200 overflow-hidden transition-all`}
          >
            {/* Header */}
            <div
              className={`p-5 sm:p-6 bg-gradient-to-r ${cargoSeleccionado.colorTheme.gradient} border-b border-slate-800 space-y-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-white/10 text-white border border-white/20 backdrop-blur-sm shadow-md">
                    {renderIconoCargo(cargoSeleccionado.icono, 'h-7 w-7 text-white')}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                        {cargoSeleccionado.nivelNombre}
                      </span>
                      <span className="text-xs text-slate-200 font-bold">Frikaz S.A.S.</span>
                    </div>
                    <h3 className="text-xl font-black text-white mt-1">
                      {cargoSeleccionado.nombre}
                      {cargoSeleccionado.titularReferencia
                        ? ` · ${cargoSeleccionado.titularReferencia}`
                        : ''}
                    </h3>
                    <p className="text-xs text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                      <span>{cargoSeleccionado.areaProceso}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Cerrar y regresar al organigrama"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Conmutador Ficha del Cargo <-> PELIGROS Y RIESGOS DEL CARGO */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCargoDrawerModo('ficha')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                    cargoDrawerModo === 'ficha'
                      ? 'bg-white text-slate-950 border-white shadow-md'
                      : 'bg-slate-900/60 text-slate-200 border-white/20 hover:bg-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Ficha y Responsabilidades SST</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCargoDrawerModo('peligros')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                    cargoDrawerModo === 'peligros'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-950/50'
                      : 'bg-rose-950/60 text-rose-100 border-rose-400/40 hover:bg-rose-900/70'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    PELIGROS Y RIESGOS DEL CARGO ({analisisPeligrosCargo.riesgosCargo.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {cargoDrawerModo === 'ficha' ? (
                <>
                  {/* Estadísticas SG-SST */}
                  {(() => {
                    const stats = resumenVinculacionPorCargo.get(cargoSeleccionado.id);
                    if (!stats) return null;
                    return (
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            Trabajadores
                          </p>
                          <p className="text-lg font-black text-white mt-0.5">{stats.trabajadores}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCargoDrawerModo('peligros')}
                          className="rounded-xl bg-slate-950/80 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 p-3 text-center cursor-pointer transition-colors"
                        >
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            Peligros GTC 45
                          </p>
                          <p className="text-lg font-black text-rose-300 mt-0.5">{stats.riesgos}</p>
                        </button>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            Planes de mejora
                          </p>
                          <p className="text-lg font-black text-emerald-300 mt-0.5">
                            {stats.planesMejora}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {cargoSeleccionado.funcionesSstDesignadas &&
                    cargoSeleccionado.funcionesSstDesignadas.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          Funciones SST y asignaciones transversales vinculadas a este cargo
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cargoSeleccionado.funcionesSstDesignadas.map((fn) => (
                            <span
                              key={fn}
                              className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-emerald-500/25 text-[11px] text-emerald-100"
                            >
                              {fn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3 shadow-inner">
                    <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block mb-0.5 font-bold uppercase tracking-wider text-[11px]">
                        Para qué está este cargo en Seguridad:
                      </strong>
                      {cargoSeleccionado.descripcionPuesto}
                    </div>
                  </div>

                  {/* Responsabilidades */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Qué debe hacer en su puesto ({cargoSeleccionado.responsabilidades.length})
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">Decreto 1072/2015</span>
                    </div>

                    <div className="space-y-2">
                      {cargoSeleccionado.responsabilidades.map((resp, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-3"
                        >
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold font-mono shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{resp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compromisos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Compromisos del Trabajador frente al SG-SST (
                          {cargoSeleccionado.compromisos.length})
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300">
                        Resolución 0312/2019
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cargoSeleccionado.compromisos.map((comp, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs text-slate-200 flex items-start gap-3"
                        >
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-bold font-mono shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span className="leading-relaxed">{comp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personalización opcional */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-purple-400" />
                        <span>Personalizar datos del trabajador para el .DOCX (Opcional):</span>
                      </span>
                      <button
                        onClick={() => setMostrarPersonalizacion(!mostrarPersonalizacion)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                      >
                        {mostrarPersonalizacion ? 'Ocultar campos' : 'Ingresar datos'}
                      </button>
                    </div>

                    {mostrarPersonalizacion && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Nombre completo del trabajador:
                          </label>
                          <input
                            type="text"
                            value={nombreTrabajador}
                            onChange={(e) => setNombreTrabajador(e.target.value)}
                            placeholder="Ej. Nombre completo"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Número de identificación (C.C.):
                          </label>
                          <input
                            type="text"
                            value={documentoTrabajador}
                            onChange={(e) => setDocumentoTrabajador(e.target.value)}
                            placeholder="Ej. Documento"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ===================================================== */
                /* VISTA 6: PELIGROS Y RIESGOS REALES DEL CARGO (GTC 45) */
                /* ===================================================== */
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCargoDrawerModo('ficha')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Regresar a ficha del cargo</span>
                    </button>

                    <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      Conectado en vivo con la Matriz GTC 45 ({riesgosMatriz.length} registros)
                    </span>
                  </div>

                  {/* Información general del cargo y trabajadores asignados */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-black text-sm text-white">
                        {cargoSeleccionado.nombre} — Exposición real y actividades
                      </h4>
                      <span className="text-[11px] font-mono text-sky-300">
                        {analisisPeligrosCargo.trabajadoresCargo.length} trabajador(es) activo(s)
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {cargoSeleccionado.descripcionPuesto}
                    </p>
                    {analisisPeligrosCargo.trabajadoresCargo.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analisisPeligrosCargo.trabajadoresCargo.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                          >
                            {t.nombreCompleto}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tabla y tarjetas reales desde la Matriz GTC 45 */}
                  {analisisPeligrosCargo.riesgosCargo.length === 0 ? (
                    <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5 text-center space-y-2">
                      <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto" />
                      <p className="font-black text-amber-200 text-sm">
                        Pendiente de validación: este cargo no tiene peligros asignados directamente en la Matriz GTC 45.
                      </p>
                      <p className="text-xs text-amber-100/80">
                        No se asignan riesgos de otros puestos automáticamente. Revisa o vincula el cargo en «Riesgos del Trabajo».
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 uppercase text-[10px]">
                              <th className="p-3">Actividad</th>
                              <th className="p-3">Peligro y Riesgo</th>
                              <th className="p-3">Posibles consecuencias</th>
                              <th className="p-3">Controles y EPP requeridos</th>
                              <th className="p-3">Nivel de riesgo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {analisisPeligrosCargo.riesgosCargo.map((r) => {
                              const sem = getSemaforoGtc45Classes(r.interpretacionNR);
                              const planesRel = analisisPeligrosCargo.planesCargo.filter(
                                (p) => p.riesgoId === r.id
                              );
                              const actsRel = analisisPeligrosCargo.actividadesCargo.filter(
                                (a: any) => a.riesgoId === r.id
                              );
                              return (
                                <tr key={r.id} className="hover:bg-slate-900/60 align-top">
                                  <td className="p-3 font-semibold text-white min-w-[140px]">
                                    <span className="font-mono text-[10px] text-sky-400 block">
                                      {r.codigo || r.id} · {r.proceso}
                                    </span>
                                    {r.actividades}
                                  </td>
                                  <td className="p-3 min-w-[180px]">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px] inline-block mb-1">
                                      {r.peligroClasificacion}
                                    </span>
                                    <p className="text-slate-100 font-bold">{r.peligroDescripcion}</p>
                                    <p className="text-slate-400 mt-0.5 text-[10px]">
                                      Riesgo: {r.aceptabilidadRiesgo}
                                    </p>
                                  </td>
                                  <td className="p-3 text-slate-300 min-w-[150px]">
                                    {r.efectosPosibles || 'Pendiente de verificación'}
                                  </td>
                                  <td className="p-3 space-y-1.5 min-w-[200px]">
                                    {(r.medidaControlesIngenieria || r.controlesMedio || r.controlesFuente) && (
                                      <p className="text-slate-200">
                                        <strong className="text-emerald-300">Controles:</strong>{' '}
                                        {[
                                          r.controlesFuente !== 'Ninguno' ? r.controlesFuente : '',
                                          r.controlesMedio !== 'Ninguno' ? r.controlesMedio : '',
                                          r.medidaControlesIngenieria,
                                          r.medidaControlesAdministrativos,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </p>
                                    )}
                                    {(r.medidaEquiposEPP || r.controlesIndividuo) && (
                                      <p className="text-amber-200">
                                        <strong>EPP:</strong>{' '}
                                        {r.medidaEquiposEPP || r.controlesIndividuo}
                                      </p>
                                    )}
                                    {(planesRel.length > 0 || actsRel.length > 0) && (
                                      <div className="pt-1 flex flex-wrap gap-1">
                                        {planesRel.map((pm) => (
                                          <span
                                            key={pm.id}
                                            className="px-1.5 py-0.5 rounded bg-teal-950/70 border border-teal-500/40 text-teal-200 text-[10px]"
                                          >
                                            Plan #{pm.orden}: {pm.estado}
                                          </span>
                                        ))}
                                        {actsRel.map((ac: any) => (
                                          <span
                                            key={ac.id}
                                            className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-[10px]"
                                          >
                                            {ac.codigo}: {ac.evidencias?.length || 0} evid.
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-[10px] ${sem.badge}`}
                                    >
                                      <span className={`h-2 w-2 rounded-full ${sem.dot}`} />
                                      {sem.label}
                                    </span>
                                    <span className="block text-[10px] font-mono text-slate-400 mt-1">
                                      NR Matriz: {r.nivelRiesgo}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Riesgos en matriz sin cargo oficial claro -> Pendiente de validación */}
                  {analisisPeligrosCargo.pendientesValidacion.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
                      <h5 className="font-black text-amber-200 flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span>
                          Riesgos pendientes de validación de cargo (
                          {analisisPeligrosCargo.pendientesValidacion.length})
                        </span>
                      </h5>
                      <p className="text-[11px] text-amber-100/80">
                        Estos riesgos de la Matriz GTC 45 no tienen un cargo oficial claramente asociado y no se asignan automáticamente hasta validar su exposición real.
                      </p>
                      <div className="space-y-1">
                        {analisisPeligrosCargo.pendientesValidacion.map((rv) => (
                          <div
                            key={rv.id}
                            className="rounded-lg bg-slate-950/70 border border-amber-500/30 px-3 py-1.5 text-[11px] flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-200">
                              <strong>{rv.codigo || rv.id}:</strong> {rv.peligroDescripcion} (
                              {rv.cargo || rv.cargosExpuestos || 'Sin cargo especificado'})
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold text-[10px] shrink-0">
                              Pendiente de validación
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conexión con los demás apartados del SG-SST */}
                  {onNavigate && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
                      <p className="font-black text-white text-xs">
                        Consultar apartados relacionados con {cargoSeleccionado.nombre}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPanelOpen(false);
                            onNavigate({
                              tab: 'matriz_riesgos',
                              riskViewMode: 'por_cargos',
                              searchQuery: cargoSeleccionado.nombre,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Matriz de Riesgos GTC 45</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPanelOpen(false);
                            onNavigate({
                              tab: 'plan_anual',
                              planSeccion: 'planes_riesgo',
                              searchQuery: cargoSeleccionado.nombre,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-950/70 hover:bg-teal-900 text-teal-200 border border-teal-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Planes de mejora ({analisisPeligrosCargo.planesCargo.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPanelOpen(false);
                            onNavigate({
                              tab: 'plan_anual',
                              planSeccion: 'actividades',
                              subActividades: 'cronograma',
                              searchQuery: cargoSeleccionado.nombre,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <CalendarRange className="h-3.5 w-3.5" />
                          <span>Plan Anual ({analisisPeligrosCargo.actividadesCargo.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPanelOpen(false);
                            onNavigate({ tab: 'plan_anual', planSeccion: 'indicadores' });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Indicadores</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPanelOpen(false);
                            onNavigate({ tab: 'plan_anual', planSeccion: 'plan_emergencias' });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-950/70 hover:bg-orange-900 text-orange-200 border border-orange-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Flame className="h-3.5 w-3.5" />
                          <span>Plan de emergencias</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 space-y-2.5">
              {cargoDrawerModo === 'ficha' && (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                  <button
                    onClick={() => handleDescargarWord(cargoSeleccionado)}
                    disabled={isDownloadingWord}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>
                      {isDownloadingWord
                        ? 'Generando Word...'
                        : 'Descargar responsabilidades en Word'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleAbrirModalEnvio(cargoSeleccionado)}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Enviar por correo</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsPanelOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer text-center"
              >
                ← Regresar al organigrama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PANEL LATERAL DEL VIGÍA SST (CONSULTA, EDICIÓN Y CORREO)  */}
      {/* ============================================================ */}
      {isVigiaPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsVigiaPanelOpen(false)}
            title="Cerrar y regresar al organigrama"
          />

          <div className="w-full max-w-2xl bg-slate-900 border-l border-teal-500/40 shadow-2xl flex flex-col h-full animate-slideInRight text-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-[#0b3b36] via-[#0f5b53] to-[#0f172a] border-b border-teal-700/60 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-teal-400/20 text-teal-200 border border-teal-400/40">
                  <HardHat className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/40">
                    Figura de Responsabilidad SST · No es cargo operativo adicional
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Vigía de Seguridad y Salud en el Trabajo
                  </h3>
                  <p className="text-xs text-teal-100/80 mt-0.5">
                    Frikaz S.A.S. · Designado sobre uno de los 6 cargos oficiales
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsVigiaPanelOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-white uppercase tracking-wider text-[11px]">
                    Datos de designación del Vigía SST (sin inventar datos)
                  </h4>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {esGerente ? 'Edición habilitada (Gerencia)' : 'Solo lectura (requiere Gerente)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nombre completo del Vigía SST
                    </label>
                    <input
                      type="text"
                      disabled={!esGerente}
                      value={vigiaDraft.nombrePersona}
                      onChange={(e) =>
                        setVigiaDraft({ ...vigiaDraft, nombrePersona: e.target.value })
                      }
                      placeholder="Pendiente de verificación / registrar cuando se designe"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Documento de identidad
                    </label>
                    <input
                      type="text"
                      disabled={!esGerente}
                      value={vigiaDraft.documento}
                      onChange={(e) =>
                        setVigiaDraft({ ...vigiaDraft, documento: e.target.value })
                      }
                      placeholder="Pendiente de verificación"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Correo electrónico del Vigía
                    </label>
                    <input
                      type="email"
                      disabled={!esGerente}
                      value={vigiaDraft.correo}
                      onChange={(e) =>
                        setVigiaDraft({ ...vigiaDraft, correo: e.target.value })
                      }
                      placeholder="correo@ejemplo.com (registrar cuando esté disponible)"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Cargo base oficial (6 cargos de Frikaz S.A.S.)
                    </label>
                    <select
                      disabled={!esGerente}
                      value={vigiaDraft.cargoBase}
                      onChange={(e) =>
                        setVigiaDraft({ ...vigiaDraft, cargoBase: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    >
                      {CARGOS_OFICIALES_NOMBRES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Fecha de designación
                    </label>
                    <input
                      type="date"
                      disabled={!esGerente}
                      value={vigiaDraft.fechaDesignacion}
                      onChange={(e) =>
                        setVigiaDraft({ ...vigiaDraft, fechaDesignacion: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Estado</label>
                    <select
                      disabled={!esGerente}
                      value={vigiaDraft.estado}
                      onChange={(e) =>
                        setVigiaDraft({
                          ...vigiaDraft,
                          estado: e.target.value as VigiaSSTData['estado'],
                        })
                      }
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white disabled:opacity-70"
                    >
                      <option value="Por asignar">Por asignar</option>
                      <option value="Pendiente de verificación">Pendiente de verificación</option>
                      <option value="Activo">Activo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Responsabilidades editables del Vigía SST */}
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-black text-white uppercase tracking-wider text-[11px]">
                    Responsabilidades del Vigía SST ({vigiaDraft.responsabilidades.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => exportarResponsabilidadesVigiaWord(vigiaDraft)}
                    className="text-[11px] text-orange-300 hover:text-orange-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Word (.docx)</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {vigiaDraft.responsabilidades.map((resp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl bg-slate-900 border border-slate-800 p-2.5"
                    >
                      <span className="h-5 w-5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        disabled={!esGerente}
                        value={resp}
                        onChange={(e) => {
                          const next = [...vigiaDraft.responsabilidades];
                          next[idx] = e.target.value;
                          setVigiaDraft({ ...vigiaDraft, responsabilidades: next });
                        }}
                        className="flex-1 bg-transparent text-slate-200 text-xs focus:outline-none resize-none"
                      />
                      {esGerente && vigiaDraft.responsabilidades.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setVigiaDraft({
                              ...vigiaDraft,
                              responsabilidades: vigiaDraft.responsabilidades.filter(
                                (_, i) => i !== idx
                              ),
                            })
                          }
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Quitar responsabilidad"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {esGerente && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={nuevaRespVigia}
                      onChange={(e) => setNuevaRespVigia(e.target.value)}
                      placeholder="Agregar nueva responsabilidad para el Vigía SST..."
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarRespVigia}
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                )}
              </div>

              {vigiaData.ultimoEnvioCorreo && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 text-[11px] text-emerald-200">
                  <strong>Último envío real registrado:</strong>{' '}
                  {vigiaData.ultimoEnvioCorreo.destinatario} el{' '}
                  {vigiaData.ultimoEnvioCorreo.fecha} vía {vigiaData.ultimoEnvioCorreo.canal}.
                </div>
              )}

              {vigiaData.historialCambios?.length > 0 && (
                <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Historial de cambios del Vigía SST
                  </p>
                  {vigiaData.historialCambios.slice(0, 5).map((h) => (
                    <p key={h.id} className="text-[11px] text-slate-300">
                      <span className="font-mono text-slate-400">{h.fecha}</span> ·{' '}
                      <strong>{h.accion}:</strong> {h.detalle}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleGuardarVigia}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar datos del Vigía SST</span>
                </button>
                <button
                  type="button"
                  onClick={handleAbrirModalCorreoVigia}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Mail className="h-4 w-4" />
                  <span>ENVIAR RESPONSABILIDADES AL CORREO</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsVigiaPanelOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 cursor-pointer"
              >
                ← Regresar al organigrama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MODAL ENVÍO DE RESPONSABILIDADES DEL VIGÍA AL CORREO      */}
      {/* ============================================================ */}
      {isVigiaEmailModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleEnviarCorreoVigia}
            className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-teal-500/40 text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-5 bg-[#0f5b53] text-white flex items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-base">
                  Enviar Responsabilidades del Vigía SST por Correo
                </h4>
                <p className="text-[11px] text-teal-100">
                  Asunto: {previewCorreoVigia.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVigiaEmailModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Correo electrónico del Vigía SST *
                  </label>
                  <input
                    type="email"
                    required
                    value={vigiaEmailDestino}
                    onChange={(e) => setVigiaEmailDestino(e.target.value)}
                    placeholder="vigia@ejemplo.com"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Canal de envío real
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={vigiaEmailCanal}
                      onChange={(e) =>
                        setVigiaEmailCanal(e.target.value as 'auto' | 'gmail' | 'smtp')
                      }
                      className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    >
                      <option value="auto">Automático (Gmail API o SMTP)</option>
                      <option value="gmail">Gmail OAuth conectado</option>
                      <option value="smtp">SMTP del Servidor</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => conectarGmailFrikaz()}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold border border-slate-700 cursor-pointer shrink-0"
                    >
                      Conectar Gmail
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase text-teal-300">
                  Vista previa exacta del mensaje que se enviará
                </p>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto">
                  {previewCorreoVigia.text}
                </pre>
              </div>

              {vigiaEmailStatus && (
                <div
                  className={`rounded-xl p-3 border font-bold ${
                    vigiaEmailStatus.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {vigiaEmailStatus.text}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsVigiaEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={vigiaEmailSending}
                className="px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {vigiaEmailSending ? 'Enviando correo real...' : 'Confirmar y Enviar Correo'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL PARA ENVIAR RESPONSABILIDADES POR CORREO (CARGOS)   */}
      {/* ============================================================ */}
      {isModalEnviarOpen && cargoParaEnviar && (
        <ModalEnviarDocumento
          isOpen={isModalEnviarOpen}
          onClose={() => setIsModalEnviarOpen(false)}
          tipoDocumento="responsabilidades"
          tituloEntidad={cargoParaEnviar.nombre}
          nombreDocumentoAdjunto={`Responsabilidades_SST_${cargoParaEnviar.nombre.replace(
            /\s+/g,
            '_'
          )}_Frikaz.docx`}
          nombreTrabajadorSugerido={nombreTrabajador || ''}
          onEnvioExitoso={(envioId, dest) => {
            setDownloadSuccessToast(
              `Responsabilidades enviadas por correo a ${dest} [${envioId}]`
            );
            setTimeout(() => setDownloadSuccessToast(null), 4000);
          }}
        />
      )}
    </div>
  );
};
