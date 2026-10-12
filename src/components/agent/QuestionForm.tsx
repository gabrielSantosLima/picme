import { useState } from 'react'
import type { QuestionSpec } from '../../entities/agent'

function chip(selected: boolean): string {
  return [
    'rounded-full border px-2.5 py-0.5 text-xs transition-colors focus:outline-none',
    selected
      ? 'border-sky-400 bg-sky-500 text-white'
      : 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-neutral-500',
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
    <div className="flex flex-col gap-3 rounded border border-sky-500/40 bg-neutral-800/60 p-3">
      {questions.map((question, index) => (
        <div key={index} className="flex flex-col gap-1">
          <p className="text-xs font-medium text-neutral-200">{question.question}</p>
          {question.options && question.options.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(index, option, Boolean(question.multiple))}
                  className={chip((answers[index] ?? []).includes(option))}
                >
                  {option}
                </button>
              ))}
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
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:border-sky-500"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={submit}
        className="self-end rounded bg-sky-500 px-3 py-1 text-sm font-medium text-white hover:bg-sky-400 focus:outline-none"
      >
        Submit answer
      </button>
    </div>
  )
}
