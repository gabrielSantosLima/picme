import type { AgentSkill } from '../../entities/agent'
import type { Project } from '../../entities/Project'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { AskQuestions } from './AskQuestions'
import { DrawFrame } from './DrawFrame'
import { ProposeVariants } from './ProposeVariants'
import { ReadFrame } from './ReadFrame'
import { ShowWordCloud } from './ShowWordCloud'

const MAX_FRAMES = 8
const MAX_STEPS = 8

export interface AgentConfigDeps {
  broker: InteractionBroker
  document: DocumentRepository
}

export interface AgentConfig {
  systemPrompt: string
  skills: AgentSkill[]
  maxSteps: number
}

const DRAW_FORMAT = `Tools:
- "propose_variants" args: { variants: [ { name?, palette: [hex,...], pixels: [32 rows of 32 chars] } ] } (2-3 variants). The user picks one and it is drawn on a new frame.
- "read_frame" args: { frameId? } returns { palette, pixels } of that frame (omit frameId for the active frame). Use it before editing or animating a frame precisely.
- "draw" args: { frameId?, mode: "replace"|"merge", region?: {x,y,width,height}, palette: [hex,...], pixels: [row,...] }
  - palette chars: 0-9 then a-z; "" = transparent.
  - pixels: one string per row; "." or " " = transparent.
  - region draws only a sub-rectangle (pixels = region.height rows of region.width chars).`

function systemPrompt(project: Project): string {
  const ids = project.frames.map((frame, index) => `${index + 1}=${frame.id}`).join(', ')
  return `You are PicMe's pixel-art agent. Create and edit animated pixel art.

Canvas ${project.width}x${project.height}. Frames: ${project.frames.length} (${ids}); max ${MAX_FRAMES}.
An image of the current canvas (active frame) is attached to the user message. Use it as reference.

How to work:
- Vague request: clarify with "ask" (multiple choice) and/or "show_word_cloud" (max twice).
- Then call "propose_variants" with 2-3 DIFFERENT designs (each a 32x32 grid). The user picks one and it is placed on a new frame automatically (the tool returns its frameId).
- After that, refine ONLY with "draw" (mode "merge") using small "region"s — at most 3 refinements. NEVER redraw the whole frame.
- To animate or edit other frames precisely, call "read_frame" for their id first, then "draw" with that frameId.
- Max 8 colors, centered shapes, 1px margin, transparent background.
- Always reply in English.
- Before finishing, either ask the user via "ask" if they want to continue, or reply with a short summary.

${DRAW_FORMAT}`
}

export function buildAgentConfig(deps: AgentConfigDeps): AgentConfig {
  const project = deps.document.getProject()
  const skills: AgentSkill[] = [
    new AskQuestions(deps.broker).toSkill(),
    new ShowWordCloud(deps.broker).toSkill(),
    new ProposeVariants(deps.document, deps.broker).toSkill(),
    new ReadFrame(deps.document).toSkill(),
    new DrawFrame(deps.document).toSkill(),
  ]
  return { systemPrompt: systemPrompt(project), skills, maxSteps: MAX_STEPS }
}
