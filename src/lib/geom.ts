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
  const basinRx = Math.min(s * (mobile ? 0.4 : 0.34), w * 0.38)
  const basinRy = basinRx * 0.34
  const basinCx = mobile ? w * 0.5 : w * 0.39
  const basinCy = mobile ? h * 0.5 : h * 0.56
  const bowlDepth = basinRx * 0.64
  const jarW = basinRx * 0.5
  const jarH = basinRx * 0.78
  const jarCx = basinCx - basinRx * 0.02
  const jarCy = basinCy - bowlDepth * 0.22 - jarH * 0.72
  const spoutX = jarCx + jarW * 0.28
  const spoutY = jarCy + jarH * 0.4
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
    hangX: spoutX - 22,
    hangY: spoutY + 18,
    standX: basinCx - basinRx * 1.18,
    plinthY: basinCy + bowlDepth + basinRx * 0.06,
    plinthH: basinRx * 0.16,
  }
}

export function waterGeom(layout: Layout, fill: number): WaterGeom {
  const t = Math.min(1, Math.max(0.12, fill))
  const cx = layout.basinCx
  const cy = layout.basinCy + (1 - t) * layout.bowlDepth * 0.42
  const rx = layout.basinRx * (0.58 + t * 0.3)
  const ry = layout.basinRy * (0.58 + t * 0.3)
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
  const sx = layout.spoutX + 4
  const sy = layout.spoutY + 8
  const dSpout = (x - sx) ** 2 + (y - sy) ** 2
  if (dSpout < 30 * 30) return true
  const hx = held ? sx : layout.hangX
  const hy = held ? sy : layout.hangY
  return (x - hx) ** 2 + (y - hy) ** 2 < 26 * 26
}

export function hitBasin(layout: Layout, x: number, y: number): boolean {
  const dx = x - layout.basinCx
  const top = layout.basinCy - layout.basinRy * 1.4
  const bot = layout.basinCy + layout.bowlDepth + 12
  if (y < top || y > bot) return false
  return Math.abs(dx) < layout.basinRx * 1.15
}
