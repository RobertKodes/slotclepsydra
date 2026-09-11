import { familyColor, ink, rgba } from './palette.ts'
import type { Engine } from './engine.ts'
import type { Layout, WaterGeom } from './geom.ts'
import { hangingRadius, type World } from './fluid.ts'

export type { Layout, WaterGeom }

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
}

function bowlOuter(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { basinCx: cx, basinCy: cy, basinRx: rx, bowlDepth: d } = L
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.98, cy)
  ctx.bezierCurveTo(cx - rx * 1.04, cy + d * 0.48, cx - rx * 0.64, cy + d * 1.02, cx, cy + d)
  ctx.bezierCurveTo(cx + rx * 0.64, cy + d * 1.02, cx + rx * 1.04, cy + d * 0.48, cx + rx * 0.98, cy)
  ctx.closePath()
}

function bowlInnerClip(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { basinCx: cx, basinCy: cy, basinRx: rx, basinRy: ry, bowlDepth: d } = L
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx * 0.9, ry * 0.86, 0, Math.PI, 0, true)
  ctx.bezierCurveTo(cx + rx * 0.92, cy + d * 0.46, cx + rx * 0.56, cy + d * 0.92, cx, cy + d * 0.92)
  ctx.bezierCurveTo(cx - rx * 0.56, cy + d * 0.92, cx - rx * 0.92, cy + d * 0.46, cx - rx * 0.9, cy)
  ctx.closePath()
}

function grain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number,
  color: string,
): void {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const u = hash2(i * 3.1, x + y)
    const v = hash2(i * 7.7, y - x)
    const px = x + u * w
    const py = y + v * h
    const r = 0.4 + hash2(i, px) * 1.3
    ctx.fillRect(px, py, r, r * 0.7)
  }
}

function drawWorkshop(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { w, h } = L
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#161C22')
  bg.addColorStop(0.45, ink.night)
  bg.addColorStop(1, '#080A0C')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const lamp = ctx.createRadialGradient(w * 0.22, h * 0.08, 10, w * 0.22, h * 0.08, Math.max(w, h) * 0.55)
  lamp.addColorStop(0, rgba(ink.candle, 0.14))
  lamp.addColorStop(0.35, rgba(ink.candle, 0.04))
  lamp.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lamp
  ctx.fillRect(0, 0, w, h)

  const cool = ctx.createRadialGradient(w * 0.72, h * 0.7, 20, w * 0.72, h * 0.7, w * 0.5)
  cool.addColorStop(0, rgba(ink.waterHi, 0.05))
  cool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(0,0,0,0.035)'
  for (let i = 0; i < 90; i++) {
    const u = hash2(i, 2.2)
    const v = hash2(i, 8.8)
    ctx.fillRect(u * w, v * h, 1.2, 1.2)
  }
}

function drawPlinth(ctx: CanvasRenderingContext2D, L: Layout): void {
  const x = L.basinCx
  const top = L.plinthY
  const hw = L.basinRx * 1.35
  const h = L.plinthH
  ctx.beginPath()
  ctx.moveTo(x - hw, top)
  ctx.lineTo(x + hw, top)
  ctx.lineTo(x + hw * 0.92, top + h)
  ctx.lineTo(x - hw * 0.92, top + h)
  ctx.closePath()
  const g = ctx.createLinearGradient(x, top, x, top + h)
  g.addColorStop(0, ink.limestoneDark)
  g.addColorStop(0.4, '#4A433A')
  g.addColorStop(1, ink.limestoneDeep)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = rgba(ink.limestone, 0.18)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = rgba(ink.night, 0.35)
  ctx.fillRect(x - hw * 0.7, top + h * 0.35, hw * 1.4, 2)
  grain(ctx, x - hw, top, hw * 2, h, 40, rgba(ink.night, 0.12))
}

function drawStand(ctx: CanvasRenderingContext2D, L: Layout): void {
  const x = L.standX
  const top = L.jarCy - L.jarH * 0.15
  const bot = L.plinthY
  const colW = L.basinRx * 0.16

  ctx.fillStyle = ink.limestoneDeep
  ctx.beginPath()
  ctx.moveTo(x - colW * 0.7, bot)
  ctx.lineTo(x + colW * 0.9, bot)
  ctx.lineTo(x + colW * 0.55, top + 8)
  ctx.lineTo(x - colW * 0.35, top + 8)
  ctx.closePath()
  ctx.fill()

  const stone = ctx.createLinearGradient(x - colW, top, x + colW, bot)
  stone.addColorStop(0, ink.limestoneWet)
  stone.addColorStop(0.5, ink.limestoneDark)
  stone.addColorStop(1, ink.limestoneDeep)
  ctx.fillStyle = stone
  ctx.fill()
  grain(ctx, x - colW, top, colW * 2, bot - top, 28, rgba(ink.night, 0.18))

  ctx.strokeStyle = rgba(ink.limestone, 0.25)
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const yy = top + 18 + i * ((bot - top) / 5)
    ctx.beginPath()
    ctx.moveTo(x - colW * 0.25, yy)
    ctx.lineTo(x + colW * 0.45, yy + 4)
    ctx.stroke()
  }

  ctx.strokeStyle = ink.brass
  ctx.lineWidth = Math.max(3, L.basinRx * 0.03)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + colW * 0.2, top + 10)
  ctx.quadraticCurveTo(x + colW * 1.6, top - 12, L.jarCx - L.jarW * 0.2, L.jarCy - L.jarH * 0.08)
  ctx.stroke()
  ctx.strokeStyle = rgba(ink.verdigris, 0.45)
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.fillStyle = ink.brassDeep
  ctx.beginPath()
  ctx.arc(x + colW * 0.2, top + 10, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawJar(ctx: CanvasRenderingContext2D, L: Layout, fill: number, fee: number): void {
  const x = L.jarCx
  const y = L.jarCy
  const w = L.jarW
  const h = L.jarH

  ctx.beginPath()
  ctx.moveTo(x - w * 0.26, y - h * 0.46)
  ctx.lineTo(x - w * 0.2, y - h * 0.3)
  ctx.bezierCurveTo(x - w * 0.54, y - h * 0.02, x - w * 0.5, y + h * 0.3, x - w * 0.16, y + h * 0.44)
  ctx.lineTo(x + w * 0.16, y + h * 0.44)
  ctx.bezierCurveTo(x + w * 0.5, y + h * 0.3, x + w * 0.54, y - h * 0.02, x + w * 0.2, y - h * 0.3)
  ctx.lineTo(x + w * 0.26, y - h * 0.46)
  ctx.closePath()
  const body = ctx.createLinearGradient(x - w, y, x + w, y)
  body.addColorStop(0, ink.limestoneDeep)
  body.addColorStop(0.35, ink.limestoneWet)
  body.addColorStop(0.55, ink.limestone)
  body.addColorStop(1, ink.limestoneDark)
  ctx.fillStyle = body
  ctx.fill()
  ctx.strokeStyle = rgba(ink.limestoneDeep, 0.8)
  ctx.lineWidth = 1.2
  ctx.stroke()
  grain(ctx, x - w * 0.5, y - h * 0.45, w, h, 36, rgba(ink.night, 0.14))

  ctx.save()
  ctx.clip()
  const waterTop = y - h * 0.18 - fill * 6
  const wg = ctx.createLinearGradient(x, waterTop, x, y + h * 0.4)
  wg.addColorStop(0, rgba(ink.waterSkin, 0.35))
  wg.addColorStop(1, rgba(ink.waterDeep, 0.55))
  ctx.fillStyle = wg
  ctx.fillRect(x - w, waterTop, w * 2, h)
  ctx.restore()

  for (const t of [-0.18, 0.12]) {
    ctx.strokeStyle = ink.brass
    ctx.lineWidth = Math.max(2.5, w * 0.045)
    ctx.beginPath()
    ctx.ellipse(x, y + h * t, w * (0.34 + (t > 0 ? 0.08 : 0)), h * 0.045, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = rgba(ink.verdigris, 0.5)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.fillStyle = ink.limestoneDark
  ctx.beginPath()
  ctx.ellipse(x, y - h * 0.48, w * 0.3, h * 0.05, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ink.brass
  ctx.beginPath()
  ctx.ellipse(x, y - h * 0.52, w * 0.12, h * 0.03, 0, 0, Math.PI * 2)
  ctx.fill()

  const mouth = ctx.createRadialGradient(x - 4, y - h * 0.44, 2, x, y - h * 0.44, w * 0.22)
  mouth.addColorStop(0, rgba(ink.basinWater, 0.65))
  mouth.addColorStop(1, rgba(ink.waterDeep, 0.9))
  ctx.fillStyle = mouth
  ctx.beginPath()
  ctx.ellipse(x, y - h * 0.445, w * 0.2, h * 0.028, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = rgba(ink.candleHot, 0.15 + fee * 0.25)
  ctx.beginPath()
  ctx.ellipse(x, y - h * 0.445, w * 0.08, h * 0.012, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpout(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  fee: number,
  held: boolean,
  hang: number,
  reduced: boolean,
): void {
  const x = L.spoutX
  const y = L.spoutY
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(0.55)
  const len = L.jarW * 0.55
  const r = Math.max(3.5, L.jarW * 0.055)
  const g = ctx.createLinearGradient(0, -r, 0, r)
  g.addColorStop(0, ink.brassBright)
  g.addColorStop(0.45, ink.brass)
  g.addColorStop(1, ink.brassDeep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(0, -r, len, r * 2, r)
  ctx.fill()
  ctx.fillStyle = rgba(ink.verdigris, 0.35)
  ctx.fillRect(len * 0.3, -r, 3, r * 2)

  const glow = ctx.createRadialGradient(len, 0, 0, len, 0, 18 + fee * 22)
  glow.addColorStop(0, rgba(ink.candleHot, 0.55 + fee * 0.4))
  glow.addColorStop(0.35, rgba(ink.candle, 0.25 + fee * 0.35))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(len, 0, 22 + fee * 26, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = held ? ink.brassDeep : ink.waterDeep
  ctx.beginPath()
  ctx.arc(len, 0, r * 0.72, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ink.brassBright
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  const mouthX = x + Math.cos(0.55) * (L.jarW * 0.55)
  const mouthY = y + Math.sin(0.55) * (L.jarW * 0.55)

  if (!held && !reduced) {
    const hr = hangingRadius(hang, fee)
    ctx.fillStyle = rgba(ink.waterSkin, 0.85)
    ctx.beginPath()
    ctx.ellipse(mouthX + 2, mouthY + 4 + hang * 3, hr * 0.72, hr, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(ink.bone, 0.35)
    ctx.beginPath()
    ctx.ellipse(mouthX, mouthY + 2 + hang * 2, hr * 0.25, hr * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  drawStopper(ctx, L, held, mouthX, mouthY)
}

function drawStopper(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  held: boolean,
  mouthX: number,
  mouthY: number,
): void {
  const px = held ? mouthX : L.hangX
  const py = held ? mouthY - 2 : L.hangY

  if (!held) {
    ctx.strokeStyle = rgba(ink.brass, 0.7)
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(mouthX - 4, mouthY)
    ctx.quadraticCurveTo((mouthX + px) / 2, mouthY + 16, px, py - 10)
    ctx.stroke()
  }

  ctx.fillStyle = ink.brass
  ctx.beginPath()
  ctx.arc(px, py, 7.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ink.brassDeep
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.fillStyle = ink.brassDeep
  ctx.beginPath()
  ctx.arc(px, py, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ink.brassBright
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(px, py - 11, 5.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = rgba(ink.candle, held ? 0.55 : 0.08)
  ctx.beginPath()
  ctx.arc(px, py, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawBasinStone(ctx: CanvasRenderingContext2D, L: Layout): void {
  bowlOuter(ctx, L)
  const g = ctx.createLinearGradient(L.basinCx, L.basinCy, L.basinCx, L.basinCy + L.bowlDepth)
  g.addColorStop(0, ink.limestoneWet)
  g.addColorStop(0.35, ink.limestoneDark)
  g.addColorStop(1, ink.limestoneDeep)
  ctx.fillStyle = g
  ctx.fill()

  ctx.save()
  bowlOuter(ctx, L)
  ctx.clip()
  grain(
    ctx,
    L.basinCx - L.basinRx,
    L.basinCy,
    L.basinRx * 2,
    L.bowlDepth,
    70,
    rgba(ink.night, 0.16),
  )
  ctx.strokeStyle = rgba(ink.limestoneDeep, 0.35)
  ctx.lineWidth = 1.2
  for (let i = -3; i <= 3; i++) {
    const t = i / 3
    ctx.beginPath()
    ctx.moveTo(L.basinCx + t * L.basinRx * 0.85, L.basinCy + 8)
    ctx.quadraticCurveTo(
      L.basinCx + t * L.basinRx * 0.7,
      L.basinCy + L.bowlDepth * 0.55,
      L.basinCx + t * L.basinRx * 0.28,
      L.basinCy + L.bowlDepth * 0.92,
    )
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = rgba(ink.night, 0.45)
  ctx.lineWidth = 1.4
  bowlOuter(ctx, L)
  ctx.stroke()
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  water: WaterGeom,
  world: World,
  fee: number,
  now: number,
  reduced: boolean,
): void {
  ctx.save()
  bowlInnerClip(ctx, L)
  ctx.clip()

  const body = ctx.createLinearGradient(water.cx, water.cy - water.ry, water.cx, L.basinCy + L.bowlDepth)
  body.addColorStop(0, rgba(ink.waterSkin, 0.35))
  body.addColorStop(0.18, ink.basinWater)
  body.addColorStop(1, ink.waterDeep)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(water.cx, water.cy, water.rx, water.ry, 0, 0, Math.PI)
  ctx.lineTo(L.basinCx + L.basinRx * 0.7, L.basinCy + L.bowlDepth * 0.92)
  ctx.lineTo(L.basinCx - L.basinRx * 0.7, L.basinCy + L.bowlDepth * 0.92)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ellipse(ctx, water.cx, water.floorCy, water.floorRx * 1.15, water.floorRy * 1.2)
  ctx.clip()
  ctx.globalAlpha = 0.85
  ctx.drawImage(
    world.iron.canvas,
    water.cx - water.floorRx,
    water.floorCy - water.floorRy,
    water.floorRx * 2,
    water.floorRy * 2,
  )
  ctx.restore()

  ctx.save()
  ellipse(ctx, water.cx, water.cy, water.rx, water.ry)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.72
  ctx.drawImage(
    world.dye.canvas,
    water.cx - water.rx,
    water.cy - water.ry,
    water.rx * 2,
    water.ry * 2,
  )
  ctx.restore()

  if (!reduced) {
    ctx.save()
    ellipse(ctx, water.cx, water.cy, water.rx, water.ry)
    ctx.clip()
    ctx.globalCompositeOperation = 'screen'
    const t = now / 900
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(ink.waterSkin, 0.07 + fee * 0.08)
      ctx.lineWidth = 1.2
      ctx.beginPath()
      const y0 = water.cy - water.ry * 0.5 + i * water.ry * 0.4
      ctx.moveTo(water.cx - water.rx, y0)
      for (let x = water.cx - water.rx; x < water.cx + water.rx; x += 8) {
        const yy = y0 + Math.sin(x * 0.05 + t + i) * (2 + fee * 4)
        ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.save()
  ellipse(ctx, water.cx, water.cy, water.rx, water.ry)
  ctx.clip()
  for (const r of world.ripples) {
    ctx.strokeStyle = rgba(ink.foam, r.a * 0.7)
    ctx.lineWidth = 1.1
    ellipse(ctx, r.x, r.y, r.r, r.r * (water.ry / water.rx))
    ctx.stroke()
  }
  for (const f of world.foam) {
    ctx.fillStyle = rgba(ink.foam, 0.35 * f.life)
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  const skin = ctx.createRadialGradient(
    water.cx - water.rx * 0.25,
    water.cy - water.ry * 0.4,
    4,
    water.cx,
    water.cy,
    water.rx,
  )
  skin.addColorStop(0, rgba(ink.foam, 0.12 + fee * 0.1))
  skin.addColorStop(0.45, rgba(ink.waterSkin, 0.12))
  skin.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = skin
  ellipse(ctx, water.cx, water.cy, water.rx, water.ry)
  ctx.fill()

  ctx.strokeStyle = rgba(ink.foam, 0.28 + fee * 0.2)
  ctx.lineWidth = 1.4
  ellipse(ctx, water.cx, water.cy, water.rx, water.ry)
  ctx.stroke()

  ctx.restore()

  drawGraduations(ctx, L)
}

function drawGraduations(ctx: CanvasRenderingContext2D, L: Layout): void {
  ctx.save()
  ctx.strokeStyle = rgba(ink.limestone, 0.28)
  ctx.fillStyle = rgba(ink.bone, 0.35)
  ctx.lineWidth = 1
  ctx.font = `${Math.max(8, L.basinRx * 0.045)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'right'
  for (let i = 1; i <= 6; i++) {
    const t = i / 7
    const y = L.basinCy + t * L.bowlDepth * 0.72
    const w = L.basinRx * (0.82 - t * 0.22)
    ctx.beginPath()
    ctx.moveTo(L.basinCx - w, y)
    ctx.lineTo(L.basinCx - w + 8, y)
    ctx.stroke()
    if (i % 2 === 0) ctx.fillText(String(i), L.basinCx - w - 4, y + 3)
  }
  ctx.restore()
}

function drawRim(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { basinCx: cx, basinCy: cy, basinRx: rx, basinRy: ry } = L
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.ellipse(cx, cy, rx * 0.86, ry * 0.78, 0, 0, Math.PI * 2, true)
  const g = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry)
  g.addColorStop(0, ink.limestone)
  g.addColorStop(0.4, ink.limestoneWet)
  g.addColorStop(1, ink.limestoneDark)
  ctx.fillStyle = g
  ctx.fill('evenodd')

  ctx.strokeStyle = ink.brass
  ctx.lineWidth = Math.max(2.2, rx * 0.018)
  ellipse(ctx, cx, cy, rx * 0.93, ry * 0.88)
  ctx.stroke()
  ctx.strokeStyle = rgba(ink.verdigris, 0.4)
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.strokeStyle = rgba(ink.bone, 0.28)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx * 0.86, ry * 0.78, 0, Math.PI * 1.05, Math.PI * 1.85)
  ctx.stroke()

  ctx.fillStyle = ink.brassDeep
  for (const a of [0.2, 1.1, 2.2, 4.1, 5.2]) {
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * rx * 0.93, cy + Math.sin(a) * ry * 0.88, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawDrops(ctx: CanvasRenderingContext2D, world: World): void {
  for (const d of world.drops) {
    const col = d.failed ? ink.oxbloodWet : familyColor[d.family]
    ctx.fillStyle = rgba(col, 0.9)
    ctx.beginPath()
    ctx.ellipse(d.x, d.y, d.r * 0.7, d.r * 1.15, 0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(ink.bone, 0.4)
    ctx.beginPath()
    ctx.ellipse(d.x - d.r * 0.25, d.y - d.r * 0.35, d.r * 0.22, d.r * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba(col, 0.35)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(d.x - d.vx * 0.02, d.y - d.vy * 0.02)
    ctx.lineTo(d.x, d.y)
    ctx.stroke()
  }
}

function drawOverflow(ctx: CanvasRenderingContext2D, L: Layout, fill: number, fee: number): void {
  if (fill < 0.78) return
  const x = L.basinCx + L.basinRx * 0.72
  const y = L.basinCy + L.basinRy * 0.2
  ctx.fillStyle = ink.brass
  ctx.beginPath()
  ctx.moveTo(x - 8, y)
  ctx.lineTo(x + 10, y + 4)
  ctx.lineTo(x + 6, y + 10)
  ctx.lineTo(x - 10, y + 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(ink.waterSkin, 0.5 + fee * 0.2)
  ctx.beginPath()
  ctx.ellipse(x + 4, y + 14, 2, 5, 0.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawEngraving(ctx: CanvasRenderingContext2D, L: Layout): void {
  ctx.save()
  ctx.fillStyle = rgba(ink.bone, 0.28)
  ctx.font = `${Math.max(9, L.basinRx * 0.055)}px 'Fraunces', serif`
  ctx.textAlign = 'center'
  ctx.fillText('RK · HYD', L.standX + 4, L.plinthY - 10)
  ctx.restore()
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  eng: Engine,
  world: World,
  water: WaterGeom,
  now: number,
): void {
  drawWorkshop(ctx, L)
  drawPlinth(ctx, L)

  ctx.save()
  ctx.translate(L.basinCx, L.basinCy)
  ctx.rotate(eng.tilt)
  ctx.translate(-L.basinCx, -L.basinCy)

  drawStand(ctx, L)
  drawBasinStone(ctx, L)
  drawWater(ctx, L, water, world, eng.fee, now, eng.reduced)
  drawRim(ctx, L)
  drawOverflow(ctx, L, eng.fill, eng.fee)
  drawJar(ctx, L, eng.fill, eng.fee)
  drawSpout(ctx, L, eng.fee, eng.held, world.hang, eng.reduced)
  drawDrops(ctx, world)
  drawEngraving(ctx, L)

  ctx.restore()

  const vig = ctx.createRadialGradient(L.w * 0.4, L.h * 0.45, L.h * 0.2, L.w * 0.5, L.h * 0.5, L.h * 0.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.38)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, L.w, L.h)
}
