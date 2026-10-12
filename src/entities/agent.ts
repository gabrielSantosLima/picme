export interface JsonSchema {
  type?: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: Array<string | number>
  additionalProperties?: boolean
}

export interface SkillContext {
  emit: (event: AgentEvent) => void
}

export interface AgentSkill {
  name: string
  description: string
  parameters: JsonSchema
  execute: (args: unknown, context: SkillContext) => Promise<unknown> | unknown
}

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_preparing'; name: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'usage'; totalTokens: number }
  | { type: 'message'; content: string }
  | { type: 'error'; error: string }

export type AgentPhase = 'idle' | 'running' | 'awaiting_input' | 'done' | 'error'

export interface QuestionSpec {
  question: string
  options?: string[]
  multiple?: boolean
}

export interface WordCloudSpec {
  title?: string
  tags: string[]
}

export type PendingInteraction =
  | { id: string; kind: 'questions'; questions: QuestionSpec[] }
  | {
      id: string
      kind: 'word-cloud'
      question: string
      clouds: WordCloudSpec[]
      multiple: boolean
    }

export interface QuestionAnswer {
  question: string
  selected: string[]
}

export interface DrawRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface DrawPayload {
  frameId?: string
  mode?: 'replace' | 'merge'
  region?: DrawRegion
  palette: string[]
  pixels: string[]
}
