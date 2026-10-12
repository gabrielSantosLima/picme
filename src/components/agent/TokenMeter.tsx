import { useAgentStore } from '../../store/agentStore'

const TOKEN_BUDGET = 128000
const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function TokenMeter() {
  const tokens = useAgentStore((state) => state.tokens)
  const fraction = Math.min(1, tokens / TOKEN_BUDGET)

  return (
    <div
      title={`${tokens.toLocaleString()} / ${TOKEN_BUDGET.toLocaleString()} tokens`}
      className="flex h-7 w-7 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5 -rotate-90">
        <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="#3f3f46" strokeWidth="2" />
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
    </div>
  )
}
