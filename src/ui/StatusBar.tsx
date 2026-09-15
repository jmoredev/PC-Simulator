import { COMPONENT_BY_ID, MOUNTS_BY_STAGE } from '../data/components'
import { STAGES } from '../data/stages'
import { useGameStore } from '../store/useGameStore'

export function StatusBar() {
  const mode = useGameStore((s) => s.mode)
  const phase = useGameStore((s) => s.phase)
  const selectedId = useGameStore((s) => s.selectedId)
  const dragging = useGameStore((s) => s.dragging)
  const hoverMountId = useGameStore((s) => s.hoverMountId)
  const wrongFlash = useGameStore((s) => s.wrongFlash)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const stageHint = STAGES[Math.min(stageIndex, STAGES.length - 1)].hint

  if (phase !== 'building') return null

  let text = stageHint
  let tone = ''

  if (wrongFlash) {
    text = 'Ese no es su sitio. ¡Fíjate bien!'
    tone = 'status-danger'
  } else if (dragging && hoverMountId) {
    const mount = MOUNTS_BY_STAGE[STAGES[stageIndex].id].find((m) => m.id === hoverMountId)
    text = `Suelta aquí: ${mount?.label ?? ''}`
    tone = 'status-ok'
  } else if (dragging) {
    text = 'Lleva la pieza hasta el hueco correcto.'
  } else if (selectedId) {
    const def = COMPONENT_BY_ID[selectedId]
    if (def) {
      if (mode === 'practice') {
        const targets = MOUNTS_BY_STAGE[STAGES[stageIndex].id]
          .filter((m) => m.accepts.includes(def.kind))
          .map((m) => m.label)
          .join(' o ')
        text = `${def.name}: colócala en «${targets}». Arrástrala o haz clic en la zona iluminada.`
      } else {
        text = `${def.name} seleccionado. Arrástralo hasta su sitio.`
      }
      tone = 'status-ok'
    }
  } else if (mode === 'exam') {
    text = 'Modo examen: sin pistas. Arrastra cada pieza a su lugar.'
  }

  return (
    <div className="statusbar">
      <span className="status-dot" />
      <span className={tone}>{text}</span>
    </div>
  )
}
