import { create } from 'zustand'
import {
  COMPONENT_BY_ID,
  MOUNTS_BY_STAGE,
  STAGE_STEPS,
  TOTAL_STEPS,
  shuffleLayout,
  stageComponents,
} from '../data/components'
import { STAGES } from '../data/stages'
import type { GameMode, MountPoint, Phase, Stage, StageId, Vec3 } from '../types'

/** Un fallo del examen: la pieza que se arrastró y el hueco donde se soltó. */
export interface ExamMiss {
  componentId: string
  mountId: string
}

/**
 * Pieza que quedó sin colocar al rendirse, con la fase en la que faltaba: la
 * misma pieza puede faltar en dos fases (identificarla y montarla), y el resumen
 * tiene que poder decirlo sin repetirse sin sentido.
 */
export interface UnplacedPiece {
  stage: StageId
  componentId: string
}

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
  /** Piezas que se dejaron sin colocar al rendirse (solo examen). */
  forfeited: number
  wrongFlash: string | null
  /** Fallos del examen, en orden, para el resumen final. */
  misses: ExamMiss[]
  /** Piezas que quedaron sin colocar al rendirse, para el resumen final. */
  unplaced: UnplacedPiece[]
  /** Marca de tiempo del último cambio de fase (para el aviso). */
  stageChangedAt: number
  lastCompletedStage: StageId | null
  /** Cómo se llegó a la fase actual: completando la anterior, saltándola o empezando. */
  lastAdvance: 'completed' | 'skipped' | null
  startedAt: number
  finishedAt: number | null

  start: (mode: GameMode) => void
  reset: () => void
  backToMenu: () => void
  /** Salta a la siguiente fase (solo en práctica). */
  skipStage: () => void
  /** Rendirse de la fase actual y descontar lo que falte (solo examen). */
  giveUp: () => void
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
 * ¿Está completa la fase? Se cuentan las piezas colocadas **en esta fase**
 * (no las de fases anteriores: la misma pieza puede colocarse en varias).
 */
function stageProgress(placed: Record<string, string>, stageIndex: number) {
  const ids = new Set(mountsOf(stageIndex).map((m) => m.id))
  const filled = Object.keys(placed).filter((mountId) => ids.has(mountId)).length
  const total = STAGE_STEPS[STAGES[stageIndex].id]
  return { done: Math.min(filled, total), total, complete: filled >= total }
}

/** Piezas (ids) ya colocadas en la fase indicada. */
export function placedInStage(
  placed: Record<string, string>,
  stageIndex: number,
): Set<string> {
  const ids = new Set(mountsOf(stageIndex).map((m) => m.id))
  return new Set(
    Object.entries(placed)
      .filter(([mountId]) => ids.has(mountId))
      .map(([, componentId]) => componentId),
  )
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
    return { phase: 'finished' as Phase, finishedAt: Date.now() }
  }
  return {
    stageIndex: stageIndex + 1,
    selectedId: null,
    hoverMountId: null,
    stageChangedAt: Date.now(),
    lastCompletedStage: STAGES[stageIndex].id,
    lastAdvance: 'completed' as const,
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
  forfeited: 0,
  wrongFlash: null,
  misses: [],
  unplaced: [],
  stageChangedAt: 0,
  lastCompletedStage: null,
  lastAdvance: null,
  startedAt: 0,
  finishedAt: null,

  start: (mode) => {
    shuffleLayout()
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
      forfeited: 0,
      wrongFlash: null,
      misses: [],
      unplaced: [],
      stageChangedAt: 0,
      lastCompletedStage: null,
      lastAdvance: null,
      startedAt: Date.now(),
      finishedAt: null,
    })
  },

  reset: () => {
    shuffleLayout()
    set((s) => ({
      phase: 'building',
      stageIndex: 0,
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      placed: {},
      errors: 0,
      attempts: 0,
      forfeited: 0,
      wrongFlash: null,
      misses: [],
      unplaced: [],
      stageChangedAt: 0,
      lastCompletedStage: null,
      lastAdvance: null,
      startedAt: Date.now(),
      finishedAt: null,
      mode: s.mode,
    }))
  },

  backToMenu: () =>
    set({ phase: 'menu', stageIndex: 0, selectedId: null, dragging: false }),

  skipStage: () => {
    const { mode, phase, finishedAt } = get()
    // Guardia silenciosa, espejo de la de giveUp: «solo práctica» (decisión 40)
    // se cumple en el estado, no solo en el botón que la interfaz oculta.
    if (mode !== 'practice' || phase !== 'building' || finishedAt !== null) return
    const { stageIndex } = get()
    if (stageIndex >= STAGES.length - 1) return
    set({
      stageIndex: stageIndex + 1,
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      wrongFlash: null,
      stageChangedAt: Date.now(),
      lastCompletedStage: STAGES[stageIndex].id,
      lastAdvance: 'skipped' as const,
    })
  },

  giveUp: () => {
    const { mode, phase, finishedAt, stageChangedAt } = get()
    // El cartel de fase es pointer-events: none y la barra superior sigue
    // montada, así que el segundo clic de un doble clic llega otra vez a
    // «Rendirse» y rendiría dos fases (en la última, descontaría dos veces
    // lo mismo). Guardia silenciosa: sin confirmación visible.
    if (mode !== 'exam' || phase !== 'building' || finishedAt !== null) return
    if (Date.now() - stageChangedAt < 500) return
    const { placed, stageIndex, forfeited, unplaced } = get()
    const stage = STAGES[stageIndex]
    const done = placedInStage(placed, stageIndex)
    // La lista de lo que falta y su recuento salen de la misma fuente, así que no
    // pueden discrepar.
    const remaining = stageComponents(stage.id).filter((c) => !done.has(c.id))
    const isLast = stageIndex >= STAGES.length - 1
    set({
      forfeited: forfeited + remaining.length,
      unplaced: [
        ...unplaced,
        ...remaining.map((c) => ({ stage: stage.id, componentId: c.id })),
      ],
      selectedId: null,
      dragging: false,
      hoverMountId: null,
      wrongFlash: null,
      ...(isLast
        ? { phase: 'finished' as Phase, finishedAt: Date.now() }
        : {
            stageIndex: stageIndex + 1,
            stageChangedAt: Date.now(),
            lastCompletedStage: stage.id,
            lastAdvance: 'skipped' as const,
          }),
    })
  },

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

    const failed = mode === 'exam' && wrong.length > 0
    set({
      dragging: false,
      hoverMountId: null,
      attempts: attempts + 1,
      errors: failed ? get().errors + 1 : get().errors,
      // El resumen final necesita saber qué se falló y dónde, no solo cuántos.
      misses: failed
        ? [...get().misses, { componentId: selectedId, mountId: wrong[0].mount.id }]
        : get().misses,
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

/** Valor en puntos de una colocación (y de un fallo) en el examen. */
export const EXAM_POINT_VALUE = 100 / TOTAL_STEPS

/** Nota del examen: 100 − valor × (fallos + piezas rendidas), con suelo en 0. */
export function examScore(errors: number, forfeited: number): number {
  return Math.max(0, Math.round(100 - EXAM_POINT_VALUE * (errors + forfeited)))
}

/** Color de la nota: rojo < 50, amarillo 50–<70, verde ≥ 70. */
export function scoreColor(score: number): string {
  if (score < 50) return '#f87171'
  if (score < 70) return '#facc15'
  return '#34d399'
}
