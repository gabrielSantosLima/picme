import type { RGBA } from '../../entities/color'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { rasterLine, type PointTuple } from './raster'

export class PaintStroke {
  private lastX = -1
  private lastY = -1

  constructor(
    private readonly document: DocumentRepository,
    private readonly color: RGBA,
  ) {}

  begin(x: number, y: number): void {
    this.document.beginStroke()
    this.lastX = x
    this.lastY = y
    this.paint([[x, y]])
  }

  extend(x: number, y: number): void {
    if (this.lastX < 0) {
      this.begin(x, y)
      return
    }
    const segment = rasterLine(this.lastX, this.lastY, x, y)
    this.lastX = x
    this.lastY = y
    this.paint(segment)
  }

  end(): void {
    this.document.endStroke()
  }

  private paint(points: PointTuple[]): void {
    this.document.update((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (const [x, y] of points) grid.set(x, y, this.color)
    })
  }
}
