import { useAgentStore } from '../../store/agentStore'

function rowClass(role: string): string {
  if (role === 'user') return 'max-w-[85%] self-end rounded bg-sky-600 px-2 py-1 text-white'
  if (role === 'error') return 'max-w-[85%] self-start rounded bg-red-500/20 px-2 py-1 text-red-300'
  return 'max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100'
}

export function ChatTranscript() {
  const messages = useAgentStore((state) => state.messages)
  const streamingText = useAgentStore((state) => state.streamingText)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm">
      {messages.length === 0 && streamingText.length === 0 && (
        <p className="text-xs text-neutral-500">Describe what you want to draw.</p>
      )}
      {messages.map((message) => (
        <div key={message.id} className={rowClass(message.role)}>
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
      ))}
      {streamingText.length > 0 && (
        <div className="max-w-[85%] self-start rounded bg-neutral-800 px-2 py-1 text-neutral-100">
          <span className="whitespace-pre-wrap">{streamingText}</span>
        </div>
      )}
    </div>
  )
}
