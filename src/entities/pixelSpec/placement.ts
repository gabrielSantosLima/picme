import type { PixelIssue, Placement } from './types'

export interface CanvasBounds {
  width: number
  height: number
}

const ANCHORS = new Set([
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
])

function issue(message: string): PixelIssue {
  return { code: 'placement', message }
}

function horizontal(anchor: string, canvasWidth: number, width: number): number {
  if (anchor.endsWith('left')) return 0
  if (anchor.endsWith('right')) return canvasWidth - width
  return Math.floor((canvasWidth - width) / 2)
}

function vertical(anchor: string, canvasHeight: number, height: number): number {
  if (anchor.startsWith('top')) return 0
  if (anchor.startsWith('bottom')) return canvasHeight - height
  return Math.floor((canvasHeight - height) / 2)
}

export function resolvePlacement(
  size: [number, number],
  canvas: CanvasBounds,
  placement: Placement | undefined,
): { x: number; y: number; issues: PixelIssue[] } {
  const [width, height] = size
  const issues: PixelIssue[] = []
  const value = placement ?? { anchor: 'center' }

  const hasCoordinates = value.x !== undefined || value.y !== undefined
  const hasAnchor = value.anchor !== undefined || value.offsetX !== undefined || value.offsetY !== undefined

  if (hasCoordinates && hasAnchor) {
    return { x: 0, y: 0, issues: [issue('use either x/y or anchor/offset, not both')] }
  }

  if (hasCoordinates) {
    if (!Number.isInteger(value.x) || !Number.isInteger(value.y)) {
      return { x: 0, y: 0, issues: [issue('placement.x and placement.y must both be integers')] }
    }
    const x = value.x as number
    const y = value.y as number
    if (x < 0 || y < 0 || x + width > canvas.width || y + height > canvas.height) {
      return { x: 0, y: 0, issues: [issue('placement is outside the canvas bounds')] }
    }
    return { x, y, issues }
  }

  const anchor = value.anchor ?? 'center'
  if (!ANCHORS.has(anchor)) {
    return { x: 0, y: 0, issues: [issue(`unknown anchor "${anchor}"`)] }
  }
  const offsetX = value.offsetX ?? 0
  const offsetY = value.offsetY ?? 0
  if (!Number.isInteger(offsetX) || !Number.isInteger(offsetY)) {
    return { x: 0, y: 0, issues: [issue('placement offsets must be integers')] }
  }
  if (width > canvas.width || height > canvas.height) {
    return { x: 0, y: 0, issues: [issue('sprite is larger than the canvas')] }
  }

  const x = horizontal(anchor, canvas.width, width) + offsetX
  const y = vertical(anchor, canvas.height, height) + offsetY
  if (x < 0 || y < 0 || x + width > canvas.width || y + height > canvas.height) {
    return { x: 0, y: 0, issues: [issue('placement is outside the canvas bounds')] }
  }
  return { x, y, issues }
}
