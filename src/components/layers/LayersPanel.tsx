import { LuEye, LuEyeOff, LuLayers, LuPlus, LuTrash2 } from 'react-icons/lu'
import { useEditor } from '../../hooks/useEditor'
import { useDocumentStore } from '../../store/documentStore'

export function LayersPanel() {
  const project = useDocumentStore((state) => state.project)
  const editor = useEditor()
  const frame = project.activeFrame
  const order = frame.layers.map((_, index) => index).reverse()

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 border-l border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-center justify-between text-sm font-medium text-neutral-200">
        <span className="flex items-center gap-2">
          <LuLayers /> Layers
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            title="Add layer"
            onClick={editor.addLayer}
            className="flex h-7 w-7 items-center justify-center rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            <LuPlus />
          </button>
          <button
            type="button"
            title="Delete layer"
            onClick={editor.deleteLayer}
            className="flex h-7 w-7 items-center justify-center rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            <LuTrash2 />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {order.map((index) => {
          const layer = frame.layers[index]
          const active = index === frame.activeLayerIndex
          return (
            <div
              key={layer.id}
              className={[
                'flex items-center gap-1 rounded px-2 py-1 text-sm',
                active ? 'bg-sky-600/30 text-white' : 'bg-neutral-800 text-neutral-300',
              ].join(' ')}
            >
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => editor.setActiveLayer(index)}
              >
                {layer.name}
              </button>
              <button
                type="button"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => editor.toggleLayerVisibility(index)}
                className="text-neutral-300 hover:text-white"
              >
                {layer.visible ? <LuEye /> : <LuEyeOff />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
