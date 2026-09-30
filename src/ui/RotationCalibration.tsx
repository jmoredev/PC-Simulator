import { useState } from 'react'
import { type RotationAxis } from '../calibration'
import { ROTATION_TARGETS, rotationTargetModel, type RotationTarget } from '../data/components'
import { useCalibrationStore } from '../store/useCalibrationStore'
import type { Vec3 } from '../types'

const AXES: { axis: RotationAxis; label: string }[] = [
  { axis: 'x', label: 'X' },
  { axis: 'y', label: 'Y' },
  { axis: 'z', label: 'Z' },
]

const NUDGES = [-90, -5, 5, 90]

const DEG = 180 / Math.PI

const round3 = (v: number) => Math.round(v * 1000) / 1000

const axisIndex = (axis: RotationAxis) => (axis === 'x' ? 0 : axis === 'y' ? 1 : 2)

function snippetLine(target: RotationTarget, rotation: Vec3): string {
  const triplet = `[${rotation.map(round3).join(', ')}]`
  if (target.board) return `// boards.ts — ${target.defId}\nrotation: ${triplet},`
  if (target.model) return `{ model: '${target.model}', rotation: ${triplet} },`
  return `// components.ts — ${target.defId}\nrotation: ${triplet},`
}

export function RotationCalibration() {
  const rotations = useCalibrationStore((s) => s.rotations)
  const selectedTarget = useCalibrationStore((s) => s.selectedTarget)
  const selectTarget = useCalibrationStore((s) => s.selectTarget)
  const nudgeRotation = useCalibrationStore((s) => s.nudgeRotation)
  const resetRotation = useCalibrationStore((s) => s.resetRotation)
  const [status, setStatus] = useState('')

  const target =
    ROTATION_TARGETS.find((t) => t.key === selectedTarget) ?? ROTATION_TARGETS[0] ?? null
  const current: Vec3 = target
    ? (rotations[target.key] ?? target.baseRotation)
    : [0, 0, 0]

  const nudge = (axis: RotationAxis, deg: number) => {
    if (!target) return
    nudgeRotation(target.key, axis, (deg * Math.PI) / 180, target.baseRotation)
    setStatus('')
  }

  const save = async () => {
    setStatus('Guardando…')
    try {
      const entries = ROTATION_TARGETS.map((t) => ({
        key: t.key,
        label: t.label,
        model: rotationTargetModel(t),
        rotation: rotations[t.key] ?? t.baseRotation,
      }))
      const res = await fetch('/__rotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const data = await res.json()
      setStatus(data.ok ? `Guardado en ${data.file}` : `Error: ${data.error}`)
    } catch (error) {
      setStatus(`Error: ${String(error)}`)
    }
  }

  const copyTriplet = async () => {
    await navigator.clipboard.writeText(`[${current.map(round3).join(', ')}]`)
    setStatus('Triplet copiado al portapapeles')
  }

  const copySnippet = async () => {
    const lines = ROTATION_TARGETS.filter((t) => rotations[t.key]).map((t) =>
      snippetLine(t, rotations[t.key]),
    )
    if (lines.length === 0) {
      setStatus('Todavía no has girado ningún modelo')
      return
    }
    await navigator.clipboard.writeText(lines.join('\n') + '\n')
    setStatus('Snippet copiado al portapapeles')
  }

  return (
    <div className="rot-calc">
      <p className="rot-calc__hint">
        Gira el modelo con los botones y cópialo a <b>components.ts</b>. El giro de
        la ranura (<code>mount.angle</code>) se aplica después, al colocar la pieza:
        no forma parte de esta calibración.
      </p>

      <div className="rot-calc__targets">
        {ROTATION_TARGETS.map((t) => {
          const active = target?.key === t.key
          const touched = t.key in rotations
          return (
            <button
              key={t.key}
              className={`rot-calc__target${active ? ' rot-calc__target--active' : ''}`}
              onClick={() => selectTarget(t.key)}
            >
              <span>{t.label}</span>
              {touched && (
                <span className="rot-calc__target-value">
                  {(rotations[t.key] ?? t.baseRotation).map(round3).join(', ')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {target && (
        <>
          <div className="rot-calc__controls">
            {AXES.map(({ axis, label }) => (
              <div key={axis} className="rot-calc__axis">
                <span className="rot-calc__axis-name">{label}</span>
                <span className="rot-calc__axis-value">
                  {(current[axisIndex(axis)] * DEG).toFixed(1)}°
                </span>
                <div className="rot-calc__axis-btns">
                  {NUDGES.map((deg) => (
                    <button key={deg} onClick={() => nudge(axis, deg)}>
                      {deg > 0 ? `+${deg}°` : `${deg}°`}
                    </button>
                  ))}
                  <button
                    title="Poner este eje a 0"
                    onClick={() => resetRotation(target.key, axis)}
                  >
                    0
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rot-calc__readout">
            <span>Triplet (radianes)</span>
            <code>[{current.map(round3).join(', ')}]</code>
          </div>

          <div className="rot-calc__actions">
            <button className="btn" onClick={() => resetRotation(target.key)}>
              Poner a 0
            </button>
            <button className="btn" onClick={copyTriplet}>
              Copiar triplet
            </button>
          </div>
        </>
      )}

      <div className="rot-calc__actions">
        <button className="btn" onClick={copySnippet}>
          Copiar snippet
        </button>
        <button className="btn btn--accent" onClick={save}>
          Guardar en el proyecto
        </button>
      </div>

      {status && <div className="calib__status">{status}</div>}
    </div>
  )
}
