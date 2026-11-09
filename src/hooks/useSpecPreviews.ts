import { useMemo } from 'react'
import type { ArtVariant } from '../entities/agent'
import { gridToDataUrl } from '../services/canvas/gridToDataUrl'

export function useSpecPreviews(variants: ArtVariant[]): string[] {
  return useMemo(
    () => variants.map((variant) => gridToDataUrl(variant.rendered.grid, 6)),
    [variants],
  )
}
