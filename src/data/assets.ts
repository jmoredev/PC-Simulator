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

export function modelUrl(def: ComponentDef): string | undefined {
  if (def.model) return def.model
  return USE_MODELS ? `/assets/models/${def.id}.glb` : undefined
}

export function textureUrl(def: ComponentDef): string | undefined {
  return def.texture
}
