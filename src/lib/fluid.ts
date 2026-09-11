import { familyColor, ink, rgba, type Family } from './palette.ts'
import type { DyeJob } from './engine.ts'
import type { Layout, WaterGeom } from './geom.ts'

export type Drop = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  family: Family
  failed: boolean
  age: number
}

export type Dye = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  family: Family
}

export type Sediment = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  settled: boolean
}

export type Ripple = {
  x: number
  y: number
  r: number
  vr: number
  a: number
}

export type Foam = {
  x: number
  y: number
  vx: number
  life: number
  r: number
}

type Layer = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  size: number
}

export type World = {
  drops: Drop[]
  dyes: Dye[]
  sediment: Sediment[]
  ripples: Ripple[]
  foam: Foam[]
  hang: number
  lastFloor: number
  dye: Layer
  dyeTmp: Layer
  iron: Layer
}

function makeLayer(size: number): Layer {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('2d layer')
  return { canvas, ctx, size }
}

export function createWorld(): World {
  const size = 384
  return {
    drops: [],
    dyes: [],
    sediment: [],
    ripples: [],
    foam: [],
    hang: 0.2,
    lastFloor: 0,
    dye: makeLayer(size),
    dyeTmp: makeLayer(size),
    iron: makeLayer(size),
  }
}

function cap<T>(arr: T[], n: number): void {
  if (arr.length > n) arr.splice(0, arr.length - n)
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

function containEllipse(
  p: { x: number; y: number; vx: number; vy: number },
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  slack = 0.92,
): void {
  const dx = (p.x - cx) / rx
  const dy = (p.y - cy) / ry
  const d2 = dx * dx + dy * dy
  if (d2 <= slack * slack) return
  const d = Math.sqrt(d2) || 1
  const nx = dx / d
  const ny = dy / d
  p.x = cx + nx * rx * slack
  p.y = cy + ny * ry * slack
  const dot = p.vx * nx * rx + p.vy * ny * ry
  if (dot > 0) {
    p.vx -= nx * dot * 0.08
    p.vy -= ny * dot * 0.08
  }
}

function toLayer(x: number, y: number, g: { cx: number; cy: number; rx: number; ry: number }, size: number): {
  x: number
  y: number
} {
  return {
    x: ((x - g.cx) / g.rx) * (size * 0.5) + size * 0.5,
    y: ((y - g.cy) / g.ry) * (size * 0.5) + size * 0.5,
  }
}

function stampBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.45, rgba(color, a * 0.45))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function swirlLayer(src: Layer, tmp: Layer, angle: number, fade: number): void {
  const { ctx, size } = tmp
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate(angle)
  ctx.scale(1.0015, 1.0015)
  ctx.translate(-size / 2, -size / 2)
  ctx.globalAlpha = fade
  ctx.drawImage(src.canvas, 0, 0)
  ctx.restore()
  src.ctx.setTransform(1, 0, 0, 1, 0, 0)
  src.ctx.clearRect(0, 0, size, size)
  src.ctx.drawImage(tmp.canvas, 0, 0)
}

export function spawnDrop(world: World, layout: Layout, job: DyeJob, jitter = true): void {
  const jx = jitter ? (Math.random() - 0.5) * 6 : 0
  world.drops.push({
    x: layout.mouthX + jx,
    y: layout.mouthY + 2,
    vx: Math.cos(layout.spoutAng) * 40 + (Math.random() - 0.5) * 8,
    vy: Math.sin(layout.spoutAng) * 50 + Math.random() * 20,
    r: job.failed ? 4.2 : 3.2 + Math.random() * 1.4,
    family: job.family,
    failed: job.failed,
    age: 0,
  })
  cap(world.drops, 48)
}

function splash(world: World, x: number, y: number, job: { family: Family; failed: boolean }, fee: number, reduced: boolean): void {
  world.ripples.push({
    x,
    y,
    r: 4,
    vr: 42 + fee * 50,
    a: 0.45 + fee * 0.35,
  })
  cap(world.ripples, 14)

  const dyeN = reduced ? 6 : 16 + Math.floor(fee * 10)
  for (let i = 0; i < dyeN; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 18 + Math.random() * 52
    world.dyes.push({
      x: x + Math.cos(a) * (8 + Math.random() * 36),
      y: y + Math.sin(a) * (4 + Math.random() * 14),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s * 0.5,
      r: 5 + Math.random() * 10,
      life: 1,
      family: job.family,
    })
  }
  cap(world.dyes, 420)

  const foamN = reduced ? 0 : Math.floor(2 + fee * 14)
  for (let i = 0; i < foamN; i++) {
    world.foam.push({
      x: x + (Math.random() - 0.5) * 22,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 18,
      life: 0.6 + Math.random() * 0.8,
      r: 1.2 + Math.random() * 2.4,
    })
  }
  cap(world.foam, 90)

  if (job.failed) {
    const n = reduced ? 3 : 7
    for (let i = 0; i < n; i++) {
      world.sediment.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 10,
        vy: 20 + Math.random() * 30,
        r: 1.6 + Math.random() * 2.8,
        life: 1,
        settled: false,
      })
    }
    cap(world.sediment, 200)
  }
}

export function stampInstant(world: World, water: WaterGeom, job: DyeJob): void {
  const ang = Math.random() * Math.PI * 2
  const rad = Math.random() * 0.7
  const x = water.cx + Math.cos(ang) * water.rx * rad
  const y = water.cy + Math.sin(ang) * water.ry * rad
  const p = toLayer(x, y, water, world.dye.size)
  stampBlob(world.dye.ctx, p.x, p.y, 16 + Math.random() * 18, familyColor[job.family], job.failed ? 0.5 : 0.7)
  if (job.failed) {
    const fx = water.cx + (Math.random() - 0.5) * water.rx * 0.7
    const fy = water.floorCy + (Math.random() - 0.5) * water.floorRy * 0.5
    const q = toLayer(fx, fy, { cx: water.cx, cy: water.floorCy, rx: water.floorRx, ry: water.floorRy }, world.iron.size)
    stampBlob(world.iron.ctx, q.x, q.y, 8 + Math.random() * 10, ink.oxblood, 0.7)
  }
}

export type FluidInput = {
  water: WaterGeom
  held: boolean
  tilt: number
  fee: number
  tps: number | null
  reduced: boolean
  dt: number
}

export function stepWorld(world: World, input: FluidInput): void {
  const { water, held, tilt, fee, reduced, dt } = input
  const frozen = held || reduced
  const swirl = frozen ? tilt * 1.8 : 0.55 + (input.tps ?? 400) / 8000
  const fade = frozen && Math.abs(tilt) < 0.002 ? 1 : frozen ? 0.996 : 0.976

  if (!reduced) swirlLayer(world.dye, world.dyeTmp, swirl * dt * (frozen ? 1.6 : 0.35), fade)

  const g = frozen ? 0 : 980
  const liveDrops: Drop[] = []
  for (const d of world.drops) {
    d.age += dt
    d.vy += g * dt * 0.55
    d.x += d.vx * dt
    d.y += d.vy * dt
    const over =
      d.y >= water.cy - 6 && inEllipse(d.x, d.y, water.cx, water.cy, water.rx * 1.08, water.ry * 2.2)
    if (over || d.y > water.cy + water.ry * 3) {
      const hx = Math.min(water.cx + water.rx * 0.86, Math.max(water.cx - water.rx * 0.86, d.x))
      splash(world, hx, water.cy, d, fee, reduced)
      continue
    }
    if (d.age < 3) liveDrops.push(d)
  }
  world.drops = liveDrops

  const dyeLive: Dye[] = []
  for (const p of world.dyes) {
    if (!frozen) {
      const dx = p.x - water.cx
      const dy = p.y - water.cy
      p.vx += -dy * swirl * dt * 2.4
      p.vy += dx * swirl * dt * 1.1
      p.vx += tilt * 80 * dt
      p.vx *= Math.pow(0.55, dt * 4)
      p.vy *= Math.pow(0.55, dt * 4)
      p.x += p.vx * dt
      p.y += p.vy * dt * 0.65
    } else if (Math.abs(tilt) > 0.002) {
      const dx = p.x - water.cx
      const dy = p.y - water.cy
      p.vx += -dy * tilt * 18 * dt
      p.vy += dx * tilt * 18 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt * 0.5
      p.vx *= 0.96
      p.vy *= 0.96
    }
    containEllipse(p, water.cx, water.cy, water.rx, water.ry, 0.9)
    p.life -= dt * (frozen ? 0.02 : 0.18)
    if (p.life > 0.05) {
      const q = toLayer(p.x, p.y, water, world.dye.size)
      stampBlob(
        world.dye.ctx,
        q.x,
        q.y,
        p.r * (3.4 + (1 - p.life) * 2.2),
        familyColor[p.family],
        0.28 * p.life,
      )
      dyeLive.push(p)
    }
  }
  world.dyes = dyeLive
  cap(world.dyes, 420)

  const sedLive: Sediment[] = []
  for (const s of world.sediment) {
    if (!s.settled && !frozen) {
      s.vy += 140 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vx *= 0.96
      if (s.y >= water.floorCy - 2) {
        s.y = water.floorCy + (Math.random() - 0.4) * water.floorRy * 0.5
        s.settled = true
        s.vx = 0
        s.vy = 0
      }
      containEllipse(s, water.cx, water.floorCy, water.floorRx * 1.15, water.floorRy * 1.4, 0.95)
    } else if (frozen && Math.abs(tilt) > 0.01 && s.settled) {
      s.x += tilt * 12 * dt
      containEllipse(s, water.cx, water.floorCy, water.floorRx, water.floorRy, 0.92)
    }
    s.life -= dt * (s.settled ? 0.012 : 0.04)
    if (s.life > 0.04) {
      const q = toLayer(
        s.x,
        s.y,
        { cx: water.cx, cy: water.floorCy, rx: water.floorRx, ry: water.floorRy },
        world.iron.size,
      )
      stampBlob(world.iron.ctx, q.x, q.y, s.r * 3.2, s.settled ? ink.oxblood : ink.oxbloodWet, 0.22 * s.life)
      sedLive.push(s)
    }
  }
  world.sediment = sedLive

  if (!frozen) {
    world.iron.ctx.fillStyle = 'rgba(0,0,0,0.004)'
    world.iron.ctx.globalCompositeOperation = 'destination-out'
    world.iron.ctx.fillRect(0, 0, world.iron.size, world.iron.size)
    world.iron.ctx.globalCompositeOperation = 'source-over'
  }

  const ripLive: Ripple[] = []
  for (const r of world.ripples) {
    if (!frozen) {
      r.r += r.vr * dt
      r.a -= dt * 0.55
    }
    if (r.a > 0.02 && r.r < water.rx * 1.4) ripLive.push(r)
  }
  world.ripples = ripLive

  const foamLive: Foam[] = []
  for (const f of world.foam) {
    if (!frozen) {
      f.x += f.vx * dt + Math.sin(f.x * 0.08) * fee * 8 * dt
      f.life -= dt * (0.35 + (1 - fee) * 0.25)
    } else {
      f.life -= dt * 0.04
    }
    const wrap = { x: f.x, y: f.y, vx: f.vx, vy: 0 }
    containEllipse(wrap, water.cx, water.cy, water.rx * 0.92, water.ry * 0.92, 0.9)
    f.x = wrap.x
    f.y = wrap.y
    f.vx = wrap.vx
    if (f.life > 0) foamLive.push(f)
  }
  world.foam = foamLive
}

export function hangingRadius(hang: number, fee: number): number {
  return 2.2 + hang * (5.5 + fee * 2)
}

export function stepHang(world: World, dt: number, slotMs: number, held: boolean, reduced: boolean): void {
  if (held || reduced) return
  const period = Math.max(0.22, slotMs / 1000)
  world.hang += dt / period
  if (world.hang > 1) world.hang -= 1
}
