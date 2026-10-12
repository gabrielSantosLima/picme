import { useEffect, useMemo, useRef } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import type { ArtVariant } from '../../entities/agent'
import { variantToDataUrl } from '../../services/canvas/variantToDataUrl'
import { useAgent } from '../../hooks/useAgent'
import { useAgentStore, type AgentEntry } from '../../store/agentStore'

function rowClass(role: string): string {
  if (role === 'user') return 'max-w-[85%] self-end rounded bg-sky-600 px-2 py-1 text-white'
  if (role === 'error') return 'max-w-[85%] self-start rounded bg-red-500/20 px-2 py-1 text-red-300'
  return 'max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100'
}

function SkillTrace({
  name,
  status,
  args,
  result,
}: {
  name: string
  status: 'running' | 'done'
  args: string
  result: string
}) {
  const detail = [
    args.length > 0 ? `Args:\n${args}` : '',
    result.length > 0 ? `Result:\n${result}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return (
    <details className="group rounded border border-neutral-800 bg-neutral-900/60 text-xs">
      <summary className="flex cursor-pointer items-center gap-1 px-2 py-1 text-neutral-400 hover:text-neutral-200">
        <LuChevronRight className="transition-transform group-open:rotate-90" />
        {status === 'running' ? `Executing skill ${name}…` : `Executed skill ${name}`}
      </summary>
      {detail.length > 0 && (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap border-t border-neutral-800 px-2 py-1 text-[11px] text-neutral-400">
          {detail}
        </pre>
      )}
    </details>
  )
}

function VariantsEntry({ variants, selected }: { variants: ArtVariant[]; selected?: number }) {
  const images = useMemo(() => variants.map((variant) => variantToDataUrl(variant)), [variants])
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
          <span className="mt-1 block text-center text-[10px] text-neutral-500">
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

function renderEntry(entry: AgentEntry) {
  if (entry.kind === 'message') {
    if (entry.role === 'error') {
      return (
        <div
          key={entry.id}
          className="max-w-[92%] self-start whitespace-pre-wrap break-words rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300"
        >
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
        className="flex items-center gap-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500"
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

  return (
    <SkillTrace
      key={entry.id}
      name={entry.name}
      status={entry.status}
      args={entry.args}
      result={entry.result}
    />
  )
}

export function ChatTranscript() {
  const entries = useAgentStore((state) => state.entries)
  const streamingText = useAgentStore((state) => state.streamingText)
  const phase = useAgentStore((state) => state.phase)
  const preparing = useAgentStore((state) => state.preparing)
  const { newConversation } = useAgent()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [entries, streamingText, phase, preparing])

  const busy = phase === 'running' && streamingText.length === 0

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm">
      {entries.length === 0 && streamingText.length === 0 && !busy && (
        <p className="text-xs text-neutral-500">Describe what you want to draw.</p>
      )}

      {entries.map(renderEntry)}

      {streamingText.length > 0 && (
        <div className="max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100">
          <span className="whitespace-pre-wrap">{streamingText}</span>
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          {preparing ? `Preparing ${preparing}…` : 'Thinking'}
        </div>
      )}

      {phase === 'done' && (
        <button
          type="button"
          onClick={newConversation}
          className="mx-auto mt-1 rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 focus:outline-none"
        >
          New conversation
        </button>
      )}
    </div>
  )
}
