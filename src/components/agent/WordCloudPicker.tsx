import { useState } from 'react'
import type { WordCloudSpec } from '../../entities/agent'

function chip(selected: boolean): string {
  return [
    'rounded-full border px-2.5 py-0.5 text-xs transition-colors focus:outline-none',
    selected
      ? 'border-sky-400 bg-sky-500 text-white'
      : 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-neutral-500',
  ].join(' ')
}

export function WordCloudPicker({
  question,
  clouds,
  multiple,
  onSubmit,
}: {
  question: string
  clouds: WordCloudSpec[]
  multiple: boolean
  onSubmit: (result: unknown) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (tag: string) => {
    setSelected((prev) => {
      if (prev.includes(tag)) return prev.filter((value) => value !== tag)
      return multiple ? [...prev, tag] : [tag]
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-sky-500/40 bg-neutral-800/60 p-3">
      <p className="text-xs font-medium text-neutral-200">{question}</p>
      {clouds.map((cloud, index) => (
        <div key={index} className="flex flex-col gap-1">
          {cloud.title && (
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">
              {cloud.title}
            </span>
          )}
          <div className="flex flex-wrap gap-1">
            {cloud.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={chip(selected.includes(tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onSubmit({ selected })}
        className="self-end rounded bg-sky-500 px-3 py-1 text-sm font-medium text-white hover:bg-sky-400 focus:outline-none"
      >
        Confirm selection
      </button>
    </div>
  )
}
