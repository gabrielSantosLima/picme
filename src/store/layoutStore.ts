import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DOCK_MIN = 220
export const DOCK_MAX = 720
export const COLOR_MIN = 180
export const COLOR_MAX = 420

export type DockSide = 'left' | 'right'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

interface LayoutState {
  swapped: boolean
  dockWidth: number
  colorWidth: number
  dockCollapsed: boolean
  colorCollapsed: boolean
  setDockWidth: (width: number) => void
  setColorWidth: (width: number) => void
  toggleSwap: () => void
  toggleDockCollapsed: () => void
  toggleColorCollapsed: () => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      swapped: false,
      dockWidth: 320,
      colorWidth: 224,
      dockCollapsed: false,
      colorCollapsed: false,
      setDockWidth: (width) => set({ dockWidth: clamp(width, DOCK_MIN, DOCK_MAX) }),
      setColorWidth: (width) => set({ colorWidth: clamp(width, COLOR_MIN, COLOR_MAX) }),
      toggleSwap: () => set((state) => ({ swapped: !state.swapped })),
      toggleDockCollapsed: () => set((state) => ({ dockCollapsed: !state.dockCollapsed })),
      toggleColorCollapsed: () => set((state) => ({ colorCollapsed: !state.colorCollapsed })),
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
