import type { Family } from './palette.ts'
import { laneAt } from './programs.ts'
import {
  feeNorm,
  pressureFee,
  RpcPool,
  rpcEndpoints,
  sampleTps,
  wireName,
  type AddressSig,
} from './rpc.ts'

export type DyeJob = {
  family: Family
  failed: boolean
  slot: number
  sig: string
}

export type Engine = {
  rpc: RpcPool
  slot: number
  slotAt: number
  slotMs: number
  tps: number | null
  feeMicro: number | null
  fee: number
  fill: number
  wire: string
  live: boolean
  held: boolean
  queue: DyeJob[]
  reduced: boolean
  stains: number
  tilt: number
  tiltV: number
  dragging: boolean
}

const SEEN_CAP = 900
const TPS_REF = 4200

export function createEngine(reduced: boolean): Engine {
  const rpc = new RpcPool(rpcEndpoints())
  return {
    rpc,
    slot: 0,
    slotAt: performance.now(),
    slotMs: 400,
    tps: null,
    feeMicro: null,
    fee: 0.08,
    fill: 0.42,
    wire: wireName(rpc.url),
    live: false,
    held: false,
    queue: [],
    reduced,
    stains: 0,
    tilt: 0,
    tiltV: 0,
    dragging: false,
  }
}

export function displayedSlot(eng: Engine, now: number): number {
  if (eng.held || !eng.slot) return eng.slot
  const coast = Math.min((now - eng.slotAt) / eng.slotMs, 1.4)
  return eng.slot + coast
}

export function targetFill(tps: number | null): number {
  if (tps == null) return 0.42
  const n = Math.min(1, Math.max(0, tps / TPS_REF))
  return 0.28 + n * 0.52
}

export function stepFill(eng: Engine, dt: number): void {
  const goal = targetFill(eng.tps)
  const k = eng.held ? 0.08 : 0.55
  eng.fill += (goal - eng.fill) * Math.min(1, dt * k)
}

export function stepTilt(eng: Engine, dt: number): void {
  if (eng.dragging) return
  const spring = 14
  const damp = 8
  eng.tiltV += (-spring * eng.tilt - damp * eng.tiltV) * dt
  eng.tilt += eng.tiltV * dt
  if (Math.abs(eng.tilt) < 0.0004 && Math.abs(eng.tiltV) < 0.002) {
    eng.tilt = 0
    eng.tiltV = 0
  }
}

const seen = new Set<string>()
const seenOrder: string[] = []

function remember(sig: string): boolean {
  if (seen.has(sig)) return false
  seen.add(sig)
  seenOrder.push(sig)
  if (seenOrder.length > SEEN_CAP) {
    const old = seenOrder.shift()
    if (old) seen.delete(old)
  }
  return true
}

function enqueue(eng: Engine, sigs: AddressSig[], family: Family): void {
  for (const s of sigs) {
    if (!remember(s.signature)) continue
    eng.queue.push({
      family,
      failed: s.err != null,
      slot: s.slot,
      sig: s.signature,
    })
    if (s.err != null) eng.stains += 1
  }
  if (eng.queue.length > 240) eng.queue.splice(0, eng.queue.length - 240)
}

export async function pollSlot(eng: Engine, signal: AbortSignal): Promise<void> {
  try {
    const slot = await eng.rpc.getSlot(signal)
    eng.wire = wireName(eng.rpc.url)
    eng.live = true
    if (slot > eng.slot) {
      eng.slot = slot
      eng.slotAt = performance.now()
    }
  } catch {
    eng.live = false
    eng.wire = `${wireName(eng.rpc.url)} · cold`
  }
}

export async function pollMeter(eng: Engine, signal: AbortSignal): Promise<void> {
  try {
    const [perf, fees] = await Promise.all([eng.rpc.getPerf(signal), eng.rpc.getFees(signal)])
    const t = sampleTps(perf)
    if (t) {
      eng.tps = t.tps
      eng.slotMs = Math.min(800, Math.max(280, t.slotMs))
    }
    const med = pressureFee(fees)
    if (med != null) {
      eng.feeMicro = med
      eng.fee = feeNorm(med)
    }
    eng.live = true
    eng.wire = wireName(eng.rpc.url)
  } catch {
    eng.live = false
  }
}

let lane = 0
let blockFails = 0

export async function pollDyes(eng: Engine, signal: AbortSignal): Promise<void> {
  if (eng.held) return
  const laneDef = laneAt(lane++)
  try {
    const sigs = await eng.rpc.getSigs(laneDef.id, signal)
    enqueue(eng, sigs, laneDef.family)
    eng.live = true
    eng.wire = wireName(eng.rpc.url)
  } catch {
    eng.live = false
  }

  if (blockFails < 6 && eng.slot > 0 && lane % 4 === 0) {
    try {
      const block = await eng.rpc.getBlockSigs(Math.max(0, eng.slot - 2), signal)
      const n = block.signatures?.length ?? 0
      const extra = Math.min(18, Math.floor(n / 220))
      for (let i = 0; i < extra; i++) {
        eng.queue.push({
          family: 'other',
          failed: false,
          slot: eng.slot,
          sig: `blk-${eng.slot}-${i}`,
        })
      }
    } catch {
      blockFails += 1
    }
  }
}

export function takeDye(eng: Engine): DyeJob | null {
  if (eng.held) return null
  return eng.queue.shift() ?? null
}

export function formatFee(micro: number | null, norm: number): string {
  if (micro == null) return norm > 0.2 ? 'inferred' : 'idle'
  if (micro <= 0) return 'idle · 0 µL'
  if (micro >= 1_000_000) return `${(micro / 1_000_000).toFixed(1)}M µL`
  if (micro >= 1000) return `${(micro / 1000).toFixed(1)}k µL`
  return `${Math.round(micro)} µL`
}

export function formatTps(tps: number | null): string {
  if (tps == null) return '— tx/s'
  if (tps >= 1000) return `${(tps / 1000).toFixed(1)}k tx/s`
  return `${Math.round(tps)} tx/s`
}

export function formatSlot(slot: number): string {
  if (!slot) return '—'
  return slot.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
