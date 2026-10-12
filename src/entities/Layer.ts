import { PixelGrid } from './PixelGrid'

export function createId(): string {
  return crypto.randomUUID()
}

export class Layer {
  constructor(
    readonly id: string,
    public name: string,
    public grid: PixelGrid,
    public visible = true,
  ) {}

  clone(): Layer {
    return new Layer(this.id, this.name, this.grid.clone(), this.visible)
  }
}
