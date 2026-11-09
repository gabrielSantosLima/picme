# PicMe — Agent-Guided Animated Pixel Art Web App

PicMe is a 100% client-side pixel-art editor with a built-in LLM agent. Users
draw manually, manage animation frames, and ask the agent to create or edit
sprite art. Frames export to GIF or a sprite sheet.

The agent does **not** paint raw pixel grids directly. It writes a deterministic
**PixelSpec**, an in-app renderer validates and rasterizes it to an in-memory
`PixelGrid`, and the result is applied atomically to the canvas. This mirrors the
workflow of `.opencode/skills/pixel-art`: spec first, rasterize with code,
validate with metrics, iterate, then produce the final art.

> Status: the manual editor, timeline, export, provider settings and agent runtime
> exist. The spec-based pipeline is implemented (renderer, `draw`, `read_frame`,
> variants and animation). The previous raw-grid draw pipeline has been removed.
> Evaluation, prompt tuning and optional edit extensions remain.

## 1. Goals

- Keep the manual pixel-art editor fully usable without the agent.
- Frame-based animation: add, duplicate, delete, reorder, duration, playback,
  onion skin.
- Agent that creates and edits art by writing **PixelSpecs**, following the same
  quality guidelines as the external `pixel-art` skill:
  - silhouette first, then color;
  - named palette, 4–16 colors, transparent background;
  - closed 1px outline, 3-tone ramps, no anti-aliasing or blur;
  - symmetry and repetition expressed through ops, not manual duplication;
  - objective validation through metrics and ASCII preview;
  - stable animation bounds, few frames, consistent size and palette.
- The spec is rendered **into the PicMe canvas**, not into an image file. PNG is
  only used for variant previews and export.
- Deterministic rendering: the same spec always produces the same pixels.
- One `draw` call can create or replace multiple frames (animation) in a single
  undo step.
- Export animation to GIF and sprite sheet.
- Static deployment to GitHub Pages.

## 2. Non-goals

- No backend, no server-side rendering, no secrets in the repository.
- No procedural generation of hundreds of frames inside the LLM loop (the
  external skill can run Python scripts; PicMe cannot).
- No WebP/APNG export in this iteration.
- No palette-snapping UI, project resize UI or isolated "Agent layer" in this
  iteration.
- No live reveal through intermediate document states. Application is atomic.

## 3. Tech Stack

| Concern        | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| UI             | React + TypeScript                                            |
| Build/dev      | Vite                                                          |
| State          | Zustand (global) + React Context (shared UI)                  |
| Styling        | Tailwind CSS v4 via `@tailwindcss/vite`                       |
| Icons          | `react-icons`                                                 |
| GIF export     | `gifenc`                                                      |
| Sprite sheet   | native `<canvas>`                                             |
| LLM calls      | `fetch` against OpenAI-compatible endpoints (no vendor SDKs)  |
| Tests          | Vitest (to be added; the project has no test runner today)    |
| Deploy         | GitHub Actions → GitHub Pages                                 |

No backend. API keys live only in the browser (`IndexedDB`, encrypted with the
Web Crypto API).

## 4. Locked Decisions

### Existing

- Grid default: 32×32 (project-level size).
- Styling: Tailwind CSS.
- State: Zustand for global high-frequency state; React Context for shared UI
  context.
- Icons: always `react-icons`.
- Architecture: layered (entities → services → use cases → hooks/pages/components).
- Plan lives in `PLAN.md`.

### Agent drawing pipeline

- **Palette:** free per spec, up to 16 opaque colors plus transparent.
  `DEFAULT_PALETTE` remains the manual editor palette only.
  `AGENTS.md` must be updated: the agent is no longer restricted to the active
  editor palette.
- **Size/placement:** a spec may be smaller than the project canvas. It is placed
  with an explicit `x/y` or an `anchor`; default anchor is `center`. Characters
  should use `bottom-center`. A spec larger than the canvas is an error.
- **Validation:** strict, like the skill. Wrong row width, unknown character,
  unknown op, missing op field, out-of-bounds placement and mismatched frame ids
  are errors. Nothing is auto-padded, truncated or partially applied.
- **Replace with layers:** `replace` flattens the entire frame (clears all layers
  and writes the spec into one layer). The canvas then exactly matches the spec
  and the reported metrics.
- **Application:** atomic. One `document.commit`, one undo entry, no artificial
  delays, no per-row document updates and no repeated project clones.

## 5. Architecture

Strict one-way dependency flow:

```
entities   ← services   ← useCases   ← hooks / contexts / pages / components
   ↑             ↑             ↑
 no deps     browser/API     business rules
```

- **entities/** — domain only, no React, no I/O. Includes `PixelGrid`, `Frame`,
  `Project`, color helpers and the pure PixelSpec renderer.
- **services/** — external APIs and browser APIs: LLM providers, IndexedDB,
  crypto, canvas, downloads.
- **useCases/** — one class per use case with a single `execute`, dependencies
  injected through the constructor.
- **hooks/** — reusable hooks; may call use cases and wrap services needed by UI
  (for example spec previews).
- **contexts/** — shared React Context.
- **pages/** and **components/** — may use hooks and use cases, never services
  directly.
- **store/** — Zustand stores for global state.

All canvas edits, manual or agent-generated, flow through the same document
channel so undo/redo stays consistent.

### Agent draw flow

```
LLM
  → draw(spec, target, placement, apply)
      → validateSpec          (types, size, rows, palette keys, ops)
      → rasterizeFrames       (pure PixelGrid RGBA, ops in order)
      → metrics + ascii       (returned to the model)
      → ApplyPixelSpec        (single document.commit, single undo entry)
  → not applied if apply=false or if any validation error exists
```

The renderer never touches the DOM or the document. It is deterministic and
testable in isolation.

## 6. Project Structure

```
picme/
├── .github/workflows/deploy.yml
├── .opencode/skills/pixel-art/        # external reference implementation
├── index.html
├── vite.config.ts
├── docker-compose.yml
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── entities/
│   │   ├── PixelGrid.ts
│   │   ├── Frame.ts
│   │   ├── Layer.ts
│   │   ├── Project.ts
│   │   ├── color.ts / geometry.ts / palette.ts
│   │   ├── provider.ts
│   │   ├── agent.ts                   # skills, events, interactions, ArtVariant
│   │   ├── gridCodec.ts               # spec-compatible encode/decode
│   │   └── pixelSpec/                 # NEW pure spec renderer
│   │       ├── types.ts
│   │       ├── palette.ts
│   │       ├── ops.ts
│   │       ├── raster.ts
│   │       ├── validate.ts
│   │       ├── metrics.ts
│   │       ├── ascii.ts
│   │       └── index.ts
│   ├── services/
│   │   ├── storage/
│   │   ├── llm/
│   │   ├── agent/                     # AgentRunner, InteractionBroker
│   │   ├── canvas/                    # renderer, composite, gridToDataUrl
│   │   ├── export/
│   │   └── browser/
│   ├── useCases/
│   │   ├── canvas/ selection/ frames/ layers/
│   │   ├── export/
│   │   ├── settings/
│   │   └── agent/
│   │       ├── AskQuestions.ts
│   │       ├── ShowWordCloud.ts
│   │       ├── DrawFrame.ts           # REWRITTEN: spec-based
│   │       ├── ApplyPixelSpec.ts      # NEW: atomic apply
│   │       ├── ProposeVariants.ts     # REWRITTEN: specs
│   │       ├── ReadFrame.ts           # REWRITTEN: spec format + metrics
│   │       └── agentConfig.ts         # REWRITTEN: prompt + tools
│   ├── hooks/
│   │   ├── useAgent.ts
│   │   ├── useSpecPreviews.ts          # NEW: variant previews
│   │   └── ...
│   ├── contexts/
│   ├── store/
│   ├── pages/
│   └── components/
│       ├── editor/
│       ├── frames/
│       ├── layers/
│       ├── agent/
│       ├── layout/
│       ├── export/
│       └── settings/
└── PLAN.md
```

## 7. Data Model

```ts
type RGBA = number; // packed 0xRRGGBBAA

class PixelGrid {
  width: number;
  height: number;
  data: Uint32Array;
}

class Layer {
  id: string;
  name: string;
  grid: PixelGrid;
  visible: boolean;
}

class Frame {
  id: string;
  layers: Layer[];
  durationMs: number;
  activeLayerIndex: number;
}

class Project {
  width: number;
  height: number;
  frames: Frame[];
  activeFrameIndex: number;
}
```

The renderer produces `PixelGrid` values directly. It does not produce PNGs and
does not use the palette-index codec from the old pipeline.

## 8. Features

### 8.1 Manual editor

- Logical grid rendered to `<canvas>` with integer zoom and nearest-neighbor
  scaling.
- Tools: pencil, eraser, bucket fill, line, rectangle, ellipse, eyedropper,
  pan/zoom.
- Editable palette and color swatches.
- Undo/redo through the document history.

### 8.2 Timeline / animation

- Frame list with add, duplicate, delete and reorder.
- Per-frame duration and global playback.
- Onion skin.

### 8.3 Agent panel

- Right dock with `Layers | Agent` tabs.
- Conversation transcript, interactive area (questions, word clouds, variants)
  and prompt input with Run/Stop.
- Skill traces show tool arguments and results, including spec errors and metrics.

### 8.4 Agent drawing pipeline

- Agent writes a PixelSpec.
- Renderer validates and rasterizes in memory.
- Tool result returns validation errors, metrics and ASCII preview.
- Agent can dry-run (`apply: false`) to validate a silhouette before coloring.
- When valid and `apply` is true, `ApplyPixelSpec` writes the frames atomically.
- One call may target one frame or several frames.

### 8.5 Providers

Single `LLMProvider` interface; implementations differ only by base URL, headers
and model listing. Built-in: DeepInfra, OpenAI, Gemini, Custom. Keys stay in the
browser, encrypted.

### 8.6 Export

- GIF with `gifenc`, honoring frame durations and optional scale.
- Sprite sheet PNG via canvas.
- Individual PNG per frame.
- The spec renderer does not participate in export; exported frames are normal
  `Project` frames.

## 9. PixelSpec Format

The in-app spec mirrors the external skill's JSON. Unknown top-level fields are
ignored so that skill-style specs remain accepted.

```json
{
  "name": "emerald_sword",
  "size": [32, 32],
  "palette": {
    ".": "transparent",
    "#": "#12141c",
    "e": "#3fce6a",
    "E": "#23924a",
    "h": "#a8f0b0",
    "y": "#ffe28a"
  },
  "frames": [
    {
      "name": "idle",
      "pixels": [
        "................................",
        ".............####..............."
      ],
      "ops": [
        { "op": "mirror_x" },
        { "op": "outline", "color": "#" }
      ]
    }
  ],
  "fps": 8
}
```

### 9.1 Top-level fields

| Field     | Required | Meaning                                                        |
| --------- | -------- | -------------------------------------------------------------- |
| `name`    | no       | Base name used in traces and UI labels.                        |
| `size`    | yes      | `[width, height]` in pixels. Must fit the project canvas.      |
| `palette` | yes      | Object mapping one-character keys to colors. Must include `.`. |
| `frames`  | yes      | Array of frame objects. One object per frame.                  |
| `fps`     | no       | Default playback rate; converts to per-frame `durationMs`.     |

When there is only one frame, `pixels` and `ops` may be placed at the top level,
matching the skill.

### 9.2 Palette

`palette` values accept:

- `"transparent"`, `"none"` or `""` → fully transparent.
- `"#rgb"`, `"#rgba"`, `"#rrggbb"`, `"#rrggbbaa"`.
- `[r, g, b]` or `[r, g, b, a]` with values `0-255`.

Rules:

- Keys are any single character except whitespace.
- `.` is always transparent.
- A space in a pixel row is transparent only when it is not a palette key.
- Duplicate hex values are allowed but discouraged; metrics count distinct hexes.
- Maximum 16 opaque colors. The transparent key does not count.
- Recommended convention: `#` outline, lowercase shadow/base, uppercase highlight.

### 9.3 Frame fields

| Field        | Required | Meaning                                                     |
| ------------ | -------- | ----------------------------------------------------------- |
| `name`       | no       | Used in traces and output names.                            |
| `pixels`     | yes*     | Array of rows or one newline-separated string.              |
| `ops`        | no       | Operations applied in order after the pixel rows.           |
| `durationMs` | no       | Per-frame duration override; otherwise derived from `fps`.  |

\* In the optional edit extension (`base: "existing"`) `pixels` may be omitted.

Rows are strict: exactly `size[1]` rows with exactly `size[0]` characters each.

### 9.4 Operations

All `color`, `a`, `b`, `from` and `to` fields take a palette key.

| Op           | Fields                                               | Effect                                                       |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------ |
| `mirror_x`   | —                                                    | Copies the left half onto the right half.                    |
| `mirror_y`   | —                                                    | Copies the top half onto the bottom half.                    |
| `outline`    | `color`                                              | Adds a 4-connected 1px border around opaque pixels.          |
| `rect`       | `x`, `y`, `w`, `h`, `color`                          | Filled rectangle.                                            |
| `line`       | `x0`, `y0`, `x1`, `y1`, `color`                      | Bresenham line.                                              |
| `ellipse`    | `cx`, `cy`, `rx`, `ry`, `color`                      | Filled ellipse sampled with pixel centers.                   |
| `flood_fill` | `x`, `y`, `color`                                    | Replaces the 4-connected region at `(x, y)`.                 |
| `replace`    | `from`, `to`                                         | Replaces every pixel of one key with another.                |
| `shift`      | `dx`, `dy`                                           | Translates the frame, clipping at the edges.                 |
| `dither`     | `x`, `y`, `w`, `h`, `a`, `b`, `from?`, `pattern`     | Checker or deterministic percentage dither between two keys. |

`pattern` is `"checker"` (default) or a number `0-100`. Percentage dither uses
the same deterministic hash as the skill:
`(x * 73856093 ^ y * 19349663) & 0xFFFFFFFF`, then `% 100 < pct`.

Op coordinates are spec-local (`0..size`). Canvas placement is applied after
rasterization and does not affect ops.

### 9.5 PicMe extensions

These are not part of the external skill and are opted into explicitly:

| Field              | Meaning                                                       |
| ------------------ | ------------------------------------------------------------- |
| `target`           | `new`, `replace` or `merge`; target frame ids.                |
| `placement`        | `{x, y}` or `{anchor, offsetX?, offsetY?}`.                   |
| `apply`            | `false` renders only; default `true`.                         |
| `frames[].durationMs` | Per-frame duration override.                               |
| `base: "existing"` | Phase 2: seed the frame from the target frame before ops.     |
| `copy: "<frame>"`  | Phase 2: seed from another spec frame before ops.             |

## 10. Renderer

### 10.1 Modules

```
entities/pixelSpec/
  types.ts     PixelSpec, PixelFrameSpec, PixelOp, RenderedFrame, PixelIssue
  palette.ts   strict color parsing + char → RGBA map
  raster.ts    build PixelGrid + apply ops in order
  ops.ts       pure implementations of every op
  validate.ts  structural validation with frame/row/column/op context
  metrics.ts   bbox, occupancy, colors, pixel counts, orphans, symmetry
  ascii.ts     canonical character preview from RGBA + palette
  index.ts     renderSpec orchestration
```

### 10.2 Rendering

1. Parse and validate the palette.
2. Validate `size`, frames, rows and palette keys.
3. Build a `PixelGrid` from the rows.
4. Apply each op in order.
5. Validate op-produced colors and bounds.
6. Compute metrics and ASCII.
7. Return `RenderedFrame[]` or a list of errors.

If any frame fails, no frame is returned for application. No partial results.

### 10.3 Validation

Structural errors:

- `size` missing, non-integer or larger than the project canvas.
- Frame count exceeds the remaining frame budget.
- Wrong number of rows.
- Wrong row width, with frame, row and expected/actual width.
- Character not present in the palette.
- Unknown op or missing op field.
- Op color key not present in the palette.
- Placement outside the canvas.
- `target.frameIds` length does not match `spec.frames`.
- More than 16 opaque palette colors.

Error shape:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "row-width",
      "frame": "idle",
      "row": 7,
      "expected": 32,
      "actual": 30,
      "message": "row 7 must have exactly 32 characters"
    }
  ]
}
```

Errors are returned as the tool result. The agent must fix the spec and retry in
the same run. Nothing is normalized silently.

### 10.4 Metrics

For each rendered frame:

- `size`: `[w, h]`
- `bbox`: `[minX, minY, maxX, maxY]` or `null`
- `occupied_pixels`
- `occupancy` (0–1)
- `colors` (distinct opaque hexes)
- `pixel_counts` (by hex; the skill counts by palette character)
- `orphan_pixels`
- `vertical_symmetry` (0–1)
- `warnings[]`: orphans, bbox touching an edge, too many colors, empty frame

The agent uses these to correct the sprite before or after applying. ASCII is
returned for each frame (with a note when the frame count is large).

## 11. Applying to the Canvas

New use case: `ApplyPixelSpec`.

Inputs: `RenderedFrame[]`, `target`, `placement`, `fps`, per-frame durations.

### 11.1 Target modes

| Mode      | Behavior                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `new`     | Inserts frames after the active frame, creates one layer per frame.      |
| `replace` | Flattens the target frame (clears all layers) and writes the spec.       |
| `merge`   | Writes only non-transparent pixels onto the active layer of one frame.   |

Rules:

- `new` may create one or many frames.
- `replace` with multiple spec frames requires `frameIds` aligned 1:1.
- `merge` accepts exactly one spec frame and one target frame; transparent cells
  do not erase existing pixels.
- The resulting project must not exceed 8 frames.
- Active frame becomes the first created/replaced frame.
- The operation is a single `document.commit`: one undo entry, one project clone.
- No `await`, no batching, no intermediate document states.

### 11.2 Placement

- `{x, y}` is the top-left corner in canvas coordinates.
- `{anchor}` supports `top-left`, `top-center`, `top-right`, `center-left`,
  `center`, `center-right`, `bottom-left`, `bottom-center`, `bottom-right`.
- Optional `offsetX`/`offsetY` shifts the anchor by an integer.
- Default anchor is `center`; characters should use `bottom-center`.
- If the placed sprite exceeds canvas bounds, validation fails.
- One placement applies to all frames in the call.

### 11.3 Durations

- Global `fps` → `durationMs = max(20, round(1000 / fps))`.
- Per-frame `durationMs` overrides the global value.
- No `fps` and no per-frame duration → keep the target frame's duration, or the
  default 100 ms for new frames.

## 12. Reading and Editing

`read_frame` returns the frame in spec-compatible form:

```json
{
  "frameId": "...",
  "size": [32, 32],
  "palette": { ".": "transparent", "a": "#12141c", "b": "#3fce6a" },
  "pixels": ["...", "..."],
  "metrics": { "bbox": [1, 1, 30, 30], "orphan_pixels": 0, "colors": 6 }
}
```

- Reads the composite of all visible layers.
- Assigns canonical palette characters from a wide safe charset, so the old
  36-color limit disappears.
- If a frame has more unique colors than the charset supports (practically
  impossible for pixel art), returns an explicit error instead of losing colors.
- Editing workflow: `read_frame` → modify spec → `draw` with
  `target.mode = "replace"` (flatten) or `"merge"` (non-transparent overlay).
- Across user turns, the agent must call `read_frame` before editing; the
  conversation only persists text messages, not previous specs.

Phase 2 extensions:

- `base: "existing"` on a spec frame: start from the target frame's pixels and
  apply ops without re-emitting rows.
- `copy: "<frameName>"`: start from another spec frame and apply ops; useful for
  walk cycles and bounces.

## 13. Variants

`propose_variants` accepts specs:

```json
{
  "variants": [
    {
      "name": "A",
      "spec": {
        "size": [32, 32],
        "palette": { ".": "transparent", "#": "#12141c", "e": "#3fce6a" },
        "frames": [{ "pixels": ["..."], "ops": [] }]
      }
    }
  ]
}
```

- Each variant is validated and rendered with the same renderer.
- If any variant is invalid, the tool returns errors and does **not** show the
  picker. The agent fixes the specs and retries.
- Valid variants are shown as images generated from the rendered `PixelGrid`.
- On selection, the chosen spec is applied with `ApplyPixelSpec` (`replace`) to a
  new frame.
- The tool returns `{ selected, frameId, name }`.

## 14. Agent Prompt and Guidelines

The system prompt must transplant the external skill's rules in compact form.

### 14.1 Working rules

- Define target size, view, palette (4–16 colors) and transparent background.
- Silhouette first. When unsure, call `draw` with `apply: false` and inspect the
  ASCII before coloring.
- Use a named palette. `.` is transparent, `#` is outline, uppercase is light,
  lowercase is base/shadow.
- Use ops for repetitive work:
  - `mirror_x` for symmetry;
  - `outline` for the closed 1px border;
  - `dither` for texture;
  - `shift` for bounce/walk variation.
- Use 3-tone ramps per material: base, shadow, highlight.
- No anti-aliasing and no blur. Nearest-neighbor only.
- One perspective per sprite. Do not mix front and isometric.
- Keep a 1px margin; define the ground/pivot. Characters use `bottom-center`.
- Readability at 1x: if it does not read at 16×16, it is too complex.
- Keep to 16 colors or fewer.
- Never describe pixels only in prose. Always call `draw`.

### 14.2 Creation workflow

1. If the request is vague, ask questions and/or show a word cloud (at most twice).
2. Propose 2–3 different specs with `propose_variants`; the user picks one.
3. Refine the selected frame with ops or small spec edits.
4. Validate metrics and ASCII before finishing.
5. Reply with a short summary.

### 14.3 Animation workflow

- Same `size` and `palette` for every frame.
- Keep the bounding box stable; use `shift` for bounce, not full redraws.
- 2–4 frames are enough for idle, walk or bounce.
- Create the whole animation in one `draw` call when possible.
- Set `fps` or per-frame `durationMs`.
- Do not exceed 8 project frames.

### 14.4 Validation loop

- `orphan_pixels > 0` → remove loose pixels.
- `vertical_symmetry < 1` on a symmetric sprite → fix the shape.
- Low `occupancy` → the sprite is too small or empty.
- `bbox` touching an edge → the sprite may be clipped.
- `colors` too high → consolidate the palette.
- On validation errors, fix the spec and retry; do not ask the user to fix rows.

## 15. Agent Runtime

- `AgentRunner` remains generic: streams text, accumulates tool calls, executes
  skills, appends tool results, repeats up to `maxSteps`.
- Tools:
  - `ask`
  - `show_word_cloud`
  - `propose_variants` (spec-based)
  - `read_frame` (spec format + metrics)
  - `draw` (spec-based, `apply` true/false)
- `maxSteps` stays at 8 unless evaluation shows a need for more.
- `compactArguments` must not erase the whole spec. When arguments are large:
  - keep `size`, `palette`, `ops` and frame names;
  - replace `pixels` rows with a short note such as `[32 rows omitted]`;
  - the tool result still contains the rendered ASCII and metrics, so the model
    keeps a faithful view of the result.
- Tool results always include `ok`, frame ids, metrics, warnings and ASCII.
- Dry runs (`apply: false`) do not touch the document.
- The `InteractionBroker` continues to power `ask`, word clouds and variants.

## 16. Migration from the Old Pipeline

### Delete

- `src/useCases/agent/applyDrawPayload.ts`
- `src/services/canvas/variantToDataUrl.ts`
- `DrawPayload` and `DrawRegion` from `src/entities/agent.ts`
- old `gridCodec` functions (`paletteIndex`, `paletteColors`, `rowColor`,
  `encodeGrid`, `indexToChar`) once no imports remain
- the `delay` helper, row batching and repeated `document.update` calls

### Rewrite

- `src/useCases/agent/DrawFrame.ts` — new spec schema and flow.
- `src/useCases/agent/ProposeVariants.ts` — spec rendering and preview.
- `src/useCases/agent/ReadFrame.ts` — spec-compatible output and metrics.
- `src/useCases/agent/agentConfig.ts` — new prompt and tool descriptions.
- `src/entities/agent.ts` — new `ArtVariant` carrying a rendered grid/spec.
- `src/entities/gridCodec.ts` — spec-compatible codec with a wide charset.
- `src/hooks/useAgent.ts` — variants from rendered specs.
- `src/components/agent/VariantPicker.tsx` and `ChatTranscript.tsx` — previews
  through a hook, not a service import.
- `PLAN.md` and `AGENTS.md`.

### Add

- `src/entities/pixelSpec/*`
- `src/useCases/agent/ApplyPixelSpec.ts`
- `src/services/canvas/gridToDataUrl.ts`
- `src/hooks/useSpecPreviews.ts`
- renderer tests and fixtures

### No migration needed

Existing frames are already `PixelGrid`-based. Agent conversation entries are
ephemeral. Manual editor, export, providers and stores are unchanged.

## 17. Testing and Parity

Add Vitest and cover:

1. **Ops unit tests** — every op, including odd widths, edge clipping, flood fill,
   checker and percentage dither.
2. **Python parity** — render `.opencode/skills/pixel-art/assets/slime.json` and
   small committed fixtures; compare ASCII and metrics to goldens captured from
   `render_pixel_art.py`. A dev script regenerates goldens; tests do not require
   Python.
3. **Validation** — short/long rows, unknown characters, unknown ops, missing op
   fields, palette without `.`, size larger than the project, mismatched
   `frameIds`, more than 16 colors.
4. **ApplyPixelSpec** — `new`, `replace` (flatten), `merge`, multi-frame, fps to
   duration conversion, single undo, frame limit, placement bounds.
5. **Regression specs** — sword, coin, slime and a 4-frame walk cycle with
   expected metrics and ASCII.
6. **Evaluation** — 6–10 fixed prompts; measure first-attempt validity, steps,
   tokens, latency and remaining warnings.

Fixtures must not live in `/out` (gitignored). Use
`.opencode/skills/pixel-art/assets/` and `src/entities/pixelSpec/__fixtures__/`.

## 18. Performance

Why the new pipeline is faster:

- One `draw` call can carry all animation frames.
- Ops express outlines, symmetry, texture and shifts without re-emitting rows.
- Strict validation catches garbage immediately instead of after a user round
  trip.
- Application is one commit, not one clone per row batch.
- No `await delay(16)` between batches.
- The model receives ASCII/metrics from the tool result, so it does not need to
  re-read or guess what it drew.

Remaining costs:

- A full 32×32 frame is still about 1,024 characters. Ops reduce edits, not the
  initial grid.
- Strict errors can consume steps when the model keeps making the same mistake;
  clear error messages and a concise prompt mitigate this.
- Multi-frame output in one call can be large; recommend 2–4 frames, cap at 8.

## 19. Milestones

| #  | Deliverable                                                        | Status   |
| -- | ------------------------------------------------------------------ | -------- |
| M0 | Scaffold Vite + React + TS + Tailwind, deploy to Pages              | existing |
| M1 | Canvas + tools + palette + undo/redo                               | existing |
| M2 | Timeline, playback, onion skin                                     | existing |
| M3 | Export: GIF + sprite sheet + individual images                     | existing |
| M4 | Provider settings (key, model listing, custom provider)            | existing |
| M5 | Agent runtime (streaming, function calling, `AgentRunner`)         | existing |
| M6 | PixelSpec renderer: types, palette, ops, raster, validation, metrics, ASCII | done |
| M7 | Spec-based `draw` + `read_frame` + atomic `ApplyPixelSpec`          | done |
| M8 | Spec-based variants + multi-frame animation                        | done |
| M9 | Prompt tuning, evaluation, quality loop                            | planned |
| M10 | Remove old pipeline, update docs, final lint/typecheck/build       | done |

## 20. Success Metrics

- A simple 32×32 sprite is valid on the first `draw` attempt in most runs.
- A finished sprite takes at most two `draw` calls (creation + refinement).
- A 4-frame animation is created in one `draw` call.
- No silent row/character corruption reaches the canvas.
- Same spec renders identically across runs and browsers.
- Ops match the Python reference on parity fixtures.
- Token usage and number of API steps decrease compared with the old pipeline.
- Final metrics show no orphan pixels and an intentional bounding box.

## 21. Risks and Considerations

- **Parity drift:** the TS renderer must match the Python semantics exactly.
  Golden tests are the guard.
- **LLM strictness:** strict validation may cause retries. Mitigate with precise
  error messages, a concise prompt and evaluation of real models.
- **Token budget:** 32×32 grids are inherently verbose. Ops and smaller sprites
  help; per-frame inheritance is a phase-2 optimization.
- **Context loss:** across user turns the runner does not persist previous tool
  calls. `read_frame` before edits is mandatory; tool results echo ASCII/metrics.
- **Palette limit:** 16 opaque colors is a guideline made hard. Landscapes or
  complex scenes may need more; revisit only with evaluation data.
- **Layers:** `replace` flattens the frame. This is intentional and documented;
  `merge` preserves other layers.
- **Variants UX:** the picker must not show invalid art. Validate before showing.
- **CORS:** some providers may block direct browser calls; Gemini and DeepInfra
  are generally fine. A user-provided proxy remains the fallback.

## 22. Deployment

- Vite `base` is `/` for local/dev and `/picme/` in pages mode.
- `.github/workflows/deploy.yml`: install → build → `actions/deploy-pages`.
- Local preview: `npm run build && docker compose up -d` → http://localhost:8080.
- Routing: HashRouter or a `404.html` redirect to avoid refresh 404s.
- No backend. API keys stay in IndexedDB, encrypted with the Web Crypto API.

## 23. Documentation Updates

- `AGENTS.md`: replace the rule that restricts agent colors to the active palette
  with the free per-spec palette rule (max 16 opaque colors) and state that the
  agent must go through the PixelSpec renderer, never raw grids.
- `PLAN.md`: this document.
- Optional `docs/pixel-spec.md`: human-readable reference mirroring
  `.opencode/skills/pixel-art/references/spec.md`, for contributors. The agent
  prompt keeps its own compact version; the browser agent cannot read repo files.
