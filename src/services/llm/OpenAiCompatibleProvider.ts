import type { ModelInfo } from '../../entities/provider'
import type { LLMProvider } from './LLMProvider'
import { formatHttpError } from './errors'
import { readSse } from './sse'
import type { ChatChunk, ChatMessage, ChatRequest, ToolCall } from './types'

interface ModelsResponse {
  data?: Array<{ id?: string; name?: string }>
}

interface ApiToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface ApiContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface ApiMessage {
  role: string
  content: string | null | ApiContentPart[]
  tool_call_id?: string
  tool_calls?: ApiToolCall[]
}

interface StreamToolCallDelta {
  index: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface StreamDelta {
  content?: string | null
  tool_calls?: StreamToolCallDelta[]
}

interface StreamChoice {
  delta?: StreamDelta
  finish_reason?: string | null
}

interface StreamUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

interface StreamChunk {
  choices?: StreamChoice[]
  usage?: StreamUsage
}

export class OpenAiCompatibleProvider implements LLMProvider {
  constructor(
    readonly id: string,
    protected readonly baseUrl: string,
    protected readonly apiKey: string,
    protected readonly model: string,
  ) {}

  private endpoint(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}${path}`
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(this.endpoint('/models'), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(formatHttpError(response.status, body))
    }
    const body = (await response.json()) as ModelsResponse
    const models = Array.isArray(body.data) ? body.data : []
    return models
      .map((model) => model.id ?? model.name ?? '')
      .filter((id) => id.length > 0)
      .map((id) => ({ id, label: id }))
  }

  async *streamChat(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const response = await fetch(this.endpoint('/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map(toApiMessage),
        tools: request.tools,
        tool_choice: request.toolChoice,
        temperature: request.temperature,
        reasoning_effort: request.reasoningEffort,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(formatHttpError(response.status, detail))
    }
    if (!response.body) throw new Error('Streaming is not supported in this environment')

    for await (const data of readSse(response.body)) {
      if (data === '[DONE]') return
      let chunk: StreamChunk
      try {
        chunk = JSON.parse(data) as StreamChunk
      } catch {
        continue
      }
      const choice = chunk.choices?.[0]
      if (chunk.usage) {
        yield {
          type: 'usage',
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
        }
      }
      if (!choice) continue
      if (choice.delta?.content) yield { type: 'text', text: choice.delta.content }
      if (choice.delta?.tool_calls) {
        for (const call of choice.delta.tool_calls) {
          yield {
            type: 'tool_call_delta',
            index: call.index,
            id: call.id,
            name: call.function?.name,
            argsDelta: call.function?.arguments,
          }
        }
      }
      if (choice.finish_reason) yield { type: 'finish', reason: choice.finish_reason }
    }
  }
}

function toApiMessage(message: ChatMessage): ApiMessage {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls?.map(toApiToolCall),
    }
  }
  if (message.role === 'tool') {
    return { role: 'tool', content: message.content, tool_call_id: message.toolCallId }
  }
  if (message.images && message.images.length > 0) {
    const parts: ApiContentPart[] = []
    if (message.content) parts.push({ type: 'text', text: message.content })
    for (const url of message.images) parts.push({ type: 'image_url', image_url: { url } })
    return { role: message.role, content: parts }
  }
  return { role: message.role, content: message.content }
}

function toApiToolCall(call: ToolCall): ApiToolCall {
  return {
    id: call.id,
    type: 'function',
    function: { name: call.name, arguments: call.arguments },
  }
}
