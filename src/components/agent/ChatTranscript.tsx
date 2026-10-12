import { useEffect, useRef } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import { useAgentStore } from '../../store/agentStore'

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

export function ChatTranscript() {
  const entries = useAgentStore((state) => state.entries)
  const streamingText = useAgentStore((state) => state.streamingText)
  const phase = useAgentStore((state) => state.phase)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [entries, streamingText, phase])

  const thinking = phase === 'running' && streamingText.length === 0

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm">
      {entries.length === 0 && streamingText.length === 0 && !thinking && (
        <p className="text-xs text-neutral-500">Describe what you want to draw.</p>
      )}

      {entries.map((entry) =>
        entry.kind === 'message' ? (
          <div key={entry.id} className={rowClass(entry.role)}>
            <span className="whitespace-pre-wrap">{entry.content}</span>
          </div>
        ) : (
          <SkillTrace
            key={entry.id}
            name={entry.name}
            status={entry.status}
            args={entry.args}
            result={entry.result}
          />
        ),
      )}

      {streamingText.length > 0 && (
        <div className="max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100">
          <span className="whitespace-pre-wrap">{streamingText}</span>
        </div>
      )}

      {thinking && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          Thinking
        </div>
      )}
    </div>
  )
}
