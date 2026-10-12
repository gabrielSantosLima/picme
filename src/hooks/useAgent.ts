import { useProvider } from '../contexts/ProviderContext'
import { InteractionBroker } from '../services/agent/InteractionBroker'
import { AgentRunner } from '../services/agent/AgentRunner'
import { createProvider } from '../services/llm/createProvider'
import type { ChatMessage } from '../services/llm/types'
import { useAgentStore } from '../store/agentStore'
import { useDocumentStore } from '../store/documentStore'
import { buildAgentConfig } from '../useCases/agent/agentConfig'

let broker: InteractionBroker | null = null
let currentAbort: AbortController | null = null

function getBroker(): InteractionBroker {
  if (!broker) {
    broker = new InteractionBroker({
      setPending: (pending) => useAgentStore.getState().setPending(pending),
      setPhase: (phase) => useAgentStore.getState().setPhase(phase),
    })
  }
  return broker
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function useAgent() {
  const { configured, settings } = useProvider()

  const submit = (result: unknown) => {
    getBroker().resolve(result)
    useAgentStore.getState().setPhase('running')
  }

  const stop = () => {
    currentAbort?.abort()
    currentAbort = null
    getBroker().cancelAll(new Error('Agent run cancelled'))
    const store = useAgentStore.getState()
    store.setPending(null)
    store.setPhase('idle')
  }

  const run = async (prompt: string) => {
    if (!configured || !settings) return
    const store = () => useAgentStore.getState()
    store().resetRun()
    store().setPhase('running')
    store().addEntry({ kind: 'message', role: 'user', content: prompt })

    const config = buildAgentConfig({
      broker: getBroker(),
      document: useDocumentStore.getState(),
    })
    const runner = new AgentRunner({
      provider: createProvider(settings),
      systemPrompt: config.systemPrompt,
      skills: config.skills,
      maxSteps: config.maxSteps,
    })

    const controller = new AbortController()
    currentAbort = controller
    const history: ChatMessage[] = [{ role: 'user', content: prompt }]
    const pendingSkills: Array<{ id: string; name: string }> = []
    let buffer = ''
    let thinkingId: string | null = null

    try {
      for await (const event of runner.run(history, { emit: () => undefined }, controller.signal)) {
        if (event.type === 'text') {
          buffer += event.text
          store().setStreaming(buffer)
          if (!thinkingId) {
            thinkingId = store().addEntry({ kind: 'thinking', status: 'running', detail: '' })
          }
        } else if (event.type === 'tool_call') {
          if (thinkingId) {
            store().updateEntry(thinkingId, { status: 'done', detail: buffer.trim() })
            thinkingId = null
          }
          buffer = ''
          store().setStreaming('')
          const id = store().addEntry({
            kind: 'skill',
            name: event.name,
            status: 'running',
            args: stringify(event.args),
            result: '',
          })
          pendingSkills.push({ id, name: event.name })
        } else if (event.type === 'tool_result') {
          const index = pendingSkills.findIndex((item) => item.name === event.name)
          const skill = index >= 0 ? pendingSkills.splice(index, 1)[0] : undefined
          if (skill) store().updateEntry(skill.id, { status: 'done', result: stringify(event.result) })
        } else if (event.type === 'message') {
          if (thinkingId) {
            store().removeEntry(thinkingId)
            thinkingId = null
          }
          const content = buffer.trim() || event.content.trim()
          if (content) store().addEntry({ kind: 'message', role: 'assistant', content })
          buffer = ''
          store().setStreaming('')
          store().setPhase('done')
        } else if (event.type === 'error') {
          if (thinkingId) {
            store().removeEntry(thinkingId)
            thinkingId = null
          }
          store().addEntry({ kind: 'message', role: 'error', content: event.error })
          buffer = ''
          store().setStreaming('')
          store().setPhase('error')
        }
      }
    } catch (error) {
      store().addEntry({
        kind: 'message',
        role: 'error',
        content: error instanceof Error ? error.message : 'Agent run failed',
      })
      store().setPhase('error')
    } finally {
      currentAbort = null
      const phase = store().phase
      if (phase === 'running' || phase === 'awaiting_input') store().setPhase('done')
    }
  }

  return { run, submit, stop }
}
