import { useEffect, useRef, useState } from 'react'
import { LuChevronDown, LuSettings } from 'react-icons/lu'
import { useProvider } from '../../contexts/ProviderContext'
import type { ReasoningEffort } from '../../entities/provider'
import { ProviderSettingsDialog } from '../settings/ProviderSettingsDialog'
import { TokenMeter } from './TokenMeter'

const REASONING_LEVELS: ReasoningEffort[] = ['default', 'minimal', 'low', 'medium', 'high']

export function AgentSettingsBar() {
  const { settings, models, modelsLoading, save, listModels } = useProvider()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    if (settings && settings.model && models.length === 0 && !modelsLoading) {
      requested.current = true
      void listModels(settings)
    }
  }, [settings, models.length, modelsLoading, listModels])

  if (!settings) return null

  const modelOptions = Array.from(
    new Set([settings.model, ...models.map((model) => model.id)].filter(Boolean)),
  )

  const changeModel = (model: string) => {
    void save({ ...settings, model })
  }

  const changeReasoning = (reasoningEffort: ReasoningEffort) => {
    void save({ ...settings, reasoningEffort })
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        <select
          value={settings.model}
          onChange={(event) => changeModel(event.target.value)}
          className="w-full cursor-pointer appearance-none truncate rounded-full border border-neutral-800 bg-neutral-900/70 py-1 pl-2.5 pr-6 text-[13px] font-medium text-neutral-300 transition-colors hover:border-neutral-700 focus:border-sky-500/60 focus:outline-none"
        >
          {modelOptions.length === 0 && (
            <option value="" className="bg-neutral-800 text-neutral-100">
              No model
            </option>
          )}
          {modelOptions.map((id) => (
            <option key={id} value={id} className="bg-neutral-800 text-neutral-100">
              {id}
            </option>
          ))}
        </select>
        <LuChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[13px] text-neutral-500" />
      </div>

      <div className="relative shrink-0">
        <select
          value={settings.reasoningEffort}
          onChange={(event) => changeReasoning(event.target.value as ReasoningEffort)}
          className="cursor-pointer appearance-none rounded-full border border-neutral-800 bg-neutral-900/70 py-1 pl-2.5 pr-6 text-[13px] font-medium capitalize text-neutral-300 transition-colors hover:border-neutral-700 focus:border-sky-500/60 focus:outline-none"
        >
          {REASONING_LEVELS.map((level) => (
            <option key={level} value={level} className="bg-neutral-800 text-neutral-100">
              {level}
            </option>
          ))}
        </select>
        <LuChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[13px] text-neutral-500" />
      </div>

      <TokenMeter />

      <button
        type="button"
        title="Provider settings"
        onClick={() => setSettingsOpen(true)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none"
      >
        <LuSettings />
      </button>

      <ProviderSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
