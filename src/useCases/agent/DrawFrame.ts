import type { AgentSkill, DrawPayload, JsonSchema } from '../../entities/agent'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { applyDrawPayload } from './applyDrawPayload'

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

export class DrawFrame {
  constructor(private readonly document: DocumentRepository) {}

  async execute(args: unknown): Promise<unknown> {
    const { frameId } = await applyDrawPayload(this.document, args as DrawPayload)
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
