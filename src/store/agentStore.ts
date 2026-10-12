import { create } from 'zustand'
import type { AgentPhase, PendingInteraction } from '../entities/agent'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
}

export type RightTab = 'layers' | 'agent'

interface AgentStoreState {
  rightTab: RightTab
  phase: AgentPhase
  messages: AgentMessage[]
  streamingText: string
  error: string | null
  pendingInteraction: PendingInteraction | null
  setRightTab: (tab: RightTab) => void
  setPhase: (phase: AgentPhase) => void
  addMessage: (message: { role: AgentMessage['role']; content: string }) => void
  setStreaming: (text: string) => void
  setError: (error: string | null) => void
  setPending: (pending: PendingInteraction | null) => void
  resetRun: () => void
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  rightTab: 'layers',
  phase: 'idle',
  messages: [],
  streamingText: '',
  error: null,
  pendingInteraction: null,
  setRightTab: (rightTab) => set({ rightTab }),
  setPhase: (phase) => set({ phase }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { id: crypto.randomUUID(), ...message }],
    })),
  setStreaming: (streamingText) => set({ streamingText }),
  setError: (error) => set({ error }),
  setPending: (pendingInteraction) => set({ pendingInteraction }),
  resetRun: () =>
    set({ messages: [], streamingText: '', error: null, pendingInteraction: null, phase: 'idle' }),
}))
