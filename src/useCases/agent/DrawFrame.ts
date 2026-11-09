import type { AgentSkill, JsonSchema } from '../../entities/agent'
import {
  PixelSpecError,
  renderSpec,
  resolvePlacement,
  type DrawTarget,
  type PixelIssue,
  type PixelSpec,
  type Placement,
  type RenderedSpec,
} from '../../entities/pixelSpec'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { applyPixelSpec } from './ApplyPixelSpec'
import { compactMetrics } from './compactMetrics'
import { MAX_FRAMES } from './limits'
import { DRAW_TARGET_SCHEMA, PIXEL_SPEC_SCHEMA, PLACEMENT_SCHEMA } from './specSchema'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    spec: PIXEL_SPEC_SCHEMA,
    target: DRAW_TARGET_SCHEMA,
    placement: PLACEMENT_SCHEMA,
    apply: {
      type: 'boolean',
      description:
        'When false, validate and render only; the canvas is not changed. Defaults to true.',
    },
  },
  required: ['spec'],
}

interface DrawArgs {
  spec?: PixelSpec
  target?: DrawTarget
  placement?: Placement
  apply?: boolean
}

function summarized(rendered: RenderedSpec, includeAscii: boolean): unknown[] {
  return rendered.frames.map((frame) => ({
    name: frame.name,
    size: frame.metrics.size,
    durationMs: frame.durationMs,
    metrics: compactMetrics(frame.metrics),
    ...(includeAscii ? { ascii: frame.ascii } : {}),
  }))
}

function describeError(error: unknown): PixelIssue[] {
  if (error instanceof PixelSpecError) return error.issues
  return [
    {
      code: 'draw-failed',
      message: error instanceof Error ? error.message : String(error),
    },
  ]
}

export class DrawFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(args: unknown): unknown {
    const input = (args ?? {}) as DrawArgs
    if (!input.spec) {
      return {
        ok: false,
        errors: [{ code: 'spec-missing', message: 'draw requires a spec object' }],
      }
    }

    const project = this.document.getProject()
    const apply = input.apply !== false
    const mode = input.target?.mode ?? 'new'

    if (mode === 'new' && project.frames.length >= MAX_FRAMES) {
      return {
        ok: false,
        errors: [
          {
            code: 'too-many-frames',
            message: `the project already has ${project.frames.length} frames; the maximum is ${MAX_FRAMES}`,
          },
        ],
      }
    }

    try {
      const rendered = renderSpec(input.spec, {
        maxWidth: project.width,
        maxHeight: project.height,
        maxFrames: mode === 'new' ? MAX_FRAMES - project.frames.length : MAX_FRAMES,
      })

      const size = rendered.frames[0]?.metrics.size
      if (!size) {
        return { ok: false, errors: [{ code: 'no-frames', message: 'the spec has no frames' }] }
      }
      const placement = resolvePlacement(size, project, input.placement)
      if (placement.issues.length > 0) throw new PixelSpecError(placement.issues)

      if (!apply) {
        return {
          ok: true,
          applied: false,
          placement: { x: placement.x, y: placement.y },
          frames: summarized(rendered, true),
        }
      }

      const { frameIds } = applyPixelSpec({
        document: this.document,
        frames: rendered.frames,
        target: input.target,
        placement: input.placement,
        fps: rendered.fps,
      })

      return {
        ok: true,
        applied: true,
        frameIds,
        placement: { x: placement.x, y: placement.y },
        frames: summarized(rendered, false),
      }
    } catch (error) {
      return { ok: false, errors: describeError(error) }
    }
  }

  toSkill(): AgentSkill {
    return {
      name: 'draw',
      description:
        'Draw pixel art by writing a deterministic PixelSpec. The renderer validates every row and op, returns compact metrics (plus ASCII when apply:false), and applies the result to the canvas atomically. Ops: mirror_x, mirror_y, outline, rect, line, ellipse, flood_fill, replace, shift, dither.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
