import type { ModelInfo } from '../../entities/provider'

export interface LLMProvider {
  id: string
  listModels(): Promise<ModelInfo[]>
}
