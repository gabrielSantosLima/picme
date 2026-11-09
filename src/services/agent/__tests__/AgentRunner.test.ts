import { describe, expect, it } from 'vitest'
import type { AgentEvent, AgentSkill } from '../../../entities/agent'
import { AgentRunner } from '../AgentRunner'
import type { LLMProvider } from '../../llm/LLMProvider'
import type { ChatMessage } from '../../llm/types'

const provider: LLMProvider = {
  id: 'test',
  async listModels() {
    return []
  },
  async *streamChat() {
    yield { type: 'reasoning', text: 'considering the silhouette' }
    yield { type: 'text', text: 'Done.' }
  },
}

describe('AgentRunner', () => {
  it('forwards reasoning chunks as agent events', async () => {
    const runner = new AgentRunner({
      provider,
      systemPrompt: 'system',
      skills: [],
    })
    const events: AgentEvent[] = []
    for await (const event of runner.run([], { emit: () => undefined })) {
      events.push(event)
    }

    expect(events).toContainEqual({
      type: 'reasoning',
      text: 'considering the silhouette',
    })
    expect(events).toContainEqual({ type: 'message', content: 'Done.' })
  })

  it('drops repeated images and compacts old tool results', async () => {
    const captured: ChatMessage[][] = []
    let calls = 0
    const toolProvider: LLMProvider = {
      id: 'test-tools',
      async listModels() {
        return []
      },
      async *streamChat(request) {
        captured.push(request.messages.map((message) => ({ ...message })))
        calls += 1
        if (calls <= 3) {
          yield {
            type: 'tool_call_delta',
            index: 0,
            id: `call_${calls}`,
            name: 'echo',
            argsDelta: '{}',
          }
          return
        }
        yield { type: 'text', text: 'Done.' }
      },
    }
    const echo: AgentSkill = {
      name: 'echo',
      description: 'Echo test payload.',
      parameters: {},
      execute: () => ({ ok: true, data: 'x'.repeat(2000) }),
    }
    const runner = new AgentRunner({
      provider: toolProvider,
      systemPrompt: 'system',
      skills: [echo],
    })
    const history: ChatMessage[] = [
      {
        role: 'user',
        content: 'draw something',
        images: ['data:image/png;base64,abc'],
      },
    ]
    const events: AgentEvent[] = []
    for await (const event of runner.run(history, { emit: () => undefined })) {
      events.push(event)
    }

    expect(captured[0].some((message) => (message.images?.length ?? 0) > 0)).toBe(true)
    expect(captured[1].some((message) => (message.images?.length ?? 0) > 0)).toBe(false)

    const finalToolMessages = captured[captured.length - 1].filter(
      (message) => message.role === 'tool',
    )
    expect(finalToolMessages).toHaveLength(3)
    expect(finalToolMessages[0].content).toContain('earlier tool result compacted')
    expect(finalToolMessages[2].content).toContain('xxxxxxxxxx')
    expect(events).toContainEqual({ type: 'message', content: 'Done.' })
  })
})
