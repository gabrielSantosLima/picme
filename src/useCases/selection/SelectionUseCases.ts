import { alpha, blue, green, red, type RGBA } from '../../entities/color'
import type { Point, Rect } from '../../entities/geometry'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import type { SelectionRepository } from '../../services/selection/SelectionRepository'

function pointInPolygon(x: number, y: number, points: Point[]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function matches(a: RGBA, b: RGBA, tolerance: number): boolean {
  return (
    Math.abs(red(a) - red(b)) <= tolerance &&
    Math.abs(green(a) - green(b)) <= tolerance &&
    Math.abs(blue(a) - blue(b)) <= tolerance &&
    Math.abs(alpha(a) - alpha(b)) <= tolerance
  )
}

function maskBounds(mask: Uint8Array, width: number, height: number): Rect | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export class SelectRectangle {
  constructor(private readonly selection: SelectionRepository) {}

  execute(from: Point, to: Point, width: number, height: number): void {
    const mask = new Uint8Array(width * height)
    const minX = Math.max(0, Math.min(from.x, to.x))
    const maxX = Math.min(width - 1, Math.max(from.x, to.x))
    const minY = Math.max(0, Math.min(from.y, to.y))
    const maxY = Math.min(height - 1, Math.max(from.y, to.y))
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) mask[y * width + x] = 1
    }
    this.selection.setMask(mask, width, height)
  }
}

export class SelectLasso {
  constructor(private readonly selection: SelectionRepository) {}

  execute(points: Point[], width: number, height: number): void {
    if (points.length < 3) {
      this.selection.clearMask()
      return
    }
    const mask = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pointInPolygon(x, y, points)) mask[y * width + x] = 1
      }
    }
    this.selection.setMask(mask, width, height)
  }
}

export class SelectMagicWand {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(x: number, y: number, tolerance: number): void {
    const grid = this.document.getProject().activeFrame.activeLayer?.grid
    if (!grid || !grid.inBounds(x, y)) {
      this.selection.clearMask()
      return
    }
    const target = grid.get(x, y)
    const mask = new Uint8Array(grid.width * grid.height)
    const stack: number[] = [grid.index(x, y)]
    const visited = new Uint8Array(grid.data.length)
    while (stack.length > 0) {
      const index = stack.pop() as number
      if (visited[index]) continue
      visited[index] = 1
      if (!matches(grid.data[index], target, tolerance)) continue
      mask[index] = 1
      const cx = index % grid.width
      if (cx > 0) stack.push(index - 1)
      if (cx < grid.width - 1) stack.push(index + 1)
      if (index - grid.width >= 0) stack.push(index - grid.width)
      if (index + grid.width < grid.data.length) stack.push(index + grid.width)
    }
    this.selection.setMask(mask, grid.width, grid.height)
  }
}

export class DeleteSelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(): void {
    const mask = this.selection.getMask()
    if (!mask) return
    this.document.commit((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (let i = 0; i < mask.length; i += 1) {
        if (mask[i]) grid.data[i] = 0
      }
    })
  }
}

export class FillSelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
    private readonly color: RGBA,
  ) {}

  execute(): void {
    const mask = this.selection.getMask()
    if (!mask) return
    this.document.commit((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (let i = 0; i < mask.length; i += 1) {
        if (mask[i]) grid.data[i] = this.color
      }
    })
  }
}

export class CopySelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(): void {
    const mask = this.selection.getMask()
    if (!mask) return
    const { width, height } = this.selection.getSize()
    const bounds = maskBounds(mask, width, height)
    if (!bounds) return
    const grid = this.document.getProject().activeFrame.activeLayer?.grid
    if (!grid) return
    const data = new Uint32Array(bounds.width * bounds.height)
    for (let y = 0; y < bounds.height; y += 1) {
      for (let x = 0; x < bounds.width; x += 1) {
        const sx = bounds.x + x
        const sy = bounds.y + y
        if (mask[sy * width + sx]) data[y * bounds.width + x] = grid.get(sx, sy)
      }
    }
    this.selection.setClipboard({ data, width: bounds.width, height: bounds.height })
  }
}

export class PasteSelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(): void {
    const clipboard = this.selection.getClipboard()
    if (!clipboard) return
    const mask = this.selection.getMask()
    const size = this.selection.getSize()
    const bounds = mask && size.width > 0 ? maskBounds(mask, size.width, size.height) : null
    const originX = bounds?.x ?? 0
    const originY = bounds?.y ?? 0
    this.document.commit((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (let y = 0; y < clipboard.height; y += 1) {
        for (let x = 0; x < clipboard.width; x += 1) {
          const color = clipboard.data[y * clipboard.width + x]
          if (color === 0) continue
          grid.set(originX + x, originY + y, color)
        }
      }
    })
  }
}

export class BeginMoveSelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(): void {
    const mask = this.selection.getMask()
    if (!mask) return
    const { width, height } = this.selection.getSize()
    const bounds = maskBounds(mask, width, height)
    if (!bounds) return

    this.document.beginStroke()
    const buffer = new Uint32Array(bounds.width * bounds.height)
    this.document.update((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (let y = 0; y < bounds.height; y += 1) {
        for (let x = 0; x < bounds.width; x += 1) {
          const sx = bounds.x + x
          const sy = bounds.y + y
          if (!mask[sy * width + sx]) continue
          buffer[y * bounds.width + x] = grid.get(sx, sy)
          grid.set(sx, sy, 0)
        }
      }
    })
    this.selection.setFloating({
      data: buffer,
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    })
    this.selection.clearMask()
  }
}

export class MoveSelection {
  constructor(private readonly selection: SelectionRepository) {}

  execute(x: number, y: number): void {
    this.selection.moveFloating(x, y)
  }
}

export class DropSelection {
  constructor(
    private readonly document: DocumentRepository,
    private readonly selection: SelectionRepository,
  ) {}

  execute(): void {
    const floating = this.selection.getFloating()
    if (!floating) return
    this.document.update((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (let y = 0; y < floating.height; y += 1) {
        for (let x = 0; x < floating.width; x += 1) {
          const color = floating.data[y * floating.width + x]
          if (color === 0) continue
          grid.set(floating.x + x, floating.y + y, color)
        }
      }
    })
    this.document.endStroke()
    this.selection.setFloating(null)
  }
}
