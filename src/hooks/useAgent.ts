import { useProvider } from '../contexts/ProviderContext'
import type { ArtVariant } from '../entities/agent'
import { renderSpec, type PixelSpec } from '../entities/pixelSpec'
import { InteractionBroker } from '../services/agent/InteractionBroker'
import { AgentRunner } from '../services/agent/AgentRunner'
import { createProvider } from '../services/llm/createProvider'
import { frameToDataUrl } from '../services/canvas/frameToDataUrl'
import type { ChatMessage, ChatRequest } from '../services/llm/types'
import { useAgentStore } from '../store/agentStore'
import { useDocumentStore } from '../store/documentStore'
import { buildAgentConfig } from '../useCases/agent/agentConfig'

let broker: InteractionBroker | null = null
let currentAbort: AbortController | null = null
let conversation: ChatMessage[] = []
let lastVariantsEntryId: string | null = null

const COMPACT_PROMPT = `You compact a coding session with a pixel-art editor agent.
Summarize the conversation into a concise context that preserves:
- the user's goals and preferences;
- design decisions and constraints;
- the current canvas/frame state that was discussed;
- pending requests and what was already done.
Do not call tools. Return only the summary, in plain text.`

function toVariants(
  args: unknown,
  project: { width: number; height: number },
): ArtVariant[] {
  const raw = (args as { variants?: Array<{ name?: string; spec?: PixelSpec }> }).variants
  if (!Array.isArray(raw)) return []
  const variants: ArtVariant[] = []
  raw.forEach((variant, index) => {
    if (!variant?.spec) return
    try {
      const rendered = renderSpec(variant.spec, {
        maxWidth: project.width,
        maxHeight: project.height,
        maxFrames: 1,
      })
      const frame = rendered.frames[0]
      if (!frame) return
      variants.push({
        id: crypto.randomUUID(),
        name: variant.name ?? String.fromCharCode(65 + index),
        spec: variant.spec,
        rendered: frame,
      })
    } catch {
      return
    }
  })
  return variants
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

  const run = async (prompt: string, options?: { recordUser?: boolean }) => {
    if (!configured || !settings) return
    const store = () => useAgentStore.getState()
    store().setStreaming('')
    store().setPreparing(null)
    store().setPhase('running')
    if (options?.recordUser !== false) {
      store().addEntry({ kind: 'message', role: 'user', content: prompt })
    }
    conversation.push({ role: 'user', content: prompt })

    const config = buildAgentConfig({
      broker: getBroker(),
      document: useDocumentStore.getState(),
      includeImage: settings.sendCanvasImage,
    })
    const runner = new AgentRunner({
      provider: createProvider(settings),
      systemPrompt: config.systemPrompt,
      skills: config.skills,
      reasoningEffort:
        settings.reasoningEffort === 'default' ? undefined : settings.reasoningEffort,
    })

    const controller = new AbortController()
    currentAbort = controller
    const history: ChatMessage[] = conversation.map((message) => ({ ...message }))
    if (settings.sendCanvasImage) {
      const image = frameToDataUrl(useDocumentStore.getState().getProject())
      if (image && history.length > 0) {
        const lastIndex = history.length - 1
        history[lastIndex] = { ...history[lastIndex], images: [image] }
      }
    }
    const pendingSkills: Array<{ id: string; name: string }> = []
    let buffer = ''
    let stepChars = 0
    let stepTokens = 0
    let hasUsage = false
    let reasoningBuffer = ''
    let reasoningEntryId: string | null = null
    let reasoningStartedAt = 0

    const finishReasoning = () => {
      if (!reasoningEntryId) return
      store().updateEntry(reasoningEntryId, {
        content: reasoningBuffer,
        streaming: false,
        durationMs: reasoningStartedAt > 0 ? Date.now() - reasoningStartedAt : undefined,
      })
      reasoningEntryId = null
      reasoningBuffer = ''
      reasoningStartedAt = 0
    }

    const flushStepTokens = () => {
      const value = hasUsage ? stepTokens : Math.ceil(stepChars / 4)
      if (value > 0) store().addTokens(value)
      stepChars = 0
      stepTokens = 0
      hasUsage = false
    }

    try {
      for await (const event of runner.run(history, { emit: () => undefined }, controller.signal)) {
        if (event.type === 'reasoning') {
          if (!reasoningEntryId) {
            reasoningStartedAt = Date.now()
            reasoningEntryId = store().addEntry({
              kind: 'reasoning',
              content: '',
              streaming: true,
              startedAt: reasoningStartedAt,
            })
          }
          reasoningBuffer += event.text
          store().updateEntry(reasoningEntryId, { content: reasoningBuffer, streaming: true })
        } else if (event.type === 'text') {
          finishReasoning()
          buffer += event.text
          stepChars += event.text.length
          store().setStreaming(buffer)
        } else if (event.type === 'usage') {
          hasUsage = true
          stepTokens = event.totalTokens
        } else if (event.type === 'tool_preparing') {
          finishReasoning()
          store().setPreparing(event.name)
        } else if (event.type === 'tool_call') {
          finishReasoning()
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
            const variants = toVariants(
              event.args,
              useDocumentStore.getState().getProject(),
            )
            if (variants.length > 0) {
              lastVariantsEntryId = store().addEntry({ kind: 'variants', variants })
            }
          }
        } else if (event.type === 'tool_result') {
          const index = pendingSkills.findIndex((item) => item.name === event.name)
          const skill = index >= 0 ? pendingSkills.splice(index, 1)[0] : undefined
          if (skill) store().updateEntry(skill.id, { status: 'done', result: stringify(event.result) })
          if (event.name === 'propose_variants' && lastVariantsEntryId) {
            const result = event.result as { ok?: boolean; selected?: number } | null
            if (result?.ok === false) {
              store().removeEntry(lastVariantsEntryId)
            } else if (typeof result?.selected === 'number') {
              store().updateEntry(lastVariantsEntryId, { selected: result.selected })
            }
            lastVariantsEntryId = null
          }
        } else if (event.type === 'message') {
          finishReasoning()
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
          finishReasoning()
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
      finishReasoning()
      currentAbort = null
      const phase = store().phase
      if (phase === 'running' || phase === 'awaiting_input') store().setPhase('done')
    }
  }

  const compact = async () => {
    if (!configured || !settings) return
    const store = () => useAgentStore.getState()
    const lastUser = [...conversation].reverse().find((message) => message.role === 'user')
    if (!lastUser) {
      store().addEntry({
        kind: 'message',
        role: 'error',
        content: 'There is no previous user message to resend.',
      })
      store().setPhase('error')
      return
    }

    store().setStreaming('')
    store().setPreparing(null)
    store().setPhase('running')

    const controller = new AbortController()
    currentAbort = controller
    const provider = createProvider(settings)
    let summary = ''
    let usageTokens = 0
    let hasUsage = false

    try {
      const request: ChatRequest = {
        messages: [
          { role: 'system', content: COMPACT_PROMPT },
          ...conversation,
          { role: 'user', content: 'Write the compacted session summary now.' },
        ],
      }

      for await (const chunk of provider.streamChat(request, controller.signal)) {
        if (chunk.type === 'text') {
          summary += chunk.text
        } else if (chunk.type === 'usage') {
          hasUsage = true
          usageTokens = chunk.totalTokens
        }
      }

      if (controller.signal.aborted) return
      const text = summary.trim()
      if (!text) {
        store().addEntry({
          kind: 'message',
          role: 'error',
          content: 'The model returned an empty session summary.',
        })
        store().setPhase('error')
        return
      }

      if (hasUsage && usageTokens > 0) store().addTokens(usageTokens)
      else store().addTokens(Math.ceil(text.length / 4))

      conversation = [{ role: 'assistant', content: `Compacted session summary:\n${text}` }]
      store().addEntry({ kind: 'divider', label: 'Session compacted · resending last prompt' })
      await run(lastUser.content ?? '', { recordUser: false })
    } catch (error) {
      if (controller.signal.aborted) return
      store().addEntry({
        kind: 'message',
        role: 'error',
        content: error instanceof Error ? error.message : 'Session compaction failed',
      })
      store().setPhase('error')
    } finally {
      if (currentAbort === controller) currentAbort = null
    }
  }

  const newConversation = () => {
    conversation = []
    useAgentStore.getState().resetRun()
  }

  return { run, submit, stop, compact, newConversation }
}
