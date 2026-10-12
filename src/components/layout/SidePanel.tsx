import type { ReactNode } from 'react'
import type { DockSide } from '../../store/layoutStore'
import { ResizeHandle } from './ResizeHandle'

export function SidePanel({
  side,
  width,
  onResize,
  children,
}: {
  side: DockSide
  width: number
  onResize: (deltaX: number) => void
  children: ReactNode
}) {
  const panel = (
    <div className="h-full shrink-0 overflow-hidden" style={{ width }}>
      {children}
    </div>
  )
  const handle = <ResizeHandle onResize={onResize} />
  return side === 'left' ? (
    <>
      {panel}
      {handle}
    </>
  ) : (
    <>
      {handle}
      {panel}
    </>
  )
}
