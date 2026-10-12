import type { ClipboardBuffer, FloatingSelection } from '../../entities/selection'
import { useSelectionStore } from '../../store/selectionStore'

export interface SelectionRepository {
  getMask(): Uint8Array | null
  getSize(): { width: number; height: number }
  setMask(mask: Uint8Array | null, width: number, height: number): void
  clearMask(): void
  getFloating(): FloatingSelection | null
  setFloating(floating: FloatingSelection | null): void
  moveFloating(x: number, y: number): void
  getClipboard(): ClipboardBuffer | null
  setClipboard(clipboard: ClipboardBuffer | null): void
}

export const selectionRepository: SelectionRepository = {
  getMask: () => useSelectionStore.getState().mask,
  getSize: () => {
    const state = useSelectionStore.getState()
    return { width: state.width, height: state.height }
  },
  setMask: (mask, width, height) => useSelectionStore.getState().setMask(mask, width, height),
  clearMask: () => useSelectionStore.getState().clear(),
  getFloating: () => useSelectionStore.getState().floating,
  setFloating: (floating) => useSelectionStore.getState().setFloating(floating),
  moveFloating: (x, y) => useSelectionStore.getState().moveFloating(x, y),
  getClipboard: () => useSelectionStore.getState().clipboard,
  setClipboard: (clipboard) => useSelectionStore.getState().setClipboard(clipboard),
}
