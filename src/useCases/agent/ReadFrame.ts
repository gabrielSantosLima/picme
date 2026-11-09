import type { AgentSkill, JsonSchema } from '../../entities/agent'
import { encodeSpecGrid } from '../../entities/gridCodec'
import { PixelGrid } from '../../entities/PixelGrid'
import { metricsForGrid } from '../../entities/pixelSpec'
import { compositeLayers } from '../../services/canvas/composite'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    frameId: {
      type: 'string',
      description: 'Frame id to read. Omit to read the active frame.',
    },
  },
}

export class ReadFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(args: unknown): unknown {
    const { frameId } = (args ?? {}) as { frameId?: string }
    const project = this.document.getProject()
    const frame = frameId
      ? project.frames.find((item) => item.id === frameId)
      : project.activeFrame
    if (!frame) {
      return {
        ok: false,
        errors: [{ code: 'frame-not-found', message: `Frame not found: ${frameId ?? 'active frame'}` }],
      }
    }

    try {
      const composite = compositeLayers(frame, project.width, project.height)
      const { palette, pixels } = encodeSpecGrid(composite, project.width, project.height)
      const grid = new PixelGrid(project.width, project.height, composite)
      return {
        ok: true,
        frameId: frame.id,
        size: [project.width, project.height],
        palette,
        pixels,
        ascii: pixels.join('\n'),
        metrics: metricsForGrid(grid),
      }
    } catch (error) {
      return {
        ok: false,
        errors: [
          {
            code: 'read-failed',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      }
    }
  }

  toSkill(): AgentSkill {
    return {
      name: 'read_frame',
      description:
        'Read a frame as a PixelSpec-compatible palette and character grid, plus metrics and an ASCII preview. Use it before editing or animating an existing frame.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
