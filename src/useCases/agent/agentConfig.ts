import type { AgentSkill } from '../../entities/agent'
import type { Project } from '../../entities/Project'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'
import { compositeLayers } from '../../services/canvas/composite'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { AskQuestions } from './AskQuestions'
import { DrawFrame } from './DrawFrame'
import { encodeGrid } from './gridCodec'
import { ShowWordCloud } from './ShowWordCloud'

const MAX_FRAMES = 8
const MAX_STEPS = 12
const INLINE_FRAMES = 3

export interface AgentConfigDeps {
  broker: InteractionBroker
  document: DocumentRepository
}

export interface AgentConfig {
  systemPrompt: string
  skills: AgentSkill[]
  maxSteps: number
}

const DRAW_FORMAT = `Pixel format for "draw":
- "palette": array of hex colors like ["#000000", "", "#ff004d"]; "" means transparent.
- Characters "0"-"9" then "a"-"z" address palette positions 0-35.
- "pixels": one string per row, each character is a palette index; "." or " " is transparent.
- "mode": "replace" redraws the whole target, "merge" paints only non-transparent cells.
- "region": optional { x, y, width, height } to draw only a sub-rectangle; then "pixels" must have exactly region.height rows of region.width characters.
- "frameId": an existing id from the list, or omit to create a new frame.
The "draw" call is rejected (and must be retried) if row/column counts are wrong.`

function framesContext(project: Project): string {
  const parts: string[] = []
  const showAll = project.frames.length <= INLINE_FRAMES
  project.frames.forEach((frame, index) => {
    const isActive = index === project.activeFrameIndex
    if (!showAll && !isActive) return
    const pixels = compositeLayers(frame, project.width, project.height)
    const { palette, grid } = encodeGrid(pixels, project.width, project.height)
    parts.push(`Frame ${index + 1} (id=${frame.id})${isActive ? ' [active]' : ''} palette: ${JSON.stringify(palette)}`)
    parts.push(...grid)
    parts.push('')
  })
  const ids = project.frames.map((frame, index) => `${index + 1}=${frame.id}`).join(', ')
  if (!showAll) {
    parts.push(`Other frame ids: ${ids}. Their pixels are not shown; target them by id only when needed.`)
  }
  return parts.join('\n')
}

function systemPrompt(project: Project): string {
  const ids = project.frames.map((frame, index) => `${index + 1}=${frame.id}`).join(', ')
  return `You are PicMe's pixel-art agent. You create and edit animated pixel art.

Canvas: ${project.width}x${project.height} pixels. Frames: ${project.frames.length} (${ids}). You may create up to ${MAX_FRAMES} frames.

Current frames (top to bottom, one string per row; "." = transparent):
${framesContext(project)}

You can BOTH create new frames and EDIT existing ones, including editing more than one frame.

Workflow (repeat as needed):
1. Refinement: use "ask" and/or "show_word_cloud" to clarify the idea. Ask by default when the request is vague, and at most twice in a row.
2. Draw: use "draw" to create or edit the art.
3. Refine again when more detail would help, then draw again. Iterate refinement -> draw.
4. End: when the result is good, stop calling tools and reply with a short summary message.

Drawing pipeline (keep it fast, at most 3 "draw" calls):
1. Base: block the main silhouette with 1-2 colors (mode "replace").
2. Colors and details: fill the main areas and add features (mode "merge"); use "region" for small fixes instead of redrawing the whole frame.
3. Shading and outline: optional highlight/shadow and a dark outline (mode "merge").
Do NOT keep redrawing the same frame. Prefer few, large calls.
Keep the art readable: at most 8 colors, clear centered shapes, 1px margin, transparent background.

Step budget:
- You have a limited number of steps. Use at most 3 "draw" calls.
- When the art looks decent but could still improve, STOP drawing and use the "ask" skill to ask the user whether to continue, e.g. question "Do you want me to keep refining?" with options ["Keep refining", "Finish"].
- If the user chooses Finish (or after a few more refinements), reply with a short summary message.
- Never stop silently: always end with either an "ask" question or a short summary message.

Tool usage:
- Use "ask" to ask up to 4 concise multiple-choice questions.
- Use "show_word_cloud" to propose idea tags (one or more clouds + one general question).
- Use "draw" to paint a frame; call it multiple times to animate or to edit several frames.

${DRAW_FORMAT}

Editing:
- To edit a frame, pass its "frameId" and use "mode": "merge" to change only some cells, or "replace" to redraw it entirely.
- You may edit multiple frames by calling "draw" once per frame.

Guidelines:
- Use a limited palette and clear, centered silhouettes with a 1px margin.
- Provide exactly ${project.height} rows of exactly ${project.width} characters.
- Always respond in English, regardless of the language the user writes in.`
}

export function buildAgentConfig(deps: AgentConfigDeps): AgentConfig {
  const project = deps.document.getProject()
  const skills: AgentSkill[] = [
    new AskQuestions(deps.broker).toSkill(),
    new ShowWordCloud(deps.broker).toSkill(),
    new DrawFrame(deps.document).toSkill(),
  ]
  return { systemPrompt: systemPrompt(project), skills, maxSteps: MAX_STEPS }
}
