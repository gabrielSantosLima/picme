import { useEffect, useRef, useState } from 'react'
import { LuArrowUp, LuSquare } from 'react-icons/lu'
import { useAgent } from '../../hooks/useAgent'
import { useAgentStore } from '../../store/agentStore'
import { AgentSettingsBar } from './AgentSettingsBar'

export function AgentInput() {
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { run, stop } = useAgent()
  const phase = useAgentStore((state) => state.phase)
  const busy = phase === 'running' || phase === 'awaiting_input'

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [prompt])

  const submit = () => {
    const text = prompt.trim()
    if (!text || busy) return
    setPrompt('')
    void run(text)
  }

  return (
    <div className="border-t border-neutral-800 p-3">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-2 shadow-lg shadow-black/20 transition-colors focus-within:border-neutral-700 focus-within:ring-1 focus-within:ring-sky-500/20">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          placeholder="Ask for a sprite, icon, or animation…"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          className="max-h-40 min-h-14 w-full resize-none bg-transparent px-2 pt-1.5 pb-2 text-[16px] leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />

        <div className="flex items-center gap-2 border-t border-neutral-800/60 px-1 pt-2">
          <AgentSettingsBar />

          {busy ? (
            <button
              type="button"
              onClick={stop}
              title="Stop"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/90 text-white transition-colors hover:bg-red-400 focus:outline-none"
            >
              <LuSquare className="text-[13px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={prompt.trim().length === 0}
              title="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
            >
              <LuArrowUp className="text-[15px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
