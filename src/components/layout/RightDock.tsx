import { LuArrowLeftRight } from 'react-icons/lu'
import { useAgentStore } from '../../store/agentStore'
import { useLayoutStore } from '../../store/layoutStore'
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
  const toggleSwap = useLayoutStore((state) => state.toggleSwap)

  return (
    <div className="flex h-full w-full flex-col bg-neutral-900">
      <div className="flex items-stretch border-b border-neutral-800">
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
        <button
          type="button"
          onClick={toggleSwap}
          title="Swap panel sides"
          className="flex w-9 items-center justify-center text-neutral-400 hover:text-white focus:outline-none"
        >
          <LuArrowLeftRight />
        </button>
      </div>
      {rightTab === 'layers' ? <LayersPanel /> : <AgentPanel />}
    </div>
  )
}
