# AGENTS.md

Directives for AI agents working in this repository.

## Project

PicMe — an agent-guided animated pixel art web app. 100% client-side (no backend).
Users draw pixel art manually, manage animation frames, and interact with an LLM
agent that asks questions and paints the canvas in real time. Frames export to
GIF or sprite sheet. Deployed as a static site to GitHub Pages.

See `PLAN.md` for the full design. Implement in milestone order (M0 → M7).

## Tech Stack

- React + TypeScript
- Vite (build/dev)
- Zustand (state: document, settings, agent)
- Tailwind CSS (styling)
- `gifenc` (GIF export); native `<canvas>` for sprite sheets
- LLM calls via `fetch` to OpenAI-compatible endpoints (no vendor SDKs)
- Deploy: GitHub Actions → GitHub Pages

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Build for Pages: `npm run build:pages` (sets `base` to `/picme/`)
- Preview: `npm run preview`
- Lint: `npm run lint` (oxlint)
- Typecheck: `npm run typecheck` (tsc -b, strict mode)

Always run lint and typecheck after making changes.

Note: Tailwind CSS v4 is configured through the `@tailwindcss/vite` plugin and
`src/index.css` (`@import "tailwindcss";`) — there is no `tailwind.config.js`.

## Conventions

- **Language:** all code, identifiers, comments, commit messages, and docs in English.
- **Do not add comments** unless explicitly requested.
- Follow existing patterns in neighboring files before introducing new abstractions.
- Never assume a library exists — verify it is already used in the project first.
- Keep components small and colocated by feature (see `PLAN.md` structure).
- State changes go through the Zustand stores; canvas edits flow through the
  same operation channel as agent-generated `PixelOp`s so undo/redo stays consistent.
- Providers implement the single `LLMProvider` interface; differ only by base URL,
  headers, and model listing.
- API keys are stored only in the browser (`localStorage`). Never commit secrets,
  never log keys, and show a client-side security notice in the UI.

## Architecture Rules

- No backend. Never introduce server-side code or secrets in the repo.
- The agent uses tool/function calling with a strict schema, not free-form text.
- Restrict agent-drawn coordinates to project bounds and colors to the active palette.
- Respect the configured grid (default 32×32).

## Commits

Use this template (no AI authoring mention, no co-author footers):

```
feat: short message
fix: short message
```

- Stage only intended files.
- Never commit secrets or keys.
- Do not commit unless explicitly asked.

## Deployment

- GitHub Pages builds use `npm run build:pages`, which sets `base` to `/picme/`
  (matches the repo name). Local/dev builds serve from `/`.
- Use HashRouter (or a `404.html` redirect) to avoid 404s on refresh in Pages.
