import type { Project } from '../../entities/Project'
import { compositeLayers, pixelsToImageData } from './composite'

export function frameToDataUrl(project: Project, scale = 8): string {
  const width = project.width
  const height = project.height

  const source = document.createElement('canvas')
  source.width = width
  source.height = height
  const sourceCtx = source.getContext('2d')
  if (!sourceCtx) return ''
  sourceCtx.putImageData(
    pixelsToImageData(compositeLayers(project.activeFrame, width, height), width, height),
    0,
    0,
  )

  const output = document.createElement('canvas')
  output.width = width * scale
  output.height = height * scale
  const ctx = output.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, output.width, output.height)
  ctx.drawImage(source, 0, 0, output.width, output.height)
  return output.toDataURL('image/png')
}
