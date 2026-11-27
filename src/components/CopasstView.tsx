import React, { useEffect, useMemo, useState } from 'react';
import type { AssistantNavigationTarget, SeccionPlanAnualNav } from '../types/assistantNavigation';
import type { TrabajadorFichaSST } from '../types/planAnual';
import type {
  CandidatoCopasst,
  CopasstStore,
  DocumentoCopasstRepo,
  MiembroCopasst,
  RepresentacionCopasst,
  TipoDocumentoCopasstRepo,
  TipoNotificacionCopasst,
  TipoParticipacionCopasst,
} from '../types/copasst';
import {
  construirPlantillaCorreoCopasst,
  generarActaEleccionCopasstPdf,
  generarActaEleccionCopasstWord,
  loadCopasstStore,
  saveCopasstStore,
} from '../services/copasstService';
import { enviarCorreoRealFrikaz, esCorreoValidoFrikaz } from '../services/frikazEmailHelper';
import { CARGOS_OFICIALES_NOMBRES, type CargoOficialNombre } from '../data/cargosOficiales';
import { getStoredCargosSST, getStoredVigiaSST } from '../services/organigramaService';
import { useGerenteAutorizado } from '../services/gerenteControlService';
import {
  AlertTriangle,
  Archive,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Crown,
  Download,
  Eye,
  FileText,
  History,
  Lock,
  Mail,
  Network,
  Paperclip,
  Plus,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react';

export type SubTabCopasst =
  | 'conformacion'
  | 'votacion'
  | 'miembros'
  | 'funciones'
  | 'notificaciones'
  | 'simulacion'
  | 'repositorio';

interface CopasstViewProps {
  trabajadores: TrabajadorFichaSST[];
  initialSubTab?: SubTabCopasst;
  onIrASeccionPlan?: (seccion: SeccionPlanAnualNav) => void;
  onNavigate?: (target: AssistantNavigationTarget) => void;
}

const TIPOS_NOTIFICACION_COPASST: TipoNotificacionCopasst[] = [
  'Convocatoria a elecciones',
  'Apertura del proceso de votación',
  'Fecha y horario de votación',
  'Recordatorio de votación',
  'Resultados de elección',
  'Designación de representantes del empleador',
  'Conformación oficial del comité',
  'Convocatorias a reuniones',
  'Recordatorios de actividades',
  'Comunicación de funciones y responsabilidades',
];

const TIPOS_DOCUMENTO_REPO: TipoDocumentoCopasstRepo[] = [
  'Convocatoria',
  'Listado de candidatos',
  'Registro de votación',
  'Acta de elección',
  'Acta de conformación',
  'Designación del empleador',
  'Registro de integrantes',
  'Acta de reunión',
  'Evidencia de actividad',
  'Capacitación del comité',
  'Comunicaciones enviadas',
];

export const CopasstView: React.FC<CopasstViewProps> = ({
  trabajadores,
  initialSubTab = 'conformacion',
  onIrASeccionPlan,
  onNavigate,
}) => {
  const { esGerente, nombreGerente, solicitarAccesoGerente } = useGerenteAutorizado();
  const [store, setStore] = useState<CopasstStore>(() => loadCopasstStore());
  const [subTab, setSubTab] = useState<SubTabCopasst>(initialSubTab);
  const [toast, setToast] = useState<string | null>(null);

  const cargosOrganigrama = useMemo(() => getStoredCargosSST(), []);
  const vigiaSst = useMemo(() => getStoredVigiaSST(), []);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const persist = (next: CopasstStore, accion?: string, detalle?: string) => {
    const hoy = new Date().toISOString().split('T')[0];
    const finalStore: CopasstStore = accion
      ? {
          ...next,
          historialCambios: [
            {
              id: `cop-hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              fecha: hoy,
              usuario: esGerente ? nombreGerente : 'Equipo Frikaz S.A.S.',
              accion,
              detalle: detalle || accion,
            },
            ...next.historialCambios,
          ],
        }
      : next;
    saveCopasstStore(finalStore);
    setStore(finalStore);
  };

  // Votación y candidatos
  const [candTrabId, setCandTrabId] = useState('');
  const [candPropuesta, setCandPropuesta] = useState('');
  const [votanteId, setVotanteId] = useState('');
  const [votoCandidatoId, setVotoCandidatoId] = useState('');

  // Miembro manual/edición
  const [showMiembroForm, setShowMiembroForm] = useState(false);
  const [editMiembroId, setEditMiembroId] = useState<string | null>(null);
  const [mForm, setMForm] = useState<Omit<MiembroCopasst, 'id'>>({
    trabajadorId: '',
    nombreCompleto: '',
    numeroIdentificacion: '',
    cargo: CARGOS_OFICIALES_NOMBRES[0],
    correo: '',
    representacion: 'Trabajadores',
    tipoParticipacion: 'Principal',
    fechaEleccionODesignacion: '',
    fechaInicioPeriodo: '',
    fechaFinPeriodo: '',
    estado: 'Activo',
    origenRegistro: 'Registro manual',
    periodoEtiqueta: '2027 - 2029',
  });

  // Funciones: registro de actividad realizada
  const [actFuncionId, setActFuncionId] = useState<string | null>(null);
  const [actDesc, setActDesc] = useState('');
  const [actFecha, setActFecha] = useState(new Date().toISOString().split('T')[0]);
  const [actSoporte, setActSoporte] = useState('');

  // Notificaciones por correo
  const [notifTipo, setNotifTipo] = useState<TipoNotificacionCopasst>('Convocatoria a elecciones');
  const [notifAsunto, setNotifAsunto] = useState(() =>
    construirPlantillaCorreoCopasst('Convocatoria a elecciones', loadCopasstStore()).subject
  );
  const [notifCuerpo, setNotifCuerpo] = useState(() =>
    construirPlantillaCorreoCopasst('Convocatoria a elecciones', loadCopasstStore()).text
  );
  const [notifEmailsSeleccionados, setNotifEmailsSeleccionados] = useState<string[]>([]);
  const [notifCorreoAdicional, setNotifCorreoAdicional] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [resultadoCorreo, setResultadoCorreo] = useState<{ ok: boolean; msg: string } | null>(null);

  // Simulación en organigrama
  const [simDraft, setSimDraft] = useState(store.simulacionOrganigrama);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [periodoConfirmInicio, setPeriodoConfirmInicio] = useState(
    store.conformacionConfig.fechaInicioPeriodo || new Date().toISOString().split('T')[0]
  );
  const [periodoConfirmFin, setPeriodoConfirmFin] = useState(
    store.conformacionConfig.fechaFinPeriodo || ''
  );

  // Repositorio documental
  const [repoSearch, setRepoSearch] = useState('');
  const [repoTipoFilter, setRepoTipoFilter] = useState<'TODOS' | TipoDocumentoCopasstRepo>('TODOS');
  const [repoFechaFilter, setRepoFechaFilter] = useState('');
  const [docForm, setDocForm] = useState<{
    tipo: TipoDocumentoCopasstRepo;
    titulo: string;
    nombreArchivo: string;
    fechaDocumento: string;
    relacionadoCon: string;
    observaciones: string;
    archivoDataUrl?: string;
  }>({
    tipo: 'Convocatoria',
    titulo: '',
    nombreArchivo: '',
    fechaDocumento: new Date().toISOString().split('T')[0],
    relacionadoCon: 'Proceso general COPASST',
    observaciones: '',
  });
  const [previewDoc, setPreviewDoc] = useState<DocumentoCopasstRepo | null>(null);

  const trabajadoresActivos = useMemo(
    () => trabajadores.filter((t) => t.estadoLaboral === 'ACTIVO'),
    [trabajadores]
  );

  const conteoResultados = useMemo(() => {
    return [...store.procesoEleccion.candidatos]
      .map((c) => ({
        ...c,
        votos: store.procesoEleccion.votos.filter((v) => v.candidatoId === c.id).length,
      }))
      .sort((a, b) => b.votos - a.votos);
  }, [store.procesoEleccion.candidatos, store.procesoEleccion.votos]);

  const ganadorPrincipal = useMemo(() => {
    if (store.procesoEleccion.registroExterno?.habilitado) {
      const id = store.procesoEleccion.registroExterno.principalElegidoId;
      return conteoResultados.find((c) => c.id === id) || null;
    }
    return conteoResultados.length > 0 && conteoResultados[0].votos > 0
      ? conteoResultados[0]
      : null;
  }, [conteoResultados, store.procesoEleccion.registroExterno]);

  const ganadorSuplente = useMemo(() => {
    if (store.procesoEleccion.registroExterno?.habilitado) {
      const id = store.procesoEleccion.registroExterno.suplenteElegidoId;
      return conteoResultados.find((c) => c.id === id) || null;
    }
    return conteoResultados.length > 1 && conteoResultados[1].votos > 0
      ? conteoResultados[1]
      : null;
  }, [conteoResultados, store.procesoEleccion.registroExterno]);

  const miembrosActivos = useMemo(
    () => store.miembros.filter((m) => m.estado === 'Activo'),
    [store.miembros]
  );
  const miembrosHistoricos = useMemo(
    () => store.miembros.filter((m) => m.estado === 'Inactivo'),
    [store.miembros]
  );

  // Estado calculado real (nunca fingido)
  const estadoComiteCalculado = useMemo(() => {
    if (store.conformacionConfig.estadoComite === 'Finalizado') return 'Finalizado';
    if (store.procesoEleccion.confirmacionOficialRealizada && miembrosActivos.length >= 4) {
      return 'Conformado';
    }
    if (
      store.procesoEleccion.fechaConvocatoria ||
      store.procesoEleccion.candidatos.length > 0 ||
      store.procesoEleccion.designadosEmpleadorBorrador.principalId
    ) {
      return 'En proceso';
    }
    return 'Pendiente';
  }, [store, miembrosActivos.length]);

  const handleSeleccionarPlantilla = (tipo: TipoNotificacionCopasst) => {
    setNotifTipo(tipo);
    const tpl = construirPlantillaCorreoCopasst(tipo, store);
    setNotifAsunto(tpl.subject);
    setNotifCuerpo(tpl.text);
  };

  const handleAgregarCandidato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const t = trabajadoresActivos.find((x) => x.id === candTrabId);
    if (!t) return;
    if (store.procesoEleccion.candidatos.some((c) => c.trabajadorId === t.id)) {
      notify('Este trabajador ya figura como candidato inscrito.');
      return;
    }
    const nuevo: CandidatoCopasst = {
      id: `cand-${Date.now()}`,
      trabajadorId: t.id,
      nombreCompleto: t.nombreCompleto,
      numeroIdentificacion: t.numeroDocumento,
      cargo: (CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(t.cargoNombre)
        ? (t.cargoNombre as CargoOficialNombre)
        : CARGOS_OFICIALES_NOMBRES[0],
      correo: t.correo,
      propuestaResumen: candPropuesta.trim(),
      fechaPostulacion: new Date().toISOString().split('T')[0],
    };
    persist(
      {
        ...store,
        procesoEleccion: {
          ...store.procesoEleccion,
          candidatos: [...store.procesoEleccion.candidatos, nuevo],
        },
        conformacionConfig: {
          ...store.conformacionConfig,
          estadoComite: estadoComiteCalculado === 'Pendiente' ? 'En proceso' : estadoComiteCalculado,
        },
      },
      'Inscripción de candidato COPASST',
      `${nuevo.nombreCompleto} (${nuevo.cargo})`
    );
    setCandTrabId('');
    setCandPropuesta('');
    notify(`Candidato ${nuevo.nombreCompleto} inscrito.`);
  };

  const handleRegistrarVotoSecreto = (e: React.FormEvent) => {
    e.preventDefault();
    if (store.procesoEleccion.estadoVotacion !== 'Abierta') {
      notify('La votación debe estar abierta para registrar votos.');
      return;
    }
    if (!votanteId || !votoCandidatoId) return;
    if (store.procesoEleccion.votantesRegistradosIds.includes(votanteId)) {
      notify('Este trabajador ya ejerció su voto. No se permiten votos duplicados.');
      return;
    }
    const voto = {
      id: `voto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      candidatoId: votoCandidatoId,
      fechaHora: new Date().toISOString(),
    };
    // Guardar voto sin vincular trabajadorId -> secreto del voto garantizado
    persist(
      {
        ...store,
        procesoEleccion: {
          ...store.procesoEleccion,
          votantesRegistradosIds: [...store.procesoEleccion.votantesRegistradosIds, votanteId],
          votos: [...store.procesoEleccion.votos, voto],
        },
      },
      'Participación registrada en votación COPASST',
      `Votante verificado #${store.procesoEleccion.votantesRegistradosIds.length + 1} (selección secreta).`
    );
    setVotanteId('');
    setVotoCandidatoId('');
    notify('Voto secreto registrado correctamente. Su selección individual permanece confidencial.');
  };

  const handleConfirmarConformacionOficial = () => {
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    const empP = trabajadores.find(
      (t) => t.id === store.procesoEleccion.designadosEmpleadorBorrador.principalId
    );
    const empS = trabajadores.find(
      (t) => t.id === store.procesoEleccion.designadosEmpleadorBorrador.suplenteId
    );
    if (!empP || !empS || !ganadorPrincipal || !ganadorSuplente) {
      notify(
        'Para confirmar la conformación oficial debe haber 1 principal y 1 suplente designados por el empleador, y 1 principal y 1 suplente elegidos por los trabajadores.'
      );
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const inactivarPrevios = store.miembros.map((m) =>
      m.estado === 'Activo' ? { ...m, estado: 'Inactivo' as const } : m
    );

    const nuevos: MiembroCopasst[] = [
      {
        id: `cop-m-ep-${Date.now()}`,
        trabajadorId: empP.id,
        nombreCompleto: empP.nombreCompleto,
        numeroIdentificacion: empP.numeroDocumento,
        cargo: (CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(empP.cargoNombre)
          ? (empP.cargoNombre as CargoOficialNombre)
          : CARGOS_OFICIALES_NOMBRES[0],
        correo: empP.correo || '',
        representacion: 'Empleador',
        tipoParticipacion: 'Principal',
        fechaEleccionODesignacion: store.conformacionConfig.fechaDesignacionEmpleador || hoy,
        fechaInicioPeriodo: periodoConfirmInicio || hoy,
        fechaFinPeriodo: periodoConfirmFin,
        estado: 'Activo',
        origenRegistro: 'Designación empleador',
        periodoEtiqueta: `${(periodoConfirmInicio || hoy).slice(0, 4)}`,
      },
      {
        id: `cop-m-es-${Date.now() + 1}`,
        trabajadorId: empS.id,
        nombreCompleto: empS.nombreCompleto,
        numeroIdentificacion: empS.numeroDocumento,
        cargo: (CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(empS.cargoNombre)
          ? (empS.cargoNombre as CargoOficialNombre)
          : CARGOS_OFICIALES_NOMBRES[0],
        correo: empS.correo || '',
        representacion: 'Empleador',
        tipoParticipacion: 'Suplente',
        fechaEleccionODesignacion: store.conformacionConfig.fechaDesignacionEmpleador || hoy,
        fechaInicioPeriodo: periodoConfirmInicio || hoy,
        fechaFinPeriodo: periodoConfirmFin,
        estado: 'Activo',
        origenRegistro: 'Designación empleador',
        periodoEtiqueta: `${(periodoConfirmInicio || hoy).slice(0, 4)}`,
      },
      {
        id: `cop-m-tp-${Date.now() + 2}`,
        trabajadorId: ganadorPrincipal.trabajadorId,
        nombreCompleto: ganadorPrincipal.nombreCompleto,
        numeroIdentificacion: ganadorPrincipal.numeroIdentificacion,
        cargo: ganadorPrincipal.cargo,
        correo: ganadorPrincipal.correo || '',
        representacion: 'Trabajadores',
        tipoParticipacion: 'Principal',
        fechaEleccionODesignacion: store.procesoEleccion.fechaVotacion || hoy,
        fechaInicioPeriodo: periodoConfirmInicio || hoy,
        fechaFinPeriodo: periodoConfirmFin,
        estado: 'Activo',
        origenRegistro: 'Elección trabajadores',
        periodoEtiqueta: `${(periodoConfirmInicio || hoy).slice(0, 4)}`,
      },
      {
        id: `cop-m-ts-${Date.now() + 3}`,
        trabajadorId: ganadorSuplente.trabajadorId,
        nombreCompleto: ganadorSuplente.nombreCompleto,
        numeroIdentificacion: ganadorSuplente.numeroIdentificacion,
        cargo: ganadorSuplente.cargo,
        correo: ganadorSuplente.correo || '',
        representacion: 'Trabajadores',
        tipoParticipacion: 'Suplente',
        fechaEleccionODesignacion: store.procesoEleccion.fechaVotacion || hoy,
        fechaInicioPeriodo: periodoConfirmInicio || hoy,
        fechaFinPeriodo: periodoConfirmFin,
        estado: 'Activo',
        origenRegistro: 'Elección trabajadores',
        periodoEtiqueta: `${(periodoConfirmInicio || hoy).slice(0, 4)}`,
      },
    ];

    persist(
      {
        ...store,
        conformacionConfig: {
          ...store.conformacionConfig,
          estadoComite: 'Conformado',
          fechaEleccion: store.procesoEleccion.fechaVotacion || hoy,
          fechaConformacionOficial: hoy,
          fechaInicioPeriodo: periodoConfirmInicio || hoy,
          fechaFinPeriodo: periodoConfirmFin,
        },
        procesoEleccion: {
          ...store.procesoEleccion,
          confirmacionOficialRealizada: true,
          fechaConfirmacionOficial: hoy,
        },
        miembros: [...nuevos, ...inactivarPrevios],
      },
      'Confirmación oficial del COPASST',
      `Conformación oficial registrada por ${nombreGerente}: 4 integrantes activos (${empP.nombreCompleto}, ${empS.nombreCompleto}, ${ganadorPrincipal.nombreCompleto}, ${ganadorSuplente.nombreCompleto}).`
    );
    setShowConfirmModal(false);
    setSubTab('miembros');
    notify('Conformación oficial del COPASST guardada. Los miembros ya figuran como oficiales.');
  };

  const handleGuardarMiembroManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esGerente) {
      solicitarAccesoGerente();
      return;
    }
    if (!mForm.nombreCompleto.trim()) return;
    if (editMiembroId) {
      persist(
        {
          ...store,
          miembros: store.miembros.map((m) =>
            m.id === editMiembroId ? { ...mForm, id: editMiembroId } : m
          ),
        },
        'Edición de miembro del COPASST',
        `${mForm.nombreCompleto} (${mForm.representacion} · ${mForm.tipoParticipacion})`
      );
      notify('Integrante actualizado.');
    } else {
      const nuevo: MiembroCopasst = { ...mForm, id: `cop-m-${Date.now()}` };
      persist(
        { ...store, miembros: [nuevo, ...store.miembros] },
        'Registro de miembro del COPASST',
        `${nuevo.nombreCompleto} (${nuevo.cargo})`
      );
      notify('Integrante registrado.');
    }
    setShowMiembroForm(false);
    setEditMiembroId(null);
  };

  const handleEnviarNotificacionReal = async () => {
    const destinatarios = [
      ...notifEmailsSeleccionados,
      ...(notifCorreoAdicional.trim() ? [notifCorreoAdicional.trim()] : []),
    ].filter((e, idx, arr) => esCorreoValidoFrikaz(e) && arr.indexOf(e) === idx);

    if (destinatarios.length === 0) {
      setResultadoCorreo({
        ok: false,
        msg: 'Seleccione al menos un destinatario con correo electrónico válido.',
      });
      return;
    }

    setEnviandoCorreo(true);
    setResultadoCorreo(null);

    const exitos: string[] = [];
    const errores: string[] = [];
    const nuevasEntradas = [...store.notificacionesEnviadas];

    for (const email of destinatarios) {
      const res = await enviarCorreoRealFrikaz({
        to: email,
        subject: notifAsunto,
        text: notifCuerpo,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h3 style="color:#0f5b53;margin-bottom:8px;">FRIKAZ S.A.S. — COPASST</h3>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;">${notifCuerpo
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</pre>
        </div>`,
        tipoNotificacion: `COPASST: ${notifTipo}`,
      });

      nuevasEntradas.unshift({
        id: `not-cop-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        fecha: new Date().toLocaleString('es-CO'),
        tipo: notifTipo,
        destinatarios: [email],
        asunto: notifAsunto,
        cuerpoPreview: notifCuerpo,
        canal: res.canal,
        estadoEnvio: res.success ? 'Enviado' : 'Error',
        detalleError: res.error,
        trackingCode: res.trackingCode,
      });

      if (res.success) exitos.push(email);
      else errores.push(`${email}: ${res.error || 'Error SMTP/Gmail'}`);
    }

    persist(
      { ...store, notificacionesEnviadas: nuevasEntradas },
      `Envío de notificación COPASST (${notifTipo})`,
      `Enviados: ${exitos.length} · Fallidos: ${errores.length}`
    );

    setEnviandoCorreo(false);
    if (errores.length === 0) {
      setResultadoCorreo({
        ok: true,
        msg: `Correo enviado realmente a ${exitos.join(', ')}.`,
      });
    } else {
      setResultadoCorreo({
        ok: false,
        msg: `Error al enviar (${errores.join(' | ')}). Verifique la configuración Gmail/SMTP en la aplicación.`,
      });
    }
  };

  const handleGuardarDocumentoRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.titulo.trim() || !docForm.nombreArchivo.trim()) return;
    const hoy = new Date().toISOString().split('T')[0];
    const nuevo: DocumentoCopasstRepo = {
      id: `doc-cop-${Date.now()}`,
      codigoRegistro: `COP-DOC-${String(store.repositorioDocumentos.length + 1).padStart(3, '0')}`,
      tipo: docForm.tipo,
      titulo: docForm.titulo.trim(),
      nombreArchivo: docForm.nombreArchivo.trim(),
      archivoDataUrl: docForm.archivoDataUrl,
      fechaDocumento: docForm.fechaDocumento || hoy,
      fechaCarga: hoy,
      responsable: esGerente ? nombreGerente : 'Equipo Frikaz S.A.S.',
      relacionadoCon: docForm.relacionadoCon.trim() || 'COPASST Frikaz S.A.S.',
      observaciones: docForm.observaciones.trim(),
    };
    persist(
      {
        ...store,
        repositorioDocumentos: [nuevo, ...store.repositorioDocumentos],
      },
      `Documento cargado en Repositorio COPASST (${nuevo.tipo})`,
      `${nuevo.codigoRegistro} · ${nuevo.nombreArchivo}`
    );
    setDocForm({
      tipo: 'Convocatoria',
      titulo: '',
      nombreArchivo: '',
      fechaDocumento: hoy,
      relacionadoCon: 'Proceso general COPASST',
      observaciones: '',
    });
    notify(`Documento ${nuevo.codigoRegistro} guardado en el repositorio del COPASST.`);
  };

  // Colores de distintivos para simulación en organigrama
  const getSimBadgeForTrabajador = (trabajadorId: string) => {
    if (simDraft.empleadorPrincipal?.trabajadorId === trabajadorId) {
      return {
        rol: 'Representante principal del empleador',
        cls: 'bg-indigo-100 text-indigo-950 border-indigo-400',
      };
    }
    if (simDraft.empleadorSuplente?.trabajadorId === trabajadorId) {
      return {
        rol: 'Suplente del empleador',
        cls: 'bg-sky-100 text-sky-950 border-sky-400',
      };
    }
    if (simDraft.trabajadoresPrincipal?.trabajadorId === trabajadorId) {
      return {
        rol: 'Representante principal de los trabajadores',
        cls: 'bg-emerald-100 text-emerald-950 border-emerald-400',
      };
    }
    if (simDraft.trabajadoresSuplente?.trabajadorId === trabajadorId) {
      return {
        rol: 'Suplente de los trabajadores',
        cls: 'bg-amber-100 text-amber-950 border-amber-400',
      };
    }
    return null;
  };

  const docsFiltrados = useMemo(() => {
    const q = repoSearch.trim().toLowerCase();
    return store.repositorioDocumentos.filter((d) => {
      if (repoTipoFilter !== 'TODOS' && d.tipo !== repoTipoFilter) return false;
      if (repoFechaFilter && d.fechaDocumento !== repoFechaFilter) return false;
      if (q) {
        const blob = `${d.codigoRegistro} ${d.titulo} ${d.nombreArchivo} ${d.relacionadoCon || ''} ${d.responsable}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [store.repositorioDocumentos, repoSearch, repoTipoFilter, repoFechaFilter]);

  return (
    <div className="space-y-4 text-xs">
      {/* Encabezado principal COPASST */}
      <div className="rounded-2xl border border-[#b9dad3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#0d3b36] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0f6b61]" />
                <span>COPASST – COMITÉ PARITARIO DE SEGURIDAD Y SALUD EN EL TRABAJO</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-lg border font-black text-[10px] ${
                  estadoComiteCalculado === 'Conformado'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : estadoComiteCalculado === 'En proceso'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Estado: {estadoComiteCalculado}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Organización, elecciones secretas, registro de integrantes con los 6 cargos oficiales de Frikaz S.A.S., funciones, notificaciones reales y simulación visual sobre el organigrama existente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('simulacion')}
              className="px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Network className="h-4 w-4" />
              <span>SIMULAR COPASST EN EL ORGANIGRAMA</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('notificaciones')}
              className="px-3.5 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5 text-[#fed7aa]" />
              <span>ENVIAR NOTIFICACIÓN AL CORREO</span>
            </button>
          </div>
        </div>

        {/* Navegación interna de 7 secciones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { id: 'conformacion', label: '1. Conformación', icon: Scale },
            { id: 'votacion', label: '2. Votación', icon: Vote },
            { id: 'miembros', label: '3. Miembros', icon: UserCheck },
            { id: 'funciones', label: '4. Funciones', icon: ClipboardCheck },
            { id: 'notificaciones', label: '5. Notificaciones', icon: Mail },
            { id: 'simulacion', label: '6. Simulación', icon: Network },
            { id: 'repositorio', label: '7. Repositorio', icon: Archive },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as SubTabCopasst)}
                className={`px-2.5 py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                    : 'bg-[#f4faf8] text-[#173f3a] border-[#d6ebe5] hover:bg-[#e5f3ef]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#fed7aa]' : 'text-[#0f6b61]'}`} />
                <span className="truncate text-[11px]">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conexiones rápidas con los demás apartados del SG-SST */}
        <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-black text-[#0d3b36]">Conexiones SG-SST:</span>
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() =>
                  onNavigate({ tab: 'ficha_empresa', empresaSubcategoria: 'organigrama' })
                }
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Equipo y Vigía SST
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ tab: 'matriz_riesgos', riskViewMode: 'por_cargos' })}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Matriz de Peligros
              </button>
            </>
          )}
          {onIrASeccionPlan && (
            <>
              <button
                type="button"
                onClick={() => onIrASeccionPlan('planes_riesgo')}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Planes de mejora
              </button>
              <button
                type="button"
                onClick={() => onIrASeccionPlan('plan_emergencias')}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Plan de emergencias
              </button>
              <button
                type="button"
                onClick={() => onIrASeccionPlan('indicadores')}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Indicadores e inspecciones
              </button>
              <button
                type="button"
                onClick={() => onIrASeccionPlan('evidencias')}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-bold text-[#0f5b53] hover:bg-[#e7f4f1] cursor-pointer"
              >
                Evidencias Plan Anual
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-emerald-950 font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 1. CONFORMACIÓN DEL COMITÉ Y NORMATIVA                             */}
      {/* ================================================================== */}
      {subTab === 'conformacion' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-4">
              <h4 className="text-sm font-black text-[#0d3b36] border-b border-[#e8f2ef] pb-2">
                Estructura paritaria para Frikaz S.A.S. (10 trabajadores)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-center">
                  <span className="text-[10px] font-bold text-indigo-800 block">Empleador Principal</span>
                  <span className="text-xl font-black text-indigo-950">
                    {store.conformacionConfig.cuposEmpleadorPrincipal}
                  </span>
                </div>
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-center">
                  <span className="text-[10px] font-bold text-sky-800 block">Empleador Suplente</span>
                  <span className="text-xl font-black text-sky-950">
                    {store.conformacionConfig.cuposEmpleadorSuplente}
                  </span>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 block">Trabajadores Principal</span>
                  <span className="text-xl font-black text-emerald-950">
                    {store.conformacionConfig.cuposTrabajadoresPrincipal}
                  </span>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <span className="text-[10px] font-bold text-amber-800 block">Trabajadores Suplente</span>
                  <span className="text-xl font-black text-amber-950">
                    {store.conformacionConfig.cuposTrabajadoresSuplente}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Estado real del comité</span>
                  <strong className="text-sm text-[#0d3b36]">{estadoComiteCalculado}</strong>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Fecha de convocatoria</span>
                  <strong className="font-mono text-slate-900">
                    {store.procesoEleccion.fechaConvocatoria || 'Pendiente de verificación'}
                  </strong>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Fecha de elección</span>
                  <strong className="font-mono text-slate-900">
                    {store.procesoEleccion.fechaVotacion || 'Pendiente de verificación'}
                  </strong>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Designación empleador</span>
                  <strong className="font-mono text-slate-900">
                    {store.conformacionConfig.fechaDesignacionEmpleador || 'Pendiente de verificación'}
                  </strong>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Conformación oficial</span>
                  <strong className="font-mono text-slate-900">
                    {store.conformacionConfig.fechaConformacionOficial || 'Sin confirmar aún'}
                  </strong>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-slate-500 block">Periodo registrado</span>
                  <strong className="font-mono text-slate-900">
                    {store.conformacionConfig.fechaInicioPeriodo
                      ? `${store.conformacionConfig.fechaInicioPeriodo} → ${
                          store.conformacionConfig.fechaFinPeriodo || 'Pendiente'
                        }`
                      : 'Pendiente de confirmación'}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubTab('votacion')}
                  className="px-4 py-2 rounded-xl bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] cursor-pointer"
                >
                  Ir a Votación y Designación →
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black hover:bg-[#ea580c] cursor-pointer"
                >
                  CONFIRMAR CONFORMACIÓN OFICIAL DEL COPASST
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36]">
                  Marco Normativo Vigente (Colombia)
                </h4>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    store.conformacionConfig.estadoVerificacionLegal === 'Confirmado por Gerencia'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {store.conformacionConfig.estadoVerificacionLegal}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                {store.conformacionConfig.notaNormativa}
              </p>
              <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 text-[11px] space-y-1">
                <p>
                  <strong>Obligación legal vs Recomendación:</strong> La elección libre de los representantes de los trabajadores mediante votación y la paridad 1+1 (para rango 10–49 trabajadores) son requisitos normativos (Resolución 2013 de 1986, Decreto 1295 de 1994 Art. 63, Decreto 1072 de 2015). El uso de simulación previa sobre el organigrama es una buena práctica organizativa interna.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!esGerente) {
                    solicitarAccesoGerente();
                    return;
                  }
                  const nextEstado =
                    store.conformacionConfig.estadoVerificacionLegal === 'Confirmado por Gerencia'
                      ? 'Pendiente de verificación normativa'
                      : 'Confirmado por Gerencia';
                  persist(
                    {
                      ...store,
                      conformacionConfig: {
                        ...store.conformacionConfig,
                        estadoVerificacionLegal: nextEstado,
                      },
                    },
                    'Verificación normativa COPASST',
                    `Estado cambiado a ${nextEstado}`
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#0f6b61] font-bold text-[#0d3b36] cursor-pointer"
              >
                {store.conformacionConfig.estadoVerificacionLegal === 'Confirmado por Gerencia'
                  ? 'Marcar como pendiente de verificación normativa'
                  : 'Confirmar verificación normativa (Gerente)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. VOTACIÓN, ELECCIÓN Y DESIGNACIÓN DEL EMPLEADOR                  */}
      {/* ================================================================== */}
      {subTab === 'votacion' && (
        <div className="space-y-4">
          {/* Parámetros del proceso y designación empleador */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <h4 className="text-sm font-black text-[#0d3b36] border-b border-[#e8f2ef] pb-2">
                Configuración de Convocatoria y Jornada Electoral
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha convocatoria</label>
                  <input
                    type="date"
                    disabled={!esGerente}
                    value={store.procesoEleccion.fechaConvocatoria}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            fechaConvocatoria: e.target.value,
                          },
                          conformacionConfig: {
                            ...store.conformacionConfig,
                            fechaConvocatoria: e.target.value,
                          },
                        },
                        'Fecha de convocatoria actualizada',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha votación</label>
                  <input
                    type="date"
                    disabled={!esGerente}
                    value={store.procesoEleccion.fechaVotacion}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            fechaVotacion: e.target.value,
                          },
                          conformacionConfig: {
                            ...store.conformacionConfig,
                            fechaEleccion: e.target.value,
                          },
                        },
                        'Fecha de votación actualizada',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Horario votación</label>
                  <input
                    type="text"
                    disabled={!esGerente}
                    value={store.procesoEleccion.horarioVotacion}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            horarioVotacion: e.target.value,
                          },
                        },
                        'Horario de votación actualizado',
                        e.target.value
                      )
                    }
                    placeholder="Ej. 08:00 a.m. - 04:00 p.m."
                    className="w-full rounded-xl border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Estado votación:</span>
                  {(['Por iniciar', 'Abierta', 'Cerrada'] as const).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => {
                        if (!esGerente) {
                          solicitarAccesoGerente();
                          return;
                        }
                        persist(
                          {
                            ...store,
                            procesoEleccion: {
                              ...store.procesoEleccion,
                              estadoVotacion: est,
                            },
                          },
                          'Estado de votación COPASST',
                          `Votación cambiada a "${est}"`
                        );
                      }}
                      className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${
                        store.procesoEleccion.estadoVotacion === est
                          ? 'bg-[#0f5b53] text-white border-[#0f5b53]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <h4 className="text-sm font-black text-[#0d3b36] border-b border-[#e8f2ef] pb-2">
                Representantes designados directamente por el Empleador
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Representante Principal
                  </label>
                  <select
                    disabled={!esGerente}
                    value={store.procesoEleccion.designadosEmpleadorBorrador.principalId || ''}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            designadosEmpleadorBorrador: {
                              ...store.procesoEleccion.designadosEmpleadorBorrador,
                              principalId: e.target.value || undefined,
                            },
                          },
                        },
                        'Designación borrador empleador (Principal)',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="">-- Seleccionar --</option>
                    {trabajadoresActivos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombreCompleto} ({t.cargoNombre})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Representante Suplente
                  </label>
                  <select
                    disabled={!esGerente}
                    value={store.procesoEleccion.designadosEmpleadorBorrador.suplenteId || ''}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            designadosEmpleadorBorrador: {
                              ...store.procesoEleccion.designadosEmpleadorBorrador,
                              suplenteId: e.target.value || undefined,
                            },
                          },
                        },
                        'Designación borrador empleador (Suplente)',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="">-- Seleccionar --</option>
                    {trabajadoresActivos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombreCompleto} ({t.cargoNombre})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fecha designación
                  </label>
                  <input
                    type="date"
                    disabled={!esGerente}
                    value={store.conformacionConfig.fechaDesignacionEmpleador || ''}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          conformacionConfig: {
                            ...store.conformacionConfig,
                            fechaDesignacionEmpleador: e.target.value,
                          },
                        },
                        'Fecha designación empleador',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Esta selección queda registrada en proceso hasta presionar <strong>CONFIRMAR CONFORMACIÓN OFICIAL DEL COPASST</strong>.
              </p>
            </div>
          </div>

          {/* Candidatos inscritos + urna secreta */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <h4 className="text-sm font-black text-[#0d3b36]">
                Candidatos de los trabajadores ({store.procesoEleccion.candidatos.length})
              </h4>

              <form onSubmit={handleAgregarCandidato} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={candTrabId}
                  onChange={(e) => setCandTrabId(e.target.value)}
                  className="rounded-xl border border-slate-300 p-2 bg-white font-bold"
                >
                  <option value="">Elegir trabajador oficial...</option>
                  {trabajadoresActivos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombreCompleto} ({t.cargoNombre})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={candPropuesta}
                  onChange={(e) => setCandPropuesta(e.target.value)}
                  placeholder="Propuesta breve (opcional)"
                  className="rounded-xl border border-slate-300 p-2"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Inscribir candidato</span>
                </button>
              </form>

              <div className="space-y-2">
                {conteoResultados.map((c, idx) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-black text-[#0d3b36]">
                        {c.nombreCompleto}{' '}
                        <span className="text-[10px] font-bold text-[#0f6b61]">({c.cargo})</span>
                      </p>
                      <p className="text-[10px] text-slate-600">
                        Doc. {c.numeroIdentificacion} · Postulado: {c.fechaPostulacion}
                        {c.propuestaResumen ? ` · "${c.propuestaResumen}"` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#cfe5df] font-mono font-black text-[#0d3b36]">
                        {c.votos} voto(s)
                      </span>
                      {idx === 0 && c.votos > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
                          Principal
                        </span>
                      )}
                      {idx === 1 && c.votos > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                          Suplente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {conteoResultados.length === 0 && (
                  <p className="text-center text-slate-500 py-4">
                    Aún no hay candidatos inscritos para representar a los trabajadores.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#e8f2ef] pb-2">
                <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-[#0f6b61]" />
                  <span>Urna Secreta (1 persona = 1 voto confidencial)</span>
                </h4>
                <span className="font-mono text-[11px] font-bold text-[#0f5b53]">
                  Participación: {store.procesoEleccion.votantesRegistradosIds.length}/{trabajadoresActivos.length}
                </span>
              </div>

              <form onSubmit={handleRegistrarVotoSecreto} className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    1. Verificación de identidad del votante (no queda asociada al voto)
                  </label>
                  <select
                    value={votanteId}
                    onChange={(e) => setVotanteId(e.target.value)}
                    disabled={store.procesoEleccion.estadoVotacion !== 'Abierta'}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold disabled:opacity-60"
                  >
                    <option value="">Seleccionar trabajador habilitado...</option>
                    {trabajadoresActivos.map((t) => {
                      const yaVoto = store.procesoEleccion.votantesRegistradosIds.includes(t.id);
                      return (
                        <option key={t.id} value={t.id} disabled={yaVoto}>
                          {t.nombreCompleto} ({t.cargoNombre}) {yaVoto ? '— Ya votó ✓' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    2. Selección confidencial de candidato
                  </label>
                  <div className="space-y-1.5">
                    {store.procesoEleccion.candidatos.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer ${
                          votoCandidatoId === c.id
                            ? 'bg-[#e7f4f1] border-[#0f6b61] font-black'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="votoCopasst"
                          checked={votoCandidatoId === c.id}
                          onChange={() => setVotoCandidatoId(c.id)}
                          disabled={store.procesoEleccion.estadoVotacion !== 'Abierta'}
                        />
                        <span>
                          {c.nombreCompleto} · <em className="text-slate-600">{c.cargo}</em>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={
                      store.procesoEleccion.estadoVotacion !== 'Abierta' ||
                      !votanteId ||
                      !votoCandidatoId
                    }
                    className="px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer disabled:opacity-50"
                  >
                    Registrar voto secreto
                  </button>
                  <button
                    type="button"
                    onClick={() => generarActaEleccionCopasstPdf(store)}
                    className="px-3.5 py-2 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Acta PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generarActaEleccionCopasstWord(store)}
                    className="px-3.5 py-2 rounded-xl bg-[#0f5b53] text-white font-bold hover:bg-[#0c4842] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Acta Word (.docx)</span>
                  </button>
                </div>
              </form>

              {/* Opción para registrar resultado de votación realizada por otro medio */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <label className="flex items-center gap-2 font-bold text-[#0d3b36] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(store.procesoEleccion.registroExterno?.habilitado)}
                    disabled={!esGerente}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            registroExterno: {
                              habilitado: e.target.checked,
                              medioUtilizado:
                                store.procesoEleccion.registroExterno?.medioUtilizado ||
                                'Urna física / Acta presencial',
                              ...store.procesoEleccion.registroExterno,
                            },
                          },
                        },
                        'Modalidad votación externa',
                        e.target.checked ? 'Habilitada' : 'Deshabilitada'
                      )
                    }
                  />
                  <span>Registrar resultado de votación física / externa con soporte adjunto</span>
                </label>
                {store.procesoEleccion.registroExterno?.habilitado && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <select
                      disabled={!esGerente}
                      value={store.procesoEleccion.registroExterno.principalElegidoId || ''}
                      onChange={(e) =>
                        persist({
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            registroExterno: {
                              ...store.procesoEleccion.registroExterno!,
                              principalElegidoId: e.target.value,
                            },
                          },
                        })
                      }
                      className="rounded-lg border border-slate-300 p-1.5 bg-white"
                    >
                      <option value="">Elegido Principal (acta física)...</option>
                      {store.procesoEleccion.candidatos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombreCompleto}
                        </option>
                      ))}
                    </select>
                    <select
                      disabled={!esGerente}
                      value={store.procesoEleccion.registroExterno.suplenteElegidoId || ''}
                      onChange={(e) =>
                        persist({
                          ...store,
                          procesoEleccion: {
                            ...store.procesoEleccion,
                            registroExterno: {
                              ...store.procesoEleccion.registroExterno!,
                              suplenteElegidoId: e.target.value,
                            },
                          },
                        })
                      }
                      className="rounded-lg border border-slate-300 p-1.5 bg-white"
                    >
                      <option value="">Elegido Suplente (acta física)...</option>
                      {store.procesoEleccion.candidatos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombreCompleto}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-[#0d3b36]">
                ¿Finalizó la votación de trabajadores y la designación del empleador?
              </p>
              <p className="text-[11px] text-slate-600">
                Los miembros oficiales solo se actualizan después de la confirmación autorizada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
            >
              CONFIRMAR CONFORMACIÓN OFICIAL DEL COPASST
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 3. MIEMBROS DEL COPASST (ACTIVOS E HISTORIAL)                      */}
      {/* ================================================================== */}
      {subTab === 'miembros' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-[#0d3b36]">
                Integrantes Oficiales del COPASST ({miembrosActivos.length} activos · {miembrosHistoricos.length} históricos)
              </h4>
              <p className="text-[11px] text-slate-600">
                Todos los cargos se seleccionan exclusivamente de los 6 cargos oficiales definidos en «1. Equipo y responsabilidades SST».
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!esGerente) {
                  solicitarAccesoGerente();
                  return;
                }
                setEditMiembroId(null);
                setShowMiembroForm(!showMiembroForm);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar / Editar Miembro</span>
            </button>
          </div>

          {showMiembroForm && (
            <form
              onSubmit={handleGuardarMiembroManual}
              className="rounded-2xl border-2 border-[#f97316] bg-orange-50/40 p-5 space-y-3"
            >
              <h5 className="font-black text-[#0d3b36]">
                {editMiembroId ? 'Editar integrante del COPASST' : 'Nuevo integrante del COPASST'}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Vincular trabajador existente (opcional)
                  </label>
                  <select
                    value={mForm.trabajadorId || ''}
                    onChange={(e) => {
                      const t = trabajadores.find((x) => x.id === e.target.value);
                      if (t) {
                        setMForm({
                          ...mForm,
                          trabajadorId: t.id,
                          nombreCompleto: t.nombreCompleto,
                          numeroIdentificacion: t.numeroDocumento,
                          cargo: (CARGOS_OFICIALES_NOMBRES as readonly string[]).includes(t.cargoNombre)
                            ? (t.cargoNombre as CargoOficialNombre)
                            : CARGOS_OFICIALES_NOMBRES[0],
                          correo: t.correo || '',
                        });
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white"
                  >
                    <option value="">Seleccionar trabajador...</option>
                    {trabajadores.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombreCompleto} ({t.cargoNombre})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    value={mForm.nombreCompleto}
                    onChange={(e) => setMForm({ ...mForm, nombreCompleto: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Número de identificación
                  </label>
                  <input
                    type="text"
                    value={mForm.numeroIdentificacion}
                    onChange={(e) =>
                      setMForm({ ...mForm, numeroIdentificacion: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cargo oficial en Frikaz S.A.S. *
                  </label>
                  <select
                    value={mForm.cargo}
                    onChange={(e) => setMForm({ ...mForm, cargo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    {CARGOS_OFICIALES_NOMBRES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={mForm.correo}
                    onChange={(e) => setMForm({ ...mForm, correo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Representación</label>
                  <select
                    value={mForm.representacion}
                    onChange={(e) =>
                      setMForm({ ...mForm, representacion: e.target.value as RepresentacionCopasst })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="Empleador">Empleador</option>
                    <option value="Trabajadores">Trabajadores</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Participación</label>
                  <select
                    value={mForm.tipoParticipacion}
                    onChange={(e) =>
                      setMForm({
                        ...mForm,
                        tipoParticipacion: e.target.value as TipoParticipacionCopasst,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Suplente">Suplente</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fecha elección / designación
                  </label>
                  <input
                    type="date"
                    value={mForm.fechaEleccionODesignacion}
                    onChange={(e) =>
                      setMForm({ ...mForm, fechaEleccionODesignacion: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Inicio periodo</label>
                  <input
                    type="date"
                    value={mForm.fechaInicioPeriodo}
                    onChange={(e) => setMForm({ ...mForm, fechaInicioPeriodo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fin periodo</label>
                  <input
                    type="date"
                    value={mForm.fechaFinPeriodo}
                    onChange={(e) => setMForm({ ...mForm, fechaFinPeriodo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estado</label>
                  <select
                    value={mForm.estado}
                    onChange={(e) =>
                      setMForm({ ...mForm, estado: e.target.value as 'Activo' | 'Inactivo' })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo (Histórico)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
                >
                  Guardar integrante
                </button>
                <button
                  type="button"
                  onClick={() => setShowMiembroForm(false)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-[#b9dad3] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4faf8] text-[#0d3b36] border-b border-[#cfe5df]">
                    <th className="p-2.5">Nombre completo</th>
                    <th className="p-2.5">Identificación</th>
                    <th className="p-2.5">Cargo oficial</th>
                    <th className="p-2.5">Representación</th>
                    <th className="p-2.5">Participación</th>
                    <th className="p-2.5">Periodo</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {store.miembros.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-black text-slate-900">
                        {m.nombreCompleto}
                        {m.correo && (
                          <span className="block text-[10px] font-normal text-slate-500">
                            {m.correo}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">{m.numeroIdentificacion || 'Pendiente'}</td>
                      <td className="p-2.5 font-bold text-[#0f5b53]">{m.cargo}</td>
                      <td className="p-2.5 font-bold">{m.representacion}</td>
                      <td className="p-2.5">{m.tipoParticipacion}</td>
                      <td className="p-2.5 font-mono text-[11px]">
                        {m.fechaInicioPeriodo || 'Pend.'} → {m.fechaFinPeriodo || 'Pend.'}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            m.estado === 'Activo'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {m.estado}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (!esGerente) {
                              solicitarAccesoGerente();
                              return;
                            }
                            setEditMiembroId(m.id);
                            setMForm(m);
                            setShowMiembroForm(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-[10px] cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {store.miembros.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">
                        Pendiente de confirmación oficial: aún no se han confirmado integrantes del COPASST.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. FUNCIONES Y RESPONSABILIDADES DEL COPASST                       */}
      {/* ================================================================== */}
      {subTab === 'funciones' && (
        <div className="space-y-3">
          {store.funciones.map((fn) => (
            <div
              key={fn.id}
              className="rounded-2xl border border-[#b9dad3] bg-white p-4 space-y-2.5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-black text-[#0f6b61] text-[10px]">
                    Función #{fn.orden}
                  </span>
                  <h5 className="text-sm font-black text-[#0d3b36]">{fn.titulo}</h5>
                  <p className="text-slate-600">{fn.descripcion}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={fn.responsableAsignado || ''}
                    onChange={(e) =>
                      persist(
                        {
                          ...store,
                          funciones: store.funciones.map((x) =>
                            x.id === fn.id ? { ...x, responsableAsignado: e.target.value } : x
                          ),
                        },
                        `Responsable asignado a función #${fn.orden}`,
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white font-bold text-[11px]"
                  >
                    <option value="">Responsable (por asignar)...</option>
                    {miembrosActivos.map((m) => (
                      <option key={m.id} value={m.nombreCompleto}>
                        {m.nombreCompleto} ({m.representacion})
                      </option>
                    ))}
                    {CARGOS_OFICIALES_NOMBRES.map((c) => (
                      <option key={c} value={c}>
                        Cargo: {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActFuncionId(actFuncionId === fn.id ? null : fn.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#0f5b53] text-white font-black hover:bg-[#0c4842] cursor-pointer"
                  >
                    + Registrar actividad ({fn.actividadesRealizadas.length})
                  </button>
                </div>
              </div>

              {actFuncionId === fn.id && (
                <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={actDesc}
                    onChange={(e) => setActDesc(e.target.value)}
                    placeholder="Descripción de actividad / inspección / reunión..."
                    className="sm:col-span-2 rounded-lg border border-slate-300 p-2 bg-white"
                  />
                  <input
                    type="date"
                    value={actFecha}
                    onChange={(e) => setActFecha(e.target.value)}
                    className="rounded-lg border border-slate-300 p-2 bg-white font-mono"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={actSoporte}
                      onChange={(e) => setActSoporte(e.target.value)}
                      placeholder="Nombre soporte / acta"
                      className="flex-1 rounded-lg border border-slate-300 p-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!actDesc.trim()) return;
                        persist(
                          {
                            ...store,
                            funciones: store.funciones.map((x) =>
                              x.id === fn.id
                                ? {
                                    ...x,
                                    estadoSeguimiento: 'Realizada',
                                    actividadesRealizadas: [
                                      {
                                        id: `actf-${Date.now()}`,
                                        fecha: actFecha,
                                        descripcion: actDesc.trim(),
                                        registradoPor: esGerente ? nombreGerente : 'COPASST Frikaz',
                                        soporteNombre: actSoporte.trim() || undefined,
                                      },
                                      ...x.actividadesRealizadas,
                                    ],
                                  }
                                : x
                            ),
                          },
                          `Actividad registrada en función COPASST #${fn.orden}`,
                          actDesc.trim()
                        );
                        setActDesc('');
                        setActSoporte('');
                        setActFuncionId(null);
                        notify('Actividad del COPASST registrada.');
                      }}
                      className="px-3 py-2 rounded-lg bg-[#f97316] text-white font-black cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {fn.actividadesRealizadas.length > 0 && (
                <div className="space-y-1 pt-1">
                  {fn.actividadesRealizadas.map((act) => (
                    <div
                      key={act.id}
                      className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex flex-wrap justify-between gap-2"
                    >
                      <span>
                        <strong className="font-mono">{act.fecha}:</strong> {act.descripcion}
                        {act.soporteNombre ? ` · Soporte: ${act.soporteNombre}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500">{act.registradoPor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* 5. NOTIFICACIONES REALES POR CORREO ELECTRÓNICO                    */}
      {/* ================================================================== */}
      {subTab === 'notificaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
            <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#f97316]" />
              <span>ENVIAR NOTIFICACIÓN AL CORREO (Envío Real)</span>
            </h4>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tipo de notificación del COPASST
              </label>
              <select
                value={notifTipo}
                onChange={(e) =>
                  handleSeleccionarPlantilla(e.target.value as TipoNotificacionCopasst)
                }
                className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
              >
                {TIPOS_NOTIFICACION_COPASST.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Destinatarios con correo registrado (miembros y trabajadores)
              </label>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1 bg-slate-50">
                {trabajadoresActivos
                  .filter((t) => esCorreoValidoFrikaz(t.correo || ''))
                  .map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifEmailsSeleccionados.includes(t.correo!)}
                        onChange={() =>
                          setNotifEmailsSeleccionados((prev) =>
                            prev.includes(t.correo!)
                              ? prev.filter((x) => x !== t.correo!)
                              : [...prev, t.correo!]
                          )
                        }
                      />
                      <span>
                        <strong>{t.nombreCompleto}</strong> ({t.cargoNombre}) — {t.correo}
                      </span>
                    </label>
                  ))}
                {trabajadoresActivos.every((t) => !esCorreoValidoFrikaz(t.correo || '')) && (
                  <p className="text-[11px] text-amber-800">
                    No hay correos personales válidos registrados en las fichas aún. Ingrese un destinatario abajo.
                  </p>
                )}
              </div>
              <input
                type="email"
                value={notifCorreoAdicional}
                onChange={(e) => setNotifCorreoAdicional(e.target.value)}
                placeholder="Otro correo destinatario real (ej. gerente@frikaz.com)"
                className="w-full rounded-xl border border-slate-300 p-2 mt-2"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Asunto del correo</label>
              <input
                type="text"
                value={notifAsunto}
                onChange={(e) => setNotifAsunto(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Vista previa y edición del mensaje
              </label>
              <textarea
                rows={7}
                value={notifCuerpo}
                onChange={(e) => setNotifCuerpo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-sans"
              />
            </div>

            {resultadoCorreo && (
              <div
                className={`rounded-xl border p-3 font-bold ${
                  resultadoCorreo.ok
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {resultadoCorreo.msg}
              </div>
            )}

            <button
              type="button"
              onClick={handleEnviarNotificacionReal}
              disabled={enviandoCorreo}
              className="px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>{enviandoCorreo ? 'Enviando correo real...' : 'Enviar notificación al correo'}</span>
            </button>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3">
            <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <History className="h-4 w-4 text-[#0f6b61]" />
              <span>Historial de notificaciones ({store.notificacionesEnviadas.length})</span>
            </h4>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {store.notificacionesEnviadas.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[#0d3b36]">{n.tipo}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        n.estadoEnvio === 'Enviado'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {n.estadoEnvio} ({n.canal})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Para: {n.destinatarios.join(', ')} · {n.fecha}
                  </p>
                  {n.detalleError && <p className="text-[10px] text-rose-700">{n.detalleError}</p>}
                </div>
              ))}
              {store.notificacionesEnviadas.length === 0 && (
                <p className="text-slate-500 text-center py-6">
                  Aún no se han enviado notificaciones por correo desde este módulo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 6. SIMULACIÓN DEL COPASST SOBRE EL ORGANIGRAMA EXISTENTE           */}
      {/* ================================================================== */}
      {subTab === 'simulacion' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-amber-950">
              <Sparkles className="h-5 w-5 text-[#f97316] shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm">
                  Simulación Visual del COPASST sobre el Organigrama Actual de Frikaz S.A.S.
                </p>
                <p className="text-[11px] text-amber-900">
                  Esta vista es una propuesta visual: <strong>NO convierte automáticamente</strong> a los seleccionados en integrantes oficiales. Para oficializar el comité use «CONFIRMAR CONFORMACIÓN OFICIAL DEL COPASST».
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  persist(
                    {
                      ...store,
                      simulacionOrganigrama: {
                        ...simDraft,
                        fechaActualizacion: new Date().toISOString().split('T')[0],
                      },
                    },
                    'Propuesta de simulación COPASST guardada',
                    'Simulación visual actualizada en organigrama sin modificar miembros oficiales.'
                  );
                  notify('Propuesta visual guardada como antecedente.');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#0f5b53] text-white font-black cursor-pointer"
              >
                Guardar propuesta
              </button>
              <button
                type="button"
                onClick={() => {
                  const vacia = {
                    empleadorPrincipal: null,
                    empleadorSuplente: null,
                    trabajadoresPrincipal: null,
                    trabajadoresSuplente: null,
                    fechaActualizacion: new Date().toISOString().split('T')[0],
                  };
                  setSimDraft(vacia);
                  persist(
                    { ...store, simulacionOrganigrama: vacia },
                    'Simulación COPASST descartada',
                    'Propuesta visual limpiada.'
                  );
                  notify('Simulación descartada.');
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
              >
                Descartar
              </button>
            </div>
          </div>

          {/* Selectores de simulación */}
          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                key: 'empleadorPrincipal' as const,
                label: 'Posible Principal Empleador',
                badgeCls: 'border-indigo-300 bg-indigo-50/70',
              },
              {
                key: 'empleadorSuplente' as const,
                label: 'Posible Suplente Empleador',
                badgeCls: 'border-sky-300 bg-sky-50/70',
              },
              {
                key: 'trabajadoresPrincipal' as const,
                label: 'Posible Principal Trabajadores',
                badgeCls: 'border-emerald-300 bg-emerald-50/70',
              },
              {
                key: 'trabajadoresSuplente' as const,
                label: 'Posible Suplente Trabajadores',
                badgeCls: 'border-amber-300 bg-amber-50/70',
              },
            ].map((slot) => (
              <div key={slot.key} className={`rounded-xl border p-3 ${slot.badgeCls}`}>
                <label className="font-black text-[#0d3b36] block mb-1">{slot.label}</label>
                <select
                  value={simDraft[slot.key]?.trabajadorId || ''}
                  onChange={(e) => {
                    const t = trabajadoresActivos.find((x) => x.id === e.target.value);
                    setSimDraft((prev) => ({
                      ...prev,
                      [slot.key]: t
                        ? {
                            trabajadorId: t.id,
                            nombreCompleto: t.nombreCompleto,
                            cargo: t.cargoNombre,
                            correo: t.correo,
                            documento: t.numeroDocumento,
                          }
                        : null,
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 p-1.5 bg-white text-[11px] font-bold"
                >
                  <option value="">Sin seleccionar...</option>
                  {trabajadoresActivos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombreCompleto} ({t.cargoNombre})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Representación del organigrama actual de Frikaz S.A.S. (Gerente + Vigía SST + 5 cargos operativos) */}
          <div className="rounded-2xl border border-[#b9dad3] bg-[#0f172a] p-5 text-white space-y-5">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider font-black text-orange-300">
                Organigrama Oficial de Frikaz S.A.S. (Simulación visual COPASST)
              </span>
            </div>

            {/* Nivel superior: Gerente + Vigía SST */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-start-2 rounded-2xl border border-amber-400/50 bg-slate-900 p-4 text-center space-y-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px]">
                  Cargo Oficial #1 · Dirección
                </span>
                <h5 className="font-black text-sm text-white">Gerente</h5>
                {trabajadoresActivos
                  .filter((t) => t.cargoNombre === 'Gerente')
                  .map((t) => {
                    const sim = getSimBadgeForTrabajador(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`rounded-xl border p-2 text-left text-[11px] ${
                          sim ? sim.cls : 'bg-slate-800/80 border-slate-700 text-slate-200'
                        }`}
                      >
                        <p className="font-black">{t.nombreCompleto}</p>
                        {sim && (
                          <div className="mt-1 space-y-0.5">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-white/80 text-slate-900 font-black text-[9px]">
                              POSIBLE INTEGRANTE DEL COPASST
                            </span>
                            <p className="text-[10px] font-bold">{sim.rol}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="rounded-2xl border border-teal-400/50 bg-teal-950/60 p-4 text-center space-y-1">
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 font-black text-[10px]">
                  Figura de Representación SST
                </span>
                <h5 className="font-black text-sm text-white">Vigía SST</h5>
                <p className="text-[11px] text-teal-100">
                  {vigiaSst.nombrePersona || 'Pendiente de verificación'}
                </p>
              </div>
            </div>

            {/* 5 cargos operativos oficiales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {cargosOrganigrama
                .filter((c) => c.nivelJerarquico !== 'ALTA_DIRECCION')
                .map((c) => {
                  const trabCargo = trabajadoresActivos.filter(
                    (t) => t.cargoNombre.toLowerCase() === c.nombre.toLowerCase()
                  );
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3.5 space-y-2"
                    >
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {c.areaProceso}
                      </span>
                      <h5 className="font-black text-xs text-white">{c.nombre}</h5>
                      <div className="space-y-1.5">
                        {trabCargo.map((t) => {
                          const sim = getSimBadgeForTrabajador(t.id);
                          return (
                            <div
                              key={t.id}
                              className={`rounded-xl border p-2 text-[11px] ${
                                sim
                                  ? sim.cls
                                  : 'bg-slate-800/80 border-slate-700 text-slate-200'
                              }`}
                            >
                              <p className="font-bold">{t.nombreCompleto}</p>
                              {sim && (
                                <div className="mt-1 space-y-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-white/85 text-slate-950 font-black text-[9px]">
                                    POSIBLE INTEGRANTE DEL COPASST
                                  </span>
                                  <p className="text-[10px] font-bold">{sim.rol}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 7. REPOSITORIO DOCUMENTAL DEL COPASST                              */}
      {/* ================================================================== */}
      {subTab === 'repositorio' && (
        <div className="space-y-4">
          <form
            onSubmit={handleGuardarDocumentoRepo}
            className="rounded-2xl border border-[#b9dad3] bg-white p-5 space-y-3"
          >
            <h4 className="text-sm font-black text-[#0d3b36] flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[#f97316]" />
              <span>Cargar documento oficial del COPASST</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de documento</label>
                <select
                  value={docForm.tipo}
                  onChange={(e) =>
                    setDocForm({ ...docForm, tipo: e.target.value as TipoDocumentoCopasstRepo })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2 bg-white font-bold"
                >
                  {TIPOS_DOCUMENTO_REPO.map((td) => (
                    <option key={td} value={td}>
                      {td}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título del documento *</label>
                <input
                  type="text"
                  required
                  value={docForm.titulo}
                  onChange={(e) => setDocForm({ ...docForm, titulo: e.target.value })}
                  placeholder="Ej. Acta de elección COPASST 2027"
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del archivo *</label>
                <input
                  type="text"
                  required
                  value={docForm.nombreArchivo}
                  onChange={(e) => setDocForm({ ...docForm, nombreArchivo: e.target.value })}
                  placeholder="Acta_COPASST.pdf"
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha documento</label>
                <input
                  type="date"
                  value={docForm.fechaDocumento}
                  onChange={(e) => setDocForm({ ...docForm, fechaDocumento: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Relacionado con (proceso o integrante)
                </label>
                <input
                  type="text"
                  value={docForm.relacionadoCon}
                  onChange={(e) => setDocForm({ ...docForm, relacionadoCon: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones</label>
                <input
                  type="text"
                  value={docForm.observaciones}
                  onChange={(e) => setDocForm({ ...docForm, observaciones: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {docForm.archivoDataUrl ? 'Archivo adjunto listo' : 'Subir archivo del computador'}
                </span>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setDocForm((prev) => ({
                          ...prev,
                          nombreArchivo: prev.nombreArchivo || f.name,
                          titulo: prev.titulo || f.name,
                          archivoDataUrl: reader.result as string,
                        }));
                      }
                    };
                    reader.readAsDataURL(f);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
              >
                Guardar en repositorio COPASST
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[#b9dad3] bg-white p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5"
                />
              </div>
              <select
                value={repoTipoFilter}
                onChange={(e) =>
                  setRepoTipoFilter(e.target.value as 'TODOS' | TipoDocumentoCopasstRepo)
                }
                className="rounded-xl border border-slate-300 p-1.5 bg-white font-bold"
              >
                <option value="TODOS">Todos los tipos de documento</option>
                {TIPOS_DOCUMENTO_REPO.map((td) => (
                  <option key={td} value={td}>
                    {td}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={repoFechaFilter}
                onChange={(e) => setRepoFechaFilter(e.target.value)}
                className="rounded-xl border border-slate-300 p-1.5 bg-white font-mono"
              />
            </div>

            <div className="space-y-2">
              {docsFiltrados.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-black text-[#0d3b36]">
                      [{d.codigoRegistro}] {d.titulo}{' '}
                      <span className="text-[10px] font-bold text-[#0f6b61]">({d.tipo})</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Archivo: {d.nombreArchivo} · Fecha doc: {d.fechaDocumento} · Cargado por: {d.responsable}
                      {d.relacionadoCon ? ` · Relacionado: ${d.relacionadoCon}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.archivoDataUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(d)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver</span>
                        </button>
                        <a
                          href={d.archivoDataUrl}
                          download={d.nombreArchivo}
                          className="px-2.5 py-1 rounded-lg bg-[#0f5b53] text-white font-bold inline-flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Descargar</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {docsFiltrados.length === 0 && (
                <p className="text-center text-slate-500 py-6">
                  Aún no hay documentos registrados con los filtros actuales.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación oficial del COPASST */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h4 className="text-base font-black text-[#0d3b36]">
              CONFIRMAR CONFORMACIÓN OFICIAL DEL COPASST
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Esta acción convierte únicamente los resultados reales de la votación y la designación del empleador en miembros oficiales del comité, conservando la simulación como antecedente.
            </p>
            <div className="rounded-xl bg-[#f4faf8] border border-[#cfe5df] p-3 space-y-1.5 text-[11px]">
              <p>
                <strong>Empleador Principal:</strong>{' '}
                {trabajadores.find(
                  (t) => t.id === store.procesoEleccion.designadosEmpleadorBorrador.principalId
                )?.nombreCompleto || 'Pendiente de seleccionar'}
              </p>
              <p>
                <strong>Empleador Suplente:</strong>{' '}
                {trabajadores.find(
                  (t) => t.id === store.procesoEleccion.designadosEmpleadorBorrador.suplenteId
                )?.nombreCompleto || 'Pendiente de seleccionar'}
              </p>
              <p>
                <strong>Trabajadores Principal (elegido):</strong>{' '}
                {ganadorPrincipal
                  ? `${ganadorPrincipal.nombreCompleto} (${ganadorPrincipal.cargo})`
                  : 'Pendiente resultado de votación'}
              </p>
              <p>
                <strong>Trabajadores Suplente (siguiente):</strong>{' '}
                {ganadorSuplente
                  ? `${ganadorSuplente.nombreCompleto} (${ganadorSuplente.cargo})`
                  : 'Pendiente resultado de votación'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Inicio periodo</label>
                <input
                  type="date"
                  value={periodoConfirmInicio}
                  onChange={(e) => setPeriodoConfirmInicio(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fin periodo</label>
                <input
                  type="date"
                  value={periodoConfirmFin}
                  onChange={(e) => setPeriodoConfirmFin(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarConformacionOficial}
                className="px-4 py-2 rounded-xl bg-[#f97316] text-white font-black cursor-pointer"
              >
                Confirmar conformación oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[140] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-black text-[#0d3b36]">{previewDoc.titulo}</h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            {previewDoc.archivoDataUrl?.startsWith('data:image/') ? (
              <img
                src={previewDoc.archivoDataUrl}
                alt={previewDoc.nombreArchivo}
                className="max-h-[65vh] mx-auto rounded-lg"
              />
            ) : previewDoc.archivoDataUrl?.startsWith('data:application/pdf') ? (
              <iframe
                src={previewDoc.archivoDataUrl}
                title={previewDoc.nombreArchivo}
                className="w-full h-[65vh] rounded-lg border"
              />
            ) : (
              <p className="text-center text-slate-600 py-8">
                Archivo listo para descarga mediante el botón Descargar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
