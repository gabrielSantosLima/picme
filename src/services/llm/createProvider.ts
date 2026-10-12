import type { ProviderSettings } from '../../entities/provider'
import { AnthropicProvider } from './AnthropicProvider'
import { GeminiOpenAiProvider } from './GeminiOpenAiProvider'
import type { LLMProvider } from './LLMProvider'
import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider'

export function createProvider(settings: ProviderSettings): LLMProvider {
  if (settings.providerId === 'gemini') {
    return new GeminiOpenAiProvider(
      settings.providerId,
      settings.baseUrl,
      settings.apiKey,
      settings.model,
    )
  }
  if (settings.providerId === 'anthropic') {
    return new AnthropicProvider(
      settings.providerId,
      settings.baseUrl,
      settings.apiKey,
      settings.model,
    )
  }
  return new OpenAiCompatibleProvider(
    settings.providerId,
    settings.baseUrl,
    settings.apiKey,
    settings.model,
  )
}
