import type { Frame } from '../../entities/Frame'
import { alpha, blue, green, isTransparent, red } from '../../entities/color'

export function compositeLayers(frame: Frame, width: number, height: number): Uint32Array {
  const pixels = new Uint32Array(width * height)
  for (const layer of frame.layers) {
    if (!layer.visible) continue
    const data = layer.grid.data
    for (let i = 0; i < pixels.length; i += 1) {
      if (!isTransparent(data[i])) pixels[i] = data[i]
    }
  }
  return pixels
}

export function scalePixelsNearest(
  pixels: Uint32Array,
  width: number,
  height: number,
  scale: number,
): Uint32Array {
  if (scale <= 1) return pixels
  const outWidth = width * scale
  const outHeight = height * scale
  const out = new Uint32Array(outWidth * outHeight)
  for (let y = 0; y < outHeight; y += 1) {
    const sy = Math.floor(y / scale)
    for (let x = 0; x < outWidth; x += 1) {
      const sx = Math.floor(x / scale)
      out[y * outWidth + x] = pixels[sy * width + sx]
    }
  }
  return out
}

export function pixelsToImageData(
  pixels: Uint32Array,
  width: number,
  height: number,
): ImageData {
  const image = new ImageData(width, height)
  const out = image.data
  for (let i = 0; i < pixels.length; i += 1) {
    const color = pixels[i]
    if (color === 0) continue
    out[i * 4] = red(color)
    out[i * 4 + 1] = green(color)
    out[i * 4 + 2] = blue(color)
    out[i * 4 + 3] = alpha(color)
  }
  return image
}
