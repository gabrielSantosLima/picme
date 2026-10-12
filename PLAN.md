# PicMe — Agent-Guided Animated Pixel Art Web App

Plan for a 100% client-side web application where a user opens a blank pixel-art
canvas, draws manually, edits animation frames, and interacts with an AI agent
that asks questions, suggests ideas (word clouds), and paints the canvas in
real time. Frames can be exported as GIF or sprite sheet.

> Status: planning — M0/M1 scaffolding done.

## 1. Goals

- Blank pixel-art canvas usable purely manually (like classic pixel editors).
- Frame-based animation editing (add/remove/reorder, playback, onion skin).
- Agent bar at the top ("smart input") that:
  - runs a discovery phase (questions + clickable word cloud suggestions);
  - runs a generation phase that paints the canvas progressively in real time.
- Configurable LLM provider: API key, list + select model, custom provider support.
- Built-in providers: **DeepInfra**, **OpenAI**, **Gemini**, plus **Custom**.
- Export animation to **GIF** and **sprite sheet**.
- Static deploy to **GitHub Pages**.

## 2. Tech Stack

| Concern        | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| UI             | React + TypeScript                                            |
| Build/dev      | Vite                                                          |
| State          | Zustand (global) + React Context (shared UI)                  |
| Styling        | Tailwind CSS                                                  |
| Icons          | `react-icons`                                                 |
| GIF export     | `gifenc`                                                      |
| Sprite sheet   | native `<canvas>`                                             |
| LLM calls      | `fetch` against OpenAI-compatible endpoints (no vendor SDKs)  |
| Deploy         | GitHub Actions → GitHub Pages                                 |

No backend. API keys are stored only in the browser (`localStorage`).

## 3. Decisions (locked)

- **Grid default:** 32×32 (configurable per project).
- **Styling:** Tailwind CSS.
- **State:** Zustand for global high-frequency state (document/frames/agent);
  React Context for shared UI context (active tool, provider, theme).
- **Icons:** always `react-icons` (never inline SVGs or icon fonts).
- **Architecture:** layered (entities → services → use cases → hooks/pages/components).
- **Plan lives in:** `PLAN.md`.

## 4. Architecture

Strict one-way dependency flow:

```
entities   ← services   ← useCases   ← hooks / contexts / pages / components
   ↑             ↑             ↑
 no deps     browser/API     business rules
```

- **entities/** — domain classes only (no React, no I/O). Example: `PixelGrid`,
  `Frame`, `Project`, `Palette`, `ChatMessage`.
- **services/** — external communication: LLM provider APIs and browser APIs
  (`localStorage`, `<canvas>`, downloads). Never imported by UI components.
- **useCases/** — application use cases. Each exposes a single `execute`
  method. **All dependencies are injected via the constructor.** Use cases
  orchestrate services + entities. UI starts a use case, it does not contain rules.
- **hooks/** — reusable custom hooks shared across components. Call use cases.
- **contexts/** — shared React Context (React Context API directly).
- **pages/** — React pages; may use use cases and hooks.
- **components/** — reusable components; may use use cases and hooks, never
  services directly.
- **store/** — Zustand stores for global state. Canvas edits flow through the
  same operation channel as agent-generated `PixelOp`s so undo/redo stays consistent.

### Use case shape

```ts
export class DrawPixels {
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly historyStore: HistoryStore,
  ) {}

  execute(op: SetPixelsOp): void {
    // validate against project bounds + active palette, then apply
  }
}
```

## 5. Project Structure

```
picme/
├── .github/workflows/deploy.yml      # build + deploy to Pages
├── index.html
├── vite.config.ts                    # base '/'; '/picme/' in `pages` mode
├── docker-compose.yml                # nginx serving ./dist at :8080
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── entities/                     # domain classes/types (no deps)
│   │   ├── PixelGrid.ts
│   │   ├── Frame.ts
│   │   ├── Project.ts
│   │   ├── color.ts / geometry.ts / palette.ts
│   │   ├── provider.ts               # provider presets + settings
│   │   └── agent.ts                  # skills, events, modes, interactions
│   ├── services/                     # external + browser APIs
│   │   ├── storage/                  # IndexedDB + Web Crypto (settings)
│   │   ├── llm/                      # OpenAI-compatible provider, SSE, types
│   │   ├── agent/                    # AgentRunner, InteractionBroker
│   │   ├── canvas/                   # CanvasRenderer, composite, export helpers
│   │   ├── export/                   # GIF / sprite sheet / frame images
│   │   └── browser/                  # downloads
│   ├── useCases/                     # one class per use case, `execute()`
│   │   ├── canvas/                   # PaintStroke, FillArea, DrawShape, PickColor
│   │   ├── selection/                # select/delete/copy/paste/move
│   │   ├── frames/ layers/           # frame + layer use cases
│   │   ├── export/                   # ExportGif, ExportSpriteSheet, ExportFrameImages
│   │   ├── settings/                 # Load/Save settings, ListModels
│   │   └── agent/                    # modes, discovery/paint skills (ask, cloud, draw)
│   ├── hooks/                        # reusable hooks (use use cases)
│   ├── contexts/                     # React Context providers
│   ├── store/                        # Zustand stores (document, selection, agent)
│   ├── pages/                        # EditorPage
│   └── components/                   # reusable components
│       ├── editor/                   # PixelCanvas, Toolbar, ColorPalette
│       ├── frames/                   # Timeline
│       ├── layers/                   # LayersPanel
│       ├── agent/                    # AgentButton, AgentPanel, QuestionForm, WordCloudPicker
│       ├── layout/                   # RightDock (Layers | Agent)
│       ├── export/                   # ExportButton
│       └── settings/                 # ProviderSettingsDialog
└── PLAN.md
```

## 6. Data Model (entities)

```ts
type RGBA = number; // packed 0xRRGGBBAA

class PixelGrid {
  width: number;
  height: number;
  data: Uint32Array;
}

class Frame {
  id: string;
  grid: PixelGrid;
  durationMs: number;
}

class Project {
  width: number;
  height: number;
  frames: Frame[];
  palette: string[];
}

interface ModelInfo { id: string; label: string; }
```

## 7. Features

### 7.1 Manual editor
- Logical grid rendered to a `<canvas>` scaled by an integer zoom with
  `image-rendering: pixelated`.
- Tools: pencil, eraser, bucket fill, line, rectangle, eyedropper, pan/zoom.
- Editable palette + swatches.
- Undo/redo via an operation/snapshot stack.

### 7.2 Timeline / animation
- Frame list: add, duplicate, delete, reorder, per-frame duration.
- Global FPS playback with play/pause.
- Onion skin (previous frame rendered translucent).

### 7.3 Agent panel (right dock)
- Docked on the right as a panel with tabs `Layers | Agent` (same pattern as the
  layers/color panels).
- The toolbar **agent button** opens `ProviderSettingsDialog` when no provider is
  configured; otherwise it toggles the **Agent** tab.
- Panel contents: conversation transcript, interactive area (questions / word
  cloud) and a prompt input with **Run / Stop**.

### 7.4 Agent: Deep Draw with editing
A single agent that both **plans** (questions / word clouds) and **creates or
edits** pixel art, including **editing more than one frame by `frameId`**.

- System prompt covers creation and editing.
- Context includes project metadata plus the **content (char-grid + palette) of
  every frame**, so any frame can be edited by id.
- Skills: `ask`, `show_word_cloud`, `draw`.
- Behavior: when the prompt is vague the agent asks questions by default (at most
  twice), then draws/edits; it may call `draw` multiple times (animation and/or
  multi-frame edits).

| Aspect      | Behavior                                                      |
| ----------- | ------------------------------------------------------------- |
| Create      | `draw` without `frameId` (or a new id) adds a frame.          |
| Edit        | `draw` with an existing `frameId`; `merge` patches cells, `replace` redraws. |
| Multi-frame | one `draw` call per frame.                                    |

### 7.5 Providers
Single interface; implementations differ only by base URL, headers and model
listing.

```ts
interface LLMProvider {
  id: string;
  listModels(): Promise<ModelInfo[]>;
  streamChat(request: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk>;
}
```

Endpoints:
- **deepinfra** — `https://api.deepinfra.com/v1/openai`
- **openai** — `https://api.openai.com/v1`
- **gemini** — `https://generativelanguage.googleapis.com/v1beta/openai`
- **custom** — user-provided `baseURL`.

Settings screen: paste API key (persisted in `IndexedDB`, encrypted with the Web
Crypto API), "List models" button (via a use case), model input. Clear warning in
the UI that keys stay in the browser.

### 7.6 Export
- **GIF** with `gifenc`, honoring per-frame duration / FPS and an optional scale.
- **Sprite sheet** PNG via canvas (grid of frames, columns + scale).
- **Individual images**: one PNG per frame.
- Implemented as services, triggered from use cases `ExportGif` /
  `ExportSpriteSheet` / `ExportFrameImages`.

### 7.7 Agent execution architecture
- **`AgentRunner`** (service): generic loop configured with
  `{ provider, systemPrompt, skills, maxSteps, temperature }`. It streams text,
  accumulates tool calls, executes skills (injected), appends `tool` messages and
  repeats until a final message or `maxSteps`. Supports `AbortSignal`.
- **`InteractionBroker`** (service): human-in-the-loop bridge. `ask` /
  `show_word_cloud` skills call `broker.request(interaction)` which stores the
  pending interaction in `agentStore` and returns a promise; the UI resolves it
  when the user submits, and the runner continues. `Stop` calls
  `broker.cancelAll`.
- Skills live in `useCases/agent` (they may touch the document); `AgentRunner`
  only knows the `AgentSkill` interface (entities).

### 7.8 Skills
1. **`ask`** — `questions: { question, options?, multiple? }[]` → returns
   `{ answers: { question, selected[] }[] }`.
2. **`show_word_cloud`** — `{ question, clouds: { title?, tags[] }[], multiple }`
   → returns `{ selected: string[] }`.
3. **`draw`** — `{ frameId, mode: 'replace' | 'merge', palette, pixels }` →
   applies the frame (creating it when `frameId` is new) via the shared operation
   channel (undo/redo consistent), returning `{ frameId, applied }`.

### 7.9 Agent pixel format
`pixels` is a character grid: one string per row; each character is a palette
index (`0`-`9` `a`-`z`), `.` or space = transparent. `palette` is an array of hex
colors (`""` = transparent). Compact and LLM-friendly for 32×32 frames.

## 8. Agent runtime flow

Phases: `idle → running → awaiting_input → running → … → done | error`.

```
Run → createProvider(settings) → AgentRunner(systemPrompt, skills)
   → stream text to the panel
   → tool_call ask / show_word_cloud → suspend (pending interaction) → UI → resolve
   → tool_call draw → paint frame progressively in batches
   → final message → done
Stop → abort fetch + cancelAll pending interactions
```

Every `draw` is one undo entry; painting is applied in row batches for the
"painting live" effect.

## 9. Deployment

- Vite `base` is `/` for local/dev and `/picme/` in `pages` mode
  (`npm run build:pages`).
- `.github/workflows/deploy.yml`: install → build → `actions/deploy-pages`.
- Local preview: `npm run build && docker compose up -d` → http://localhost:8080.
- Routing: **HashRouter** (or a `404.html` redirect) to avoid refresh 404s.
- No backend ⇒ API keys in `IndexedDB` (encrypted with the Web Crypto API);
  show a security notice.

## 10. Milestones

| #  | Deliverable                                                        |
| -- | ------------------------------------------------------------------ |
| M0 | Scaffold Vite + React + TS + Tailwind, empty deploy to Pages       |
| M1 | Canvas + tools + palette + undo/redo                               |
| M2 | Timeline, playback, onion skin                                     |
| M3 | Export: GIF + sprite sheet + individual images                     |
| M4 | Provider settings (key, list/select model, custom provider)        |
| M5 | Agent architecture (streaming + function calling + `AgentRunner`)  |
| M6 | Deep Draw agent (questions + word cloud + draw + multi-frame edit) |
| M7 | Polish: shortcuts, responsiveness, docs                            |

## 11. Risks / Considerations

- **CORS:** some providers may block direct browser calls; validate per provider
  (Gemini/DeepInfra are generally fine). Documented fallback: user-provided proxy.
- **LLM pixel-art quality:** small grid + fixed palette + strict tool schema are
  essential for usable output.
- **GIF libraries:** few are actively maintained; `gifenc` is fast and avoids
  heavy workers.
