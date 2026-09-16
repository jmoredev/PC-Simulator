import type { ComponentKind } from '../types'

export interface CableDef {
  name: string
  subtitle: string
  color: string
  /** Tamaño máximo (unidades) con el que se dibuja en la bandeja. */
  size: number
  description: string
  funFact: string
}

/** Textos y aspecto de cada cable, por tipo de conector. */
export const CABLES: Partial<Record<ComponentKind, CableDef>> = {
  ps2: {
    name: 'Cable PS/2',
    subtitle: 'Teclado o ratón antiguos',
    color: '#7c3aed',
    size: 0.34,
    description:
      'Conector redondo que se usaba para el teclado (morado) y el ratón (verde). Hoy casi no se ve porque el USB lo ha sustituido, pero algunas placas todavía lo incluyen.',
    funFact:
      'No se puede conectar en caliente: hay que apagar el ordenador antes de poner o quitar un PS/2.',
  },
  usb: {
    name: 'Cable USB',
    subtitle: 'Bus serie universal',
    color: '#1e40af',
    size: 0.38,
    description:
      'Conector más habitual para teclado, ratón, impresora o memorias USB. La toma azul suele ser USB 3.0, mucho más rápida que la negra (USB 2.0).',
    funFact: 'El USB también lleva corriente: por eso sirve para cargar el móvil.',
  },
  lan: {
    name: 'Cable de red (RJ-45)',
    subtitle: 'Conexión a Internet por cable',
    color: '#475569',
    size: 0.4,
    description:
      'Es el cable de red. Conecta el ordenador al router para tener Internet por cable, que es más estable y rápido que el Wi-Fi y no depende de la cobertura.',
    funFact:
      'Sus ocho hilos van colocados en un orden concreto; si el cable está mal montado, la red no funciona.',
  },
  hdmi: {
    name: 'Cable HDMI',
    subtitle: 'Vídeo y audio digital',
    color: '#111827',
    size: 0.4,
    description:
      'Lleva imagen y sonido digital por un solo cable. Es el conector más habitual para enganchar un monitor o una televisión al ordenador y ha sustituido al VGA y al DVI en los equipos modernos.',
    funFact: 'Un cable HDMI 2.1 puede mover imagen 4K a 120 imágenes por segundo.',
  },
  displayport: {
    name: 'Cable DisplayPort',
    subtitle: 'Vídeo digital de alta resolución',
    color: '#1f2937',
    size: 0.36,
    description:
      'Conector de vídeo digital muy usado en monitores de ordenador. Admite resoluciones muy altas y permite encadenar varios monitores con un solo cable.',
    funFact:
      'Su conector tiene una pestaña que lo bloquea, así que hay que pulsarla para poder sacarlo.',
  },
  dvi: {
    name: 'Cable DVI',
    subtitle: 'Vídeo digital anterior al HDMI',
    color: '#e5e7eb',
    size: 0.42,
    description:
      'Transporta imagen digital, pero no sonido. Fue el primer conector de vídeo digital de los monitores planos y todavía se encuentra en pantallas antiguas.',
    funFact:
      'Hay varios tipos de DVI (solo digital, solo analógico y mixto) y no todos los cables encajan en todas las tomas.',
  },
  vga: {
    name: 'Cable VGA',
    subtitle: 'Vídeo analógico',
    color: '#3b82f6',
    size: 0.44,
    description:
      'Conector de vídeo analógico, de color azul y con forma trapezoidal. Fue el estándar durante décadas, aunque la señal analógica pierde calidad con la distancia y con resoluciones altas.',
    funFact: 'Sus dos tornillos laterales evitan que el cable se suelte por accidente.',
  },
  'audio-out': {
    name: 'Jack de altavoces (verde)',
    subtitle: 'Salida de audio',
    color: '#16a34a',
    size: 0.24,
    description:
      'Jack de 3,5 mm de color verde. Es la salida de audio: por aquí salen los altavoces o los auriculares.',
    funFact:
      'El color de cada jack indica su función: verde salida, azul entrada y rosa micrófono.',
  },
  'audio-in': {
    name: 'Jack de entrada (azul)',
    subtitle: 'Entrada de línea',
    color: '#2563eb',
    size: 0.24,
    description:
      'Jack de 3,5 mm de color azul. Es la entrada de línea: sirve para grabar el sonido que llega de otro equipo, como un reproductor de música o una mesa de mezclas.',
    funFact:
      'En muchas placas la entrada azul se puede reconfigurar por software y usarla como otra salida.',
  },
  'audio-mic': {
    name: 'Jack de micrófono (rosa)',
    subtitle: 'Entrada de micrófono',
    color: '#db2777',
    size: 0.24,
    description:
      'Jack de 3,5 mm de color rosa. Es la entrada de micrófono y lleva un pequeño circuito de amplificación, porque la señal que genera un micrófono es muy débil.',
    funFact:
      'Cuando el micrófono y los auriculares comparten una sola toma se llama conector combo.',
  },
  'usb-c': {
    name: 'Cable USB-C',
    subtitle: 'Conector pequeño y reversible',
    color: '#94a3b8',
    size: 0.34,
    description:
      'Conector USB-C: pequeño, ovalado y reversible (entra por los dos lados). Es el estándar de móviles y portátiles actuales, pero no encaja en las tomas USB tradicionales de la placa.',
    funFact: 'Un solo cable USB-C puede llevar datos, vídeo, audio y carga a la vez.',
  },
  rj11: {
    name: 'Cable de teléfono (RJ-11)',
    subtitle: 'Conector de línea telefónica',
    color: '#a3a3a3',
    size: 0.3,
    description:
      'Es el conector del teléfono. Se parece al de red, pero es más estrecho y no encaja en un puerto RJ-45 del ordenador.',
    funFact: 'El RJ-11 tiene 4 o 6 contactos; el RJ-45 de red tiene 8.',
  },
}

/** Cables que no encajan en ningún puerto: obligan a razonar. */
export const DECOY_CABLES: ComponentKind[] = ['usb-c', 'rj11']
