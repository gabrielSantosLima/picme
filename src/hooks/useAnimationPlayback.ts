import { useEffect, useRef, useState } from 'react'
import type { Project } from '../entities/Project'

export function useAnimationPlayback(project: Project, onFrame: (index: number) => void) {
  const [playing, setPlaying] = useState(false)
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!playing || project.frames.length <= 1) return
    const frame = project.activeFrame
    const timer = setTimeout(() => {
      onFrameRef.current((project.activeFrameIndex + 1) % project.frames.length)
    }, frame.durationMs)
    return () => clearTimeout(timer)
  }, [playing, project])

  return {
    playing,
    toggle: () => setPlaying((current) => !current),
    stop: () => setPlaying(false),
  }
}
