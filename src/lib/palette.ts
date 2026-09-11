/** Named tokens — keep in sync with README. */

export const ink = {
  night: '#101418',
  slate: '#1C2228',
  slateLift: '#2A323A',
  limestone: '#B7A994',
  limestoneWet: '#8C8070',
  limestoneDark: '#5C5348',
  limestoneDeep: '#3A342C',
  basinWater: '#16323C',
  waterDeep: '#0B1C24',
  waterHi: '#2A5A64',
  waterSkin: '#4A7A82',
  verdigris: '#3F6F62',
  verdigrisBright: '#5A8F7A',
  brass: '#C4A05A',
  brassDeep: '#7A5A28',
  brassWet: '#A88440',
  brassBright: '#E0C07A',
  candle: '#E8A03A',
  candleHot: '#F3C56B',
  oxblood: '#7A1E28',
  oxbloodWet: '#9A2834',
  iron: '#3A1418',
  foam: '#D8E4E0',
  bone: '#E6DDCC',
} as const

export type Family = 'system' | 'token' | 'compute' | 'dex' | 'stake' | 'other'

export const familyColor: Record<Family, string> = {
  system: '#D9D0BC',
  token: '#4F9EA3',
  compute: '#8B9A5C',
  dex: '#C45A32',
  stake: '#6B5344',
  other: '#4E6A7A',
}

export const familyLabel: Record<Family, string> = {
  system: 'system',
  token: 'token',
  compute: 'cu',
  dex: 'dex',
  stake: 'stake',
  other: 'other',
}

export function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
