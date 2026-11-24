import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  NormaPhvaItem,
  EstadoCumplimiento,
  IndicadoresAutomaticos,
} from './types/phvaEvidence';
import {
  ConfiguracionPresentacion,
  CONFIG_PRESENTACION_DEFAULT,
} from './types/presentationConfig';
import {
  getPhvaNorms,
  savePhvaNorms,
  updatePhvaNormStatus,
  updatePhvaNormFull,
  deletePhvaNorm,
  resetPhvaNormsToDefault,
  calcularIndicadoresPhva,
} from './services/phvaService';
import {
  getPresentationConfig,
  savePresentationConfig,
  resetPresentationConfig,
} from './services/presentationService';
import { PhvaSlideViewer } from './components/PhvaSlideViewer';
import { NormaCirculosModal } from './components/NormaCirculosModal';
import { PresentacionEditorModal } from './components/PresentacionEditorModal';
import { MatrizExcelView } from './components/MatrizExcelView';
import { ConfiguracionDinamicaEmpresaView } from './components/ConfiguracionDinamicaEmpresaView';
import { MatrizRiesgosView } from './components/MatrizRiesgosView';
import { PlanAnualView } from './components/plan-anual/PlanAnualView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleWorkspaceAuthButton } from './components/GoogleWorkspaceAuthButton';
import {
  ShieldCheck,
  Leaf,
  Building2,
  TableProperties,
  Award,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Plus,
  Trash2,
  Edit3,
  Save,
  Search,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
  ShieldAlert,
  Flame,
  Users,
  Bot,
  Mail,
  CalendarCheck,
} from 'lucide-react';
import {
  getBadgeClassesEstadoFrikaz,
  useGerenteAutorizado,
} from './services/gerenteControlService';
import { ModalAccesoGerente } from './components/ModalAccesoGerente';
import { FloatingVirtualAssistant } from './components/FloatingVirtualAssistant';
import { FrikacitoAvatar } from './components/FrikacitoAvatar';
import type { AssistantNavigationTarget } from './types/assistantNavigation';
import {
  TrabajadorFrikaz,
  PoliticaMisionFrikaz,
  PasaporteDigital,
} from './types/misionFrikaz';
import {
  getStoredSesionActiva,
  setStoredSesionActiva,
  getStoredPoliticasMision,
  getPasaporteDigital,
  tienePoliticasPendientes,
  getStoredTrabajadores,
  TRABAJADORES_CANONICOS,
} from './services/misionFrikazService';
import { MisionFrikazEscapeRoom } from './components/misionFrikaz/MisionFrikazEscapeRoom';
import { PasaporteDigitalModal } from './components/misionFrikaz/PasaporteDigitalModal';
import { MisionFrikazGatekeeper } from './components/misionFrikaz/MisionFrikazGatekeeper';
import { MisionFrikazAdminPanel } from './components/misionFrikaz/MisionFrikazAdminPanel';
import { WorkerSelectorModal } from './components/misionFrikaz/WorkerSelectorModal';
import { GameAvatar } from './components/misionFrikaz/GameAvatar';
import { precargarRecursosCriticos } from './services/gameAssets';

type TabView =
  | 'phva_slides'
  | 'plan_anual'
  | 'matriz_tabla'
  | 'matriz_excel'
  | 'ficha_empresa'
  | 'matriz_riesgos';

export default function App() {
  const [items, setItems] = useState<NormaPhvaItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabView>('matriz_riesgos');
  const [presentationConfig, setPresentationConfig] = useState<ConfiguracionPresentacion>(() =>
    getPresentationConfig()
  );
  const [isGlobalPresEditorOpen, setIsGlobalPresEditorOpen] = useState(false);
  const [presEditorInitialTab, setPresEditorInitialTab] = useState<'banner' | 'fases' | 'modulos' | 'guia'>('banner');
  const [selectedNorma, setSelectedNorma] = useState<NormaPhvaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialEdit, setModalInitialEdit] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTermMatriz, setSearchTermMatriz] = useState('');
  const [areaFilterMatriz, setAreaFilterMatriz] = useState<'TODAS' | 'SST' | 'AMBIENTAL'>('TODAS');

  // Misión Frikaz — Estados de Sesión, Pasaporte y Gamificación SG-SST
  const [currentWorker, setCurrentWorker] = useState<TrabajadorFrikaz>(() => getStoredSesionActiva());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeMissionPolicyId, setActiveMissionPolicyId] = useState<string | null>(null);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isWorkerSelectorOpen, setIsWorkerSelectorOpen] = useState(false);
  const [politicasMision, setPoliticasMision] = useState<PoliticaMisionFrikaz[]>(() =>
    getStoredPoliticasMision()
  );
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [normaToDelete, setNormaToDelete] = useState<NormaPhvaItem | null>(null);
  const [assistantNavTarget, setAssistantNavTarget] = useState<AssistantNavigationTarget | null>(null);

  const { esGerente, nombreGerente, avatarGerente, solicitarAccesoGerente } = useGerenteAutorizado();

  // Reconocer automáticamente a Andrea Orjuela – Gerente al iniciar sesión con su correo autorizado
  useEffect(() => {
    const gerenteCanon = TRABAJADORES_CANONICOS[0];
    if (esGerente) {
      setIsAdminMode(true);
      setCurrentWorker(gerenteCanon);
      setStoredSesionActiva(gerenteCanon);
    } else {
      setIsAdminMode(false);
      setCurrentWorker((prev) => {
        if (prev.id === 'FRK-DIR-GERENCIA' || prev.esAdmin) {
          const operarioDefault = TRABAJADORES_CANONICOS[1];
          setStoredSesionActiva(operarioDefault);
          return operarioDefault;
        }
        return prev;
      });
    }
  }, [esGerente]);

  // Recalcular pasaporte dinámicamente
  const pasaporte = useMemo(() => {
    return getPasaporteDigital(currentWorker.id);
  }, [currentWorker.id, activeMissionPolicyId, isPassportModalOpen, isAdminPanelOpen]);

  // Verificar si el colaborador tiene políticas obligatorias pendientes (Gatekeeper)
  const isGatekeeperActive = useMemo(() => {
    if (isAdminMode || esGerente) return false;
    return tienePoliticasPendientes(currentWorker.id);
  }, [isAdminMode, esGerente, currentWorker.id, pasaporte]);

  // Cambiar colaborador activo
  const handleSelectWorker = useCallback(
    (worker: TrabajadorFrikaz) => {
      if ((worker.id === 'FRK-DIR-GERENCIA' || worker.esAdmin) && !esGerente) {
        solicitarAccesoGerente();
        return;
      }
      setCurrentWorker(worker);
      setStoredSesionActiva(worker);
      setIsAdminMode(Boolean(esGerente && worker.esAdmin));
      setActiveMissionPolicyId(null);
    },
    [esGerente, solicitarAccesoGerente]
  );

  // Iniciar Misión Frikaz para una política específica
  const handleStartMission = useCallback((politicaId: string) => {
    setActiveMissionPolicyId(politicaId);
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    precargarRecursosCriticos();
    const loaded = getPhvaNorms();
    setItems(loaded);
  }, []);

  // Compute automated KPIs in real time
  const indicadores: IndicadoresAutomaticos = useMemo(() => {
    return calcularIndicadoresPhva(items);
  }, [items]);

  // Save full norm edit (exclusivo Gerencia autenticada)
  const handleSaveNorma = useCallback(
    (updatedItem: NormaPhvaItem) => {
      if (!esGerente) {
        solicitarAccesoGerente();
        return;
      }
      const updated = updatePhvaNormFull(updatedItem);
      setItems(updated);
      if (selectedNorma && selectedNorma.id === updatedItem.id) {
        setSelectedNorma(updatedItem);
      }
    },
    [selectedNorma, esGerente, solicitarAccesoGerente]
  );

  // Delete norm (exclusivo Gerencia autenticada)
  const handleDeleteNorma = useCallback(
    (id: string) => {
      if (!esGerente) {
        solicitarAccesoGerente();
        return;
      }
      const updated = deletePhvaNorm(id);
      setItems(updated);
      if (selectedNorma && selectedNorma.id === id) {
        setSelectedNorma(null);
        setIsModalOpen(false);
      }
    },
    [selectedNorma, esGerente, solicitarAccesoGerente]
  );

  // Add brand new norm (exclusivo Gerencia autenticada)
  const handleAddNewNorma = useCallback(
    (fase?: any) => {
      if (!esGerente) {
        solicitarAccesoGerente();
        return;
      }
      const newNorm: NormaPhvaItem = {
        id: `norma-${Date.now()}`,
        fase: fase || 'PLANEAR',
        subtema: 'DIAGNÓSTICO',
        tituloSituacion: 'Nueva regla o compromiso de cuidado',
        normaOficial: 'Resolución o Decreto por revisar',
        entidadEmisora: 'Ministerio del Trabajo / Secretaría de Ambiente de Bogotá',
        articulos: 'Artículos principales',
        area: 'SST',
        descripcion: 'Cuente con palabras sencillas qué exige esta regla para cuidar a los trabajadores o al medio ambiente...',
        importancia:
          'Explique por qué es importante en Frikaz S.A.S. (por ejemplo, para evitar quemaduras en freidoras, caídas o multas)...',
        aplicabilidad: 'Indique qué debemos hacer en el día a día dentro de la planta...',
        vigente: true,
        textoVigencia: 'Regla vigente hoy en Colombia.',
        jurisdiccionAlcance: 'Aplica en toda Colombia y en Bogotá D.C.',
        evidenciaCumplimiento: 'Acta firmada, foto, planilla o documento guardado.',
        estado: 'Por hacer',
        responsable: 'Encargado de SST (Seguridad y Salud en el Trabajo)',
        fechaVerificacion: new Date().toISOString().split('T')[0],
        observaciones: 'Nueva regla agregada para hacerle seguimiento.',
      };
      const updated = [newNorm, ...items];
      savePhvaNorms(updated);
      setItems(updated);
      setSelectedNorma(newNorm);
      setModalInitialEdit(true);
      setIsModalOpen(true);
    },
    [items, esGerente, solicitarAccesoGerente]
  );

  // Change individual norm status (exclusivo Gerencia autenticada)
  const handleUpdateStatus = useCallback(
    (id: string, nuevoEstado: EstadoCumplimiento) => {
      if (!esGerente) {
        solicitarAccesoGerente();
        return;
      }
      const updated = updatePhvaNormStatus(id, nuevoEstado);
      setItems(updated);
      if (selectedNorma && selectedNorma.id === id) {
        const refreshed = updated.find((u) => u.id === id);
        if (refreshed) setSelectedNorma(refreshed);
      }
    },
    [selectedNorma, esGerente, solicitarAccesoGerente]
  );

  // Reset to default seed (opens inline confirmation modal)
  const handleReset = useCallback(() => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    setConfirmResetOpen(true);
  }, [esGerente, solicitarAccesoGerente]);

  const confirmResetNorms = useCallback(() => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const defaultItems = resetPhvaNormsToDefault();
    setItems(defaultItems);
    setSelectedNorma(null);
    setIsModalOpen(false);
    setConfirmResetOpen(false);
  }, [esGerente, solicitarAccesoGerente]);

  // Open modal in read-only or edit mode
  const handleOpenNorma = useCallback(
    (norma: NormaPhvaItem, editMode: boolean = false) => {
      if (editMode && !esGerente) {
        solicitarAccesoGerente();
        return;
      }
      setSelectedNorma(norma);
      setModalInitialEdit(editMode);
      setIsModalOpen(true);
    },
    [esGerente, solicitarAccesoGerente]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedNorma(null);
    setModalInitialEdit(false);
  }, []);

  // Update presentation config
  const handleUpdatePresentationConfig = useCallback(
    (newConfig: ConfiguracionPresentacion) => {
      if (!esGerente) {
        solicitarAccesoGerente();
        return;
      }
      savePresentationConfig(newConfig);
      setPresentationConfig(newConfig);
    },
    [esGerente, solicitarAccesoGerente]
  );

  const handleResetPresentationConfig = useCallback(() => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const def = resetPresentationConfig();
    setPresentationConfig(def);
  }, [esGerente, solicitarAccesoGerente]);

  // 1. Si hay una misión de Escape Room activa, renderizar la experiencia interactiva de 4 etapas
  if (activeMissionPolicyId) {
    const selectedMissionPolitica =
      politicasMision.find((p) => p.id === activeMissionPolicyId) || politicasMision[0];

    return (
      <>
        <MisionFrikazEscapeRoom
          politica={selectedMissionPolitica}
          trabajador={currentWorker}
          todasLasPoliticas={politicasMision}
          onCompletarMision={() => {
            // El pasaporte se actualiza automáticamente con el estado reactivo
          }}
          onVolverOSeleccionarOtra={(nextPolId) => {
            if (nextPolId) {
              setActiveMissionPolicyId(nextPolId);
            } else {
              setActiveMissionPolicyId(null);
            }
          }}
          onCerrar={() => setActiveMissionPolicyId(null)}
        />

        <PasaporteDigitalModal
          isOpen={isPassportModalOpen}
          onClose={() => setIsPassportModalOpen(false)}
          pasaporte={pasaporte}
          politicas={politicasMision}
          onSeleccionarMision={(polId) => {
            setIsPassportModalOpen(false);
            setActiveMissionPolicyId(polId);
          }}
        />

        <WorkerSelectorModal
          isOpen={isWorkerSelectorOpen}
          onClose={() => setIsWorkerSelectorOpen(false)}
          trabajadorActual={currentWorker}
          onSeleccionarTrabajador={handleSelectWorker}
        />

        <ModalAccesoGerente />
      </>
    );
  }

  // 2. Si el gatekeeper está activo (trabajador con políticas obligatorias pendientes sin sesión de Gerencia)
  if (isGatekeeperActive) {
    return (
      <>
        <MisionFrikazGatekeeper
          trabajador={currentWorker}
          pasaporte={pasaporte}
          politicas={politicasMision}
          onIniciarMision={(polId) => setActiveMissionPolicyId(polId)}
          onAbrirPasaporte={() => setIsPassportModalOpen(true)}
          onCambiarTrabajador={(w) => {
            if (w) {
              handleSelectWorker(w);
            } else {
              setIsWorkerSelectorOpen(true);
            }
          }}
          onEntrarComoAdmin={() => {
            if (!esGerente) {
              solicitarAccesoGerente();
              return;
            }
            setIsAdminMode(true);
          }}
        />

        <PasaporteDigitalModal
          isOpen={isPassportModalOpen}
          onClose={() => setIsPassportModalOpen(false)}
          pasaporte={pasaporte}
          politicas={politicasMision}
          onSeleccionarMision={(polId) => {
            setIsPassportModalOpen(false);
            setActiveMissionPolicyId(polId);
          }}
        />

        <WorkerSelectorModal
          isOpen={isWorkerSelectorOpen}
          onClose={() => setIsWorkerSelectorOpen(false)}
          trabajadorActual={currentWorker}
          onSeleccionarTrabajador={handleSelectWorker}
        />

        <MisionFrikazAdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          onVerPasaporteTrabajador={(tId) => {
            const w = getStoredTrabajadores().find((t: TrabajadorFrikaz) => t.id === tId);
            if (w) {
              setCurrentWorker(w);
              setIsPassportModalOpen(true);
            }
          }}
        />

        <ModalAccesoGerente />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen text-slate-900 font-sans antialiased flex flex-col transition-colors ${
        activeTab === 'plan_anual'
          ? 'bg-linear-to-br from-[#e4f2ee] via-[#eef7f4] to-[#e0efea]'
          : 'bg-slate-100'
      }`}
    >
      {/* BARRA SUPERIOR DE SESIÓN Y MISIÓN FRIKAZ */}
      <div className="bg-slate-950 text-slate-300 border-b border-slate-800 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWorkerSelectorOpen(true)}
              className="flex items-center gap-2 hover:text-white transition-colors group"
              title="Cambiar de compañero o de perfil"
            >
              <GameAvatar
                cargoNombre={currentWorker.cargoNombre}
                avatarUrl={currentWorker.avatarUrl}
                nombre={currentWorker.nombre}
                size="xs"
              />
              <span className="font-semibold text-white group-hover:text-amber-400">
                {currentWorker.nombre}
              </span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {currentWorker.cargoNombre}
              </span>
              <span className="text-slate-500 text-[10px] underline">Cambiar</span>
            </button>

            {esGerente && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                EDICIÓN GERENCIA ACTIVA
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón de Lanzamiento de Misión Frikaz */}
            <button
              onClick={() => {
                const primeraObligatoria = politicasMision.find(p => p.esObligatoria) || politicasMision[0];
                setActiveMissionPolicyId(primeraObligatoria.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Misión Frikaz</span>
            </button>

            {/* Botón de Pasaporte Digital */}
            <button
              onClick={() => setIsPassportModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Mi Pasaporte ({pasaporte.porcentajeAvance}%)</span>
            </button>

            {/* Botón de Frikacito en lenguaje claro */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('frikaz:open-assistant'))}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir a Frikacito, tu asistente virtual de Frikaz S.A.S."
            >
              <FrikacitoAvatar size="xs" />
              <span className="hidden sm:inline font-bold">Frikacito</span>
            </button>

            {/* Botón de Acceso / Perfil de Gerencia por Correo */}
            <button
              onClick={solicitarAccesoGerente}
              className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                esGerente
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title="Ingresar con el correo de Andrea Orjuela – Gerente para editar toda la herramienta"
            >
              {esGerente ? (
                <img
                  src={avatarGerente}
                  alt={nombreGerente}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full object-cover border border-emerald-400"
                />
              ) : (
                <Mail className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span className="hidden sm:inline">
                {esGerente ? nombreGerente : 'Ingreso Gerencia'}
              </span>
            </button>

            {/* Botón de Panel Admin SST */}
            <button
              onClick={() => {
                if (!esGerente) {
                  solicitarAccesoGerente();
                  return;
                }
                setIsAdminPanelOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/40 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Control SST</span>
            </button>
          </div>
        </div>
      </div>

      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-30 bg-[#0f172a] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Fila 1: Identidad de Frikaz S.A.S. y Acciones Rápidas */}
          <div className="flex items-center justify-between gap-4 py-2.5 sm:py-3">
            {/* Logo y Nombre de la Empresa */}
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/frikaz_logo.jpg"
                alt="Frikaz S.A.S. Logo"
                className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl object-cover border border-orange-500/30 bg-white p-0.5 shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap leading-tight">
                    Frikaz S.A.S.
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#f97316] text-white whitespace-nowrap shrink-0 leading-tight">
                    Planta de Fritos
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300/90 leading-snug mt-0.5">
                  Seguridad en el Trabajo (SST) y Cuidado Ambiental • Bosa, Bogotá D.C.
                </p>
              </div>
            </div>

            {/* Acciones y KPIs Rápidos */}
            <div className="flex items-center gap-2.5 shrink-0">
              <GoogleWorkspaceAuthButton compact={true} />

              <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs whitespace-nowrap">
                <span className="text-slate-400">Avance:</span>
                <span
                  className={`font-black ${
                    indicadores.generalPorcentaje >= 70
                      ? 'text-emerald-400'
                      : indicadores.generalPorcentaje >= 40
                      ? 'text-orange-400'
                      : 'text-red-400'
                  }`}
                >
                  {indicadores.generalPorcentaje}%
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium">
                  {indicadores.totalNormas} reglas
                </span>
              </div>

              {/* Botón de Menú Móvil */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Fila 2: Navegación por pestañas (Desktop / Tablet) */}
          <div className="hidden md:flex items-center justify-between gap-3 py-2 border-t border-slate-800/80">
            <nav className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('phva_slides')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'phva_slides'
                    ? 'bg-[#f97316] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Ciclo PHVA</span>
              </button>

              <button
                onClick={() => setActiveTab('plan_anual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'plan_anual'
                    ? 'bg-[#0f6b61] text-white shadow-xs ring-1 ring-teal-300/40'
                    : 'text-teal-200 hover:text-white hover:bg-teal-900/50'
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>PLAN ANUAL</span>
              </button>

              <button
                onClick={() => setActiveTab('matriz_tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'matriz_tabla'
                    ? 'bg-[#f97316] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <TableProperties className="h-3.5 w-3.5" />
                <span>Normas y Reglas</span>
              </button>

              <button
                onClick={() => setActiveTab('matriz_excel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'matriz_excel'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />
                <span>Tabla de Normas</span>
              </button>

              <button
                onClick={() => setActiveTab('ficha_empresa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'ficha_empresa'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-purple-300" />
                <span>Mi Empresa</span>
              </button>

              <button
                onClick={() => setActiveTab('matriz_riesgos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'matriz_riesgos'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
                <span>Riesgos del Trabajo</span>
              </button>
            </nav>

            <div className="flex md:flex lg:hidden items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs whitespace-nowrap shrink-0">
              <span className="text-slate-400">Avance:</span>
              <span
                className={`font-black ${
                  indicadores.generalPorcentaje >= 70
                    ? 'text-emerald-400'
                    : indicadores.generalPorcentaje >= 40
                    ? 'text-orange-400'
                    : 'text-red-400'
                }`}
              >
                {indicadores.generalPorcentaje}%
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-medium">
                {indicadores.totalNormas} reglas
              </span>
            </div>
          </div>
        </div>

            {/* Menú Móvil Desplegable */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0f172a] border-t border-slate-800 px-4 pt-2 pb-4 space-y-1">
            <button
              onClick={() => {
                setActiveTab('phva_slides');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'phva_slides' ? 'bg-[#f97316] text-white' : 'text-slate-300'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Ciclo PHVA</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('plan_anual');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'plan_anual' ? 'bg-[#0f6b61] text-white' : 'text-teal-200'
              }`}
            >
              <CalendarCheck className="h-4 w-4" />
              <span>PLAN ANUAL</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('matriz_tabla');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'matriz_tabla' ? 'bg-[#f97316] text-white' : 'text-slate-300'
              }`}
            >
              <TableProperties className="h-4 w-4" />
              <span>Normas y Reglas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('matriz_excel');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'matriz_excel' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
              <span>Tabla de Normas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('ficha_empresa');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'ficha_empresa' ? 'bg-purple-600 text-white' : 'text-slate-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 text-purple-300" />
              <span>Mi Empresa</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('matriz_riesgos');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'matriz_riesgos' ? 'bg-rose-600 text-white' : 'text-slate-300'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-rose-300" />
              <span>Riesgos del Trabajo</span>
            </button>
          </div>
        )}
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: PHVA SLIDE VIEWER */}
        {activeTab === 'phva_slides' && (
          <PhvaSlideViewer
            items={items}
            indicadores={indicadores}
            presentationConfig={presentationConfig}
            onUpdatePresentationConfig={handleUpdatePresentationConfig}
            onResetPresentationConfig={handleResetPresentationConfig}
            onSelectNorma={(norma) => handleOpenNorma(norma, false)}
            onEditNorma={(norma) => handleOpenNorma(norma, true)}
            onUpdateStatus={handleUpdateStatus}
            onReset={handleReset}
            onAddNewNorma={handleAddNewNorma}
            onOpenMatrizExcel={() => setActiveTab('matriz_excel')}
            navigationRequest={assistantNavTarget}
          />
        )}

        {/* VIEW 1B: PLAN ANUAL INDEPENDIENTE */}
        {activeTab === 'plan_anual' && (
          <ErrorBoundary fallbackTitle="PLAN ANUAL — Frikaz S.A.S.">
            <PlanAnualView normas={items} navigationRequest={assistantNavTarget} />
          </ErrorBoundary>
        )}

        {/* VIEW 2: MATRIZ TABULAR NORMATIVA COMPLETA */}
        {activeTab === 'matriz_tabla' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0f172a]">
                    {presentationConfig.matrizTabla?.titulo ||
                      'Lista Completa de Reglas y Obligaciones'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {presentationConfig.matrizTabla?.descripcion ||
                    `Aquí puedes ver las ${items.length} reglas de seguridad y cuidado ambiental que aplican hoy a Frikaz S.A.S.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAddNewNorma('PLANEAR')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f97316] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#ea580c] transition-colors shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar regla</span>
                </button>
              </div>
            </div>

            {/* Filtros de la Tabla */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTermMatriz}
                  onChange={(e) => setSearchTermMatriz(e.target.value)}
                  placeholder="Buscar por tema, ley o artículo..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs focus:border-[#0f172a] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="font-bold text-slate-600">Tema:</span>
                <select
                  value={areaFilterMatriz}
                  onChange={(e) => setAreaFilterMatriz(e.target.value as any)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="TODAS">Todos los temas</option>
                  <option value="SST">Seguridad y Salud (SST)</option>
                  <option value="AMBIENTAL">Cuidado Ambiental</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b-2 border-[#0f172a] bg-[#0f172a] text-white text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Etapa PHVA</th>
                      <th className="px-4 py-3">Qué debemos cuidar o hacer</th>
                      <th className="px-4 py-3">Ley o Norma</th>
                      <th className="px-4 py-3">Artículos</th>
                      <th className="px-4 py-3">Tema</th>
                      <th className="px-4 py-3">Vigencia</th>
                      <th className="px-4 py-3">Cómo vamos</th>
                      <th className="px-4 py-3 text-right">Opciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items
                      .filter((it) => {
                        const matchSearch =
                          it.tituloSituacion.toLowerCase().includes(searchTermMatriz.toLowerCase()) ||
                          it.normaOficial.toLowerCase().includes(searchTermMatriz.toLowerCase()) ||
                          it.articulos.toLowerCase().includes(searchTermMatriz.toLowerCase());
                        const matchArea =
                          areaFilterMatriz === 'TODAS' ||
                          it.area === areaFilterMatriz ||
                          it.area === 'INTEGRAL';
                        return matchSearch && matchArea;
                      })
                      .map((it) => (
                        <tr key={it.id} className="hover:bg-[#fff7ed] transition-colors group">
                          <td className="px-4 py-3 font-bold text-[#0f172a]">{it.fase}</td>
                          <td
                            onClick={() => handleOpenNorma(it)}
                            className="px-4 py-3 max-w-xs font-semibold text-slate-900 group-hover:text-[#0f172a] cursor-pointer hover:underline"
                          >
                            {it.tituloSituacion}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-medium">
                            {it.normaOficial}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{it.articulos}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                                it.area === 'SST'
                                  ? 'bg-blue-100 text-[#1e3a8a]'
                                  : it.area === 'AMBIENTAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {it.area}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#991b1b]">
                              <CheckCircle2 className="h-3 w-3" />
                              Vigente
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(() => {
                              const badge = getBadgeClassesEstadoFrikaz(it.estado);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-bold text-[10px] border ${badge.light}`}
                                  title={badge.descripcionCorta}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenNorma(it, true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f97316] text-white hover:bg-[#ea580c] font-bold text-xs shadow-xs transition-colors"
                                title="Editar norma"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!esGerente) {
                                    solicitarAccesoGerente();
                                    return;
                                  }
                                  setNormaToDelete(it);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-[#991b1b] hover:bg-red-50"
                                title="Quitar esta regla"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CONFIGURACIÓN DINÁMICA DE LA EMPRESA */}
        {activeTab === 'ficha_empresa' && (
          <ErrorBoundary fallbackTitle="Datos de la Empresa — Frikaz S.A.S.">
            <ConfiguracionDinamicaEmpresaView
              normas={items}
              indicadores={indicadores}
              onActualizarNormas={(nuevasNormas) => {
                if (!esGerente) {
                  solicitarAccesoGerente();
                  return;
                }
                setItems(nuevasNormas);
                savePhvaNorms(nuevasNormas);
              }}
              onOpenNormaModal={(norma) => handleOpenNorma(norma, false)}
              onOpenMatrizExcel={() => setActiveTab('matriz_excel')}
              navigationRequest={assistantNavTarget}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 4: MATRIZ EXCEL AUTOMATIZADA */}
        {activeTab === 'matriz_excel' && (
          <MatrizExcelView
            items={items}
            onSelectNorma={(norma) => handleOpenNorma(norma, false)}
            navigationRequest={assistantNavTarget}
          />
        )}

        {/* VIEW 5: MATRIZ DE RIESGOS SST (GTC 45 - IDENTIFICACIÓN, EVALUACIÓN Y MEDIDAS) */}
        {activeTab === 'matriz_riesgos' && (
          <MatrizRiesgosView navigationRequest={assistantNavTarget} />
        )}
      </main>

      {/* MODAL WITH THE 6 MANDATORY CIRCLES */}
      <NormaCirculosModal
        item={selectedNorma}
        isOpen={isModalOpen}
        initialEditMode={modalInitialEdit}
        onClose={handleCloseModal}
        onUpdateStatus={handleUpdateStatus}
        onSaveNorma={handleSaveNorma}
        onDeleteNorma={handleDeleteNorma}
      />

      {/* MODAL DE EDICIÓN DE TODA LA PRESENTACIÓN Y ENCABEZADOS */}
      <PresentacionEditorModal
        isOpen={isGlobalPresEditorOpen}
        config={presentationConfig}
        initialTab={presEditorInitialTab}
        onClose={() => setIsGlobalPresEditorOpen(false)}
        onSave={handleUpdatePresentationConfig}
        onReset={handleResetPresentationConfig}
      />

      {/* MODALES DE «MISIÓN FRIKAZ» (PASAPORTE, SELECTOR Y PANEL ADMIN) */}
      <PasaporteDigitalModal
        isOpen={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        pasaporte={pasaporte}
        politicas={politicasMision}
        onSeleccionarMision={(polId) => {
          setIsPassportModalOpen(false);
          setActiveMissionPolicyId(polId);
        }}
      />

      <WorkerSelectorModal
        isOpen={isWorkerSelectorOpen}
        onClose={() => setIsWorkerSelectorOpen(false)}
        trabajadorActual={currentWorker}
        onSeleccionarTrabajador={handleSelectWorker}
      />

      <MisionFrikazAdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onVerPasaporteTrabajador={(tId) => {
          const w = getStoredTrabajadores().find((t: TrabajadorFrikaz) => t.id === tId);
          if (w) {
            setCurrentWorker(w);
            setIsPassportModalOpen(true);
          }
        }}
      />

      {/* MODAL DE CONFIRMACIÓN PARA RESTAURAR NORMAS INICIALES */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  ¿Volver a las reglas iniciales?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Si confirma, volverán a aparecer las 21 reglas iniciales de Frikaz S.A.S. con sus textos y pruebas de ejemplo originales.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmResetNorms}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                Sí, volver a las iniciales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR UNA NORMA */}
      {normaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  ¿Quitar esta regla de la lista?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Está por quitar <strong className="text-slate-900">«{normaToDelete.tituloSituacion}»</strong>. Si fue un error, puede cancelar ahora.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNormaToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteNorma(normaToDelete.id);
                  setNormaToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Sí, quitar regla
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL GLOBAL DE ACCESO DE GERENCIA */}
      <ModalAccesoGerente />

      {/* ASISTENTE VIRTUAL FLOTANTE GLOBAL: FRIKACITO */}
      <FloatingVirtualAssistant
        userContext={{
          esGerente,
          workerNombre: currentWorker.nombre,
          workerCargo: currentWorker.cargoNombre,
        }}
        onNavigate={(target) => {
          setMobileMenuOpen(false);

          if (target.specialAction === 'open_gerente_login') {
            solicitarAccesoGerente();
            return;
          }
          if (target.specialAction === 'open_admin_sst') {
            if (!esGerente) {
              solicitarAccesoGerente();
              return;
            }
            setIsAdminPanelOpen(true);
            return;
          }
          if (target.specialAction === 'open_passport') {
            setIsPassportModalOpen(true);
            return;
          }
          if (target.specialAction === 'open_mission') {
            const primeraObligatoria =
              politicasMision.find((p) => p.esObligatoria) || politicasMision[0];
            if (primeraObligatoria) setActiveMissionPolicyId(primeraObligatoria.id);
            return;
          }
          if (target.specialAction === 'open_worker_selector') {
            setIsWorkerSelectorOpen(true);
            return;
          }

          setActiveTab(target.tab);
          if (target.tab === 'matriz_tabla' && target.searchQuery !== undefined) {
            setSearchTermMatriz(target.searchQuery);
            setAreaFilterMatriz('TODAS');
          }
          if (target.normaId) {
            const matchedNorma = items.find((n) => n.id === target.normaId);
            if (matchedNorma) handleOpenNorma(matchedNorma, false);
          }
          setAssistantNavTarget({ ...target, nonce: target.nonce || Date.now() });
        }}
      />
    </div>
  );
}
