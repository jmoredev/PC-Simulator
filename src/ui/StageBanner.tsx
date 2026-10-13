import { useEffect, useState } from 'react'
import { STAGES } from '../data/stages'
import { useCurrentStage, useGameStore } from '../store/useGameStore'

/**
 * Cartel central de la fase: al **empezarla** dice qué hay que hacer en ella y,
 * cuando se llega a ella completando la anterior, lo avisa («Fase completada»).
 *
 * En examen no se monta: el examen no da explicaciones (decisión 51). El cartel
 * no intercepta clics (`pointer-events: none` en la hoja de estilos), así que
 * puede estar visible mientras se arrastra.
 */
export function StageBanner() {
  const mode = useGameStore((s) => s.mode)
  const phase = useGameStore((s) => s.phase)
  const startedAt = useGameStore((s) => s.startedAt)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const lastAdvance = useGameStore((s) => s.lastAdvance)
  const stage = useCurrentStage()
  const [dismissedKey, setDismissedKey] = useState('')

  // La clave lleva la partida y la fase: el cartel sale al empezar cada fase
  // (también la primera, al arrancar o al reiniciar) y no se repite mientras no
  // cambie ninguna de las dos.
  const key = `${startedAt}-${stageIndex}`
  const visible = phase === 'building' && mode === 'practice' && key !== dismissedKey

  useEffect(() => {
    if (!visible) return
    const id = window.setTimeout(() => setDismissedKey(key), 3600)
    return () => window.clearTimeout(id)
  }, [visible, key])

  if (!visible) return null

  return (
    <div className="stage-banner">
      <span className="stage-banner__kicker">
        {lastAdvance === 'completed' ? 'Fase completada' : `Fase ${stage.index + 1} de ${STAGES.length}`}
      </span>
      <h2>
        {stage.index + 1}. {stage.title}
      </h2>
      <p>{stage.hint}</p>
    </div>
  )
}
