/** Modo calibración: se activa con `?calibrate=1` en la URL. */
export const CALIBRATE =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('calibrate')

/** Rejilla de coordenadas sobre la placa: se activa con `?debug=1`. */
export const DEBUG =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

export type Point = [number, number, number]

export interface CalibrationSlot {
  id: string
  label: string
  hint: string
  /** Número de clics: 1 para un punto, 2 para los extremos de una ranura. */
  points: 1 | 2
}

/** Huecos de la placa base que hay que marcar para cada modelo. */
export const BOARD_SLOTS: CalibrationSlot[] = [
  {
    id: 'cpu_socket',
    label: 'Zócalo de la CPU',
    hint: 'Centro del zócalo',
    points: 1,
  },
  {
    id: 'ram_slot_a',
    label: 'RAM 1 (A2)',
    hint: 'Marca los DOS extremos de la ranura',
    points: 2,
  },
  {
    id: 'ram_slot_b',
    label: 'RAM 2 (B2)',
    hint: 'Marca los DOS extremos de la ranura',
    points: 2,
  },
  {
    id: 'm2_slot',
    label: 'SSD M.2',
    hint: 'Marca los DOS extremos de la ranura',
    points: 2,
  },
  {
    id: 'pcie_slot',
    label: 'GPU (PCIe x16)',
    hint: 'Marca los DOS extremos de la ranura',
    points: 2,
  },
]

/** Altura que se sube la CPU sobre la superficie de la placa. */
export const CPU_LIFT = 0.055
/** Altura del disipador sobre la CPU. */
export const COOLER_LIFT = 0.05

export interface LinearSlot {
  /** Centro de la ranura [x, z]. */
  at: [number, number]
  /** Altura a la que se coloca la pieza. */
  y: number
  /** Ángulo de la ranura en el plano XZ (radianes). */
  angle: number
  /** Longitud de la ranura. */
  length: number
}

const round = (v: number) => Math.round(v * 1000) / 1000

/** Deriva la disposición de la placa a partir de los puntos marcados. */
export function deriveLayout(points: Record<string, Point[]>) {
  const all = Object.values(points).flat()
  if (all.length === 0) return null

  const surfaceY = round(Math.min(...all.map((p) => p[1])))
  const single = (id: string): Point | undefined => points[id]?.[0]

  const linear = (id: string): LinearSlot | null => {
    const pts = points[id]
    if (!pts || pts.length < 2) return null
    const [a, b] = pts
    const dx = b[0] - a[0]
    const dz = b[2] - a[2]
    let angle = Math.atan2(dz, dx)
    // dirección canónica: no depende del orden en que se hicieron los clics
    if (angle >= Math.PI / 2) angle -= Math.PI
    if (angle < -Math.PI / 2) angle += Math.PI
    return {
      at: [round((a[0] + b[0]) / 2), round((a[2] + b[2]) / 2)],
      y: round((a[1] + b[1]) / 2),
      angle: Math.round(angle * 1000) / 1000,
      length: round(Math.hypot(dx, dz)),
    }
  }

  const cpu = single('cpu_socket')

  return {
    surfaceY,
    cpu: cpu ? { at: [round(cpu[0]), round(cpu[2])] as [number, number], y: round(cpu[1]) } : null,
    ram: [linear('ram_slot_a'), linear('ram_slot_b')],
    m2: linear('m2_slot'),
    pcie: linear('pcie_slot'),
  }
}
