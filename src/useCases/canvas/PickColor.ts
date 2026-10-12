import type { RGBA } from '../../entities/color'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

export class PickColor {
  constructor(private readonly document: DocumentRepository) {}

  execute(x: number, y: number): RGBA {
    const frame = this.document.getProject().activeFrame
    let color = 0
    for (const layer of frame.layers) {
      if (!layer.visible) continue
      const sample = layer.grid.get(x, y)
      if (sample !== 0) color = sample
    }
    return color
  }
}
