import type { ComponentDef } from '../types'
/**
 * Los modelos .glb de /public/assets/models están activados por defecto.
 * Para trabajar solo con las formas procedurales (más rápido), crea un .env
 * con:  VITE_USE_MODELS=false
 *
 * Convención de nombres: el archivo debe llamarse igual que el id del
 * componente (ver src/data/components.ts), por ejemplo: cpu.glb, gpu.glb...
 * Si un componente concreto necesita otra ruta, usa su campo `model`.
 * Si un .glb falta, esa pieza usa su placeholder y el resto sigue igual.
 */
export const USE_MODELS = import.meta.env.VITE_USE_MODELS !== 'false'

/** Mínimo necesario para localizar el modelo .glb de una pieza. */
export interface ModelSpec {
  id: string
  model?: string
  procedural?: boolean
}

export function modelUrl(def: ModelSpec): string | undefined {
  if (def.procedural) return undefined
  if (def.model) return def.model
  return USE_MODELS ? `/assets/models/${def.id}.glb` : undefined
}

export function textureUrl(def: ComponentDef): string | undefined {
  return def.texture
}

/**
 * Imágenes de los conectores de la fase 2. Se llaman igual que su `kind`
 * (`hdmi.png`, `audio-out.png`…) y viven en `src/assets/connectors/`.
 * El glob solo devuelve las que existen: si falta un PNG, esa pieza usa su
 * forma procedural y no se rompe nada.
 */
const CONNECTOR_IMAGES = import.meta.glob('../assets/connectors/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export function connectorImageUrl(kind: string): string | undefined {
  return CONNECTOR_IMAGES[`../assets/connectors/${kind}.png`]
}
