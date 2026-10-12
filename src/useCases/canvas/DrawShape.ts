import type { RGBA } from '../../entities/color'
import type { Point } from '../../entities/geometry'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { rasterizeShape, type ShapeKind } from './raster'

export class DrawShape {
  constructor(
    private readonly document: DocumentRepository,
    private readonly color: RGBA,
  ) {}

  execute(kind: ShapeKind, from: Point, to: Point, filled: boolean): void {
    const points = rasterizeShape(kind, from, to, filled)
    this.document.commit((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      for (const [x, y] of points) grid.set(x, y, this.color)
    })
  }
}
