import { LuChevronRight } from 'react-icons/lu'
import { useAgentStore } from '../../store/agentStore'

function rowClass(role: string): string {
  if (role === 'user') return 'max-w-[85%] self-end rounded bg-sky-600 px-2 py-1 text-white'
  if (role === 'error') return 'max-w-[85%] self-start rounded bg-red-500/20 px-2 py-1 text-red-300'
  return 'max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100'
}

function Collapsible({ label, detail }: { label: string; detail: string }) {
  return (
    <details className="group rounded border border-neutral-800 bg-neutral-900/60 text-xs">
      <summary className="flex cursor-pointer items-center gap-1 px-2 py-1 text-neutral-400 hover:text-neutral-200">
        <LuChevronRight className="transition-transform group-open:rotate-90" />
        {label}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm">
      {entries.length === 0 && streamingText.length === 0 && (
        <p className="text-xs text-neutral-500">Describe what you want to draw.</p>
      )}

      {entries.map((entry) => {
        if (entry.kind === 'message') {
          return (
            <div key={entry.id} className={rowClass(entry.role)}>
              <span className="whitespace-pre-wrap">{entry.content}</span>
            </div>
          )
        }
        if (entry.kind === 'thinking') {
          return (
            <Collapsible
              key={entry.id}
              label={entry.status === 'running' ? 'Thinking…' : 'Thought'}
              detail={entry.detail}
            />
          )
        }
        const detail = [
          entry.args.length > 0 ? `Args:\n${entry.args}` : '',
          entry.result.length > 0 ? `Result:\n${entry.result}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
        return (
          <Collapsible
            key={entry.id}
            label={
              entry.status === 'running' ? `Executing skill ${entry.name}…` : `Executed skill ${entry.name}`
            }
            detail={detail}
          />
        )
      })}

      {streamingText.length > 0 && (
        <div className="max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100">
          <span className="whitespace-pre-wrap">{streamingText}</span>
        </div>
      )}
    </div>
  )
}
