#!/usr/bin/env node
/**
 * Optimiza los modelos .glb de public/assets/models para poder servirlos por
 * web sin arruinar la carga del aula:
 *
 *   - texturas a 1024 px y formato WebP  (EXT_texture_webp)
 *   - geometría cuantizada                (KHR_mesh_quantization)
 *   - malla simplificada con tolerancia mínima
 *
 * Ninguna de las dos extensiones necesita decodificador externo: three.js las
 * soporta de serie, así que useGLTF las carga sin configuración extra.
 *
 * Uso:
 *   npm run models:optimize
 *   npm run models:optimize -- --backup ../PC-Emulator-models-orig
 *   npm run models:optimize -- --force
 *
 * Los archivos ya optimizados se detectan y se saltan (salvo --force).
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const MODELS_DIR = 'public/assets/models'
const GLTF_VERSION = '@gltf-transform/cli@4.5.0'
const TEXTURE_SIZE = process.env.MODELS_TEXTURE_SIZE ?? '1024'

const args = process.argv.slice(2)
const force = args.includes('--force')
const backupIndex = args.indexOf('--backup')
const backupDir = backupIndex >= 0 ? args[backupIndex + 1] : null

const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`

function extensionsOf(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32LE(0) !== 0x46546c67) return []
  let offset = 12
  while (offset < buf.length) {
    const length = buf.readUInt32LE(offset)
    const type = buf.readUInt32LE(offset + 4)
    if (type === 0x4e4f534a) {
      const json = JSON.parse(buf.subarray(offset + 8, offset + 8 + length).toString('utf8'))
      return json.extensionsUsed ?? []
    }
    offset += 8 + length
  }
  return []
}

const isOptimized = (path) => extensionsOf(path).includes('KHR_mesh_quantization')

const files = readdirSync(MODELS_DIR).filter((f) => f.endsWith('.glb')).sort()
if (files.length === 0) {
  console.log('No hay modelos .glb en ' + MODELS_DIR)
  process.exit(0)
}

if (backupDir) {
  mkdirSync(backupDir, { recursive: true })
  console.log(`Copia de seguridad de los originales en ${backupDir}`)
}

let before = 0
let after = 0

for (const file of files) {
  const src = join(MODELS_DIR, file)
  const tmp = join(MODELS_DIR, `.${file}.tmp.glb`)
  const sizeBefore = statSync(src).size

  if (isOptimized(src) && !force) {
    console.log(`- ${file.padEnd(20)} ya optimizado, se salta`)
    before += sizeBefore
    after += sizeBefore
    continue
  }

  if (backupDir) copyFileSync(src, join(backupDir, file))

  const result = spawnSync(
    'npx',
    [
      '--yes',
      GLTF_VERSION,
      'optimize',
      src,
      tmp,
      '--texture-size',
      TEXTURE_SIZE,
      '--texture-compress',
      'webp',
      '--compress',
      'quantize',
      '--simplify',
      'true',
    ],
    // En Windows `npx` es un .cmd y spawnSync necesita el shell.
    { stdio: 'ignore', shell: process.platform === 'win32' },
  )

  if (result.status !== 0) {
    rmSync(tmp, { force: true })
    console.error(`! ${file}: fallo al optimizar (se deja el original)`)
    before += sizeBefore
    after += sizeBefore
    continue
  }

  renameSync(tmp, src)
  const sizeAfter = statSync(src).size
  before += sizeBefore
  after += sizeAfter
  console.log(`- ${file.padEnd(20)} ${mb(sizeBefore).padStart(9)} -> ${mb(sizeAfter)}`)
}

console.log(`\nTOTAL: ${mb(before)} -> ${mb(after)}`)
