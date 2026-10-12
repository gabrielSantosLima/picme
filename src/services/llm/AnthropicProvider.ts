import type { ModelInfo } from '../../entities/provider'
import type { LLMProvider } from './LLMProvider'
import { formatHttpError } from './errors'
import { readSse } from './sse'
import type { ChatChunk, ChatMessage, ChatRequest } from './types'

const API_VERSION = '2023-06-01'
const MAX_TOKENS = 4096

interface AnthropicTextBlock {
  type: 'text'
  text: string
}
interface AnthropicImageBlock {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string }
}
interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}
interface AnthropicToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}
type AnthropicBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicBlock[]
}

interface AnthropicRequest {
  model: string
  max_tokens: number
  system?: string
  messages: AnthropicMessage[]
  tools?: Array<{ name: string; description: string; input_schema: unknown }>
  tool_choice?: { type: 'auto' }
  temperature?: number
  stream: boolean
}

interface AnthropicModelsResponse {
  data?: Array<{ id?: string; display_name?: string }>
}

interface AnthropicStreamEvent {
  type: string
  index?: number
  message?: { usage?: { input_tokens?: number } }
  content_block?: { type?: string; id?: string; name?: string }
  delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string }
  usage?: { output_tokens?: number }
  error?: { message?: string }
}

function safeParse(raw: string): unknown {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function parseDataUrl(url: string): { mediaType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(url)
  if (!match) return null
  return { mediaType: match[1], data: match[2] }
}

function toAnthropicMessages(messages: ChatMessage[]): {
  system: string
  messages: AnthropicMessage[]
} {
  let system = ''
  const out: AnthropicMessage[] = []

  for (const message of messages) {
    if (message.role === 'system') {
      system = system ? `${system}\n${message.content ?? ''}` : message.content ?? ''
      continue
    }

    if (message.role === 'user') {
      const blocks: AnthropicBlock[] = []
      if (message.content) blocks.push({ type: 'text', text: message.content })
      for (const url of message.images ?? []) {
        const parsed = parseDataUrl(url)
        if (parsed) {
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: parsed.mediaType, data: parsed.data },
          })
        }
      }
      out.push({ role: 'user', content: blocks.length > 0 ? blocks : message.content ?? '' })
      continue
    }

    if (message.role === 'assistant') {
      const blocks: AnthropicBlock[] = []
      if (message.content) blocks.push({ type: 'text', text: message.content })
      for (const call of message.toolCalls ?? []) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: safeParse(call.arguments),
        })
      }
      out.push({ role: 'assistant', content: blocks.length > 0 ? blocks : message.content ?? '' })
      continue
    }

    const block: AnthropicToolResultBlock = {
      type: 'tool_result',
      tool_use_id: message.toolCallId ?? '',
      content: message.content ?? '',
    }
    const last = out[out.length - 1]
    if (last && last.role === 'user' && Array.isArray(last.content)) {
      last.content.push(block)
    } else {
      out.push({ role: 'user', content: [block] })
    }
  }

  return { system, messages: out }
}

export class AnthropicProvider implements LLMProvider {
  constructor(
    readonly id: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: this.headers(),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(formatHttpError(response.status, body))
    }
    const body = (await response.json()) as AnthropicModelsResponse
    const models = Array.isArray(body.data) ? body.data : []
    return models
      .map((model) => ({ id: model.id ?? '', label: model.display_name ?? model.id ?? '' }))
      .filter((model) => model.id.length > 0)
  }

  async *streamChat(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const { system, messages } = toAnthropicMessages(request.messages)
    const body: AnthropicRequest = {
      model: this.model,
      max_tokens: MAX_TOKENS,
      messages,
      stream: true,
    }
    if (system) body.system = system
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }))
      body.tool_choice = { type: 'auto' }
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(formatHttpError(response.status, detail))
    }
    if (!response.body) throw new Error('Streaming is not supported in this environment')

    let inputTokens = 0
    for await (const data of readSse(response.body)) {
      let event: AnthropicStreamEvent
      try {
        event = JSON.parse(data) as AnthropicStreamEvent
      } catch {
        continue
      }

      if (event.type === 'error') {
        throw new Error(event.error?.message ?? 'Provider returned an error')
      }
      if (event.type === 'message_start') {
        inputTokens = event.message?.usage?.input_tokens ?? 0
      } else if (event.type === 'content_block_start') {
        const block = event.content_block
        if (block?.type === 'tool_use') {
          yield { type: 'tool_call_delta', index: event.index ?? 0, id: block.id, name: block.name }
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta
        if (delta?.type === 'text_delta' && delta.text) {
          yield { type: 'text', text: delta.text }
        } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
          yield { type: 'tool_call_delta', index: event.index ?? 0, argsDelta: delta.partial_json }
        }
      } else if (event.type === 'message_delta') {
        const outputTokens = event.usage?.output_tokens ?? 0
        yield {
          type: 'usage',
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        }
        if (event.delta?.stop_reason) yield { type: 'finish', reason: event.delta.stop_reason }
      }
    }
  }
}
