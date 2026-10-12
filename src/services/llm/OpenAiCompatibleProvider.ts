import type { ModelInfo } from '../../entities/provider'
import type { LLMProvider } from './LLMProvider'

interface ModelsResponse {
  data?: Array<{ id?: string; name?: string }>
}

export class OpenAiCompatibleProvider implements LLMProvider {
  constructor(
    readonly id: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    if (!response.ok) throw new Error(`Failed to list models (HTTP ${response.status})`)
    const body = (await response.json()) as ModelsResponse
    const models = Array.isArray(body.data) ? body.data : []
    return models
      .map((model) => model.id ?? model.name ?? '')
      .filter((id) => id.length > 0)
      .map((id) => ({ id, label: id }))
  }
}
