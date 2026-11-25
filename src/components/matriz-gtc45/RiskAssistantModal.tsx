import React, { useState } from 'react';
import {
  X,
  Send,
  ArrowRight,
  Bot,
} from 'lucide-react';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { getPhvaNorms } from '../../services/phvaService';
import { loadAllVigencias } from '../../services/planAnualService';
import { loadSgsstData } from '../../services/planAnualSgsstService';
import { getStoredChecklistItems } from '../../services/partesInteresadasService';
import { getStoredDocumentosFirmados } from '../../services/documentosFirmadosService';
import { getStoredPoliticaSST } from '../../services/organigramaService';
import { getCaracterizacionActual } from '../../services/dynamicRulesEngine';
import {
  ESTADOS_ESTANDAR_FRIKAZ,
  EstadoEstandarFrikaz,
  esGerenteAutorizado,
  normalizarEstadoEstandar,
} from '../../services/gerenteControlService';
import { coincideConCargoOficial } from '../../data/cargosOficiales';

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

function contarPorEstadoEstandar(estadosRaw: Array<string | null | undefined>): Record<EstadoEstandarFrikaz, number> {
  const conteo: Record<EstadoEstandarFrikaz, number> = {
    'Por hacer': 0,
    'En proceso': 0,
    'Pendiente de revisión': 0,
    'Devuelto para ajustes': 0,
    Cumplido: 0,
    Aprobado: 0,
  };
  for (const raw of estadosRaw) {
    const est = normalizarEstadoEstandar(raw);
    conteo[est] = (conteo[est] || 0) + 1;
  }
  return conteo;
}

function formatearResumenEstados(conteo: Record<EstadoEstandarFrikaz, number>): string {
  return ESTADOS_ESTANDAR_FRIKAZ.map((est) => `• ${est}: ${conteo[est]}`).join('\n');
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
      texto:
        `¡Hola! Soy el asistente de seguridad de Frikaz S.A.S. Te hablo en palabras claras y consulto los datos reales que están guardados hoy en la herramienta.\n\n` +
        `Puedes preguntarme por:\n` +
        `• Cualquiera de los 6 cargos oficiales (Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque, Conductor) o peligros urgentes (Nivel I).\n` +
        `• Cómo va el Plan Anual 2027 y el ciclo PHVA (1. Planear, 2. Hacer, 3. Verificar, 4. Actuar).\n` +
        `• Qué significan los 6 estados y qué aprueba Gerencia.\n` +
        `• Cómo van los indicadores (Res. 0312), los documentos firmados y la Política SST.`,
    },
  ]);

  if (!isOpen) return null;

  const obtenerDatosVivos = () => {
    const config = getCaracterizacionActual();
    const normas = getPhvaNorms();
    const vigencias = loadAllVigencias();
    const anios = Object.keys(vigencias)
      .map(Number)
      .sort((a, b) => b - a);
    const anioActivo = anios.includes(2027) ? 2027 : anios[0];
    const planActivo = anioActivo ? vigencias[anioActivo] : undefined;
    const sgsst = loadSgsstData(config, dataset);
    const checklist = getStoredChecklistItems();
    const documentosFirmados = getStoredDocumentosFirmados();
    const politica = getStoredPoliticaSST();
    const gerenteActivo = esGerenteAutorizado();

    return {
      config,
      normas,
      anioActivo,
      planActivo,
      sgsst,
      checklist,
      documentosFirmados,
      politica,
      gerenteActivo,
    };
  };

  const responderConsulta = (pregunta: string) => {
    const q = pregunta.toLowerCase().trim();
    let respuesta = '';
    let relacionados: RiesgoGTC45Item[] = [];

    const live = obtenerDatosVivos();

    // 1. Consulta general sobre cómo va todo (Resumen real y honesto)
    if (
      q.includes('resumen') ||
      q.includes('como vamos') ||
      q.includes('cómo vamos') ||
      q.includes('estado general') ||
      q.includes('todo el sistema')
    ) {
      const nivelI = dataset.filter((r) => r.interpretacionNR === 'I').length;
      const nivelII = dataset.filter((r) => r.interpretacionNR === 'II').length;
      const acts = live.planActivo?.actividades || [];
      const conteoActs = contarPorEstadoEstandar(acts.map((a) => a.estado));
      const estandaresAnio = live.sgsst.estandaresMinimos[live.anioActivo || 2026] || [];
      const conteoEst = contarPorEstadoEstandar(estandaresAnio.map((e) => e.estadoRevision));
      const estadoPolitica = normalizarEstadoEstandar(live.politica.estado);

      respuesta =
        `Aquí tienes la foto real de hoy en Frikaz S.A.S. (con ${live.config.numeroTrabajadores} trabajadores registrados):\n\n` +
        `1. Peligros en la planta (Matriz GTC 45): ${dataset.length} peligros evaluados (${nivelI} urgentes Nivel I y ${nivelII} importantes Nivel II).\n` +
        `2. Plan Anual ${live.anioActivo || 2026}: ${acts.length} actividades en total (${conteoActs.Cumplido + conteoActs.Aprobado} validadas por Gerencia, ${conteoActs['Pendiente de revisión']} esperando revisión, ${conteoActs['En proceso']} en marcha y ${conteoActs['Por hacer'] + conteoActs['Devuelto para ajustes']} por hacer o ajustar).\n` +
        `3. Estándares Mínimos (Res. 0312): ${conteoEst.Cumplido + conteoEst.Aprobado} de ${estandaresAnio.length} revisados y aprobados por Gerencia.\n` +
        `4. Política de Seguridad: hoy está en estado "${estadoPolitica}".\n` +
        `5. Documentos firmados recibidos: ${live.documentosFirmados.length} en bandeja.\n\n` +
        `Nota importante: ningún punto pasa a "Cumplido" ni "Aprobado" por sí solo; siempre espera la revisión de Andrea Orjuela – Gerente.`;
    }
    // 2. Plan Anual y Ciclo PHVA
    else if (
      q.includes('plan anual') ||
      q.includes('phva') ||
      q.includes('planear') ||
      q.includes('hacer') ||
      q.includes('verificar') ||
      q.includes('actuar') ||
      q.includes('cronograma') ||
      q.includes('actividad')
    ) {
      const acts = live.planActivo?.actividades || [];
      const conteoActs = contarPorEstadoEstandar(acts.map((a) => a.estado));
      const estadoPlan = normalizarEstadoEstandar(live.planActivo?.estadoAprobacion);
      const vinculadasRiesgo = acts.filter((a) => a.origen === 'RIESGO_GTC45').length;
      const accionesMejora = live.sgsst.accionesMejora || [];
      const conteoActuar = contarPorEstadoEstandar(accionesMejora.map((a) => a.estado));

      respuesta =
        `El apartado PLAN ANUAL (${live.anioActivo || 2026}) está organizado en el orden del ciclo PHVA. Su estado general de aprobación hoy es "${estadoPlan}":\n\n` +
        `1. PLANEAR: organiza objetivos, metas, peligros Nivel I/II, responsables, fechas y presupuesto.\n` +
        `2. HACER: registra quién hace cada actividad, sus avances y las fotos o actas de soporte.\n` +
        `3. VERIFICAR: revisa indicadores, resultados, evidencias y cumplimiento (con validación de Gerencia).\n` +
        `4. ACTUAR: registra las correcciones y mejoras cuando algo sale mal o falta completar.\n\n` +
        `Datos reales guardados hoy:\n` +
        `• Actividades del Plan Anual: ${acts.length} (${vinculadasRiesgo} conectadas directo a peligros de planta).\n` +
        `${formatearResumenEstados(conteoActs)}\n` +
        `• Acciones de mejora en 4. ACTUAR: ${accionesMejora.length} registradas (${conteoActuar.Cumplido + conteoActuar.Aprobado} cerradas por Gerencia).`;
    }
    // 3. Estados oficiales y Regla de Gerencia
    else if (
      q.includes('estado') ||
      q.includes('estados') ||
      q.includes('gerente') ||
      q.includes('gerencia') ||
      q.includes('aprobar') ||
      q.includes('aprobado') ||
      q.includes('cumplido') ||
      q.includes('devuelto') ||
      q.includes('permiso')
    ) {
      respuesta =
        `En toda la herramienta de Frikaz S.A.S. usamos solo 6 estados claros para no enredarnos:\n\n` +
        `Lo que puede marcar el equipo al trabajar:\n` +
        `• Por hacer: todavía no se ha empezado.\n` +
        `• En proceso: ya se está trabajando en ello.\n` +
        `• Pendiente de revisión: ya se guardó el avance o la prueba; falta que el Gerente lo revise.\n\n` +
        `Lo que SOLO puede marcar y editar Andrea Orjuela – Gerente (ingresando con su correo frikaz.fritosnacks@gmail.com):\n` +
        `• Devuelto para ajustes: la Gerencia pide corregir o completar el soporte.\n` +
        `• Cumplido: la Gerencia revisó la prueba y confirmó que sí se realizó.\n` +
        `• Aprobado: la Gerencia dio su aprobación oficial final.\n\n` +
        `Estado actual de sesión: ${
          live.gerenteActivo
            ? 'Sesión de Andrea Orjuela – Gerente ACTIVA (edición completa habilitada).'
            : 'Vista de consulta (sin sesión de Gerencia iniciada).'
        }`;
    }
    // 4. Indicadores mínimos Res. 0312 de 2019
    else if (
      q.includes('indicador') ||
      q.includes('0312') ||
      q.includes('accidentalidad') ||
      q.includes('ausentismo') ||
      q.includes('mortal') ||
      q.includes('severidad') ||
      q.includes('frecuencia') ||
      q.includes('estandares') ||
      q.includes('estándares')
    ) {
      const hojas = live.sgsst.hojasVidaIndicadores.filter((h) => h.esNormativo0312);
      const periodos = live.sgsst.registrosPeriodosIndicadores || [];
      const periodosValidados = periodos.filter((p) => p.validado).length;
      const periodosPendientes = periodos.length - periodosValidados;
      const estandaresAnio = live.sgsst.estandaresMinimos[live.anioActivo || 2026] || [];
      const conteoEst = contarPorEstadoEstandar(estandaresAnio.map((e) => e.estadoRevision));

      respuesta =
        `La herramienta maneja los 6 indicadores obligatorios de seguridad (Artículo 30 de la Resolución 0312 de 2019):\n` +
        `${hojas.map((h, i) => `${i + 1}. ${h.nombre}`).join('\n')}\n\n` +
        `Lo que hay guardado realmente hoy:\n` +
        `• Períodos cargados con cifras: ${periodos.length} (${periodosValidados} validados por Gerencia y ${periodosPendientes} pendientes de validación).\n` +
        `• Estándares Mínimos (${estandaresAnio.length} puntos del grupo actual):\n` +
        `${formatearResumenEstados(conteoEst)}`;
    }
    // 5. Documentos firmados, Política SST, Evidencias y Partes Interesadas
    else if (
      q.includes('documento') ||
      q.includes('firmado') ||
      q.includes('politica') ||
      q.includes('política') ||
      q.includes('evidencia') ||
      q.includes('prueba') ||
      q.includes('parte') ||
      q.includes('checklist') ||
      q.includes('lista')
    ) {
      const estadoPol = normalizarEstadoEstandar(live.politica.estado);
      const conteoDocs = contarPorEstadoEstandar(live.documentosFirmados.map((d) => d.estado));
      const conteoCheck = contarPorEstadoEstandar(live.checklist.map((c) => c.estado));
      const conteoNormas = contarPorEstadoEstandar(live.normas.map((n) => n.estado));

      respuesta =
        `Así están hoy los documentos, listas y normas según lo guardado en la herramienta:\n\n` +
        `• Política de Seguridad (SST): estado actual "${estadoPol}".\n` +
        `• Documentos firmados recibidos (${live.documentosFirmados.length} en total):\n` +
        `${formatearResumenEstados(conteoDocs)}\n\n` +
        `• Listas de necesidades del equipo (${live.checklist.length} puntos entre Gerente, Operarios y Conductor):\n` +
        `${formatearResumenEstados(conteoCheck)}\n\n` +
        `• Normas del Ciclo PHVA (${live.normas.length} reglas): ${conteoNormas.Cumplido + conteoNormas.Aprobado} validadas por Gerencia, ${conteoNormas['Pendiente de revisión']} por revisar.`;
    }
    // 6. Consultas de riesgos GTC 45 en lenguaje claro
    else if (
      q.includes('nivel i') ||
      q.includes('critico') ||
      q.includes('crítico') ||
      q.includes('urgente') ||
      q.includes('no aceptable') ||
      q.includes('graves')
    ) {
      relacionados = dataset.filter((r) => r.interpretacionNR === 'I');
      respuesta = `Hay ${relacionados.length} peligro(s) en Nivel I (Urgentes / No Aceptables). Según la guía GTC 45, estos requieren parar la tarea si no es segura y corregirlos de inmediato para protegerte:`;
    } else if (q.includes('gerente') || q.includes('andrea') || q.includes('oficina') || q.includes('administrat')) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Gerente', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Gerente (Andrea Orjuela) hay ${relacionados.length} riesgo(s) asociados en la Matriz GTC 45 (supervisión general en planta, atención/recaudo, registro en computador y emergencias):`;
    } else if (
      q.includes('frito') ||
      q.includes('fritura') ||
      q.includes('coccion') ||
      q.includes('cocción') ||
      q.includes('freidora')
    ) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Operario de frito', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Operario de frito hay ${relacionados.length} peligro(s) registrados, destacando el calor extremo y salpicaduras a 180 °C (Nivel I), fuga de gas y conato de incendio en freidoras:`;
    } else if (
      q.includes('pelado') ||
      q.includes('rebanado') ||
      q.includes('rebanadora') ||
      q.includes('cuchilla') ||
      q.includes('mantenimiento')
    ) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Operario de pelado', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Operario de pelado tenemos ${relacionados.length} peligro(s) identificados (atrapamiento en piezas móviles, ruido de peladora/rebanadora, contacto eléctrico y emergencias). Nota: las reparaciones mecánicas y eléctricas mayores las realiza un proveedor externo.`;
    } else if (
      q.includes('seleccion') ||
      q.includes('selección') ||
      q.includes('aseo') ||
      q.includes('limpieza') ||
      q.includes('calidad') ||
      q.includes('bpm')
    ) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Operario de selección', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Operario de selección hay ${relacionados.length} peligro(s) registrados, incluyendo químicos de limpieza, pisos húmedos, movimientos repetitivos en banda e inspección de insumos/estanterías:`;
    } else if (
      q.includes('empaque') ||
      q.includes('paletizado') ||
      q.includes('cajas') ||
      q.includes('bodega') ||
      q.includes('sellado')
    ) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Operario de empaque', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Operario de empaque hay ${relacionados.length} peligro(s) identificados, enfocados en levantamiento y estibado de cajas, arrumes temporales, movimiento de transpaleta y postura repetitiva:`;
    } else if (
      q.includes('conductor') ||
      q.includes('ruta') ||
      q.includes('vehiculo') ||
      q.includes('vehículo') ||
      q.includes('entrega')
    ) {
      relacionados = dataset.filter((r) =>
        coincideConCargoOficial('Conductor', r.cargo, r.cargosExpuestos)
      );
      respuesta = `Para el cargo oficial Conductor hay ${relacionados.length} peligro(s) registrados, incluyendo riesgo público en ruta, cargue/descargue de cajas, tránsito en bodega y emergencias:`;
    } else if (
      q.includes('top cargos') ||
      q.includes('mayor riesgo') ||
      q.includes('mas expuestos') ||
      q.includes('más expuestos') ||
      q.includes('más cuidado')
    ) {
      relacionados = dataset.filter((r) => r.interpretacionNR === 'I');
      respuesta =
        `Los 6 cargos oficiales con mayor prioridad de control en Frikaz S.A.S. (Niveles I y II) son:\n` +
        `1. Operario de frito (aceite caliente a 180 °C, fuga de gas y conato de incendio).\n` +
        `2. Operario de pelado (ruido mayor a 85 dBA, atrapamiento en máquina y contacto eléctrico).\n` +
        `3. Operario de selección (químicos sin etiqueta SGA, estanterías altas y pisos húmedos).\n` +
        `4. Operario de empaque (estibado/cargas, atrapamiento en selladora y transpaletas).\n` +
        `5. Conductor (riesgo público en ruta y cargue/descargue).\n` +
        `6. Gerente (coordinación ante emergencias, fugas de gas y carga administrativa).\n\n` +
        `Hoy hay ${relacionados.length} peligro(s) en Nivel I registrados en la matriz:`;
    } else if (
      q.includes('ingenieria') ||
      q.includes('ingeniería') ||
      q.includes('mejoras') ||
      q.includes('guarda') ||
      q.includes('sensor')
    ) {
      relacionados = dataset.filter(
        (r) =>
          r.medidaControlesIngenieria &&
          r.medidaControlesIngenieria !== 'Sin información registrada' &&
          r.medidaControlesIngenieria.toLowerCase() !== 'no aplica'
      );
      respuesta = `Hay ${relacionados.length} mejoras físicas en máquinas e instalaciones (controles de ingeniería) planeadas en Frikaz S.A.S. para proteger a los trabajadores desde la raíz:`;
    } else if (
      q.includes('biomecanico') ||
      q.includes('biomecánico') ||
      q.includes('ergon') ||
      q.includes('postura') ||
      q.includes('carga')
    ) {
      relacionados = dataset.filter((r) => r.peligroClasificacion === 'Biomecánico');
      respuesta = `Tenemos ${relacionados.length} peligros por postura, fuerza o movimientos repetitivos (Biomecánicos): levantar cajas del piso, estar de pie seleccionando y trabajar sentado frente al computador:`;
    } else if (
      q.includes('quimico') ||
      q.includes('químico') ||
      q.includes('aceite') ||
      q.includes('gas')
    ) {
      relacionados = dataset.filter((r) => r.peligroClasificacion === 'Químico');
      respuesta = `Tenemos ${relacionados.length} peligros por sustancias químicas: envases de limpieza sin etiqueta SGA y mezcla de cloro o desengrasantes fuertes:`;
    } else if (
      q.includes('consecuencia') ||
      q.includes('nc 100') ||
      q.includes('mortal') ||
      q.includes('catastrofico')
    ) {
      relacionados = dataset.filter((r) => r.nivelConsecuencia === 100);
      respuesta = `Peligros con gravedad máxima (NC = 100, que pueden causar accidentes muy graves o fatales si no se controlan): hay ${relacionados.length} registros:`;
    } else if (
      q.includes('legal') ||
      q.includes('resolucion') ||
      q.includes('decreto') ||
      q.includes('norma')
    ) {
      relacionados = dataset.filter(
        (r) => r.existenciaRequisitoLegal === 'SÍ' && r.requisitoLegalEspecifico
      );
      respuesta = `Hay ${relacionados.length} peligros respaldados por leyes obligatorias en Colombia (Resolución 2400/1979, Decreto 1072/2015, Resolución 773/2021 de etiquetas químicas SGA, reglamento eléctrico RETIE):`;
    } else {
      // Búsqueda general en matriz de riesgos
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
        respuesta = `Encontré ${relacionados.length} peligro(s) en la matriz relacionados con "${pregunta}":`;
      } else {
        respuesta =
          `No encontré datos exactos para "${pregunta}". Puedes preguntarme en palabras sencillas por:\n` +
          `• "Cómo vamos" (resumen real de toda la herramienta)\n` +
          `• "Plan Anual PHVA" (las 4 etapas y actividades reales)\n` +
          `• "Qué son los 6 estados y qué aprueba el Gerente"\n` +
          `• "Indicadores 0312" o "Documentos y Política"\n` +
          `• Cualquiera de los 6 cargos oficiales (Gerente, Operario de selección, Operario de pelado, Operario de frito, Operario de empaque, Conductor) o "Peligros Urgentes (Nivel I)".`;
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
    '¿Cómo vamos en resumen hoy?',
    'Estado del Plan Anual (PHVA)',
    'Los 6 estados y permisos de Gerencia',
    'Indicadores Res. 0312',
    'Peligros Urgentes (Nivel I)',
    'Peligros de Operario de frito',
    'Peligros de Operario de empaque',
    'Peligros de Conductor',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[620px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Asistente de Seguridad y Plan Anual
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Datos Reales · Frikaz S.A.S.
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Consulta peligros, el Plan Anual PHVA, indicadores y aprobaciones en lenguaje claro
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
            placeholder="Pregunta por tu puesto, Plan Anual PHVA, 6 estados, indicadores o documentos..."
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
