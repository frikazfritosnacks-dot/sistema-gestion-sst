import { resolverCargoPrincipalYExpuestos } from '../data/cargosOficiales';
import type { EppItemRiesgo, RiesgoGTC45Item } from '../types/gtc45RiskMatrix';

function construirItem(
  id: string,
  aplicaEpp: boolean,
  nombreEpp: string,
  justificacionUso: string,
  cargosEspecificos: string[],
  responsableEntrega: string = 'Gerente',
  observaciones?: string
): EppItemRiesgo {
  return {
    id,
    aplicaEpp,
    nombreEpp,
    justificacionUso,
    cargosEspecificos,
    estadoEntrega: aplicaEpp ? 'Pendiente de registro' : 'No aplica',
    fechaEntrega: '',
    responsableEntrega,
    evidencias: [],
    observaciones,
  };
}

/**
 * Devuelve la correspondencia técnica oficial de EPP por cada riesgo identificado
 * en la Matriz GTC 45 de Frikaz S.A.S., usando exclusivamente los 6 cargos oficiales
 * y sin inventar fechas de entrega ni entregas realizadas.
 */
export function obtenerEppBaseParaRiesgo(riesgo: RiesgoGTC45Item): EppItemRiesgo[] {
  const cargos = resolverCargoPrincipalYExpuestos(
    riesgo.cargo,
    riesgo.cargosExpuestos
  ).cargosOficiales;

  switch (riesgo.id) {
    case 'RSK-PROD-01':
      return [
        construirItem(
          'epp-prod01-1',
          true,
          'Guantes térmicos resistentes al calor y aceite hasta 250 °C (brazo/antebrazo)',
          'Contacto directo cercano con freidoras de aceite a 180 °C, canastillas calientes y riesgo de quemaduras en manos y antebrazos.',
          ['Operario de frito'],
          'Gerente'
        ),
        construirItem(
          'epp-prod01-2',
          true,
          'Delantal impermeable y resistente al calor y salpicaduras de aceite',
          'Protege el torso y la parte anterior del cuerpo frente a proyecciones o salpicaduras de aceite hirviendo durante la fritura y el escurrido.',
          ['Operario de frito'],
          'Gerente'
        ),
        construirItem(
          'epp-prod01-3',
          true,
          'Careta facial o monogafas antiempañantes contra salpicaduras térmicas',
          'Protege ojos y rostro ante burbujeo o salpicaduras repentinas de aceite caliente al ingresar papa húmeda o retirar canastillas.',
          ['Operario de frito'],
          'Gerente'
        ),
        construirItem(
          'epp-prod01-4',
          true,
          'Calzado de seguridad cerrado antideslizante resistente a grasas y calor',
          'Evita quemaduras en pies por goteo de aceite caliente y previene resbalones en el piso alrededor de las freidoras.',
          ['Operario de frito'],
          'Gerente'
        ),
      ];

    case 'RSK-PROD-02':
      return [
        construirItem(
          'epp-prod02-1',
          true,
          'Guantes largos de nitrilo resistentes a desengrasantes y químicos de limpieza',
          'Previene dermatitis, irritación o quemaduras químicas al manipular desengrasantes y preparar soluciones en limpieza de campanas y freidoras.',
          ['Operario de frito', 'Operario de selección', 'Operario de pelado'],
          'Gerente'
        ),
        construirItem(
          'epp-prod02-2',
          true,
          'Gafas de seguridad cerradas herméticas contra salpicaduras químicas',
          'Evita contacto ocular con nieblas o salpicaduras de productos desengrasantes alcalinos durante el lavado.',
          ['Operario de frito', 'Operario de selección', 'Operario de pelado'],
          'Gerente'
        ),
        construirItem(
          'epp-prod02-3',
          true,
          'Respirador con filtro para vapores orgánicos / neblinas de limpieza (según FDS)',
          'Reduce la inhalación directa de vapores irritantes durante labores intensivas de desengrase cuando la ventilación natural sea insuficiente.',
          ['Operario de frito'],
          'Gerente',
          'Usar según lo indicado en la Ficha de Datos de Seguridad (FDS) de cada producto.'
        ),
      ];

    case 'RSK-PROD-03':
      return [
        construirItem(
          'epp-prod03-1',
          true,
          'Protección auditiva (tapa oídos de inserción reutilizables o tipo copa certificados)',
          'Atenúa el ruido continuo generado por peladora, rebanadora, freidora y extractores para prevenir fatiga auditiva e hipoacusia.',
          ['Operario de pelado', 'Operario de frito', 'Operario de empaque'],
          'Gerente',
          'Validar atenuación requerida con sonometría en planta.'
        ),
      ];

    case 'RSK-PROD-04':
      return [
        construirItem(
          'epp-prod04-1',
          false,
          'No aplica EPP como medida de control principal (riesgo biomecánico)',
          'El riesgo por postura bípeda prolongada y movimientos repetitivos no se controla mediante EPP; requiere controles ergonómicos y administrativos (tapetes antifatiga en estación de trabajo, pausas activas, rotación de tareas y ajuste de altura de mesas).',
          cargos,
          'Gerente',
          'Verificar uso de calzado cómodo dentro de dotación general sin confundirlo con control del riesgo biomecánico.'
        ),
      ];

    case 'RSK-ALM-ASEO-01':
      return [
        construirItem(
          'epp-aseo01-1',
          true,
          'Guantes de nitrilo o neopreno calibre grueso resistentes a químicos',
          'Protege las manos contra irritación y quemaduras químicas al diluir y aplicar hipoclorito, desinfectantes y detergentes industriales.',
          ['Operario de selección', 'Operario de pelado', 'Operario de frito', 'Operario de empaque'],
          'Gerente'
        ),
        construirItem(
          'epp-aseo01-2',
          true,
          'Monogafas de seguridad cerradas contra salpicaduras químicas',
          'Protege los ojos durante el trasvase, dilución y aplicación con aspersión o cepillado de sustancias desinfectantes.',
          ['Operario de selección', 'Operario de pelado', 'Operario de frito', 'Operario de empaque'],
          'Gerente'
        ),
        construirItem(
          'epp-aseo01-3',
          true,
          'Delantal plástico impermeable de protección química',
          'Evita el contacto de soluciones químicas y humedad con la ropa y la piel del trabajador durante lavado de pisos, mesas y canastillas.',
          ['Operario de selección', 'Operario de pelado', 'Operario de frito'],
          'Gerente'
        ),
      ];

    case 'RSK-ALM-ASEO-02':
      return [
        construirItem(
          'epp-aseo02-1',
          true,
          'Botas de PVC o calzado de seguridad con suela antideslizante para pisos húmedos',
          'Aumenta la adherencia al piso mojado o jabonoso durante lavado de papa, pelado y aseo general, previniendo caídas al mismo nivel.',
          ['Operario de selección', 'Operario de pelado', 'Operario de frito', 'Operario de empaque'],
          'Gerente'
        ),
      ];

    case 'RSK-CIRC-01':
      return [
        construirItem(
          'epp-circ01-1',
          true,
          'Calzado de seguridad con suela antideslizante resistente a aceites y grasas',
          'Previene resbalones y caídas en zonas de circulación donde puede acumularse grasa de fritura o residuos cerca de bodega y empaque.',
          ['Operario de frito', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-CIRC-02':
      return [
        construirItem(
          'epp-circ02-1',
          true,
          'Guantes anticorte certificados (exclusivos para limpieza y cambio de cuchillas con equipo bloqueado)',
          'Previene cortaduras graves al desmontar, lavar o cambiar cuchillas de la rebanadora y peladora estando completamente apagadas y desconectadas.',
          ['Operario de pelado'],
          'Gerente',
          'PROHIBIDO usar guantes sueltos mientras las partes móviles o ejes estén girando por riesgo de atrapamiento.'
        ),
        construirItem(
          'epp-circ02-2',
          true,
          'Dotación ajustada al cuerpo y cofia de sujeción completa del cabello',
          'Evita que prendas holgadas o cabello suelto puedan quedar atrapados por rodillos, poleas o piezas móviles de peladora y rebanadora.',
          ['Operario de pelado', 'Operario de frito'],
          'Gerente'
        ),
      ];

    case 'RSK-EMERG-01':
      return [
        construirItem(
          'epp-emerg01-1',
          false,
          'No aplica EPP permanente de puesto (aplica dotación de brigada en emergencias)',
          'El riesgo sísmico se controla mediante rutas de evacuación despejadas, aseguramiento de estanterías y organización de brigada, no mediante EPP de uso diario.',
          cargos,
          'Gerente'
        ),
      ];

    case 'RSK-EMERG-02':
      return [
        construirItem(
          'epp-emerg02-1',
          true,
          'Chaleco o brazalete de identificación de brigada y guantes básicos en botiquín/kit',
          'Facilita la identificación del personal responsable durante la evacuación y permite atención inicial segura de lesionados leves (guantes de látex/nitrilo en botiquín).',
          ['Gerente', 'Operario de frito', 'Operario de empaque'],
          'Gerente',
          'No reemplaza la evacuación ante incendios activos o fugas graves.'
        ),
      ];

    case 'RSK-INST-01':
      return [
        construirItem(
          'epp-inst01-1',
          true,
          'Calzado con suela aislante en áreas con equipos eléctricos y zonas húmedas',
          'Brinda protección básica al trabajador durante la operación normal de equipos eléctricos cerca de zonas húmedas.',
          ['Operario de pelado', 'Operario de frito', 'Operario de empaque'],
          'Gerente',
          'Los operarios tienen prohibido abrir tableros o hacer reparaciones eléctricas; los EPP dieléctricos de mantenimiento aplican únicamente al técnico eléctrico externo autorizado.'
        ),
      ];

    case 'RSK-INST-02':
      return [
        construirItem(
          'epp-inst02-1',
          true,
          'Delantal resistente al calor/ignífugo y guantes térmicos en zona de freidoras a gas',
          'Ofrece protección térmica al operador cercano a quemadores y válvulas de gas mientras se activa el cierre seguro o evacuación.',
          ['Operario de frito'],
          'Gerente'
        ),
      ];

    case 'RSK-EXT-01':
      return [
        construirItem(
          'epp-ext01-1',
          true,
          'Chaleco reflectivo de alta visibilidad para paradas, cargue y descargue en vía',
          'Aumenta la visibilidad del Conductor frente a otros vehículos cuando realiza entregas, inspecciones del vehículo o atención de imprevistos en carretera.',
          ['Conductor'],
          'Gerente'
        ),
        construirItem(
          'epp-ext01-2',
          true,
          'Calzado de seguridad antideslizante para conducción segura y reparto',
          'Evita deslizamientos en pedales, rampas o aceras húmedas durante el reparto de producto terminado.',
          ['Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-EXT-02':
      return [
        construirItem(
          'epp-ext02-1',
          false,
          'No aplica EPP para riesgo público / inseguridad',
          'Los riesgos de robo o inseguridad en ingreso/salida o rutas no se mitigan con EPP; se controlan mediante medidas administrativas y de seguridad física (protocolo de no confrontación, pagos por transferencia y salidas acompañadas).',
          ['Conductor', 'Gerente'],
          'Gerente'
        ),
      ];

    case 'RSK-ALM-PROD-01':
      return [
        construirItem(
          'epp-almprod01-1',
          true,
          'Guantes de agarre mecánico / protección palmar para manipulación de cajas y bultos',
          'Mejora el agarre de bultos y cajas de cartón y protege las manos contra rozaduras, astillas o bordes cortantes del embalaje.',
          ['Operario de selección', 'Operario de pelado', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
        construirItem(
          'epp-almprod01-2',
          true,
          'Calzado de seguridad con puntera reforzada para cargue y traslado de bultos',
          'Protege los dedos de los pies ante caída accidental de bultos de papa, bidones de aceite o cajas pesadas durante el traslado.',
          ['Operario de selección', 'Operario de pelado', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
        construirItem(
          'epp-almprod01-3',
          false,
          'No aplica faja lumbar ni EPP ergonómico para carga de bultos',
          'En SST está contraindicado usar fajas elásticas como EPP porque generan falsa sensación de seguridad; la lesión lumbar se previene con carretilla, levantamiento con piernas y límite de peso.',
          ['Operario de selección', 'Operario de pelado', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-ALM-PROD-02':
      return [
        construirItem(
          'epp-almprod02-1',
          true,
          'Gorra protectora antigolpes (bump cap) o casco de seguridad cerca de estibas altas',
          'Protege la cabeza frente a caída accidental de cajas apiladas en la zona de despacho.',
          ['Operario de empaque', 'Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-ALM-01':
      return [
        construirItem(
          'epp-alm01-1',
          true,
          'Casco de seguridad certificado (ANSI Z89.1) para acceso y movimiento en estantería alta',
          'Protege contra impactos en la cabeza por caída de insumos secos o elementos desde niveles superiores de la estantería metálica.',
          ['Operario de selección', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
        construirItem(
          'epp-alm01-2',
          true,
          'Calzado de seguridad con puntera de protección',
          'Protege los pies frente a caída de bultos de condimentos, rollos plásticos o partes metálicas en bodega.',
          ['Operario de selección', 'Operario de empaque', 'Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-ALM-02':
      return [
        construirItem(
          'epp-alm02-1',
          true,
          'Respirador / mascarilla N95 al mover bultos con polvo o sospecha de humedad/moho',
          'Evita la inhalación de esporas de hongos, polvo de tierra o partículas orgánicas durante la revisión de bultos de papa en bodega.',
          ['Operario de selección', 'Operario de frito', 'Gerente'],
          'Gerente'
        ),
        construirItem(
          'epp-alm02-2',
          true,
          'Guantes desechables de nitrilo para inspección de estibas y control higiénico',
          'Previene el contacto directo de las manos con suciedad, humedad o posibles excretas de plagas durante la inspección.',
          ['Operario de selección', 'Operario de frito', 'Gerente'],
          'Gerente'
        ),
      ];

    case 'RSK-ACC-01':
      return [
        construirItem(
          'epp-acc01-1',
          false,
          'No aplica EPP para riesgo psicosocial',
          'El estrés laboral, atención al público y manejo de efectivo no se intervienen con EPP; requieren medidas organizacionales, protocolos de atención, pausas y aplicación de la batería psicosocial.',
          ['Gerente', 'Conductor'],
          'Gerente'
        ),
      ];

    case 'RSK-ACC-02':
      return [
        construirItem(
          'epp-acc02-1',
          false,
          'No aplica EPP para trabajo administrativo en computador',
          'Los riesgos por digitación y postura sedente en oficina se controlan mediante mobiliario ergonómico, ubicación adecuada de pantalla y pausas activas, no con EPP.',
          ['Gerente'],
          'Gerente'
        ),
      ];

    default: {
      const clasif = riesgo.peligroClasificacion;
      if (clasif === 'Psicosocial' || clasif === 'Biomecánico') {
        return [
          construirItem(
            `epp-def-${riesgo.id}-na`,
            false,
            `No aplica EPP como control principal (${clasif})`,
            `El peligro "${riesgo.peligroDescripcion}" requiere controles de ingeniería, ergonómicos o administrativos antes que EPP.`,
            cargos,
            'Gerente'
          ),
        ];
      }
      return [
        construirItem(
          `epp-def-${riesgo.id}-1`,
          true,
          riesgo.medidaEquiposEPP &&
            riesgo.medidaEquiposEPP !== 'Sin información registrada'
            ? riesgo.medidaEquiposEPP
            : 'EPP específico pendiente de definir según evaluación del peligro',
          `Protección frente al peligro "${riesgo.peligroDescripcion}" en ${riesgo.zonaLugar}.`,
          cargos,
          'Gerente'
        ),
      ];
    }
  }
}

export function asegurarEppItemsEnRiesgo(riesgo: RiesgoGTC45Item): EppItemRiesgo[] {
  if (Array.isArray(riesgo.eppItems) && riesgo.eppItems.length > 0) {
    return riesgo.eppItems;
  }
  return obtenerEppBaseParaRiesgo(riesgo);
}

export function resumirEppParaMatrizTexto(eppItems: EppItemRiesgo[]): string {
  if (!eppItems || eppItems.length === 0) return 'Sin información registrada';
  const aplicables = eppItems.filter((e) => e.aplicaEpp);
  if (aplicables.length === 0) {
    return `No aplica EPP (${eppItems[0].justificacionUso})`;
  }
  return `EPP (Elementos de Protección Personal): ${aplicables
    .map((e) => `${e.nombreEpp} [${e.cargosEspecificos.join(', ')}]`)
    .join('; ')}.`;
}
