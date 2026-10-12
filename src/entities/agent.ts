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
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'message'; content: string }
  | { type: 'error'; error: string }
