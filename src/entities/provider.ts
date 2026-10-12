export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  custom: boolean
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    custom: false,
  },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', custom: false },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    custom: false,
  },
  { id: 'custom', name: 'Custom', baseUrl: '', custom: true },
]

export interface ModelInfo {
  id: string
  label: string
}

export interface ProviderSettings {
  providerId: string
  baseUrl: string
  model: string
  apiKey: string
}

export interface EncryptedValue {
  iv: Uint8Array<ArrayBuffer>
  data: Uint8Array<ArrayBuffer>
}

export interface StoredProviderSettings {
  providerId: string
  baseUrl: string
  model: string
  encryptedApiKey: EncryptedValue | null
}

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id)
}
