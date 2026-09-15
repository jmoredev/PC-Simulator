import { useEffect, useState } from 'react'
import { useCurrentStage, useGameStore } from '../store/useGameStore'

/** Aviso central que aparece al completar una fase y pasar a la siguiente. */
export function StageBanner() {
  const stageChangedAt = useGameStore((s) => s.stageChangedAt)
  const stage = useCurrentStage()
  const [dismissedAt, setDismissedAt] = useState(0)

  const visible = stageChangedAt > 0 && stageChangedAt > dismissedAt

  useEffect(() => {
    if (!visible) return
    const id = window.setTimeout(() => setDismissedAt(stageChangedAt), 2800)
    return () => window.clearTimeout(id)
  }, [visible, stageChangedAt])

  if (!visible) return null

  return (
    <div className="stage-banner">
      <span className="stage-banner__kicker">Fase completada</span>
      <h2>
        {stage.index + 1}. {stage.title}
      </h2>
      <p>{stage.hint}</p>
    </div>
  )
}
