import { LuCopy, LuPause, LuPlay, LuPlus, LuTrash2 } from 'react-icons/lu'
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback'
import { useEditor } from '../../hooks/useEditor'
import { useDocumentStore } from '../../store/documentStore'

const iconButton =
  'flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 focus:outline-none'

export function Timeline() {
  const project = useDocumentStore((state) => state.project)
  const editor = useEditor()
  const playback = useAnimationPlayback(project, editor.setActiveFrame)
  const activeFrame = project.activeFrame

  return (
    <div className="flex items-center gap-3 border-t border-neutral-800 bg-neutral-900 px-3 py-2">
      <button type="button" title="Play" className={iconButton} onClick={playback.toggle}>
        {playback.playing ? <LuPause /> : <LuPlay />}
      </button>
      <button type="button" title="Add frame" className={iconButton} onClick={editor.addFrame}>
        <LuPlus />
      </button>
      <button type="button" title="Duplicate frame" className={iconButton} onClick={editor.duplicateFrame}>
        <LuCopy />
      </button>
      <button type="button" title="Delete frame" className={iconButton} onClick={editor.deleteFrame}>
        <LuTrash2 />
      </button>

      <label className="flex items-center gap-2 text-xs text-neutral-400">
        Duration
        <input
          type="number"
          min={20}
          step={10}
          value={activeFrame.durationMs}
          onChange={(event) => editor.setFrameDuration(project.activeFrameIndex, Number(event.target.value))}
          className="w-20 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-neutral-100"
        />
        ms
      </label>

      <div className="flex flex-1 gap-2 overflow-x-auto">
        {project.frames.map((frame, index) => {
          const active = index === project.activeFrameIndex
          return (
            <button
              key={frame.id}
              type="button"
              onClick={() => editor.setActiveFrame(index)}
              className={[
                'flex h-10 min-w-12 flex-col items-center justify-center rounded-md border-2 px-2 text-xs transition-colors focus:outline-none',
                active
                  ? 'border-sky-400 bg-sky-600 text-white'
                  : 'border-transparent bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
              ].join(' ')}
            >
              <span className="font-semibold">{index + 1}</span>
              <span className="text-[10px] text-neutral-400">{frame.durationMs}ms</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
