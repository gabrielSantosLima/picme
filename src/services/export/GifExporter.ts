import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import type { Project } from '../../entities/Project'
import { compositeLayers, pixelsToImageData, scalePixelsNearest } from '../canvas/composite'

export class GifExporter {
  export(project: Project, scale = 1): Blob {
    const factor = Math.max(1, Math.floor(scale))
    const width = project.width * factor
    const height = project.height * factor
    const encoder = GIFEncoder()
    for (const frame of project.frames) {
      const pixels = compositeLayers(frame, project.width, project.height)
      const scaled = scalePixelsNearest(pixels, project.width, project.height, factor)
      const image = pixelsToImageData(scaled, width, height)
      const palette = quantize(image.data, 256, { format: 'rgba4444', oneBitAlpha: true })
      const index = applyPalette(image.data, palette, 'rgba4444')
      const transparentIndex = palette.findIndex((color) => (color[3] ?? 255) === 0)
      encoder.writeFrame(index, width, height, {
        palette,
        delay: frame.durationMs,
        transparent: transparentIndex >= 0,
        transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      })
    }
    encoder.finish()
    return new Blob([encoder.bytes()], { type: 'image/gif' })
  }
}
