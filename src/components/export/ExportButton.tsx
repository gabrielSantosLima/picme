import { useState } from 'react'
import { LuDownload, LuX } from 'react-icons/lu'
import { useExport } from '../../hooks/useExport'
import { useDocumentStore } from '../../store/documentStore'

type ExportFormat = 'gif' | 'spritesheet' | 'frames'

const optionClass = 'flex cursor-pointer items-center gap-2 text-sm text-neutral-200'

export function ExportButton() {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('gif')
  const [columns, setColumns] = useState(0)
  const [scale, setScale] = useState(1)
  const frameCount = useDocumentStore((state) => state.project.frames.length)
  const { exporting, exportGif, exportSpriteSheet, exportFrameImages } = useExport()

  const handleExport = async () => {
    if (format === 'gif') {
      await exportGif(scale)
    } else if (format === 'spritesheet') {
      const cols = columns > 0 ? columns : Math.max(1, Math.ceil(Math.sqrt(frameCount)))
      await exportSpriteSheet({ columns: cols, scale })
    } else {
      await exportFrameImages(scale)
    }
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        title="Export"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded text-lg text-white bg-sky-500 hover:bg-sky-400 focus:outline-none"
      >
        <LuDownload />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Export</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-white focus:outline-none"
              >
                <LuX />
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              <label className={optionClass}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'gif'}
                  onChange={() => setFormat('gif')}
                />
                GIF animation
              </label>
              <label className={optionClass}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'spritesheet'}
                  onChange={() => setFormat('spritesheet')}
                />
                Sprite sheet
              </label>
              <label className={optionClass}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'frames'}
                  onChange={() => setFormat('frames')}
                />
                Individual images
              </label>
            </div>

            {format === 'spritesheet' && (
              <label className="mb-3 flex items-center justify-between text-sm text-neutral-300">
                Columns
                <input
                  type="number"
                  min={1}
                  value={columns || ''}
                  placeholder="auto"
                  onChange={(event) => setColumns(Number(event.target.value))}
                  className="w-24 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
                />
              </label>
            )}

            <label className="mb-3 flex items-center justify-between text-sm text-neutral-300">
              Scale
              <input
                type="number"
                min={1}
                max={16}
                value={scale}
                onChange={(event) => setScale(Math.max(1, Number(event.target.value)))}
                className="w-24 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
              />
            </label>

            <p className="mb-4 text-xs text-neutral-500">{frameCount} frame(s)</p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 focus:outline-none"
              >
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
