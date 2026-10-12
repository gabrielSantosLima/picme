import type { AgentSkill, JsonSchema, WordCloudSpec } from '../../entities/agent'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'

const PARAMETERS: JsonSchema = {
  type: 'object',
  properties: {
    question: { type: 'string', description: 'A single general question for the user.' },
    clouds: {
      type: 'array',
      description: 'One or more word clouds grouped by theme.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['tags'],
      },
    },
    multiple: { type: 'boolean', description: 'Allow selecting more than one tag.' },
  },
  required: ['clouds'],
}

export class ShowWordCloud {
  constructor(private readonly broker: InteractionBroker) {}

  execute(args: unknown): Promise<unknown> {
    const { question, clouds, multiple } = args as {
      question?: string
      clouds?: WordCloudSpec[]
      multiple?: boolean
    }
    return this.broker.request({
      id: crypto.randomUUID(),
      kind: 'word-cloud',
      question: question ?? 'Choose the ideas you like:',
      clouds: Array.isArray(clouds) ? clouds : [],
      multiple: multiple !== false,
    })
  }

  toSkill(): AgentSkill {
    return {
      name: 'show_word_cloud',
      description:
        'Show one or more word clouds (tag groups) with a general question and wait for the user to pick tags.',
      parameters: PARAMETERS,
      execute: (args) => this.execute(args),
    }
  }
}
