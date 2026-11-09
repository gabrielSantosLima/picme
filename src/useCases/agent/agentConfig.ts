import type { AgentSkill } from '../../entities/agent'
import type { Project } from '../../entities/Project'
import type { InteractionBroker } from '../../services/agent/InteractionBroker'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import { AskQuestions } from './AskQuestions'
import { DrawFrame } from './DrawFrame'
import { MAX_FRAMES } from './limits'
import { ProposeVariants } from './ProposeVariants'
import { ReadFrame } from './ReadFrame'
import { ShowWordCloud } from './ShowWordCloud'

export interface AgentConfigDeps {
  broker: InteractionBroker
  document: DocumentRepository
  includeImage: boolean
}

export interface AgentConfig {
  systemPrompt: string
  skills: AgentSkill[]
}

const SPEC_FORMAT = `PixelSpec format:
- draw args: { spec, target?, placement?, apply? }
- spec: { size: [w,h], palette: { char: color }, frames: [ { name?, pixels: [row,...], ops: [op,...], durationMs? } ], fps? }
- palette: single-char keys. "." is transparent. Values: "#rgb", "#rgba", "#rrggbb", "#rrggbbaa", [r,g,b], [r,g,b,a], or "transparent". Use at most 16 opaque colors.
- pixels: one string per row, exactly size[1] rows with exactly size[0] chars. A space is transparent.
- target: { mode: "new" | "replace" | "merge", frameId?, frameIds? }. "new" inserts frames; "replace" flattens and redraws; "merge" paints non-transparent pixels.
- placement: { x, y } or { anchor, offsetX?, offsetY? }. Anchors: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right. Default center; use bottom-center for characters.
- apply: false validates and renders without changing the canvas.

Ops (applied in order):
- mirror_x / mirror_y
- outline { color }
- rect { x, y, w, h, color }
- line { x0, y0, x1, y1, color }
- ellipse { cx, cy, rx, ry, color }
- flood_fill { x, y, color }
- replace { from, to }
- shift { dx, dy }
- dither { x?, y?, w?, h?, a, b, from?, pattern? } (pattern "checker" or 0-100)
All color fields take palette keys.`

function systemPrompt(project: Project, includeImage: boolean): string {
  const ids = project.frames.map((frame, index) => `${index + 1}=${frame.id}`).join(', ')
  const canvasLine = includeImage
    ? 'An image of the current canvas (active frame) is attached to the user message. Use it as reference.'
    : 'You do not have the canvas image. Use "read_frame" if you need a frame\'s exact pixels.'
  return `You are PicMe's pixel-art agent. You create and edit animated pixel art by writing deterministic PixelSpecs. A renderer validates every row and op, rasterizes the spec, returns metrics and an ASCII preview, and applies it to the canvas atomically. You never paint a raw grid outside this pipeline.

Canvas ${project.width}x${project.height}. Frames: ${project.frames.length} (${ids}); max ${MAX_FRAMES}.
${canvasLine}

How to work:
- Vague request: clarify with "ask" (multiple choice) and/or "show_word_cloud" (at most twice).
- Then call "propose_variants" with 2-3 DIFFERENT one-frame specs. The user picks one and it is drawn on a new frame automatically.
- Refine the selected frame with "draw". To edit an existing frame, call "read_frame" first, then send a complete spec with palette, pixels and ops and target { mode: "replace", frameId }. Use ops to avoid manual repetition.
- Prefer ops (mirror, outline, replace, shift, dither) over hand-editing repeated rows.
- Use "draw" with apply:false to validate a silhouette before coloring when uncertain.
- Create the whole animation in one "draw" call when possible. Keep 2-4 frames, same size and palette, stable bbox; use "shift" for bounce.

Quality rules:
- Define target size, view, palette and transparent background.
- Silhouette first, then color.
- Name the palette: "." transparent, "#" outline, lowercase base/shadow, uppercase highlight.
- Closed 1px outline; 3-tone ramps per material; no anti-aliasing or blur.
- One perspective per sprite. No mixing front and isometric.
- 1px margin; characters stand on the bottom (bottom-center). Keep art readable at 16x16.
- At most 16 colors. Prefer 4-8.
- Never describe pixels only in prose: always call "draw" or "propose_variants".
- Always reply in English.

Validation loop:
- If the tool returns ok:false, read the errors, fix the spec and retry within this run. Do not ask the user to fix rows.
- Check metrics: orphan_pixels > 0 means loose pixels; vertical_symmetry < 1 on a symmetric sprite means a warped shape; low occupancy means the sprite is too small or empty; bbox touching an edge may be clipped; too many colors need consolidation.
- Before finishing, either ask the user via "ask" if they want to continue, or reply with a short summary.

${SPEC_FORMAT}`
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
  return { systemPrompt: systemPrompt(project, deps.includeImage), skills }
}
