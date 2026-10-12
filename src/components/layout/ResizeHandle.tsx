import { useRef } from 'react'

export function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const lastX = useRef(0)

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-1 shrink-0 cursor-col-resize bg-neutral-800 transition-colors hover:bg-sky-500"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        lastX.current = event.clientX
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return
        const delta = event.clientX - lastX.current
        lastX.current = event.clientX
        if (delta !== 0) onResize(delta)
      }}
    />
  )
}
