import { useState } from 'react'
import { FaKey, FaList, FaShieldHalved } from 'react-icons/fa6'
import { LuX } from 'react-icons/lu'
import { useProvider } from '../../contexts/ProviderContext'
import { PROVIDER_PRESETS, findPreset } from '../../entities/provider'

const inputClass =
  'w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-sky-500'
const labelClass = 'flex flex-col gap-1 text-xs font-medium text-neutral-400'

export function ProviderSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <ProviderSettingsForm onClose={onClose} />
}

function ProviderSettingsForm({ onClose }: { onClose: () => void }) {
  const { settings, configured, models, modelsLoading, error, save, listModels } = useProvider()
  const [providerId, setProviderId] = useState(settings?.providerId ?? PROVIDER_PRESETS[0].id)
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? PROVIDER_PRESETS[0].baseUrl)
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? '')
  const [model, setModel] = useState(settings?.model ?? '')
  const [saving, setSaving] = useState(false)

  const preset = findPreset(providerId)

  const current = () => ({
    providerId,
    baseUrl,
    model,
    apiKey,
    reasoningEffort: settings?.reasoningEffort ?? 'default',
  })

  const handleProviderChange = (id: string) => {
    const preset = findPreset(id)
    setProviderId(id)
    if (preset && !preset.custom) setBaseUrl(preset.baseUrl)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await save(current())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Provider settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white focus:outline-none"
          >
            <LuX />
          </button>
        </div>

        {!configured && (
          <p className="rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Configure a provider to start using the agent.
          </p>
        )}

        <label className={labelClass}>
          Provider
          <select
            value={providerId}
            onChange={(event) => handleProviderChange(event.target.value)}
            className={inputClass}
          >
            {PROVIDER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Base URL
          <input
            type="text"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com/v1"
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="flex items-center gap-2">
            <FaKey /> API key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            className={inputClass}
          />
          {preset?.helpUrl && (
            <span className="text-[11px] font-normal text-neutral-500">
              {preset.helpTip}{' '}
              <a
                href={preset.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                Generate API key →
              </a>
            </span>
          )}
        </label>

        <label className={labelClass}>
          Model
          <div className="flex gap-2">
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="model-id"
              list="provider-models"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => listModels(current())}
              disabled={modelsLoading}
              className="flex shrink-0 items-center gap-2 rounded bg-neutral-800 px-3 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 focus:outline-none"
            >
              <FaList />
              {modelsLoading ? 'Loading…' : 'List'}
            </button>
          </div>
        </label>

        <datalist id="provider-models">
          {models.map((item) => (
            <option key={item.id} value={item.id} />
          ))}
        </datalist>

        {error && <p className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        <p className="flex items-start gap-2 rounded bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
          <span className="mt-0.5 text-sky-400">
            <FaShieldHalved />
          </span>
          Your API key is encrypted with the Web Crypto API (AES-GCM) and stored only in your browser
          (IndexedDB). It is never sent to our servers. Other settings are stored in plain text.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 focus:outline-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
