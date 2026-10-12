import type { Project } from '../../entities/Project'
import { canvasToBlob } from '../canvas/canvasToBlob'
import { compositeLayers, pixelsToImageData } from '../canvas/composite'

export interface FrameImage {
  name: string
  blob: Blob
}

export class FrameImagesExporter {
  async export(project: Project, scale = 1): Promise<FrameImage[]> {
    const factor = Math.max(1, Math.floor(scale))
    const width = project.width * factor
    const height = project.height * factor

    const cell = document.createElement('canvas')
    cell.width = project.width
    cell.height = project.height
    const cellCtx = cell.getContext('2d')
    if (!cellCtx) throw new Error('Canvas context unavailable')

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')
    ctx.imageSmoothingEnabled = false

    const images: FrameImage[] = []
    for (let index = 0; index < project.frames.length; index += 1) {
      const frame = project.frames[index]
      const image = pixelsToImageData(
        compositeLayers(frame, project.width, project.height),
        project.width,
        project.height,
      )
      cellCtx.clearRect(0, 0, project.width, project.height)
      cellCtx.putImageData(image, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(cell, 0, 0, width, height)
      const blob = await canvasToBlob(canvas)
      images.push({ name: `frame-${String(index + 1).padStart(3, '0')}.png`, blob })
    }
    return images
  }
}
