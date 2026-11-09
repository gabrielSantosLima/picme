import type { ReactNode } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import type { DockSide } from '../../store/layoutStore'
import { ResizeHandle } from './ResizeHandle'

export function SidePanel({
  side,
  width,
  title,
  collapsed,
  onToggleCollapse,
  onResize,
  children,
}: {
  side: DockSide
  width: number
  title: string
  collapsed: boolean
  onToggleCollapse: () => void
  onResize: (deltaX: number) => void
  children: ReactNode
}) {
  if (collapsed) {
    return (
      <div
        className={[
          'flex h-full w-10 shrink-0 flex-col items-center bg-neutral-900',
          side === 'left' ? 'border-r' : 'border-l',
          'border-neutral-800',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title={`Expand ${title}`}
          aria-label={`Expand ${title}`}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
        >
          {side === 'left' ? <LuChevronRight /> : <LuChevronLeft />}
        </button>
        <span className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600 [writing-mode:vertical-rl]">
          {title}
        </span>
      </div>
    )
  }

  const panel = (
    <div
      className="flex h-full shrink-0 flex-col overflow-hidden bg-neutral-900"
      style={{ width }}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-neutral-800 px-2.5">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {title}
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={`Collapse ${title}`}
          aria-label={`Collapse ${title}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
        >
          {side === 'left' ? <LuChevronLeft /> : <LuChevronRight />}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )

  const handle = <ResizeHandle onResize={onResize} onCollapse={onToggleCollapse} />
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
