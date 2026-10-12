import { useState } from 'react'
import type { QuestionSpec } from '../../entities/agent'

function optionClass(selected: boolean): string {
  return [
    'flex w-full items-center gap-2 rounded border px-2.5 py-1.5 text-left text-xs transition-colors focus:outline-none',
    selected
      ? 'border-sky-400 bg-sky-500/20 text-white'
      : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500',
  ].join(' ')
}

function dotClass(active: boolean): string {
  return [
    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
    active ? 'border-sky-300 bg-sky-400' : 'border-neutral-500',
  ].join(' ')
}

export function QuestionForm({
  questions,
  onSubmit,
}: {
  questions: QuestionSpec[]
  onSubmit: (result: unknown) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [custom, setCustom] = useState<Record<number, string>>({})

  const toggle = (index: number, option: string, multiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[index] ?? []
      if (multiple) {
        return {
          ...prev,
          [index]: current.includes(option)
            ? current.filter((value) => value !== option)
            : [...current, option],
        }
      }
      return { ...prev, [index]: [option] }
    })
    if (!multiple) setCustom((prev) => ({ ...prev, [index]: '' }))
  }

  const changeCustom = (index: number, value: string, multiple: boolean) => {
    setCustom((prev) => ({ ...prev, [index]: value }))
    if (!multiple && value.trim().length > 0) {
      setAnswers((prev) => ({ ...prev, [index]: [] }))
    }
  }

  const submit = () => {
    onSubmit({
      answers: questions.map((question, index) => {
        const chosen = answers[index] ?? []
        const typed = (custom[index] ?? '').trim()
        const selected = question.multiple
          ? typed
            ? [...chosen, typed]
            : chosen
          : typed
            ? [typed]
            : chosen.slice(0, 1)
        return { question: question.question, selected: Array.from(new Set(selected)) }
      }),
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-sky-500/40 bg-neutral-800/60 p-3">
      {questions.map((question, index) => {
        const multiple = Boolean(question.multiple)
        const hasOptions = Boolean(question.options && question.options.length > 0)
        return (
          <div key={index} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-neutral-100">{question.question}</p>

            {hasOptions ? (
              <div className="flex flex-col gap-1.5">
                {question.options?.map((option) => {
                  const selected = (answers[index] ?? []).includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(index, option, multiple)}
                      className={optionClass(selected)}
                    >
                      <span className={dotClass(selected)} />
                      {option}
                    </button>
                  )
                })}

                <div
                  className={optionClass((custom[index] ?? '').trim().length > 0)}
                >
                  <span className={dotClass((custom[index] ?? '').trim().length > 0)} />
                  <input
                    type="text"
                    value={custom[index] ?? ''}
                    onChange={(event) => changeCustom(index, event.target.value, multiple)}
                    placeholder="Custom answer…"
                    className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={custom[index] ?? ''}
                onChange={(event) => changeCustom(index, event.target.value, false)}
                placeholder="Type your answer…"
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={submit}
        className="w-full rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 focus:outline-none"
      >
        Submit answer
      </button>
    </div>
  )
}
