import { useState } from 'react'
import { TbRobot } from 'react-icons/tb'
import { useProvider } from '../../contexts/ProviderContext'
import { ProviderSettingsDialog } from '../settings/ProviderSettingsDialog'

export function AgentButton() {
  const [open, setOpen] = useState(false)
  const { configured } = useProvider()

  return (
    <>
      <button
        type="button"
        title="Agent"
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded bg-neutral-800 text-lg text-neutral-300 hover:bg-neutral-700 focus:outline-none"
      >
        <TbRobot />
        {!configured && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>
      <ProviderSettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
