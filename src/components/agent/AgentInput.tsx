import { useState } from 'react'
import { LuSend, LuSquare } from 'react-icons/lu'
import { useAgent } from '../../hooks/useAgent'
import { useAgentStore } from '../../store/agentStore'

export function AgentInput() {
  const [prompt, setPrompt] = useState('')
  const { run, stop } = useAgent()
  const phase = useAgentStore((state) => state.phase)
  const busy = phase === 'running' || phase === 'awaiting_input'

  const submit = () => {
    const text = prompt.trim()
    if (!text || busy) return
    setPrompt('')
    void run(text)
  }

  return (
    <div className="flex items-stretch gap-2 border-t border-neutral-800 p-3">
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={2}
        placeholder="Describe your pixel art…"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        className="flex-1 resize-none rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-sky-500"
      />
      {busy ? (
        <button
          type="button"
          onClick={stop}
          title="Stop"
          className="flex w-10 shrink-0 items-center justify-center rounded bg-red-500 text-white hover:bg-red-400 focus:outline-none"
        >
          <LuSquare />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          title="Run"
          className="flex w-10 shrink-0 items-center justify-center rounded bg-sky-500 text-white hover:bg-sky-400 focus:outline-none"
        >
          <LuSend />
        </button>
      )}
    </div>
  )
}
