import { STAGE_BY_ID, STAGES } from './stages'
import type { ComponentDef, MountPoint, StageId } from '../types'

/* ------------------------------------------------------------------ *
 *  GEOMETRÍA
 *  1 unidad ≈ 10 cm.
 * ------------------------------------------------------------------ */

/** Placa base ATX: 3.05 x 2.44 unidades (30,5 x 24,4 cm). */
export const BOARD = {
  width: 3.05,
  depth: 2.44,
  thickness: 0.16,
  /** Altura de los separadores (standoffs). */
  rise: 0.08,
}

/** Cara superior de la placa base: donde posan los componentes. */
export const BOARD_TOP = BOARD.rise + BOARD.thickness
/** Plano que se usa para proyectar el puntero mientras se arrastra. */
export const DROP_Y = 0.12

/** Interior de la caja tumbada en el banco (fase 2). */
export const CASE = {
  floor: { width: 6.4, depth: 5.2, deck: 0.06 },
  wall: { height: 1.1, sideHeight: 0.6, thickness: 0.16 },
}
const CASE_DECK = CASE.floor.deck

/** Escritorio de los periféricos (fase 3). */
export const DESK = {
  tower: { position: [-5.6, 0, -2.2] as [number, number, number], width: 2.2, height: 4.4, depth: 4.4 },
}

function traySlot(stage: StageId, indexInStage: number): [number, number] {
  const { cols, rows } = STAGE_BY_ID[stage].tray
  const col = Math.floor(indexInStage / rows.length)
  const row = indexInStage % rows.length
  return [cols[Math.min(col, cols.length - 1)], rows[row]]
}

/* ------------------------------------------------------------------ *
 *  PUNTOS DE MONTAJE
 * ------------------------------------------------------------------ */

export const MOUNTS: MountPoint[] = [
  /* ---- Fase 1: sobre la placa base ---- */
  {
    id: 'cpu_socket',
    stage: 'board',
    label: 'Zócalo de la CPU',
    position: [-0.681, 0.122, -0.042],
    accepts: ['cpu'],
    snapRadius: 0.55,
    size: [0.62, 0.62],
    order: 2,
    difficulty: 2,
  },
  {
    id: 'cooler_mount',
    stage: 'board',
    label: 'Anclaje del disipador',
    position: [-0.681, 0.172, -0.042],
    accepts: ['cooler'],
    snapRadius: 0.6,
    size: [0.75, 0.75],
    order: 3,
    difficulty: 1,
  },
  {
    id: 'ram_slot_a',
    stage: 'board',
    label: 'Ranura de RAM (DIMM A2)',
    position: [-0.605, 0.122, -0.56],
    accepts: ['ram'],
    snapRadius: 0.5,
    size: [1.45, 0.3],
    order: 4,
    difficulty: 2,
  },
  {
    id: 'ram_slot_b',
    stage: 'board',
    label: 'Ranura de RAM (DIMM B2)',
    position: [-0.52, 0.117, -0.797],
    accepts: ['ram'],
    snapRadius: 0.5,
    size: [1.45, 0.3],
    order: 5,
    difficulty: 2,
  },
  {
    id: 'm2_slot',
    stage: 'board',
    label: 'Ranura M.2',
    position: [0.116, 0.108, -0.398],
    accepts: ['ssd'],
    snapRadius: 0.5,
    size: [1.0, 0.34],
    order: 6,
    difficulty: 2,
  },
  {
    id: 'pcie_slot',
    stage: 'board',
    label: 'Ranura PCIe x16',
    position: [1.116, 0.197, 0.124],
    accepts: ['gpu'],
    snapRadius: 0.7,
    size: [2.3, 0.5],
    angle: Math.PI / 2,
    order: 7,
    difficulty: 3,
  },

  /* ---- Fase 2: dentro de la caja ---- */
  {
    id: 'case_mobo_tray',
    stage: 'case',
    label: 'Bandeja de la placa base',
    position: [0.15, CASE_DECK, -0.35],
    accepts: ['motherboard'],
    snapRadius: 1.0,
    size: [3.5, 2.9],
    order: 8,
    difficulty: 3,
  },
  {
    id: 'case_psu_bay',
    stage: 'case',
    label: 'Bahía de la fuente',
    position: [-2.25, CASE_DECK, -0.1],
    accepts: ['psu'],
    snapRadius: 0.9,
    size: [1.8, 1.9],
    order: 9,
    difficulty: 1,
  },
  {
    id: 'case_fan_a',
    stage: 'case',
    label: 'Anclaje de ventilador trasero',
    position: [2.25, CASE_DECK, -1.5],
    accepts: ['fan'],
    snapRadius: 0.8,
    size: [1.4, 1.4],
    order: 10,
    difficulty: 1,
  },
  {
    id: 'case_fan_b',
    stage: 'case',
    label: 'Anclaje de ventilador frontal',
    position: [2.25, CASE_DECK, 1.1],
    accepts: ['fan'],
    snapRadius: 0.8,
    size: [1.4, 1.4],
    order: 11,
    difficulty: 1,
  },
  {
    id: 'case_drive_bay',
    stage: 'case',
    label: 'Bahía de discos',
    position: [0.1, CASE_DECK, 1.8],
    accepts: ['hdd'],
    snapRadius: 0.8,
    size: [1.3, 1.8],
    order: 12,
    difficulty: 1,
  },

  /* ---- Fase 3: periféricos ---- */
  {
    id: 'monitor_area',
    stage: 'peripherals',
    label: 'Zona del monitor',
    position: [-0.2, 0, -2.8],
    accepts: ['monitor'],
    snapRadius: 1.6,
    size: [5.0, 2.0],
    order: 12,
    difficulty: 1,
  },
  {
    id: 'speakers_area',
    stage: 'peripherals',
    label: 'Zona de los altavoces',
    position: [3.0, 0, -2.9],
    accepts: ['speaker'],
    snapRadius: 1.1,
    size: [2.3, 1.1],
    order: 13,
    difficulty: 1,
  },
  {
    id: 'keyboard_area',
    stage: 'peripherals',
    label: 'Zona del teclado',
    position: [-0.2, 0, 1.6],
    accepts: ['keyboard'],
    snapRadius: 1.3,
    size: [4.3, 1.6],
    order: 14,
    difficulty: 1,
  },
  {
    id: 'mouse_area',
    stage: 'peripherals',
    label: 'Zona del ratón',
    position: [2.7, 0, 1.8],
    accepts: ['mouse'],
    snapRadius: 0.8,
    size: [1.1, 1.7],
    order: 15,
    difficulty: 1,
  },
]

export const MOUNT_BY_ID: Record<string, MountPoint> = Object.fromEntries(
  MOUNTS.map((m) => [m.id, m]),
)

export const MOUNTS_BY_STAGE: Record<StageId, MountPoint[]> = {
  board: MOUNTS.filter((m) => m.stage === 'board'),
  case: MOUNTS.filter((m) => m.stage === 'case'),
  peripherals: MOUNTS.filter((m) => m.stage === 'peripherals'),
}

/* ------------------------------------------------------------------ *
 *  CATÁLOGO DE COMPONENTES (textos adaptados a 4º ESO)
 * ------------------------------------------------------------------ */

type RawComponent = Omit<ComponentDef, 'trayPos'>

const RAW: RawComponent[] = [
  /* ---- Fase 1 ---- */
  {
    id: 'cpu',
    kind: 'cpu',
    stage: 'board',
    name: 'CPU (Procesador)',
    subtitle: 'Unidad Central de Procesamiento',
    category: 'interno',
    order: 1,
    mountId: 'cpu_socket',
    size: 0.5,
    color: '#c9ced6',
    description:
      'Es el cerebro del ordenador. Ejecuta las instrucciones de los programas realizando miles de millones de operaciones por segundo. Su velocidad se mide en GHz y el número de núcleos indica cuántas tareas puede hacer a la vez.',
    funFact:
      'Un procesador actual tiene más de 10.000 millones de transistores dentro de un cuadrado de pocos centímetros.',
  },
  {
    id: 'cooler',
    kind: 'cooler',
    stage: 'board',
    name: 'Disipador + Ventilador',
    subtitle: 'Refrigeración de la CPU',
    category: 'interno',
    order: 2,
    mountId: 'cooler_mount',
    size: 0.9,
    color: '#9aa4b2',
    description:
      'Refrigera la CPU. Sin él, el procesador se calentaría tanto que se apagaría solo para no dañarse. El bloque metálico absorbe el calor y el ventilador lo expulsa al aire. Entre la CPU y el disipador se aplica pasta térmica para mejorar el contacto.',
    funFact:
      'Si el ventilador se para, la CPU puede superar los 100 °C en segundos y activar la protección térmica.',
  },
  {
    id: 'ram1',
    kind: 'ram',
    stage: 'board',
    name: 'Memoria RAM (módulo 1)',
    subtitle: 'Memoria de trabajo',
    category: 'interno',
    order: 3,
    mountId: 'ram_slot_a',
    size: 1.33,
    rotation: [-Math.PI / 2, 0, 0],
    color: '#2f7d5b',
    description:
      'Es la memoria de trabajo a corto plazo. Guarda temporalmente los programas y datos que estás usando ahora mismo. Cuanta más RAM, más aplicaciones puedes abrir a la vez. Su contenido se borra al apagar el ordenador.',
    funFact:
      'Los módulos actuales son DDR4 o DDR5. Un módulo DDR5 puede transferir más de 50 GB por segundo.',
  },
  {
    id: 'ram2',
    kind: 'ram',
    stage: 'board',
    name: 'Memoria RAM (módulo 2)',
    subtitle: 'Memoria de trabajo',
    category: 'interno',
    order: 4,
    mountId: 'ram_slot_b',
    size: 1.33,
    rotation: [-Math.PI / 2, 0, 0],
    color: '#2f7d5b',
    description:
      'Segundo módulo de memoria. Instalar dos módulos iguales activa el modo “doble canal” (dual channel): el procesador puede leer y escribir en los dos a la vez y el rendimiento mejora.',
    funFact:
      'En muchas placas hay que montar los módulos en las ranuras 2 y 4, no en la 1 y 2, para aprovechar el doble canal.',
  },
  {
    id: 'ssd',
    kind: 'ssd',
    stage: 'board',
    name: 'SSD M.2',
    subtitle: 'Almacenamiento permanente',
    category: 'interno',
    order: 5,
    mountId: 'm2_slot',
    size: 0.9,
    rotation: [0, Math.PI, 0],
    color: '#1f6f8b',
    description:
      'Almacenamiento permanente. Aquí se guardan el sistema operativo, tus archivos, juegos y fotos aunque apagues el ordenador. Los SSD M.2 se conectan directamente a la placa y no tienen partes móviles, por eso son mucho más rápidos y silenciosos que un disco duro tradicional (HDD).',
    funFact:
      'Un SSD arranca Windows en unos 10 segundos; un HDD antiguo puede tardar más de un minuto.',
  },
  {
    id: 'gpu',
    kind: 'gpu',
    stage: 'board',
    name: 'Tarjeta gráfica (GPU)',
    subtitle: 'Procesamiento gráfico',
    category: 'interno',
    order: 6,
    mountId: 'pcie_slot',
    size: 2.4,
    color: '#5b636f',
    description:
      'Se encarga de generar las imágenes que ves en el monitor. Es imprescindible para jugar en 3D, editar vídeo o hacer diseño. Tiene su propia memoria (VRAM) y puede hacer millones de operaciones gráficas por segundo.',
    funFact:
      'Las GPU se usan también para entrenar inteligencia artificial porque son muy buenas haciendo miles de cálculos a la vez.',
  },

  /* ---- Fase 2 ---- */
  {
    id: 'motherboard',
    kind: 'motherboard',
    stage: 'case',
    name: 'Placa base montada',
    subtitle: 'Con la CPU, la RAM, el SSD y la gráfica',
    category: 'interno',
    order: 7,
    mountId: 'case_mobo_tray',
    size: 3.05,
    rotation: [0, Math.PI / 2, 0],
    color: '#166534',
    description:
      'Es la placa principal del ordenador y la base de todo el montaje. Conecta todos los componentes entre sí y permite que se comuniquen. Ya llevas montadas en ella la CPU, el disipador, la RAM, el SSD y la tarjeta gráfica, así que ahora se instala completa dentro de la caja, atornillada sobre los separadores (standoffs).',
    funFact:
      'Los separadores dorados evitan que la cara con soldaduras de la placa toque el metal de la caja y provoque un cortocircuito.',
  },
  {
    id: 'psu',
    kind: 'psu',
    stage: 'case',
    name: 'Fuente de alimentación (PSU)',
    subtitle: 'Suministro eléctrico',
    category: 'interno',
    order: 8,
    mountId: 'case_psu_bay',
    size: 1.6,
    color: '#3a404a',
    description:
      'Transforma la corriente alterna de la pared (230 V) en corriente continua de bajo voltaje (12 V, 5 V y 3,3 V) que necesitan los componentes. Su potencia se mide en vatios (W) e indica cuánta energía puede suministrar. Suele colocarse en la parte inferior de la caja, con su ventilador mirando hacia abajo.',
    funFact:
      'Un PC de oficina consume unos 150 W; uno gamer con gráfica potente puede superar los 700 W.',
  },
  {
    id: 'fan1',
    kind: 'fan',
    stage: 'case',
    name: 'Ventilador de caja (trasero)',
    subtitle: 'Flujo de aire',
    category: 'interno',
    order: 9,
    mountId: 'case_fan_a',
    size: 1.2,
    color: '#454c58',
    description:
      'Mueve el aire dentro de la caja para que ningún componente se sobrecaliente. Los ventiladores traseros y superiores suelen expulsar el aire caliente hacia fuera.',
    funFact:
      'Se conectan a la placa (cabezales “SYS_FAN”) para que esta regule su velocidad según la temperatura.',
  },
  {
    id: 'fan2',
    kind: 'fan',
    stage: 'case',
    name: 'Ventilador de caja (delantero)',
    subtitle: 'Flujo de aire',
    category: 'interno',
    order: 10,
    mountId: 'case_fan_b',
    size: 1.2,
    color: '#454c58',
    description:
      'Segundo ventilador de la caja. Colocado delante, aspira aire frío del exterior y crea una corriente que atraviesa la torre y arrastra el calor hacia la salida. Un buen flujo de aire alarga la vida de los componentes.',
    funFact:
      'Un ventilador de 120 mm mueve más aire y hace menos ruido girando lento que uno de 80 mm girando rápido.',
  },

  {
    id: 'hdd',
    kind: 'hdd',
    stage: 'case',
    name: 'Disco duro (HDD)',
    subtitle: 'Almacenamiento magnético',
    category: 'interno',
    order: 11,
    mountId: 'case_drive_bay',
    size: 1.47,
    color: '#6b7684',
    description:
      'Almacenamiento tradicional que guarda los datos en discos magnéticos que giran a gran velocidad. Es más lento que un SSD y tiene partes móviles, pero ofrece mucha capacidad a bajo precio. Lo habitual hoy es usar el SSD para el sistema operativo y el HDD para archivos grandes y copias de seguridad.',
    funFact:
      'Un HDD tarda unas 10 veces más que un SSD en arrancar el sistema, pero puedes encontrar unidades de 4 TB por poco dinero.',
  },

  /* ---- Fase 3 ---- */
  {
    id: 'monitor',
    kind: 'monitor',
    stage: 'peripherals',
    name: 'Monitor',
    subtitle: 'Periférico de salida',
    category: 'periferico',
    order: 12,
    mountId: 'monitor_area',
    size: 4.6,
    color: '#262b33',
    description:
      'Muestra en pantalla los resultados del ordenador. Se conecta a la salida de la tarjeta gráfica mediante HDMI, DisplayPort o VGA. Su resolución (Full HD, 4K…) y su frecuencia (Hz) determinan la nitidez y la fluidez de la imagen.',
    funFact:
      'La frecuencia se mide en Hz: 60 Hz son 60 imágenes por segundo, y los monitores gamer llegan a 240 Hz o más.',
  },
  {
    id: 'keyboard',
    kind: 'keyboard',
    stage: 'peripherals',
    name: 'Teclado',
    subtitle: 'Periférico de entrada',
    category: 'periferico',
    order: 13,
    mountId: 'keyboard_area',
    size: 3.8,
    color: '#333945',
    description:
      'Permite escribir texto y dar órdenes al ordenador. Cada tecla envía un código que el sistema interpreta. Se conecta por USB o de forma inalámbrica mediante Bluetooth o un receptor USB. Un teclado estándar mide unos 44 cm de ancho.',
    funFact:
      'La distribución de teclas “QWERTY” viene de las antiguas máquinas de escribir del siglo XIX.',
  },
  {
    id: 'mouse',
    kind: 'mouse',
    stage: 'peripherals',
    name: 'Ratón',
    subtitle: 'Periférico de entrada',
    category: 'periferico',
    order: 14,
    mountId: 'mouse_area',
    size: 1.24,
    rotation: [0, Math.PI, 0],
    color: '#333945',
    description:
      'Con él movemos el puntero por la pantalla. Un sensor óptico detecta el movimiento sobre la superficie y lo traduce en coordenadas. Sus botones permiten seleccionar, arrastrar y abrir elementos.',
    funFact:
      'La resolución del sensor se mide en DPI: a más DPI, más rápido se mueve el puntero con el mismo movimiento.',
  },
  {
    id: 'speakers',
    kind: 'speaker',
    stage: 'peripherals',
    name: 'Altavoces',
    subtitle: 'Periférico de salida de audio',
    category: 'periferico',
    order: 15,
    mountId: 'speakers_area',
    size: 1.9,
    color: '#3a404a',
    description:
      'Convierten la señal eléctrica en ondas de sonido. Se conectan a la salida de audio de la placa base (jack verde) o por USB y Bluetooth. Para escuchar música o jugar necesitas que la tarjeta de sonido del equipo genere la señal.',
    funFact:
      'El oído humano percibe frecuencias entre 20 Hz y 20.000 Hz; por eso un altavoz necesita varias vías (graves y agudos).',
  },
]

const stageCounters: Record<StageId, number> = { board: 0, case: 0, peripherals: 0 }

export const COMPONENTS: ComponentDef[] = RAW.map((component) => {
  const indexInStage = stageCounters[component.stage]++
  return { ...component, trayPos: traySlot(component.stage, indexInStage) }
})

export const COMPONENT_BY_ID: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
)

export const COMPONENTS_BY_STAGE: Record<StageId, ComponentDef[]> = {
  board: COMPONENTS.filter((c) => c.stage === 'board'),
  case: COMPONENTS.filter((c) => c.stage === 'case'),
  peripherals: COMPONENTS.filter((c) => c.stage === 'peripherals'),
}

export const TOTAL_STEPS = COMPONENTS.length

/** Escala con la que se muestra el componente en la bandeja. */
export function trayScaleFor(def: ComponentDef): number {
  return Math.min(1, 0.75 / def.size)
}

/** Panel que delimita la bandeja de una fase, ajustado a sus componentes. */
export function trayPanelFor(stage: StageId): {
  center: [number, number]
  size: [number, number]
} {
  const defs = COMPONENTS_BY_STAGE[stage]
  const xs = defs.map((d) => d.trayPos[0])
  const zs = defs.map((d) => d.trayPos[1])
  const minX = Math.min(...xs) - 0.9
  const maxX = Math.max(...xs) + 0.9
  const minZ = Math.min(...zs) - 0.9
  const maxZ = Math.max(...zs) + 0.9
  return {
    center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxZ - minZ],
  }
}

export const BOARD_MOUNT_IDS = MOUNTS_BY_STAGE.board.map((m) => m.id)

export { STAGES }
