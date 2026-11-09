import { ColorPalette } from '../components/editor/ColorPalette'
import { PixelCanvas } from '../components/editor/PixelCanvas'
import { Toolbar } from '../components/editor/Toolbar'
import { Timeline } from '../components/frames/Timeline'
import { RightDock } from '../components/layout/RightDock'
import { SidePanel } from '../components/layout/SidePanel'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { COLOR_MIN, DOCK_MIN, useLayoutStore } from '../store/layoutStore'

const MIN_CANVAS_WIDTH = 200
const PANEL_RAIL_WIDTH = 40
const RESIZE_HANDLE_WIDTH = 10

export function EditorPage() {
  useEditorShortcuts()
  const swapped = useLayoutStore((state) => state.swapped)
  const dockWidth = useLayoutStore((state) => state.dockWidth)
  const colorWidth = useLayoutStore((state) => state.colorWidth)
  const dockCollapsed = useLayoutStore((state) => state.dockCollapsed)
  const colorCollapsed = useLayoutStore((state) => state.colorCollapsed)
  const setDockWidth = useLayoutStore((state) => state.setDockWidth)
  const setColorWidth = useLayoutStore((state) => state.setColorWidth)
  const toggleDockCollapsed = useLayoutStore((state) => state.toggleDockCollapsed)
  const toggleColorCollapsed = useLayoutStore((state) => state.toggleColorCollapsed)

  const resizeDock = (delta: number) => {
    const state = useLayoutStore.getState()
    const otherWidth = state.colorCollapsed
      ? PANEL_RAIL_WIDTH
      : state.colorWidth + RESIZE_HANDLE_WIDTH
    const max = Math.max(
      DOCK_MIN,
      window.innerWidth - otherWidth - RESIZE_HANDLE_WIDTH - MIN_CANVAS_WIDTH,
    )
    const next = state.dockWidth + (state.swapped ? delta : -delta)
    setDockWidth(Math.min(next, max))
  }
  const resizeColor = (delta: number) => {
    const state = useLayoutStore.getState()
    const otherWidth = state.dockCollapsed
      ? PANEL_RAIL_WIDTH
      : state.dockWidth + RESIZE_HANDLE_WIDTH
    const max = Math.max(
      COLOR_MIN,
      window.innerWidth - otherWidth - RESIZE_HANDLE_WIDTH - MIN_CANVAS_WIDTH,
    )
    const next = state.colorWidth + (state.swapped ? -delta : delta)
    setColorWidth(Math.min(next, max))
  }

  const canvas = (
    <div className="flex flex-1 items-center justify-center overflow-auto p-4">
      <PixelCanvas />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="PicMe" className="h-6 w-6" />
        <h1 className="text-sm font-semibold tracking-wide">PicMe</h1>
      </header>

      <Toolbar />

      <div className="flex min-h-0 flex-1">
        {swapped ? (
          <>
            <SidePanel
              side="left"
              width={dockWidth}
              title="Workspace"
              collapsed={dockCollapsed}
              onToggleCollapse={toggleDockCollapsed}
              onResize={resizeDock}
            >
              <RightDock />
            </SidePanel>
            {canvas}
            <SidePanel
              side="right"
              width={colorWidth}
              title="Colors"
              collapsed={colorCollapsed}
              onToggleCollapse={toggleColorCollapsed}
              onResize={resizeColor}
            >
              <ColorPalette />
            </SidePanel>
          </>
        ) : (
          <>
            <SidePanel
              side="left"
              width={colorWidth}
              title="Colors"
              collapsed={colorCollapsed}
              onToggleCollapse={toggleColorCollapsed}
              onResize={resizeColor}
            >
              <ColorPalette />
            </SidePanel>
            {canvas}
            <SidePanel
              side="right"
              width={dockWidth}
              title="Workspace"
              collapsed={dockCollapsed}
              onToggleCollapse={toggleDockCollapsed}
              onResize={resizeDock}
            >
              <RightDock />
            </SidePanel>
          </>
        )}
      </div>

      <Timeline />
    </div>
  )
}
