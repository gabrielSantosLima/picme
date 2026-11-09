import { useEffect, useRef, useState } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import type { ArtVariant } from '../../entities/agent'
import { useAgent } from '../../hooks/useAgent'
import { useSpecPreviews } from '../../hooks/useSpecPreviews'
import { useAgentStore, type AgentEntry } from '../../store/agentStore'

const ASSISTANT_TEXT =
  'max-w-[92%] self-start whitespace-pre-wrap break-words text-[14px] leading-relaxed text-neutral-300'

type ReasoningEntry = Extract<AgentEntry, { kind: 'reasoning' }>
type SkillEntry = Extract<AgentEntry, { kind: 'skill' }>
type ActivityStep = ReasoningEntry | SkillEntry
type NonActivityEntry = Exclude<AgentEntry, ActivityStep>

type ChatGroup =
  | { kind: 'activity'; id: string; steps: ActivityStep[] }
  | { kind: 'entry'; id: string; entry: NonActivityEntry }

function isActivityStep(entry: AgentEntry): entry is ActivityStep {
  return entry.kind === 'reasoning' || entry.kind === 'skill'
}

function groupEntries(entries: AgentEntry[]): ChatGroup[] {
  const groups: ChatGroup[] = []
  let steps: ActivityStep[] = []

  const flush = () => {
    if (steps.length === 0) return
    groups.push({ kind: 'activity', id: steps[0].id, steps })
    steps = []
  }

  for (const entry of entries) {
    if (isActivityStep(entry)) {
      steps.push(entry)
    } else {
      flush()
      groups.push({ kind: 'entry', id: entry.id, entry })
    }
  }
  flush()
  return groups
}

function rowClass(role: string): string {
  if (role === 'user') {
    return 'max-w-[85%] self-end rounded-2xl rounded-br-md bg-sky-600 px-3.5 py-2 text-[14px] leading-relaxed text-white shadow-sm'
  }
  if (role === 'error') {
    return 'max-w-[92%] self-start rounded-xl bg-red-500/10 px-3 py-2 text-[13px] leading-relaxed text-red-300'
  }
  return ASSISTANT_TEXT
}

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toolLabel(name: string): string {
  switch (name) {
    case 'read_frame':
      return 'Read'
    case 'draw':
      return 'Draw'
    case 'propose_variants':
      return 'Variants'
    case 'ask':
      return 'Ask'
    case 'show_word_cloud':
      return 'Words'
    default:
      return name
  }
}

function toolDetail(entry: SkillEntry): string {
  const args = parseArgs(entry.args)
  switch (entry.name) {
    case 'read_frame': {
      const frameId = args.frameId
      return typeof frameId === 'string' ? `frame ${frameId.slice(0, 8)}` : 'active frame'
    }
    case 'draw': {
      const spec = args.spec as { frames?: unknown[] } | undefined
      const count = Array.isArray(spec?.frames) ? spec.frames.length : 1
      const target = args.target as { mode?: unknown } | undefined
      const mode = typeof target?.mode === 'string' ? target.mode : undefined
      return `${count} ${count === 1 ? 'frame' : 'frames'}${mode ? ` · ${mode}` : ''}`
    }
    case 'propose_variants': {
      const variants = args.variants
      return Array.isArray(variants) ? `${variants.length} designs` : 'designs'
    }
    case 'ask': {
      const questions = args.questions
      return Array.isArray(questions)
        ? `${questions.length} ${questions.length === 1 ? 'question' : 'questions'}`
        : ''
    }
    case 'show_word_cloud': {
      const clouds = args.clouds
      return Array.isArray(clouds)
        ? `${clouds.length} ${clouds.length === 1 ? 'word cloud' : 'word clouds'}`
        : ''
    }
    default:
      return ''
  }
}

function ReasoningRow({ entry }: { entry: ReasoningEntry }) {
  const [open, setOpen] = useState(false)
  const label = entry.streaming
    ? 'Thinking'
    : entry.durationMs !== undefined
      ? `Thought ${Math.round(entry.durationMs / 1000)}s`
      : 'Thought process'

  return (
    <div className="group/reasoning">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 py-1 text-left text-[13px] leading-relaxed text-neutral-500 transition-colors hover:text-neutral-300 focus:outline-none focus-visible:text-neutral-200"
        aria-expanded={open}
      >
        <LuChevronRight
          className={[
            'shrink-0 text-neutral-600 transition-transform duration-200',
            open ? 'rotate-90' : '',
          ].join(' ')}
        />
        <span
          className={[
            'h-1 w-1 shrink-0 rounded-full',
            entry.streaming ? 'animate-pulse bg-sky-400/80' : 'bg-neutral-700',
          ].join(' ')}
        />
        <span>{label}</span>
        <span className="ml-auto hidden text-[11px] normal-case tracking-normal text-neutral-600 group-hover/reasoning:inline">
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {open && (
        <pre className="mt-1 whitespace-pre-wrap break-words pl-5 font-sans text-[13px] leading-relaxed text-neutral-500/90">
          {entry.content}
        </pre>
      )}
    </div>
  )
}

function ToolRow({ entry }: { entry: SkillEntry }) {
  const [open, setOpen] = useState(false)
  const label = toolLabel(entry.name)
  const detail = toolDetail(entry)

  return (
    <div className="group/tool">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-2 py-1 text-left text-[13px] leading-relaxed transition-colors hover:text-neutral-300 focus:outline-none focus-visible:text-neutral-200"
        aria-expanded={open}
      >
        <LuChevronRight
          className={[
            'mt-0.5 shrink-0 text-neutral-600 transition-transform duration-200',
            open ? 'rotate-90' : '',
          ].join(' ')}
        />
        <span className="shrink-0 font-semibold text-neutral-300">{label}</span>
        {detail.length > 0 && (
          <span className="min-w-0 flex-1 truncate text-neutral-500">{detail}</span>
        )}
        {entry.status === 'running' && (
          <span className="mt-1 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-400/80" />
        )}
        <span className="ml-auto hidden shrink-0 text-[11px] normal-case tracking-normal text-neutral-600 group-hover/tool:inline">
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {open && (
        <div className="mt-1 pl-5 text-[12px] leading-relaxed text-neutral-500">
          {entry.args.length > 0 && (
            <pre className="whitespace-pre-wrap break-words text-neutral-500/80">
              {entry.args}
            </pre>
          )}
          {entry.result.length > 0 && (
            <pre className="mt-1 whitespace-pre-wrap break-words text-neutral-500/80">
              {entry.result}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityGroup({ steps }: { steps: ActivityStep[] }) {
  const [open, setOpen] = useState(true)
  const toolSteps = steps.filter((step): step is SkillEntry => step.kind === 'skill')
  const counts = new Map<string, number>()
  for (const step of toolSteps) {
    const label = toolLabel(step.name)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const total = toolSteps.length
  const only = counts.size === 1 ? [...counts.keys()][0] : null
  const running = steps.some((step) =>
    step.kind === 'reasoning' ? step.streaming : step.status === 'running',
  )
  const summary =
    total === 0 ? 'Reasoning' : `Used ${total} ${only ?? 'tools'}`

  return (
    <div className="group/activity">
      <div
        className={[
          'sticky top-0 z-20 -mx-4 flex items-center px-4 py-1.5',
          open ? 'border-b border-neutral-800/60 bg-neutral-900' : '',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 text-left text-[13px] font-medium text-neutral-400 transition-colors hover:text-neutral-200 focus:outline-none focus-visible:text-neutral-100"
          aria-expanded={open}
        >
          <LuChevronRight
            className={[
              'shrink-0 text-neutral-600 transition-transform duration-200',
              open ? 'rotate-90' : '',
            ].join(' ')}
          />
          <span>{summary}</span>
          {running && (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-400/80" />
          )}
          <span className="ml-auto hidden text-[11px] normal-case tracking-normal text-neutral-600 group-hover/activity:inline">
            {open ? 'Collapse' : 'Expand'}
          </span>
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-2 border-l border-neutral-800 pl-3">
          {steps.map((step) =>
            step.kind === 'reasoning' ? (
              <ReasoningRow key={step.id} entry={step} />
            ) : (
              <ToolRow key={step.id} entry={step} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function VariantsEntry({ variants, selected }: { variants: ArtVariant[]; selected?: number }) {
  const images = useSpecPreviews(variants)
  return (
    <div className="flex gap-2">
      {variants.map((variant, index) => (
        <div
          key={variant.id}
          className={[
            'flex-1 rounded border p-1',
            index === selected ? 'border-sky-400' : 'border-neutral-800',
          ].join(' ')}
        >
          <img
            src={images[index]}
            alt={variant.name ?? `Variant ${index + 1}`}
            className="w-full rounded"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="mt-1 block text-center text-[11px] text-neutral-500">
            {variant.name ?? index + 1}
          </span>
        </div>
      ))}
    </div>
  )
}

function renderWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g)
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-red-200"
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

function renderEntry(entry: NonActivityEntry) {
  if (entry.kind === 'message') {
    if (entry.role === 'error') {
      return (
        <div key={entry.id} className={rowClass('error')}>
          {renderWithLinks(entry.content)}
        </div>
      )
    }
    return (
      <div key={entry.id} className={rowClass(entry.role)}>
        <span className="whitespace-pre-wrap">{entry.content}</span>
      </div>
    )
  }

  if (entry.kind === 'divider') {
    return (
      <div
        key={entry.id}
        className="flex items-center gap-2 py-1 text-[12px] uppercase tracking-wide text-neutral-500"
      >
        <span className="h-px flex-1 bg-neutral-800" />
        {entry.label}
        <span className="h-px flex-1 bg-neutral-800" />
      </div>
    )
  }

  if (entry.kind === 'variants') {
    return <VariantsEntry key={entry.id} variants={entry.variants} selected={entry.selected} />
  }

  return null
}

export function ChatTranscript() {
  const entries = useAgentStore((state) => state.entries)
  const streamingText = useAgentStore((state) => state.streamingText)
  const phase = useAgentStore((state) => state.phase)
  const preparing = useAgentStore((state) => state.preparing)
  const { newConversation } = useAgent()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !stickToBottomRef.current) return
    element.scrollTop = element.scrollHeight
  }, [entries, streamingText, phase, preparing])

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight
    stickToBottomRef.current = distance < 48
  }

  const groups = groupEntries(entries)
  const hasStreamingReasoning = entries.some(
    (entry) => entry.kind === 'reasoning' && entry.streaming,
  )
  const running = phase === 'running'
  const waiting = running && entries.length === 0 && streamingText.length === 0
  const statusLabel = preparing
    ? `Preparing ${preparing}…`
    : hasStreamingReasoning
      ? 'Thinking…'
      : streamingText.length > 0
        ? 'Writing…'
        : 'Working…'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto text-sm"
      >
        <div className="flex flex-col gap-4 p-4">
          {entries.length === 0 && streamingText.length === 0 && !waiting && (
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Describe what you want to draw.
            </p>
          )}

          {groups.map((group) =>
            group.kind === 'activity' ? (
              <ActivityGroup key={group.id} steps={group.steps} />
            ) : (
              renderEntry(group.entry)
            ),
          )}

          {streamingText.length > 0 && (
            <div className={ASSISTANT_TEXT}>
              <span className="whitespace-pre-wrap">{streamingText}</span>
            </div>
          )}

          {phase === 'done' && (
            <button
              type="button"
              onClick={newConversation}
              className="mx-auto mt-1 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-[13px] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200 focus:outline-none"
            >
              New conversation
            </button>
          )}
        </div>
      </div>

      {running && (
        <div className="flex shrink-0 items-center gap-2 border-t border-neutral-800 px-4 py-2 text-[12px] tracking-wide text-neutral-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400/80" />
          {statusLabel}
        </div>
      )}
    </div>
  )
}
