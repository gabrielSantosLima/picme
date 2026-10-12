import { Layer, createId } from '../../entities/Layer'
import { PixelGrid } from '../../entities/PixelGrid'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

export class AddLayer {
  constructor(private readonly document: DocumentRepository) {}

  execute(): void {
    this.document.commit((project) => {
      const frame = project.activeFrame
      frame.layers.push(
        new Layer(createId(), `Layer ${frame.layers.length + 1}`, PixelGrid.empty(project.width, project.height)),
      )
      frame.activeLayerIndex = frame.layers.length - 1
    })
  }
}

export class DeleteLayer {
  constructor(private readonly document: DocumentRepository) {}

  execute(): void {
    this.document.commit((project) => {
      const frame = project.activeFrame
      if (frame.layers.length <= 1) return
      frame.layers.splice(frame.activeLayerIndex, 1)
      if (frame.activeLayerIndex >= frame.layers.length) {
        frame.activeLayerIndex = frame.layers.length - 1
      }
    })
  }
}

export class ToggleLayerVisibility {
  constructor(private readonly document: DocumentRepository) {}

  execute(index: number): void {
    this.document.commit((project) => {
      const layer = project.activeFrame.layers[index]
      if (layer) layer.visible = !layer.visible
    })
  }
}

export class SetActiveLayer {
  constructor(private readonly document: DocumentRepository) {}

  execute(index: number): void {
    this.document.update((project) => {
      const frame = project.activeFrame
      if (index >= 0 && index < frame.layers.length) frame.activeLayerIndex = index
    })
  }
}
