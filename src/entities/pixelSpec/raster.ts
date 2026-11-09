import { PixelGrid } from '../PixelGrid'
import { gridToAscii } from './ascii'
import { metricsForGrid } from './metrics'
import { applyOps } from './ops'
import { parsePalette } from './palette'
import type {
  PixelFrameSpec,
  PixelIssue,
  PixelOp,
  PixelSpec,
  RenderedFrame,
  RenderedSpec,
} from './types'

export interface RenderOptions {
  maxWidth?: number
  maxHeight?: number
  maxFrames?: number
}

export class PixelSpecError extends Error {
  constructor(readonly issues: PixelIssue[]) {
    super(issues.map((issue) => issue.message).join('; '))
    this.name = 'PixelSpecError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRows(value: unknown, frame: string, issues: PixelIssue[]): string[] | null {
  if (typeof value === 'string') {
    const text = value.replace(/^\n+|\n+$/g, '')
    return text.split(/\r?\n/)
  }
  if (!Array.isArray(value)) {
    issues.push({
      code: 'pixels-missing',
      message: 'frame.pixels must be an array of strings or a newline-separated string',
      frame,
    })
    return null
  }
  const rows: string[] = []
  for (const row of value) {
    if (typeof row !== 'string') {
      issues.push({ code: 'row-type', message: 'each pixel row must be a string', frame })
      return null
    }
    rows.push(row)
  }
  return rows
}

function frameList(spec: PixelSpec, issues: PixelIssue[]): PixelFrameSpec[] {
  if (Array.isArray(spec.frames) && spec.frames.length > 0) return spec.frames
  if (spec.pixels !== undefined) {
    return [{ name: spec.name ?? 'frame_0', pixels: spec.pixels, ops: spec.ops }]
  }
  issues.push({
    code: 'frames-missing',
    message: 'spec.frames must contain at least one frame',
  })
  return []
}

export function renderSpec(spec: PixelSpec, options: RenderOptions = {}): RenderedSpec {
  if (!isRecord(spec)) {
    throw new PixelSpecError([{ code: 'spec-invalid', message: 'spec must be an object' }])
  }

  const issues: PixelIssue[] = []
  const { palette, issues: paletteIssues } = parsePalette(spec.palette)
  issues.push(...paletteIssues)
  if (issues.length > 0) throw new PixelSpecError(issues)

  const size = spec.size
  if (
    !Array.isArray(size) ||
    size.length !== 2 ||
    !Number.isInteger(size[0]) ||
    !Number.isInteger(size[1]) ||
    size[0] <= 0 ||
    size[1] <= 0
  ) {
    throw new PixelSpecError([
      { code: 'size-invalid', message: 'spec.size must be [width, height] with positive integers' },
    ])
  }
  const [width, height] = size

  if (options.maxWidth !== undefined && width > options.maxWidth) {
    issues.push({
      code: 'size-too-large',
      message: `spec.width ${width} exceeds the canvas width ${options.maxWidth}`,
    })
  }
  if (options.maxHeight !== undefined && height > options.maxHeight) {
    issues.push({
      code: 'size-too-large',
      message: `spec.height ${height} exceeds the canvas height ${options.maxHeight}`,
    })
  }

  if (spec.fps !== undefined && (typeof spec.fps !== 'number' || !Number.isFinite(spec.fps) || spec.fps <= 0)) {
    issues.push({ code: 'fps-invalid', message: 'spec.fps must be a positive number' })
  }

  const frames = frameList(spec, issues)
  const maxFrames = options.maxFrames ?? 8
  if (frames.length > maxFrames) {
    issues.push({
      code: 'too-many-frames',
      message: `spec has ${frames.length} frames; the maximum for this call is ${maxFrames}`,
    })
  }

  const rendered: RenderedFrame[] = []

  frames.forEach((frameInput, index) => {
    if (!isRecord(frameInput)) {
      issues.push({
        code: 'frame-invalid',
        message: `frame ${index + 1} must be an object`,
        frame: `frame_${index}`,
      })
      return
    }
    const frame = frameInput
    const name = typeof frame.name === 'string' && frame.name.length > 0 ? frame.name : `frame_${index}`
    if (frame.base !== undefined && frame.base !== 'empty') {
      issues.push({
        code: 'frame-base-unsupported',
        message: 'frame.base "existing" is not supported yet; provide pixels instead',
        frame: name,
      })
    }
    if (frame.copy !== undefined) {
      issues.push({
        code: 'frame-copy-unsupported',
        message: 'frame.copy is not supported yet; provide pixels instead',
        frame: name,
      })
    }
    if (
      frame.durationMs !== undefined &&
      (typeof frame.durationMs !== 'number' || !Number.isFinite(frame.durationMs) || frame.durationMs <= 0)
    ) {
      issues.push({
        code: 'duration-invalid',
        message: 'frame.durationMs must be a positive number',
        frame: name,
      })
    }

    const rows = parseRows(frame.pixels, name, issues)
    if (!rows) return
    if (rows.length !== height) {
      issues.push({
        code: 'row-count',
        message: `frame must have exactly ${height} rows; got ${rows.length}`,
        frame: name,
      })
    }

    const grid = PixelGrid.empty(width, height)
    for (let y = 0; y < Math.min(rows.length, height); y += 1) {
      const row = rows[y]
      if (row.length !== width) {
        issues.push({
          code: 'row-width',
          message: `row ${y} must have exactly ${width} characters; got ${row.length}`,
          frame: name,
          row: y,
        })
      }
      for (let x = 0; x < Math.min(row.length, width); x += 1) {
        const character = row[x]
        if (character === '.' || character === ' ') continue
        if (!palette.has(character)) {
          issues.push({
            code: 'unknown-character',
            message: `row ${y} column ${x} uses ${JSON.stringify(character)}, which is not in the palette`,
            frame: name,
            row: y,
            column: x,
          })
          continue
        }
        grid.set(x, y, palette.get(character) ?? 0)
      }
    }

    if (frame.ops !== undefined && !Array.isArray(frame.ops)) {
      issues.push({ code: 'ops-invalid', message: 'frame.ops must be an array', frame: name })
    } else if (Array.isArray(frame.ops)) {
      applyOps(grid, frame.ops as PixelOp[], palette, issues, name)
    }

    rendered.push({
      name,
      grid,
      metrics: metricsForGrid(grid),
      ascii: gridToAscii(grid, palette),
      durationMs: typeof frame.durationMs === 'number' ? frame.durationMs : undefined,
    })
  })

  if (issues.length > 0) throw new PixelSpecError(issues)

  return { name: spec.name, fps: spec.fps, frames: rendered }
}
