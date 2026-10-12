import type { JsonSchema } from '../../entities/agent'

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ToolCall {
  id: string
  name: string
  arguments: string
}

export interface ChatMessage {
  role: ChatRole
  content: string | null
  toolCallId?: string
  toolCalls?: ToolCall[]
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JsonSchema
  }
}

export type ToolChoice = 'auto' | 'none' | { type: 'function'; function: { name: string } }

export interface ChatRequest {
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  toolChoice?: ToolChoice
  temperature?: number
}

export type ChatChunk =
  | { type: 'text'; text: string }
  | {
      type: 'tool_call_delta'
      index: number
      id?: string
      name?: string
      argsDelta?: string
    }
  | { type: 'finish'; reason: string }
