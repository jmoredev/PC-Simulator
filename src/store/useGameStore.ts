import { create } from 'zustand'
import {
  COMPONENTS_BY_STAGE,
  COMPONENT_BY_ID,
  MOUNTS_BY_STAGE,
  TOTAL_STEPS,
} from '../data/components'
import { STAGES } from '../data/stages'
import type { GameMode, MountPoint, Phase, Stage, StageId, Vec3 } from '../types'

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
  beginDrag: (id: string, a: number, b: number) => void
  updateDrag: (a: number, b: number) => void
  cancelDrag: () => void
  endDrag: () => void
  placeInto: (mountId: string) => boolean
  clearWrongFlash: () => void
}

/**
 * Coordenadas del plano de arrastre: en la fase de conectores la chapa está
 * de frente (se juega en el plano YZ) y en el resto sobre el banco (XZ).
 */
function coordsOnPlan(stage: Stage, p: Vec3): [number, number] {
  return stage.drop.kind === 'vertical' ? [p[1], p[2]] : [p[0], p[2]]
}

function planDistance(stage: Stage, mount: MountPoint, a: number, b: number): number {
  const [ma, mb] = coordsOnPlan(stage, mount.position)
  return Math.hypot(a - ma, b - mb)
}

/** Huecos de la fase actual. */
function mountsOf(stageIndex: number) {
  return MOUNTS_BY_STAGE[STAGES[stageIndex].id]
}

/**
 * ¿Está completa la fase? Cuenta las piezas que hay que colocar (los cables
 * señuelo no cuentan, y puede haber más huecos que cables: p. ej. varios
 * puertos USB que valen indistintamente).
 */
function stageProgress(placed: Record<string, string>, stageIndex: number) {
  const defs = COMPONENTS_BY_STAGE[STAGES[stageIndex].id].filter((d) => !d.decoy)
  const placedIds = new Set(Object.values(placed))
  const done = defs.filter((def) => placedIds.has(def.id)).length
  return { done, total: defs.length, complete: done === defs.length }
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
    if (Object.keys(placed).length >= TOTAL_STEPS) {
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

  beginDrag: (id, a, b) =>
    set({ selectedId: id, dragging: true, dragPos: [a, b], hoverMountId: null }),

  updateDrag: (a, b) => {
    const { selectedId, placed, stageIndex } = get()
    if (!selectedId) return
    const def = COMPONENT_BY_ID[selectedId]
    if (!def) return
    const stage = STAGES[stageIndex]
    let hover: string | null = null
    let best = Infinity
    for (const mount of mountsOf(stageIndex)) {
      if (placed[mount.id]) continue
      if (!mount.accepts.includes(def.kind)) continue
      const d = planDistance(stage, mount, a, b)
      if (d <= mount.snapRadius && d < best) {
        best = d
        hover = mount.id
      }
    }
    set({ dragPos: [a, b], hoverMountId: hover })
  },

  cancelDrag: () => set({ dragging: false, hoverMountId: null, wrongFlash: null }),

  endDrag: () => {
    const { selectedId, dragPos, placed, mode, attempts, stageIndex } = get()
    if (!selectedId) return
    const def = COMPONENT_BY_ID[selectedId]
    if (!def) return
    const stage = STAGES[stageIndex]

    const candidates = mountsOf(stageIndex)
      .filter((m) => !placed[m.id] && m.accepts.includes(def.kind))
      .map((m) => ({ mount: m, d: planDistance(stage, m, dragPos[0], dragPos[1]) }))
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
      .map((m) => ({ mount: m, d: planDistance(stage, m, dragPos[0], dragPos[1]) }))
      .filter((c) => c.d <= stage.drop.wrongRadius)
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
