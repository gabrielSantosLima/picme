import { createContext, useContext } from 'react'
import type { RGBA } from '../entities/color'

export const ZOOM_MIN = 1
export const ZOOM_MAX = 64

export type ToolId =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'eyedropper'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'select-rect'
  | 'lasso'
  | 'magic-wand'

export interface EditorContextValue {
  tool: ToolId
  setTool: (tool: ToolId) => void
  primaryColor: RGBA
  setPrimaryColor: (color: RGBA) => void
  secondaryColor: RGBA
  setSecondaryColor: (color: RGBA) => void
  swapColors: () => void
  zoom: number
  setZoom: (zoom: number) => void
  showGrid: boolean
  toggleGrid: () => void
  shapeFilled: boolean
  toggleShapeFilled: () => void
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditorContext(): EditorContextValue {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditorContext must be used within an EditorProvider')
  return value
}
