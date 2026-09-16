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
      { id: 'cpu_socket', position: [0.102, 0.1, -0.267], size: [0.62, 0.62] },
      { id: 'ram_slot_a', position: [0.649, 0.048, -0.288], size: [1.24, 0.3], angle: -1.568 },
      { id: 'ram_slot_b', position: [0.744, 0.058, -0.303], size: [1.23, 0.3], angle: -1.569 },
      { id: 'm2_slot', position: [-0.24, 0.045, 0.318], size: [0.76, 0.3], angle: -0.045 },
      { id: 'pcie_slot', position: [-0.084, 0.05, 0.498], size: [1.6, 0.5], angle: 0 },
    ],
    rear: { at: [-1.011, -0.355], y: 0.232, angle: -1.568, length: 1.507 },
    ports: [
      { kind: 'ps2', point: [-1.009, 0.3, -1.03] },
      { kind: 'usb', point: [-0.983, 0.159, -1.026] },
      { kind: 'usb', point: [-1.007, 0.076, -1.035] },
      { kind: 'hdmi', point: [-0.945, 0.043, -0.704] },
      { kind: 'vga', point: [-1.051, 0.103, -0.335] },
      { kind: 'usb', point: [-0.963, 0.133, -0.048] },
      { kind: 'usb', point: [-0.983, 0.048, -0.059] },
      { kind: 'usb', point: [-0.979, 0.133, 0.153] },
      { kind: 'usb', point: [-0.98, 0.048, 0.159] },
      { kind: 'lan', point: [-0.899, 0.228, 0.173] },
      { kind: 'audio-in', point: [-1.001, 0.298, 0.362] },
      { kind: 'audio-out', point: [-1.008, 0.183, 0.352] },
      { kind: 'audio-mic', point: [-1.002, 0.073, 0.347] },
    ],
  },
  {
    id: 'motherboard-02',
    name: 'ASUS Z170-P',
    size: 3.05,
    rawSize: [8.527, 1.525, 11.388],
    rotation: [0, 0, 0],
    mounts: [
      { id: 'cpu_socket', position: [0.037, 0.12, -0.657], size: [0.62, 0.62] },
      { id: 'ram_slot_a', position: [0.668, 0.121, -0.669], size: [1.26, 0.3], angle: -1.561 },
      { id: 'ram_slot_b', position: [0.857, 0.121, -0.694], size: [1.21, 0.3], angle: 1.557 },
      { id: 'm2_slot', position: [0.027, 0.075, 0.109], size: [0.75, 0.3], angle: -0.003 },
      { id: 'pcie_slot', position: [-0.155, 0.168, 0.922], size: [1.6, 0.5], angle: -0.007 },
    ],
    rear: { at: [-1.075, -0.712], y: 0.196, angle: -1.569, length: 1.457 },
    ports: [
      { kind: 'ps2', point: [-1.075, 0.293, -1.364] },
      { kind: 'ps2', point: [-1.076, 0.135, -1.388] },
      { kind: 'dvi', point: [-1.132, 0.134, -1.118] },
      { kind: 'hdmi', point: [-1.06, 0.093, -0.803] },
      { kind: 'usb', point: [-1.072, 0.167, -0.402] },
      { kind: 'usb', point: [-1.07, 0.087, -0.394] },
      { kind: 'usb', point: [-1.067, 0.166, -0.203] },
      { kind: 'usb', point: [-1.07, 0.081, -0.203] },
      { kind: 'lan', point: [-1.047, 0.287, -0.191] },
      { kind: 'audio-in', point: [-1.107, 0.334, -0.012] },
      { kind: 'audio-out', point: [-1.108, 0.221, -0.016] },
      { kind: 'audio-mic', point: [-1.107, 0.113, -0.015] },
    ],
  },
  {
    id: 'motherboard-03',
    name: 'Gigabyte H310M (modelo con foto)',
    size: 3.05,
    rawSize: [4.259, 0.756, 4.8],
    rotation: [0, 0, 0],
    mounts: [
      { id: 'cpu_socket', position: [0.284, 0.1, -0.44], size: [0.62, 0.62] },
      { id: 'ram_slot_a', position: [0.856, 0.113, -0.504], size: [1.5, 0.3], angle: 1.559 },
      { id: 'ram_slot_b', position: [0.976, 0.051, -0.511], size: [1.49, 0.3], angle: -1.569 },
      { id: 'm2_slot', position: [0.248, 0.02, 0.522], size: [0.92, 0.3], angle: 0.032 },
      { id: 'pcie_slot', position: [-0.078, 0.103, 0.812], size: [1.6, 0.5], angle: -0.003 },
    ],
    rear: { at: [-1.271, -0.516], y: 0.215, angle: 1.563, length: 1.922 },
    ports: [
      { kind: 'ps2', point: [-1.27, 0.29, -1.427] },
      { kind: 'ps2', point: [-1.27, 0.08, -1.443] },
      { kind: 'dvi', point: [-1.332, 0.068, -1.08] },
      { kind: 'vga', point: [-1.351, 0.351, -1.045] },
      { kind: 'hdmi', point: [-1.209, 0.02, -0.655] },
      { kind: 'usb', point: [-1.251, 0.178, -0.341] },
      { kind: 'usb', point: [-1.181, 0.016, -0.351] },
      { kind: 'usb', point: [-1.186, 0.142, -0.072] },
      { kind: 'usb', point: [-1.171, 0.016, -0.096] },
      { kind: 'usb', point: [-1.217, 0.142, 0.161] },
      { kind: 'usb', point: [-1.209, 0.016, 0.145] },
      { kind: 'lan', point: [-1.15, 0.254, 0.178] },
      { kind: 'audio-in', point: [-1.274, 0.363, 0.391] },
      { kind: 'audio-out', point: [-1.269, 0.217, 0.382] },
      { kind: 'audio-mic', point: [-1.246, 0.075, 0.388] },
    ],
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
