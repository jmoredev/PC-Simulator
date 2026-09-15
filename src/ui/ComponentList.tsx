import { Fragment } from 'react'
import { COMPONENTS_BY_STAGE } from '../data/components'
import { STAGES } from '../data/stages'
import { useGameStore } from '../store/useGameStore'
import type { ComponentDef } from '../types'

interface Props {
  onInspect: (id: string | null) => void
}

export function ComponentList({ onInspect }: Props) {
  const placed = useGameStore((s) => s.placed)
  const selectedId = useGameStore((s) => s.selectedId)
  const stageIndex = useGameStore((s) => s.stageIndex)
  const select = useGameStore((s) => s.select)
  const placedIds = new Set(Object.values(placed))
  const currentStage = STAGES[Math.min(stageIndex, STAGES.length - 1)].id

  const renderGroup = (title: string, items: ComponentDef[], active: boolean) => (
    <>
      <div className="comp-cat">{title}</div>
      {items.map((def) => {
        const isPlaced = placedIds.has(def.id)
        const isActive = selectedId === def.id
        return (
          <button
            key={def.id}
            className={`comp-item${isActive ? ' comp-item--active' : ''}${
              isPlaced ? ' comp-item--placed' : ''
            }`}
            onMouseEnter={() => onInspect(def.id)}
            onMouseLeave={() => onInspect(null)}
            onClick={() => !isPlaced && active && select(isActive ? null : def.id)}
          >
            <span className="comp-dot" style={{ background: def.color }} />
            <span className="name">{def.name}</span>
            {isPlaced && <span className="tick">✓</span>}
          </button>
        )
      })}
    </>
  )

  return (
    <div className="panel panel--left">
      <div className="panel-head">
        <h2>Fases del montaje</h2>
      </div>
      <div className="panel-body">
        {STAGES.map((stage) => (
          <Fragment key={stage.id}>
            <div className={stage.id === currentStage ? undefined : 'comp-group--dim'}>
              {renderGroup(
                `${stage.index + 1}. ${stage.title}`,
                COMPONENTS_BY_STAGE[stage.id],
                stage.id === currentStage,
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
