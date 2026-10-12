import type { ReactNode } from 'react'
import { useProviderSettings } from '../hooks/useProviderSettings'
import { ProviderContext } from './ProviderContext'

export function ProviderProvider({ children }: { children: ReactNode }) {
  const value = useProviderSettings()
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
}
