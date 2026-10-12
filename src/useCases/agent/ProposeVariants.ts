import type { AgentSkill, ArtVariant, JsonSchema } from '../../entities/agent'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { applyDrawPayload } from './applyDrawPayload'

const VARIANT_SIZE = 32

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      description: 'Two or three different full designs, each a 32x32 character grid.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          palette: { type: 'array', items: { type: 'string' } },
          pixels: { type: 'array', items: { type: 'string' } },
        },
        required: ['palette', 'pixels'],
      },
    },
  },
  required: ['variants'],
}

interface RawVariant {
  name?: string
  palette?: string[]
  pixels?: string[]
}

function normalizeRow(row: unknown): string {
  const text = typeof row === 'string' ? row : ''
  if (text.length === VARIANT_SIZE) return text
  if (text.length > VARIANT_SIZE) return text.slice(0, VARIANT_SIZE)
  return text.padEnd(VARIANT_SIZE, '.')
}

function normalizeVariant(raw: RawVariant, index: number): ArtVariant {
  const source = Array.isArray(raw.pixels) ? raw.pixels : []
  const pixels: string[] = []
  for (let y = 0; y < VARIANT_SIZE; y += 1) pixels.push(normalizeRow(source[y]))
  return {
    id: crypto.randomUUID(),
    name: raw.name ?? String.fromCharCode(65 + index),
    palette: Array.isArray(raw.palette) ? raw.palette : [],
    pixels,
  }
}

export class ProposeVariants {
  constructor(
    private readonly document: DocumentRepository,
    private readonly broker: InteractionBroker,
  ) {}

  async execute(args: unknown): Promise<unknown> {
    const raw = (args as { variants?: RawVariant[] }).variants
    const list = Array.isArray(raw) ? raw.slice(0, 3) : []
    const variants = list.map((variant, index) => normalizeVariant(variant, index))
    if (variants.length === 0) return { error: 'No variants provided.' }

    const result = (await this.broker.request({
      id: crypto.randomUUID(),
      kind: 'variants',
      variants,
    })) as { selected?: number }

    const selected = Math.max(0, Math.min(variants.length - 1, result?.selected ?? 0))
    const chosen = variants[selected]
    const { frameId } = await applyDrawPayload(this.document, {
      palette: chosen.palette,
      pixels: chosen.pixels,
      mode: 'replace',
    })
    return { selected, frameId, name: chosen.name }
  }

  toSkill(): AgentSkill {
    return {
      name: 'propose_variants',
      description:
        'Propose 2-3 different pixel-art designs (each a 16x16 grid). The user picks one and it is drawn automatically on a new frame.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
