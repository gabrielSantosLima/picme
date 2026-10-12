export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  model: string
  custom: boolean
  helpUrl?: string
  helpTip?: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    model: 'deepseek-ai/DeepSeek-V4.1-Flash',
    custom: false,
    helpUrl: 'https://deepinfra.com/dash/api_keys',
    helpTip: 'Open DeepInfra → Dashboard → API keys.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    custom: false,
    helpUrl: 'https://platform.openai.com/api-keys',
    helpTip: 'Open platform.openai.com → API keys → Create new secret key.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    custom: false,
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpTip: 'Open Google AI Studio → Get API key.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest',
    custom: false,
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpTip: 'Open the Anthropic Console → Settings → API keys → Create key.',
  },
  { id: 'custom', name: 'Custom', baseUrl: '', model: '', custom: true },
]

export interface ModelInfo {
  id: string
  label: string
}

export type ReasoningEffort = 'default' | 'minimal' | 'low' | 'medium' | 'high'

export interface ProviderSettings {
  providerId: string
  baseUrl: string
  model: string
  apiKey: string
  reasoningEffort: ReasoningEffort
}

export interface EncryptedValue {
  iv: Uint8Array<ArrayBuffer>
  data: Uint8Array<ArrayBuffer>
}

export interface StoredProviderSettings {
  providerId: string
  baseUrl: string
  model: string
  reasoningEffort?: ReasoningEffort
  encryptedApiKey: EncryptedValue | null
}

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id)
}
