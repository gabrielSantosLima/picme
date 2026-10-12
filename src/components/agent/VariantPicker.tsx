import { useMemo, useState } from 'react'
import type { ArtVariant } from '../../entities/agent'
import { variantToDataUrl } from '../../services/canvas/variantToDataUrl'

export function VariantPicker({
  variants,
  onSubmit,
}: {
  variants: ArtVariant[]
  onSubmit: (result: unknown) => void
}) {
  const [selected, setSelected] = useState(0)

  const images = useMemo(
    () => variants.map((variant) => variantToDataUrl(variant)),
    [variants],
  )

  return (
    <div className="flex flex-col gap-3 rounded border border-sky-500/40 bg-neutral-800/60 p-3">
      <p className="text-xs font-medium text-neutral-100">Which design do you prefer?</p>

      <div className="flex gap-3">
        {variants.map((variant, index) => {
          const active = index === selected
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelected(index)}
              className={[
                'flex flex-1 flex-col items-center gap-1 rounded border p-2 transition-colors focus:outline-none',
                active
                  ? 'border-sky-400 bg-sky-500/20'
                  : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500',
              ].join(' ')}
            >
              <img
                src={images[index]}
                alt={variant.name ?? `Variant ${index + 1}`}
                className="w-full rounded"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-[11px] text-neutral-300">{variant.name ?? index + 1}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onSubmit({ selected })}
        className="w-full rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 focus:outline-none"
      >
        Use this design
      </button>
    </div>
  )
}
