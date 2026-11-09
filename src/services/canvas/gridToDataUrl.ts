import type { PixelGrid } from '../../entities/PixelGrid'
import { pixelsToImageData } from './composite'

export function gridToDataUrl(grid: PixelGrid, scale = 6): string {
  if (grid.width === 0 || grid.height === 0) return ''

  const source = document.createElement('canvas')
  source.width = grid.width
  source.height = grid.height
  const sourceContext = source.getContext('2d')
  if (!sourceContext) return ''
  sourceContext.putImageData(pixelsToImageData(grid.data, grid.width, grid.height), 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = grid.width * scale
  canvas.height = grid.height * scale
  const context = canvas.getContext('2d')
  if (!context) return ''
  context.imageSmoothingEnabled = false
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
