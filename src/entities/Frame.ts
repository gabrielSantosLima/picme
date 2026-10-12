import { Layer, createId } from './Layer'
import { PixelGrid } from './PixelGrid'

export class Frame {
  constructor(
    readonly id: string,
    public layers: Layer[],
    public durationMs = 100,
    public activeLayerIndex = 0,
  ) {}

  clone(): Frame {
    return new Frame(
      this.id,
      this.layers.map((layer) => layer.clone()),
      this.durationMs,
      this.activeLayerIndex,
    )
  }

  get activeLayer(): Layer | undefined {
    return this.layers[this.activeLayerIndex]
  }

  static create(width: number, height: number): Frame {
    const layer = new Layer(createId(), 'Layer 1', PixelGrid.empty(width, height))
    return new Frame(createId(), [layer])
  }
}
