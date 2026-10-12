import type { AgentSkill, DrawPayload, JsonSchema } from '../../entities/agent'
import { Frame } from '../../entities/Frame'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { paletteColors, rowColor } from './gridCodec'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    frameId: {
      type: 'string',
      description: 'Existing frame id to draw into, or omit to create a new frame.',
    },
    mode: {
      type: 'string',
      enum: ['replace', 'merge'],
      description: 'replace redraws the whole target; merge only paints non-transparent cells.',
    },
    region: {
      type: 'object',
      description:
        'Optional sub-rectangle to draw into. When set, "pixels" must have region.height rows of region.width characters.',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['x', 'y', 'width', 'height'],
    },
    palette: {
      type: 'array',
      items: { type: 'string' },
      description: 'Hex colors ("" = transparent), addressed by characters 0-9 then a-z.',
    },
    pixels: {
      type: 'array',
      items: { type: 'string' },
      description: 'One string per row; each character is a palette index; "." or " " is transparent.',
    },
  },
  required: ['palette', 'pixels'],
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class DrawFrame {
  constructor(private readonly document: DocumentRepository) {}

  async execute(args: unknown): Promise<unknown> {
    const payload = args as DrawPayload
    const rows = Array.isArray(payload.pixels) ? payload.pixels : []
    const colors = paletteColors(Array.isArray(payload.palette) ? payload.palette : [])
    const mode = payload.mode === 'merge' ? 'merge' : 'replace'

    const initial = this.document.getProject()
    const width = initial.width
    const height = initial.height

    const region = payload.region
    const originX = region ? Math.max(0, Math.floor(region.x)) : 0
    const originY = region ? Math.max(0, Math.floor(region.y)) : 0
    const regionWidth = region
      ? Math.max(1, Math.min(Math.floor(region.width), width - originX))
      : width
    const regionHeight = region
      ? Math.max(1, Math.min(Math.floor(region.height), height - originY))
      : height

    if (rows.length !== regionHeight) {
      return {
        error: `Invalid grid: expected ${regionHeight} rows but received ${rows.length}. Redraw with exactly ${regionHeight} rows of ${regionWidth} characters each.`,
      }
    }
    const badRow = rows.findIndex((row) => typeof row !== 'string' || row.length !== regionWidth)
    if (badRow !== -1) {
      return {
        error: `Invalid grid: row ${badRow + 1} must have exactly ${regionWidth} characters. Redraw with exactly ${regionHeight} rows of ${regionWidth} characters each.`,
      }
    }

    this.document.beginStroke()

    let frameIndex = payload.frameId
      ? initial.frames.findIndex((frame) => frame.id === payload.frameId)
      : -1

    if (frameIndex < 0) {
      this.document.update((project) => {
        project.frames.push(Frame.create(project.width, project.height))
        project.activeFrameIndex = project.frames.length - 1
      })
      frameIndex = this.document.getProject().activeFrameIndex
    } else {
      this.document.update((project) => {
        project.activeFrameIndex = frameIndex
      })
    }

    const frameId = this.document.getProject().frames[frameIndex]?.id ?? ''

    const batch = Math.max(1, Math.ceil(regionHeight / 8))
    for (let start = 0; start < regionHeight; start += batch) {
      await delay(16)
      this.document.update((project) => {
        const layer = project.frames[frameIndex]?.activeLayer
        if (!layer) return
        const end = Math.min(start + batch, regionHeight)
        for (let y = start; y < end; y += 1) {
          const row = rows[y]
          for (let x = 0; x < regionWidth; x += 1) {
            const color = rowColor(row, colors, x)
            if (mode === 'merge' && color === 0) continue
            layer.grid.set(originX + x, originY + y, color)
          }
        }
      })
    }

    this.document.endStroke()
    return { frameId, applied: true }
  }

  toSkill(): AgentSkill {
    return {
      name: 'draw',
      description:
        'Draw or edit a frame from a palette and a character grid. Creates the frame when frameId is unknown. Optionally draw only a sub-rectangle via "region".',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
