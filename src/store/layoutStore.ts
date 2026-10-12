import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DOCK_MIN = 180
export const DOCK_MAX = 480

export type DockSide = 'left' | 'right'

function clamp(value: number): number {
  return Math.max(DOCK_MIN, Math.min(DOCK_MAX, Math.round(value)))
}

interface LayoutState {
  swapped: boolean
  dockWidth: number
  colorWidth: number
  setDockWidth: (width: number) => void
  setColorWidth: (width: number) => void
  toggleSwap: () => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      swapped: false,
      dockWidth: 288,
      colorWidth: 208,
      setDockWidth: (width) => set({ dockWidth: clamp(width) }),
      setColorWidth: (width) => set({ colorWidth: clamp(width) }),
      toggleSwap: () => set((state) => ({ swapped: !state.swapped })),
    }),
    { name: 'picme-layout' },
  ),
)

export function dockSide(swapped: boolean): DockSide {
  return swapped ? 'left' : 'right'
}

export function colorSide(swapped: boolean): DockSide {
  return swapped ? 'right' : 'left'
}
