import type { Project } from '../../entities/Project'
import { alpha, blue, green, isTransparent, red } from '../../entities/color'

export interface SelectionView {
  mask: Uint8Array
  width: number
  height: number
}

export interface FloatingView {
  data: Uint32Array
  width: number
  height: number
  x: number
  y: number
}

export interface RenderOptions {
  zoom: number
  showGrid: boolean
  selection: SelectionView | null
  floating: FloatingView | null
  preview: Uint32Array | null
}

export class CanvasRenderer {
  private readonly buffer: HTMLCanvasElement

  constructor() {
    this.buffer = document.createElement('canvas')
  }

  render(target: HTMLCanvasElement, project: Project, options: RenderOptions): void {
    const scale = Math.max(1, Math.floor(options.zoom))
    const width = project.width * scale
    const height = project.height * scale
    if (target.width !== width) target.width = width
    if (target.height !== height) target.height = height

    const ctx = target.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)

    this.drawCheckerboard(ctx, width, height, Math.max(1, scale))
    const image = this.composite(project, options)
    this.blit(ctx, image, project.width, project.height, width, height)

    if (options.showGrid && scale >= 6) this.drawGrid(ctx, project, scale)
    if (options.selection) this.drawSelection(ctx, options.selection, scale)
  }

  private drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, cell: number): void {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#e6e6e6'
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell)
      }
    }
  }

  private composite(project: Project, options: RenderOptions): ImageData {
    const { width, height } = project
    const pixels = new Uint32Array(width * height)
    const frame = project.activeFrame
    for (const layer of frame.layers) {
      if (!layer.visible) continue
      const data = layer.grid.data
      for (let i = 0; i < pixels.length; i += 1) {
        if (!isTransparent(data[i])) pixels[i] = data[i]
      }
    }
    if (options.floating) {
      const { data, width: fw, height: fh, x: ox, y: oy } = options.floating
      for (let y = 0; y < fh; y += 1) {
        for (let x = 0; x < fw; x += 1) {
          const color = data[y * fw + x]
          if (isTransparent(color)) continue
          const tx = ox + x
          const ty = oy + y
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue
          pixels[ty * width + tx] = color
        }
      }
    }
    if (options.preview) {
      for (let i = 0; i < pixels.length; i += 1) {
        if (!isTransparent(options.preview[i])) pixels[i] = options.preview[i]
      }
    }
    return this.toImageData(pixels, width, height)
  }

  private toImageData(pixels: Uint32Array, width: number, height: number): ImageData {
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

  private blit(
    ctx: CanvasRenderingContext2D,
    image: ImageData,
    sourceWidth: number,
    sourceHeight: number,
    width: number,
    height: number,
  ): void {
    this.buffer.width = sourceWidth
    this.buffer.height = sourceHeight
    const bufferCtx = this.buffer.getContext('2d')
    if (!bufferCtx) return
    bufferCtx.putImageData(image, 0, 0)
    ctx.drawImage(this.buffer, 0, 0, width, height)
  }

  private drawGrid(ctx: CanvasRenderingContext2D, project: Project, scale: number): void {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < project.width; x += 1) {
      ctx.moveTo(x * scale + 0.5, 0)
      ctx.lineTo(x * scale + 0.5, project.height * scale)
    }
    for (let y = 1; y < project.height; y += 1) {
      ctx.moveTo(0, y * scale + 0.5)
      ctx.lineTo(project.width * scale, y * scale + 0.5)
    }
    ctx.stroke()
  }

  private drawSelection(ctx: CanvasRenderingContext2D, selection: SelectionView, scale: number): void {
    const { mask, width, height } = selection
    ctx.fillStyle = 'rgba(41, 173, 255, 0.18)'
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mask[y * width + x]) continue
        ctx.fillRect(x * scale, y * scale, scale, scale)
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
    if (maxX < 0) return
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.strokeRect(
      minX * scale + 0.5,
      minY * scale + 0.5,
      (maxX - minX + 1) * scale - 1,
      (maxY - minY + 1) * scale - 1,
    )
    ctx.restore()
  }
}
