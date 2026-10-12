import type { AgentSkill, JsonSchema, QuestionSpec } from '../../entities/agent'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: 'One or more questions to ask the user.',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          multiple: { type: 'boolean' },
        },
        required: ['question'],
      },
    },
  },
  required: ['questions'],
}

export class AskQuestions {
  constructor(private readonly broker: InteractionBroker) {}

  execute(args: unknown): Promise<unknown> {
    const { questions } = args as { questions?: QuestionSpec[] }
    return this.broker.request({
      id: crypto.randomUUID(),
      kind: 'questions',
      questions: Array.isArray(questions) ? questions : [],
    })
  }

  toSkill(): AgentSkill {
    return {
      name: 'ask',
      description:
        'Ask the user one or more multiple-choice questions and wait for their answers.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
