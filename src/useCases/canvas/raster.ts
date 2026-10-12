import type { Point } from '../../entities/geometry'

export type PointTuple = [number, number]

export type ShapeKind = 'line' | 'rectangle' | 'ellipse'

export function rasterLine(x0: number, y0: number, x1: number, y1: number): PointTuple[] {
  const points: PointTuple[] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    points.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return points
}

export function rasterRectangle(from: Point, to: Point, filled: boolean): PointTuple[] {
  const minX = Math.min(from.x, to.x)
  const maxX = Math.max(from.x, to.x)
  const minY = Math.min(from.y, to.y)
  const maxY = Math.max(from.y, to.y)
  const points: PointTuple[] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) points.push([x, y])
    }
  }
  return points
}

export function rasterEllipse(from: Point, to: Point, filled: boolean): PointTuple[] {
  const minX = Math.min(from.x, to.x)
  const maxX = Math.max(from.x, to.x)
  const minY = Math.min(from.y, to.y)
  const maxY = Math.max(from.y, to.y)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const rx = (maxX - minX) / 2
  const ry = (maxY - minY) / 2
  const inside = (x: number, y: number): boolean => {
    if (rx === 0 || ry === 0) return true
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    return nx * nx + ny * ny <= 1
  }
  const points: PointTuple[] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!inside(x, y)) continue
      if (filled) {
        points.push([x, y])
        continue
      }
      const edge =
        !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
      if (edge) points.push([x, y])
    }
  }
  return points
}

export function rasterizeShape(
  kind: ShapeKind,
  from: Point,
  to: Point,
  filled: boolean,
): PointTuple[] {
  if (kind === 'line') return rasterLine(from.x, from.y, to.x, to.y)
  if (kind === 'rectangle') return rasterRectangle(from, to, filled)
  return rasterEllipse(from, to, filled)
}
