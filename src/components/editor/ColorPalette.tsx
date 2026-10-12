import { fromHex, toHex } from '../../entities/color'
import { DEFAULT_PALETTE } from '../../entities/palette'
import { useEditorContext } from '../../contexts/EditorContext'

export function ColorPalette() {
  const { primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor, swapColors } =
    useEditorContext()

  return (
    <div className="flex w-52 shrink-0 flex-col gap-3 border-r border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-center gap-4">
        <button type="button" onClick={swapColors} title="Swap colors" className="relative h-10 w-10">
          <span
            className="absolute left-0 top-0 h-7 w-7 rounded border border-neutral-700"
            style={{ background: toHex(secondaryColor) }}
          />
          <span
            className="absolute bottom-0 right-0 h-7 w-7 rounded border border-neutral-500"
            style={{ background: toHex(primaryColor) }}
          />
        </button>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Primary
          <input
            type="color"
            value={toHex(primaryColor)}
            onChange={(event) => setPrimaryColor(fromHex(event.target.value))}
            className="h-7 w-16 rounded border border-neutral-700 bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Secondary
          <input
            type="color"
            value={toHex(secondaryColor)}
            onChange={(event) => setSecondaryColor(fromHex(event.target.value))}
            className="h-7 w-16 rounded border border-neutral-700 bg-neutral-800"
          />
        </label>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {DEFAULT_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            className="aspect-square rounded-sm border border-neutral-700"
            style={{ background: hex }}
            onClick={() => setPrimaryColor(fromHex(hex))}
            onContextMenu={(event) => {
              event.preventDefault()
              setSecondaryColor(fromHex(hex))
            }}
          />
        ))}
      </div>
    </div>
  )
}
