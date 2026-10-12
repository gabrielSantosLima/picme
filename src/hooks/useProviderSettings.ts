import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModelInfo, ProviderSettings } from '../entities/provider'
import { createProvider } from '../services/llm/createProvider'
import { IndexedDbProviderSettingsRepository } from '../services/storage/ProviderSettingsRepository'
import { ListModels } from '../useCases/settings/ListModels'
import { LoadProviderSettings } from '../useCases/settings/LoadProviderSettings'
import { SaveProviderSettings } from '../useCases/settings/SaveProviderSettings'

export interface ProviderSettingsState {
  settings: ProviderSettings | null
  configured: boolean
  loading: boolean
  models: ModelInfo[]
  modelsLoading: boolean
  error: string | null
  save: (settings: ProviderSettings) => Promise<void>
  listModels: (settings: ProviderSettings) => Promise<void>
  clearError: () => void
}

export function useProviderSettings(): ProviderSettingsState {
  const repository = useMemo(() => new IndexedDbProviderSettingsRepository(), [])
  const [settings, setSettings] = useState<ProviderSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    new LoadProviderSettings(repository)
      .execute()
      .then((loaded) => {
        if (active) setSettings(loaded)
      })
      .catch(() => {
        if (active) setError('Failed to load provider settings')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repository])

  const save = useCallback(
    async (next: ProviderSettings) => {
      setError(null)
      await new SaveProviderSettings(repository).execute(next)
      setSettings(next)
    },
    [repository],
  )

  const listModels = useCallback(async (next: ProviderSettings) => {
    setModelsLoading(true)
    setError(null)
    try {
      setModels(await new ListModels(createProvider(next)).execute())
    } catch (listError) {
      setModels([])
      setError(listError instanceof Error ? listError.message : 'Failed to list models')
    } finally {
      setModelsLoading(false)
    }
  }, [])

  const configured = Boolean(
    settings && settings.apiKey && settings.model && settings.baseUrl,
  )

  return {
    settings,
    configured,
    loading,
    models,
    modelsLoading,
    error,
    save,
    listModels,
    clearError: () => setError(null),
  }
}
