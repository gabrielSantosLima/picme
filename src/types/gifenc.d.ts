declare module 'gifenc' {
  export type PixelFormat = 'rgb565' | 'rgb444' | 'rgba4444'

  export type PaletteColor = number[]
  export type Palette = PaletteColor[]

  export interface QuantizeOptions {
    format?: PixelFormat
    oneBitAlpha?: boolean | number
    clearAlpha?: boolean
    clearAlphaThreshold?: number
    clearAlphaColor?: number
  }

  export interface WriteFrameOptions {
    palette?: Palette
    first?: boolean
    transparent?: boolean
    transparentIndex?: number
    delay?: number
    repeat?: number
    dispose?: number
  }

  export interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions,
    ): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
    bytesView(): Uint8Array<ArrayBuffer>
    reset(): void
  }

  export function GIFEncoder(options?: {
    auto?: boolean
    initialCapacity?: number
  }): GifEncoderInstance

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): Palette

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: PixelFormat,
  ): Uint8Array

  export function nearestColorIndex(palette: Palette, pixel: number[]): number
}
