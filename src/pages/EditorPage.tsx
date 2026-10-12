import { ColorPalette } from '../components/editor/ColorPalette'
import { PixelCanvas } from '../components/editor/PixelCanvas'
import { Toolbar } from '../components/editor/Toolbar'
import { Timeline } from '../components/frames/Timeline'
import { RightDock } from '../components/layout/RightDock'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'

export function EditorPage() {
  useEditorShortcuts()

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="PicMe" className="h-6 w-6" />
        <h1 className="text-sm font-semibold tracking-wide">PicMe</h1>
      </header>

      <Toolbar />

      <div className="flex min-h-0 flex-1">
        <ColorPalette />
        <div className="flex flex-1 items-center justify-center overflow-auto p-4">
          <PixelCanvas />
        </div>
        <RightDock />
      </div>

      <Timeline />
    </div>
  )
}
