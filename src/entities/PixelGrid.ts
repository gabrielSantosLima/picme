import type { RGBA } from './color'

export class PixelGrid {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly data: Uint32Array,
  ) {}

  static empty(width: number, height: number): PixelGrid {
    return new PixelGrid(width, height, new Uint32Array(width * height))
  }

  clone(): PixelGrid {
    return new PixelGrid(this.width, this.height, new Uint32Array(this.data))
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  index(x: number, y: number): number {
    return y * this.width + x
  }

  get(x: number, y: number): RGBA {
    return this.inBounds(x, y) ? this.data[y * this.width + x] : 0
  }

  set(x: number, y: number, color: RGBA): void {
    if (this.inBounds(x, y)) this.data[y * this.width + x] = color
  }
}
