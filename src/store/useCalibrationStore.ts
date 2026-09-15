import { create } from 'zustand'
import { BOARD_SLOTS, type Point } from '../calibration'

const STORAGE_KEY = 'pc-sim-calibration'

interface State {
  /** Ranura que se está marcando (null = ninguna). */
  armed: string | null
  points: Record<string, Point[]>
  arm: (id: string | null) => void
  setPoint: (id: string, point: Point) => void
  clear: () => void
  load: (points: Record<string, Point[]>) => void
}

function readStored(): Record<string, Point[]> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function persist(points: Record<string, Point[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
  } catch {
    // sin persistencia disponible
  }
}

const needed = (id: string) => BOARD_SLOTS.find((s) => s.id === id)?.points ?? 1

export const useCalibrationStore = create<State>((set, get) => ({
  armed: null,
  points: readStored(),

  arm: (id) => {
    if (id === null) {
      set({ armed: null })
      return
    }
    // al volver a armar una ranura se empieza de cero
    const points = { ...get().points }
    delete points[id]
    persist(points)
    set({ points, armed: id })
  },

  setPoint: (id, point) => {
    const current = get().points[id] ?? []
    const next = [...current, point].slice(0, needed(id))
    const points = { ...get().points, [id]: next }
    persist(points)
    set({ points, armed: next.length < needed(id) ? id : null })
  },

  clear: () => {
    persist({})
    set({ points: {}, armed: null })
  },

  load: (points) => {
    persist(points)
    set({ points, armed: null })
  },
}))
