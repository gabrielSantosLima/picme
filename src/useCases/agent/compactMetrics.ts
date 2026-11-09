import type { FrameMetrics } from '../../entities/pixelSpec'

export type CompactFrameMetrics = Omit<FrameMetrics, 'pixel_counts'>

export function compactMetrics(metrics: FrameMetrics): CompactFrameMetrics {
  return {
    size: metrics.size,
    bbox: metrics.bbox,
    occupied_pixels: metrics.occupied_pixels,
    occupancy: metrics.occupancy,
    colors: metrics.colors,
    orphan_pixels: metrics.orphan_pixels,
    vertical_symmetry: metrics.vertical_symmetry,
    warnings: metrics.warnings,
  }
}
