import { connectorImageUrl } from '../data/assets'
import { COMPONENTS_BY_STAGE } from '../data/components'
import { STAGES } from '../data/stages'
import { placedInStage, useGameStore } from '../store/useGameStore'

/**
 * Barra inferior con los cables de la fase de conectores. Cada cable se puede
 * arrastrar hasta su puerto o seleccionar y luego clicar en el puerto.
 */
export function ConnectorBar() {
  const placed = useGameStore((s) => s.placed)
  const selectedId = useGameStore((s) => s.selectedId)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const select = useGameStore((s) => s.select)
  const beginDrag = useGameStore((s) => s.beginDrag)

  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)]
  const placedIds = placedInStage(placed, stageIndex)
  const items = COMPONENTS_BY_STAGE[stage.id].filter((def) => !placedIds.has(def.id))

  return (
    <div className="connbar">
      <div className="connbar__items">
        {items.map((def) => {
          const thumb = connectorImageUrl(def.kind)
          const active = selectedId === def.id
          return (
            <button
              key={def.id}
              className={`connbar__item${active ? ' connbar__item--active' : ''}`}
              title={`${def.name}: arrástralo hasta su puerto`}
              onPointerDown={(event) => {
                // Solo empieza el arrastre si el puntero se mueve: así un clic
                // normal selecciona el cable sin lanzar un arrastre en falso.
                const startX = event.clientX
                const startY = event.clientY
                const onMove = (move: PointerEvent) => {
                  if (Math.hypot(move.clientX - startX, move.clientY - startY) < 6) return
                  stop()
                  beginDrag(def.id, 100, 100)
                }
                const onUp = () => stop()
                const stop = () => {
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                }
                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
              }}
              onClick={() => select(active ? null : def.id)}
            >
              {thumb ? (
                <img src={thumb} alt="" draggable={false} />
              ) : (
                <span className="connbar__dot" style={{ background: def.color }} />
              )}
              <span>{def.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
