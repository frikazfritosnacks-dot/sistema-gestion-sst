import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Shield,
  Layers,
  ArrowRight,
  Bot,
  HelpCircle,
  Flame,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';

interface RiskAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: RiesgoGTC45Item[];
  onSelectRisk?: (riskId: string) => void;
}

interface MensajeAsistente {
  emisor: 'usuario' | 'asistente';
  texto: string;
  riesgosRelacionados?: RiesgoGTC45Item[];
}

export function RiskAssistantModal({
  isOpen,
  onClose,
  dataset,
  onSelectRisk,
}: RiskAssistantModalProps) {
  const [consulta, setConsulta] = useState('');
  const [historial, setHistorial] = useState<MensajeAsistente[]>([
    {
      emisor: 'asistente',
      texto: `¡Hola! Soy tu guía de consulta rápida de peligros en Frikaz S.A.S. Aquí tienes ${dataset.length} peligros evaluados con la guía GTC 45. Pregúntame por tu puesto de trabajo, los peligros más urgentes (Nivel I), cómo cuidarte o qué normas aplican.`,
    },
  ]);

  if (!isOpen) return null;

  const responderConsulta = (pregunta: string) => {
    const q = pregunta.toLowerCase().trim();
    let respuesta = '';
    let relacionados: RiesgoGTC45Item[] = [];

    // Query analysis
    if (q.includes('nivel i') || q.includes('critico') || q.includes('crítico') || q.includes('urgente') || q.includes('no aceptable') || q.includes('graves')) {
      relacionados = dataset.filter((r) => r.interpretacionNR === 'I');
      respuesta = `Hay ${relacionados.length} peligro(s) en Nivel I (Urgentes / No Aceptables). Según la guía GTC 45, estos requieren parar la tarea si no es segura y corregirlos de inmediato para protegerte:`;
    } else if (
      q.includes('fritura') ||
      q.includes('coccion') ||
      q.includes('cocción') ||
      q.includes('freidora')
    ) {
      relacionados = dataset.filter(
        (r) =>
          (r.cargo && r.cargo.toLowerCase().includes('fritura')) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes('fritura')) ||
          r.tareas.toLowerCase().includes('freidora') ||
          r.peligroDescripcion.toLowerCase().includes('calor')
      );
      respuesta = `Para quien trabaja como Operario de Fritura y Cocción hay ${relacionados.length} peligro(s) clave, sobre todo el aceite caliente a 180 °C (Nivel I) y un posible incendio en la freidora (Nivel II):`;
    } else if (
      q.includes('bodega') ||
      q.includes('almacen') ||
      q.includes('almacén') ||
      q.includes('estibador') ||
      q.includes('logistica') ||
      q.includes('logística')
    ) {
      relacionados = dataset.filter(
        (r) =>
          (r.cargo && r.cargo.toLowerCase().includes('bodega')) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes('bodega')) ||
          r.zonaLugar.toLowerCase().includes('almacenamiento') ||
          r.peligroDescripcion.toLowerCase().includes('estanterías')
      );
      respuesta = `Para Auxiliares de Bodega, Almacenamiento y Logística tenemos ${relacionados.length} peligro(s) identificados, como estanterías sin atornillar al piso (Nivel I), paso de transpaletas y levantamiento de cajas:`;
    } else if (
      q.includes('mantenimiento') ||
      q.includes('mecanico') ||
      q.includes('mecánico') ||
      q.includes('electrico') ||
      q.includes('eléctrico')
    ) {
      relacionados = dataset.filter(
        (r) =>
          (r.cargo && r.cargo.toLowerCase().includes('mantenimiento')) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes('mantenimiento')) ||
          r.peligroDescripcion.toLowerCase().includes('eléctr') ||
          r.peligroDescripcion.toLowerCase().includes('atrapar') ||
          r.peligroDescripcion.toLowerCase().includes('atrapamiento')
      );
      respuesta = `Para el Técnico de Mantenimiento Electromecánico hay ${relacionados.length} peligro(s) muy importantes, principalmente descargas eléctricas en tableros de 220V/440V (Nivel I) y piezas que giran sin tapa protectora:`;
    } else if (
      q.includes('aseo') ||
      q.includes('limpieza') ||
      q.includes('sanitizacion') ||
      q.includes('sanitización') ||
      q.includes('servicios generales')
    ) {
      relacionados = dataset.filter(
        (r) =>
          (r.cargo && r.cargo.toLowerCase().includes('aseo')) ||
          (r.cargo && r.cargo.toLowerCase().includes('limpieza')) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes('aseo')) ||
          r.peligroDescripcion.toLowerCase().includes('químic') ||
          r.peligroDescripcion.toLowerCase().includes('resbal')
      );
      respuesta = `Para el equipo de Aseo y Limpieza hay ${relacionados.length} peligro(s) registrados, sobre todo el manejo de químicos fuertes (hipoclorito y desengrasantes) y resbalones en pisos mojados:`;
    } else if (
      q.includes('empaque') ||
      q.includes('seleccion') ||
      q.includes('selección') ||
      q.includes('paletizado')
    ) {
      relacionados = dataset.filter(
        (r) =>
          (r.cargo && r.cargo.toLowerCase().includes('empaque')) ||
          (r.cargo && r.cargo.toLowerCase().includes('selección')) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes('empaque')) ||
          r.peligroDescripcion.toLowerCase().includes('repet') ||
          r.peligroDescripcion.toLowerCase().includes('paletizado') ||
          r.peligroDescripcion.toLowerCase().includes('cajas')
      );
      respuesta = `Para Operarios de Selección, Empaque y Paletizado hay ${relacionados.length} peligro(s) identificados, enfocados en movimientos repetitivos de manos/muñecas y levantamiento manual de cajas:`;
    } else if (
      q.includes('top cargos') ||
      q.includes('mayor riesgo') ||
      q.includes('mas expuestos') ||
      q.includes('más expuestos') ||
      q.includes('más cuidado')
    ) {
      respuesta = `Los puestos de trabajo que necesitan más cuidado en Frikaz S.A.S. (Niveles I y II) son:\n1. Operario de Fritura y Cocción (aceite caliente a 180 °C y riesgo de incendio).\n2. Técnico de Mantenimiento Electromecánico (electricidad a 440V y piezas móviles sin tapa).\n3. Operario de Maquinaria y Rebanado (ruido fuerte continuo mayor a 85 dBA).\n4. Auxiliar de Bodega y Almacenamiento (estanterías sin anclar y levantamiento de peso).`;
      relacionados = dataset.filter((r) => r.interpretacionNR === 'I');
    } else if (q.includes('ingenieria') || q.includes('ingeniería') || q.includes('mejoras') || q.includes('guarda') || q.includes('sensor')) {
      relacionados = dataset.filter(
        (r) =>
          r.medidaControlesIngenieria &&
          r.medidaControlesIngenieria !== 'Sin información registrada' &&
          r.medidaControlesIngenieria.toLowerCase() !== 'no aplica'
      );
      respuesta = `Hay ${relacionados.length} mejoras físicas en máquinas e instalaciones (controles de ingeniería) planeadas en Frikaz S.A.S. para proteger a los trabajadores desde la raíz:`;
    } else if (q.includes('biomecanico') || q.includes('biomecánico') || q.includes('ergon') || q.includes('postura') || q.includes('carga')) {
      relacionados = dataset.filter((r) => r.peligroClasificacion === 'Biomecánico');
      respuesta = `Tenemos ${relacionados.length} peligros por postura, fuerza o movimientos repetitivos (Biomecánicos): levantar cajas del piso, estar de pie seleccionando y trabajar sentado frente al computador:`;
    } else if (q.includes('quimico') || q.includes('químico') || q.includes('aceite') || q.includes('gas') || q.includes('limpieza')) {
      relacionados = dataset.filter((r) => r.peligroClasificacion === 'Químico');
      respuesta = `Tenemos ${relacionados.length} peligros por sustancias químicas: envases de limpieza sin etiqueta SGA y mezcla de cloro o desengrasantes fuertes:`;
    } else if (q.includes('consecuencia') || q.includes('nc 100') || q.includes('mortal') || q.includes('catastrofico')) {
      relacionados = dataset.filter((r) => r.nivelConsecuencia === 100);
      respuesta = `Peligros con gravedad máxima (NC = 100, que pueden causar accidentes muy graves o fatales si no se controlan): hay ${relacionados.length} registros:`;
    } else if (q.includes('legal') || q.includes('resolucion') || q.includes('decreto') || q.includes('norma')) {
      relacionados = dataset.filter(
        (r) => r.existenciaRequisitoLegal === 'SÍ' && r.requisitoLegalEspecifico
      );
      respuesta = `Hay ${relacionados.length} peligros respaldados por leyes obligatorias en Colombia (Resolución 2400/1979, Decreto 1072/2015, Resolución 773/2021 de etiquetas químicas SGA, reglamento eléctrico RETIE):`;
    } else {
      // General search across terms
      relacionados = dataset.filter(
        (r) =>
          r.peligroDescripcion.toLowerCase().includes(q) ||
          r.zonaLugar.toLowerCase().includes(q) ||
          r.proceso.toLowerCase().includes(q) ||
          r.tareas.toLowerCase().includes(q) ||
          (r.cargo && r.cargo.toLowerCase().includes(q)) ||
          (r.cargosExpuestos && r.cargosExpuestos.toLowerCase().includes(q)) ||
          r.peligroClasificacion.toLowerCase().includes(q)
      );
      if (relacionados.length > 0) {
        respuesta = `Encontré ${relacionados.length} registros en la matriz relacionados con "${pregunta}":`;
      } else {
        respuesta = `No encontré registros exactos para "${pregunta}". Prueba preguntando por tu puesto (Fritura, Bodega, Mantenimiento, Aseo, Empaque), por lugar de la planta, o por peligros urgentes (Nivel I).`;
      }
    }

    setHistorial((prev) => [
      ...prev,
      { emisor: 'usuario', texto: pregunta },
      {
        emisor: 'asistente',
        texto: respuesta,
        riesgosRelacionados: relacionados.slice(0, 5),
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consulta.trim()) return;
    const q = consulta;
    setConsulta('');
    responderConsulta(q);
  };

  const consultasRapidas = [
    'Peligros del Operario de Fritura',
    'Peligros de Bodega',
    'Peligros de Mantenimiento',
    'Peligros Urgentes (Nivel I)',
    'Puestos que necesitan más cuidado',
    'Mejoras físicas en máquinas',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Guía de Consulta Rápida de Peligros
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Frikaz S.A.S.
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pregunta por tu puesto de trabajo, área, peligros urgentes o cómo protegerte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick query chips */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Preguntas rápidas:</span>
          {consultasRapidas.map((item, idx) => (
            <button
              key={idx}
              onClick={() => responderConsulta(item)}
              className="px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 hover:text-white hover:bg-emerald-600/30 border border-slate-700/80 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {historial.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.emisor === 'usuario' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.emisor === 'usuario'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-bl-none shadow-md'
                }`}
              >
                <p className="whitespace-pre-line">{msg.texto}</p>

                {/* Related Risk Cards */}
                {msg.riesgosRelacionados && msg.riesgosRelacionados.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60">
                    {msg.riesgosRelacionados.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-slate-300 hover:border-emerald-500/50 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-emerald-400">
                              {r.codigo || r.id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {r.cargo || r.zonaLugar}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                r.interpretacionNR === 'I'
                                  ? 'bg-rose-600 text-white'
                                  : r.interpretacionNR === 'II'
                                  ? 'bg-amber-500 text-slate-950 font-bold'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              Nivel {r.interpretacionNR} (NR {r.nivelRiesgo})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200 font-medium line-clamp-1">
                            {r.peligroDescripcion}
                          </p>
                        </div>

                        {onSelectRisk && (
                          <button
                            onClick={() => {
                              onSelectRisk(r.id);
                              onClose();
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            <span>Ver Ficha</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Pregunta sobre cargos, controles, nivel de riesgo o áreas..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!consulta.trim()}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
