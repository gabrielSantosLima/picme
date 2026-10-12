import type { ModelInfo } from '../../entities/provider'
import type { LLMProvider } from '../../services/llm/LLMProvider'

export class ListModels {
  constructor(private readonly provider: LLMProvider) {}

  execute(): Promise<ModelInfo[]> {
    return this.provider.listModels()
  }
}
