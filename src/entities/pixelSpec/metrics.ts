import { toHex } from '../color'
import type { PixelGrid } from '../PixelGrid'
import type { FrameMetrics } from './types'

export function metricsForGrid(grid: PixelGrid): FrameMetrics {
  const counts: Record<string, number> = {}
  const colors = new Set<string>()
  let occupied = 0
  let minX = grid.width
  let minY = grid.height
  let maxX = -1
  let maxY = -1
  let orphans = 0

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.data[y * grid.width + x]
      const key = color === 0 ? '.' : toHex(color)
      counts[key] = (counts[key] ?? 0) + 1
      if (color === 0) continue
      occupied += 1
      colors.add(key)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      if (
        grid.get(x + 1, y) === 0 &&
        grid.get(x - 1, y) === 0 &&
        grid.get(x, y + 1) === 0 &&
        grid.get(x, y - 1) === 0
      ) {
        orphans += 1
      }
    }
  }

  let same = 0
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.data[y * grid.width + x] === grid.data[y * grid.width + (grid.width - 1 - x)]) {
        same += 1
      }
    }
  }

  const bbox: [number, number, number, number] | null =
    occupied > 0 ? [minX, minY, maxX, maxY] : null
  const warnings: string[] = []
  if (occupied === 0) warnings.push('frame is empty')
  if (orphans > 0) warnings.push(`${orphans} orphan pixel(s)`)
  if (bbox) {
    if (bbox[0] === 0 || bbox[1] === 0 || bbox[2] === grid.width - 1 || bbox[3] === grid.height - 1) {
      warnings.push('bounding box touches a canvas edge')
    }
  }
  if (colors.size > 16) warnings.push(`${colors.size} colors; keep to 16 or fewer`)

  return {
    size: [grid.width, grid.height],
    bbox,
    occupied_pixels: occupied,
    occupancy: grid.width * grid.height > 0 ? Number((occupied / (grid.width * grid.height)).toFixed(4)) : 0,
    colors: colors.size,
    pixel_counts: counts,
    orphan_pixels: orphans,
    vertical_symmetry: grid.width * grid.height > 0 ? Number((same / (grid.width * grid.height)).toFixed(4)) : 0,
    warnings,
  }
}
