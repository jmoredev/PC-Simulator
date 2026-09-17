import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Endpoint solo de desarrollo que permite al modo calibración guardar las
 * coordenadas de los huecos en .scratch/calibration-<placa>.json.
 * No existe en producción (configureServer solo aplica al servidor de dev).
 */
function calibrationSaver(): Plugin {
  return {
    name: 'calibration-saver',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__calibration', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            const board = String(data.boardId ?? 'placa').replace(/[^\w.-]/g, '') || 'placa'
            const file = resolve(`.scratch/calibration-${board}.json`)
            mkdirSync(resolve('.scratch'), { recursive: true })
            writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (error) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(error) }))
          }
        })
      })
    },
  }
}

/**
 * Sirve los modelos de placa sin comprimir desde `models-originales/placas/`
 * (ignorada por git). Así se puede trabajar con los .glb originales, nítidos,
 * sin copiarlos a `public/` ni pasarlos por `models:optimize`.
 */
function boardModels(): Plugin {
  return {
    name: 'board-models',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/assets/models/placas', (req, res, next) => {
        // Con `?optimized=1` se deja pasar para servir la copia comprimida de
        // public/ (la que se publica), en vez del original de models-originales.
        if ((req.url ?? '').includes('optimized=1')) {
          next()
          return
        }
        const name = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')
        if (!/^[\w.-]+\.glb$/.test(name)) {
          next()
          return
        }
        const file = resolve('models-originales/placas', name)
        if (!existsSync(file)) {
          next()
          return
        }
        res.setHeader('content-type', 'model/gltf-binary')
        res.setHeader('content-length', statSync(file).size)
        createReadStream(file).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), calibrationSaver(), boardModels()],
})
