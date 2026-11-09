import type { PixelGrid } from '../PixelGrid'

export type SpecColor =
  | string
  | [number, number, number]
  | [number, number, number, number]

export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface Placement {
  x?: number
  y?: number
  anchor?: Anchor
  offsetX?: number
  offsetY?: number
}

export type DrawTargetMode = 'new' | 'replace' | 'merge'

export interface DrawTarget {
  mode?: DrawTargetMode
  frameId?: string
  frameIds?: string[]
}

export type PixelOp =
  | { op: 'mirror_x' }
  | { op: 'mirror_y' }
  | { op: 'outline'; color: string }
  | { op: 'rect'; x: number; y: number; w: number; h: number; color: string }
  | { op: 'line'; x0: number; y0: number; x1: number; y1: number; color: string }
  | { op: 'ellipse'; cx: number; cy: number; rx: number; ry: number; color: string }
  | { op: 'flood_fill'; x: number; y: number; color: string }
  | { op: 'replace'; from: string; to: string }
  | { op: 'shift'; dx: number; dy: number }
  | {
      op: 'dither'
      x?: number
      y?: number
      w?: number
      h?: number
      a: string
      b: string
      from?: string
      pattern?: 'checker' | number
    }

export interface PixelFrameSpec {
  name?: string
  pixels?: string[] | string
  ops?: PixelOp[]
  durationMs?: number
  base?: 'empty' | 'existing'
  copy?: string
}

export interface PixelSpec {
  name?: string
  size: [number, number]
  palette: Record<string, SpecColor>
  frames: PixelFrameSpec[]
  pixels?: string[] | string
  ops?: PixelOp[]
  fps?: number
}

export interface PixelIssue {
  code: string
  message: string
  frame?: string
  row?: number
  column?: number
  op?: string
}

export interface FrameMetrics {
  size: [number, number]
  bbox: [number, number, number, number] | null
  occupied_pixels: number
  occupancy: number
  colors: number
  pixel_counts: Record<string, number>
  orphan_pixels: number
  vertical_symmetry: number
  warnings: string[]
}

export interface RenderedFrame {
  name: string
  grid: PixelGrid
  metrics: FrameMetrics
  ascii: string
  durationMs?: number
}

export interface RenderedSpec {
  name?: string
  fps?: number
  frames: RenderedFrame[]
}
