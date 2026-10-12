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

export function QuestionForm({
  questions,
  onSubmit,
}: {
  questions: QuestionSpec[]
  onSubmit: (result: unknown) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string[]>>({})

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
  }

  const submit = () => {
    onSubmit({
      answers: questions.map((question, index) => ({
        question: question.question,
        selected: answers[index] ?? [],
      })),
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-sky-500/40 bg-neutral-800/60 p-3">
      {questions.map((question, index) => (
        <div key={index} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-neutral-100">{question.question}</p>
          {question.options && question.options.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {question.options.map((option) => {
                const selected = (answers[index] ?? []).includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(index, option, Boolean(question.multiple))}
                    className={optionClass(selected)}
                  >
                    <span
                      className={[
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-sky-300 bg-sky-400' : 'border-neutral-500',
                      ].join(' ')}
                    />
                    {option}
                  </button>
                )
              })}
            </div>
          ) : (
            <input
              type="text"
              value={(answers[index] ?? [])[0] ?? ''}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  [index]: event.target.value ? [event.target.value] : [],
                }))
              }
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-sky-500"
            />
          )}
        </div>
      ))}
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
