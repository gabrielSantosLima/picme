import type { Project } from '../../entities/Project'
import { canvasToBlob } from '../canvas/canvasToBlob'
import { compositeLayers, pixelsToImageData } from '../canvas/composite'

export interface SpriteSheetOptions {
  columns: number
  scale: number
}

export class SpriteSheetExporter {
  async export(project: Project, options: SpriteSheetOptions): Promise<Blob> {
    const columns = Math.max(1, Math.floor(options.columns))
    const scale = Math.max(1, Math.floor(options.scale))
    const rows = Math.ceil(project.frames.length / columns)
    const cellWidth = project.width * scale
    const cellHeight = project.height * scale

    const canvas = document.createElement('canvas')
    canvas.width = columns * cellWidth
    canvas.height = rows * cellHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')
    ctx.imageSmoothingEnabled = false

    const cell = document.createElement('canvas')
    cell.width = project.width
    cell.height = project.height
    const cellCtx = cell.getContext('2d')
    if (!cellCtx) throw new Error('Canvas context unavailable')

    project.frames.forEach((frame, index) => {
      const image = pixelsToImageData(
        compositeLayers(frame, project.width, project.height),
        project.width,
        project.height,
      )
      cellCtx.clearRect(0, 0, project.width, project.height)
      cellCtx.putImageData(image, 0, 0)
      const dx = (index % columns) * cellWidth
      const dy = Math.floor(index / columns) * cellHeight
      ctx.drawImage(cell, dx, dy, cellWidth, cellHeight)
    })

    return canvasToBlob(canvas)
  }
}
