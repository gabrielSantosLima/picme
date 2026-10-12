import { ColorPalette } from '../components/editor/ColorPalette'
import { PixelCanvas } from '../components/editor/PixelCanvas'
import { Toolbar } from '../components/editor/Toolbar'
import { Timeline } from '../components/frames/Timeline'
import { RightDock } from '../components/layout/RightDock'
import { SidePanel } from '../components/layout/SidePanel'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { useLayoutStore } from '../store/layoutStore'

export function EditorPage() {
  useEditorShortcuts()
  const swapped = useLayoutStore((state) => state.swapped)
  const dockWidth = useLayoutStore((state) => state.dockWidth)
  const colorWidth = useLayoutStore((state) => state.colorWidth)
  const setDockWidth = useLayoutStore((state) => state.setDockWidth)
  const setColorWidth = useLayoutStore((state) => state.setColorWidth)

  const resizeDock = (delta: number) => {
    const current = useLayoutStore.getState().dockWidth
    setDockWidth(current + (swapped ? delta : -delta))
  }
  const resizeColor = (delta: number) => {
    const current = useLayoutStore.getState().colorWidth
    setColorWidth(current + (swapped ? -delta : delta))
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
            <SidePanel side="left" width={dockWidth} onResize={resizeDock}>
              <RightDock />
            </SidePanel>
            {canvas}
            <SidePanel side="right" width={colorWidth} onResize={resizeColor}>
              <ColorPalette />
            </SidePanel>
          </>
        ) : (
          <>
            <SidePanel side="left" width={colorWidth} onResize={resizeColor}>
              <ColorPalette />
            </SidePanel>
            {canvas}
            <SidePanel side="right" width={dockWidth} onResize={resizeDock}>
              <RightDock />
            </SidePanel>
          </>
        )}
      </div>

      <Timeline />
    </div>
  )
}
