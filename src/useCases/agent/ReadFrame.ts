import type { AgentSkill, JsonSchema } from '../../entities/agent'
import { encodeGrid } from '../../entities/gridCodec'
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
    const { frameId } = args as { frameId?: string }
    const project = this.document.getProject()
    const frame = frameId
      ? project.frames.find((item) => item.id === frameId)
      : project.activeFrame
    if (!frame) return { error: `Frame not found: ${frameId ?? 'active frame'}` }

    const { palette, grid } = encodeGrid(
      compositeLayers(frame, project.width, project.height),
      project.width,
      project.height,
    )
    return {
      frameId: frame.id,
      width: project.width,
      height: project.height,
      palette,
      pixels: grid,
    }
  }

  toSkill(): AgentSkill {
    return {
      name: 'read_frame',
      description:
        'Read the exact pixel grid (palette + character rows) of a frame by id. Use it before editing or animating a frame precisely.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
