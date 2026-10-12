import type { DrawPayload } from '../../entities/agent'
import { Frame } from '../../entities/Frame'
import { paletteColors, rowColor } from '../../entities/gridCodec'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeRow(row: unknown, width: number): string {
  const text = typeof row === 'string' ? row : ''
  if (text.length === width) return text
  if (text.length > width) return text.slice(0, width)
  return text.padEnd(width, '.')
}

export async function applyDrawPayload(
  document: DocumentRepository,
  payload: DrawPayload,
): Promise<{ frameId: string }> {
  const rows = Array.isArray(payload.pixels) ? payload.pixels : []
  const colors = paletteColors(Array.isArray(payload.palette) ? payload.palette : [])
  const mode = payload.mode === 'merge' ? 'merge' : 'replace'

  const initial = document.getProject()
  const width = initial.width
  const height = initial.height

  const region = payload.region
  const originX = region ? Math.max(0, Math.floor(region.x)) : 0
  const originY = region ? Math.max(0, Math.floor(region.y)) : 0
  const regionWidth = region ? Math.max(1, Math.min(Math.floor(region.width), width - originX)) : width
  const regionHeight = region
    ? Math.max(1, Math.min(Math.floor(region.height), height - originY))
    : height

  const safeRows: string[] = []
  for (let y = 0; y < regionHeight; y += 1) safeRows.push(normalizeRow(rows[y], regionWidth))

  document.beginStroke()

  let frameIndex = payload.frameId
    ? initial.frames.findIndex((frame) => frame.id === payload.frameId)
    : -1

  if (frameIndex < 0) {
    document.update((project) => {
      project.frames.push(Frame.create(project.width, project.height))
      project.activeFrameIndex = project.frames.length - 1
    })
    frameIndex = document.getProject().activeFrameIndex
  } else {
    document.update((project) => {
      project.activeFrameIndex = frameIndex
    })
  }

  const frameId = document.getProject().frames[frameIndex]?.id ?? ''

  const batch = Math.max(1, Math.ceil(regionHeight / 8))
  for (let start = 0; start < regionHeight; start += batch) {
    await delay(16)
    document.update((project) => {
      const layer = project.frames[frameIndex]?.activeLayer
      if (!layer) return
      const end = Math.min(start + batch, regionHeight)
      for (let y = start; y < end; y += 1) {
        const row = safeRows[y]
        for (let x = 0; x < regionWidth; x += 1) {
          const color = rowColor(row, colors, x)
          if (mode === 'merge' && color === 0) continue
          layer.grid.set(originX + x, originY + y, color)
        }
      }
    })
  }

  document.endStroke()
  return { frameId }
}
