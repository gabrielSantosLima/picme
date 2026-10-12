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
│   ├── entities/                     # domain classes (no deps)
│   │   ├── PixelGrid.ts
│   │   ├── Frame.ts
│   │   ├── Project.ts
│   │   ├── Palette.ts
│   │   └── ChatMessage.ts
│   ├── services/                     # external + browser APIs
│   │   ├── storage/                  # localStorage (keys, saved projects)
│   │   ├── llm/                      # openai, deepinfra, gemini, custom
│   │   └── export/                   # gif.ts, spritesheet.ts
│   ├── useCases/                     # one class per use case, `execute()`
│   │   ├── canvas/                   # DrawPixels, ErasePixels, FillArea, ClearCanvas
│   │   ├── frames/                   # AddFrame, DeleteFrame, DuplicateFrame, ReorderFrames
│   │   ├── export/                   # ExportGif, ExportSpriteSheet
│   │   ├── settings/                 # ListModels, SaveProviderConfig
│   │   └── agent/                    # RunDiscovery, GeneratePixelArt, ApplyAgentOps
│   ├── hooks/                        # reusable hooks (use use cases)
│   ├── contexts/                     # React Context providers
│   ├── store/                        # Zustand stores
│   ├── pages/                        # EditorPage
│   └── components/                   # reusable components
│       ├── editor/                   # PixelCanvas, Toolbar, ColorPalette
│       ├── frames/                   # Timeline
│       ├── agent/                    # AgentBar, ChatPanel, WordCloud
│       └── settings/                 # ProviderSettings
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

### 7.3 Agent bar (top) — smart input
- Text input plus quick-action buttons; keyboard shortcut to focus.
- Two-phase flow:
  1. **Discovery** — agent asks targeted questions (style, subject, palette,
     dimensions, number of frames) and returns a **clickable word cloud**;
     selected tags become context for generation.
  2. **Generation** — agent emits structured operations that paint the canvas
     progressively.

### 7.4 Agent paints in real time
Use tool/function calling with a strict schema instead of free-form text.

```ts
type PixelOp =
  | { type: 'setPixels'; pixels: { x: number; y: number; color: RGBA }[] }
  | { type: 'line'; from: Point; to: Point; color: RGBA }
  | { type: 'rect'; from: Point; to: Point; color: RGBA; filled: boolean }
  | { type: 'fill'; start: Point; color: RGBA }
  | { type: 'clear'; color?: RGBA }
  | { type: 'addFrame'; afterId?: string }
  | { type: 'deleteFrame'; id: string };
```

`ApplyAgentOps` queues operations and applies them with a configurable delay to
produce the "painting live" effect. User can **Stop** or **Skip** at any time;
every applied op goes through the same undo channel as manual edits.

### 7.5 Providers
Single interface; implementations differ only by base URL, headers and model
listing.

```ts
interface LLMProvider {
  id: string;
  name: string;
  listModels(apiKey: string): Promise<ModelInfo[]>;
  streamChat(req: ChatRequest, apiKey: string): AsyncIterable<ChatChunk>;
}
```

Endpoints:
- **deepinfra** — `https://api.deepinfra.com/v1/openai`
- **openai** — `https://api.openai.com/v1`
- **gemini** — `https://generativelanguage.googleapis.com/v1beta/openai`
- **custom** — user-provided `baseURL` + headers.

Settings screen: paste API key (persisted in `localStorage` via a service),
"List models" button (via a use case), model select. Clear warning in the UI
that keys stay in the browser.

### 7.6 Export
- **GIF** with `gifenc`, honoring per-frame duration / FPS.
- **Sprite sheet** PNG via canvas (grid of frames).
- Implemented as services, triggered from use cases `ExportGif` / `ExportSpriteSheet`.

## 8. Agent Orchestration

- A dedicated use case drives the conversation state machine:
  `idle → discovery → awaiting_user → generating → done`.
- Discovery prompt requests structured JSON (questions + word cloud tags).
- Generation prompt exposes the paint tools and receives `PixelOp` calls.
- Tool schema restricts coordinates to the project bounds and colors to the
  active palette to improve output quality.

## 9. Deployment

- Vite `base` is `/` for local/dev and `/picme/` in `pages` mode
  (`npm run build:pages`).
- `.github/workflows/deploy.yml`: install → build → `actions/deploy-pages`.
- Local preview: `npm run build && docker compose up -d` → http://localhost:8080.
- Routing: **HashRouter** (or a `404.html` redirect) to avoid refresh 404s.
- No backend ⇒ API keys in `localStorage`; show a security notice.

## 10. Milestones

| #  | Deliverable                                                        |
| -- | ------------------------------------------------------------------ |
| M0 | Scaffold Vite + React + TS + Tailwind, empty deploy to Pages       |
| M1 | Canvas + tools + palette + undo/redo                               |
| M2 | Timeline, playback, onion skin                                     |
| M3 | GIF + sprite sheet export                                          |
| M4 | Provider settings (key, list/select model, custom provider)        |
| M5 | Agent discovery phase (questions + word cloud)                     |
| M6 | Agent generation phase (streaming `PixelOp` painted live)          |
| M7 | Polish: shortcuts, responsiveness, docs                            |

## 11. Risks / Considerations

- **CORS:** some providers may block direct browser calls; validate per provider
  (Gemini/DeepInfra are generally fine). Documented fallback: user-provided proxy.
- **LLM pixel-art quality:** small grid + fixed palette + strict tool schema are
  essential for usable output.
- **GIF libraries:** few are actively maintained; `gifenc` is fast and avoids
  heavy workers.
