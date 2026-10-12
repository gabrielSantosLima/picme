import { fromHex, toHex, type RGBA } from '../../entities/color'

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

function indexToChar(index: number): string {
  if (index < 10) return String(index)
  return String.fromCharCode(97 + Math.min(index - 10, 25))
}

export function encodeGrid(
  pixels: Uint32Array,
  width: number,
  height: number,
): { palette: string[]; grid: string[] } {
  const indexByColor = new Map<number, number>()
  const palette: string[] = []
  const grid: string[] = []
  for (let y = 0; y < height; y += 1) {
    let row = ''
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x]
      if (color === 0) {
        row += '.'
        continue
      }
      let index = indexByColor.get(color)
      if (index === undefined) {
        index = palette.length
        indexByColor.set(color, index)
        palette.push(toHex(color))
      }
      row += indexToChar(index)
    }
    grid.push(row)
  }
  return { palette, grid }
}
