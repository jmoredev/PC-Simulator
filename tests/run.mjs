/**
 * Pruebas end-to-end del simulador con Chromium headless.
 *
 *   npm run dev -- --port 5199        # en otra terminal
 *   node tests/run.mjs
 *
 * Variables: BASE_URL (por defecto http://127.0.0.1:5199), CHROME (ruta al binario).
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import puppeteer from 'puppeteer-core'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5199'
const DEPTHS = [0.62, 0.75, 0.3, 0.3, 1.0, 2.3, 2.9, 1.9, 1.4, 1.4, 1.8, 2.0, 1.6, 1.7, 1.1]
const NAMES = [
  'cpu', 'cooler', 'ram1', 'ram2', 'ssd', 'gpu',
  'motherboard', 'psu', 'fan1', 'fan2', 'hdd',
  'monitor', 'keyboard', 'mouse', 'speakers',
]

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME
  const root = join(homedir(), '.cache', 'puppeteer', 'chrome')
  if (!existsSync(root)) throw new Error('No encuentro Chromium. Define CHROME=<ruta>.')
  for (const dir of readdirSync(root)) {
    const bin = join(root, dir, 'chrome-linux64', 'chrome')
    if (existsSync(bin)) return bin
  }
  throw new Error('No encuentro el binario de Chromium. Define CHROME=<ruta>.')
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(browser, url) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 180000 })
  return { page, errors }
}

/** Coloca el componente i usando la etiqueta de la zona y el clic. */
async function place(page, i) {
  const items = await page.$$('button.comp-item')
  await items[i].click()
  await wait(600)
  const label = await page
    .$eval('.mount-label', (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    .catch(() => null)
  if (!label) return false

  const progress = () => page.$eval('.progress-label', (el) => el.textContent.trim())
  const before = await progress()
  const base = 80 * (DEPTHS[i] / 2 + 0.18)
  for (const off of [base, base - 20, base + 20, base - 40, base + 40, 60, 80, 100, 120]) {
    if (off < 10 || off > 180) continue
    await page.mouse.click(label.x, label.y + off)
    await wait(320)
    if ((await progress()) !== before) {
      await wait(900)
      return true
    }
  }
  return false
}

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
})

/* ---------- 1. Modo calibración ---------- */
{
  const { page, errors } = await newPage(browser, `${BASE_URL}/?calibrate=1`)
  await wait(5000)
  check('calibración: panel visible', !!(await page.$('.calib')))
  const slots = await page.$$('.calib__slot')
  check("calibración: 5 huecos", slots.length === 5, `${slots.length}`)

  await slots[0].click()
  await wait(300)
  await page.mouse.click(700, 430)
  await wait(400)
  const first = await page.$eval('.calib__slot-value', (el) => el.textContent)
  check('calibración: registra un punto', /-?\d/.test(first), first)

  const saved = await page.evaluate(async () => {
    const res = await fetch('/__calibration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    })
    return res.ok
  })
  check('calibración: endpoint de guardado', saved)
  check('calibración: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

/* ---------- 2. Partida completa ---------- */
{
  const { page, errors } = await newPage(browser, BASE_URL)
  await wait(1500)
  ;(await page.$$('button.mode-card'))[0].click()
  await wait(3500)

  let placed = 0
  for (let i = 0; i < NAMES.length; i++) {
    if (await place(page, i)) placed++
  }
  const progress = await page.$eval('.progress-label', (el) => el.textContent.trim())
  check('partida: 15/15 piezas', progress === '15/15', progress)
  check('partida: modal final', !!(await page.$('.overlay')))
  check('partida: sin errores', errors.length === 0, errors.join(' | '))
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} comprobaciones fallidas`)
process.exit(failures === 0 ? 0 : 1)
