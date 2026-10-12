import type { ModelInfo } from '../../entities/provider'
import { formatHttpError } from './errors'
import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider'

interface GeminiModelsResponse {
  models?: Array<{ name?: string }>
}

export class GeminiOpenAiProvider extends OpenAiCompatibleProvider {
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`,
    )
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(formatHttpError(response.status, body))
    }
    const body = (await response.json()) as GeminiModelsResponse
    const models = Array.isArray(body.models) ? body.models : []
    return models
      .map((model) => (model.name ?? '').replace(/^models\//, ''))
      .filter((id) => id.length > 0)
      .map((id) => ({ id, label: id }))
  }
}
