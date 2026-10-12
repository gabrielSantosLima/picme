# PicMe — Agent-Guided Animated Pixel Art Web App

Plan for a 100% client-side web application where a user opens a blank pixel-art
canvas, draws manually, edits animation frames, and interacts with an AI agent
that asks questions, suggests ideas (word clouds), and paints the canvas in
real time. Frames can be exported as GIF or sprite sheet.

> Status: **planning only** — nothing implemented yet.

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
| State          | Zustand (document, settings, agent)                           |
| Styling        | Tailwind CSS                                                  |
| GIF export     | `gifenc`                                                      |
| Sprite sheet   | native `<canvas>`                                             |
| LLM calls      | `fetch` against OpenAI-compatible endpoints (no vendor SDKs)  |
| Deploy         | GitHub Actions → GitHub Pages                                 |

No backend. API keys are stored only in the browser (`localStorage`).

## 3. Decisions (locked)

- **Grid default:** 32×32 (configurable per project).
- **UI/state:** Tailwind CSS + Zustand.
- **Plan lives in:** `PLAN.md`.

## 4. Project Structure

```
picme/
├── .github/workflows/deploy.yml      # build + deploy to Pages
├── index.html
├── vite.config.ts                    # base: '/picme/'
├── tailwind.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── index.ts
│   ├── core/
│   │   ├── canvas/                   # PixelGrid + drawing ops (line, fill, rect)
│   │   ├── animation/                # Frame model, playback, onion skin
│   │   └── export/                   # gif.ts, spritesheet.ts
│   ├── components/
│   │   ├── editor/PixelCanvas.tsx
│   │   ├── editor/Toolbar.tsx
│   │   ├── editor/ColorPalette.tsx
│   │   ├── frames/Timeline.tsx
│   │   ├── agent/AgentBar.tsx        # smart input element
│   │   ├── agent/ChatPanel.tsx
│   │   ├── agent/WordCloud.tsx
│   │   └── settings/ProviderSettings.tsx
│   ├── agent/
│   │   ├── AgentOrchestrator.ts      # conversation state machine
│   │   ├── tools.ts                  # JSON schema for tool calling
│   │   ├── prompts.ts
│   │   └── applyOps.ts               # applies PixelOp with progressive reveal
│   ├── providers/
│   │   ├── types.ts
│   │   ├── openai.ts
│   │   ├── deepinfra.ts
│   │   ├── gemini.ts
│   │   ├── custom.ts
│   │   └── index.ts                  # registry + factory
│   └── store/
│       ├── documentStore.ts          # frames, pixels, palette, history
│       ├── settingsStore.ts          # provider, apiKey, model
│       └── agentStore.ts             # messages, phase, streaming state
└── PLAN.md
```

## 5. Data Model

```ts
type RGBA = number; // packed 0xRRGGBBAA

interface PixelGrid {
  width: number;
  height: number;
  data: Uint32Array;
}

interface Frame {
  id: string;
  grid: PixelGrid;
  durationMs: number;
}

interface Project {
  width: number;
  height: number;
  frames: Frame[];
  palette: string[];
}

interface ModelInfo { id: string; label: string; }
```

## 6. Features

### 6.1 Manual editor
- Logical grid rendered to a `<canvas>` scaled by an integer zoom with
  `image-rendering: pixelated`.
- Tools: pencil, eraser, bucket fill, line, rectangle, eyedropper, pan/zoom.
- Editable palette + swatches.
- Undo/redo via an operation/snapshot stack.

### 6.2 Timeline / animation
- Frame list: add, duplicate, delete, reorder, per-frame duration.
- Global FPS playback with play/pause.
- Onion skin (previous frame rendered translucent).

### 6.3 Agent bar (top) — smart input
- Text input plus quick-action buttons; keyboard shortcut to focus.
- Two-phase flow:
  1. **Discovery** — agent asks targeted questions (style, subject, palette,
     dimensions, number of frames) and returns a **clickable word cloud**;
     selected tags become context for generation.
  2. **Generation** — agent emits structured operations that paint the canvas
     progressively.

### 6.4 Agent paints in real time
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

`applyOps` queues operations and applies them with a configurable delay to
produce the "painting live" effect. User can **Stop** or **Skip** at any time;
every applied op goes through the same undo channel as manual edits.

### 6.5 Providers

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

Settings screen: paste API key (persisted in `localStorage`), "List models"
button, model select. Clear warning in the UI that keys stay in the browser.

### 6.6 Export
- **GIF** with `gifenc`, honoring per-frame duration / FPS.
- **Sprite sheet** PNG via canvas (grid of frames).

## 7. Agent Orchestration

- `AgentOrchestrator` is an explicit state machine:
  `idle → discovery → awaiting_user → generating → done`.
- Discovery prompt requests structured JSON (questions + word cloud tags).
- Generation prompt exposes the paint tools and receives `PixelOp` calls.
- Tool schema restricts coordinates to the project bounds and colors to the
  active palette to improve output quality.

## 8. Deployment (GitHub Pages)

- `vite.config.ts`: `base: '/picme/'` (match repo name).
- `.github/workflows/deploy.yml`: install → build → `actions/deploy-pages`.
- Routing: **HashRouter** (or a `404.html` redirect) to avoid refresh 404s.
- No backend ⇒ API keys in `localStorage`; show a security notice.

## 9. Milestones

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

## 10. Risks / Considerations

- **CORS:** some providers may block direct browser calls; validate per provider
  (Gemini/DeepInfra are generally fine). Documented fallback: user-provided proxy.
- **LLM pixel-art quality:** small grid + fixed palette + strict tool schema are
  essential for usable output.
- **GIF libraries:** few are actively maintained; `gifenc` is fast and avoids
  heavy workers.
```
