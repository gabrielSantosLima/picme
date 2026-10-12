import { useEffect } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { useEditor } from './useEditor'

export function useEditorShortcuts(): void {
  const { zoom, setZoom } = useEditorContext()
  const editor = useEditor()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        editor.undo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        editor.redo()
      } else if (key === '+' || key === '=') {
        event.preventDefault()
        setZoom(zoom + 1)
      } else if (key === '-' || key === '_') {
        event.preventDefault()
        setZoom(zoom - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoom, setZoom, editor])
}
