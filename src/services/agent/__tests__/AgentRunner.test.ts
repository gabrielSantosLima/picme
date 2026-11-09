import { describe, expect, it } from 'vitest'
import type { AgentEvent } from '../../../entities/agent'
import { AgentRunner } from '../AgentRunner'
import type { LLMProvider } from '../../llm/LLMProvider'

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
      maxSteps: 1,
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
})
