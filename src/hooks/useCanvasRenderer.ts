import { useEffect, useRef, type RefObject } from 'react'
import type { Project } from '../entities/Project'
import {
  CanvasRenderer,
  type FloatingView,
  type SelectionView,
} from '../services/canvas/CanvasRenderer'

export function useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  project: Project,
  zoom: number,
  showGrid: boolean,
  selection: SelectionView | null,
  floating: FloatingView | null,
  preview: Uint32Array | null,
): void {
  const rendererRef = useRef<CanvasRenderer | null>(null)
  if (rendererRef.current === null) rendererRef.current = new CanvasRenderer()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    rendererRef.current?.render(canvas, project, { zoom, showGrid, selection, floating, preview })
  }, [canvasRef, project, zoom, showGrid, selection, floating, preview])
}
