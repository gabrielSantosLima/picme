import { useAgentStore } from '../../store/agentStore'
import { AgentPanel } from '../agent/AgentPanel'
import { LayersPanel } from '../layers/LayersPanel'

function tabClass(active: boolean): string {
  return [
    'flex-1 px-3 py-2 text-xs font-medium transition-colors focus:outline-none',
    active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white',
  ].join(' ')
}

export function RightDock() {
  const rightTab = useAgentStore((state) => state.rightTab)
  const setRightTab = useAgentStore((state) => state.setRightTab)

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900">
      <div className="flex border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setRightTab('layers')}
          className={tabClass(rightTab === 'layers')}
        >
          Layers
        </button>
        <button
          type="button"
          onClick={() => setRightTab('agent')}
          className={tabClass(rightTab === 'agent')}
        >
          Agent
        </button>
      </div>
      {rightTab === 'layers' ? <LayersPanel /> : <AgentPanel />}
    </div>
  )
}
