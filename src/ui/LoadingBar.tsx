import { useProgress } from '@react-three/drei'

/**
 * Aviso de carga de los modelos 3D. El `.glb` de la placa pesa hasta 18,8 MB, así
 * que en el aula tarda: sin esto, lo único que se veía era el placeholder
 * procedural, que aparecía y luego se sustituía sin explicar nada.
 *
 * No bloquea: es una franja sobre el lienzo con `pointer-events: none`, así que
 * se puede seguir mirando la escena mientras llega el modelo.
 */
export function LoadingBar() {
  const active = useProgress((s) => s.active)
  const progress = useProgress((s) => s.progress)
  const item = useProgress((s) => s.item)

  if (!active) return null

  // El porcentaje del gestor de carga de three puede salirse de rango al
  // encadenar cargas, así que se acota antes de pintarlo.
  const pct = Math.min(100, Math.max(0, Math.round(Number.isFinite(progress) ? progress : 0)))
  const label = item.includes('/placas/')
    ? 'Cargando el modelo de la placa…'
    : 'Cargando los modelos 3D…'

  return (
    <div className="loadingbar" role="status" aria-live="polite">
      <span className="loadingbar__label">{label}</span>
      <span className="loadingbar__pct">{pct} %</span>
      <div className="loadingbar__track">
        <div className="loadingbar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
