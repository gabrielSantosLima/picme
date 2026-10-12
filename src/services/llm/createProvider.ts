import type { ProviderSettings } from '../../entities/provider'
import type { LLMProvider } from './LLMProvider'
import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider'

export function createProvider(settings: ProviderSettings): LLMProvider {
  return new OpenAiCompatibleProvider(
    settings.providerId,
    settings.baseUrl,
    settings.apiKey,
    settings.model,
  )
}
