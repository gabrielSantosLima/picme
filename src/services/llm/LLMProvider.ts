import type { ModelInfo } from '../../entities/provider'
import type { ChatChunk, ChatRequest } from './types'

export interface LLMProvider {
  id: string
  listModels(): Promise<ModelInfo[]>
  streamChat(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk>
}
