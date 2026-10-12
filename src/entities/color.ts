export type RGBA = number

export const TRANSPARENT: RGBA = 0

export function rgba(r: number, g: number, b: number, a = 255): RGBA {
  return ((((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff)) >>> 0)
}

export function red(c: RGBA): number {
  return (c >>> 24) & 0xff
}

export function green(c: RGBA): number {
  return (c >>> 16) & 0xff
}

export function blue(c: RGBA): number {
  return (c >>> 8) & 0xff
}

export function alpha(c: RGBA): number {
  return c & 0xff
}

export function isTransparent(c: RGBA): boolean {
  return (c & 0xff) === 0
}

export function fromHex(hex: string): RGBA {
  const raw = hex.trim().replace(/^#/, '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : raw
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const a = full.length >= 8 ? parseInt(full.slice(6, 8), 16) : 255
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return TRANSPARENT
  return rgba(r, g, b, a)
}

export function toHex(c: RGBA): string {
  const r = red(c).toString(16).padStart(2, '0')
  const g = green(c).toString(16).padStart(2, '0')
  const b = blue(c).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}
