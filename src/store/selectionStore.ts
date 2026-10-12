import { create } from 'zustand'
import type { ClipboardBuffer, FloatingSelection } from '../entities/selection'

interface SelectionState {
  mask: Uint8Array | null
  width: number
  height: number
  floating: FloatingSelection | null
  clipboard: ClipboardBuffer | null
  setMask: (mask: Uint8Array | null, width: number, height: number) => void
  clear: () => void
  setFloating: (floating: FloatingSelection | null) => void
  moveFloating: (x: number, y: number) => void
  setClipboard: (clipboard: ClipboardBuffer | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  mask: null,
  width: 0,
  height: 0,
  floating: null,
  clipboard: null,
  setMask: (mask, width, height) => set({ mask, width, height }),
  clear: () => set({ mask: null, width: 0, height: 0 }),
  setFloating: (floating) => set({ floating }),
  moveFloating: (x, y) =>
    set((state) => (state.floating ? { floating: { ...state.floating, x, y } } : state)),
  setClipboard: (clipboard) => set({ clipboard }),
}))
