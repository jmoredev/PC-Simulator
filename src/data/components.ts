import { STAGE_BY_ID, STAGES } from './stages'
import { BOARD as ACTIVE_BOARD, boardModelUrl } from './boards'
import { CABLES, DECOY_CABLES } from './cables'
import { portLabel, portSize } from './ports'
import type { ComponentDef, ComponentKind, MountPoint, StageId } from '../types'

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

/** Escritorio de los periféricos (fase 3). */
export const DESK = {
  tower: { position: [-5.6, 0, -2.2] as [number, number, number], width: 2.2, height: 4.4, depth: 4.4 },
}

/* ------------------------------------------------------------------ *
 *  PANEL TRASERO (fase 2)
 *  La chapa I/O es una franja estrecha en el borde de la placa y con los
 *  puertos apilados en vertical. La fase 2 enfoca la cámara de frente a esa
 *  franja (plano de arrastre vertical) y los cables llegan desde la barra
 *  lateral, así que la placa sigue viéndose en 3D tal y como se montó.
 * ------------------------------------------------------------------ */

/** Modelo de la placa base (solo la placa) que se monta en la fase 1. */
export const BOARD_MODEL = {
  id: ACTIVE_BOARD.id,
  model: boardModelUrl(ACTIVE_BOARD),
  size: ACTIVE_BOARD.size,
  rotation: ACTIVE_BOARD.rotation,
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

/** Huecos de la fase 1: valores de referencia (placa ATX). */
const BOARD_MOUNTS_DEFAULT: MountPoint[] = [
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
    position: [-0.656, 0.122, -0.553],
    accepts: ['ram'],
    snapRadius: 0.5,
    size: [1.26, 0.3],
    angle: 0.02,
    order: 4,
    difficulty: 2,
  },
  {
    id: 'ram_slot_b',
    stage: 'board',
    label: 'Ranura de RAM (DIMM B2)',
    position: [-0.683, 0.121, -0.781],
    accepts: ['ram'],
    snapRadius: 0.5,
    size: [1.19, 0.3],
    angle: 0.013,
    order: 5,
    difficulty: 2,
  },
  {
    id: 'm2_slot',
    stage: 'board',
    label: 'Ranura M.2',
    position: [0.083, 0.08, 0.109],
    accepts: ['ssd'],
    snapRadius: 0.5,
    size: [1.02, 0.34],
    angle: -1.515,
    order: 6,
    difficulty: 2,
  },
  {
    id: 'pcie_slot',
    stage: 'board',
    label: 'Ranura PCIe x16',
    position: [0.922, 0.168, 0.148],
    accepts: ['gpu'],
    snapRadius: 0.7,
    size: [2.3, 0.5],
    angle: 1.56,
    order: 7,
    difficulty: 3,
  },
]

/** Separación del disipador sobre la cara superior de la CPU. */
const COOLER_LIFT = 0.05

/** Aplica la calibración de la placa activa sobre los huecos de referencia. */
function boardMounts(): MountPoint[] {
  const calibrated = ACTIVE_BOARD.mounts
  const mounts = BOARD_MOUNTS_DEFAULT.map((mount) => {
    const override = calibrated?.find((m) => m.id === mount.id)
    return override ? { ...mount, ...override } : mount
  })
  const cpu = mounts.find((m) => m.id === 'cpu_socket')
  const cooler = mounts.find((m) => m.id === 'cooler_mount')
  if (cpu && cooler) {
    cooler.position = [cpu.position[0], cpu.position[1] + COOLER_LIFT, cpu.position[2]]
  }
  return mounts
}

/** Huecos de la fase 2: un hueco por cada puerto trasero calibrado. */
function portMounts(): MountPoint[] {
  const ports = ACTIVE_BOARD.ports ?? []
  return ports.map((port, index) => {
    // El hueco va de frente a la chapa: el largo del puerto en Z y su alto en Y.
    const [along, across] = portSize(port.kind)
    return {
      id: `port_${index}`,
      stage: 'ports',
      label: portLabel(port.kind),
      position: port.point,
      accepts: [port.kind],
      snapRadius: Math.max(along, across) * 0.9,
      size: [along, across],
      order: 7 + index,
      difficulty: 1,
    }
  })
}

export const MOUNTS: MountPoint[] = [
  ...boardMounts(),

  ...portMounts(),

  /* ---- Fase 3: periféricos ---- */
  {
    id: 'monitor_area',
    stage: 'peripherals',
    label: 'Zona del monitor',
    position: [-0.2, 0, -2.8],
    accepts: ['monitor'],
    snapRadius: 1.6,
    size: [5.0, 2.0],
    order: 17,
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
    order: 18,
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
    order: 19,
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
    order: 20,
    difficulty: 1,
  },
]

export const MOUNT_BY_ID: Record<string, MountPoint> = Object.fromEntries(
  MOUNTS.map((m) => [m.id, m]),
)

export const MOUNTS_BY_STAGE: Record<StageId, MountPoint[]> = {
  board: MOUNTS.filter((m) => m.stage === 'board'),
  ports: MOUNTS.filter((m) => m.stage === 'ports'),
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

  /* ---- Fase 3 ---- */
  {
    id: 'monitor',
    kind: 'monitor',
    stage: 'peripherals',
    name: 'Monitor',
    subtitle: 'Periférico de salida',
    category: 'periferico',
    order: 19,
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
    order: 20,
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
    order: 21,
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
    order: 22,
    mountId: 'speakers_area',
    size: 1.9,
    color: '#3a404a',
    description:
      'Convierten la señal eléctrica en ondas de sonido. Se conectan a la salida de audio de la placa base (jack verde) o por USB y Bluetooth. Para escuchar música o jugar necesitas que la tarjeta de sonido del equipo genere la señal.',
    funFact:
      'El oído humano percibe frecuencias entre 20 Hz y 20.000 Hz; por eso un altavoz necesita varias vías (graves y agudos).',
  },
]

const stageCounters: Record<StageId, number> = { board: 0, ports: 0, peripherals: 0 }

/** Orden en el que se muestran los cables en la bandeja. */
const CABLE_ORDER: ComponentKind[] = [
  'ps2',
  'usb',
  'hdmi',
  'displayport',
  'dvi',
  'vga',
  'lan',
  'audio-out',
  'audio-in',
  'audio-mic',
]

/**
 * Cables de la fase 2: uno por cada tipo de conector que tenga la placa,
 * más los cables señuelo (que no encajan en ningún puerto).
 */
function cableComponents(): RawComponent[] {
  const ports = ACTIVE_BOARD.ports ?? []
  const list: RawComponent[] = []

  CABLE_ORDER.filter((kind) => ports.some((p) => p.kind === kind)).forEach((kind, index) => {
    const cable = CABLES[kind]
    if (!cable) return
    const portIndex = ports.findIndex((p) => p.kind === kind)
    list.push({
      id: `cable_${kind}`,
      kind,
      stage: 'ports',
      name: cable.name,
      subtitle: cable.subtitle,
      category: 'conector',
      procedural: true,
      order: 7 + index,
      mountId: `port_${portIndex}`,
      size: cable.size,
      color: cable.color,
      description: cable.description,
      funFact: cable.funFact,
    })
  })

  DECOY_CABLES.forEach((kind, index) => {
    const cable = CABLES[kind]
    if (!cable) return
    list.push({
      id: `cable_${kind}`,
      kind,
      stage: 'ports',
      name: cable.name,
      subtitle: cable.subtitle,
      category: 'conector',
      procedural: true,
      decoy: true,
      order: 40 + index,
      size: cable.size,
      color: cable.color,
      description: cable.description,
      funFact: cable.funFact,
    })
  })

  return list
}

const ALL_COMPONENTS: RawComponent[] = [...RAW, ...cableComponents()]

export const COMPONENTS: ComponentDef[] = ALL_COMPONENTS.map((component) => {
  const indexInStage = stageCounters[component.stage]++
  return { ...component, trayPos: traySlot(component.stage, indexInStage) }
})

export const COMPONENT_BY_ID: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
)

export const COMPONENTS_BY_STAGE: Record<StageId, ComponentDef[]> = {
  board: COMPONENTS.filter((c) => c.stage === 'board'),
  ports: COMPONENTS.filter((c) => c.stage === 'ports'),
  peripherals: COMPONENTS.filter((c) => c.stage === 'peripherals'),
}

/** Piezas que hay que colocar (los cables señuelo no cuentan). */
export const PLACEABLE_COMPONENTS = COMPONENTS.filter((c) => !c.decoy)

export const TOTAL_STEPS = PLACEABLE_COMPONENTS.length

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
