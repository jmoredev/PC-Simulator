/**
 * Créditos y licencias de los recursos externos (modelos 3D e imágenes).
 *
 * Todos los modelos 3D son CC BY 4.0 (atribución) y están **modificados**
 * (optimizados para la web), por lo que hay que citar autor, fuente, licencia
 * y los cambios. El detalle también está en `CREDITS.md`.
 */

export interface Credit {
  /** Archivo dentro del proyecto (`public/assets/models` o `src/assets`). */
  file: string
  /** Qué es, tal como se ve en la aplicación. */
  what: string
  author?: string
  /** Enlace a la ficha original del recurso. */
  source?: string
  /** Nombre de la licencia (p. ej. "CC BY 4.0"). */
  license?: string
  /** Enlace al texto de la licencia. */
  licenseUrl?: string
  /** Cambios hechos sobre el original (obligatorio citarlos en CC BY y BY-SA). */
  changes?: string
}

/** Cambios aplicados a todos los modelos 3D del simulador. */
export const MODEL_CHANGES =
  'Optimizado para la web: texturas redimensionadas y en WebP, cuantización de malla y simplificación ligera.'

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/'

/** Atajo para las entradas CC BY 4.0 optimizadas. */
function ccBy(
  file: string,
  what: string,
  author: string,
  source: string,
  changes: string | undefined = MODEL_CHANGES,
): Credit {
  return { file, what, author, source, license: 'CC BY 4.0', licenseUrl: CC_BY, changes }
}

export const CREDITS: Credit[] = [
  /* ---- Piezas (public/assets/models) ---- */
  ccBy(
    'cpu-01.glb',
    'CPU (procesador), modelo AM4 · variante 1',
    'Igor.Jop',
    'https://sketchfab.com/3d-models/am4-cpu-free-912c9c42d2dc40fe95574345aae51ea0',
  ),
  ccBy(
    'cpu-02.glb',
    'CPU (procesador), modelo Intel · variante 2',
    'Moonway 3D',
    'https://sketchfab.com/3d-models/free-intel-cpu-fe534a3cae7c4e66b6131da9b5dae6ff',
  ),
  ccBy(
    'cooler.glb',
    'Disipador + ventilador',
    'Fochdog (bazyaev08)',
    'https://sketchfab.com/3d-models/cpu-cooler-672a0a74a98c452a862016bee99f3579',
  ),
  ccBy(
    'ram1.glb',
    'Memoria RAM, modelo Corsair Vengeance LPX · variante 1',
    'supahot',
    'https://sketchfab.com/3d-models/ram-corsair-vengeance-lpx-ee11e1926e514075a70642ecb5dc5c2d',
  ),
  ccBy(
    'ram2.glb',
    'Memoria RAM, modelo Crucial DDR4 · variante 2',
    'ISUS (coldsky)',
    'https://sketchfab.com/3d-models/ram-crucial-ddr4-16gb-3a032229faa84790abdb75e349594b6a',
  ),
  ccBy(
    'ssd-nvme.glb',
    'SSD M.2 NVMe (Samsung 990 PRO)',
    'PolyDavid',
    'https://sketchfab.com/3d-models/samsung-990-pro-ssd-6ada64c9ba734e499978a084e68ec3df',
  ),
  ccBy(
    'gpu-01.glb',
    'Tarjeta gráfica, modelo AMD RX 480 · variante 1',
    'Igor.Jop',
    'https://sketchfab.com/3d-models/rx-480-gpu-61e69f50bcd44c7284bef31a8f21c6a7',
  ),
  ccBy(
    'gpu-02.glb',
    'Tarjeta gráfica, modelo NVIDIA RTX 3090 · variante 2',
    'Muhammad Kholis (its.przvl._)',
    'https://sketchfab.com/3d-models/nvidia-geforce-rtx-3090-gpu-22158616a1a44455917ee8e1e8fc4b09',
  ),
  ccBy(
    'monitor.glb',
    'Monitor',
    'portgl16',
    'https://sketchfab.com/3d-models/monitor-9f6f9018f14a4dbea1ad1aea0ce89e7c',
  ),
  ccBy(
    'keyboard.glb',
    'Teclado',
    'oscarherry3d',
    'https://sketchfab.com/3d-models/keyboard-66f5ca31bf154c82ae5284a32a362a4e',
  ),
  ccBy(
    'mouse.glb',
    'Ratón',
    'rubykamen',
    'https://sketchfab.com/3d-models/pc-mouse-type-r-b782768a5ec1453fb2587bd9d82aaf7e',
  ),
  ccBy(
    'speakers.glb',
    'Altavoces',
    'Condo (killercondo99)',
    'https://sketchfab.com/3d-models/speakers-low-poly-b2e3d6ecef4e40d994066416c395bf0a',
  ),
  ccBy(
    'fan.glb',
    'Ventilador de caja',
    'Neutrino (itrek47)',
    'https://sketchfab.com/3d-models/computer-cooler-pc-fan-50adf2b7b06f42588825ab7f31f7ca87',
  ),
  ccBy(
    'hdd.glb',
    'Disco duro (WD Green 1TB)',
    'MajdyModels (MG990)',
    'https://sketchfab.com/3d-models/wd-green-1tb-hard-disk-hdd-e9244f56e0724dd097570e29bae4b7c6',
  ),
  ccBy(
    'psu.glb',
    'Fuente de alimentación (PSU)',
    'Groovex (dhafintaufiqi21)',
    'https://sketchfab.com/3d-models/psu-power-supply-unit-69ccd1be3a77497cb2acc9e39e7c52b3',
  ),

  /* ---- Placas base (public/assets/models/placas) ---- */
  ccBy(
    'placas/motherboard-01.glb',
    'Placa base (ASUS PRIME H510M-K)',
    'zhigulinsky',
    'https://sketchfab.com/3d-models/pc-motherboard-asus-prime-h510m-k-f9a6af88120f4a0f81cd4107ce533e3e',
  ),
  ccBy(
    'placas/motherboard-02.glb',
    'Placa base (ASUS Z170-P)',
    'Lassi Kaukonen (thesidekick)',
    'https://sketchfab.com/3d-models/asus-z170-p-motherboard-b998596cfc4945a0bc7b016005c39321',
  ),
  ccBy(
    'placas/motherboard-03.glb',
    'Placa base (Gigabyte B450 S2H, AM4)',
    'Temoor',
    'https://sketchfab.com/3d-models/motherboard-am4-783d063a29424571bfb4c9b7b490b75f',
  ),

  /* ---- Imágenes de los conectores (src/assets/connectors) ---- */
  { file: 'connectors/ps2.png', what: 'Conector PS/2' },
  { file: 'connectors/usb.png', what: 'Conector USB-A' },
  { file: 'connectors/lan.png', what: 'Conector RJ-45 (red)' },
  { file: 'connectors/hdmi.png', what: 'Conector HDMI' },
  { file: 'connectors/displayport.png', what: 'Conector DisplayPort' },
  { file: 'connectors/dvi.png', what: 'Conector DVI' },
  { file: 'connectors/vga.png', what: 'Conector VGA' },
]
