import type { ComponentKind, Vec3 } from '../types'

/**
 * Hueco de la fase 1 ya calibrado sobre el modelo de una placa concreta.
 * Solo hay que indicar lo que cambia respecto al hueco por defecto.
 */
export interface BoardMount {
  id: string
  position: Vec3
  size: [number, number]
  angle?: number
}

/** Puerto del panel trasero marcado en el modelo. */
export interface BoardPort {
  kind: ComponentKind
  /** Punto del puerto en el modelo (coordenadas de la fase 1). */
  point: Vec3
}

/** Chapa I/O trasera marcada por sus dos esquinas. */
export interface BoardRear {
  at: [number, number]
  y: number
  angle: number
  length: number
}

/**
 * Placa base registrada. El `<id>` es el nombre del archivo del modelo
 * (`models-originales/placas/<id>.glb`, servido sin comprimir) y lo que se
 * pasa en la URL para elegirla: `?board=<id>`.
 */
export interface BoardDef {
  id: string
  name: string
  /** Dimensión máxima del modelo (unidades) para el auto-fit. */
  size: number
  /** Dimensiones del modelo sin escalar [x, y, z], tal cual salen del .glb. */
  rawSize: Vec3
  /** Giro [x, y, z] para dejar el modelo plano con Y hacia arriba. */
  rotation: Vec3
  /** Ruta explícita del modelo (por defecto, la de `models-originales/placas`). */
  model?: string
  /** Huecos de la fase 1 calibrados para este modelo. */
  mounts?: BoardMount[]
  /** Chapa trasera calibrada (centro, ángulo y longitud). */
  rear?: BoardRear
  /** Puertos traseros calibrados, en el orden real del panel. */
  ports?: BoardPort[]
}

export const BOARDS: BoardDef[] = [
  {
    id: 'motherboard-01',
    name: 'ASUS PRIME H510M-K',
    size: 2.26,
    rawSize: [4.671, 0.843, 5.014],
    rotation: [0, 0, 0],
    mounts: [
      { id: 'cpu_socket', position: [0.106, 0.1, -0.247], size: [0.62, 0.62] },
      { id: 'ram_slot_a', position: [0.65, 0.09, -0.268], size: [1.27, 0.3], angle: 1.566 },
      { id: 'ram_slot_b', position: [0.74, 0.09, -0.284], size: [1.23, 0.3], angle: 1.558 },
      { id: 'm2_slot', position: [-0.241, 0.06, 0.324], size: [0.8, 0.3], angle: -0.022 },
      { id: 'pcie_slot', position: [-0.08, 0.1, 0.516], size: [1.6, 0.5], angle: 0.002 },
    ],
    rear: { at: [-1.011, -0.357], y: 0.187, angle: -1.568, length: 1.502 },
    ports: [
      { kind: 'ps2', point: [-1.009, 0.304, -1.031] },
      { kind: 'usb', point: [-0.95, 0.159, -1.039] },
      { kind: 'usb', point: [-0.961, 0.076, -1.047] },
      { kind: 'hdmi', point: [-0.928, 0.043, -0.689] },
      { kind: 'vga', point: [-1.051, 0.105, -0.347] },
      { kind: 'usb', point: [-0.942, 0.133, -0.043] },
      { kind: 'usb', point: [-0.96, 0.048, -0.044] },
      { kind: 'usb', point: [-0.945, 0.133, 0.169] },
      { kind: 'usb', point: [-0.959, 0.048, 0.173] },
      { kind: 'lan', point: [-0.926, 0.233, 0.176] },
      { kind: 'audio-in', point: [-1, 0.294, 0.356] },
      { kind: 'audio-out', point: [-0.993, 0.184, 0.356] },
      { kind: 'audio-mic', point: [-1.008, 0.079, 0.361] },
    ],
  },
  {
    id: 'motherboard-02',
    name: 'Gigabyte GA-H110M',
    size: 2.26,
    rawSize: [170.957, 42.3, 181.8],
    rotation: [0, 0, 0],
  },
  {
    id: 'motherboard-03',
    name: 'ASUS Z170-P',
    size: 3.05,
    rawSize: [8.527, 1.525, 11.388],
    rotation: [0, 0, 0],
  },
  {
    id: 'motherboard-04',
    name: 'Placa 04 (sin texturas)',
    size: 3.05,
    rawSize: [4.259, 0.756, 4.8],
    rotation: [0, 0, 0],
  },
]

export const DEFAULT_BOARD_ID = BOARDS[0].id

/** Ruta con la que el servidor de desarrollo sirve el modelo sin comprimir. */
export function boardModelUrl(board: BoardDef): string {
  return board.model ?? `/assets/models/placas/${board.id}.glb`
}

function boardIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('board')
  return id && BOARDS.some((b) => b.id === id) ? id : null
}

/** Placa activa: la de `?board=<id>` o la primera del registro. */
export const BOARD_ID = boardIdFromUrl() ?? DEFAULT_BOARD_ID

export const BOARD: BoardDef = BOARDS.find((b) => b.id === BOARD_ID) ?? BOARDS[0]
