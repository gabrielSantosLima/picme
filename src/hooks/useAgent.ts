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
    const store = useAgentStore.getState()
    store.resetRun()
    store.setPhase('running')
    store.addMessage({ role: 'user', content: prompt })

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
    let buffer = ''

    const flush = () => {
      const text = buffer.trim()
      buffer = ''
      if (text) useAgentStore.getState().addMessage({ role: 'assistant', content: text })
      useAgentStore.getState().setStreaming('')
    }

    try {
      for await (const event of runner.run(history, { emit: () => undefined }, controller.signal)) {
        if (event.type === 'text') {
          buffer += event.text
          useAgentStore.getState().setStreaming(buffer)
        } else if (event.type === 'tool_call') {
          flush()
        } else if (event.type === 'message') {
          flush()
          const content = event.content.trim()
          if (content) useAgentStore.getState().addMessage({ role: 'assistant', content })
          useAgentStore.getState().setPhase('done')
        } else if (event.type === 'error') {
          flush()
          useAgentStore.getState().addMessage({ role: 'error', content: event.error })
          useAgentStore.getState().setPhase('error')
        }
      }
    } catch (error) {
      useAgentStore.getState().addMessage({
        role: 'error',
        content: error instanceof Error ? error.message : 'Agent run failed',
      })
      useAgentStore.getState().setPhase('error')
    } finally {
      currentAbort = null
      const phase = useAgentStore.getState().phase
      if (phase === 'running' || phase === 'awaiting_input') {
        useAgentStore.getState().setPhase('done')
      }
    }
  }

  return { run, submit, stop }
}
