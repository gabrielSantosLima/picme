import type { AgentSkill, ArtVariant, JsonSchema } from '../../entities/agent'
import {
  PixelSpecError,
  renderSpec,
  type PixelIssue,
  type PixelSpec,
} from '../../entities/pixelSpec'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { applyPixelSpec } from './ApplyPixelSpec'
import { PIXEL_SPEC_SCHEMA } from './specSchema'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      description:
        'Two or three different designs. Each design is a one-frame PixelSpec; the user picks one and it is drawn on a new frame.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          spec: PIXEL_SPEC_SCHEMA,
        },
        required: ['spec'],
      },
    },
  },
  required: ['variants'],
}

interface RawVariant {
  name?: string
  spec?: PixelSpec
}

function describeError(error: unknown): PixelIssue[] {
  if (error instanceof PixelSpecError) return error.issues
  return [
    {
      code: 'variant-failed',
      message: error instanceof Error ? error.message : String(error),
    },
  ]
}

export class ProposeVariants {
  constructor(
    private readonly document: DocumentRepository,
    private readonly broker: InteractionBroker,
  ) {}

  async execute(args: unknown): Promise<unknown> {
    const project = this.document.getProject()
    const raw = (args as { variants?: RawVariant[] } | null)?.variants
    const list = Array.isArray(raw) ? raw.slice(0, 3) : []
    if (list.length === 0) {
      return { ok: false, errors: [{ code: 'no-variants', message: 'No variants provided.' }] }
    }

    const variants: ArtVariant[] = []
    const issues: PixelIssue[] = []

    list.forEach((variant, index) => {
      if (!variant?.spec) {
        issues.push({
          code: 'variant-spec-missing',
          message: `variant ${index + 1} is missing a spec`,
        })
        return
      }
      try {
        const rendered = renderSpec(variant.spec, {
          maxWidth: project.width,
          maxHeight: project.height,
          maxFrames: 1,
        })
        const frame = rendered.frames[0]
        if (!frame) {
          issues.push({
            code: 'variant-empty',
            message: `variant ${index + 1} has no frame`,
          })
          return
        }
        variants.push({
          id: crypto.randomUUID(),
          name: variant.name ?? String.fromCharCode(65 + index),
          spec: variant.spec,
          rendered: frame,
        })
      } catch (error) {
        issues.push(...describeError(error))
      }
    })

    if (issues.length > 0) return { ok: false, errors: issues }
    if (variants.length === 0) {
      return { ok: false, errors: [{ code: 'no-variants', message: 'No valid variants provided.' }] }
    }

    const result = (await this.broker.request({
      id: crypto.randomUUID(),
      kind: 'variants',
      variants,
    })) as { selected?: number } | null

    const selected = Math.max(0, Math.min(variants.length - 1, result?.selected ?? 0))
    const chosen = variants[selected]
    try {
      const { frameIds } = applyPixelSpec({
        document: this.document,
        frames: [chosen.rendered],
        target: { mode: 'new' },
        placement: { anchor: 'center' },
        fps: chosen.spec.fps,
      })
      return { ok: true, selected, frameId: frameIds[0], name: chosen.name }
    } catch (error) {
      return { ok: false, errors: describeError(error) }
    }
  }

  toSkill(): AgentSkill {
    return {
      name: 'propose_variants',
      description:
        'Propose 2-3 different pixel-art designs as one-frame PixelSpecs. Each spec is validated and rendered; the user picks one and it is drawn on a new frame. Invalid specs return errors instead of showing broken art.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
