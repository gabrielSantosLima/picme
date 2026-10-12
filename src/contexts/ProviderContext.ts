import { createContext, useContext } from 'react'
import type { ProviderSettingsState } from '../hooks/useProviderSettings'

export const ProviderContext = createContext<ProviderSettingsState | null>(null)

export function useProvider(): ProviderSettingsState {
  const value = useContext(ProviderContext)
  if (!value) throw new Error('useProvider must be used within a ProviderProvider')
  return value
}
