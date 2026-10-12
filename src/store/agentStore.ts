import { create } from 'zustand'
import type { AgentPhase, PendingInteraction } from '../entities/agent'

export type AgentEntry =
  | { id: string; kind: 'message'; role: 'user' | 'assistant' | 'error'; content: string }
  | { id: string; kind: 'divider'; label: string }
  | { id: string; kind: 'skill'; name: string; status: 'running' | 'done'; args: string; result: string }

export type AgentEntryInput =
  | { kind: 'message'; role: 'user' | 'assistant' | 'error'; content: string }
  | { kind: 'divider'; label: string }
  | { kind: 'skill'; name: string; status: 'running' | 'done'; args: string; result: string }

export type RightTab = 'layers' | 'agent'

interface AgentStoreState {
  rightTab: RightTab
  phase: AgentPhase
  entries: AgentEntry[]
  streamingText: string
  tokens: number
  preparing: string | null
  pendingInteraction: PendingInteraction | null
  setRightTab: (tab: RightTab) => void
  setPhase: (phase: AgentPhase) => void
  setStreaming: (text: string) => void
  addTokens: (count: number) => void
  setPreparing: (name: string | null) => void
  setPending: (pending: PendingInteraction | null) => void
  addEntry: (entry: AgentEntryInput) => string
  updateEntry: (id: string, patch: Record<string, unknown>) => void
  removeEntry: (id: string) => void
  resetRun: () => void
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  rightTab: 'layers',
  phase: 'idle',
  entries: [],
  streamingText: '',
  tokens: 0,
  preparing: null,
  pendingInteraction: null,
  setRightTab: (rightTab) => set({ rightTab }),
  setPhase: (phase) => set({ phase }),
  setStreaming: (streamingText) => set({ streamingText }),
  addTokens: (count) => set((state) => ({ tokens: state.tokens + count })),
  setPreparing: (preparing) => set({ preparing }),
  setPending: (pendingInteraction) => set({ pendingInteraction }),
  addEntry: (entry) => {
    const id = crypto.randomUUID()
    set((state) => ({ entries: [...state.entries, { ...entry, id } as AgentEntry] }))
    return id
  },
  updateEntry: (id, patch) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? ({ ...entry, ...patch } as AgentEntry) : entry,
      ),
    })),
  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
  resetRun: () =>
    set({
      entries: [],
      streamingText: '',
      tokens: 0,
      preparing: null,
      pendingInteraction: null,
      phase: 'idle',
    }),
}))
