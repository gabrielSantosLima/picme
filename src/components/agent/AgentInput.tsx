import { useEffect, useRef, useState } from 'react'
import { LuArrowUp, LuCommand, LuSquare } from 'react-icons/lu'
import { useAgent } from '../../hooks/useAgent'
import { useAgentStore } from '../../store/agentStore'
import { AgentSettingsBar } from './AgentSettingsBar'

const COMMANDS = [
  {
    name: 'compact',
    description: 'Compact the session and resend your last prompt',
  },
]

export function AgentInput() {
  const [prompt, setPrompt] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { run, stop, compact } = useAgent()
  const phase = useAgentStore((state) => state.phase)
  const busy = phase === 'running' || phase === 'awaiting_input'

  const trimmed = prompt.trim()
  const commandQuery =
    prompt.startsWith('/') && !prompt.includes(' ') ? prompt.slice(1).toLowerCase() : null
  const matchingCommands =
    commandQuery === null
      ? []
      : COMMANDS.filter((command) => command.name.startsWith(commandQuery))
  const showCommands = commandQuery !== null && matchingCommands.length > 0
  const selectedIndex = Math.min(commandIndex, Math.max(0, matchingCommands.length - 1))
  const isUnknownCommand =
    commandQuery !== null && matchingCommands.length === 0 && commandQuery.length > 0
  const canSubmit =
    trimmed.length > 0 && (!trimmed.startsWith('/') || trimmed === '/compact')

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [prompt])

  const executeCommand = (name: string) => {
    if (busy || name !== 'compact') return
    setPrompt('')
    setCommandIndex(0)
    void compact()
  }

  const submit = () => {
    if (!trimmed || busy) return
    if (trimmed.startsWith('/')) {
      if (trimmed === '/compact') executeCommand('compact')
      return
    }
    setPrompt('')
    void run(trimmed)
  }

  return (
    <div className="border-t border-neutral-800 p-3">
      <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/80 p-2 shadow-lg shadow-black/20 transition-colors focus-within:border-neutral-700 focus-within:ring-1 focus-within:ring-sky-500/20">
        {showCommands && (
          <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/95 shadow-xl shadow-black/30 backdrop-blur">
            <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600">
              Commands
            </div>
            {matchingCommands.map((command, index) => (
              <button
                key={command.name}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => executeCommand(command.name)}
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                  index === selectedIndex ? 'bg-neutral-800' : 'hover:bg-neutral-800/60',
                ].join(' ')}
              >
                <LuCommand className="shrink-0 text-[13px] text-neutral-500" />
                <span className="shrink-0 text-[13px] font-medium text-neutral-200">
                  /{command.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-500">
                  {command.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {isUnknownCommand && (
          <div className="px-2 pb-1 text-[12px] text-red-300">
            Unknown command. Try /compact.
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value)
            setCommandIndex(0)
          }}
          rows={2}
          placeholder="Ask for a sprite, icon, or animation…"
          onKeyDown={(event) => {
            if (showCommands) {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCommandIndex((value) => (value + 1) % matchingCommands.length)
                return
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCommandIndex(
                  (value) => (value - 1 + matchingCommands.length) % matchingCommands.length,
                )
                return
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                const command = matchingCommands[selectedIndex]
                if (command) executeCommand(command.name)
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                setPrompt('')
                return
              }
            }

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
              disabled={!canSubmit}
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
