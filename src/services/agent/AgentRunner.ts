import type { AgentEvent, AgentSkill, SkillContext } from '../../entities/agent'
import type { ReasoningEffort } from '../../entities/provider'
import type { LLMProvider } from '../llm/LLMProvider'
import type { ChatMessage, ChatRequest, ToolCall } from '../llm/types'
import { buildTools } from './buildTools'

export interface AgentRunnerOptions {
  provider: LLMProvider
  systemPrompt: string
  skills?: AgentSkill[]
  maxSteps?: number
  temperature?: number
  reasoningEffort?: Exclude<ReasoningEffort, 'default'>
}

interface PartialToolCall {
  id: string
  name: string
  args: string
}

function parseArgs(raw: string): unknown {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function compactArguments(args: string): string {
  if (args.length <= 600) return args
  try {
    const parsed = JSON.parse(args) as Record<string, unknown>
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pixels)) {
      return JSON.stringify({ ...parsed, pixels: `[${parsed.pixels.length} rows omitted to save tokens]` })
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.variants)) {
      return JSON.stringify({
        ...parsed,
        variants: parsed.variants.map((variant) => {
          const item = variant as Record<string, unknown>
          if (item && typeof item === 'object' && Array.isArray(item.pixels)) {
            return { ...item, pixels: `[${item.pixels.length} rows omitted]` }
          }
          return item
        }),
      })
    }
    return JSON.stringify({ note: `arguments omitted (${args.length} chars)` })
  } catch {
    return JSON.stringify({ note: 'arguments omitted' })
  }
}

export class AgentRunner {
  constructor(private readonly options: AgentRunnerOptions) {}

  async *run(
    history: ChatMessage[],
    context: SkillContext,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    const skills = this.options.skills ?? []
    const skillMap = new Map(skills.map((skill) => [skill.name, skill]))
    const maxSteps = this.options.maxSteps ?? 6
    const tools = skills.length > 0 ? buildTools(skills) : undefined
    const messages: ChatMessage[] = [
      { role: 'system', content: this.options.systemPrompt },
      ...history,
    ]

    for (let step = 0; step < maxSteps; step += 1) {
      if (signal?.aborted) return

      const request: ChatRequest = {
        messages,
        tools,
        toolChoice: tools ? 'auto' : undefined,
        temperature: this.options.temperature,
        reasoningEffort: this.options.reasoningEffort,
      }

      const textParts: string[] = []
      const partial = new Map<number, PartialToolCall>()
      const announced = new Set<number>()

      try {
        for await (const chunk of this.options.provider.streamChat(request, signal)) {
          if (chunk.type === 'text') {
            textParts.push(chunk.text)
            yield { type: 'text', text: chunk.text }
          } else if (chunk.type === 'tool_call_delta') {
            const entry = partial.get(chunk.index) ?? { id: '', name: '', args: '' }
            if (chunk.id) entry.id = chunk.id
            if (chunk.name) entry.name += chunk.name
            if (chunk.argsDelta) entry.args += chunk.argsDelta
            partial.set(chunk.index, entry)
            if (entry.name.length > 0 && !announced.has(chunk.index)) {
              announced.add(chunk.index)
              yield { type: 'tool_preparing', name: entry.name }
            }
          } else if (chunk.type === 'usage') {
            yield { type: 'usage', totalTokens: chunk.totalTokens }
          }
        }
      } catch (error) {
        if (signal?.aborted) return
        yield {
          type: 'error',
          error: error instanceof Error ? error.message : 'Agent request failed',
        }
        return
      }

      const content = textParts.join('')
      const toolCalls: ToolCall[] = []
      for (const entry of partial.values()) {
        if (!entry.name) continue
        toolCalls.push({
          id: entry.id || `call_${toolCalls.length}`,
          name: entry.name,
          arguments: entry.args,
        })
      }

      messages.push({
        role: 'assistant',
        content: content.length > 0 ? content : null,
        toolCalls:
          toolCalls.length > 0
            ? toolCalls.map((call) => ({ ...call, arguments: compactArguments(call.arguments) }))
            : undefined,
      })

      if (toolCalls.length === 0) {
        if (content.trim().length === 0) {
          yield {
            type: 'error',
            error: 'The model returned an empty response. Try again or switch model.',
          }
          return
        }
        yield { type: 'message', content }
        return
      }

      for (const call of toolCalls) {
        const args = parseArgs(call.arguments)
        yield { type: 'tool_call', name: call.name, args }
        const skill = skillMap.get(call.name)
        let result: unknown
        if (!skill) {
          result = { error: `Unknown skill: ${call.name}` }
        } else {
          try {
            result = await skill.execute(args, context)
          } catch (error) {
            result = { error: error instanceof Error ? error.message : String(error) }
          }
        }
        yield { type: 'tool_result', name: call.name, result }
        messages.push({ role: 'tool', content: stringify(result), toolCallId: call.id })
      }
    }

    yield {
      type: 'message',
      content: 'I reached the step limit. Tell me if you want me to keep refining.',
    }
  }
}
