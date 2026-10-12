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
- Zustand (global state) + React Context (shared UI context)
- Tailwind CSS (styling)
- `react-icons` (all icons)
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
- Icons must come from `react-icons`; never add inline SVGs or icon fonts.
- State: Zustand for global high-frequency state (document/frames/agent);
  React Context for shared UI context (active tool, provider, theme).
- Canvas edits flow through the same operation channel as agent-generated
  `PixelOp`s so undo/redo stays consistent.
- Providers implement the single `LLMProvider` interface; differ only by base URL,
  headers, and model listing.
- API keys are stored only in the browser (`IndexedDB`), encrypted with the Web
  Crypto API (AES-GCM). Never commit secrets, never log keys, and show a
  client-side security notice in the UI. Non-sensitive provider settings may be
  stored in plain text.

## Architecture Rules

Strict one-way dependency flow:

```
entities   ← services   ← useCases   ← hooks / contexts / pages / components
   ↑             ↑             ↑
 no deps     browser/API     business rules
```

- **entities/** — domain classes only; no React, no I/O.
- **services/** — external APIs (LLM providers) and browser APIs (`localStorage`,
  `<canvas>`, downloads). Never imported directly by UI components.
- **useCases/** — one class per use case with a single `execute` method;
  dependencies injected via the constructor; orchestrate services + entities.
- **hooks/** — reusable hooks shared across components; call use cases.
- **contexts/** — shared React Context (React Context API).
- **pages/** — may use use cases and hooks.
- **components/** — may use use cases and hooks, never services directly.
- **store/** — Zustand stores for global state.

Rules:

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

## Releases

Releases follow the semantic-release style (grouped, generated from commits).

1. Bump the version (updates `package.json` + `package-lock.json`, no tag):
   `npm version <X.Y.Z> --no-git-tag-version`
2. Commit: `chore: release v<X.Y.Z>` and push `main`.
3. Collect commits since the previous tag:
   `git log v<PREV>..HEAD --pretty=format:'%H|%s'`
   Group by type: `feat:` → Features, `fix:` → Bug Fixes, `docs:` → Documentation,
   `style:`/`chore:` → Styles/Chores.
4. Create the release (creates the tag at `main`):
   `gh release create v<X.Y.Z> --title "<X.Y.Z>" --notes-file <notes.md> --target main`

Release notes format:

```
## [X.Y.Z](https://github.com/gabrielSantosLima/picme/releases/tag/vX.Y.Z) (YYYY-MM-DD)

### Features
- <message> ([<short>](https://github.com/gabrielSantosLima/picme/commit/<full>))

### Bug Fixes
- <message> ([<short>](https://github.com/gabrielSantosLima/picme/commit/<full>))

### Contributors
- [@gabrielSantosLima](https://github.com/gabrielSantosLima)
```

- Tag an existing commit only when re-targeting a release: `git tag -f v<X.Y.Z> <sha>`
  then `git push -f origin v<X.Y.Z>`.
