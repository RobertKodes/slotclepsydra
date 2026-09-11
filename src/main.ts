import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './style.css'

import {
  createEngine,
  displayedSlot,
  formatFee,
  formatSlot,
  formatTps,
  pollDyes,
  pollMeter,
  pollSlot,
  stepFill,
  stepTilt,
  takeDye,
  type DyeJob,
} from './lib/engine.ts'
import { drawFrame } from './lib/clepsydra.ts'
import { hitBasin, hitSpout, makeLayout, screenToLocal, waterGeom, type Layout } from './lib/geom.ts'
import { createWorld, spawnDrop, stampInstant, stepHang, stepWorld } from './lib/fluid.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#clock')!
const holdBtn = document.querySelector<HTMLButtonElement>('#hold')!
const readSlot = document.querySelector('#read-slot')!
const readTps = document.querySelector('#read-tps')!
const readFee = document.querySelector('#read-fee')!
const readWire = document.querySelector('#read-wire')!
const readStains = document.querySelector('#read-stains')!

function require2d(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = target.getContext('2d')
  if (!c) throw new Error('2d')
  return c
}

const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
const eng = createEngine(reducedMq.matches)
reducedMq.addEventListener('change', () => {
  eng.reduced = reducedMq.matches
})

const world = createWorld()
let layout: Layout = makeLayout(800, 600)
let dpr = 1
let ctx = require2d(canvas)

function fit(): void {
  const rect = canvas.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  ctx = require2d(canvas)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  layout = makeLayout(rect.width, rect.height)
}

fit()
window.addEventListener('resize', fit)

function setHeld(next: boolean): void {
  eng.held = next
  holdBtn.setAttribute('aria-pressed', String(next))
  holdBtn.classList.toggle('is-held', next)
  holdBtn.innerHTML = next
    ? '<span class="hold-lamp" aria-hidden="true"></span>HELD · sample frozen'
    : '<span class="hold-lamp" aria-hidden="true"></span>CAP · hold the spout'
}

holdBtn.addEventListener('click', () => setHeld(!eng.held))
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return
  e.preventDefault()
  setHeld(!eng.held)
})

function pointerLocal(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  return screenToLocal(x, y, layout, eng.tilt)
}

canvas.addEventListener('pointerdown', (e) => {
  const p = pointerLocal(e)
  if (hitSpout(layout, p.x, p.y, eng.held)) {
    setHeld(!eng.held)
    return
  }
  if (eng.held && hitBasin(layout, p.x, p.y)) {
    canvas.setPointerCapture(e.pointerId)
    eng.dragging = true
    eng.tiltV = 0
    eng.tilt = Math.max(-0.18, Math.min(0.18, (p.x - layout.basinCx) / layout.basinRx * 0.16))
  }
})

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const p = screenToLocal(sx, sy, layout, eng.tilt)
  if (eng.dragging) {
    eng.tilt = Math.max(-0.18, Math.min(0.18, (p.x - layout.basinCx) / layout.basinRx * 0.16))
    canvas.style.cursor = 'grabbing'
    return
  }
  const over = hitSpout(layout, p.x, p.y, eng.held) || (eng.held && hitBasin(layout, p.x, p.y))
  canvas.style.cursor = over ? 'pointer' : 'default'
})

function endDrag(): void {
  eng.dragging = false
}

canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

const abort = new AbortController()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function loopSlot(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollSlot(eng, abort.signal)
    await sleep(900)
  }
}
async function loopMeter(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollMeter(eng, abort.signal)
    await sleep(2800)
  }
}
async function loopDyes(): Promise<void> {
  while (!abort.signal.aborted) {
    await pollDyes(eng, abort.signal)
    await sleep(1600)
  }
}

void loopSlot()
void loopMeter()
void loopDyes()

function dripCount(): number {
  if (eng.tps == null) return 1
  return 1 + Math.floor(Math.min(6, eng.tps / 750))
}

function fallbackJob(slot: number): DyeJob {
  return { family: 'other', failed: false, slot, sig: `drip-${slot}` }
}

function releaseSlot(floor: number): void {
  const n = dripCount()
  for (let i = 0; i < n; i++) {
    const job = takeDye(eng) ?? fallbackJob(floor)
    if (eng.reduced) stampInstant(world, waterGeom(layout, eng.fill), job)
    else spawnDrop(world, layout, job)
  }
}

let lastUi = 0
let lastT = performance.now()

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000)
  lastT = now
  stepFill(eng, dt)
  stepTilt(eng, dt)
  stepHang(world, dt, eng.slotMs, eng.held, eng.reduced)

  const shown = displayedSlot(eng, now)
  const floor = Math.floor(shown)
  if (floor > world.lastFloor && eng.slot > 0 && !eng.held) {
    if (world.lastFloor > 0) releaseSlot(floor)
    world.lastFloor = floor
  }

  const water = waterGeom(layout, eng.fill)
  const visualFee =
    eng.feeMicro && eng.feeMicro > 0
      ? eng.fee
      : Math.min(0.28, 0.06 + (eng.tps ?? 0) / 14000)
  stepWorld(world, {
    water,
    held: eng.held,
    tilt: eng.tilt,
    fee: visualFee,
    tps: eng.tps,
    reduced: eng.reduced,
    dt,
  })

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, layout.w, layout.h)
  drawFrame(ctx, layout, eng, world, water, now)

  if (now - lastUi > 180) {
    lastUi = now
    readSlot.textContent = formatSlot(eng.slot)
    readTps.textContent = formatTps(eng.tps)
    readFee.textContent = formatFee(eng.feeMicro, eng.fee)
    readWire.textContent = eng.live ? eng.wire : eng.wire
    readStains.textContent = String(eng.stains)
    document.documentElement.style.setProperty('--fee', String(eng.fee))
    holdBtn.classList.toggle('is-live', eng.live)
  }

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
