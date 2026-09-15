export type Vec3 = [number, number, number]

export type ComponentKind =
  | 'motherboard'
  | 'cpu'
  | 'cooler'
  | 'ram'
  | 'ssd'
  | 'gpu'
  | 'psu'
  | 'fan'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'speaker'

export type ComponentCategory = 'interno' | 'periferico'

export type GameMode = 'practice' | 'exam'

export type Phase = 'menu' | 'building' | 'finished'

/** Fases del montaje: sobre la placa, dentro de la caja y periféricos. */
export type StageId = 'board' | 'case' | 'peripherals'

export interface Stage {
  id: StageId
  index: number
  /** Título completo ("Sobre la placa base"). */
  title: string
  /** Etiqueta corta para la barra superior ("1. Placa base"). */
  short: string
  /** Qué se hace en esta fase. */
  hint: string
  /** Superficie de trabajo de la fase. */
  bench: { width: number; depth: number; center: [number, number] }
  /** Rejilla de la bandeja de componentes. */
  tray: { cols: number[]; rows: number[]; surfaceY: number }
  /** Cámara inicial de la fase. */
  camera: { position: Vec3; target: Vec3 }
}

/** Punto físico donde se instala un componente. */
export interface MountPoint {
  id: string
  /** Fase a la que pertenece el hueco. */
  stage: StageId
  /** Nombre pedagógico del hueco (ej. "Zócalo de la CPU"). */
  label: string
  /** Posición del punto de anclaje (base del componente). */
  position: Vec3
  /** Tipos de componente que encajan aquí. */
  accepts: ComponentKind[]
  /** Radio de imán para el snap. */
  snapRadius: number
  /** Forma de la zona resaltable (ancho y profundo, en unidades). */
  size: [number, number]
  /** Orden recomendado de montaje. */
  order: number
  /** Nivel de dificultad del montaje. */
  difficulty: 1 | 2 | 3
}

export interface ComponentDef {
  id: string
  kind: ComponentKind
  /** Fase en la que se monta. */
  stage: StageId
  name: string
  subtitle: string
  category: ComponentCategory
  /** Explicación adaptada a 4º de la ESO. */
  description: string
  /** Dato curioso o utilidad práctica. */
  funFact?: string
  order: number
  /** Hueco donde debe colocarse. */
  mountId: string
  /** Tamaño máximo (unidades) para normalizar el modelo 3D. */
  size: number
  /** [x, z] dentro de la bandeja de componentes. */
  trayPos: [number, number]
  /** Color de acento en la interfaz y en el placeholder. */
  color: string
  /** Ruta explícita del modelo .glb (opcional). */
  model?: string
  /** Ruta explícita de la textura (opcional). */
  texture?: string
}
