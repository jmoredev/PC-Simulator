export type Vec3 = [number, number, number]

/** Variante de modelo de una pieza (p. ej. dos CPUs distintas). */
export interface ModelVariant {
  model: string
  /** Giro [x, y, z] propio de esta variante. */
  rotation?: Vec3
}

export type ComponentKind =
  | 'cpu'
  | 'cooler'
  | 'ram'
  | 'ssd-nvme'
  | 'gpu'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'speaker'
  | 'ps2'
  | 'usb'
  | 'lan'
  | 'hdmi'
  | 'displayport'
  | 'dvi'
  | 'vga'
  | 'audio-out'
  | 'audio-in'
  | 'audio-mic'
  | 'usb-c'
  | 'rj11'

export type ComponentCategory = 'interno' | 'periferico' | 'conector'

export type GameMode = 'practice' | 'exam'

export type Phase = 'menu' | 'building' | 'finished'

/** Fases: identificación, montaje en la placa, conexiones traseras y periféricos. */
export type StageId = 'identify' | 'board' | 'ports' | 'peripherals'

/** Plano sobre el que se proyecta el puntero y ejes de colocación. */
export type DropPlane =
  | { kind: 'horizontal'; y: number; wrongRadius: number }
  | { kind: 'vertical'; x: number; wrongRadius: number }

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
  /** Plano de arrastre (horizontal salvo en la fase de conectores). */
  drop: DropPlane
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
  /** Ángulo de la ranura en el plano XZ (radianes). */
  angle?: number
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
  /** Hueco donde debe colocarse (los cables señuelo no tienen). */
  mountId?: string
  /** Tamaño máximo (unidades) para normalizar el modelo 3D. */
  size: number
  /** [x, z] dentro de la bandeja de componentes. */
  trayPos: [number, number]
  /** [x, z] en la mesa de la fase de identificación. */
  identifyPos?: [number, number]
  /** Color de acento en la interfaz y en el placeholder. */
  color: string
  /** Pieza que sobra: no encaja en ningún hueco y no cuenta para acabar. */
  decoy?: boolean
  /** Ruta explícita del modelo .glb (opcional). */
  model?: string
  /** Varios modelos para la misma pieza: se elige uno al azar por partida. */
  variants?: ModelVariant[]
  /** Sin modelo .glb: se dibuja siempre con la geometría procedural. */
  procedural?: boolean
  /** Giro del modelo en radianes [x, y, z] para orientarlo en el hueco. */
  rotation?: Vec3
  /** Ruta explícita de la textura (opcional). */
  texture?: string
}
