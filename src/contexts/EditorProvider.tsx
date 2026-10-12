import { useMemo, useState, type ReactNode } from 'react'
import { fromHex, type RGBA } from '../entities/color'
import { EditorContext, type EditorContextValue, type ToolId } from './EditorContext'

export function EditorProvider({ children }: { children: ReactNode }) {
  const [tool, setTool] = useState<ToolId>('pencil')
  const [primaryColor, setPrimaryColor] = useState<RGBA>(() => fromHex('#000000'))
  const [secondaryColor, setSecondaryColor] = useState<RGBA>(() => fromHex('#ffffff'))
  const [zoom, setZoom] = useState(16)
  const [showGrid, setShowGrid] = useState(true)
  const [shapeFilled, setShapeFilled] = useState(false)

  const value = useMemo<EditorContextValue>(
    () => ({
      tool,
      setTool,
      primaryColor,
      setPrimaryColor,
      secondaryColor,
      setSecondaryColor,
      swapColors: () => {
        setPrimaryColor(secondaryColor)
        setSecondaryColor(primaryColor)
      },
      zoom,
      setZoom,
      showGrid,
      toggleGrid: () => setShowGrid((current) => !current),
      shapeFilled,
      toggleShapeFilled: () => setShapeFilled((current) => !current),
    }),
    [tool, primaryColor, secondaryColor, zoom, showGrid, shapeFilled],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
