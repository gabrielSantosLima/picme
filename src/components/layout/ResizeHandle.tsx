import { useRef } from 'react'

export function ResizeHandle({
  onResize,
  onCollapse,
}: {
  onResize: (deltaX: number) => void
  onCollapse?: () => void
}) {
  const lastX = useRef(0)

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      tabIndex={0}
      title="Drag to resize · double-click to collapse"
      className="group relative w-2.5 shrink-0 cursor-col-resize touch-none bg-neutral-800/80 transition-colors hover:bg-sky-500/60 focus:outline-none focus-visible:bg-sky-500/70 active:bg-sky-400/70"
      onDoubleClick={onCollapse}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        onResize(event.key === 'ArrowRight' ? 16 : -16)
      }}
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
    >
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-700 transition-colors group-hover:bg-white/20" />
    </div>
  )
}
