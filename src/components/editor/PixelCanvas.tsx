import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useEditorContext } from '../../contexts/EditorContext'
import type { Point } from '../../entities/geometry'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { useEditor } from '../../hooks/useEditor'
import { useDocumentStore } from '../../store/documentStore'
import { useSelectionStore } from '../../store/selectionStore'

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const project = useDocumentStore((state) => state.project)
  const { zoom, setZoom, showGrid } = useEditorContext()
  const mask = useSelectionStore((state) => state.mask)
  const maskWidth = useSelectionStore((state) => state.width)
  const maskHeight = useSelectionStore((state) => state.height)
  const floating = useSelectionStore((state) => state.floating)
  const { preview, pointerDown, pointerMove, pointerUp } = useEditor()

  const selectionView = useMemo(
    () => (mask ? { mask, width: maskWidth, height: maskHeight } : null),
    [mask, maskWidth, maskHeight],
  )

  const floatingView = useMemo(
    () =>
      floating
        ? {
            data: floating.data,
            width: floating.width,
            height: floating.height,
            x: floating.x,
            y: floating.y,
          }
        : null,
    [floating],
  )

  useCanvasRenderer(canvasRef, project, zoom, showGrid, selectionView, floatingView, preview)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      setZoom(zoom + (event.deltaY < 0 ? 1 : -1))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [zoom, setZoom])

  const toPixel = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * project.width)
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * project.height)
    return {
      x: Math.max(0, Math.min(project.width - 1, x)),
      y: Math.max(0, Math.min(project.height - 1, y)),
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="touch-none rounded border border-neutral-300 bg-white shadow-lg focus:outline-none"
      style={{
        width: project.width * zoom,
        height: project.height * zoom,
        imageRendering: 'pixelated',
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        pointerDown(toPixel(event), event.button === 2)
      }}
      onPointerMove={(event) => {
        if (event.buttons === 0) return
        pointerMove(toPixel(event))
      }}
      onPointerUp={() => pointerUp()}
      onPointerCancel={() => pointerUp()}
    />
  )
}
