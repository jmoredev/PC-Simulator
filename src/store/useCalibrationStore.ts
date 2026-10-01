import { create } from 'zustand'
import {
  BOARD_SLOTS,
  PORT_SLOT,
  type CalibrationTab,
  type Point,
  type PortMark,
  type RotationAxis,
} from '../calibration'
import type { ComponentKind, Vec3 } from '../types'

const STORAGE_KEY = 'pc-sim-calibration'
const ROTATIONS_KEY = 'pc-sim-rotations'

const round3 = (v: number) => Math.round(v * 1000) / 1000

interface Stored {
  points: Record<string, Point[]>
  ports: PortMark[]
}

interface RotationsStored {
  tab: CalibrationTab
  rotations: Record<string, Vec3>
  selectedTarget: string | null
}

const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

// Un valor corrupto en localStorage (p. ej. {"rotations":{"ssd":1}}) llegaba
// al .map() de RotationCalibration y en blanco el panel entero.
function isRotationMap(v: unknown): v is Record<string, Vec3> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  return Object.values(v).every(isVec3)
}

interface State extends Stored {
  /** Hueco que se está marcando (null = ninguna). */
  armed: string | null
  /** Tipo de conector que se asigna al siguiente puerto marcado. */
  portKind: ComponentKind
  /** Pestaña activa del calibrador. */
  tab: CalibrationTab
  /** Giros calibrados, indexados por la clave de cada objetivo. */
  rotations: Record<string, Vec3>
  /** Objetivo de la pestaña «Rotaciones» (null = ninguno). */
  selectedTarget: string | null
  arm: (id: string | null) => void
  setPortKind: (kind: ComponentKind) => void
  setPoint: (id: string, point: Point) => void
  removeLastPort: () => void
  clear: () => void
  load: (data: Stored) => void
  setTab: (tab: CalibrationTab) => void
  selectTarget: (key: string | null) => void
  setRotation: (key: string, vec: Vec3) => void
  nudgeRotation: (key: string, axis: RotationAxis, delta: number, base?: Vec3) => void
  resetRotation: (key: string, axis?: RotationAxis) => void
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

function readRotations(): RotationsStored {
  const empty: RotationsStored = { tab: 'positions', rotations: {}, selectedTarget: null }
  if (typeof localStorage === 'undefined') return empty
  try {
    const raw = JSON.parse(localStorage.getItem(ROTATIONS_KEY) ?? '{}')
    if (raw && typeof raw === 'object') {
      return {
        tab: raw.tab === 'rotations' ? 'rotations' : 'positions',
        rotations: isRotationMap(raw.rotations) ? raw.rotations : {},
        selectedTarget: raw.selectedTarget ?? null,
      }
    }
    return empty
  } catch {
    return empty
  }
}

function persistRotations(data: RotationsStored) {
  try {
    localStorage.setItem(ROTATIONS_KEY, JSON.stringify(data))
  } catch {
    // sin persistencia disponible
  }
}

const needed = (id: string) =>
  id === PORT_SLOT ? 1 : (BOARD_SLOTS.find((s) => s.id === id)?.points ?? 1)

export const useCalibrationStore = create<State>((set, get) => {
  const initialRotations = readRotations()

  const writeRotations = (patch: Partial<RotationsStored>) => {
    const next: RotationsStored = {
      tab: get().tab,
      rotations: get().rotations,
      selectedTarget: get().selectedTarget,
      ...patch,
    }
    persistRotations(next)
    return next
  }

  return {
    ...readStored(),
    armed: null,
    portKind: 'usb',
    tab: initialRotations.tab,
    rotations: initialRotations.rotations,
    selectedTarget: initialRotations.selectedTarget,

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

    setTab: (tab) => {
      writeRotations({ tab })
      set({ tab })
    },

    selectTarget: (key) => {
      writeRotations({ selectedTarget: key })
      set({ selectedTarget: key })
    },

    // Siempre un array nuevo: GltfModel memoriza por [scene, target, rotation]
    // y con la misma referencia no recalcularía el ajuste del modelo.
    setRotation: (key, vec) => {
      const rotation: Vec3 = [round3(vec[0]), round3(vec[1]), round3(vec[2])]
      writeRotations({ rotations: { ...get().rotations, [key]: rotation } })
      set({ rotations: { ...get().rotations, [key]: rotation } })
    },

    nudgeRotation: (key, axis, delta, base) => {
      const current = get().rotations[key] ?? base ?? [0, 0, 0]
      const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
      const next: Vec3 = [current[0], current[1], current[2]]
      next[index] = next[index] + delta
      get().setRotation(key, next)
    },

    resetRotation: (key, axis) => {
      const current = get().rotations[key] ?? [0, 0, 0]
      const next: Vec3 = [current[0], current[1], current[2]]
      if (axis) {
        const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
        next[index] = 0
      } else {
        next[0] = 0
        next[1] = 0
        next[2] = 0
      }
      get().setRotation(key, next)
    },
  }
})
