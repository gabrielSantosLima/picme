import { useProvider } from '../contexts/ProviderContext'
import type { ArtVariant } from '../entities/agent'
import { InteractionBroker } from '../services/agent/InteractionBroker'
import { AgentRunner } from '../services/agent/AgentRunner'
import { createProvider } from '../services/llm/createProvider'
import { frameToDataUrl } from '../services/canvas/frameToDataUrl'
import type { ChatMessage } from '../services/llm/types'
import { useAgentStore } from '../store/agentStore'
import { useDocumentStore } from '../store/documentStore'
import { buildAgentConfig } from '../useCases/agent/agentConfig'

let broker: InteractionBroker | null = null
let currentAbort: AbortController | null = null
let conversation: ChatMessage[] = []
let lastVariantsEntryId: string | null = null

function toVariants(args: unknown): ArtVariant[] {
  const raw = (args as { variants?: Array<{ name?: string; palette?: string[]; pixels?: string[] }> })
    .variants
  if (!Array.isArray(raw)) return []
  return raw.map((variant, index) => ({
    id: crypto.randomUUID(),
    name: variant.name ?? String.fromCharCode(65 + index),
    palette: Array.isArray(variant.palette) ? variant.palette : [],
    pixels: Array.isArray(variant.pixels) ? variant.pixels : [],
  }))
}

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
    const store = useAgentStore.getState()
    const active = store.phase === 'running' || store.phase === 'awaiting_input'
    currentAbort?.abort()
    currentAbort = null
    getBroker().cancelAll(new Error('Agent run cancelled'))
    store.setPending(null)
    store.setPhase('idle')
    store.setStreaming('')
    store.setPreparing(null)
    if (active) store.addEntry({ kind: 'divider', label: 'Execution interrupted' })
  }

  const run = async (prompt: string) => {
    if (!configured || !settings) return
    const store = () => useAgentStore.getState()
    store().setStreaming('')
    store().setPreparing(null)
    store().setPhase('running')
    store().addEntry({ kind: 'message', role: 'user', content: prompt })
    conversation.push({ role: 'user', content: prompt })

    const config = buildAgentConfig({
      broker: getBroker(),
      document: useDocumentStore.getState(),
    })
    const runner = new AgentRunner({
      provider: createProvider(settings),
      systemPrompt: config.systemPrompt,
      skills: config.skills,
      maxSteps: config.maxSteps,
      reasoningEffort:
        settings.reasoningEffort === 'default' ? undefined : settings.reasoningEffort,
    })

    const controller = new AbortController()
    currentAbort = controller
    const history: ChatMessage[] = conversation.map((message) => ({ ...message }))
    const image = frameToDataUrl(useDocumentStore.getState().getProject())
    if (image && history.length > 0) {
      const lastIndex = history.length - 1
      history[lastIndex] = { ...history[lastIndex], images: [image] }
    }
    const pendingSkills: Array<{ id: string; name: string }> = []
    let buffer = ''
    let stepChars = 0
    let stepTokens = 0
    let hasUsage = false

    const flushStepTokens = () => {
      const value = hasUsage ? stepTokens : Math.ceil(stepChars / 4)
      if (value > 0) store().addTokens(value)
      stepChars = 0
      stepTokens = 0
      hasUsage = false
    }

    try {
      for await (const event of runner.run(history, { emit: () => undefined }, controller.signal)) {
        if (event.type === 'text') {
          buffer += event.text
          stepChars += event.text.length
          store().setStreaming(buffer)
        } else if (event.type === 'usage') {
          hasUsage = true
          stepTokens = event.totalTokens
        } else if (event.type === 'tool_preparing') {
          store().setPreparing(event.name)
        } else if (event.type === 'tool_call') {
          flushStepTokens()
          store().setPreparing(null)
          const reasoning = buffer.trim()
          if (reasoning) {
            store().addEntry({ kind: 'message', role: 'assistant', content: reasoning })
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
          if (event.name === 'propose_variants') {
            const variants = toVariants(event.args)
            if (variants.length > 0) {
              lastVariantsEntryId = store().addEntry({ kind: 'variants', variants })
            }
          }
        } else if (event.type === 'tool_result') {
          const index = pendingSkills.findIndex((item) => item.name === event.name)
          const skill = index >= 0 ? pendingSkills.splice(index, 1)[0] : undefined
          if (skill) store().updateEntry(skill.id, { status: 'done', result: stringify(event.result) })
          if (event.name === 'propose_variants' && lastVariantsEntryId) {
            const selected = (event.result as { selected?: number } | null)?.selected
            if (typeof selected === 'number') {
              store().updateEntry(lastVariantsEntryId, { selected })
            }
            lastVariantsEntryId = null
          }
        } else if (event.type === 'message') {
          flushStepTokens()
          store().setPreparing(null)
          const content = buffer.trim() || event.content.trim()
          if (content) {
            store().addEntry({ kind: 'message', role: 'assistant', content })
            conversation.push({ role: 'assistant', content })
          }
          buffer = ''
          store().setStreaming('')
          store().setPhase('done')
        } else if (event.type === 'error') {
          flushStepTokens()
          store().setPreparing(null)
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

  const newConversation = () => {
    conversation = []
    useAgentStore.getState().resetRun()
  }

  return { run, submit, stop, newConversation }
}
