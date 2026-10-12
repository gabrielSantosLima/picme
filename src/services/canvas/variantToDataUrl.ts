import type { ArtVariant } from '../../entities/agent'
import { rowColor, paletteColors } from '../../entities/gridCodec'

export function variantToDataUrl(variant: ArtVariant, scale = 6): string {
  const height = variant.pixels.length
  const width = variant.pixels[0]?.length ?? 0
  if (width === 0 || height === 0) return ''

  const colors = paletteColors(variant.palette)
  const image = new ImageData(width, height)
  const out = image.data
  for (let y = 0; y < height; y += 1) {
    const row = variant.pixels[y] ?? ''
    for (let x = 0; x < width; x += 1) {
      const color = rowColor(row, colors, x)
      if (color === 0) continue
      const index = (y * width + x) * 4
      out[index] = (color >>> 24) & 0xff
      out[index + 1] = (color >>> 16) & 0xff
      out[index + 2] = (color >>> 8) & 0xff
      out[index + 3] = color & 0xff
    }
  }

  const source = document.createElement('canvas')
  source.width = width
  source.height = height
  const sourceCtx = source.getContext('2d')
  if (!sourceCtx) return ''
  sourceCtx.putImageData(image, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
