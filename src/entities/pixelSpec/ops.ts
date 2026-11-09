import type { PixelGrid } from '../PixelGrid'
import type { PixelIssue, PixelOp } from './types'
import type { Palette } from './palette'

type RawOp = Record<string, unknown>

function readNumber(
  op: RawOp,
  field: string,
  issues: PixelIssue[],
  frame: string,
  opName: string,
  integer = true,
): number | null {
  const value = op[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({
      code: 'op-field',
      message: `${opName}.${field} must be a number`,
      frame,
      op: opName,
    })
    return null
  }
  return integer ? Math.trunc(value) : value
}

function readOptionalNumber(
  op: RawOp,
  field: string,
  fallback: number,
  issues: PixelIssue[],
  frame: string,
  opName: string,
): number {
  if (op[field] === undefined) return fallback
  return readNumber(op, field, issues, frame, opName) ?? fallback
}

function readKey(
  op: RawOp,
  field: string,
  palette: Palette,
  issues: PixelIssue[],
  frame: string,
  opName: string,
): string | null {
  const value = op[field]
  if (typeof value !== 'string' || !palette.has(value)) {
    issues.push({
      code: 'op-color',
      message: `${opName}.${field} must be a palette key; valid keys: ${[...palette.keys()].join('')}`,
      frame,
      op: opName,
    })
    return null
  }
  return value
}

function mirrorX(grid: PixelGrid): void {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < Math.floor(grid.width / 2); x += 1) {
      grid.set(grid.width - 1 - x, y, grid.get(x, y))
    }
  }
}

function mirrorY(grid: PixelGrid): void {
  for (let y = 0; y < Math.floor(grid.height / 2); y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      grid.set(x, grid.height - 1 - y, grid.get(x, y))
    }
  }
}

function outline(grid: PixelGrid, color: number): void {
  const opaque = new Uint8Array(grid.width * grid.height)
  for (let index = 0; index < grid.data.length; index += 1) {
    opaque[index] = grid.data[index] !== 0 ? 1 : 0
  }
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (opaque[y * grid.width + x]) continue
      const hasNeighbor =
        (y > 0 && opaque[(y - 1) * grid.width + x]) ||
        (y < grid.height - 1 && opaque[(y + 1) * grid.width + x]) ||
        (x > 0 && opaque[y * grid.width + x - 1]) ||
        (x < grid.width - 1 && opaque[y * grid.width + x + 1])
      if (hasNeighbor) grid.set(x, y, color)
    }
  }
}

function rect(grid: PixelGrid, x0: number, y0: number, w: number, h: number, color: number): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      grid.set(x, y, color)
    }
  }
}

function line(
  grid: PixelGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
): void {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let error = dx + dy
  for (;;) {
    grid.set(x, y, color)
    if (x === x1 && y === y1) break
    const doubled = 2 * error
    if (doubled >= dy) {
      error += dy
      x += sx
    }
    if (doubled <= dx) {
      error += dx
      y += sy
    }
  }
}

function ellipse(
  grid: PixelGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
): void {
  if (rx <= 0 || ry <= 0) return
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const nx = (x + 0.5 - cx) / rx
      const ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny <= 1) grid.set(x, y, color)
    }
  }
}

function floodFill(grid: PixelGrid, x: number, y: number, color: number): void {
  if (!grid.inBounds(x, y)) return
  const target = grid.get(x, y)
  if (target === color) return
  const stack: Array<[number, number]> = [[x, y]]
  const seen = new Set<number>()
  while (stack.length > 0) {
    const [currentX, currentY] = stack.pop() as [number, number]
    if (!grid.inBounds(currentX, currentY)) continue
    const index = currentY * grid.width + currentX
    if (seen.has(index)) continue
    if (grid.data[index] !== target) continue
    seen.add(index)
    grid.set(currentX, currentY, color)
    stack.push([currentX + 1, currentY])
    stack.push([currentX - 1, currentY])
    stack.push([currentX, currentY + 1])
    stack.push([currentX, currentY - 1])
  }
}

function replace(grid: PixelGrid, from: number, to: number): void {
  if (from === to) return
  for (let index = 0; index < grid.data.length; index += 1) {
    if (grid.data[index] === from) grid.data[index] = to
  }
}

function shift(grid: PixelGrid, dx: number, dy: number): void {
  const next = new Uint32Array(grid.data.length)
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const nextX = x + dx
      const nextY = y + dy
      if (nextX < 0 || nextY < 0 || nextX >= grid.width || nextY >= grid.height) continue
      next[nextY * grid.width + nextX] = grid.data[y * grid.width + x]
    }
  }
  grid.data.set(next)
}

function dither(
  grid: PixelGrid,
  raw: RawOp,
  palette: Palette,
  issues: PixelIssue[],
  frame: string,
): void {
  const x0 = readOptionalNumber(raw, 'x', 0, issues, frame, 'dither')
  const y0 = readOptionalNumber(raw, 'y', 0, issues, frame, 'dither')
  const width = readOptionalNumber(raw, 'w', grid.width, issues, frame, 'dither')
  const height = readOptionalNumber(raw, 'h', grid.height, issues, frame, 'dither')
  const aKey = readKey(raw, 'a', palette, issues, frame, 'dither')
  const bKey = readKey(raw, 'b', palette, issues, frame, 'dither')
  const fromKey = raw.from === undefined ? null : readKey(raw, 'from', palette, issues, frame, 'dither')
  if (aKey === null || bKey === null) return
  if (raw.from !== undefined && fromKey === null) return

  const a = palette.get(aKey) ?? 0
  const b = palette.get(bKey) ?? 0
  const source = fromKey === null ? null : (palette.get(fromKey) ?? 0)
  const pattern = raw.pattern ?? 'checker'
  if (pattern !== 'checker' && (typeof pattern !== 'number' || pattern < 0 || pattern > 100)) {
    issues.push({
      code: 'op-field',
      message: 'dither.pattern must be "checker" or a number from 0 to 100',
      frame,
      op: 'dither',
    })
    return
  }

  for (let y = y0; y < Math.min(y0 + height, grid.height); y += 1) {
    for (let x = x0; x < Math.min(x0 + width, grid.width); x += 1) {
      const current = grid.get(x, y)
      if (current === 0) continue
      if (source !== null && current !== source) continue
      let useA: boolean
      if (pattern === 'checker') {
        useA = (x + y) % 2 === 0
      } else {
        const seed = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100
        useA = seed < pattern
      }
      grid.set(x, y, useA ? a : b)
    }
  }
}

export function applyOps(
  grid: PixelGrid,
  ops: PixelOp[],
  palette: Palette,
  issues: PixelIssue[],
  frame: string,
): void {
  for (const rawOp of ops) {
    if (!rawOp || typeof rawOp !== 'object') {
      issues.push({ code: 'op-invalid', message: 'each op must be an object', frame })
      continue
    }
    const raw = rawOp as RawOp
    const name = raw.op
    if (typeof name !== 'string') {
      issues.push({ code: 'op-missing', message: 'op is missing a "op" name', frame })
      continue
    }
    switch (name) {
      case 'mirror_x':
        mirrorX(grid)
        break
      case 'mirror_y':
        mirrorY(grid)
        break
      case 'outline': {
        const key = readKey(raw, 'color', palette, issues, frame, 'outline')
        if (key !== null) outline(grid, palette.get(key) ?? 0)
        break
      }
      case 'rect': {
        const x = readNumber(raw, 'x', issues, frame, 'rect')
        const y = readNumber(raw, 'y', issues, frame, 'rect')
        const w = readNumber(raw, 'w', issues, frame, 'rect')
        const h = readNumber(raw, 'h', issues, frame, 'rect')
        const key = readKey(raw, 'color', palette, issues, frame, 'rect')
        if (x !== null && y !== null && w !== null && h !== null && key !== null) {
          rect(grid, x, y, w, h, palette.get(key) ?? 0)
        }
        break
      }
      case 'line': {
        const x0 = readNumber(raw, 'x0', issues, frame, 'line')
        const y0 = readNumber(raw, 'y0', issues, frame, 'line')
        const x1 = readNumber(raw, 'x1', issues, frame, 'line')
        const y1 = readNumber(raw, 'y1', issues, frame, 'line')
        const key = readKey(raw, 'color', palette, issues, frame, 'line')
        if (x0 !== null && y0 !== null && x1 !== null && y1 !== null && key !== null) {
          line(grid, x0, y0, x1, y1, palette.get(key) ?? 0)
        }
        break
      }
      case 'ellipse': {
        const cx = readNumber(raw, 'cx', issues, frame, 'ellipse', false)
        const cy = readNumber(raw, 'cy', issues, frame, 'ellipse', false)
        const rx = readNumber(raw, 'rx', issues, frame, 'ellipse', false)
        const ry = readNumber(raw, 'ry', issues, frame, 'ellipse', false)
        const key = readKey(raw, 'color', palette, issues, frame, 'ellipse')
        if (cx !== null && cy !== null && rx !== null && ry !== null && key !== null) {
          ellipse(grid, cx, cy, rx, ry, palette.get(key) ?? 0)
        }
        break
      }
      case 'flood_fill': {
        const x = readNumber(raw, 'x', issues, frame, 'flood_fill')
        const y = readNumber(raw, 'y', issues, frame, 'flood_fill')
        const key = readKey(raw, 'color', palette, issues, frame, 'flood_fill')
        if (x !== null && y !== null && key !== null) {
          floodFill(grid, x, y, palette.get(key) ?? 0)
        }
        break
      }
      case 'replace': {
        const fromKey = readKey(raw, 'from', palette, issues, frame, 'replace')
        const toKey = readKey(raw, 'to', palette, issues, frame, 'replace')
        if (fromKey !== null && toKey !== null) {
          replace(grid, palette.get(fromKey) ?? 0, palette.get(toKey) ?? 0)
        }
        break
      }
      case 'shift': {
        const dx = readNumber(raw, 'dx', issues, frame, 'shift')
        const dy = readNumber(raw, 'dy', issues, frame, 'shift')
        if (dx !== null && dy !== null) shift(grid, dx, dy)
        break
      }
      case 'dither':
        dither(grid, raw, palette, issues, frame)
        break
      default:
        issues.push({
          code: 'op-unknown',
          message: `unknown op "${name}"; valid ops: mirror_x, mirror_y, outline, rect, line, ellipse, flood_fill, replace, shift, dither`,
          frame,
          op: name,
        })
    }
  }
}
