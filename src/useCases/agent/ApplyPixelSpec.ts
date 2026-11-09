import { Frame } from '../../entities/Frame'
import { Layer, createId } from '../../entities/Layer'
import { PixelGrid } from '../../entities/PixelGrid'
import {
  PixelSpecError,
  resolvePlacement,
  type DrawTarget,
  type PixelIssue,
  type Placement,
  type RenderedFrame,
} from '../../entities/pixelSpec'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { MAX_FRAMES } from './limits'

export interface ApplyPixelSpecInput {
  document: DocumentRepository
  frames: RenderedFrame[]
  target?: DrawTarget
  placement?: Placement
  fps?: number
}

function issue(code: string, message: string): PixelIssue {
  return { code, message }
}

function durationFor(
  frame: RenderedFrame,
  fps: number | undefined,
  fallback: number | null,
): number | null {
  if (typeof frame.durationMs === 'number') return Math.max(20, Math.round(frame.durationMs))
  if (fps !== undefined && Number.isFinite(fps) && fps > 0) {
    return Math.max(20, Math.round(1000 / fps))
  }
  return fallback
}

function writeGrid(
  target: PixelGrid,
  source: PixelGrid,
  originX: number,
  originY: number,
  merge: boolean,
): void {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const color = source.data[y * source.width + x]
      if (merge && color === 0) continue
      target.set(originX + x, originY + y, color)
    }
  }
}

export function applyPixelSpec(input: ApplyPixelSpecInput): { frameIds: string[] } {
  const { document } = input
  const frames = input.frames
  const target = input.target ?? { mode: 'new' }
  const mode = target.mode ?? 'new'
  const project = document.getProject()

  if (!Array.isArray(frames) || frames.length === 0) {
    throw new PixelSpecError([issue('no-frames', 'there are no rendered frames to apply')])
  }

  const width = frames[0].grid.width
  const height = frames[0].grid.height
  if (frames.some((frame) => frame.grid.width !== width || frame.grid.height !== height)) {
    throw new PixelSpecError([issue('frame-size', 'all frames must have the same size')])
  }

  const placement = resolvePlacement([width, height], project, input.placement)
  if (placement.issues.length > 0) throw new PixelSpecError(placement.issues)

  if (mode === 'new') {
    if (project.frames.length + frames.length > MAX_FRAMES) {
      throw new PixelSpecError([
        issue(
          'too-many-frames',
          `the project already has ${project.frames.length} frames; adding ${frames.length} would exceed the maximum of ${MAX_FRAMES}`,
        ),
      ])
    }

    const frameIds: string[] = []
    document.commit((draft) => {
      const insertion = Math.min(draft.activeFrameIndex + 1, draft.frames.length)
      const created: Frame[] = []
      for (const rendered of frames) {
        const frame = Frame.create(draft.width, draft.height)
        const layer = frame.activeLayer
        if (layer) writeGrid(layer.grid, rendered.grid, placement.x, placement.y, false)
        const duration = durationFor(rendered, input.fps, 100)
        if (duration !== null) frame.durationMs = duration
        created.push(frame)
        frameIds.push(frame.id)
      }
      draft.frames.splice(insertion, 0, ...created)
      draft.activeFrameIndex = insertion
    })
    return { frameIds }
  }

  if (mode === 'merge') {
    if (frames.length !== 1) {
      throw new PixelSpecError([issue('merge-frames', 'merge accepts exactly one frame')])
    }
    const frameId = target.frameId
    if (!frameId) {
      throw new PixelSpecError([issue('merge-target', 'merge requires target.frameId')])
    }
    const frame = project.frames.find((item) => item.id === frameId)
    if (!frame) {
      throw new PixelSpecError([issue('frame-not-found', `frame not found: ${frameId}`)])
    }

    document.commit((draft) => {
      const draftFrame = draft.frames.find((item) => item.id === frameId)
      if (!draftFrame?.activeLayer) return
      writeGrid(draftFrame.activeLayer.grid, frames[0].grid, placement.x, placement.y, true)
      const duration = durationFor(frames[0], input.fps, null)
      if (duration !== null) draftFrame.durationMs = duration
      const index = draft.frames.findIndex((item) => item.id === frameId)
      if (index >= 0) draft.activeFrameIndex = index
    })
    return { frameIds: [frameId] }
  }

  if (mode !== 'replace') {
    throw new PixelSpecError([issue('target-mode', `unknown target mode: ${String(mode)}`)])
  }

  const requestedIds =
    target.frameIds && target.frameIds.length > 0
      ? target.frameIds
      : target.frameId
        ? [target.frameId]
        : []
  if (requestedIds.length !== frames.length) {
    throw new PixelSpecError([
      issue(
        'target-frame-ids',
        `replace needs ${frames.length} frame id(s); got ${requestedIds.length}`,
      ),
    ])
  }
  for (const frameId of requestedIds) {
    if (!project.frames.some((frame) => frame.id === frameId)) {
      throw new PixelSpecError([issue('frame-not-found', `frame not found: ${frameId}`)])
    }
  }

  document.commit((draft) => {
    let firstIndex = -1
    requestedIds.forEach((frameId, index) => {
      const draftFrame = draft.frames.find((frame) => frame.id === frameId)
      if (!draftFrame) return
      const layer = new Layer(createId(), 'Layer 1', PixelGrid.empty(draft.width, draft.height))
      draftFrame.layers = [layer]
      draftFrame.activeLayerIndex = 0
      writeGrid(layer.grid, frames[index].grid, placement.x, placement.y, false)
      const duration = durationFor(frames[index], input.fps, null)
      if (duration !== null) draftFrame.durationMs = duration
      const frameIndex = draft.frames.findIndex((frame) => frame.id === frameId)
      if (firstIndex < 0) firstIndex = frameIndex
    })
    if (firstIndex >= 0) draft.activeFrameIndex = firstIndex
  })

  return { frameIds: requestedIds }
}
