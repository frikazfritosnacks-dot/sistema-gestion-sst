// ============================================================================
// COMPONENTE: ESCAPEROOM / MISIÓN INTERACTIVA DE VIDEOJUEGO
// 4 Desafíos Visuales: Explora -> Encuentra el Error -> Elige tu Camino -> Abre la Puerta
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  PoliticaMisionFrikaz,
  TrabajadorFrikaz,
  PasaporteDigital,
  PeligroHotspot,
} from '../../types/misionFrikaz';
import {
  procesarEvaluacionMision,
  getPasaporteDigital,
  ResultadoEvaluacion,
} from '../../services/misionFrikazService';
import { SoundFX } from '../../services/soundEffects';
import { PoliticaOficialModal } from './PoliticaOficialModal';
import { GameAvatar } from './GameAvatar';
import { GameSceneImage } from './GameSceneImage';
import { GAME_IMAGES } from '../../services/gameAssets';
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  FileText,
  Volume2,
  VolumeX,
  Target,
  KeyRound,
  Lock,
  Unlock,
  Check,
  ChevronRight,
  X,
  Zap,
} from 'lucide-react';

interface MisionFrikazEscapeRoomProps {
  politica: PoliticaMisionFrikaz;
  trabajador: TrabajadorFrikaz;
  todasLasPoliticas: PoliticaMisionFrikaz[];
  onCompletarMision: (pasaporteActualizado: PasaporteDigital) => void;
  onVolverOSeleccionarOtra: (politicaId?: string) => void;
  onCerrar?: () => void;
}

type DesafioIndex = 1 | 2 | 3 | 4;

export const MisionFrikazEscapeRoom: React.FC<MisionFrikazEscapeRoomProps> = ({
  politica,
  trabajador,
  todasLasPoliticas,
  onCompletarMision,
  onVolverOSeleccionarOtra,
  onCerrar,
}) => {
  const [desafioActual, setDesafioActual] = useState<DesafioIndex>(1);
  const [sonidoActivo, setSonidoActivo] = useState(SoundFX.isEnabled());
  const [isPoliticaModalOpen, setIsPoliticaModalOpen] = useState(false);

  // Desafío 2: Hotspots identificados por el jugador
  const [hotspotSeleccionado, setHotspotSeleccionado] = useState<PeligroHotspot | null>(null);
  const [hotspotsDescubiertos, setHotspotsDescubiertos] = useState<string[]>([]);

  // Desafío 3: Respuestas del cuestionario
  const [respuestasSeleccionadas, setRespuestasSeleccionadas] = useState<Record<string, string>>({});
  const [preguntaActivaIdx, setPreguntaActivaIdx] = useState(0);

  // Desafío 4: Terminal de seguridad
  const [opcionTerminalSeleccionada, setOpcionTerminalSeleccionada] = useState<string | null>(null);
  const [puertaAbierta, setPuertaAbierta] = useState(false);

  // Evaluación y Resultado
  const [tiempoInicio, setTiempoInicio] = useState<number>(Date.now());
  const [evaluando, setEvaluando] = useState(false);
  const [errorEvaluacion, setErrorEvaluacion] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEvaluacion | null>(null);

  // Reiniciar estado al cambiar de política
  useEffect(() => {
    setDesafioActual(1);
    setHotspotSeleccionado(null);
    setHotspotsDescubiertos([]);
    setRespuestasSeleccionadas({});
    setPreguntaActivaIdx(0);
    setOpcionTerminalSeleccionada(null);
    setPuertaAbierta(false);
    setTiempoInicio(Date.now());
    setErrorEvaluacion(null);
    setResultado(null);
  }, [politica.id]);

  const toggleSonido = () => {
    const nuevo = SoundFX.toggle();
    setSonidoActivo(nuevo);
    if (nuevo) SoundFX.playClick();
  };

  // Manejar clic en Hotspot de la fábrica
  const handleClicHotspot = (hs: PeligroHotspot) => {
    setHotspotSeleccionado(hs);
    if (!hotspotsDescubiertos.includes(hs.id)) {
      setHotspotsDescubiertos((prev) => [...prev, hs.id]);
    }
    if (hs.esPeligro) {
      SoundFX.playError();
    } else {
      SoundFX.playSuccess();
    }
  };

  // Manejar selección de opción táctica en Desafío 3
  const handleSeleccionarOpcionPregunta = (preguntaId: string, opcionId: string) => {
    SoundFX.playClick();
    setRespuestasSeleccionadas((prev) => ({
      ...prev,
      [preguntaId]: opcionId,
    }));
  };

  // Manejar selección de switch en Desafío 4
  const handleSeleccionarTerminal = (opcionId: string) => {
    setOpcionTerminalSeleccionada(opcionId);
    const op = politica.desafioTerminal.opciones.find((o) => o.id === opcionId);
    if (op && op.esCorrecta) {
      SoundFX.playSuccess();
      setPuertaAbierta(true);
    } else {
      SoundFX.playError();
      setPuertaAbierta(false);
    }
  };

  // Enviar evaluación final
  const handleFinalizarMision = async () => {
    setEvaluando(true);
    SoundFX.playScan();
    const duracionSegundos = Math.max(15, Math.round((Date.now() - tiempoInicio) / 1000));

    // Si falta responder alguna pregunta, asignar la primera opción por defecto
    const payloadRespuestas = politica.preguntas.map((preg) => {
      const sel = respuestasSeleccionadas[preg.id] || preg.opciones[0].id;
      return {
        preguntaId: preg.id,
        opcionSeleccionadaId: sel,
      };
    });

    try {
      setErrorEvaluacion(null);
      const res = await procesarEvaluacionMision({
        trabajadorId: trabajador.id,
        politicaId: politica.id,
        respuestas: payloadRespuestas,
        duracionSegundos,
      });

      setResultado(res);
      if (res.aprobado) {
        SoundFX.playVictory();
      } else {
        SoundFX.playError();
      }
      onCompletarMision(res.pasaporteActualizado);
    } catch (err: any) {
      setErrorEvaluacion(`No pudimos guardar tu resultado en este momento: ${err.message || err}. Por favor intenta de nuevo.`);
    } finally {
      setEvaluando(false);
    }
  };

  const handleReintentar = () => {
    SoundFX.playClick();
    setDesafioActual(1);
    setHotspotSeleccionado(null);
    setHotspotsDescubiertos([]);
    setRespuestasSeleccionadas({});
    setPreguntaActivaIdx(0);
    setOpcionTerminalSeleccionada(null);
    setPuertaAbierta(false);
    setResultado(null);
    setTiempoInicio(Date.now());
  };

  const pasaporte = getPasaporteDigital(trabajador.id);
  const siguientePolitica = todasLasPoliticas.find(
    (p) => p.id !== politica.id && p.esObligatoria && pasaporte.progresos[p.id]?.estado !== 'SUPERADA'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* ==================================================================== */}
      {/* HUD SUPERIOR DE MISIÓN                                               */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-6 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Sector y Política */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                SoundFX.playClick();
                onVolverOSeleccionarOtra();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Volver al mapa general"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  RECORRIDO PRÁCTICO · {politica.codigoCalidad}
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  +{politica.puntosXp} Puntos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GameAvatar
                  cargoNombre={trabajador.cargoNombre}
                  avatarUrl={trabajador.avatarUrl}
                  nombre={trabajador.nombre}
                  size="xs"
                />
                <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                  {politica.sectorPlantaNombre}
                </h1>
              </div>
            </div>
          </div>

          {/* Selector de los 4 Pasos */}
          {!resultado && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {[
                { num: 1, label: '1. Conoce' },
                { num: 2, label: '2. Busca peligros' },
                { num: 3, label: '3. Responde' },
                { num: 4, label: '4. Paso final' },
              ].map((des) => {
                const esActivo = desafioActual === des.num;
                const esPasado = desafioActual > des.num;

                return (
                  <button
                    key={des.num}
                    onClick={() => {
                      SoundFX.playClick();
                      setDesafioActual(des.num as DesafioIndex);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      esActivo
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : esPasado
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {esPasado && <Check className="w-3 h-3" />}
                    <span>{des.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Controles: Sonido, Leer Regla Completa y Salir */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                SoundFX.playClick();
                setIsPoliticaModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Leer Regla Completa</span>
            </button>

            <button
              onClick={toggleSonido}
              className={`p-2 rounded-xl border transition-colors ${
                sonidoActivo
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={sonidoActivo ? 'Silenciar audio' : 'Activar audio'}
            >
              {sonidoActivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {onCerrar && (
              <button
                onClick={onCerrar}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ==================================================================== */}
      {/* CUERPO DEL VIDEOJUEGO                                                */}
      {/* ==================================================================== */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-center">
        
        {/* ================================================================== */}
        {/* PANTALLA DE RESULTADO FINAL / VICTORIA O DERROTA                  */}
        {/* ================================================================== */}
        {resultado ? (
          <div className="space-y-6 animate-fadeIn">
            <div
              className={`rounded-3xl p-6 sm:p-10 border-2 text-center relative overflow-hidden shadow-2xl ${
                resultado.aprobado
                  ? 'bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-900 border-emerald-400 shadow-emerald-500/20'
                  : 'bg-gradient-to-b from-slate-900 via-red-950/40 to-slate-900 border-red-500/50 shadow-red-500/20'
              }`}
            >
              {/* Animación del Icono */}
              <div className="mx-auto mb-4 relative w-24 h-24">
                <div
                  className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto border-2 shadow-xl ${
                    resultado.aprobado
                      ? 'bg-gradient-to-br from-emerald-400 to-amber-400 text-slate-950 border-yellow-200 animate-bounce'
                      : 'bg-red-500/20 text-red-400 border-red-500'
                  }`}
                >
                  {resultado.aprobado ? <Award className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
                </div>
                {resultado.aprobado && (
                  <div className="absolute -top-2 -right-2 p-2 rounded-full bg-amber-500 text-slate-950 shadow-md">
                    <Sparkles className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>

              <span
                className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-2 ${
                  resultado.aprobado
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}
              >
                {resultado.aprobado ? '¡MUY BIEN, LO LOGRASTE!' : '¡CASI LO LOGRAS! INTÉNTALO DE NUEVO'}
              </span>

              <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
                Tu resultado: <span className={resultado.aprobado ? 'text-emerald-400' : 'text-red-400'}>{resultado.puntaje}%</span>
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                +{politica.puntosXp} Puntos · Intento #{resultado.intento.numeroIntento} · Tiempo: {resultado.intento.duracionSegundos}s
              </p>

              {resultado.aprobado ? (
                <div className="mt-6 bg-slate-950/90 max-w-lg mx-auto p-5 rounded-2xl border-2 border-amber-400/50 flex flex-col sm:flex-row items-center gap-4 text-left shadow-xl">
                  <div className="relative shrink-0">
                    <GameAvatar
                      cargoNombre={trabajador.cargoNombre}
                      avatarUrl={trabajador.avatarUrl}
                      nombre={trabajador.nombre}
                      size="xl"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-slate-950 shadow">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      SELLO OBTENIDO · {trabajador.cargoNombre}
                    </span>
                    <h4 className="font-bold text-base text-white">{politica.insigniaNombre}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{politica.insigniaDescripcion}</p>
                    <span className="inline-block mt-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      Guardado en tu Pasaporte Digital
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-3">
                  Necesitas al menos <strong>80%</strong> para ganar este sello de seguridad. Repasa los consejos de la zona y vuelve a intentar, ¡tú puedes!
                </p>
              )}

              {/* Botones de Acción */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                {resultado.aprobado ? (
                  <>
                    {siguientePolitica ? (
                      <button
                        onClick={() => {
                          SoundFX.playClick();
                          onVolverOSeleccionarOtra(siguientePolitica.id);
                        }}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <span>Ir a la Siguiente Zona: {siguientePolitica.codigoCalidad}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          SoundFX.playVictory();
                          onVolverOSeleccionarOtra();
                        }}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>¡FELICITACIONES! COMPLETASTE TODAS LAS ZONAS</span>
                      </button>
                    )}

                    <button
                      onClick={() => onVolverOSeleccionarOtra()}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Volver al Mapa
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReintentar}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Volver a Intentar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* DESAFÍO 1: EXPLORA EL SECTOR                                   */}
            {/* ============================================================== */}
            {desafioActual === 1 && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Escenario con Personaje Guía y Diálogo Corto */}
                <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-2xl">
                  <div className="relative h-72 sm:h-96 w-full">
                    <GameSceneImage
                      src={politica.imagenZona || '/assets/images/zone_frying_line.webp'}
                      alt={politica.sectorPlantaNombre}
                      aspectRatioClass="w-full h-full"
                      className="w-full h-full object-cover object-center filter brightness-90 contrast-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Globo de Diálogo de la Guía SG-SST */}
                    <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-slate-950/90 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 backdrop-blur-md shadow-2xl">
                      <GameSceneImage
                        src="/assets/images/game_guide_character.webp"
                        alt="Guía SG-SST"
                        aspectRatioClass="w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0"
                        className="w-full h-full object-cover border-2 border-amber-400"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                          TU GUÍA DE SEGURIDAD EN PLANTA
                        </span>
                        <p className="text-xs sm:text-sm text-white font-medium leading-snug mt-0.5">
                          «{politica.dialogoGuiaBienvenida}»
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Tarjetas Visuales de Compromisos Clave */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {politica.compromisosClave.slice(0, 3).map((comp) => (
                    <div
                      key={comp.numero}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl transition-all shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center mb-2 border border-amber-500/30">
                          0{comp.numero}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white leading-snug mb-1.5">
                          {comp.titulo}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {comp.aplicacionEnPlanta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón Siguiente Paso */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      SoundFX.playSuccess();
                      setDesafioActual(2);
                    }}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/30"
                  >
                    <span>Paso 2: Busca los peligros</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 2: BUSCA LOS PELIGROS EN LA FOTO DE PLANTA                */}
            {/* ============================================================== */}
            {desafioActual === 2 && (
              <div className="space-y-6 animate-fadeIn">
                
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <Target className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                        PASO 2: ENCUENTRA QUÉ PUEDE CAUSAR UN ACCIDENTE
                      </span>
                      <h3 className="text-sm font-black text-white">
                        Toca cada círculo en la imagen para ver si es un peligro o algo seguro
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">PUNTOS REVISADOS:</span>
                    <span className="text-sm font-black text-amber-400">
                      {hotspotsDescubiertos.length} de {politica.hotspots.length}
                    </span>
                  </div>
                </div>

                {/* Escenario con Hotspots Clickables */}
                <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl">
                  <div className="relative h-80 sm:h-[450px] w-full select-none">
                    <GameSceneImage
                      src={politica.imagenZona || '/assets/images/zone_frying_line.webp'}
                      alt="Escena Interactiva"
                      aspectRatioClass="w-full h-full"
                      className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
                    />

                    {/* Hotspots interactivos posicionados con x e y */}
                    {politica.hotspots.map((hs) => {
                      const fueDescubierto = hotspotsDescubiertos.includes(hs.id);
                      const esSeleccionado = hotspotSeleccionado?.id === hs.id;

                      return (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => handleClicHotspot(hs)}
                          style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full border-2 transition-all transform hover:scale-125 focus:outline-none z-20 ${
                            esSeleccionado
                              ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/50 scale-125 shadow-2xl'
                              : fueDescubierto
                              ? hs.esPeligro
                                ? 'bg-red-500/80 text-white border-red-300'
                                : 'bg-emerald-500/80 text-white border-emerald-300'
                              : 'bg-amber-500/90 text-slate-950 border-white animate-pulse shadow-lg'
                          }`}
                          title={hs.titulo}
                        >
                          <Target className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Panel de Información del Hotspot Seleccionado */}
                  {hotspotSeleccionado && (
                    <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 animate-fadeIn flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            hotspotSeleccionado.esPeligro
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {hotspotSeleccionado.esPeligro ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{hotspotSeleccionado.titulo}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                                hotspotSeleccionado.esPeligro
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {hotspotSeleccionado.esPeligro ? 'PELIGRO DETECTADO' : 'CONTROL SEGURO'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{hotspotSeleccionado.descripcion}</p>
                          <p className="text-[11px] text-amber-400 mt-1">
                            <strong>Consejo del Guía:</strong> {hotspotSeleccionado.consejoGuia}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navegación */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setDesafioActual(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver atrás</span>
                  </button>

                  <button
                    onClick={() => {
                      SoundFX.playSuccess();
                      setDesafioActual(3);
                    }}
                    className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/30"
                  >
                    <span>Paso 3: Responder preguntas</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 3: PREGUNTAS SENCILLAS DE CUIDADO EN PLANTA               */}
            {/* ============================================================== */}
            {desafioActual === 3 && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Selector de Pregunta */}
                <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      PASO 3: ELIGE LA FORMA MÁS SEGURA DE ACTUAR
                    </span>
                    <h3 className="text-sm font-black text-white">
                      Pregunta {preguntaActivaIdx + 1} de {politica.preguntas.length}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {politica.preguntas.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          SoundFX.playClick();
                          setPreguntaActivaIdx(idx);
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          preguntaActivaIdx === idx
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : respuestasSeleccionadas[politica.preguntas[idx].id]
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pregunta Activa */}
                {(() => {
                  const preg = politica.preguntas[preguntaActivaIdx] || politica.preguntas[0];
                  const selOpcionId = respuestasSeleccionadas[preg.id];

                  return (
                    <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                          {preg.enunciado}
                        </h4>
                        {preg.contextoCaso && (
                          <p className="text-xs text-amber-300 mt-1.5 font-medium">
                            Situación de Planta: {preg.contextoCaso}
                          </p>
                        )}
                      </div>

                      {/* Tarjetas de Opciones Tácticas */}
                      <div className="space-y-3">
                        {preg.opciones.map((op) => {
                          const esElegida = selOpcionId === op.id;

                          return (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => handleSeleccionarOpcionPregunta(preg.id, op.id)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                                esElegida
                                  ? 'bg-amber-500/20 border-amber-400 text-white font-medium shadow-lg shadow-amber-500/10 scale-[1.01]'
                                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                                  esElegida
                                    ? 'border-amber-400 bg-amber-400'
                                    : 'border-slate-600 bg-slate-900'
                                }`}
                              >
                                {esElegida && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                              </div>
                              <div className="flex-1">
                                <span className="text-xs sm:text-sm leading-relaxed block">{op.texto}</span>
                                {esElegida && (
                                  <p className="text-[11px] text-amber-300 mt-1.5 font-sans italic">
                                    {op.retroalimentacion}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Botón de Siguiente Pregunta o Finalizar Cuestionario */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          disabled={preguntaActivaIdx === 0}
                          onClick={() => {
                            SoundFX.playClick();
                            setPreguntaActivaIdx((p) => Math.max(0, p - 1));
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold ${
                            preguntaActivaIdx === 0
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          Pregunta Anterior
                        </button>

                        {preguntaActivaIdx < politica.preguntas.length - 1 ? (
                          <button
                            onClick={() => {
                              SoundFX.playClick();
                              setPreguntaActivaIdx((p) => p + 1);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase"
                          >
                            Siguiente Pregunta
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              SoundFX.playSuccess();
                              setDesafioActual(4);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <span>Paso 4: Confirmación Final</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* ============================================================== */}
            {/* PASO 4: CONFIRMACIÓN FINAL DE SEGURIDAD                         */}
            {/* ============================================================== */}
            {desafioActual === 4 && (
              <div className="space-y-6 animate-fadeIn">
                
                <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  
                  {/* Encabezado */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 block">
                          PASO 4: ÚLTIMO CONTROL ANTES DE INICIAR
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white">
                          Confirma la Regla Principal de esta Zona
                        </h3>
                      </div>
                    </div>

                    <div className="font-mono text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400">
                      CLAVE: {politica.desafioTerminal.codigoProtocolo}
                    </div>
                  </div>

                  {/* Escenario de la Puerta */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-4">
                    <div
                      className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center border-2 transition-all ${
                        puertaAbierta
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400 shadow-xl shadow-emerald-500/30'
                          : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}
                    >
                      {puertaAbierta ? (
                        <Unlock className="w-10 h-10 animate-pulse" />
                      ) : (
                        <Lock className="w-10 h-10" />
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white max-w-lg mx-auto">
                      {politica.desafioTerminal.instruccion}
                    </h4>
                    <p className="text-xs text-amber-400 font-medium">
                      {politica.desafioTerminal.pregunta}
                    </p>

                    {/* Opciones del Terminal */}
                    <div className="space-y-2.5 max-w-md mx-auto text-left pt-2">
                      {politica.desafioTerminal.opciones.map((op) => {
                        const esElegida = opcionTerminalSeleccionada === op.id;

                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => handleSeleccionarTerminal(op.id)}
                            className={`w-full p-3.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center gap-3 ${
                              esElegida
                                ? op.esCorrecta
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                  : 'bg-red-500/20 border-red-500 text-red-300'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                                esElegida
                                  ? op.esCorrecta
                                    ? 'bg-emerald-400 border-emerald-300'
                                    : 'bg-red-500 border-red-400'
                                  : 'border-slate-500'
                              }`}
                            />
                            <span>{op.etiqueta}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error inline si falla el guardado */}
                  {errorEvaluacion && (
                    <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
                      {errorEvaluacion}
                    </div>
                  )}

                  {/* Botón Final de Calificación de Misión */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setDesafioActual(3)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Revisar mis respuestas</span>
                    </button>

                    <button
                      disabled={evaluando || !puertaAbierta}
                      onClick={handleFinalizarMision}
                      className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl ${
                        puertaAbierta && !evaluando
                          ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 shadow-emerald-500/30 transform hover:-translate-y-0.5'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      {evaluando ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Guardando tu resultado...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-current" />
                          <span>TERMINAR Y GUARDAR MI SELLO</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* Modal de Consulta de la Política Oficial Completa */}
      <PoliticaOficialModal
        isOpen={isPoliticaModalOpen}
        onClose={() => setIsPoliticaModalOpen(false)}
        politica={politica}
      />

      {/* Pie del Videojuego */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 px-6 text-center text-xs text-slate-600">
        Frikaz S.A.S. · Sede Bosa, Bogotá · Misión de Seguridad y Prevención de Riesgos en Planta
      </footer>

    </div>
  );
};
