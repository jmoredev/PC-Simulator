import type { ComponentKind } from '../types'

/** Tamaño real de cada puerto [largo, alto] (1 u ≈ 10 cm). */
const PORT_SIZE: Partial<Record<ComponentKind, [number, number]>> = {
  ps2: [0.19, 0.19],
  usb: [0.16, 0.08],
  lan: [0.18, 0.16],
  hdmi: [0.17, 0.08],
  displayport: [0.18, 0.09],
  dvi: [0.22, 0.09],
  vga: [0.22, 0.1],
  'audio-out': [0.08, 0.08],
  'audio-in': [0.08, 0.08],
  'audio-mic': [0.08, 0.08],
}

export function portSize(kind: ComponentKind): [number, number] {
  return PORT_SIZE[kind] ?? [0.16, 0.08]
}

/** Nombre didáctico de cada puerto. */
const PORT_LABEL: Partial<Record<ComponentKind, string>> = {
  ps2: 'Puerto PS/2',
  usb: 'Puerto USB',
  lan: 'Puerto de red (RJ-45)',
  hdmi: 'Salida HDMI',
  displayport: 'Salida DisplayPort',
  dvi: 'Salida DVI',
  vga: 'Salida VGA',
  'audio-out': 'Jack de altavoces (verde)',
  'audio-in': 'Jack de entrada (azul)',
  'audio-mic': 'Jack de micrófono (rosa)',
}

export function portLabel(kind: ComponentKind): string {
  return PORT_LABEL[kind] ?? kind
}
