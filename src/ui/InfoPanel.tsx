import { COMPONENT_BY_ID, MOUNTS } from '../data/components'
import type { GameMode } from '../types'

interface Props {
  inspectedId: string | null
  selectedId: string | null
  mode: GameMode
}

export function InfoPanel({ inspectedId, selectedId, mode }: Props) {
  const activeId = inspectedId ?? selectedId
  const def = activeId ? COMPONENT_BY_ID[activeId] : null

  return (
    <div className="panel panel--right">
      <div className="panel-head">
        <h2>Ficha del componente</h2>
      </div>
      {!def ? (
        <div className="info-empty">
          Pasa el ratón por la lista o coge una pieza para ver qué es y para qué
          sirve.
          {mode === 'practice' && (
            <>
              <br />
              <br />
              En <b>modo práctica</b>, el hueco correcto se ilumina en verde.
            </>
          )}
        </div>
      ) : (
        <div className="info-body">
          <div className="info-title">
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: def.color,
                display: 'inline-block',
              }}
            />
            <h3>{def.name}</h3>
          </div>
          <div className="info-sub">{def.subtitle}</div>
          <p>{def.description}</p>
          {def.funFact && <div className="info-fact">¿Sabías que…? {def.funFact}</div>}
          {mode === 'practice' && def.mountId && (
            <div className="info-target">
              Dónde va: <b>{MOUNTS.find((m) => m.id === def.mountId)?.label}</b>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
