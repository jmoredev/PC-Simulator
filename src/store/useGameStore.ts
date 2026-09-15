import { create } from 'zustand'
import {
  COMPONENTS,
  COMPONENT_BY_ID,
  MOUNTS_BY_STAGE,
} from '../data/components'
import { STAGES } from '../data/stages'
import type { GameMode, Phase, Stage, StageId } from '../types'

const WRONG_DROP_RADIUS = 0.9

interface State {
  mode: GameMode
  phase: Phase
  stageIndex: number
  selectedId: string | null
  dragging: boolean
  dragPos: [number, number]
  hoverMountId: string | null
  placed: Record<string, string>
  errors: number
  attempts: number
  wrongFlash: string | null
  /** Marca de tiempo del último cambio de fase (para el aviso). */
  stageChangedAt: number
  lastCompletedStage: StageId | null
  startedAt: number
  finishedAt: number | null

  start: (mode: GameMode) => void
  reset: () => void
  backToMenu: () => void
  select: (id: string | null) => void
  beginDrag: (id: string, x: number, z: number) => void
  updateDrag: (x: number, z: number) => void
  cancelDrag: () => void
  endDrag: () => void
  placeInto: (mountId: string) => boolean
  clearWrongFlash: () => void
}

function distanceXZ(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Huecos de la fase actual. */
function mountsOf(stageIndex: number) {
  return MOUNTS_BY_STAGE[STAGES[stageIndex].id]
}

/** ¿Está completa la fase? Devuelve el índice de la siguiente (o -1). */
function stageProgress(placed: Record<string, string>, stageIndex: number) {
  const mounts = mountsOf(stageIndex)
  const done = mounts.filter((m) => placed[m.id]).length
  return { done, total: mounts.length, complete: done === mounts.length }
}

/**
 * Tras colocar una pieza, avanza de fase si se ha terminado la actual.
 * Devuelve los cambios de estado que correspondan.
 */
function advanceAfterPlace(placed: Record<string, string>, stageIndex: number) {
  const { complete } = stageProgress(placed, stageIndex)
  if (!complete) return {}
  const isLast = stageIndex >= STAGES.length - 1
  if (isLast) {
    if (Object.keys(placed).length >= COMPONENTS.length) {
      return { phase: 'finished' as Phase, finishedAt: Date.now() }
    }
    return {}
  }
  return {
    stageIndex: stageIndex + 1,
    selectedId: null,
    hoverMountId: null,
    stageChangedAt: Date.now(),
    lastCompletedStage: STAGES[stageIndex].id,
  }
}

export const useGameStore = create<State>((set, get) => ({
  mode: 'practice',
  phase: 'menu',
  stageIndex: 0,
  selectedId: null,
  dragging: false,
  dragPos: [0, 0],
  hoverMountId: null,
  placed: {},
  errors: 0,
  attempts: 0,
  wrongFlash: null,
  stageChangedAt: 0,
  lastCompletedStage: null,
  startedAt: 0,
  finishedAt: null,

  start: (mode) =>
    set({
      mode,
      phase: 'building',
      stageIndex: 0,
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      placed: {},
      errors: 0,
      attempts: 0,
      wrongFlash: null,
      stageChangedAt: 0,
      lastCompletedStage: null,
      startedAt: Date.now(),
      finishedAt: null,
    }),

  reset: () =>
    set((s) => ({
      phase: 'building',
      stageIndex: 0,
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      placed: {},
      errors: 0,
      attempts: 0,
      wrongFlash: null,
      stageChangedAt: 0,
      lastCompletedStage: null,
      startedAt: Date.now(),
      finishedAt: null,
      mode: s.mode,
    })),

  backToMenu: () =>
    set({ phase: 'menu', stageIndex: 0, selectedId: null, dragging: false }),

  select: (id) => set({ selectedId: id }),

  beginDrag: (id, x, z) =>
    set({ selectedId: id, dragging: true, dragPos: [x, z], hoverMountId: null }),

  updateDrag: (x, z) => {
    const { selectedId, placed, stageIndex } = get()
    if (!selectedId) return
    const def = COMPONENT_BY_ID[selectedId]
    if (!def) return
    let hover: string | null = null
    let best = Infinity
    for (const mount of mountsOf(stageIndex)) {
      if (placed[mount.id]) continue
      if (!mount.accepts.includes(def.kind)) continue
      const d = distanceXZ([x, z], [mount.position[0], mount.position[2]])
      if (d <= mount.snapRadius && d < best) {
        best = d
        hover = mount.id
      }
    }
    set({ dragPos: [x, z], hoverMountId: hover })
  },

  cancelDrag: () => set({ dragging: false, hoverMountId: null, wrongFlash: null }),

  endDrag: () => {
    const { selectedId, dragPos, placed, mode, attempts, stageIndex } = get()
    if (!selectedId) return
    const def = COMPONENT_BY_ID[selectedId]
    if (!def) return

    const candidates = mountsOf(stageIndex)
      .filter((m) => !placed[m.id] && m.accepts.includes(def.kind))
      .map((m) => ({
        mount: m,
        d: distanceXZ(dragPos, [m.position[0], m.position[2]]),
      }))
      .filter((c) => c.d <= c.mount.snapRadius)
      .sort((a, b) => a.d - b.d)

    if (candidates.length > 0) {
      const target = candidates[0].mount
      const nextPlaced = { ...placed, [target.id]: selectedId }
      set({
        placed: nextPlaced,
        selectedId: null,
        dragging: false,
        hoverMountId: null,
        wrongFlash: null,
        attempts: attempts + 1,
        ...advanceAfterPlace(nextPlaced, stageIndex),
      })
      return
    }

    const wrong = mountsOf(stageIndex)
      .filter((m) => !placed[m.id] && !m.accepts.includes(def.kind))
      .map((m) => ({ mount: m, d: distanceXZ(dragPos, [m.position[0], m.position[2]]) }))
      .filter((c) => c.d <= WRONG_DROP_RADIUS)
      .sort((a, b) => a.d - b.d)

    set({
      dragging: false,
      hoverMountId: null,
      attempts: attempts + 1,
      errors: mode === 'exam' && wrong.length > 0 ? get().errors + 1 : get().errors,
      wrongFlash: wrong.length > 0 ? wrong[0].mount.id : null,
    })
  },

  placeInto: (mountId) => {
    const { selectedId, placed, stageIndex } = get()
    if (!selectedId) return false
    const def = COMPONENT_BY_ID[selectedId]
    const mount = mountsOf(stageIndex).find((m) => m.id === mountId)
    if (!def || !mount) return false
    if (placed[mountId] || !mount.accepts.includes(def.kind)) return false

    const nextPlaced = { ...placed, [mountId]: selectedId }
    set({
      placed: nextPlaced,
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      wrongFlash: null,
      attempts: get().attempts + 1,
      ...advanceAfterPlace(nextPlaced, stageIndex),
    })
    return true
  },

  clearWrongFlash: () => set({ wrongFlash: null }),
}))

/** Fase actual. */
export function useCurrentStage(): Stage {
  const index = useGameStore((s) => s.stageIndex)
  return STAGES[Math.min(index, STAGES.length - 1)]
}

export function currentStageProgress(placed: Record<string, string>, stageIndex: number) {
  return stageProgress(placed, stageIndex)
}
