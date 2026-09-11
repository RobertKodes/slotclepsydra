export type Layout = {
  w: number
  h: number
  basinCx: number
  basinCy: number
  basinRx: number
  basinRy: number
  bowlDepth: number
  jarCx: number
  jarCy: number
  jarW: number
  jarH: number
  spoutX: number
  spoutY: number
  hangX: number
  hangY: number
  mouthX: number
  mouthY: number
  spoutAng: number
  spoutLen: number
  standX: number
  plinthY: number
  plinthH: number
}

export type WaterGeom = {
  cx: number
  cy: number
  rx: number
  ry: number
  floorCy: number
  floorRx: number
  floorRy: number
}

export function makeLayout(w: number, h: number): Layout {
  const s = Math.min(w, h)
  const mobile = w < 720
  const basinRx = Math.min(s * (mobile ? 0.46 : 0.4), w * 0.42)
  const basinRy = basinRx * 0.36
  const basinCx = mobile ? w * 0.5 : w * 0.38
  const basinCy = mobile ? h * 0.52 : h * 0.58
  const bowlDepth = basinRx * 0.58
  const jarW = basinRx * 0.46
  const jarH = basinRx * 0.7
  const jarCx = basinCx - basinRx * 0.06
  const jarCy = basinCy - bowlDepth * 0.18 - jarH * 0.7
  const spoutAng = 1.12
  const spoutLen = jarW * 0.7
  const spoutX = jarCx + jarW * 0.16
  const spoutY = jarCy + jarH * 0.36
  const mouthX = spoutX + Math.cos(spoutAng) * spoutLen
  const mouthY = spoutY + Math.sin(spoutAng) * spoutLen
  return {
    w,
    h,
    basinCx,
    basinCy,
    basinRx,
    basinRy,
    bowlDepth,
    jarCx,
    jarCy,
    jarW,
    jarH,
    spoutX,
    spoutY,
    hangX: mouthX - 28,
    hangY: mouthY + 10,
    mouthX,
    mouthY,
    spoutAng,
    spoutLen,
    standX: basinCx - basinRx * 1.22,
    plinthY: basinCy + bowlDepth + basinRx * 0.05,
    plinthH: basinRx * 0.14,
  }
}

export function waterGeom(layout: Layout, fill: number): WaterGeom {
  const t = Math.min(1, Math.max(0.18, fill))
  const cx = layout.basinCx
  const cy = layout.basinCy + (1 - t) * layout.bowlDepth * 0.2
  const rx = layout.basinRx * (0.7 + t * 0.16)
  const ry = layout.basinRy * (0.72 + t * 0.16)
  return {
    cx,
    cy,
    rx,
    ry,
    floorCy: layout.basinCy + layout.bowlDepth * 0.78,
    floorRx: layout.basinRx * 0.5,
    floorRy: layout.basinRy * 0.4,
  }
}

export function screenToLocal(
  x: number,
  y: number,
  layout: Layout,
  tilt: number,
): { x: number; y: number } {
  const dx = x - layout.basinCx
  const dy = y - layout.basinCy
  const c = Math.cos(-tilt)
  const s = Math.sin(-tilt)
  return {
    x: layout.basinCx + dx * c - dy * s,
    y: layout.basinCy + dx * s + dy * c,
  }
}

export function hitSpout(layout: Layout, x: number, y: number, held: boolean): boolean {
  const dSpout = (x - layout.mouthX) ** 2 + (y - layout.mouthY) ** 2
  if (dSpout < 32 * 32) return true
  const hx = held ? layout.mouthX : layout.hangX
  const hy = held ? layout.mouthY : layout.hangY
  return (x - hx) ** 2 + (y - hy) ** 2 < 26 * 26
}

export function hitBasin(layout: Layout, x: number, y: number): boolean {
  const dx = x - layout.basinCx
  const top = layout.basinCy - layout.basinRy * 1.4
  const bot = layout.basinCy + layout.bowlDepth + 12
  if (y < top || y > bot) return false
  return Math.abs(dx) < layout.basinRx * 1.15
}
