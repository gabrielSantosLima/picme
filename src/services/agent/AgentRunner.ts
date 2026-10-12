import type { AgentEvent, AgentSkill, SkillContext } from '../../entities/agent'
import type { LLMProvider } from '../llm/LLMProvider'
import type { ChatMessage, ChatRequest, ToolCall } from '../llm/types'
import { buildTools } from './buildTools'

export interface AgentRunnerOptions {
  provider: LLMProvider
  systemPrompt: string
  skills?: AgentSkill[]
  maxSteps?: number
  temperature?: number
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
      }

      const textParts: string[] = []
      const partial = new Map<number, PartialToolCall>()

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
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      })

      if (toolCalls.length === 0) {
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

    yield { type: 'error', error: `Agent stopped after ${maxSteps} steps` }
  }
}
