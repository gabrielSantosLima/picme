import type { PixelGrid } from '../PixelGrid'
import type { Palette } from './palette'

export function gridToAscii(grid: PixelGrid, palette: Palette): string {
  const reverse = new Map<number, string>()
  for (const [key, color] of palette) {
    if (color === 0 || reverse.has(color)) continue
    reverse.set(color, key)
  }
  const rows: string[] = []
  for (let y = 0; y < grid.height; y += 1) {
    let row = ''
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.data[y * grid.width + x]
      row += color === 0 ? '.' : (reverse.get(color) ?? '?')
    }
    rows.push(row)
  }
  return rows.join('\n')
}
