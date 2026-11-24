import React, { useState, useRef, useEffect } from 'react';
import type { AssistantNavigationTarget } from '../types/assistantNavigation';
import {
  consultarAsistenteVirtual,
  type AssistantConfirmationRequest,
  type AssistantContext,
  type AssistantMatchCard,
} from '../services/virtualAssistantService';
import { FrikacitoAvatar } from './FrikacitoAvatar';
import {
  Send,
  ArrowRight,
  Minimize2,
  X,
  Search,
  Sparkles,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Compass,
  FileSearch,
  ClipboardList,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  notaPermiso?: string;
  items?: AssistantMatchCard[];
  navigatedTo?: string;
  confirmationRequest?: AssistantConfirmationRequest;
  confirmationHandled?: 'confirmed' | 'cancelled';
}

interface FloatingVirtualAssistantProps {
  onNavigate: (target: AssistantNavigationTarget) => void;
  userContext?: AssistantContext;
}

const ACCIONES_RAPIDAS = [
  {
    id: 'qr-apartado',
    label: 'Ir a un apartado',
    query: '¿Qué apartados disponibles tiene la herramienta?',
    icon: Compass,
  },
  {
    id: 'qr-doc',
    label: 'Buscar un documento',
    query: '¿Qué documentos están pendientes de aprobación?',
    icon: FileSearch,
  },
  {
    id: 'qr-act',
    label: 'Consultar actividades',
    query: '¿Qué actividades están pendientes?',
    icon: ClipboardList,
  },
  {
    id: 'qr-preg',
    label: 'Resolver una pregunta',
    query: '¿Para qué sirve la matriz de riesgos?',
    icon: HelpCircle,
  },
];

const SUGERENCIAS_EJEMPLO = [
  'Llévame al Plan Anual 2027',
  'Busca el riesgo eléctrico',
  'Abre el Plan de Emergencias',
  'Busca el formato de capacitación',
  '¿Cómo se registra una evidencia?',
  'Abre el presupuesto general',
  'Consultar un indicador',
  '¿Qué debemos hacer ante una fuga de gas?',
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome-frikacito',
  sender: 'assistant',
  text:
    '¡Hola! Soy Frikacito, tu asistente virtual de Frikaz S.A.S. ¿Qué necesitas consultar o dónde quieres ir? Estoy aquí para ayudarte.',
};

export const FloatingVirtualAssistant: React.FC<FloatingVirtualAssistantProps> = ({
  onNavigate,
  userContext = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escucha solicitudes desde la barra superior o cualquier módulo
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    };
    window.addEventListener('frikaz:open-assistant', handleOpen);
    return () => window.removeEventListener('frikaz:open-assistant', handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const executeNavigation = (target: AssistantNavigationTarget) => {
    onNavigate({ ...target, nonce: Date.now() });
  };

  const handleSend = (rawText?: string) => {
    const query = (rawText !== undefined ? rawText : input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    const result = consultarAsistenteVirtual(query, userContext);

    if (result.autoNavigateTarget) {
      executeNavigation(result.autoNavigateTarget);
    }

    const assistantMsg: ChatMessage = {
      id: `ast-${Date.now() + 1}`,
      sender: 'assistant',
      text: result.reply,
      notaPermiso: result.notaPermiso,
      items: result.items,
      navigatedTo: result.autoNavigateTarget?.etiquetaDestino,
      confirmationRequest: result.confirmationRequest,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (rawText === undefined) setInput('');
  };

  const handleConfirmationDecision = (
    msgId: string,
    decision: 'confirmed' | 'cancelled',
    target: AssistantNavigationTarget,
    titulo: string
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmationHandled: decision } : m))
    );

    if (decision === 'confirmed') {
      executeNavigation(target);
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-conf-${Date.now()}`,
          sender: 'assistant',
          text: `Listo, confirmaste «${titulo}». Ya abrí la pantalla oficial correspondiente para que realices y guardes el cambio directamente con tus permisos.`,
          navigatedTo: target.etiquetaDestino,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-canc-${Date.now()}`,
          sender: 'assistant',
          text: 'Entendido, no realicé ningún cambio ni abrí esa acción. Avísame si necesitas buscar o consultar otra cosa.',
        },
      ]);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[90] print:hidden flex flex-col items-end">
      {/* Ventana desplegable de FRIKACITO (conserva la conversación al minimizar) */}
      {isOpen && (
        <div
          className="mb-2.5 w-[calc(100vw-1.5rem)] sm:w-[420px] h-[min(74vh,590px)] rounded-2xl border border-[#b9dad3] bg-white shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Asistente virtual Frikacito"
        >
          {/* Encabezado con identidad oficial de Frikacito */}
          <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <FrikacitoAvatar size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight text-white truncate">
                    FRIKACITO
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-[#0f5b53] text-[9px] font-extrabold text-teal-100 uppercase tracking-wider shrink-0">
                    SG-SST
                  </span>
                </div>
                <p className="text-[10px] text-teal-200 truncate">
                  {userContext.esGerente
                    ? 'Conectado con Gerencia · Toda la herramienta'
                    : `Acompañando a ${userContext.workerNombre || 'Equipo Frikaz'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMessages([INITIAL_MESSAGE])}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="Reiniciar conversación"
                  aria-label="Reiniciar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Minimizar a Frikacito (conserva la conversación)"
                aria-label="Minimizar asistente"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Cerrar ventana"
                aria-label="Cerrar asistente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 4 Categorías rápidas + ejemplos desplazables */}
          <div className="bg-[#f4faf8] border-b border-[#d6ebe5] px-3 py-2 space-y-1.5 shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              {ACCIONES_RAPIDAS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSend(acc.query)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#e7f4f1] border border-[#cce3dd] text-[10px] font-bold text-[#0d3b36] cursor-pointer transition-colors text-left"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                    <span className="truncate">{acc.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <Sparkles className="h-3 w-3 text-[#0f6b61] shrink-0" />
              {SUGERENCIAS_EJEMPLO.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="px-2 py-0.5 rounded-md bg-white/90 hover:bg-[#e7f4f1] border border-[#cce3dd] text-[10px] font-semibold text-[#0f5b53] whitespace-nowrap cursor-pointer transition-colors shrink-0"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Historial de mensajes */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#f8fbfa] text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 pl-0.5">
                    <FrikacitoAvatar size="xs" />
                    <span className="text-[10px] font-black text-[#0f5b53] tracking-wide">
                      FRIKACITO
                    </span>
                  </div>
                )}

                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 space-y-2 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#0f5b53] text-white'
                      : 'bg-white border border-[#cce3dd] text-slate-800'
                  }`}
                >
                  <p className="leading-relaxed text-[11px] sm:text-xs whitespace-pre-line">
                    {msg.text}
                  </p>

                  {msg.navigatedTo && (
                    <div className="rounded-lg bg-[#eef6f4] border border-[#b9dad3] px-2.5 py-1.5 text-[10px] font-bold text-[#0f5b53] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0f5b53] shrink-0" />
                      <span>Navegación realizada: {msg.navigatedTo}</span>
                    </div>
                  )}

                  {msg.notaPermiso && (
                    <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{msg.notaPermiso}</span>
                    </div>
                  )}

                  {msg.confirmationRequest && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-2.5 space-y-2">
                      <p className="font-black text-slate-900 text-[11px]">
                        {msg.confirmationRequest.titulo}
                      </p>
                      <p className="text-[10px] text-slate-700 leading-relaxed">
                        {msg.confirmationRequest.detalle}
                      </p>
                      {!msg.confirmationHandled ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmationDecision(
                                msg.id,
                                'cancelled',
                                msg.confirmationRequest!.target,
                                msg.confirmationRequest!.titulo
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmationDecision(
                                msg.id,
                                'confirmed',
                                msg.confirmationRequest!.target,
                                msg.confirmationRequest!.titulo
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-[10px] cursor-pointer"
                          >
                            {msg.confirmationRequest.confirmLabel}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-[#0f5b53]">
                          {msg.confirmationHandled === 'confirmed'
                            ? 'Confirmado y abierto.'
                            : 'Cancelado sin cambios.'}
                        </p>
                      )}
                    </div>
                  )}

                  {msg.items && msg.items.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {msg.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#d6ebe5] bg-[#f8fcfa] p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="font-bold text-[#0f6b61] truncate">
                              {item.categoria}
                            </span>
                            {item.estadoLabel && (
                              <span className="px-1.5 py-0.5 rounded bg-white border border-[#cce3dd] font-bold text-[#0d3b36] shrink-0">
                                {item.estadoLabel}
                              </span>
                            )}
                          </div>
                          <p className="font-black text-slate-900 text-[11px] leading-snug">
                            {item.titulo}
                          </p>
                          <p className="text-[10px] text-slate-600 line-clamp-2">
                            {item.detalle}
                          </p>
                          <div className="pt-0.5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => executeNavigation(item.target)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f5b53] hover:bg-[#0c4842] text-white font-black text-[10px] cursor-pointer"
                            >
                              <span>Ir directo</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Barra de escritura */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-[#d6ebe5] flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregúntale a Frikacito o dile dónde ir..."
                className="w-full rounded-xl border border-[#b9dad3] bg-[#f8fbfa] pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0f5b53] focus:bg-white focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 text-white font-black inline-flex items-center gap-1 cursor-pointer shrink-0"
              aria-label="Enviar consulta a Frikacito"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Burbuja flotante persistente de FRIKACITO en esquina inferior derecha */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 80);
          }
        }}
        className="inline-flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-full bg-[#0f5b53] hover:bg-[#0c4842] text-white border-2 border-[#f97316]/80 shadow-xl cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0"
        title="Abrir o minimizar a Frikacito, tu asistente virtual de Frikaz S.A.S."
        aria-label="Abrir Frikacito"
      >
        <FrikacitoAvatar size="sm" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-xs font-black tracking-wide whitespace-nowrap">
            FRIKACITO
          </span>
          <span className="text-[9px] text-teal-100 font-semibold whitespace-nowrap hidden sm:inline">
            Asistente SG-SST
          </span>
        </span>
      </button>
    </div>
  );
};
