import { fromHex, type RGBA } from './color'

export function paletteIndex(char: string | undefined): number {
  if (!char || char === '.' || char === ' ') return -1
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48
  if (code >= 97 && code <= 122) return code - 97 + 10
  if (code >= 65 && code <= 90) return code - 65 + 10
  return -1
}

export function paletteColors(palette: string[]): RGBA[] {
  return palette.map((entry) => (entry && entry.length > 0 ? fromHex(entry) : 0))
}

export function rowColor(row: string, colors: RGBA[], x: number): RGBA {
  const index = paletteIndex(row[x])
  if (index < 0 || index >= colors.length) return 0
  return colors[index]
}
