import { create } from 'zustand'
import { BOARD_SLOTS, PORT_SLOT, type Point, type PortMark } from '../calibration'
import type { ComponentKind } from '../types'

const STORAGE_KEY = 'pc-sim-calibration'

interface Stored {
  points: Record<string, Point[]>
  ports: PortMark[]
}

interface State extends Stored {
  /** Hueco que se está marcando (null = ninguna). */
  armed: string | null
  /** Tipo de conector que se asigna al siguiente puerto marcado. */
  portKind: ComponentKind
  arm: (id: string | null) => void
  setPortKind: (kind: ComponentKind) => void
  setPoint: (id: string, point: Point) => void
  removeLastPort: () => void
  clear: () => void
  load: (data: Stored) => void
}

function readStored(): Stored {
  if (typeof localStorage === 'undefined') return { points: {}, ports: [] }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (raw && typeof raw === 'object' && 'points' in raw) {
      return { points: raw.points ?? {}, ports: raw.ports ?? [] }
    }
    return { points: raw ?? {}, ports: [] }
  } catch {
    return { points: {}, ports: [] }
  }
}

function persist(data: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // sin persistencia disponible
  }
}

const needed = (id: string) =>
  id === PORT_SLOT ? 1 : (BOARD_SLOTS.find((s) => s.id === id)?.points ?? 1)

export const useCalibrationStore = create<State>((set, get) => ({
  ...readStored(),
  armed: null,
  portKind: 'usb',

  arm: (id) => {
    if (id === null) {
      set({ armed: null })
      return
    }
    // al volver a armar una ranura se empieza de cero
    const points = { ...get().points }
    delete points[id]
    persist({ points, ports: get().ports })
    set({ points, armed: id })
  },

  setPortKind: (kind) => set({ portKind: kind }),

  setPoint: (id, point) => {
    if (id === PORT_SLOT) {
      const ports = [...get().ports, { kind: get().portKind, point }]
      persist({ points: get().points, ports })
      set({ ports })
      return
    }
    const current = get().points[id] ?? []
    const next = [...current, point].slice(0, needed(id))
    const points = { ...get().points, [id]: next }
    persist({ points, ports: get().ports })
    set({ points, armed: next.length < needed(id) ? id : null })
  },

  removeLastPort: () => {
    const ports = get().ports.slice(0, -1)
    persist({ points: get().points, ports })
    set({ ports })
  },

  clear: () => {
    persist({ points: {}, ports: [] })
    set({ points: {}, ports: [], armed: null })
  },

  load: (data) => {
    persist(data)
    set({ ...data, armed: null })
  },
}))
