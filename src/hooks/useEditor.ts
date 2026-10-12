import { useRef, useState } from 'react'
import { useEditorContext, type ToolId } from '../contexts/EditorContext'
import { TRANSPARENT } from '../entities/color'
import type { Point } from '../entities/geometry'
import { selectionRepository } from '../services/selection/SelectionRepository'
import { useDocumentStore } from '../store/documentStore'
import { useSelectionStore } from '../store/selectionStore'
import { DrawShape } from '../useCases/canvas/DrawShape'
import { FillArea } from '../useCases/canvas/FillArea'
import { PaintStroke } from '../useCases/canvas/PaintStroke'
import { PickColor } from '../useCases/canvas/PickColor'
import { rasterizeShape, type ShapeKind } from '../useCases/canvas/raster'
import { AddFrame, DeleteFrame, DuplicateFrame, SetActiveFrame, SetFrameDuration } from '../useCases/frames/FrameUseCases'
import { AddLayer, DeleteLayer, SetActiveLayer, ToggleLayerVisibility } from '../useCases/layers/LayerUseCases'
import {
  BeginMoveSelection,
  CopySelection,
  DeleteSelection,
  DropSelection,
  FillSelection,
  MoveSelection,
  PasteSelection,
  SelectLasso,
  SelectMagicWand,
  SelectRectangle,
} from '../useCases/selection/SelectionUseCases'

const SHAPE_TOOLS: ToolId[] = ['line', 'rectangle', 'ellipse']

function toShapeKind(tool: ToolId): ShapeKind {
  if (tool === 'rectangle') return 'rectangle'
  if (tool === 'ellipse') return 'ellipse'
  return 'line'
}

function insideMask(mask: Uint8Array, width: number, height: number, point: Point): boolean {
  if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) return false
  return mask[point.y * width + point.x] === 1
}

export function useEditor() {
  const { tool, primaryColor, setPrimaryColor, shapeFilled } = useEditorContext()
  const [preview, setPreview] = useState<Uint32Array | null>(null)

  const strokeRef = useRef<PaintStroke | null>(null)
  const shapeStartRef = useRef<Point | null>(null)
  const selectStartRef = useRef<Point | null>(null)
  const selectingRef = useRef(false)
  const lassoRef = useRef<Point[]>([])
  const moveRef = useRef<{ origin: Point; start: { x: number; y: number } } | null>(null)
  const lastPointRef = useRef<Point | null>(null)

  const doc = () => useDocumentStore.getState()

  const buildPreview = (from: Point, to: Point): Uint32Array | null => {
    const project = doc().getProject()
    const overlay = new Uint32Array(project.width * project.height)
    for (const [x, y] of rasterizeShape(toShapeKind(tool), from, to, shapeFilled)) {
      if (x >= 0 && y >= 0 && x < project.width && y < project.height) {
        overlay[y * project.width + x] = primaryColor
      }
    }
    return overlay
  }

  const pointerDown = (point: Point, erase = false) => {
    lastPointRef.current = point

    if (erase) {
      strokeRef.current = new PaintStroke(doc(), TRANSPARENT)
      strokeRef.current.begin(point.x, point.y)
      return
    }

    const project = doc().getProject()

    if (tool === 'pencil' || tool === 'eraser') {
      strokeRef.current = new PaintStroke(doc(), tool === 'eraser' ? TRANSPARENT : primaryColor)
      strokeRef.current.begin(point.x, point.y)
      return
    }
    if (tool === 'fill') {
      new FillArea(doc(), primaryColor).execute(point.x, point.y)
      return
    }
    if (tool === 'eyedropper') {
      setPrimaryColor(new PickColor(doc()).execute(point.x, point.y))
      return
    }
    if (SHAPE_TOOLS.includes(tool)) {
      shapeStartRef.current = point
      setPreview(buildPreview(point, point))
      return
    }
    if (tool === 'select-rect') {
      const selection = useSelectionStore.getState()
      if (selection.mask && insideMask(selection.mask, selection.width, selection.height, point)) {
        new BeginMoveSelection(doc(), selectionRepository).execute()
        const floating = selectionRepository.getFloating()
        if (floating) {
          moveRef.current = { origin: point, start: { x: floating.x, y: floating.y } }
        }
      } else {
        selectStartRef.current = point
        selectingRef.current = true
        new SelectRectangle(selectionRepository).execute(point, point, project.width, project.height)
      }
      return
    }
    if (tool === 'lasso') {
      lassoRef.current = [point]
      return
    }
    if (tool === 'magic-wand') {
      new SelectMagicWand(doc(), selectionRepository).execute(point.x, point.y, 0)
    }
  }

  const pointerMove = (point: Point) => {
    lastPointRef.current = point
    const project = doc().getProject()

    if (strokeRef.current) {
      strokeRef.current.extend(point.x, point.y)
      return
    }
    if (shapeStartRef.current && SHAPE_TOOLS.includes(tool)) {
      setPreview(buildPreview(shapeStartRef.current, point))
      return
    }
    const selection = useSelectionStore.getState()
    if (moveRef.current && selection.floating) {
      const dx = point.x - moveRef.current.origin.x
      const dy = point.y - moveRef.current.origin.y
      new MoveSelection(selectionRepository).execute(moveRef.current.start.x + dx, moveRef.current.start.y + dy)
      return
    }
    if (selectingRef.current && selectStartRef.current) {
      new SelectRectangle(selectionRepository).execute(selectStartRef.current, point, project.width, project.height)
      return
    }
    if (tool === 'lasso' && lassoRef.current.length > 0) {
      const last = lassoRef.current[lassoRef.current.length - 1]
      if (last.x !== point.x || last.y !== point.y) lassoRef.current.push(point)
    }
  }

  const pointerUp = () => {
    if (strokeRef.current) {
      strokeRef.current.end()
      strokeRef.current = null
      return
    }
    if (shapeStartRef.current) {
      new DrawShape(doc(), primaryColor).execute(
        toShapeKind(tool),
        shapeStartRef.current,
        lastPointRef.current ?? shapeStartRef.current,
        shapeFilled,
      )
      shapeStartRef.current = null
      setPreview(null)
      return
    }
    if (moveRef.current) {
      new DropSelection(doc(), selectionRepository).execute()
      moveRef.current = null
      return
    }
    if (selectingRef.current) {
      selectingRef.current = false
      selectStartRef.current = null
      return
    }
    if (tool === 'lasso' && lassoRef.current.length >= 3) {
      const project = doc().getProject()
      new SelectLasso(selectionRepository).execute(lassoRef.current, project.width, project.height)
      lassoRef.current = []
    }
  }

  return {
    preview,
    pointerDown,
    pointerMove,
    pointerUp,
    addFrame: () => new AddFrame(doc()).execute(),
    duplicateFrame: () => new DuplicateFrame(doc()).execute(),
    deleteFrame: () => new DeleteFrame(doc()).execute(),
    setActiveFrame: (index: number) => new SetActiveFrame(doc()).execute(index),
    setFrameDuration: (index: number, durationMs: number) => new SetFrameDuration(doc()).execute(index, durationMs),
    addLayer: () => new AddLayer(doc()).execute(),
    deleteLayer: () => new DeleteLayer(doc()).execute(),
    toggleLayerVisibility: (index: number) => new ToggleLayerVisibility(doc()).execute(index),
    setActiveLayer: (index: number) => new SetActiveLayer(doc()).execute(index),
    undo: () => doc().undo(),
    redo: () => doc().redo(),
    deleteSelection: () => new DeleteSelection(doc(), selectionRepository).execute(),
    fillSelection: () => new FillSelection(doc(), selectionRepository, primaryColor).execute(),
    copySelection: () => new CopySelection(doc(), selectionRepository).execute(),
    pasteSelection: () => new PasteSelection(doc(), selectionRepository).execute(),
    clearSelection: () => selectionRepository.clearMask(),
  }
}
