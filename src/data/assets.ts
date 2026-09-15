import type { ComponentDef } from '../types'

/**
 * Cuando tengas los modelos .glb en /public/assets/models puedes activarlos
 * creando un archivo .env con:  VITE_USE_MODELS=true
 *
 * Convención de nombres: el archivo debe llamarse igual que el id del
 * componente (ver src/data/components.ts), por ejemplo: cpu.glb, gpu.glb...
 * Si un componente concreto necesita otra ruta, usa su campo `model`.
 */
export const USE_MODELS = import.meta.env.VITE_USE_MODELS === 'true'

export function modelUrl(def: ComponentDef): string | undefined {
  if (def.model) return def.model
  return USE_MODELS ? `/assets/models/${def.id}.glb` : undefined
}

export function textureUrl(def: ComponentDef): string | undefined {
  return def.texture
}
