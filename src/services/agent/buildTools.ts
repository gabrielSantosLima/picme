import type { AgentSkill } from '../../entities/agent'
import type { ToolDefinition } from '../llm/types'

export function buildTools(skills: AgentSkill[]): ToolDefinition[] {
  return skills.map((skill) => ({
    type: 'function',
    function: {
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    },
  }))
}
