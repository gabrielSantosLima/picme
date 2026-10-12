import type { IconType } from 'react-icons'
import {
  FaBorderAll,
  FaEraser,
  FaEyeDropper,
  FaFillDrip,
  FaPencil,
  FaRegCircle,
  FaRegSquare,
  FaSlash,
  FaTableCells,
  FaWandMagicSparkles,
} from 'react-icons/fa6'
import {
  LuClipboard,
  LuCopy,
  LuLasso,
  LuPaintBucket,
  LuRedo2,
  LuSquareDashed,
  LuTrash2,
  LuUndo2,
  LuX,
} from 'react-icons/lu'
import { useEditorContext, type ToolId } from '../../contexts/EditorContext'
import { useEditor } from '../../hooks/useEditor'
import { AgentButton } from '../agent/AgentButton'
import { ExportButton } from '../export/ExportButton'

interface ToolButton {
  id: ToolId
  label: string
  icon: IconType
}

const TOOLS: ToolButton[] = [
  { id: 'pencil', label: 'Pencil', icon: FaPencil },
  { id: 'eraser', label: 'Eraser', icon: FaEraser },
  { id: 'fill', label: 'Fill', icon: FaFillDrip },
  { id: 'eyedropper', label: 'Eyedropper', icon: FaEyeDropper },
  { id: 'line', label: 'Line', icon: FaSlash },
  { id: 'rectangle', label: 'Rectangle', icon: FaRegSquare },
  { id: 'ellipse', label: 'Ellipse', icon: FaRegCircle },
  { id: 'select-rect', label: 'Select', icon: LuSquareDashed },
  { id: 'lasso', label: 'Lasso', icon: LuLasso },
  { id: 'magic-wand', label: 'Magic wand', icon: FaWandMagicSparkles },
]

const SHAPE_TOOLS: ToolId[] = ['line', 'rectangle', 'ellipse']

function buttonClass(active: boolean): string {
  return [
    'flex h-9 w-9 items-center justify-center rounded text-lg transition-colors focus:outline-none',
    active ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
  ].join(' ')
}

export function Toolbar() {
  const { tool, setTool, showGrid, toggleGrid, shapeFilled, toggleShapeFilled, zoom, setZoom } =
    useEditorContext()
  const editor = useEditor()

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
      <div className="flex gap-1">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            className={buttonClass(tool === id)}
            onClick={() => setTool(id)}
          >
            <Icon />
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-neutral-700" />

      {SHAPE_TOOLS.includes(tool) && (
        <button
          type="button"
          title="Toggle fill"
          className={buttonClass(shapeFilled)}
          onClick={toggleShapeFilled}
        >
          <FaBorderAll />
        </button>
      )}

      <button type="button" title="Undo" className={buttonClass(false)} onClick={editor.undo}>
        <LuUndo2 />
      </button>
      <button type="button" title="Redo" className={buttonClass(false)} onClick={editor.redo}>
        <LuRedo2 />
      </button>

      <div className="mx-1 h-6 w-px bg-neutral-700" />

      <button type="button" title="Delete selection" className={buttonClass(false)} onClick={editor.deleteSelection}>
        <LuTrash2 />
      </button>
      <button type="button" title="Fill selection" className={buttonClass(false)} onClick={editor.fillSelection}>
        <LuPaintBucket />
      </button>
      <button type="button" title="Copy selection" className={buttonClass(false)} onClick={editor.copySelection}>
        <LuCopy />
      </button>
      <button type="button" title="Paste" className={buttonClass(false)} onClick={editor.pasteSelection}>
        <LuClipboard />
      </button>
      <button type="button" title="Clear selection" className={buttonClass(false)} onClick={editor.clearSelection}>
        <LuX />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <AgentButton />
        <button
          type="button"
          title="Zoom out"
          className={buttonClass(false)}
          onClick={() => setZoom(zoom - 1)}
        >
          −
        </button>
        <span className="w-12 text-center text-xs text-neutral-300">{zoom}×</span>
        <button
          type="button"
          title="Zoom in"
          className={buttonClass(false)}
          onClick={() => setZoom(zoom + 1)}
        >
          +
        </button>
        <button
          type="button"
          title="Toggle grid"
          className={buttonClass(showGrid)}
          onClick={toggleGrid}
        >
          <FaTableCells />
        </button>
        <ExportButton />
      </div>
    </div>
  )
}
