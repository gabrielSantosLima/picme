import { useState } from 'react'
import { TbRobot } from 'react-icons/tb'
import { useProvider } from '../../contexts/ProviderContext'
import { useAgentStore } from '../../store/agentStore'
import { ProviderSettingsDialog } from '../settings/ProviderSettingsDialog'

export function AgentButton() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { configured } = useProvider()
  const rightTab = useAgentStore((state) => state.rightTab)
  const setRightTab = useAgentStore((state) => state.setRightTab)
  const active = configured && rightTab === 'agent'

  const handleClick = () => {
    if (!configured) {
      setSettingsOpen(true)
      return
    }
    setRightTab(active ? 'layers' : 'agent')
  }

  return (
    <>
      <button
        type="button"
        title="Agent"
        onClick={handleClick}
        className={[
          'relative flex h-9 w-9 items-center justify-center rounded text-lg transition-colors focus:outline-none',
          active
            ? 'bg-sky-500 text-white'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
        ].join(' ')}
      >
        <TbRobot />
        {!configured && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>
      <ProviderSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
