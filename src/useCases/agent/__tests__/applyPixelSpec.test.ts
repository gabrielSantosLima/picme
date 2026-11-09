import { describe, expect, it } from 'vitest'
import { Frame } from '../../../entities/Frame'
import { Layer, createId } from '../../../entities/Layer'
import { PixelGrid } from '../../../entities/PixelGrid'
import { Project } from '../../../entities/Project'
import { PixelSpecError, renderSpec } from '../../../entities/pixelSpec'
import type { DocumentRepository, ProjectMutator } from '../../../services/document/DocumentRepository'
import { applyPixelSpec } from '../ApplyPixelSpec'
import { DrawFrame } from '../DrawFrame'
import { ReadFrame } from '../ReadFrame'

class FakeDocument implements DocumentRepository {
  project = Project.create(8, 8)
  past: Project[] = []
  future: Project[] = []

  getProject(): Project {
    return this.project
  }

  update(mutator: ProjectMutator): void {
    const draft = this.project.clone()
    mutator(draft)
    this.project = draft
  }

  commit(mutator: ProjectMutator): void {
    const previous = this.project
    const draft = previous.clone()
    mutator(draft)
    this.project = draft
    this.past.push(previous)
    this.future = []
  }

  beginStroke(): void {}

  endStroke(): void {}

  undo(): void {
    const previous = this.past.pop()
    if (!previous) return
    this.future.unshift(this.project)
    this.project = previous
  }

  redo(): void {
    const next = this.future.shift()
    if (!next) return
    this.past.push(this.project)
    this.project = next
  }
}

function renderedSprite() {
  return renderSpec({
    size: [4, 4],
    palette: { '.': 'transparent', a: '#ff0000' },
    frames: [{ pixels: ['....', '.aa.', '.aa.', '....'] }],
    fps: 8,
  }).frames
}

describe('applyPixelSpec', () => {
  it('creates frames atomically with placement and duration', () => {
    const document = new FakeDocument()
    const { frameIds } = applyPixelSpec({
      document,
      frames: renderedSprite(),
      target: { mode: 'new' },
      placement: { anchor: 'center' },
      fps: 8,
    })

    expect(frameIds).toHaveLength(1)
    expect(document.project.frames).toHaveLength(2)
    expect(document.project.activeFrameIndex).toBe(1)
    expect(document.project.frames[1].durationMs).toBe(125)
    expect(document.project.frames[1].activeLayer?.grid.get(3, 3)).not.toBe(0)
    expect(document.past).toHaveLength(1)
  })

  it('creates multiple animation frames in one call and one undo step', () => {
    const document = new FakeDocument()
    const frames = renderSpec({
      size: [4, 4],
      palette: { '.': 'transparent', a: '#ff0000' },
      frames: [
        { pixels: ['....', '.aa.', '.aa.', '....'] },
        { pixels: ['....', '.aa.', '.aa.', '....'] },
      ],
      fps: 10,
    }).frames

    const { frameIds } = applyPixelSpec({
      document,
      frames,
      target: { mode: 'new' },
      fps: 10,
    })

    expect(frameIds).toHaveLength(2)
    expect(document.project.frames).toHaveLength(3)
    expect(document.project.activeFrameIndex).toBe(1)
    expect(document.project.frames[1].durationMs).toBe(100)
    expect(document.project.frames[2].durationMs).toBe(100)
    expect(document.past).toHaveLength(1)
  })

  it('flattens all layers on replace', () => {
    const document = new FakeDocument()
    const target = document.project.frames[0]
    target.layers.push(new Layer(createId(), 'extra', PixelGrid.empty(8, 8)))
    target.layers.push(new Layer(createId(), 'extra 2', PixelGrid.empty(8, 8)))

    applyPixelSpec({
      document,
      frames: renderedSprite(),
      target: { mode: 'replace', frameId: target.id },
      placement: { x: 0, y: 0 },
    })

    expect(document.project.frames[0].layers).toHaveLength(1)
    expect(document.project.frames[0].activeLayer?.grid.get(1, 1)).not.toBe(0)
  })

  it('merges non-transparent pixels over the active layer', () => {
    const document = new FakeDocument()
    const target = document.project.frames[0]
    target.activeLayer?.grid.set(0, 0, 0xff0000ff)

    applyPixelSpec({
      document,
      frames: renderedSprite(),
      target: { mode: 'merge', frameId: target.id },
      placement: { x: 0, y: 0 },
    })

    expect(document.project.frames[0].activeLayer?.grid.get(0, 0)).toBe(0xff0000ff)
    expect(document.project.frames[0].activeLayer?.grid.get(1, 1)).not.toBe(0)
  })

  it('draw validates without mutating and reports actionable errors', () => {
    const document = new FakeDocument()
    const draw = new DrawFrame(document)
    const spec = {
      size: [4, 4] as [number, number],
      palette: { '.': 'transparent', a: '#ff0000' },
      frames: [{ pixels: ['....', '.aa.', '.aa.', '....'] }],
    }
    const dry = draw.execute({
      spec,
      apply: false,
    }) as { ok: boolean; applied?: boolean; frames?: Array<{ ascii?: string }> }

    expect(dry.ok).toBe(true)
    expect(dry.applied).toBe(false)
    expect(dry.frames).toHaveLength(1)
    expect(dry.frames?.[0]?.ascii).toBeTypeOf('string')
    expect(document.project.frames).toHaveLength(1)

    const applied = draw.execute({ spec }) as {
      ok: boolean
      applied?: boolean
      frames?: Array<{ ascii?: string }>
    }
    expect(applied.ok).toBe(true)
    expect(applied.applied).toBe(true)
    expect(applied.frames?.[0]?.ascii).toBeUndefined()

    const invalid = draw.execute({
      spec: {
        size: [4, 4],
        palette: { '.': 'transparent' },
        frames: [{ pixels: ['...', '....', '....', '....'] }],
      },
    }) as { ok: boolean; errors?: Array<{ code: string }> }

    expect(invalid.ok).toBe(false)
    expect(invalid.errors?.[0]?.code).toBe('row-width')
    expect(document.project.frames).toHaveLength(2)
  })

  it('reads a frame back as a spec-compatible palette and grid', () => {
    const document = new FakeDocument()
    applyPixelSpec({
      document,
      frames: renderedSprite(),
      target: { mode: 'replace', frameId: document.project.frames[0].id },
      placement: { x: 0, y: 0 },
    })

    const result = new ReadFrame(document).execute({}) as {
      ok: boolean
      size: [number, number]
      palette: Record<string, string>
      pixels: string[]
      ascii?: string
      metrics: { occupied_pixels: number }
    }

    expect(result.ok).toBe(true)
    expect(result.size).toEqual([8, 8])
    expect(result.palette['.']).toBe('transparent')
    expect(result.pixels[1][1]).not.toBe('.')
    expect(result.ascii).toBeUndefined()
    expect(result.metrics.occupied_pixels).toBe(4)
  })

  it('rejects adding frames above the project limit', () => {
    const document = new FakeDocument()
    for (let index = 1; index < 8; index += 1) {
      document.project.frames.push(Frame.create(8, 8))
    }
    expect(() =>
      applyPixelSpec({
        document,
        frames: renderedSprite(),
        target: { mode: 'new' },
      }),
    ).toThrow(PixelSpecError)
  })
})
