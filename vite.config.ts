import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Endpoint solo de desarrollo que permite al modo calibración guardar las
 * coordenadas de los huecos en .scratch/calibration.json.
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
            const file = resolve('.scratch/calibration.json')
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), calibrationSaver()],
})
