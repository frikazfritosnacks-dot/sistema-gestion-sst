/**
 * Fuente única de cargos oficiales de Frikaz S.A.S.
 * Vinculada directamente al apartado «1. Equipo y responsabilidades en SST».
 *
 * REGLA ESTRICTA DE NEGOCIO:
 * Toda la aplicación SG-SST debe reconocer ÚNICAMENTE estos seis cargos oficiales.
 */

export type CargoOficialId =
  | 'cargo-gerente-general'
  | 'cargo-operario-seleccion'
  | 'cargo-operario-pelado'
  | 'cargo-operario-frito'
  | 'cargo-operario-empaque'
  | 'cargo-conductor';

export type CargoOficialNombre =
  | 'Gerente'
  | 'Operario de selección'
  | 'Operario de pelado'
  | 'Operario de frito'
  | 'Operario de empaque'
  | 'Conductor';

export interface DefinicionCargoOficial {
  id: CargoOficialId;
  nombre: CargoOficialNombre;
  areaPrincipal: string;
  orden: number;
  titularReferencia?: string;
}

export const CARGOS_OFICIALES_LISTA: DefinicionCargoOficial[] = [
  {
    id: 'cargo-gerente-general',
    nombre: 'Gerente',
    areaPrincipal: 'Dirección General y Coordinación SG-SST',
    orden: 1,
    titularReferencia: 'Andrea Orjuela',
  },
  {
    id: 'cargo-operario-seleccion',
    nombre: 'Operario de selección',
    areaPrincipal: 'Planta - Recepción, Selección, Calidad BPM y Aseo',
    orden: 2,
  },
  {
    id: 'cargo-operario-pelado',
    nombre: 'Operario de pelado',
    areaPrincipal: 'Planta - Pelado, Lavado y Rebanado',
    orden: 3,
  },
  {
    id: 'cargo-operario-frito',
    nombre: 'Operario de frito',
    areaPrincipal: 'Planta - Área de Fritura y Cocción',
    orden: 4,
  },
  {
    id: 'cargo-operario-empaque',
    nombre: 'Operario de empaque',
    areaPrincipal: 'Planta - Sellado, Empaque y Almacenamiento',
    orden: 5,
  },
  {
    id: 'cargo-conductor',
    nombre: 'Conductor',
    areaPrincipal: 'Logística y Distribución',
    orden: 6,
  },
];

export const CARGOS_OFICIALES_NOMBRES: CargoOficialNombre[] = CARGOS_OFICIALES_LISTA.map(
  (c) => c.nombre
);

export const CARGOS_OFICIALES_IDS: CargoOficialId[] = CARGOS_OFICIALES_LISTA.map((c) => c.id);

export function normalizarTextoCargo(valor: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const ALIAS_DIRECTO_CARGO_POR_ID: Record<string, CargoOficialId> = {
  'cargo-gerente-general': 'cargo-gerente-general',
  'cargo-coordinador-vigia-sst': 'cargo-gerente-general',
  'rol-lider-ambiental': 'cargo-gerente-general',
  'cargo-operario-seleccion': 'cargo-operario-seleccion',
  'cargo-operario-pelado': 'cargo-operario-pelado',
  'cargo-operario-frito': 'cargo-operario-frito',
  'cargo-operario-empaque': 'cargo-operario-empaque',
  'cargo-conductor': 'cargo-conductor',
};

export function obtenerCargoOficialPorId(id?: string): DefinicionCargoOficial | undefined {
  if (!id) return undefined;
  const canonId = ALIAS_DIRECTO_CARGO_POR_ID[id.trim()] || id.trim();
  return CARGOS_OFICIALES_LISTA.find((c) => c.id === canonId);
}

export function obtenerIdCargoOficial(nombreOId?: string): CargoOficialId {
  if (!nombreOId) return 'cargo-gerente-general';
  const porId = obtenerCargoOficialPorId(nombreOId);
  if (porId) return porId.id;
  const nombres = mapearCargoLegacyAOficiales(nombreOId);
  const primero = nombres[0] || 'Gerente';
  return (
    CARGOS_OFICIALES_LISTA.find((c) => c.nombre === primero)?.id || 'cargo-gerente-general'
  );
}

export function obtenerNombreCargoOficial(nombreOId?: string): CargoOficialNombre {
  const id = obtenerIdCargoOficial(nombreOId);
  return CARGOS_OFICIALES_LISTA.find((c) => c.id === id)?.nombre || 'Gerente';
}

/**
 * Mapea cualquier cadena heredada (o combinación separada por comas / barras)
 * estrictamente a uno o varios de los 6 cargos oficiales en orden canónico.
 */
export function mapearCargoLegacyAOficiales(rawCargo?: string): CargoOficialNombre[] {
  const texto = normalizarTextoCargo(rawCargo || '');
  if (!texto) return [];

  const encontrados = new Set<CargoOficialNombre>();

  const agregarSi = (condicion: boolean, cargo: CargoOficialNombre) => {
    if (condicion) encontrados.add(cargo);
  };

  // Coincidencias exactas o compuestas de "todo el personal"
  if (
    texto.includes('todo el personal') ||
    texto.includes('todos los trabajadores') ||
    texto.includes('10 trabajadores')
  ) {
    return [...CARGOS_OFICIALES_NOMBRES];
  }

  // Segmentos separados por coma o barra cuando no formen un único término compuesto legacy
  const tieneComaOPuntoYComa = texto.includes(',') || texto.includes(';');
  const segmentos = tieneComaOPuntoYComa
    ? texto.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
    : [texto];

  for (const seg of segmentos) {
    // 1. Gerente (incluye roles administrativos/SST/ambientales asumidos por gerencia o apoyo SST asignado)
    agregarSi(
      seg === 'gerente' ||
        seg.includes('andrea orjuela') ||
        seg.includes('gerencia') ||
        seg.includes('gerente general') ||
        seg.includes('recepcionista') ||
        seg.includes('asistente administrativo') ||
        seg.includes('auxiliar contable') ||
        seg.includes('facturacion') ||
        seg.includes('encargado ambiental') ||
        seg.includes('lider de gestion ambiental') ||
        seg.includes('coordinador') ||
        seg.includes('responsable sst') ||
        seg.includes('apoyo sg-sst'),
      'Gerente'
    );

    // 2. Operario de selección (incluye selección, calidad BPM, aseo/desinfección de planta, insumos/papa/bodega seca, vigía operativo)
    agregarSi(
      seg === 'operario de seleccion' ||
        seg.includes('seleccion') ||
        seg.includes('limpieza y sanitizacion') ||
        seg.includes('servicios generales') ||
        seg.includes('aseo') ||
        seg.includes('calidad y bpm') ||
        seg.includes('almacenamiento') ||
        seg.includes('vigia de sst') ||
        seg.includes('vigia sst') ||
        seg.includes('auxiliar de planta') ||
        seg.includes('planta y servicios') ||
        seg.includes('auxiliar de produccion'),
      'Operario de selección'
    );

    // 3. Operario de pelado (incluye pelado, rebanado, lavado, maquinaria de corte)
    agregarSi(
      seg === 'operario de pelado' ||
        seg.includes('pelado') ||
        seg.includes('rebanado') ||
        seg.includes('maquinaria y rebanado') ||
        seg.includes('tecnico de mantenimiento'),
      'Operario de pelado'
    );

    // 4. Operario de frito (incluye fritura, freidoras, cocción)
    agregarSi(
      seg === 'operario de frito' ||
        seg.includes('frito') ||
        seg.includes('fritura') ||
        seg.includes('coccion') ||
        seg.includes('freidora'),
      'Operario de frito'
    );

    // 5. Operario de empaque (incluye empaque, empacador, sellado, paletizado, despacho/bodega producto terminado)
    agregarSi(
      seg === 'operario de empaque' ||
        seg.includes('empaque') ||
        seg.includes('empacador') ||
        seg.includes('paletizado') ||
        seg.includes('bodega y despacho') ||
        seg.includes('bodega y logistica'),
      'Operario de empaque'
    );

    // 6. Conductor (incluye repartidor logístico, entregas, ruta)
    agregarSi(
      seg === 'conductor' ||
        seg.includes('repartidor') ||
        seg.includes('ruta') ||
        seg.includes('distribucion'),
      'Conductor'
    );

    // Términos operativos genéricos sin subproceso específico ("brigadista", "jefe de planta")
    if (seg.includes('brigadista')) {
      encontrados.add('Gerente');
      encontrados.add('Operario de selección');
      encontrados.add('Operario de pelado');
      encontrados.add('Operario de frito');
      encontrados.add('Operario de empaque');
    }
    if (seg.includes('jefe de planta') && encontrados.size === 0) {
      encontrados.add('Gerente');
    }
  }

  // Respetar orden canónico estricto
  return CARGOS_OFICIALES_NOMBRES.filter((c) => encontrados.has(c));
}

/**
 * Resuelve cargo principal (1 de los 6) y cadena normalizada de cargos expuestos
 * sin duplicados y siguiendo el orden oficial.
 */
export function resolverCargoPrincipalYExpuestos(
  cargoRaw?: string,
  cargosExpuestosRaw?: string
): {
  cargo: CargoOficialNombre;
  cargoPrincipal: CargoOficialNombre;
  cargosExpuestos: string;
  listaExpuestos: CargoOficialNombre[];
  cargosOficiales: CargoOficialNombre[];
} {
  const principales = mapearCargoLegacyAOficiales(cargoRaw);
  const expuestos = mapearCargoLegacyAOficiales(cargosExpuestosRaw);

  const combinadosSet = new Set<CargoOficialNombre>([...principales, ...expuestos]);
  const listaExpuestos = CARGOS_OFICIALES_NOMBRES.filter((c) => combinadosSet.has(c));

  const cargo: CargoOficialNombre =
    principales[0] || listaExpuestos[0] || 'Operario de selección';

  const listaFinal = listaExpuestos.length > 0 ? listaExpuestos : [cargo];

  return {
    cargo,
    cargoPrincipal: cargo,
    cargosExpuestos: listaFinal.join(', '),
    listaExpuestos: listaFinal,
    cargosOficiales: listaFinal,
  };
}

/**
 * Verifica si un registro (con cargo principal y/o cargosExpuestos) aplica a uno de los 6 cargos oficiales.
 */
export function coincideConCargoOficial(
  cargoBuscado: string,
  cargoRegistro?: string,
  cargosExpuestosRegistro?: string
): boolean {
  const buscados = mapearCargoLegacyAOficiales(cargoBuscado);
  const objetivo = buscados[0];
  if (!objetivo) return false;

  const expuestos = new Set<CargoOficialNombre>([
    ...mapearCargoLegacyAOficiales(cargoRegistro),
    ...mapearCargoLegacyAOficiales(cargosExpuestosRegistro),
  ]);

  return expuestos.has(objetivo);
}
